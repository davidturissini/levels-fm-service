var mongoose = require('mongoose');
var user = require('./User');
var Q = require('q');
var trackImporter = require('./../import/trackImporter');
var artistImporter = require('./../import/artistImporter');
var Track = require('./Track');

var stationSchema = new mongoose.Schema({
	"title":String,
	"seed_artist":{type: mongoose.Schema.Types.ObjectId, ref: 'Artist'},
	"seed_artist_permalink":String,
	"user":[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	"tracks":[{type: mongoose.Schema.Types.ObjectId, ref: 'Track'}],
	"history":[{type: mongoose.Schema.Types.ObjectId, ref: 'Track'}]
});


var Station = mongoose.model('Station', stationSchema);

Station.create = function (owner, seedArtist) {
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

};

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
		this.tracks.push(track);
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

	return this.populateHistory()
		.then(function () {

			var artistPermalinks = [];
			var trackIds = [];
			var idFilters;

			this.history.forEach(function (track) {
				artistPermalinks.push(track.artist_permalink);
				trackIds.push(track._id);
			});


			idFilters = {
				'$in':this.tracks,
				'$nin':trackIds
			};

			return Track.find({
				_id:idFilters,
				artist_permalink:{
					'$nin':artistPermalinks
				}
			}).exec()

			.then(function (tracks) {

				if (tracks.length === 0) {

					return Track.find({
						_id:idFilters
					}).exec()

				} else {
					return tracks;
				}

			})

			.then(function (tracks) {
				var trackIndex = Math.round(Math.random() * (tracks.length - 1));
				var track = tracks[trackIndex];

				return track;

			});


		}.bind(this));

}

Station.prototype.addToHistory = function (track) {
	var defer = Q.defer();

	this.history.push(track);

	if (this.history.length > 10) {
		this.history.shift();
	}

	this.save(function () {
		defer.resolve();
	});

	return defer.promise;
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