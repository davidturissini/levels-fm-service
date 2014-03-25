var _ = require('underscore');
var clusterfck = require('clusterfck');
var Artists = require('./Artists');

function AdjacentArtists (mainArtist, artists) {
	this._mainArtist = mainArtist;
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


	getCluster: function (edgeLimit) {
		edgeLimit = edgeLimit || 40;
		var followingsArray = this.countAndSort();
		var popularThreshold = 50000;

		var sortedByCount = _.sortBy(followingsArray, function (a) {
			if (a.artist.permalink === 'undefined' || a.artist.followers_count < 2000 || a.artist.track_count < 2 || this._blacklist.indexOf(a.artist.permalink) !== -1) {
				return 1;
			}

			return -a.count;

		}.bind(this));


		var sortedByPercentage = _.sortBy(followingsArray, function (a) {
			var percentage
			if (a.artist.permalink === 'undefined' || a.artist.followers_count < 2000 || a.artist.track_count < 2 || this._blacklist.indexOf(a.artist.permalink) !== -1) {
				return 1;
			}

			percentage = ((a.count / a.artist.followers_count) * 100);
			a.score = percentage;

			return -a.score;
		}.bind(this));

		if (this._mainArtist.followers_count < popularThreshold) {
		
			var intersection = _.intersection(sortedByCount.splice(0, Math.round(sortedByCount.length * 0.4)), sortedByPercentage.splice(0, Math.round(sortedByCount.length * 0.4)));
			
			if (intersection.length < edgeLimit) {
				intersection = intersection.concat(sortedByPercentage.splice(0, edgeLimit + intersection.length));
			}

			intersection = _.sortBy(intersection, function (a) {
				return -a.score;
			});

		} else {
			if (this._mainArtist.followers_count > popularThreshold || this._mainArtist.followings_count === 0) {
				var data = [];
				sortedByCount.forEach(function (artistData) {
					var d = [1, 1, artistData.count];
					d.artist = artistData.artist;
					data.push(d);
				});

				var clusters = clusterfck.kmeans(data, 2);

				var clusterIndex = (clusters[0][0][2] > clusters[1][0][2]) ? 0 : 1;
				intersection = clusters[clusterIndex];
			}
		}

		

		

		var spliced;
		spliced = _.uniq(intersection).splice(0, edgeLimit);


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