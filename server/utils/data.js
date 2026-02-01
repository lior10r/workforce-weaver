const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Read data from JSON file
const readData = (fileName) => {
  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    return null;
  }
};

// Write data to JSON file
const writeData = (fileName, data) => {
  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${fileName}:`, error);
    return false;
  }
};

// Initialize data file if it doesn't exist
const initializeData = (fileName, defaultData) => {
  const existing = readData(fileName);
  if (existing === null) {
    writeData(fileName, defaultData);
    return defaultData;
  }
  return existing;
};

module.exports = {
  readData,
  writeData,
  initializeData,
  DATA_DIR
};
