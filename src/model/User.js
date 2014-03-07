var mongoose = require('mongoose');
var Q = require('q');
var station = require('./Station');


var userSchema = new mongoose.Schema({
	"id": Number,
	"username": String,
	"stations":[{type: mongoose.Schema.Types.ObjectId, ref: 'Station'}],
	"history":[]
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

User.prototype.addToHistory = function (track) {
	this.history.push(track);

	if(this.history.length > 20) {
		this.history.shift();
	}
}

User.prototype.asJSON = function () {
	return {
		username:this.username,
		history:this.history
	};
};


module.exports = User;