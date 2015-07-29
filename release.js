
var child_process = require('child_process');

module.exports = function releaseHelper (done) {
  child_process.execFile('./release.sh', process.argv.slice(2), done);

});

