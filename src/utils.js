const path = require('path');
const fs = require('fs');
const readline = require('readline');

const config = require('../config.json');
const credentials = require('../credentials.json');

const writeJSON = (filePath, obj) => {
  const string = JSON.stringify(obj);
  return writeFile(filePath, string);
};

const writeFile = (filePath, string) => {
  return fs.writeFileSync(filePath, string, 'UTF-8');
};

const readJSON = (filePath) => {
  return JSON.parse(readFile(filePath));
};

const readFile = (filePath) => {
  return fs.readFileSync(filePath, 'UTF-8');
};

const getDataFolder = () => {
  const serverFolder = config.server.split('//')[1];
  return path.resolve(__dirname, '../data', serverFolder, credentials.username);
};

const writeAssetsData = (url, data) => {
  const filePath = url.split('/').slice(3).join('/');
  const absPath = path.resolve(getDataFolder(), filePath);
  const dirname = path.dirname(absPath);
  fs.mkdirSync(dirname, { recursive: true });
  return writeFile(absPath, data);
};

const assetFileExists = (url) => {
  const filePath = url.split('/').slice(3).join('/');
  const absPath = path.resolve(getDataFolder(), filePath);
  try {
    fs.accessSync(absPath, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
};

const writeAPIData = (filePath, data) => {
  // console.log('Writing to', filePath);
  const absPath = path.resolve(getDataFolder(), filePath);
  const dirname = path.dirname(absPath);
  fs.mkdirSync(dirname, { recursive: true });
  return writeJSON(absPath, data);
};

const readStoredAPIData = (filePath) => {
  // console.log('Reading from', filePath);
  const absPath = path.resolve(getDataFolder(), filePath);
  try {
    fs.accessSync(absPath, fs.constants.R_OK);
    return readJSON(absPath);
  } catch (err) {
    return null;
  }
};

const isValidSession = (session) => {
  return (
    session && !session.err && session.users && session.users.username === credentials.username && session.authToken
  );
};

const progressMessage = (message) => {
  readline.clearLine(process.stdout);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(message);
};

module.exports = {
  writeAPIData,
  readStoredAPIData,
  isValidSession,
  progressMessage,
  getDataFolder,
  writeAssetsData,
  assetFileExists,
};
