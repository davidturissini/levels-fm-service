var soundcloud = require('soundcloud').soundcloud;
var q = require('q');
var _ = require('underscore');
var Track = require('./../model/Track');
var Station = require('./../model/Station');
var Artist = require('./../model/Artist');
var AdjacentArtists = require('./../collection/AdjacentArtists');



function importTracksFromArtist (artistPermalink, station, edgeLimit) {
	var totalFollowings = [];
	var numFetched = 0;
	var time = new Date().getTime();
	var importDeferred = q.defer();
	var artist;
	var importedArtists;


	return soundcloud.api('/users/' + artistPermalink)

		.then(function (artistData) {
			artist = new Artist(artistData);
		})

		.then(function () {
			return artist.soundcloudGetAdjacentArtists({
				select:['permalink', 'track_count', 'followers_count', 'followings_count']
			});
		})

		.then(function (adjacentArtists) {
			var artists = adjacentArtists.getCluster(edgeLimit);
			var queue = [];
			var numExecuted = 0;

			return artists.soundcloudGetTracks()
				.then(function (tracks) {
					tracks.forEach(function (track) {
						station.addTrack(track, 'You liked ' + artist.username);
					});
				});

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