var fs = require('fs');
var cp = require('child_process');

module.exports = function (artistPermalink, stationId) {
	var filename = stationId + new Date().getTime();

	cp.fork(__dirname + '/import_edge.js', ['-s', stationId, '-a', artistPermalink]);

}