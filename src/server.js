var express = require('express');
var Q = require('q');
var soundcloud = require('soundcloud').soundcloud;
var serverPort = 3000;
var database = require('./database');
var Artist = require('./model/Artist');
var Track = require('./model/Track');
var artistImport = require('./import/artistImporter');
var trackImport = require('./import/trackImporter');
var User = require('./model/User');
var Station = require('./model/Station');
var fs = require('fs');
var cp = require('child_process');
var _ = require('underscore');
var app = express();

soundcloud.configure({
	client_id:'99308a0184193d62e064cb770f4c1eae'
});


app.get('/users', function (req, res) {
	var user = new User({
		username:'dave'
	});

	user.save(function () {
		res.header("Access-Control-Allow-Origin", "*");
		res.write(JSON.stringify(user));
		res.end();
	})

});


app.get('/users/:user_id/stations', function (req, res) {
	var promises = [];
	var username = req.params.user_id;

	var userQuery = User.findOne({username:username}).populate({
		path:'stations',
		select:'title'
	});
	
	userQuery.exec().then(function (user) {
		res.header("Access-Control-Allow-Origin", "*");
		res.write(JSON.stringify(user.stations));
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
				res.header("Access-Control-Allow-Origin", "*");
				res.write(JSON.stringify(station.asJSON()));
				res.end();
			})
		

	});
});




app.get('/users/:user_id/stations/:station_id/destroy', function (req, res) {
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
				res.header("Access-Control-Allow-Origin", "*");
				res.write(JSON.stringify(station));
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

			res.header("Access-Control-Allow-Origin", "*");
			res.write(JSON.stringify(station));
			res.end();



			var filename = station._id + new Date().getTime();
			fs.writeFile('src/tasks/json/' + filename + '.json', JSON.stringify({
				station_id:station._id,
				artist_id:artistMatch.permalink
			}), function(err) {
			    
			    cp.fork(__dirname + '/tasks/import_edge.js', ['-f', filename]);
			});
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
				res.header("Access-Control-Allow-Origin", "*");
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
			res.header("Access-Control-Allow-Origin", "*");
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

app.get('/users/:user_id/stations/new/:artist_id', function (req, res) {
	var promises = [];
	var username = req.params.user_id;
	var artistPermalink = req.params.artist_id;
	var user;
	var artist;
	var station;

	var userQuery = User.findOne({username:username});
	promises.push(userQuery.exec());

	var artistQuery = Artist.findOne({permalink:artistPermalink});
	promises.push(artistQuery.exec());

	Q.spread(promises, function (matchedUser, artist) {
		user = matchedUser;
		if (!artist) {
			return artistImport.importArtist(artistPermalink);
		}

		return artist;
	})

	.then(function (matchedArtist) {
		artist = matchedArtist;
		return Station.create(user, artist);

	})

	.then(function (createdStation) {
		station = createdStation;

		res.header("Access-Control-Allow-Origin", "*");
		res.write(JSON.stringify(station));
		res.end();

		fs.writeFile('src/tasks/json/' + station._id + '.json', JSON.stringify({
			station_id:station._id,
			artist_id:artist.permalink
		}), function(err) {
		    
		    cp.fork(__dirname + '/tasks/import_edge.js', ['-f', station._id]);
		});

			
	})
	
});


database.connect()
	.then(function () {
		app.listen(serverPort);
		console.log('Listening on port ' + serverPort);
	});


