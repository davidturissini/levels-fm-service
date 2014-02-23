var soundcloud = require('soundcloud').soundcloud;
var importTracksFromArtist = require('./src/tasks/import_tracks_from_artist');

soundcloud.configure({
	client_id:'99308a0184193d62e064cb770f4c1eae'
});


importTracksFromArtist('dave-airborne');