var express = require('express');
var Q = require('q');
var soundcloud = require('soundcloud').soundcloud;
var serverPort = 3000;
var database = require('./database');
var track = require('./track');
var Track = track.Track;
var Artist = require('./artist').Artist;
var user = require('./user');
var User = user.User;
var station = require('./station');
var Station = station.Station;

var app = express();

soundcloud.configure({
	client_id:'99308a0184193d62e064cb770f4c1eae'
});


app.get('/users', function (req, res) {
	user.create({
		username:'dave'
	})

	.then(function (user) {
		res.header("Access-Control-Allow-Origin", "*");
		res.write(JSON.stringify(user));
		res.end();
	});

});


app.get('/users/:user_id/stations', function (req, res) {
	var promises = [];
	var username = req.params.user_id;

	var userQuery = User.findOne({username:username}).populate('stations stations.tracks');
	
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
		var stationQuery = Station.find({
			user:user._id,
			_id:req.params.station_id
		}).populate('tracks');
		
		stationQuery.exec()
			.then(function (station) {
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

			return station.save(userStation);
		})

		.then(function () {
			res.header("Access-Control-Allow-Origin", "*");
			res.write(JSON.stringify(nextTrack));
			res.end();
		})
	

});


app.get('/users/:user_id/stations/new/:artist_id', function (req, res) {
	var promises = [];
	var username = req.params.user_id;

	var userQuery = User.findOne({username:username});
	promises.push(userQuery.exec());

	var artistQuery = Artist.findOne({permalink:req.params.artist_id});
	promises.push(artistQuery.exec());

	Q.spread(promises, function (user, artist) {
		return station.create(user, artist);
	})

	.then(function (station) {
		res.header("Access-Control-Allow-Origin", "*");
		res.write(JSON.stringify(station));
		res.end();
	});
	
});

database.connect()
	.then(function () {
		app.listen(serverPort);
		console.log('Listening on port ' + serverPort);
	});


