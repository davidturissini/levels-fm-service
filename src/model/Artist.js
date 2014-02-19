var mongoose = require('mongoose');
var Q = require('q');
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


Artist.prototype.populateTracks = function () {
	var defer = Q.defer();

	this.populate('tracks', function () {
		defer.resolve(this.tracks);
	}.bind(this));

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