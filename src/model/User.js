var mongoose = require('mongoose');
var Q = require('q');
var station = require('./Station');
var passwordHash = require('password-hash');
var crypto = require('crypto');


var USER_CREATE_ERR = 'Could not create user: ';
var USER_LOGIN_ERR = 'Could not log user in: Username or password does not match';

var userSchema = new mongoose.Schema({
	"id": Number,
	"username": String,
	"stations":[{type: mongoose.Schema.Types.ObjectId, ref: 'Station'}],
	"history":[],
	"password":String,
	"tokens":[]
});


var User = mongoose.model('User', userSchema);


User.create = function (params) {
	var user;
	var username = params.username;
	var password = params.password;
	var passwordMatch = params.confirm;

	if (typeof username !== 'string') {
		throw new TypeError(USER_CREATE_ERR + '\'' + username + '\' is not a valid username');
	}

	if (password === undefined || passwordMatch === undefined || password !== passwordMatch) {
		throw new TypeError(USER_CREATE_ERR + 'passwords do not match');
	}

	params.password = passwordHash.generate(password);

	return new User(params);
}

User.checkUserNameExists = function (username) {
	var defer = Q.defer();

	User.count({username:username}, function (err, count) {
		var exists = (count !== 0);
		defer.resolve(exists);
	});

	return defer.promise;
}

User.login = function (username, password) {
	var shaPassword = passwordHash.generate(password);

	return User.findOne({
				username:username
			}).exec()
			.then(function (user) {
				if (!user || !passwordHash.verify(password, user.password)) {
					throw new Error(USER_LOGIN_ERR);
				}

				return user.__generateToken();

			});

}

User.findLoggedIn = function (username, token) {
	var defer = Q.defer();
	
	User.findOne({
		username:username
	}).exec().then(function (user) {

		if (user && user.tokens.indexOf(token) !== -1) {
			defer.resolve(user);
		} else {
			defer.resolve(null);
		}
	});

	return defer.promise;
}


User.isCurrentUser = function (user, cookies) {

}


User.prototype.__generateToken = function () {
	var defer = Q.defer();
	var user = this;

	crypto.randomBytes(48, function(ex, buf) {
	  var token = buf.toString('hex');
	  user.tokens.push(token);
	  defer.resolve({
	  	user:user,
	  	token:token
	  });
	});

	return defer.promise;
}


User.prototype.addToHistory = function (track) {
	this.history.push(track);

	if(this.history.length > 20) {
		this.history.shift();
	}
}

User.prototype.logout = function (token) {
	var tokenIndex = this.tokens.indexOf(token);
	
	this.tokens.splice(tokenIndex, 1);
}

User.prototype.asJSON = function () {
	return {
		username:this.username,
		history:this.history
	};
};


module.exports = User;