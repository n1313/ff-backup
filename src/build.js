const utils = require('./utils.js');
const credentials = require('../credentials.json');
const config = require('../config.json');

const startTime = new Date();

const { TIMELINE_FILE, POSTS_FILE, COMMENTS_FILE, USERS_FILE, ATTACHMENTS_FILE, FEEDS_FILE } = utils;

const MONTHS = [
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
];

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

const getPostOriginalUrl = (post) => {
  if (!post || !post.postedTo) {
    return '';
  }
  const postTarget = getUserByFeedId(post.postedTo[0]);
  return [config.server, postTarget.username, post.id].join('/');
};

const getUserOriginalUrl = (username) => {
  return [config.server, username].join('/');
};

const renderUserText = (text) => {
  const linkRegex =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
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
          createdReadable: utils.readableDate(new Date(+comment.createdAt)),
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

const renderPostBacklinks = (count) => {
  if (!count) {
    return '';
  }

  return utils.template('post-backlinks', {
    count,
  });
};

const renderPost = (post) => {
  return utils.template('post', {
    id: post.id,
    userpic: utils.getAssetPath(me.profilePictureLargeUrl),
    username: me.username,
    body: renderUserText(post.body),
    postComments: renderPostComments(post.comments),
    postBacklinks: renderPostBacklinks(post.backlinksCount),
    postLikes: renderPostLikes(post.likes),
    commentsCount: post.comments.length,
    likesCount: post.likes.length,
    createdAt: new Date(+post.createdAt).toISOString(),
    createdReadable: utils.readableDate(new Date(+post.createdAt)),
    postTargets: renderPostTargets(post),
    postAttachments: renderPostAttachments(post),
    originalUrl: getPostOriginalUrl(post),
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
            name: MONTHS[month],
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
    const createdAt = new Date(+post.createdAt || 0);
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

  const directsHTML = utils.template('directs', {
    styles: utils.template('styles'),
    username: me.username,
    header: renderPageHeader(),
    directs: directs.map((direct) => renderDirect(direct)).join(''),
  });

  utils.writeHTMLData('directs.html', directsHTML);
};

const renderMainPage = (posts, directs) => {
  console.log('Generating main page....');

  const indexHTML = utils.template('index', {
    styles: utils.template('styles'),
    username: me.username,
    header: renderPageHeader(),
    server: config.server,
    postsCount: posts.length,
    directsCount: directs.length,
    now: utils.readableDate(new Date()),
    calendar: renderCalendar(posts),
  });

  utils.writeHTMLData('index.html', indexHTML);
};

const renderStatsPage = (posts, directs) => {
  console.log('Generating stats page...');

  let likesCount = 0;
  let commentsCount = 0;
  let clikesCount = 0;
  let backlinksCount = 0;

  let mostLiked = {
    count: -1,
    post: {},
  };

  let mostCommented = {
    count: -1,
    post: {},
  };

  let mostCliked = {
    count: -1,
    post: {},
  };

  let mostBacklinked = {
    count: -1,
    post: {},
  };

  const commenters = {};
  const likers = {};
  const postsByMonth = {};
  let maxPostsByMonth = 0;

  posts.concat(directs).forEach((entry) => {
    const postLikes = entry.likes.length;
    likesCount += postLikes;

    if (postLikes > mostLiked.count) {
      mostLiked = {
        count: postLikes,
        post: entry,
      };
    }

    backlinksCount += entry.backlinksCount;
    if (entry.backlinksCount > mostBacklinked.count) {
      mostBacklinked = {
        count: entry.backlinksCount,
        post: entry,
      };
    }

    const postComments = entry.comments.length;
    commentsCount += postComments;

    if (postComments > mostCommented.count) {
      mostCommented = {
        count: postComments,
        post: entry,
      };
    }

    const postClikes = entry.commentLikes + entry.ownCommentLikes;
    clikesCount += postClikes;

    if (postClikes > mostCliked.count) {
      mostCliked = {
        count: postClikes,
        post: entry,
      };
    }

    entry.comments.forEach((commentId) => {
      const comment = data.comments[commentId];
      if (!comment) {
        return;
      }
      const userId = comment.createdBy;
      if (!userId) {
        return;
      }
      const user = data.users[userId];
      commenters[user.username] = commenters[user.username] || 0;
      commenters[user.username] += 1;
    });

    entry.likes.forEach((userId) => {
      if (!userId) {
        return;
      }
      const user = data.users[userId];
      likers[user.username] = likers[user.username] || 0;
      likers[user.username] += 1;
    });

    const date = new Date(+entry.createdAt);
    const month = date.getMonth();
    const year = date.getFullYear();
    const key = `${year}-${month}`;
    const label = `${MONTHS[date.getMonth()]} ${year}`;
    postsByMonth[key] = postsByMonth[key] || { label, value: 0 };
    postsByMonth[key].value += 1;
    if (postsByMonth[key].value > maxPostsByMonth) {
      maxPostsByMonth = postsByMonth[key].value;
    }
  });

  const bestCommenters = Object.entries(commenters)
    .sort((a, z) => {
      return z[1] - a[1];
    })
    .slice(0, 10);

  const bestLikers = Object.entries(likers)
    .sort((a, z) => {
      return z[1] - a[1];
    })
    .slice(0, 10);

  const postsCount = posts.length;
  const directsCount = directs.length;
  const totalCount = postsCount + directsCount;

  const totals = {
    firstPostDate: utils.readableDate(new Date(+posts[0].createdAt)),
    postsCount,
    directsCount,
    commentsCount,
    backlinksCount,
    commentsAvg: totalCount > 0 ? (commentsCount / totalCount).toFixed(1) : 0,
    likesCount,
    likesAvg: totalCount > 0 ? (likesCount / totalCount).toFixed(1) : 0,
    clikesCount,
    clikesAvg: totalCount > 0 ? (clikesCount / totalCount).toFixed(1) : 0,
  };

  const bests = {
    mostLikes: mostLiked.count,
    mostLikedUrl: getPostOriginalUrl(mostLiked.post),
    mostLikedBody: utils.postSlug(mostLiked.post),
    mostComments: mostCommented.count,
    mostCommentedId: mostCommented.post.id,
    mostCommentedUrl: getPostOriginalUrl(mostCommented.post),
    mostCommentedBody: utils.postSlug(mostCommented.post),
    mostClikes: mostCliked.count,
    mostClikedUrl: getPostOriginalUrl(mostCliked.post),
    mostClikedBody: utils.postSlug(mostCliked.post),
    mostBacklinks: mostBacklinked.count,
    mostBacklinkedUrl: getPostOriginalUrl(mostBacklinked.post),
    mostBacklinkedBody: utils.postSlug(mostBacklinked.post),
  };

  const people = {
    commenters: bestCommenters
      .map(([username, count]) =>
        utils.template('stats-commenter', { username, count, url: getUserOriginalUrl(username) })
      )
      .join(', '),
    likers: bestLikers
      .map(([username, count]) => utils.template('stats-liker', { username, count, url: getUserOriginalUrl(username) }))
      .join(', '),
  };

  const statsHTML = utils.template('stats', {
    styles: utils.template('styles'),
    username: me.username,
    header: renderPageHeader(),
    totals: utils.template('stats-totals', totals),
    bests: utils.template('stats-bests', bests),
    people: utils.template('stats-people', people),
    postsByMonth: utils.template('stats-posts-by-month', {
      chart: utils.template('stats-chart', {
        data: Object.values(postsByMonth)
          .map(({ value, label }) => {
            const percent = ((value * 100) / maxPostsByMonth) * (2 / 3);
            return utils.template('stats-chart-item', { percent, value, label, max: value === maxPostsByMonth });
          })
          .join(''),
      }),
    }),
  });

  utils.writeHTMLData('stats.html', statsHTML);
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
  renderPostPages(posts);
  renderDirectPage(directs);
  renderStatsPage(posts, directs);
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
