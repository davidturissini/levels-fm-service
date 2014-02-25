var mongoose = require('mongoose');
var Q = require('q');


function createTrack (trackData, artistData) {


    var defer = Q.defer();
    var track = new Track(trackData);
    track.artist_permalink = artistData.permalink;

    track.save(function (err, result) {
        defer.resolve(track);
    });

    return defer.promise;

}


var trackSchema = mongoose.Schema({
    "artist_permalink": String,
    "id": Number,
    "created_at": Date,
    "user_id": Number,
    "duration": Number,
    "commentable": Boolean,
    "state": String,
    "sharing": String,
    "tag_list": String,
    "permalink": String,
    "description": String,
    "streamable": Boolean,
    "downloadable": Boolean,
    "genre": String,
    "release": String,
    "purchase_url": String,
    "label_id": String,
    "label_name": String,
    "isrc": String,
    "video_url": String,
    "track_type": String,
    "key_signature": String,
    "bpm": Number,
    "title": String,
    "release_year": Number,
    "release_month": Number,
    "release_day": Number,
    "original_format": String,
    "original_content_size": Number,
    "license": String,
    "uri": String,
    "permalink_url": String,
    "artwork_url": String,
    "waveform_url": String,
    "stream_url": String,
    "download_url": String,
    "playback_count": Number,
    "download_count": Number,
    "favoritings_count": Number,
    "comment_count": Number,
    "attachments_uri": String
});


var Track = mongoose.model('Track', trackSchema);

Track.create = createTrack;

Track.findOrCreate = function (trackData, artist) {

    var query = Track.findOne({
        permalink_url:trackData.permalink_url
    });

    return query.exec()
        .then(function (track) {

            if (!track) {
                return Track.create(trackData, artist);

            }
            
            return track;
            
        });

    
}



module.exports = Track;