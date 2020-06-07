const querystring = require('querystring');

const credentials = require('../credentials.json');
const config = require('../config.json');
const request = require('./request.js');

const postSession = async () => {
  const url = `${config.server}/v1/session`;
  const body = querystring.stringify({
    username: credentials.username,
    password: credentials.password,
  });
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const data = await request.post(url, { body, headers });
  console.log('data', data);
  return data;
};

module.exports = {
  postSession,
};
