const errorHandler = (err, req, res, next) => {
    // Determine status code: Use error's status code if set, otherwise default to 500 (Internal Server Error)
    const statusCode = err.statusCode || res.statusCode || 500;

    // Log the error for debugging (consider using a more robust logger like Winston in production)
    console.error("--- Error Handler ---");
    console.error(`Status Code: ${statusCode}`);
    console.error(`Error Message: ${err.message}`);
    // Optionally log the stack trace in development environment
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }
    console.error("---------------------");

    // Send a generic error response to the client
    // Avoid sending sensitive stack trace details in production
    res.status(statusCode).json({
        message: err.message || 'An unexpected server error occurred',
        // Only include stack trace in development, not production
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

// Middleware for handling routes that are not found (404)
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error); // Pass the error to the main error handler
};

module.exports = { errorHandler, notFoundHandler }; 