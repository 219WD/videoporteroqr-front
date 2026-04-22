const fs = require('fs');
const path = require('path');
const { expo } = require('./app.json');

function writeGoogleServicesFile() {
  const inlineJson = process.env.GOOGLE_SERVICES_JSON_CONTENT;

  if (!inlineJson) {
    throw new Error('GOOGLE_SERVICES_JSON_CONTENT is required to generate android/google-services.json');
  }

  const trimmed = inlineJson.trim();

  if (!trimmed.startsWith('{')) {
    throw new Error('GOOGLE_SERVICES_JSON_CONTENT must contain the JSON contents of google-services.json');
  }

  const outputPath = path.resolve('./google-services.json');
  fs.writeFileSync(outputPath, trimmed, 'utf8');
  return outputPath;
}

module.exports = () => {
  const googleServicesPath = writeGoogleServicesFile();

  return {
    ...expo,
    android: {
      ...expo.android,
      googleServicesFile: googleServicesPath,
    },
  };
};
