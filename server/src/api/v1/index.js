const express = require('express');

module.exports = function(options) {
    const router = express.Router();
    router.get('/', (req, res) => { res.send({ message: '👋 API V1'}); })

    //Add some API boys
    router.use('/blacklist', require('./blacklist')(options).router);
    router.use('/orchestra', require('./orchestra')(options).router);
    router.use('/statistics', require('./stats')(options).router);
    router.use('/channel', require('./channel')(options).router);

    return router;
}