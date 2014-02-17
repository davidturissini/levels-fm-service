var mongoose = require('mongoose');
var Q = require('q');
var station = require('./station');


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


exports.schema = userSchema;
exports.create = createUser;
exports.User = User;