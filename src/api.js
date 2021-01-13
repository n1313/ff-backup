const querystring = require('querystring');

const credentials = require('../credentials.json');
const config = require('../config.json');
const request = require('./request.js');

const retrieveUser = async () => {
  const url = `${config.server}/v1/session`;
  const body = querystring.stringify({
    username: credentials.username,
    password: credentials.password,
  });
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const data = await request.post(url, { body, headers });
  return data;
};

const retrievePosts = async (session, offset) => {
  // const url = `${config.server}/v2/timelines/${credentials.username}?sort=created&offset=${offset}`;
  const url = `${config.server}/v2/search?qs=from%3A${credentials.username}&offset=${offset}`;
  const headers = { Authorization: `Bearer ${session.authToken}` };
  const data = await request.get(url, { headers });
  return data;
};

const retrieveFullPost = async (session, post) => {
  const url = `${config.server}/v2/posts/${post.id}?maxComments=all&maxLikes=`;
  const headers = { Authorization: `Bearer ${session.authToken}` };
  const data = await request.get(url, { headers });
  return data;
};

const retrieveAsset = async (session, url) => {
  const headers = { Authorization: `Bearer ${session.authToken}` };
  const data = await request.binary(url, { headers });
  return data;
};

module.exports = {
  retrieveUser,
  retrievePosts,
  retrieveFullPost,
  retrieveAsset,
};
