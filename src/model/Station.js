var mongoose = require('mongoose');
var user = require('./User');
var Q = require('q');
var trackImporter = require('./../import/trackImporter');
var artistImporter = require('./../import/artistImporter');
var Track = require('./Track');
var _ = require('underscore');

var stationSchema = new mongoose.Schema({
	"title":String,
	"seed_artist":{type: mongoose.Schema.Types.ObjectId, ref: 'Artist'},
	"seed_artist_permalink":String,
	"user":[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	"tracks":[],
	"history":[]
});


var Station = mongoose.model('Station', stationSchema);

Station.findByIdAndAddTracks = function (id, tracks) {
	console.log('saving tracks to station', id);
	return Station.findById(id).exec()
		.then(function (station) {
			station.addTracks(tracks);
			return station;
		});
}

Station.create = function (owner, seedArtist) {
	var station = new Station({
		title:seedArtist.username + ' Radio'
	});

	return station.addArtist(seedArtist)
		.then(function () {
			var defer = Q.defer();
			station.user = owner;
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

};

Station.prototype.hasTrack = function (track) {
	var hasTrack = false;
	var incomingTrackId = (typeof track.id === 'undefined') ? track : track.id;

	this.tracks.forEach(function (trackReference) {
		if (trackReference.id === incomingTrackId) {
			hasTrack = true;
		}
	});


	return hasTrack;
};

Station.prototype.addTrack = function (track) {
	if (this.hasTrack(track) === false) {
		this.tracks.push({
			id:track.id,
			artist_permalink:track.user.permalink
		});
	}
}

Station.prototype.addTracks = function (tracks) {
	tracks.forEach(this.addTrack.bind(this));
}

Station.prototype.asJSON = function () {
	return {
		title:this.title,
		track_count:this.tracks.length,
		seed_artist_permalink:this.seed_artist_permalink,
		_id:this._id
	}
}

Station.prototype.populateHistory = function () {
	var defer = Q.defer();

	if (this.populated('history') === undefined) {
		this.populate('history', function () {
			defer.resolve();
		});
	} else {
		defer.resolve();
	}

	return defer.promise;
}

Station.prototype.populateTracks = function () {
	var defer = Q.defer();

	if (this.populated('tracks') === undefined) {
		this.populate('tracks', function () {
			defer.resolve();
		});
	} else {
		defer.resolve();
	}

	return defer.promise;
}

Station.prototype.getNextTrack = function () {
	var historyTrackIds = [];
	var historyArtistIds = [];
	var availableTracks = [];
	var trackIndex;


	this.history.forEach(function (history) {
		historyTrackIds.push(history.id);
		historyArtistIds.push(history.artist_permalink);
	});


	this.tracks.forEach(function (track) {
		if (historyTrackIds.indexOf(track.id) === -1 && historyArtistIds.indexOf(track.artist_permalink) === -1) {
			availableTracks.push(track);
		}
	});

	if (availableTracks.length === 0) {
		this.tracks.forEach(function (track) {
			if (historyTrackIds.indexOf(track.id) === -1) {
				availableTracks.push(track);
			}
		});
	}

	trackIndex = Math.round(Math.random() * (availableTracks.length - 1));



	return availableTracks[trackIndex];

}

/*
	@param track
	@param track.id -> soundcloud track id
	@param track.artist_permalink -> soundcloud artist permalink
*/
Station.prototype.addToHistory = function (track) {
	this.history.push(track);

	if (this.history.length > 10) {
		this.history.shift();
	}
}

Station.prototype.addArtist = function (artist) {
	var station = this;
	
	return artist.soundcloudGetTracks()
	
	.then(function (tracks) {
		var defer = Q.defer();

		tracks.forEach(station.addTrack.bind(station));
		station.save(function () {
			defer.resolve(station);
		});

		return defer.promise;

	});
}

module.exports = Station;