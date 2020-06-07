const credentials = require('../credentials.json');
const config = require('../config.json');
const api = require('./api.js');
const writer = require('./writer.js');

const startTime = new Date();

if (!credentials.username || !credentials.password) {
  console.error('Error: Invalid credentials, please update ./src/credentials.json with your username and password.');
  process.exit(1);
} else {
  console.log(`Hello, ${credentials.username}!`);
}

if (!config.server) {
  console.error('Error: Invalid server, please update ./src/config.json with valid server URL.');
  process.exit(1);
} else {
  console.log(`Targeting ${config.server}`);
}

async function main() {
  console.log('Trying to authenticate...');
  const session = await api.postSession();

  if (session && !session.err && session.users.username === credentials.username && session.authToken) {
    console.log('Success!');
    writer.writeAPIData('session.json', session);
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
