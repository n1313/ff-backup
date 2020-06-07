const fs = require('fs');

const writeJSON = (filePath, obj) => {
  const string = JSON.stringify(obj, null, 2);
  return writeFile(filePath, string);
};

const writeFile = (filePath, string) => {
  return fs.writeFileSync(filePath, string, 'UTF-8');
};

module.exports = {
  writeJSON,
  writeFile,
};
