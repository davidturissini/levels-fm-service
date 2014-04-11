var soundcloud = require('soundcloud').soundcloud;
var Track = require('./Track');

var Artist = function (params) {
	for(var x in params) {
		if (params.hasOwnProperty(x)) {
			this[x] = params[x];
		}
	}
}

Artist.import = function (permalink) {
	return soundcloud.api('/users/' + permalink)
		.then(function (artistData) {
			return new Artist(artistData);
		})

		.fail(function (e) {
			console.log(e.stack);
		});
}



Artist.prototype = {};

Artist.prototype.soundcloudGetTracks = function () {
	
	var trackParams = {
		'filter':'streamable',
		'duration[from]':1000*60*3,
		'duration[to]':1000*60*10
	};
	
	return soundcloud.joinPaginated('/users/' + this.permalink + '/tracks', 199, this.track_count, trackParams)
		.then(function (tracksData) {
			var tracks = [];

			tracksData.forEach(function (trackData) {
				tracks.push(new Track(trackData));
			});

			return tracks;
		});
};


module.exports = Artist;