var Q = require('q');
var soundcloud = require('soundcloud').soundcloud;
var artist = require('./src/artist');
var Artist = artist.Artist;
var track = require('./src/track');
var Track = track.Track;
var database = require('./src/database');

soundcloud.configure({
	client_id:'99308a0184193d62e064cb770f4c1eae'
});


function findOrCreateArtist (permalink, attributes) {
	return findArtist({permalink:permalink})
		.then(function (localMatches) {
			var artist;

			if (localMatches.length === 1) {
				return localMatches[0];

			} else {

				artist = new Artist(attributes);

				return saveArtist(artist)
					.then(function () {
						return artist;
					});
				
			}
			
		});
}


function findOrFetchArtist (permalink) {
	return findArtist({permalink:permalink})
		.then(function (localMatches) {
			var artist;

			if (localMatches.length === 1) {
				return localMatches[0];

			} else {
				
				return soundcloud.api('/users/' + permalink)
					.then(function (artistData) {
						artist = new Artist(artistData);

						return saveArtist(artist);
					})

					.then(function () {
						return artist;
					})
			}
			
		});
}

function allArtists(skip) {
	var defer = Q.defer();

	var query = Artist.find().skip(skip).limit(3000);

	query.exec(function (err, artists) {
		defer.resolve(artists);
	});

	return defer.promise;
}


function findArtist (props) {
	var defer = Q.defer();

	
	Artist.find(props, function (e, artist) {
		defer.resolve(artist);
	});

	return defer.promise; 
}

function saveArtist (artist) {
	var defer = Q.defer();

	artist.save(function () {
		defer.resolve();
	});

	return defer.promise;
}

function pushQueue(permalink) {
	if (traversed.indexOf(permalink) === -1 && queue.indexOf(permalink) === -1) {
		queue.push(permalink);
	}
}


var queue = ['dave-airborne'];
var traversed = [];

var artists = [];

function traverseGraph() {

	var userName = queue.shift();
	var artist;
	console.log('current queue length', queue.length);
	if (userName === undefined) {
		return;
	}

	traversed.push(userName);
	console.log('+++++++++++++++');
	console.log('fetching followers for', userName);
	console.log('--------------');


	return findOrFetchArtist(userName)

		.then(function (found) {
			artist = found;
			return soundcloud.api('/users/' + userName + '/followings');
		})

		.then(function (followings) {
			
			var promises = [];


			followings.forEach(function (following) {
				console.log('looking up following', following.permalink);
				var promise = findOrCreateArtist(following.permalink, following)
					.then(function (followedArtist) {

						artist.followings.push(followedArtist);


						pushQueue(following.permalink);

						return saveArtist(artist);
					});
				

				promises.push(promise);

			});

			return Q.all(promises);
		})

		.then(function () {
			return soundcloud.api('/users/' + userName + '/followers');
		})

		.then(function (followers) {
			var promises = [];


			followers.forEach(function (follower) {
				console.log('looking up follower', follower.permalink);
				var promise = findOrCreateArtist(follower.permalink, follower)
					.then(function (followedArtist) {
						artist.followers.push(followedArtist);
						pushQueue(follower.permalink);

						return saveArtist(artist);
					});
				

				promises.push(promise);

			});

			return Q.all(promises);
		})

		.then(traverseGraph);
}


function saveTracks(tracksData) {
	var promises = [];
	var tracks = [];

	tracksData.forEach(function (trackData) {
		var track = new Track(trackData);
		var defer = Q.defer();

		track.save(function () {
			tracks.push(track);
			defer.resolve();
		});

		promises.push(defer.promise);

	});

	return Q.all(promises)
		.then(function () {
			return tracks;
		});

}

var skip = 0;

console.log('fetching all artists');

function populateTracks() {

	var userName = queue.shift();
	var artist;
	console.log('current queue length', queue.length);
	if (userName === undefined) {
		return;
	}

	traversed.push(userName);

	console.log('+++++++++++++++');
	console.log('fetching tracks for', userName);
	console.log('--------------');


	var query = Artist.findOne({
		permalink:userName
	}).populate('followings').populate('followers');

		query.exec().then(function (match) {
			artist = match;
			var promises = [];
			var followings = artist.followings;
			var followers = artist.followers;

			followings.forEach(function (following) {
				pushQueue(following.permalink);
			});

			followers.forEach(function (following) {
				pushQueue(following.permalink);
			});

			artist.tracks = [];
			return saveArtist(artist);

		})

		.then(function () {

			return soundcloud.api('/users/' + artist.permalink + '/tracks');
			
		})

		.then(function (tracksData) {
			var promises = [];

			if (tracksData.errors) {
				return;
			}

			tracksData.forEach(function (trackData) {
				console.log('creating track', trackData.permalink_url);
				var promise = track.create(artist, trackData);
				promises.push(promise);
			})

			return Q.all(promises);
			
		})

		.then(populateTracks);



}



database.connect()
	.then(function () {
		/*
		

		Artist.remove(function () {
			traverseGraph();
		});
*/
		
		Track.remove(function () {
			populateTracks();
		});

	});


/*

Artist.remove(function () {
			var artistName = artistsQueue.shift();
			console.log('Fetching ' + artistName);
			getUserTracks(artistName)
				.then(function (artistData, trackData) {
					var artist = new Artist(artistData);
					
					console.log('Saving ' + artistName);
					artist.save(function () {
						console.log('Saved ' + artistName);
						console.log('------------');
					});

				})
			
		});

	*/