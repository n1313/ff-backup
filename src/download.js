const credentials = require('../credentials.json');
const config = require('../config.json');
const api = require('./api.js');
const utils = require('./utils.js');

const startTime = new Date();

const SESSION_FILE = 'session.json';
const TIMELINE_FILE = 'timeline.json';
const POSTS_FILE = 'posts.json';
const COMMENTS_FILE = 'comments.json';
const USERS_FILE = 'users.json';
const ATTACHMENTS_FILE = 'attachments.json';

if (!credentials.username || !credentials.password) {
  console.error('Error: Invalid credentials, please update ./credentials.json with your username and password.');
  process.exit(1);
} else {
  console.log(`Hello, ${credentials.username}!`);
}

if (!config.server) {
  console.error('Error: Invalid server, please update ./config.json with valid server URL.');
  process.exit(1);
} else {
  console.log(`Targeting ${config.server}...`);
  console.log(`Storing data in ${utils.getDataFolder()}...`);
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

  const storedUsers = utils.readStoredAPIData(USERS_FILE);
  const storedComments = utils.readStoredAPIData(COMMENTS_FILE);
  const storedAttachments = utils.readStoredAPIData(ATTACHMENTS_FILE);
  const storedPosts = utils.readStoredAPIData(POSTS_FILE);
  const storedTimeline = {
    ...utils.readStoredAPIData(TIMELINE_FILE),
    users: storedUsers,
    comments: storedComments,
    attachments: storedAttachments,
    posts: storedPosts,
  };

  if (storedTimeline.posts) {
    if (storedTimeline.isLastPage) {
      console.log('Got all stored posts,', Object.keys(storedTimeline.posts).length, 'posts!');
      return storedTimeline;
    } else {
      console.log('Got some stored posts,', Object.keys(storedTimeline.posts).length, 'posts!');
      timeline.posts = storedTimeline.posts;
    }
  }

  const expectedNumberOfPosts = Number(session.users.statistics.posts);
  console.log('Downloading posts, expecting to see about', expectedNumberOfPosts, 'posts...');

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

    utils.writeAPIData(USERS_FILE, timeline.users);
    utils.writeAPIData(COMMENTS_FILE, timeline.comments);
    utils.writeAPIData(ATTACHMENTS_FILE, timeline.attachments);
    utils.writeAPIData(POSTS_FILE, timeline.posts);
    utils.writeAPIData(TIMELINE_FILE, { isLastPage: timeline.isLastPage });
  }

  console.log('\nDownloaded all available posts!');
  return timeline;
};

const hydratePosts = async (session, timeline) => {
  const postsWithMissingInfo = Object.values(timeline.posts).filter((post) => {
    return post.omittedComments > 0 || post.omittedLikes > 0;
  });

  if (postsWithMissingInfo.length === 0) {
    console.log('No omitted likes and comments to download.');
    return timeline;
  }

  console.log('Downloading omitted likes and comments for', postsWithMissingInfo.length, 'posts...');

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

    utils.writeAPIData(USERS_FILE, timeline.users);
    utils.writeAPIData(COMMENTS_FILE, timeline.comments);
    utils.writeAPIData(ATTACHMENTS_FILE, timeline.attachments);
    utils.writeAPIData(POSTS_FILE, timeline.posts);
  }

  console.log('\nDownloaded all omitted likes and comments!');
  return timeline;
};

const downloadUserpicsAndAttachments = async (session, timeline) => {
  const userpics = [];
  Object.values(timeline.users).forEach((user) => {
    if (user.profilePictureLargeUrl) {
      userpics.push(user.profilePictureLargeUrl);
    }
  });
  console.log('Downloading', userpics.length, 'userpics...');

  await downloadFiles(session, userpics);

  const attachments = [];
  Object.values(timeline.attachments).forEach((attachment) => {
    if (attachment.url) {
      attachments.push(attachment.url);
    }
    if (attachment.thumbnailUrl && attachment.thumbnailUrl !== attachment.url) {
      attachments.push(attachment.thumbnailUrl);
    }
  });
  console.log('\nDownloading', attachments.length, 'attachments...');

  await downloadFiles(session, attachments);

  console.log('\nDownloaded all files!');
};

const downloadFiles = async (session, urls) => {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (!utils.assetFileExists(url)) {
      const file = await api.retrieveAsset(session, url);
      utils.writeAssetsData(url, file);
    }
    utils.progressMessage(`Got ${i + 1}/${urls.length}...`);
  }
};

const main = async () => {
  const session = await authenticate();
  const timeline = await getPostsTimeline(session);
  const full = await hydratePosts(session, timeline);
  const withAttachments = await downloadUserpicsAndAttachments(session, timeline);
};

main()
  .then(() => {
    const endTime = new Date();
    const duration = endTime - startTime;
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const took = (hours ? `${hours} hr ` : '') + `${minutes} min ${seconds} sec`;
    console.log(`Done, took ${took}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
