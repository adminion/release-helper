
git clone . tmp/ && cd tmp/
git remote add adminion git@github.com:adminion/release-helper.git
node release.js $1
git status
git gr
