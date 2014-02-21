var artistImport = require('./../import/artistImporter');
var fs = require('fs');
var database = require('./../database');
var Station = require('./../model/Station');
var Q = require('q');
var artist;
var station;
var json;
var jsonPath;
var Artist = require('./../model/Artist');

database.connect()
	.then(function () {
		var defer = Q.defer();
		var artistIndex = process.argv.indexOf('-a');
		var artistName = process.argv[artistIndex + 1];
		var stationIdIndex = process.argv.indexOf('-s');
		var stationId = process.argv[stationIdIndex + 1];

		json = {
			artist_id:artistName,
			station_id:stationId
		}

	})

	.then(function () {
		var query = Artist.findOne({
			permalink:json.artist_id
		});
		return query.exec();
	})


	.then(function (importedArtist) {
		artist = importedArtist;
		console.log('importing followings for', json.artist_id);
		return artistImport.importFollowings(artist);
	})

	.then(function () {

		var query = Station.findOne({
			_id:json.station_id
		});

		return query.exec();
	})

	.then(function (matchedStation) {

		station = matchedStation;
		var promises = [];

		artist.followings.forEach(function (following) {
			promises.push(station.addArtist(following));
		});

		return Q.all(promises);

	})

	.then(function () {
		

		console.log('checking to see if should include followers');
		if (artist.followings.length === 0) {
			console.log('importing followers');
			return artistImport.importFollowers(artist)
				.then(function () {
					var defer = Q.defer();

					artist.populate({
						path:'followers',
						match: {
							track_count: {
								$gt: 0
							}
						},
						options:{

							sort:{
								'followers_count':-1
							},

							limit:30

						}
					}, function () {
						defer.resolve();
					})

					return defer.promise;
				})

				.then(function () {
					var promises = [];
					artist.followers.forEach(function (following) {
						promises.push(station.addArtist(following));
					});


					return Q.all(promises);
				})
			
		}

	})

	.then(function () {
		console.log('saving station')
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
		console.log('exiting');
		process.exit();
	})