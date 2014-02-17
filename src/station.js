var mongoose = require('mongoose');
var track = require('./track');
var user = require('./user');
var Q = require('q');


function createStation (owner, seedArtist) {

	var station = new Station({
		title:seedArtist.username + ' Radio'
	});

	return station.addArtist(seedArtist)
		.then(function () {
			station.user = owner;

			return station.save();
		})

		.then(function () {
			owner.stations.push(station);
			return owner.save();
		})

		.then(function () {
			return station;
		})
	


}


var stationSchema = new mongoose.Schema({
	"title":String,
	"user":[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	"tracks":[{type: mongoose.Schema.Types.ObjectId, ref: 'Track'}],
	"history":[{type: mongoose.Schema.Types.ObjectId, ref: 'Track'}]
});


var Station = mongoose.model('Station', stationSchema);

Station.prototype.hasTrack = function (track) {
	var hasTrack = false;
	var incomingTrackId = (track._id === undefined) ? track : track._id;


	this.tracks.forEach(function (trackId) {
		if (trackId.toString() === incomingTrackId.toString()) {
			hasTrack = true;
		}
	});

	return hasTrack;
};

Station.prototype.addTrack = function (track) {
	if (this.hasTrack(track) === false) {
		this.tracks.push(track)
	}
}

Station.prototype.addArtist = function (artist) {
	var defer = Q.defer();
	var station = this;

	artist.populate('followings tracks', function () {
		defer.resolve();
	});

	return defer.promise
		.then(function () {


			artist.tracks.forEach(station.addTrack.bind(station));

			artist.followings.forEach(function (following) {
				if(following.tracks) {
					following.tracks.forEach(station.addTrack.bind(station));
				}
			});

		});
}


exports.schema = stationSchema;
exports.Station = Station;
exports.create = createStation;