const credentials = require('../credentials.json');
const config = require('../config.json');
const request = require('./request.js');

const retrieveUser = async () => {
  const url = `${config.server}/v2/users/whoami`;
  const headers = { Authorization: `Bearer ${credentials.appToken}` };
  const data = await request.get(url, { headers });
  return data;
};

const retrievePosts = async (offset) => {
  const url = `${config.server}/v2/search?qs=from%3A${credentials.username}&offset=${offset}`;
  const headers = { Authorization: `Bearer ${credentials.appToken}` };
  const data = await request.get(url, { headers });
  return data;
};

const retrieveFullPost = async (post) => {
  const url = `${config.server}/v2/posts/${post.id}?maxComments=all&maxLikes=all`;
  const headers = { Authorization: `Bearer ${credentials.appToken}` };
  const data = await request.get(url, { headers });
  return data;
};

const retrieveAsset = async (url) => {
  const headers = {};
  const data = await request.binary(url, { headers });
  return data;
};

module.exports = {
  retrieveUser,
  retrievePosts,
  retrieveFullPost,
  retrieveAsset,
};
