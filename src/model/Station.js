var mongoose = require('mongoose');
var user = require('./User');
var Q = require('q');
var trackImporter = require('./../import/trackImporter');
var artistImporter = require('./../import/artistImporter');


function createStation (owner, seedArtist) {
	var station = new Station({
		title:seedArtist.username + ' Radio'
	});

	return station.addArtist(seedArtist)
		.then(function () {
			var defer = Q.defer();
			station.user = owner;
			station.seed_artist = seedArtist;
			station.seed_artist_permalink = seedArtist.permalink;
			station.save(function () {
				defer.resolve();
			});

			return defer.promise;
		})

		.then(function () {
			var defer = Q.defer();

			owner.stations.push(station);
			owner.save(function () {
				defer.resolve(station);
			});

			return defer.promise;
		})

}


var stationSchema = new mongoose.Schema({
	"title":String,
	"seed_artist":{type: mongoose.Schema.Types.ObjectId, ref: 'Artist'},
	"seed_artist_permalink":String,
	"user":[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	"tracks":[{type: mongoose.Schema.Types.ObjectId, ref: 'Track'}],
	"history":[{type: mongoose.Schema.Types.ObjectId, ref: 'Track'}]
});


var Station = mongoose.model('Station', stationSchema);

Station.create = createStation;

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

Station.prototype.asJSON = function () {
	return {
		title:this.title,
		track_count:this.tracks.length,
		seed_artist_permalink:this.seed_artist_permalink,
		_id:this._id
	}
}

Station.prototype.addArtist = function (artist) {
	var station = this;

	return trackImporter.importTracks(artist)
		.then(function () {
			
			var defer = Q.defer();

			artist.tracks.forEach(station.addTrack.bind(station));

			station.save(function () {
				defer.resolve(station);
			});

			return defer.promise;

		});
}

module.exports = Station;