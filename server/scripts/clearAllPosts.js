/**
 * Removes all posts, comments, and like/comment notifications (fresh feed).
 * Does not delete users, DMs, or friend-related notifications.
 *
 * Usage: node scripts/clearAllPosts.js
 * Skip prompt: node scripts/clearAllPosts.js --yes
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const run = async () => {
  if (!MONGO_URI) {
    console.error('Set MONGO_URI (or MONGODB_URI) in server/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const commentResult = await Comment.deleteMany({});
    const postResult = await Post.deleteMany({});
    const notifResult = await Notification.deleteMany({
      type: { $in: ['like', 'comment'] },
    });

    console.log(`Comments removed: ${commentResult.deletedCount}`);
    console.log(`Posts removed: ${postResult.deletedCount}`);
    console.log(`Notifications removed (like/comment): ${notifResult.deletedCount}`);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
};

if (process.argv.includes('--yes')) {
  run();
} else {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  console.warn('\n*** This deletes ALL posts, ALL comments, and like/comment notifications. ***\n');
  readline.question('Type yes to continue: ', (answer) => {
    readline.close();
    if (answer.toLowerCase() === 'yes') {
      run();
    } else {
      console.log('Cancelled.');
      process.exit(0);
    }
  });
}
