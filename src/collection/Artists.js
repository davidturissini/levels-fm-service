var q = require('q');

var Artists = function (data) {
	this._data = data || [];
}


Artists.prototype = {

	count: function () {
		return this._data.length;
	},

	soundcloudGetFavorites: function () {
		var defer = q.defer();
		var result = defer.promise;
		defer.resolve();
		var tracks = [];
		var queue = [];
		var data = this._data.slice(0);

		while(data.length > 0) {
			(function (artists) {
				queue.push(function () {
					var promises = [];

					artists.forEach(function (artist) {
						
						var promise = artist.soundcloudGetFavorites()
							.then(function (artistTracks) {
								tracks = tracks.concat(artistTracks);
							});

						promises.push(promise);
					});

					return q.all(promises);

				});
			})(data.splice(0, 20));
		}
		
		queue.forEach(function (f) {
		    result = result.then(f);
		});

		return result
			.then(function () {
				return tracks;
			})
	},

	soundcloudGetTracks: function () {
		var defer = q.defer();
		var result = defer.promise;
		defer.resolve();
		var tracks = [];
		var queue = [];
		var data = this._data.slice(0);

		while(data.length > 0) {
			(function (artists) {
				queue.push(function () {
					var promises = [];

					artists.forEach(function (artist) {
						
						var promise = artist.soundcloudGetTracks()
							.then(function (artistTracks) {
								tracks = tracks.concat(artistTracks);
							});

						promises.push(promise);
					});

					return q.all(promises);

				});
			})(data.splice(0, 20));
		}
		
		queue.forEach(function (f) {
		    result = result.then(f);
		});

		return result
			.then(function () {
				return tracks;
			})
	},

	soundcloudGetTracksAndFavorites: function () {
		var defer = q.defer();
		var result = defer.promise;
		defer.resolve();
		var tracks = [];
		var queue = [];
		var data = this._data.slice(0);

		while(data.length > 0) {
			(function (artists) {
				queue.push(function () {
					var promises = [];

					artists.forEach(function (artist) {
						
						var promise = artist.soundcloudGetTracksAndFavorites()
							.then(function (artistTracks) {
								tracks = tracks.concat(artistTracks);
							});

						promises.push(promise);
					});

					return q.all(promises);

				});
			})(data.splice(0, 20));
		}
		
		queue.forEach(function (f) {
		    result = result.then(f);
		});

		return result
			.then(function () {
				return tracks;
			})
	}

};



module.exports = Artists;