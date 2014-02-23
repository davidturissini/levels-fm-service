var mongoose = require('mongoose');
var Q = q = require('q');
var soundcloud = require('soundcloud').soundcloud;


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

Artist.prototype.soundcloudGetAdjacentArtists = function () {
	console.log('fetching ' + this.permalink);
	var limit = this.followers_count > 2000 ? 2000 : this.followers_count;
	return soundcloud.joinPaginated('/users/' + this.permalink + '/followers', 199, limit)
		.then(function (followers) {
			var totalFollowings = [];
			var artistPromises = [];
			var queue = [];
			var defer = q.defer();
			var numFollowers = followers.length;
			var numFetched = 0;

			console.log('found', followers.length, 'followers');

			followers.forEach(function (follower) {
				artistPromises.push(Artist.createIfNotExists(follower));
			});

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
								totalFollowings = totalFollowings.concat(followings);


							});

							promises.push(promise);
						});

						return q.all(promises);
					});
				})(followers.splice(0, 100))
				
			}


			var defer = q.defer();
			var result = defer.promise;
			defer.resolve();
			
			queue.forEach(function (f) {
			    result = result.then(f);
			});

			return result
				.then(function () {
					return q.all(artistPromises);
				})

				.then(function () {
					return totalFollowings;
				})

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