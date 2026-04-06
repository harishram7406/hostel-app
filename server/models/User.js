const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true, // Removes whitespace from both ends of a string
        minlength: [3, 'Username must be at least 3 characters long']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    profilePicture: {
        type: String, // Store filename or full URL if using external storage
        default: '' // Or path to a default avatar
    },
    bio: {
        type: String,
        trim: true,
        maxlength: [160, 'Bio cannot exceed 160 characters']
    },
    friends: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    // We might use a separate FriendRequest model instead of embedding here
    friendRequests: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    // Define virtuals
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual property to get full profile picture URL
userSchema.virtual('profilePictureUrl').get(function() {
    // If profilePicture is empty or null, return null or a default path
    if (!this.profilePicture) {
        // Return null or path to default avatar
        return null; // Or return '/path/to/default/avatar.png';
    }
    // If profilePicture already looks like a URL (e.g., from social login)
    if (this.profilePicture.startsWith('http')) {
        return this.profilePicture;
    }
    // Otherwise, construct URL assuming it's stored locally
    // Adjust the base URL/path as per your file serving setup
    return `/uploads/profile/${this.profilePicture}`;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method removed as login controller uses bcrypt.compare directly
// userSchema.methods.matchPassword = async function(candidatePassword) {
//     return await bcrypt.compare(candidatePassword, this.password);
// };

const User = mongoose.model('User', userSchema);

module.exports = User; 