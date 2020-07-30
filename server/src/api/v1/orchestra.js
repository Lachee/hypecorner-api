const express = require('express');

module.exports = function(options) {
    this.options = options;
    this.router = express.Router();

    this.channel = "monstercat";
    this.scores = [];

    const app = this.options.app;
    const gateway = this.options.gateway;
    const auth = this.options.authorize;

    //Changes the channel
    this.router.post('/change', auth, (req, res, next) => {
        var channel = (req.body.name || '').toLowerCase();
        if (channel == '')  {
            res.status(400);
            throw new Error('Channel Name cannot be null');
        }

        this.channel = channel;
        this.scores = [ -1, -1 ];
        gateway.broadcast(gateway.Events.EVENT_ORCHESTRA_CHANGE, { name: channel });
        res.send({ name: channel });
    });

    //Gets the current channel
    this.router.get('/channel', (req, res, next) => {
        res.send({ name: this.channel });
    });

    //Skips the channel
    this.router.post('/skip', auth, (req, res, next) => {
        gateway.broadcast(gateway.Events.EVENT_ORCHESTRA_SKIP, {});
        res.send({ skipped: true });
    });

    //Gives the OBS controller time to switch before the embed.
    this.router.post('/preroll', auth, (req, res, next) => {
        gateway.broadcast(gateway.Events.EVENT_ORCHESTRA_PREROLL, { name: req.body.name || '' });
        res.send({ name: channel });
    });

    //Sets what we think the current score is
    this.router.post('/score', auth, (req, res, next) => {
        let arr = req.body;
        if (!Array.isArray(arr) || arr.length != 2) throw new Error('body is a invalid array');
        
        this.scores = arr;
        gateway.broadcast(gateway.Events.EVENT_ORCHESTRA_SCORE, this.scores);
        res.send({ scores: this.scores });
    });

    //Gets the current score
    this.router.get('/score', (req, res, next) => {
        res.send({scores: this.scores });
    });

    return this;
} 