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

const authenticate = async () => {
  console.log('Trying to authenticate...');
  const session = await api.retrieveSession();

  if (session && !session.err && session.users.username === credentials.username && session.authToken) {
    console.log('Success!');
    writer.writeAPIData('session.json', session);
    return session;
  } else {
    console.error('Error: Cannot authenticate, check your username and password.');
    console.error(session);
    process.exit(1);
  }
};

const getPostsIndex = async (session) => {
  let isLastPage = false;
  let offset = 0;
  const posts = {};

  console.log('Downloading posts index...');

  while (!isLastPage) {
    const data = await api.retrievePosts(session, offset);
    isLastPage = data.isLastPage;
    data.posts.forEach((post) => {
      posts[post.id] = post;
    });
    const knownPosts = Object.keys(posts).length;
    offset = knownPosts;
    console.log('Got', knownPosts, 'posts...');
  }

  writer.writeAPIData('posts.json', posts);
  return posts;
};

const main = async () => {
  const data = {};

  data.session = await authenticate();
  data.posts = await getPostsIndex(data.session);
};

main()
  .then(() => {
    const endTime = new Date();
    console.log(`Done, took ${endTime - startTime}ms`);
  })
  .catch((err) => {
    console.error(`Unexpected error: ${err}`);
    process.exit(1);
  });
