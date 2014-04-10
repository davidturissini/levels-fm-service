var database = require('./../database');
var Station = require('./../model/Station');

var stationIdIndex = process.argv.indexOf('-s');
var stationId = process.argv[stationIdIndex + 1];
var artistPermalinkIndex = process.argv.indexOf('-a');
var artistPermalink = process.argv[artistPermalinkIndex + 1];
var edgeLimitIndex = process.argv.indexOf('-el');
var edgeLimit = process.argv[edgeLimitIndex + 1];


var importer = require('soundcloud-importer');


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
		return importer.import(artistPermalink, edgeLimit)

			.then(function (tracks) {
				tracks.forEach(function (track) {
					station.addTrack(track, 'You liked ' + artistPermalink, track.ranking);
				});

				Station.update({_id: station._id}, {status:'imported', tracks:station.tracks}, {}, function () {
					console.log('station updated');
					console.log('exiting');
					process.exit();
				});

				
			})

			.fail(function (e) {
				console.log(e.stack);
			});
	}