const attachIoMiddleware = (io) => (req, res, next) => {
    req.io = io;
    next();
};

module.exports = attachIoMiddleware; 