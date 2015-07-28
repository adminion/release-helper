rm -rf tmp/
git clone . tmp/
cp release.js tmp/release.js
cd tmp/
git remote add adminion git@github.com:adminion/release-helper.git
node release.js major
git status
git gr
