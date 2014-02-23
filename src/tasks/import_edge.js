var artistImport = require('./../import/artistImporter');
var fs = require('fs');
var database = require('./../database');
var Station = require('./../model/Station');
var Q = require('q');
var artist;
var Artist = require('./../model/Artist');
var importTracksFromArtist = require('./import_tracks_from_artist');
var Track = require('./../model/Track');

var stationIdIndex = process.argv.indexOf('-s');
var stationId = process.argv[stationIdIndex + 1];
var artistPermalinkIndex = process.argv.indexOf('-a');
var artistPermalink = process.argv[artistPermalinkIndex + 1];
var edgeLimitIndex = process.argv.indexOf('-el');
var edgeLimit = process.argv[edgeLimitIndex + 1];

var stationQuery = Station.findOne({
	_id:stationId
});

database.connect()
	.then(function () {
		return stationQuery.exec()
			.then(function (station) {
				processStation(artistPermalink, station);
			});
	});


function processStation(artistPermalink, station) {

		var defer = Q.defer();
		station.populate('tracks', function () {
			defer.resolve(station);
		});


		defer.promise.then(function (matchedStation) {
			station = matchedStation;

			
			return importTracksFromArtist(artistPermalink, station, edgeLimit)
				.then(function () {}, function () {}, function (track) {
					console.log('notified', track._id);
				});


		})

		.then(function () {
			console.log('exiting');
			process.exit();
		})
	}