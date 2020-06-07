const https = require('https');

const request = (method, url, params = {}) => {
  const requestUrl = new URL(url);
  const { body, ...requestParams } = params;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method,
        ...requestUrl,
        ...requestParams,
      },
      (res) => {
        const chunks = [];
        res.on('data', (data) => chunks.push(data));
        res.on('end', () => {
          let body = Buffer.concat(chunks);
          switch (res.headers['content-type']) {
            case 'application/json':
              body = JSON.parse(body);
              break;
          }
          resolve(body);
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
};

const get = (url) => request('GET', url);

const post = (url, payload) => request('POST', url, payload);

module.exports = {
  get,
  post,
};
