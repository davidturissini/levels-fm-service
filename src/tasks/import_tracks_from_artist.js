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
					return Station.findByIdAndAddTracks(station._id, tracks);
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

			spliced.forEach(function (sortedArtist) {
				
				var artist = new Artist(sortedArtist);

				var permalink = artist.permalink;
				var promises = [];
				console.log('building track queue for', permalink);
				queue.push(function () {

					console.log('fetching tracks for', permalink);

					return artist.soundcloudGetTracksAndFavorites()

						.then(function (tracks) {
							return Station.findByIdAndAddTracks(station._id, tracks);

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