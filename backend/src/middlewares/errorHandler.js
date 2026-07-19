// Centralized fallback error handler. Route handlers normally catch their own
// errors and respond directly; this only fires for anything that slips through
// (e.g. multer file-filter rejections, unexpected throws) so the server never
// crashes without a response.
export const errorHandler = (err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        status: err.status || 500,
        success: false,
        message: err.message || 'Internal server error',
    });
};

export const notFoundHandler = (req, res) => {
    res.status(404).json({ status: 404, success: false, message: 'Route not found' });
};
