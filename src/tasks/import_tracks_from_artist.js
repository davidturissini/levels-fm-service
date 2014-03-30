var soundcloud = require('soundcloud').soundcloud;
var q = require('q');
var _ = require('underscore');
var Track = require('./../model/Track');
var Station = require('./../model/Station');
var Artist = require('./../model/Artist');
var AdjacentArtists = require('./../collection/AdjacentArtists');
var totalArtistsCount = 0;


function artistAdjacentArtistsReady (station, edgeLimit, artistPermalink, adjacentArtists) {
	var artists = adjacentArtists.getCluster(edgeLimit);
	var queue = [];
	var numExecuted = 0;
	var time = new Date().getTime();
	totalArtistsCount += artists.count();


	return artists.soundcloudGetTracks()
		.then(function (tracks) {
			tracks.forEach(function (track) {
				var ranking;
				artists.each(function (artist, index) {
					if (artist.permalink === track.user.permalink) {
						ranking = (edgeLimit - index);
					}
				});

				
				station.addTrack(track, 'You liked ' + artistPermalink, ranking);
			});
		})

	.then(function () {
		var defer = q.defer();

		Station.update({_id: station._id}, {status:'imported', tracks:station.tracks}, {}, function () {
			var duration = (new Date().getTime() - time) / 1000;
			console.log('elapsed time', duration);
			defer.resolve();
		});

		return defer.promise;
		
	})

	.then(function () {
		var promises = [];
		if (totalArtistsCount < edgeLimit) {
			artists.each(function (artist) {
				var promise;

				promise = artist.soundcloudGetAdjacentArtists({
					select:['permalink', 'track_count', 'followers_count', 'followings_count']
				});

				promise = promise.then(function (adjacentArtists) {
					return artistAdjacentArtistsReady(station, edgeLimit, adjacentArtists);
				});

				console.log('something');
				promises.push(promise);

			});
		}

		return q.all(promises);
	});

	

}

/*

if (artists.count() === 1) {
	return artists._data[0].soundcloudGetAdjacentArtists({
		select:['permalink', 'track_count', 'followers_count', 'followings_count']
	})

	.then(function (adjacentArtists) {
		var artists = adjacentArtists.getCluster(edgeLimit);
		
		return artists.soundcloudGetTracks()
			.then(function (tracks) {
				tracks.forEach(function (track) {
					station.addTrack(track, 'You liked ' + artist.username);
				});
			});
	})
}*/

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

		.then(artistAdjacentArtistsReady.bind(undefined, station, edgeLimit, artistPermalink))
	

}

module.exports = importTracksFromArtist;