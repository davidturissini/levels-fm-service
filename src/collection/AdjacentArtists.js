var _ = require('underscore');
var clusterfck = require('clusterfck');
var Artists = require('./Artists');

function AdjacentArtists (artists) {
	this._artists = artists;
	this._count = null;
}

AdjacentArtists.prototype = {

	add: function (artist) {
		this._artists.push(artist);
		this._count = null;
	},


	countAndSort: function () {
		if (this._count !== null) {
			return this._count;
		}

		var followingsArray = [];
		var followingsDictionary = {};

		console.log('counting artists');
		console.log(this._artists.length);
		this._artists.forEach(function (artist) {
			var permalink = artist.permalink;
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

		this._count = followingsArray;
		return this._count;
	},


	getCluster: function () {
		var followingsArray = this.countAndSort();

		console.log('sorting artists');
		var sorted = _.sortBy(followingsArray, function (a) {
			if (a.artist.track_count < 2) {
				return 1;
			}

			return -a.count;
		});
		
		var spliced = sorted.splice(0, 40);

		var data = [];
		spliced.forEach(function (artistData) {
			var d = [1, 1, artistData.count];
			d.artist = artistData.artist;
			data.push(d);
		});

		var clusters = clusterfck.kmeans(data, 2);
		var clusterIndex = (clusters[0][0] > clusters[1][0]) ? 0 : 1;

		spliced = _.map(clusters[clusterIndex], function (clusterData) {
			return clusterData.artist;
		}).sort(function (a, b) {
			if (a.track_count < b.track_count) {
				return -1;
			}

			return 1;
		});

		return new Artists(spliced);
	}

};

module.exports = AdjacentArtists;