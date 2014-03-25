var express = require('express');
var cors = require('cors');
var Q = require('q');
var soundcloud = require('soundcloud').soundcloud;
var serverPort = process.env.PORT || 3000;
var database = require('./database');
var Artist = require('./model/Artist');
var Track = require('./model/Track');
var artistImport = require('./import/artistImporter');
var User = require('./model/User');
var Station = require('./model/Station');
var importEdgeDelegate = require('./tasks/importEdgeDelegate');

var app = express();
app.use(cors());
app.use(express.bodyParser());
app.use(express.cookieParser('my secret here'));
app.use(app.router);

soundcloud.configure({
	client_id:'99308a0184193d62e064cb770f4c1eae'
});


app.post('/users', function (req, res) {
	var user;

	try {
		user = User.create(req.body);
	} catch (e) {
		res.write(JSON.stringify({
			error:e.message
		}));
		res.end();
	}

	User.checkUserNameExists(user.username)
		.then(function (exists) {
			if (exists === false) {

				user.save(function () {
					res.write(JSON.stringify(user.asJSON()));
					res.end();
				});
				
			} else {
				res.write(JSON.stringify({
					error:'Username ' + user.username + ' already exists.'
				}));
				res.end();
			}
		});

});


app.post('/login', function (req, res) {
	User.login(req.body.username, req.body.password)
		.then(function (data) {
			var user = data.user;
			var token = data.token;

			User.update({username: user.username}, {tokens:user.tokens}, {}, function () {
				var userJSON = user.asJSON();
				userJSON.token = token;
				res.write(JSON.stringify(userJSON));
				res.end();
			});
			
		}, function (err) {
			res.write(JSON.stringify({
				error:err.message
			}));
			res.end();
		});
});


app.post('/logout', function (req, res) {
	var token = req.body.token;
	
	User.findLoggedIn(req.body.username, token)
		.then(function (user) {

			if (user) {
				user.logout(token);

				User.update({username: user.username}, {tokens:user.tokens}, {}, function () {
					res.write(JSON.stringify(user.asJSON()));
					res.end();
				});
			}
		});

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


app.get('/stations/:station_id', function (req, res) {

	var stationQuery = Station.findById(req.params.station_id);

	stationQuery.exec()
		.then(function (station) {
			res.write(JSON.stringify(station.asJSON()));
			res.end();
		})
});


function verifyUserLoggedIn (username, token, res) {
	return User.findLoggedIn(username, token)
		.then(function (user) {
			if (!user) {
				throw new Error();
			}

			return user;

		})

		.fail(function () {
			res.send(401);
			res.end();
		})
}


app.del('/users/:user_id/stations/:station_id/token/:token', function (req, res) {
	var promises = [];
	var stationId = req.params.station_id;
	var station;

	verifyUserLoggedIn(req.params.user_id, req.params.token, res).then(function (user) {

		Station.findOne({
			_id:stationId
		}).exec()

		.then(function (station) {
			var defer = Q.defer();
			station.remove(function () {
				defer.resolve();
			});

			return defer.promise;
		})

		.then(function () {

			res.write(JSON.stringify(station.asJSON()));
			res.end();

			user.stations.splice(user.stations.indexOf(stationId), 1);
			user.save();

		});
	});
	

});



app.get('/stations/:station_id/tracks/up/:track_id', function (req, res) {

	var stationQuery = Station.findById(req.params.station_id);
	
	stationQuery.exec()
		.then(function (station) {
			var track = station.getTrackById(req.params.track_id);
		
			res.write(JSON.stringify(station));
			res.end();
			
			importEdgeDelegate(track.artist_permalink, station._id, 3);
			
		});
});


app.get('/stations/:station_id/tracks/next', function (req, res) {
	var station;
	var track;

	Station.findById(req.params.station_id).exec()

	.then(function (match) {
		station = match;
		return station.getNextTrack();
	})

	.then(function (nextTrack) {
		track = nextTrack;
		station.addToHistory(track);
		res.write(JSON.stringify(track));
		res.end();

		station.save();
		
	});

});

app.del('/stations/:station_id/tracks/:track_id', function (req, res) {

	Station.findOne({
		_id:req.params.station_id
	}).exec()

	.then(function (station) {

		var track = station.removeTrack(req.params.track_id);

		station.save(function () {
			res.write(JSON.stringify(track));
			res.end();
		});

	})

});


app.get('/users/:user_id', function (req, res) {
	var username = req.params.user_id;
	var userQuery = User.findOne({username:username});

	userQuery.exec()
		.then(function (user) {
			res.write(JSON.stringify(user.asJSON()));
			res.end();
		});
});


app.post('/users/:user_id/stations/:artist_id', function (req, res) {
	var promises = [];
	var username = req.params.user_id;
	var artistPermalink = req.params.artist_id;

	verifyUserLoggedIn(username, req.body.token, res).then(function (user) {

			return artistImport.findOrImport(artistPermalink)
				.then(function (matchedArtist) {

					artist = matchedArtist;

					return Station.create(user, artist);
				})

				.then(function (station) {

					res.write(JSON.stringify(station.asJSON()));
					res.end();

					importEdgeDelegate(artist.permalink, station._id, 30);
						
				});

		});

	
});


database.connect()
	.then(function () {
		app.listen(serverPort);
		console.log('Listening on port ' + serverPort);
	});


