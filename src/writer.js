const path = require('path');
const fs = require('fs');

const utils = require('./utils.js');
const config = require('../config.json');
const credentials = require('../credentials.json');

const writeAPIData = (filePath, data) => {
  const serverFolder = config.server.split('//')[1];
  const absPath = path.resolve(__dirname, '..', config.dataFolder, serverFolder, credentials.username, filePath);
  const dirname = path.dirname(absPath);
  const basename = path.basename(absPath);
  fs.mkdirSync(dirname, { recursive: true });
  return utils.writeJSON(absPath, data);
};

module.exports = {
  writeAPIData,
};
