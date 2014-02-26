var soundcloud = require('soundcloud').soundcloud;
var q = require('q');
var _ = require('underscore');
var Track = require('./../model/Track');
var Station = require('./../model/Station');
var Artist = require('./../model/Artist');
var Artists = require('./../collection/Artists');


function importTracksFromArtist (artistPermalink, station, adjacentFollowingsLimit) {
	var totalFollowings = [];
	var numFetched = 0;
	var time = new Date().getTime();
	var importDeferred = q.defer();
	var artist;
	var importedArtists;
	


	return soundcloud.api('/users/' + artistPermalink)

		.then(function (artistData) {
			artist = new Artist(artistData);

			return artist.soundcloudGetAdjacentArtists({
				select:['permalink', 'track_count']
			});
		})

		.then(function (adjacentArtists) {
			var tracksPromises = [];
			var tracks = [];
			

			var followingsArray = adjacentArtists.countAndSort();


			console.log('sorting artists');
			var sorted = _.sortBy(followingsArray, function (a) {
				if (a.artist.track_count < 2) {
					return 1;
				}

				return -a.count;
			});

			
			var spliced = sorted.splice(0, adjacentFollowingsLimit).sort(function (a, b) {
				if (a.artist.track_count < b.artist.track_count) {
					return -1;
				}

				return 1;
			});


			

			return spliced;
		})

		.then(function (spliced) {
			var queue = [];
			console.log('--------------', spliced, '-----------');

			spliced.forEach(function (sortedArtist) {
				console.log('artistcount', sortedArtist.count);
				
				var artist = new Artist(sortedArtist.artist);

				var permalink = artist.permalink;
				var promises = [];
				console.log('building track queue for', permalink);
				queue.push(function () {

					console.log('fetching tracks for', permalink);

					return artist.soundcloudGetTracks()

						.then(function (tracks) {
							
							return Station.findOne({
									_id:station._id
								}).exec().then(function (station) {
									var defer = q.defer();
									console.log('saving tracks', artist.permalink, 'num tracks:', tracks.length);
									station.addTracks(tracks);
									station.save(function (err, s, numAffected) {
										console.log('station saved after notified');
										defer.resolve();
									});

									return defer.promise;

								});

						});

				});

			});


			var defer = q.defer();
			var result = defer.promise;
			defer.resolve();
			
			queue.forEach(function (f) {
			    result = result.then(f);
			});
			return result;
			

		})

		.then(function (tracks) {
			var duration = (new Date().getTime() - time) / 1000;
			console.log('elapsed time', duration);
			importDeferred.resolve();
		});


	return importDeferred.promise;

}

module.exports = importTracksFromArtist;