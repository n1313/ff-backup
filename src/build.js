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
  if (!feed) {
    console.error('Could not find feed', feedId);
    return {};
  }
  const user = data.users[feed.user];
  return user;
};

const renderUserText = (text) => {
  const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  const spoilerRegex = /&lt;spoiler&gt;((?:(?!(&lt;spoiler&gt;|&lt;\/spoiler&gt;)).)*)&lt;\/spoiler&gt;/gi;

  return text
    .split(/\n{2,}/g)
    .filter(Boolean)
    .map((string) => {
      return utils.template('paragraph', {
        text: utils
          .safeText(string)
          .replace(/\n/g, utils.template('linebreak'))
          .replace(spoilerRegex, (_, text) => utils.template('spoiler', { text }))
          .replace(linkRegex, (url) => utils.template('link', { url })),
      });
    })
    .join('');
};

const renderPostTargets = (post) => {
  const postToSelfOnly = post.postedTo.length === 1 && getUserByFeedId(post.postedTo[0]).id === me.id;
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

        if (!attachment) {
          console.error('Could not find attachment', id, 'for post', post.id);
          return 'Attachment not downloaded';
        }

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
        if (!comment) {
          console.error('Could not find comment', commentId);
          return 'Comment not downloaded';
        }
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
        const user = data.users[userId];
        if (!user) {
          console.error('Could not find user', userId);
          return 'User not downloaded';
        }
        return utils.template('post-like', {
          username: user.username,
        });
      })
      .join(''),
  });
};

const renderPost = (post) => {
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
  return utils.template('direct', { post: renderPost(direct) });
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
            year: year,
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

const renderPageHeader = () => {
  return utils.template('header', {
    username: me.username,
    screenname: utils.safeText(me.screenName),
    userpic: utils.getAssetPath(me.profilePictureLargeUrl),
    description: renderUserText(me.description),
  });
};

const renderPostPages = (posts) => {
  const years = {};
  posts.forEach((post) => {
    const createdAt = new Date(+post.createdAt);
    const year = createdAt.getFullYear();
    years[year] = years[year] || [];
    years[year].push(post);
  });

  Object.keys(years).forEach((year) => {
    console.log('Generating', year, 'page...');
    const yearHTML = utils.template('year', {
      styles: utils.template('styles'),
      username: me.username,
      header: renderPageHeader(),
      year,
      posts: years[year].map((post) => renderPost(post)).join(''),
    });
    utils.writeHTMLData(`${year}.html`, yearHTML);
  });
};

const renderDirectPage = (directs) => {
  console.log('Generating directs page....');

  const indexHTML = utils.template('directs', {
    styles: utils.template('styles'),
    username: me.username,
    header: renderPageHeader(),
    directs: directs.map((direct) => renderDirect(direct)).join(''),
  });

  utils.writeHTMLData('directs.html', indexHTML);
};

const renderMainPage = (posts, directs) => {
  console.log('Generating main page....');

  const indexHTML = utils.template('index', {
    styles: utils.template('styles'),
    username: me.username,
    header: renderPageHeader(),
    server: config.server,
    postsCount: posts.length,
    now: utils.readableDate(new Date()),
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

  renderMainPage(posts);
  renderPostPages(posts);
  renderDirectPage(directs);
};

const main = async () => {
  readData();
  buildApp();
};

main()
  .then(() => {
    const endTime = new Date();
    const duration = endTime - startTime;
    console.log(`Done, took ${duration} ms`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
