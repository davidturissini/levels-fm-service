var artistImport = require('./../import/artistImporter');
var fs = require('fs');
var database = require('./../database');
var Station = require('./../model/Station');
var Q = require('q');
var artist;
var json;
var jsonPath;

database.connect()
	.then(function () {
		var defer = Q.defer();
		var filenameIndex = process.argv.indexOf('-f');
		var filename = process.argv[filenameIndex + 1];
		jsonPath = __dirname + '/json/' + filename + '.json';
		

		fs.readFile(jsonPath, function (err, data) {
			json = JSON.parse(data);
			defer.resolve(json);
		});

		return defer.promise;
	})

	.then(function () {
		console.log('importing edge', json.artist_id);
		return artistImport.importEdge(json.artist_id);
	})

	.then(function (importedArtist) {
		console.log('edge imported', json.artist_id)
		artist = importedArtist;

		var query = Station.findOne({
			_id:json.station_id
		});

		return query.exec();
	})

	.then(function (station) {
		var promises = [];

		artist.followings.forEach(function (following) {
			promises.push(station.addArtist(following));
		});

		artist.followers.forEach(function (following) {
			promises.push(station.addArtist(following));
		});

		return Q.all(promises);

	})

	.then(function () {

		var defer = Q.defer();

		station.save(function () {
			console.log('station saved', json.station_id);
			console.log('station tracks', station.tracks.length);
			defer.resolve();
		})

		return defer.promise;
	})

	.then(function () {
		var defer = Q.defer();

		fs.unlink(jsonPath, function () {
			defer.resolve();
		});

		return defer.promise;
	})

	.then(function () {
		process.exit();
	})