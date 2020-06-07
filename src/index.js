const path = require('path');
const fs = require('fs');

const api = require('./request.js');
const credentials = require('../credentials.json');
const config = require('../config.json');

const startTime = new Date();

if (!credentials.username || !credentials.password) {
  console.error('Error: Invalid credentials, please update ./src/credentials.json with your username and password.');
  process.exit(1);
} else {
  console.log(`Hello, ${credentials.username}!`);
}

if (!config.target) {
  console.error('Error: Invalid target, please update ./src/config.json with valid target URL.');
  process.exit(1);
} else {
  console.log(`Targeting ${config.target}`);
}

console.log('Trying to authenticate...');

await api.get;

const endTime = new Date();

console.log(`Done, took ${endTime - startTime}ms`);
