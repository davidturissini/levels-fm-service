var soundcloud = require('soundcloud').soundcloud;
var q = require('q');
var _ = require('underscore');
var Track = require('./../model/Track');
var Station = require('./../model/Station');
var Artist = require('./../model/Artist');


function importTracksFromArtist (artistPermalink, station, adjacentFollowingsLimit) {
	var totalFollowings = [];
	var artistPromises = [];
	var numFetched = 0;
	var followingsDictionary = {};
	var time = new Date().getTime();
	var importDeferred = q.defer();
	var artist;

	var artistQuery = Artist.findOne({
		permalink:artistPermalink
	});

	adjacentFollowingsLimit = adjacentFollowingsLimit || 50;



	artistQuery.exec()
		.then(function (match) {
			artist = match;

			return artist.soundcloudGetAdjacentArtists();
		})

		.then(function (totalFollowings) {
			var followingsArray = [];
			var tracksPromises = [];
			var tracks = [];

			console.log('counting artists');
			totalFollowings.forEach(function (following) {
				var permalink = following.permalink;

				if (typeof followingsDictionary[permalink] === 'undefined') {
					followingsDictionary[permalink] = {
						count:1,
						artist:following
					};
				} else {
					followingsDictionary[permalink].count += 1;
				}

			});


			for(var permalink in followingsDictionary) {
				if (followingsDictionary.hasOwnProperty(permalink) && permalink !== artistPermalink && followingsDictionary[permalink].artist.track_count !== 0) {
					followingsArray.push(followingsDictionary[permalink]);
				}
			}

			console.log('sorting artists');
			var sorted = followingsArray.sort(function (a, b) {
				if (a.count < b.count) {
					return 1;
				}


				return -1;
			}).slice(0, adjacentFollowingsLimit).sort(function (a, b) {
				if (a.artist.track_count < b.artist.track_count) {
					return -1;
				}

				return 1;
			});

			var queue = [];
			sorted.forEach(function (sortedArtist) {
				var artist = sortedArtist.artist;
				var permalink = artist.permalink;
				var promises = [];
				console.log('building track queue for', permalink);
				queue.push(function () {
					console.log('fetching tracks for', permalink);
					return soundcloud.joinPaginated('/users/' + permalink + '/tracks', 199, artist.track_count)
						.then(function () {
							return q.all(promises)
								.then(function () {
									console.log('ok, all tracks saved for', permalink);
									return tracks;
								})

						}, function () {}, function (artistTracks) {
							console.log('progress!');
							var trackPromises = [];
							var tracks = [];
							artistTracks.forEach(function (trackData) {
								var promise = Track.findOrCreate(trackData);

								promise = promise.then(function (track) {
									tracks.push(track);
								});

								trackPromises.push(promise);

							});

							var promise = q.all(trackPromises)
								.then(function () {
									var defer = q.defer();

									Station.findOne({
										_id:station._id
									}).exec().then(function (station) {
										console.log('saving tracks', tracks.length);
										tracks.forEach(function (track) {
											station.addTrack(track);
											console.log('adding', track._id);
										});

										station.save(function (err, s, numAffected) {
											console.log('station saved after notified');
											defer.resolve();
										});

									});

									
									return defer.promise;

								});

							promises.push(promise);

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

		.then(function (tracks) {
			var duration = (new Date().getTime() - time) / 1000;
			console.log('elapsed time', duration);

			importDeferred.resolve();
		});


	return importDeferred.promise
		.then(function () {
			return q.all(artistPromises);
		});
}

module.exports = importTracksFromArtist;