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


app.get('/stations/:station_id', function (req, res) {

	var stationQuery = Station.findById(req.params.station_id);

	stationQuery.exec()
		.then(function (station) {
			res.write(JSON.stringify(station.asJSON()));
			res.end();
		})
});


app.del('/stations/:station_id', function (req, res) {
	var promises = [];
	var stationId = req.params.station_id;
	var station;
	var user;


	Station.findOne({
		_id:stationId
	}).exec()

	.then(function (match) {
		station = match;
		var defer = Q.defer();


		station.populate('user', function () {
			user = station.user;
			defer.resolve();
		});

		return defer.promise;
	})

	.then(function () {
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
	var artist;

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

		importEdgeDelegate(artist.permalink, station._id, 60);
			
	});
	
});


database.connect()
	.then(function () {
		app.listen(serverPort);
		console.log('Listening on port ' + serverPort);
	});


