var mongoose = require('mongoose');
var track = require('./track');
var user = require('./user');
var Q = require('q');


function createStation (owner, seedArtist) {
	var defer = Q.defer();

	seedArtist.populate('followings', function () {
		defer.resolve();
	});

	return defer.promise
		.then(function () {
			var d = Q.defer();
			var station = new Station();


			seedArtist.tracks.forEach(function (track) {
				station.tracks.push(track);
			});


			seedArtist.followings.forEach(function (following) {
				if(following.tracks) {
					following.tracks.forEach(function (track) {
						station.tracks.push(track);
					});
				}
			});

			station.user = owner;
			station.save(function (err, result) {

				owner.stations.push(station);
				owner.save(function (err, result) {
					d.resolve(station);
				});
				
			});

			return d.promise;
			
		})

}


function saveStation (station) {
	var defer = Q.defer();

	station.save(function (err, result) {
		defer.resolve(station);
	});

	return defer.promise;
}


var stationSchema = new mongoose.Schema({
	"user":[{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	"tracks":[{type: mongoose.Schema.Types.ObjectId, ref: 'Track'}],
	"history":[{type: mongoose.Schema.Types.ObjectId, ref: 'Track'}]
});


var Station = mongoose.model('Station', stationSchema);


exports.schema = stationSchema;
exports.Station = Station;
exports.create = createStation;
exports.save = saveStation;