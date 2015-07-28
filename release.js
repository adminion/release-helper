var async = require('async');
var child_process = require('child_process');
var fs = require('fs');
var util = require('util');

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


var branch, release;

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
      break;  

    case "minor": 
      if (!majorBranchPattern.test(branch) ) {
        logError(new Error('Minor releases must be cut from a major-version branch!'));
        process.exit(1);
      }
      break;

    case "patch": 
    case undefined:
      if (!majorBranchPattern.test(branch)) {
        logError(new Error('Patch releases must be cut from a major-version branch!'));
        process.exit(1);
      } 

      break;

    default: 
      var message = util.format('Invalid release type "%s".  Must be "major", "minor", or "patch" (default)', RELEASE_TYPE);
      logError(new Error(message));
      break;
  }



});


function majorRelease () {

  var release  = "v" + VERSION;
  var workingOn = util.format('v%s.0.0', VERSION_MAJOR +1);

  console.log("Building release ", release );

  var commands = [ 
    'git checkout -b release-' + release,
    util.format('changes=`changelog-maker` && sed -i "4i # %s\n\n## %s\n$changes\n" CHANGES.md', branch, release),
    'rm -f ../node_modules/',
    'npm install',
    'npm test',
    'npm run coverage',
    'npm run docs',
    'git commit -a -m "release ' + release + '"',
    'git checkout master',
    'git merge release-' + release,
    'git tag ' + release,
    'git branch ' + branch,
    'git push adminion ' + release + ' ' + branch,
    'npm publish',
    'npm --no-git-tag-version version major',
    'git commit -a -m "working on ' + workingOn
  ];

  commands.forEach(function (command) {
    console.log(command);
  })

  if (!FLAG_OUTPUT_ONLY) {
    async.each(commands, executeCommand, commandsExecuted);
  } 
}

function minorRelease () {

  var release  = util.format('v%s.%s.0', VERSION_MAJOR, VERSION_MINOR + 1);
  var workingOn = util.format('v%s.%s.1', VERSION_MAJOR, VERSION_MINOR + 1);
  
  console.log("Building release ", release );

  var commands = [ 
    'git checkout -b release-' + release,
    'npm --no-git-tag-version version minor',
    util.format('changes=`changelog-maker` && sed -i "6i ## %s\n$changes\n" CHANGES.md', release),
    'rm -f ../node_modules/',
    'npm install',
    'npm test',
    'npm run coverage',
    'npm run docs',
    'git commit -a -m "release ' + release + '"',
    'git checkout ' + branch,
    'git merge release-' + release,
    'git tag ' + release,
    'git push adminion ' + release + ' ' + branch,
    'npm publish',
    'npm --no-git-tag-version version minor',
    'git commit -a -m "working on ' + workingOn
  ];

  commands.forEach(function (command) {
    console.log(command);
  })

  if (!FLAG_OUTPUT_ONLY) {
    async.each(commands, executeCommand, commandsExecuted);
  } 

}

function patchRelease () {

  var release = 'v' + VERSION;
  var workingOn = util.format('v%s.%s.%s', VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH + 1);

  console.log("Building release ", release );

  var commands = [ 
    'git checkout -b release-' + release,
    util.format('changes=`changelog-maker` && sed -i "6i ## %s\n$changes\n" CHANGES.md', release),
    'rm -f ../node_modules/',
    'npm install',
    'npm test',
    'npm run coverage',
    'npm run docs',
    'git commit -a -m "release ' + release + '"',
    'git checkout ' + branch,
    'git merge release-' + release,
    'git tag ' + release,
    'git push adminion ' + release + ' ' + branch,
    'npm publish',
    'npm --no-git-tag-version version patch',
    'git commit -a -m "working on ' + workingOn
  ];

  commands.forEach(function (command) {
    console.log(command);
  })

  if (!FLAG_OUTPUT_ONLY) {
    async.each(commands, executeCommand, commandsExecuted);
  } 

}

function executeCommand (command, done) {

  var child = child_process.exec(command);

  var output = '';

  child.stdout.on('data', function stdout (data) {
    console.log(data);
    output += data;
  });

  child.stderr.on('data', function stderr (data) {
    console.log('stderr: ' + data);
    var err = new Error('error spawning: ', command);
    console.log(err.message);
    done(err);
  });

  child.on('close', function close (code) {
    if (code !== 0) {
      done (new Error('child closed with code '+code));
    } else {
      done(null, output);
    }
  });
}

function commandsExecuted (err) {
  if (err) {
      console.error(err);
      process.exit(1);
  } 

  console.log('release build complete.');
}