var mongoose = require('mongoose');
var Q = require('q');
var station = require('./Station');


var userSchema = new mongoose.Schema({
	"id": Number,
	"username": String,
	"stations":[{type: mongoose.Schema.Types.ObjectId, ref: 'Station'}]
});


var User = mongoose.model('User', userSchema);


function createUser (params) {
	var user = new User(params || {});
	var defer = Q.defer();

	user.save(function (err, result) {
		defer.resolve(user);
	});

	return defer.promise;

}


module.exports = User;