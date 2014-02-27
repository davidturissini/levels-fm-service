var mongoose = require('mongoose');
var Q = q = require('q');
var soundcloud = require('soundcloud').soundcloud;
var _ = require('underscore');
var Track = require('./Track');
var AdjacentArtists = require('./../collection/AdjacentArtists');
var Artists = require('./../collection/Artists');


var artistSchema = new mongoose.Schema({
	"id": Number,
	"permalink": String,
	"username": String,
	"uri": String,
	"permalink_url": String,
	"avatar_url": String,
	"country": String,
	"full_name": String,
	"city": String,
	"description": String,
	"discogs_name": String,
	"myspace_name": String,
	"website": String,
	"website_title": String,
	"online": Boolean,
	"track_count": Number,
	"playlist_count": Number,
	"followers_count": Number,
	"followings_count": Number,
	"public_favorites_count": Number,
	"followings":[{type: mongoose.Schema.Types.ObjectId, ref: 'Artist'}],
	"followers":[{type: mongoose.Schema.Types.ObjectId, ref: 'Artist'}],
	"tracks":[{type: mongoose.Schema.Types.ObjectId, ref: 'Track'}]
});


var Artist = mongoose.model('Artist', artistSchema);


Artist.createIfNotExists = function (artistData) {

	var query = Artist.findOne({
		permalink:artistData.permalink
	});

	return query.exec()
		.then(function (artist) {
			var defer;

			if (artist) {
				return artist;
			}

			defer = Q.defer();

			artist = new Artist(artistData);

			console.log('saving artist', artist.permalink);
			artist.save(function () {
				console.log('artist saved', artist.permalink);
				defer.resolve();
			});

			return defer.promise;

		});

}

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

Artist.prototype.soundcloudGetAdjacentArtists = function (options) {
	options = _.extend({select:[]}, options || {});
	console.log('fetching ' + this.permalink);
	var limit = this.followers_count > 500 ? 500 : this.followers_count;
	var thisPermalink = this.permalink;
	return soundcloud.joinPaginated('/users/' + this.permalink + '/followers', 199, limit)
		.then(function (followers) {
			var totalFollowings = [];
			var artistPromises = [];
			var queue = [];
			var defer = q.defer();
			var numFollowers = followers.length;
			var numFetched = 0;


			while(followers.length > 0) {
				(function (splicedFollowers) {

					queue.push(function () {
						var promises = [];
						splicedFollowers.forEach(function (follower) {
							
							
							console.log('fetching', follower.permalink, 'followings.', follower.followings_count, 'found');
							var promise = soundcloud.joinPaginated('/users/' + follower.permalink + '/followings', 199, follower.followings_count);

							promise = promise.then(function (followings) {
								console.log('fetched', follower.permalink, 'followings.', follower.followings_count, 'total');
								numFetched += 1;
								
								console.log('fetched', numFetched, 'of', numFollowers);
								var map = _.map(followings, function (artistData) {
									var params = {};
									if (artistData.permalink === thisPermalink) {
										return;
									}

									if (options.select.length === 0) {
										params = artistData;
									} else {
										options.select.forEach(function (prop) {
											params[prop] = artistData[prop];
										});
									}

									return new Artist(params);
									
								});

								map = _.compact(map);


								totalFollowings = totalFollowings.concat(map);

							});

							promises.push(promise);
						});

						return q.all(promises);
					});
				})(followers.splice(0, 20))
				
			}


			var defer = q.defer();
			var result = defer.promise;
			defer.resolve();
			
			queue.forEach(function (f) {
			    result = result.then(f);
			});

			return result

				.then(function () {
					return new AdjacentArtists(totalFollowings);
				});

		});
}


Artist.prototype.soundcloudGetTracksAndFavorites = function () {
	console.log('fetching tracks for', this.permalink);
	return this.soundcloudGetTracks()

		.then(function (tracks) {
			console.log('fetching favorites for', this.permalink);
			return this.soundcloudGetFavorites()
				.then(function (favorites) {
					return tracks.concat(favorites);
				});
		}.bind(this));
};

Artist.prototype.soundcloudGetFavorites = function () {
	var artist = this;

	return soundcloud.api('/users/' + this.permalink + '/favorites')
		.then(function (favorites) {
			
			var tracks = [];

			favorites.forEach(function (favorite) {
				tracks.push(new Track(favorite));
			});

			return tracks;
			
		});
		
}

Artist.prototype.soundcloudGetFollowings = function () {
	
	return soundcloud.joinPaginated('/users/' + this.permalink + '/followings', 199, this.followings_count)
		.then(function (followings) {
			var artistsArray = _.map(followings, function (artist) {
				return new Artist(artist);
			});

			return new Artists(artistsArray);

		});
}


Artist.prototype.populateTracks = function () {
	var defer = Q.defer();

	if (this.tracks.length === 0) {
		defer.resolve(this.tracks);
	} else {
		this.populate('tracks', function () {
			defer.resolve(this.tracks);
		}.bind(this));
	}

	return defer.promise;
}

Artist.prototype.hasTrack = function (track) {
	var hasTrack = false;
	
	var incomingTrackPermalinkUrl = (track.permalink === undefined) ? track : track.permalink;


	this.tracks.forEach(function (track) {
		if (track.permalink === incomingTrackPermalinkUrl) {
			hasTrack = true;
		}
	});

	return hasTrack;

};

Artist.prototype.hasFollower = function (follower) {
	var hasFollower = false;
	var incomingFollowerPermalinkUrl = (follower.permalink === undefined) ? follower : follower.permalink;


	this.followers.forEach(function (follower) {
		if (follower.permalink === incomingFollowerPermalinkUrl) {
			hasFollower = true;
		}
	});

	return hasFollower;
}

Artist.prototype.hasFollowing = function (following) {
	var hasFollower = false;
	var incomingFollowerPermalinkUrl = (following.permalink === undefined) ? following : following.permalink;

	this.followings.forEach(function (following) {
		if (following.permalink === incomingFollowerPermalinkUrl) {
			hasFollower = true;
		}
	});

	return hasFollower;
}


module.exports = Artist;