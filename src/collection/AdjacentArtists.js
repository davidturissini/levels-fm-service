var _ = require('underscore');
var clusterfck = require('clusterfck');
var Artists = require('./Artists');

function AdjacentArtists (artists) {
	this._artists = artists;
	this._count = null;
	this._blacklist = [
		'flux-pavilion',
		'skrillex',
		'soundcloud',
		'diplo'
	];
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
			if (a.artist.permalink === 'undefined' || a.artist.followers_count < 2000 || a.artist.track_count < 2 || this._blacklist.indexOf(a.artist.permalink) !== -1) {
				return 1;
			}

			a.percentage = ((a.count / a.artist.followers_count) * 100);
			return -a.percentage;
		}.bind(this));

		var spliced = sorted.splice(0, 40);
		
/*
		var data = [];
		spliced.forEach(function (artistData) {
			var ratio = ((a.count / a.artist.followers_count) * 10000);
			var d = [1, 1, ratio];
			d.artist = artistData.artist;
			data.push(d);
		});

		var clusters = clusterfck.kmeans(data, 2);
		var clusterIndex = (clusters[0][0] > clusters[1][0]) ? 0 : 1;
*/
		spliced = _.map(spliced, function (clusterData) {
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