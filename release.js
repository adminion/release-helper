var async = require('async');
var child_process = require('child_process');
var fs = require('fs');
var util = require('util');

var REMOTE_REPO = 'adminion';

var currentBranchPattern = /^\* (.)+$/gm;
var majorBranchPattern = /v[0-9].x/gm;

var SCRIPT_NAME = process.argv[1].split('/').pop();
var RELEASE_TYPE = process.argv[2];
var FLAG_OUTPUT_ONLY = (process.argv[3] === '--output-only');

if (FLAG_OUTPUT_ONLY) {
  console.log('--output-only');
}

var VERSION = require('./package').version;
var VERSION_SPLIT = VERSION.split('.');

var VERSION_MAJOR = parseInt(VERSION_SPLIT[0]);
var VERSION_MINOR = parseInt(VERSION_SPLIT[1]);
var VERSION_PATCH = parseInt(VERSION_SPLIT[2]);

var branch, release, workingOn;

function logError (error) {
  console.log(SCRIPT_NAME + ': Error: ' + error.message);
}

executeCommand('git branch', function (err, gitBranchOutput) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  branch = gitBranchOutput.match(currentBranchPattern)[0].split(' ')[1];

  switch (RELEASE_TYPE) {
    case "major": 
      if (branch !== 'master') {
        logError(new Error('Major releases must be cut from master!'));
        process.exit(1);
      } 
      majorRelease();
      break;  

    case "minor": 
      if (!majorBranchPattern.test(branch) ) {
        logError(new Error('Minor releases must be cut from a major-version branch!'));
        process.exit(1);
      }
      minorRelease();
      break;

    case "patch": 
    case undefined:
      if (!majorBranchPattern.test(branch)) {
        logError(new Error('Patch releases must be cut from a major-version branch!'));
        process.exit(1);
      } 
      patchRelease();
      break;

    default: 
      var message = util.format('Invalid release type "%s".  Must be "major", "minor", or "patch" (default)', RELEASE_TYPE);
      logError(new Error(message));
      break;
  }

});


function majorRelease () {

  release  = "v" + VERSION;
  workingOn = util.format('v%s.0.0', VERSION_MAJOR +1);
  branch = "v" + VERSION_MAJOR + ".x";

  executeBatch([ 
    'git checkout -b release-' + release,
    util.format('changes=`changelog-maker`; sed -i "4i # %s\n\n## %s\n${changes}\n" CHANGES.md', branch, release),
    'npm install',
    // 'npm test',
    // 'npm run coverage',
    // 'npm run docs',
    'git commit -a -m "release ' + release + '"',
    'git checkout master',
    'git merge release-' + release,
    'git tag ' + release,
    'git branch ' + branch,
    // util.format('git push %s %s %s', REMOTE_REPO, release, branch),
    // 'npm publish',
    'npm --no-git-tag-version version major',
    'git commit -a -m "working on ' + workingOn + '"'
  ]);
  
}

function minorRelease () {

  release  = util.format('v%s.%s.0', VERSION_MAJOR, VERSION_MINOR + 1);
  workingOn = util.format('v%s.%s.1', VERSION_MAJOR, VERSION_MINOR + 1);
  
  executeBatch([ 
    'git checkout -b release-' + release,
    'npm --no-git-tag-version version minor',
    util.format('changes=`changelog-maker`; sed -i "6i ## %s\n${changes}\n" CHANGES.md', release),
    'npm install',
    'npm test',
    'npm run coverage',
    'npm run docs',
    'git commit -a -m "release ' + release + '"',
    'git checkout ' + branch,
    'git merge release-' + release,
    'git tag ' + release,
    // util.format('git push %s %s %s', REMOTE_REPO, release, branch),
    // 'npm publish',
    'npm --no-git-tag-version version minor',
    'git commit -a -m "working on ' + workingOn + '"'
  ]);

}

function patchRelease () {

  release = 'v' + VERSION;
  workingOn = util.format('v%s.%s.%s', VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH + 1);

  executeBatch([ 
    'git checkout -b release-' + release,
    util.format('changes=`changelog-maker`; sed -i "6i ## %s\n${changes}\n" CHANGES.md', release),
    'npm install',
    'npm test',
    'npm run coverage',
    'npm run docs',
    'git commit -a -m "release ' + release + '"',
    'git checkout ' + branch,
    'git merge release-' + release,
    'git tag ' + release,
    // util.format('git push %s %s %s', REMOTE_REPO, release, branch),
    // 'npm publish',
    'npm --no-git-tag-version version patch',
    'git commit -a -m "working on ' + workingOn + '"'
  ]);

}

function executeBatch (commands) {
  commands.forEach(function (command) {
    if (FLAG_OUTPUT_ONLY) { 
      console.log(command);
    } else {
      console.log('Building release ' + release);
      
      var output = child_process.execSync(command);
      console.log(output);
    }
  });
  
  console.log('release %s build complete.', release);
}

function executeCommand (command, done) {

  console.log('executing command: ' + command);

  var child = child_process.exec(command);

  var output = '';

  child.stdout.on('data', function stdout (data) {
    console.log(data);
    output += data;
  });

  child.stderr.on('data', function stderr (data) {
    console.log('stderr: ' + data);
    output += data;
  });

  child.on('close', function close (code) {
    if (code !== 0) {
      done (new Error('"' + command + '" closed with code '+code));
    } else {
      done(null, output);
    }
  });
}
