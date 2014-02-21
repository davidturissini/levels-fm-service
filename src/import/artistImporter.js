var Q = require('q');
var soundcloud = require('soundcloud').soundcloud;
var Artist = require('./../model/Artist');


var ArtistImporter = {

	importFollowings: function (artist) {
		var defer = Q.defer();


		artist.populate('followings', function () {
			defer.resolve();
		});

		return defer.promise.then(function () {

			if (artist.followings_count === artist.followings.length || (artist.followings_count > 8000 && artist.followings.length === 8000)) {
				return artist.followings;
			}


			return soundcloud.joinPaginated('/users/' + artist.permalink + '/followings', 199, artist.followings_count);
		}.bind(this))

		.then(function (followersData) {	
			var promises = [];


			followersData.forEach(function (followerData) {
				var promise;

				if (artist.hasFollowing(followerData.permalink) === true) {
					return;
				}

				var query = Artist.findOne({
					permalink:followerData.permalink
				});



				promise = query.exec()
					.then(function (match) {
						var follower = match;

						var defer = Q.defer();

						if (!follower) {
							follower = new Artist(followerData);

							follower.save(function () {
								defer.resolve(follower);
							});

							return defer.promise;
						}

						return follower;
						

					})

					.then(function (follower) {
						artist.followings.push(follower);
					});

				promises.push(promise);

			});

			return Q.all(promises);

		})

		.then(function () {
			return artist;
		})
	},

	importFollowers: function (artist) {
		var defer = Q.defer();

		artist.populate('followers', function () {
			defer.resolve();
		});

		return defer.promise.then(function () {
			if (artist.followers_count === artist.followers.length || (artist.followers_count > 8000 && artist.followers.length > 8000)) {
				return artist.followers;
			}

			return soundcloud.joinPaginated('/users/' + artist.permalink + '/followers', 199, artist.followers_count);
			
		}.bind(this))

		.then(function (followersData) {	
			var promises = [];
			console.log('followers fetched', followersData.length)

			followersData.forEach(function (followerData) {
				var promise;
				var defer = Q.defer();

				if (artist.hasFollower(followerData) === true) {
					return;
				}

				var query = Artist.findOne({
					permalink:followerData.permalink
				});
				

				promise = query.exec()
					.then(function (match) {
						var follower = match;
						var defer = Q.defer();

						if (!follower) {
							follower = new Artist(followerData);

							follower.save(function () {
								defer.resolve(follower);
							});

							
						} else {
							defer.resolve(follower);
						}

						return defer.promise;

					})

					.then(function (follower) {
						artist.followers.push(follower);
					});

				promises.push(promise);

			});

			return Q.all(promises);

		})

		.then(function () {
			return artist;
		})
	},

	findOrImport: function (permalink) {
		var artistImport = this;
		var artistQuery = Artist.findOne({permalink:permalink});

		return artistQuery.exec()
			.then(function (artist) {
				if (!artist) {
					return artistImport.importArtist(permalink);
				}

				return artist;

			});
	},

	importArtist: function (permalink) {
		return soundcloud.api('/users/' + permalink)
			.then(function (artistData) {
				return new Artist(artistData);
			});

	},

	importEdge: function (permalink) {
		var artistImport = this;
		var artist;
		
		var query = Artist.findOne({
			permalink:permalink
		})

		return query.exec()
			.then(function (match) {
				artist = match;
				console.log('importing followings');
				return artistImport.importFollowings(artist);
			})

			.then(function () {
				console.log('importing followers');
				return artistImport.importFollowers(artist)
			})

			.then(function () {
				var defer = Q.defer();

				console.log('saving');
				artist.save(function () {
					defer.resolve(artist);
				});

				return defer.promise;
			})
	}

}


module.exports = ArtistImporter;