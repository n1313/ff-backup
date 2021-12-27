const path = require('path');
const fs = require('fs');
const readline = require('readline');

const config = require('../config.json');
const credentials = require('../credentials.json');

const TIMELINE_FILE = 'json/timeline.json';
const POSTS_FILE = 'json/posts.json';
const COMMENTS_FILE = 'json/comments.json';
const USERS_FILE = 'json/users.json';
const ATTACHMENTS_FILE = 'json/attachments.json';
const FEEDS_FILE = 'json/feeds.json';

const writeJSON = (filePath, obj, beautify = 1) => {
  const string = JSON.stringify(obj, null, beautify ? 2 : 0);
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

const getAssetPath = (url = '') => {
  return url.split('/').slice(3).join('/');
};

const writeAssetsData = (url, data) => {
  const filePath = getAssetPath(url);
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
  const absPath = path.resolve(getDataFolder(), filePath);
  const dirname = path.dirname(absPath);
  fs.mkdirSync(dirname, { recursive: true });
  return writeJSON(absPath, data);
};

const readStoredAPIData = (filePath) => {
  const absPath = path.resolve(getDataFolder(), filePath);
  try {
    fs.accessSync(absPath, fs.constants.R_OK);
    return readJSON(absPath);
  } catch (err) {
    return null;
  }
};

const isValidSession = (session) => {
  return session && !session.err && session.users && session.users.username === credentials.username;
};

const progressMessage = (message) => {
  readline.clearLine(process.stdout);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(message);
};

const isDirect = (post, feeds) => {
  const directRecipients = post.postedTo.filter((subscriptionId) => {
    const subscriptionType = (feeds[subscriptionId] || {}).name;
    return subscriptionType === 'Directs';
  });
  const isDirect = directRecipients.length > 0;
  return isDirect;
};

const templateCache = {};
const template = (name, data = {}) => {
  let templateHTML;
  if (templateCache[name]) {
    templateHTML = templateCache[name];
  } else {
    templateHTML = fs.readFileSync(`./src/templates/${name}.html`, 'utf8');
    templateCache[name] = templateHTML;
  }
  Object.keys(data).forEach((key) => {
    const templateKey = key.toLocaleUpperCase();
    templateHTML = templateHTML.replace(new RegExp(`\\$${templateKey}`, 'g'), String(data[key]));
  });
  return templateHTML.trim();
};

const writeHTMLData = (filePath, data) => {
  const absPath = path.resolve(getDataFolder(), filePath);
  const dirname = path.dirname(absPath);
  fs.mkdirSync(dirname, { recursive: true });
  return writeFile(absPath, data);
};

const readableDate = (date) => {
  return date.toLocaleDateString('en-GB');
};

const safeText = (string) => {
  return string.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const postSlug = (post, MAX = 50) => {
  const bodyText = (post.body || '').trim();

  if (!bodyText) {
    return String(post.id);
  }
  if (bodyText.length <= MAX) {
    return safeText(bodyText);
  }
  const words = bodyText.split(' ');
  if (words[0].length > MAX) {
    return safeText(bodyText.slice(0, MAX - 3) + '...');
  }
  let sliced = '';
  while (sliced.length + words[0].length < MAX) {
    sliced += `${words.shift()} `;
  }
  return safeText(sliced.trim() + '...');
};

module.exports = {
  TIMELINE_FILE,
  POSTS_FILE,
  COMMENTS_FILE,
  USERS_FILE,
  ATTACHMENTS_FILE,
  FEEDS_FILE,
  writeAPIData,
  readStoredAPIData,
  isValidSession,
  progressMessage,
  getDataFolder,
  getAssetPath,
  writeAssetsData,
  assetFileExists,
  isDirect,
  template,
  writeHTMLData,
  readableDate,
  safeText,
  postSlug,
};
