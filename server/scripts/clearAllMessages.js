/**
 * Deletes every document in the DirectMessage collection (and legacy Message if present).
 * Usage: node scripts/clearAllMessages.js
 * Skip prompt: node scripts/clearAllMessages.js --yes
 */
require('dotenv').config();
const mongoose = require('mongoose');
const DirectMessage = require('../models/DM');
const Message = require('../models/Message');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const clearAll = async () => {
  if (!MONGO_URI) {
    console.error('Set MONGO_URI (or MONGODB_URI) in server/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const [dmResult, msgResult] = await Promise.all([
      DirectMessage.deleteMany({}),
      Message.deleteMany({}),
    ]);

    console.log(`DirectMessage documents removed: ${dmResult.deletedCount}`);
    console.log(`Message documents removed (legacy): ${msgResult.deletedCount}`);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
};

const skipConfirm = process.argv.includes('--yes');

if (skipConfirm) {
  clearAll();
} else {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  console.warn('\n*** This will delete ALL direct messages in the database. ***\n');
  readline.question('Type yes to continue: ', (answer) => {
    readline.close();
    if (answer.toLowerCase() === 'yes') {
      clearAll();
    } else {
      console.log('Cancelled.');
      process.exit(0);
    }
  });
}
