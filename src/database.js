var Q = require('q');
var mongoose = require('mongoose');

function connectionString() {
	var mongoUri = process.env.MONGOLAB_URI || 
	  process.env.MONGOHQ_URL || 
	  'mongodb://localhost/foo'; 

	return mongoUri;
}


exports.connect = function () {
	var deferred = Q.defer();

	mongoose.connect(connectionString());

	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));

	db.once('open', function callback (e) {
		deferred.resolve(e);
	});

	return deferred.promise;
}