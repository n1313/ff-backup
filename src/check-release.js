const packageJson = require('../package.json');
const request = require('./request.js');

const LATEST_RELEASE_URL = 'https://api.github.com/repos/n1313/ff-backup/releases/latest'; // doesn't include prereleases
const REPO_URL = 'https://github.com/n1313/ff-backup';

const checkForLatestRelease = async () => {
  const latestRelease = await request.get(LATEST_RELEASE_URL);
  if (latestRelease && latestRelease.tag_name) {
    if (latestRelease.tag_name !== packageJson.version) {
      console.log('There is an update available');
      console.log('Current version is', packageJson.version);
      console.log('Latest version is', latestRelease.tag_name);
      console.log('Visit', REPO_URL, 'to update');
    }
  }
};

checkForLatestRelease();
