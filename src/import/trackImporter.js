var Track = require('./../model/Track');
var Q = require('q');
var soundcloud = require('soundcloud').soundcloud;

soundcloud.configure({
	client_id:'99308a0184193d62e064cb770f4c1eae'
});


var trackImporter = {


	__import:function (artist) {
		console.log('importing tracks for', artist.permalink);
		return artist.populateTracks()
			.then(function () {

				return soundcloud.joinPaginated('/users/' + artist.permalink + '/tracks', 199, artist.track_count);
			}.bind(this))

			.then(function (tracksData) {
				var promises = [];

				console.log('imported tracks', tracksData.length, 'from', artist.permalink);
				tracksData.forEach(function (trackData) {
					var track;

					if (artist.hasTrack(trackData) === true) {
						return;
					}

					promises.push(Track.create(trackData, artist));
				});

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