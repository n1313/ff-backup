const credentials = require('../credentials.json');
const config = require('../config.json');
const api = require('./api.js');
const utils = require('./utils.js');

const startTime = new Date();

const SESSION_FILE = 'user.json';
const TIMELINE_FILE = 'timeline.json';

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
  const storedSession = utils.readStoredAPIData(SESSION_FILE);

  if (utils.isValidSession(storedSession)) {
    console.log(`Got stored session data for ${credentials.username}!`);
    return storedSession;
  }

  console.log(`Trying to authenticate as ${credentials.username}...`);
  const sessionResponse = await api.retrieveUser();

  if (utils.isValidSession(sessionResponse)) {
    console.log('Success!');
    utils.writeAPIData(SESSION_FILE, sessionResponse);
    return sessionResponse;
  }

  console.error('Error: Cannot authenticate, check your username and password.');
  console.error(sessionResponse);
  process.exit(1);
};

const getPostsTimeline = async (session) => {
  const timeline = {
    users: {},
    comments: {},
    attachments: {},
    posts: {},
    isLastPage: false,
  };

  const storedTimeline = utils.readStoredAPIData(TIMELINE_FILE);
  if (storedTimeline.posts) {
    if (storedTimeline.isLastPage) {
      console.log('Got full stored posts index,', Object.keys(storedTimeline.posts).length, 'posts!');
      return storedTimeline;
    } else {
      console.log('Got partial stored posts index,', Object.keys(storedTimeline.posts).length, 'posts!');
      downloadedPosts.posts = storedTimeline.posts;
    }
  }

  const expectedNumberOfPosts = Number(session.users.statistics.posts);
  console.log('Downloading posts index, expecting to see', expectedNumberOfPosts, 'posts...');

  while (!timeline.isLastPage) {
    const offset = Object.keys(timeline.posts).length;
    const timelineResponse = await api.retrievePosts(session, offset);
    timeline.isLastPage = timelineResponse.isLastPage;
    timelineResponse.posts.forEach((post) => {
      timeline.posts[post.id] = post;
    });
    timelineResponse.users.forEach((user) => {
      timeline.users[user.id] = user;
    });
    timelineResponse.comments.forEach((comment) => {
      timeline.comments[comment.id] = comment;
    });
    timelineResponse.attachments.forEach((attachment) => {
      timeline.attachments[attachment.id] = attachment;
    });
    const numberOfDownloadedPosts = Object.keys(timeline.posts).length;
    utils.progressMessage(`Got ${numberOfDownloadedPosts}/${expectedNumberOfPosts}...`);
    utils.writeAPIData(TIMELINE_FILE, timeline);
  }

  console.log('Downloaded all available posts!');
  return timeline;
};

const hydratePosts = async (session, timeline) => {
  const postsWithMissingInfo = Object.values(timeline.posts).filter((post) => {
    return post.omittedComments > 0 || post.omittedLikes > 0;
  });

  console.log('Downloading likes and comments for', postsWithMissingInfo.length, 'posts...');

  let i = 0;

  for (post of postsWithMissingInfo) {
    const fullPost = await api.retrieveFullPost(session, post);
    timeline.posts[post.id] = fullPost;
    fullPost.users.forEach((user) => {
      timeline.users[user.id] = user;
    });
    fullPost.comments.forEach((comment) => {
      timeline.comments[comment.id] = comment;
    });
    fullPost.attachments.forEach((attachment) => {
      timeline.attachments[attachment.id] = attachment;
    });
    utils.progressMessage(`Got ${++i}/${postsWithMissingInfo.length}...`);
    utils.writeAPIData(TIMELINE_FILE, timeline);
  }

  console.log('All posts ready!');
  return timeline;
};

const main = async () => {
  const data = {};

  data.session = await authenticate();
  data.timeline = await getPostsTimeline(data.session);
  data.timeline = await hydratePosts(data.session, data.timeline);
};

main()
  .then(() => {
    const endTime = new Date();
    console.log(`Done, took ${endTime - startTime} ms`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
