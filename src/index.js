const path = require('path');
const fs = require('fs');

const credentials = require('../credentials.json');
const config = require('../config.json');
const api = require('./api.js');

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

async function main() {
  console.log('Trying to authenticate...');
  const session = await api.postSession();

  if (session && !session.err && session.users.username === credentials.username && session.authToken) {
    console.log('Success!' /*, session.authToken*/);
    return session;
  } else {
    console.error('Error: Cannot authenticate, check your username and password.');
    console.error(session);
    process.exit(1);
  }
}

main()
  .then((text) => {
    const endTime = new Date();
    console.log(`Done, took ${endTime - startTime}ms`);
  })
  .catch((err) => {
    console.error(`Unexpected error: ${err}`);
    process.exit(1);
  });
