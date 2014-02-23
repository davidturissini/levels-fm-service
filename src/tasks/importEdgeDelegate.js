var fs = require('fs');
var cp = require('child_process');

module.exports = function (artistPermalink, stationId, edgeLimit) {
	edgeLimit = edgeLimit || 30;
	var process = cp.fork(__dirname + '/import_edge.js', ['-a', artistPermalink, '-s', stationId, '-el', edgeLimit]);

}