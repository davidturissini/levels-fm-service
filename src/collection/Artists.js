function Artists (artists) {
	this._artists = artists;
}

Artists.prototype = {

	countAndSort: function () {
		var followingsArray = [];
		var followingsDictionary = {};

		console.log('counting artists');
		console.log(this._artists.length);
		this._artists.forEach(function (artist) {
			var permalink = artist.permalink;
			console.log(permalink);
			if (typeof followingsDictionary[permalink] === 'undefined') {
				followingsDictionary[permalink] = {
					count:1,
					artist:artist
				};
			} else {
				followingsDictionary[permalink].count += 1;
			}

		});

		
		for(var permalink in followingsDictionary) {
			if (followingsDictionary.hasOwnProperty(permalink) && followingsDictionary[permalink].artist.track_count !== 0) {
				followingsArray.push(followingsDictionary[permalink]);
			}
		}

		return followingsArray;
	}

};

module.exports = Artists;