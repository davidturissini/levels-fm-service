var mongoose = require('mongoose');
var Q = require('q');
var track = require('./track');


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


exports.schema = artistSchema;
exports.Artist = Artist;