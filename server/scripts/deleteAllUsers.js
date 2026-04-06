require('dotenv').config(); // Load environment variables from .env in the project root
const mongoose = require('mongoose');
const User = require('../models/User');

const DB_URI = process.env.MONGODB_URI;

const deleteAllUsers = async () => {
  if (!DB_URI) {
    console.error('Error: MONGODB_URI environment variable not set.');
    process.exit(1); // Exit if DB URI is missing
  }

  let connection;
  try {
    console.log('Connecting to MongoDB...');
    connection = await mongoose.connect(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected.');

    console.log('Attempting to delete ALL users...');

    // Delete all documents in the User collection
    const result = await User.deleteMany({}); 

    console.log('Deletion operation completed.');
    console.log(`- Documents deleted: ${result.deletedCount}`);

    if (result.deletedCount > 0) {
      console.log('Successfully deleted all users.');
    } else {
      console.log('No users found to delete.');
    }

  } catch (error) {
    console.error('Error during user deletion script:', error);
    process.exitCode = 1; // Indicate error exit
  } finally {
    if (connection) {
      console.log('Disconnecting from MongoDB...');
      await mongoose.disconnect();
      console.log('Disconnected.');
    }
  }
};

// --- Confirmation Step ---
// Simple confirmation to prevent accidental running
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

console.warn('\n*** WARNING ***');
console.warn('This script will permanently delete ALL users from the database.');
console.warn('Database URI:', DB_URI ? DB_URI.substring(0, 20) + '...' : 'Not Set'); // Show partial URI

readline.question('Are you absolutely sure you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    console.log('Proceeding with deletion...');
    deleteAllUsers();
  } else {
    console.log('Deletion cancelled.');
  }
  readline.close();
}); 