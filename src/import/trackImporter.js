var Track = require('./../model/Track');
var Q = require('q');
var soundcloud = require('soundcloud').soundcloud;



var trackImporter = {


	__import:function (artist) {
		return artist.populateTracks()
			.then(function () {
				return soundcloud.api('/users/' + artist.permalink + '/tracks');
			})

			.then(function (tracksData) {
				var promises = [];
				tracksData.forEach(function (trackData) {
					var track;
					var defer = Q.defer();

					if (artist.hasTrack(trackData) === true) {
						return;
					}


					track = new Track(trackData);
					artist.tracks.push(track);

					track.save(function () {
						defer.resolve();
					});

					promises.push(defer.promise);

				})

				return Q.all(promises);

			})

			.then(function () {
				var defer = Q.defer();

				artist.save(function () {
					defer.resolve();
				});

				return defer.promise;
			})
	},

	importTracks: function (artist) {
		return this.__import(artist);
	}

}


module.exports = trackImporter;