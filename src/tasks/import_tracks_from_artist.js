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
		})

		.then(function () {
			return artist.soundcloudGetAdjacentArtists({
				select:['permalink', 'track_count', 'followers_count']
			});
		})

		.then(function (adjacentArtists) {
			var artists = adjacentArtists.getCluster();
			var queue = [];
			var numExecuted = 0;

			return artists.soundcloudGetTracks()
				.then(station.addTracks.bind(station));

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