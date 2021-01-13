const https = require('https');

const request = (method, url, options = {}, isJSON = true) => {
  const { body, ...requestParams } = options;
  const requestConfig = {
    method,
    ...requestParams,
  };

  // console.debug('Sending', method, url);

  return new Promise((resolve, reject) => {
    const req = https.request(url, requestConfig, (res) => {
      const chunks = [];
      res.on('data', (data) => chunks.push(data));
      res.on('end', () => {
        const body = isJSON ? JSON.parse(Buffer.concat(chunks)) : Buffer.concat(chunks);
        resolve(body);
      });
    });
    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
};

const binary = (url, options) => request('GET', url, options, false);

const get = (url, options) => request('GET', url, options);

const post = (url, options) => request('POST', url, options);

module.exports = {
  get,
  post,
  binary,
};
