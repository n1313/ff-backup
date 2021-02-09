const utils = require('./utils.js');
const credentials = require('../credentials.json');
const config = require('../config.json');

const startTime = new Date();

const { TIMELINE_FILE, POSTS_FILE, COMMENTS_FILE, USERS_FILE, ATTACHMENTS_FILE, FEEDS_FILE } = utils;

let data;
let me;

const readData = () => {
  console.log(`Reading stored backup data for ${credentials.username}...`);
  const storedUsers = utils.readStoredAPIData(USERS_FILE);
  const storedComments = utils.readStoredAPIData(COMMENTS_FILE);
  const storedAttachments = utils.readStoredAPIData(ATTACHMENTS_FILE);
  const storedPosts = utils.readStoredAPIData(POSTS_FILE);
  const storedFeeds = utils.readStoredAPIData(FEEDS_FILE);
  const storedTimeline = utils.readStoredAPIData(TIMELINE_FILE);

  data = {
    users: storedUsers,
    comments: storedComments,
    attachments: storedAttachments,
    posts: storedPosts,
    feeds: storedFeeds,
    timeline: storedTimeline,
  };

  me = Object.values(data.users).find((user) => user.username === credentials.username);
};

const getUserByFeedId = (feedId) => {
  const feed = data.feeds[feedId];
  const user = data.users[feed.user];
  return user;
};

const renderUserText = (text) => {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((string) => {
      return utils.template('paragraph', {
        text: utils.safeText(string).replace(/\n/g, utils.template('linebreak')),
      });
    })
    .join('');
};

const renderPostTargets = (post) => {
  const postToSelfOnly = post.postedTo.length === 1 && getUserByFeedId(post.postedTo).id === me.id;
  if (postToSelfOnly) {
    return '';
  }

  return utils.template('post-targets', {
    targets: post.postedTo.map((targetId) => utils.template('post-target', getUserByFeedId(targetId))).join(''),
  });
};

const renderPostAttachments = (post) => {
  if (!post.attachments || !post.attachments.length) {
    return '';
  }

  return utils.template('post-attachments', {
    attachments: post.attachments
      .map((id) => {
        const attachment = data.attachments[id];

        if (attachment.mediaType === 'image') {
          return utils.template('post-attachment-image', {
            id,
            thumbnail: utils.getAssetPath(
              attachment.imageSizes.t ? attachment.imageSizes.t.url : attachment.thumbnailUrl
            ),
            url: utils.getAssetPath(attachment.url),
            fileName: attachment.fileName,
          });
        }

        return utils.template('post-attachment-general', {
          id,
          url: utils.getAssetPath(attachment.url),
          fileName: attachment.fileName,
        });
      })
      .join(''),
  });
};

const renderCommentLikes = (comment) => {
  if (!comment.likes) {
    return '';
  }

  return utils.template('comment-likes', {
    count: comment.likes,
  });
};

const renderPostComments = (comments) => {
  if (!comments || !comments.length) {
    return '';
  }

  return utils.template('post-comments', {
    comments: comments
      .map((commentId) => {
        const comment = data.comments[commentId];
        return utils.template('post-comment', {
          id: comment.id,
          text: renderUserText(comment.body),
          author: comment.createdBy ? data.users[comment.createdBy].username : '?',
          likes: renderCommentLikes(comment),
        });
      })
      .join(''),
  });
};

const renderPostLikes = (likes) => {
  if (!likes || !likes.length) {
    return '';
  }

  return utils.template('post-likes', {
    likers: likes
      .map((userId) => {
        return utils.template('post-like', {
          username: data.users[userId].username,
        });
      })
      .join(''),
  });
};

const renderShortPost = (post) => {
  const postTarget = getUserByFeedId(post.postedTo[0]);

  return utils.template('post', {
    id: post.id,
    userpic: utils.getAssetPath(me.profilePictureLargeUrl),
    username: me.username,
    body: renderUserText(post.body),
    postComments: renderPostComments(post.comments),
    postLikes: renderPostLikes(post.likes),
    commentsCount: post.comments.length,
    likesCount: post.likes.length,
    createdAt: new Date(+post.createdAt).toISOString(),
    createdReadable: utils.readableDate(new Date(+post.createdAt)),
    postTargets: renderPostTargets(post),
    postAttachments: renderPostAttachments(post),
    originalUrl: [config.server, postTarget.username, post.id].join('/'),
    url: `posts/${post.id}.html`,
  });
};

const renderDirect = (direct) => {
  return utils.template('direct', { post: renderShortPost(direct) });
};

const renderCalendar = (posts) => {
  const calendar = {};

  posts.forEach((post) => {
    const createdAt = new Date(+post.createdAt);
    const year = createdAt.getFullYear();
    const month = createdAt.getMonth();
    if (!calendar[year]) {
      calendar[year] = {};
    }
    if (!calendar[year][month]) {
      calendar[year][month] = [];
    }
    calendar[year][month].push(post.id);
  });

  return Object.keys(calendar)
    .map((year) => {
      const monthsHTML = Object.keys(calendar[year])
        .map((month) => {
          const posts = calendar[year][month];
          if (!posts.length) {
            return '';
          }

          return utils.template('calendar-month', {
            id: `${year}-${month}`,
            name: [
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December',
            ][month],
            posts: posts.length,
            firstPostId: posts[0],
          });
        })
        .join('');

      return utils.template('calendar-year', {
        year,
        months: monthsHTML,
      });
    })
    .join('');
};

const renderMainPage = (posts, directs) => {
  console.log('Generating main page....');

  const postsIndexHTML = posts.map((post) => renderShortPost(post)).join('');
  const directsIndexHTML = directs.map((direct) => renderDirect(direct)).join('');

  const indexHTML = utils.template('index', {
    username: me.username,
    screenname: utils.safeText(me.screenName),
    userpic: utils.getAssetPath(me.profilePictureLargeUrl),
    description: renderUserText(me.description),
    server: config.server,
    postsCount: posts.length,
    now: utils.readableDate(new Date()),
    postsIndex: postsIndexHTML,
    directsIndex: directsIndexHTML,
    calendar: renderCalendar(posts),
  });

  utils.writeHTMLData('index.html', indexHTML);
};

const buildApp = () => {
  const posts = [];
  const directs = [];

  Object.values(data.posts)
    .sort((a, z) => +a.createdAt - +z.createdAt)
    .forEach((post) => {
      if (utils.isDirect(post, data.feeds)) {
        directs.push(post);
      } else {
        posts.push(post);
      }
    });

  renderMainPage(posts, directs);
};

const main = async () => {
  readData();
  buildApp();
};

main()
  .then(() => {
    const endTime = new Date();
    const duration = endTime - startTime;
    const seconds = Math.floor((duration / 1000) % 60);
    console.log(`Done, took ${seconds} sec`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
