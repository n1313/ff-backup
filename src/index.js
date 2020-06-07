const credentials = require('../credentials.json');
const config = require('../config.json');
const api = require('./api.js');
const utils = require('./utils.js');

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
  console.log(`Targeting ${config.server}...`);
}

const authenticate = async () => {
  const storedSession = utils.readStoredAPIData('session.json');

  if (utils.isValidSession(storedSession)) {
    console.log(`Got stored session data for ${credentials.username}!`);
    return storedSession;
  }

  console.log(`Trying to authenticate as ${credentials.username}...`);
  const sessionResponse = await api.retrieveSession();

  if (utils.isValidSession(sessionResponse)) {
    console.log('Success!');
    utils.writeAPIData('session.json', sessionResponse);
    return sessionResponse;
  }

  console.error('Error: Cannot authenticate, check your username and password.');
  console.error(sessionResponse);
  process.exit(1);
};

const getPostsIndex = async (session) => {
  const downloadedPosts = {
    posts: {},
    isLastPage: false,
  };

  const storedPosts = utils.readStoredAPIData('posts.json');
  if (storedPosts.posts) {
    if (storedPosts.isLastPage) {
      console.log('Got full stored posts index,', Object.keys(storedPosts.posts).length, 'posts!');
      return storedPosts;
    } else {
      console.log('Got partial stored posts index,', Object.keys(storedPosts.posts).length, 'posts!');
      downloadedPosts.posts = storedPosts.posts;
    }
  }

  console.log('Downloading posts index, expecting to see', Number(session.users.statistics.posts), 'posts...');

  while (!downloadedPosts.isLastPage) {
    const offset = Object.keys(downloadedPosts.posts).length;
    const postsResponse = await api.retrievePosts(session, offset);
    downloadedPosts.isLastPage = postsResponse.isLastPage;
    postsResponse.posts.forEach((post) => {
      downloadedPosts.posts[post.id] = post;
    });
    console.log('Got', Object.keys(downloadedPosts.posts).length, 'posts...');
    utils.writeAPIData('posts.json', downloadedPosts);
  }

  console.log('Downloaded all available posts!');
  return downloadedPosts;
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
    console.error(err);
    process.exit(1);
  });
