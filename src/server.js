var express = require('express');
var cors = require('cors');
var Q = require('q');
var soundcloud = require('soundcloud').soundcloud;
var serverPort = 3000;
var database = require('./database');
var Artist = require('./model/Artist');
var Track = require('./model/Track');
var artistImport = require('./import/artistImporter');
var User = require('./model/User');
var Station = require('./model/Station');
var importEdgeDelegate = require('./tasks/importEdgeDelegate');

var app = express();
app.use(cors());
app.use(app.router);

soundcloud.configure({
	client_id:'99308a0184193d62e064cb770f4c1eae'
});


app.get('/users', function (req, res) {
	var user = new User({
		username:'dave'
	});

	user.save(function () {
		res.write(JSON.stringify(user));
		res.end();
	})

});


app.get('/users/:user_id/stations', function (req, res) {
	var promises = [];
	var username = req.params.user_id;

	var userQuery = User.findOne({username:username}).populate({
		path:'stations'
	});
	
	userQuery.exec().then(function (user) {
		var stations = [];
		user.stations.forEach(function (station) {
			stations.push(station.asJSON());
		});

		res.write(JSON.stringify(stations));
		res.end();
		
	});
	
});


app.get('/users/:user_id/stations/:station_id', function (req, res) {
	var promises = [];
	var username = req.params.user_id;

	var userQuery = User.findOne({username:username});
	
	userQuery.exec().then(function (user) {
		var stationQuery = Station.findOne({
			user:user._id,
			_id:req.params.station_id
		});

		stationQuery.exec()
			.then(function (station) {
				res.write(JSON.stringify(station.asJSON()));
				res.end();
			})
		

	});
});




app.del('/users/:user_id/stations/:station_id', function (req, res) {
	var promises = [];
	var username = req.params.user_id;
	var stationId = req.params.station_id;
	var station;

	var userQuery = User.findOne({username:username});
	
	userQuery.exec().then(function (user) {

		user.stations.splice(user.stations.indexOf(stationId), 1);

		var stationQuery = Station.findOne({
			user:user._id,
			_id:stationId
		});
		
		stationQuery.exec()
			.then(function (matchedStation) {
				station = matchedStation;
				var defer = Q.defer();
				station.remove(function () {
					defer.resolve();
				});

				return defer.promise;
				
			})

			.then(function () {
				var defer = Q.defer();

				user.save(function () {
					defer.resolve();
				})

				return defer.promise;
			})

			.then(function () {
				res.write(JSON.stringify(station.asJSON()));
				res.end();
			})
		

	});
});



app.get('/users/:user_id/stations/:station_id/tracks/up/:track_id', function (req, res) {
	var promises = [];
	var username = req.params.user_id;
	var station;

	promises.push(User.findOne({username:username}).exec());
	promises.push(Track.findOne({_id:req.params.track_id}).exec());

	Q.spread(promises, function (user, track) {

		var stationQuery = Station.findOne({
			user:user._id,
			_id:req.params.station_id
		});

		var artistQuery = Artist.findOne({
			id:track.user_id
		});
		
		Q.spread([stationQuery.exec(), artistQuery.exec()], function (stationMatch, artistMatch) {
			station = stationMatch;

			res.write(JSON.stringify(station));
			res.end();
			
			importEdgeDelegate(artistMatch.permalink, station._id);
			
		});	


		

	});
});





app.get('/users/:user_id/stations/:station_id/artists/add/:artist_id', function (req, res) {
	var promises = [];
	var username = req.params.user_id;
	var station;

	promises.push(User.findOne({username:username}).exec());
	promises.push(Artist.findOne({permalink:req.params.artist_id}).exec());

	Q.spread(promises, function (user, artist) {

		var stationQuery = Station.findOne({
			user:user._id,
			_id:req.params.station_id
		});
		
		stationQuery.exec()
			.then(function (match) {
				station = match;
				return station.addArtist(artist);
			})

			.then(function () {
				return station.save();
			})

			.then(function () {
				res.write(JSON.stringify(station));
				res.end();
			})
		

	});
});




function findNextTrack (userStation) {
	var trackIndex = Math.round(Math.random() * (userStation.tracks.length - 1));
	var track = userStation.tracks[trackIndex];
	var trackId = track._id;

	if(userStation.history.indexOf(trackId) !== -1) {
		track = findNextTrack(userStation);
	}

	return track;
}


app.get('/users/:user_id/stations/:station_id/tracks/next', function (req, res) {
	var promises = [];
	var username = req.params.user_id;
	var nextTrack;
	var userQuery = User.findOne({username:username});
	
	userQuery.exec()

		.then(function (user) {
			var stationQuery = Station.findOne({
				user:user._id,
				_id:req.params.station_id
			}).populate({
				path:'tracks',
				match: {
					duration: {
						$gt:1000*60*3,
						$lt:1000*60*10
					}
				}
			});

			return stationQuery.exec();
				
		})

		.then(function (userStation) {
			nextTrack = findNextTrack(userStation);

			
			userStation.history.push(nextTrack);

			if (userStation.history.length > 10) {
				userStation.history = userStation.history.slice(userStation.history.length - 10, 10);
			}

			return userStation.save();
		})

		.then(function () {
			res.write(JSON.stringify(nextTrack));
			res.end();
		})

});


app.get('/artists/:artist_id', function (req, res) {

	Artist.find({
		permalink:req.params.artist_id
	}, function (err, match) {
		res.write(JSON.stringify(match));
		res.end();
	})

});

app.post('/users/:user_id/stations/:artist_id', function (req, res) {
	var promises = [];
	var username = req.params.user_id;
	var artistPermalink = req.params.artist_id;
	var artist;
	console.log('post');

	var userQuery = User.findOne({username:username});
	promises.push(userQuery.exec());

	var artistQuery = artistImport.findOrImport(artistPermalink);
	promises.push(artistQuery);

	Q.spread(promises, function (user, matchedArtist) {
		artist = matchedArtist;
		return Station.create(user, artist);
	})

	.then(function (station) {

		res.write(JSON.stringify(station.asJSON()));
		res.end();


		importEdgeDelegate(artist.permalink, station._id);

			
	})
	
});


database.connect()
	.then(function () {
		app.listen(serverPort);
		console.log('Listening on port ' + serverPort);
	});


