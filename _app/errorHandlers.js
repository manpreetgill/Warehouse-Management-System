module.exports = function (app) {
    // Development error handler, will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err
            });
        });
    }
// Production error handler, no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
// Catch 404 and forward to error handler
    app.use(function (err, req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });
};


