const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Ensure 'uploads' directory exists in the server root
    },
    filename: function (req, file, cb) {
        // Create a unique filename: fieldname-timestamp.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (optional: restrict file types)
const fileFilter = (req, file, cb) => {
    // Accept images and videos only
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image or video file!'), false);
    }
};

// Configure multer upload instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 20 // 20MB limit (adjust as needed)
    },
    fileFilter: fileFilter
});

module.exports = upload; 