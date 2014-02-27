var soundcloud = require('soundcloud').soundcloud;
var q = require('q');
var _ = require('underscore');
var Track = require('./../model/Track');
var Station = require('./../model/Station');
var Artist = require('./../model/Artist');
var AdjacentArtists = require('./../collection/AdjacentArtists');



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
			
			return artist.soundcloudGetFavorites()
				.then(function (tracks) {
					station.addTracks(tracks);
				});

		})

		.then(function () {
			return artist.soundcloudGetAdjacentArtists({
				select:['permalink', 'track_count']
			});
		})

		.then(function (adjacentArtists) {
			var spliced = adjacentArtists.getCluster();
			var queue = [];
			var numExecuted = 0;

			spliced.forEach(function (sortedArtist) {
				
				var artist = new Artist(sortedArtist);

				var permalink = artist.permalink;
				var promises = [];
				console.log('building track queue for', permalink);
				queue.push(function () {
					numExecuted += 1;

					return artist.soundcloudGetTracksAndFavorites()

						.then(station.addTracks.bind(station))

						.then(function () {
							var defer;
							if (numExecuted !== 1) {
								return;
							}

							defer = q.defer();

							Station.update({_id: station._id}, {tracks:station.tracks}, {}, function () {
								defer.resolve();
							});

							return defer.promise;
						})

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

		.then(function () {
			Station.update({_id: station._id}, {tracks:station.tracks}, {}, function () {
				var duration = (new Date().getTime() - time) / 1000;
				console.log('elapsed time', duration);
				importDeferred.resolve();
			});

			return importDeferred.promise;
			
		});
	

}

module.exports = importTracksFromArtist;