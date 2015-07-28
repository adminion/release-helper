rm -rf tmp/
git clone . tmp/
cp release.js tmp/release.js
cd tmp/
node release.js major
git status
git gr
