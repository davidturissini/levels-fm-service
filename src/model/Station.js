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
	"history":[],
	"status":String
});


var Station = mongoose.model('Station', stationSchema);
/*
Station.findByIdAndAddTracks = function (id, tracks) {
	console.log('saving tracks to station', id);
	return Station.findById(id).exec()
		.then(function (station) {
			station.addTracks(tracks);
			return station;
		});
}
*/
Station.create = function (owner, seedArtist) {
	var station = new Station({
		title:seedArtist.username + ' Radio'
	});

	return station.addArtist(seedArtist)
		.then(function () {
			var defer = Q.defer();
			station.user = owner;
			station.seed_artist_permalink = seedArtist.permalink;
			station.status = 'importing';
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

	return !(this.getTrackById(incomingTrackId) === null);
};

Station.prototype.addTrack = function (track, reason, ranking) {
	if (this.hasTrack(track) === false) {
		this.tracks.push({
			id:track.id,
			artist_permalink:track.user.permalink,
			duration:track.duration,
			title:track.title,
			reason:reason,
			ranking:ranking
		});
	}
}

Station.prototype.getTotalDuration = function () {
	var duration = 0;

	this.tracks.forEach(function (track) {
		duration += track.duration;
	});

	return duration;
}

Station.prototype.addTracks = function (tracks, reason) {
	tracks.forEach(function (track) {
		this.addTrack(track, reason);
	});
}

Station.prototype.asJSON = function () {
	return {
		title:this.title,
		track_count:this.tracks.length,
		seed_artist_permalink:this.seed_artist_permalink,
		totalDuration:this.getTotalDuration(),
		history:this.history,
		status:this.status,
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

	availableTracks = _.sortBy(availableTracks, function (a) {
		return -a.ranking;
	});



	trackIndex = Math.round(Math.pow(Math.random(), 3) * (availableTracks.length - 1));

	if (this.history.length < 5) {
		trackIndex = 0;
	}



	return availableTracks[trackIndex];

}

/*
	@param track
	@param track.id -> soundcloud track id
	@param track.artist_permalink -> soundcloud artist permalink
*/
Station.prototype.addToHistory = function (track) {
	this.history.push(track);

	if (this.history.length > Math.round(this.tracks.length * 0.5)) {
		this.history.shift();
	}
}

Station.prototype.addArtist = function (artist) {
	var station = this;
	
	return artist.soundcloudGetTracks()
	
	.then(function (tracks) {
		var defer = Q.defer();

		tracks.forEach(function (track) {
			station.addTrack(track, 'You liked ' + artist.username, 100);
		});
		station.save(function () {
			defer.resolve(station);
		});

		return defer.promise;

	});
}

Station.prototype.getTrackIndex = function (track) {
	return this.tracks.indexOf(track);
}

Station.prototype.getTrackById = function (trackId) {
	var match = null;

	for(var i = 0; i < this.tracks.length; i+= 1) {
		if (this.tracks[i].id.toString() === trackId.toString()) {
			match = this.tracks[i];
			break;
		}
	}


	return match;
}

Station.prototype.removeTrack = function (trackId) {
	var track = this.getTrackById(trackId);
	var trackIndex;

	if (track !== null) {
		trackIndex = this.getTrackIndex(track);
		this.tracks.splice(trackIndex, 1);
	}

	return track;
}

module.exports = Station;