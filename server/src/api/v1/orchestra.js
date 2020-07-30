const Joi       = require('joi');
const express   = require('express');

const EVENT_ORCHESTRA_SKIP     = 'ORCHESTRA_SKIP';     //Sent to tell the OCR that we wish to skip this nonsense and please find us a new channel.
const EVENT_ORCHESTRA_PREROLL  = 'ORCHESTRA_PREROLL';  //Sent to tell the embed client and OBS clients to run a preroll for a specified duration as we are about to change.
const EVENT_ORCHESTRA_CHANGE   = 'ORCHESTRA_CHANGE';   //Sent to tell the embed clients to switch channel
const EVENT_ORCHESTRA_SCORE    = 'ORCHESTRA_SCORE';    //Sent every now and again to tell the users what we think the score is. More a reminder to stay connected.


module.exports = function(options) {
    this.options = options;
    this.router = express.Router();

    this.channel = "monstercat";
    this.scores = [];

    const { db, gateway, auth } = this.options;

    //Rules on how to validate blacklist entries
    const rules = {
        name: Joi.string()
                    .min(1).max(25)
                    .lowercase()
                    .pattern(/^[a-zA-Z0-9_]{1,25}$/, 'Twitch channel name')
                    .trim()
                    .required(),

        score: Joi.array()
                    .items(Joi.number(), Joi.number())
                    .length(2)
                    .required(),
    };


    //Changes the channel
    this.router.post('/change', auth, (req, res, next) => {
        
        //Validate the name
        const validation = rules.name.validate(req.body.name || null);
        if (validation.error != null) throw validation.error;

        //Update the channel name and scores
        this.channel = validation.value;
        this.scores = [ -1, -1 ];

        //Broadcast the change
        gateway.broadcast(EVENT_ORCHESTRA_CHANGE, { name: this.channel });
        res.send({ name: this.channel });
    });

    //Gets the current channel
    this.router.get('/channel', (req, res, next) => {
        res.send({ name: this.channel });
    });

    //Skips the channel
    this.router.post('/skip', auth, (req, res, next) => {
        gateway.broadcast(EVENT_ORCHESTRA_SKIP, {});
        res.send({ skipped: true });
    });

    //Gives the OBS controller time to switch before the embed.
    this.router.post('/preroll', auth, (req, res, next) => {
        
        //Validate the name
        const validation = rules.name.validate(req.body.name || null);
        if (validation.error != null) throw validation.error;

        //Send the event
        gateway.broadcast(EVENT_ORCHESTRA_PREROLL, { name: validation.value });
        res.send({ name: validation.value });
    });

    //Sets what we think the current score is
    this.router.post('/score', auth, (req, res, next) => {
        
        const validation = rules.score.validate(req.body);
        if (validation.error != null) throw validation.error;
        
        //Update our scores and broadcast the events
        this.scores = validation.value;
        gateway.broadcast(EVENT_ORCHESTRA_SCORE, this.scores);
        res.send({ scores: this.scores });
    });

    //Gets the current score
    this.router.get('/score', (req, res, next) => {
        res.send({scores: this.scores });
    });

    return this;
} 