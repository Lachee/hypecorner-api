const Joi               = require('joi');
const express           = require('express');
const BadRequestError   = require('../../http-errors').BadRequestError;

const EVENT_ORCHESTRA_SKIP     = 'ORCHESTRA_SKIP';     //Sent to tell the OCR that we wish to skip this nonsense and please find us a new channel.
const EVENT_ORCHESTRA_PREROLL  = 'ORCHESTRA_PREROLL';  //Sent to tell the embed client and OBS clients to run a preroll for a specified duration as we are about to change.
const EVENT_ORCHESTRA_CHANGE   = 'ORCHESTRA_CHANGE';   //Sent to tell the embed clients to switch channel
const EVENT_ORCHESTRA_SCORE    = 'ORCHESTRA_SCORE';    //Sent every now and again to tell the users what we think the score is. More a reminder to stay connected.

const DB_VERSION = 2;

module.exports = function(options) {
    this.options = options;
    this.router = express.Router();

    this.channelId = null;
    this.channelName = "monstercat";
    this.scores = [];

    const { db, gateway, auth } = this.options;
    const channels = db.get('channels');

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
    this.router.post('/change', auth, async (req, res, next) => {
        
        //The schema to validate against
        const schema = Joi.object({
            name: rules.name
        });

        //Validate the name
        const validation = schema.validate(req.body);
        if (validation.error != null) throw validation.error;
           

        //Calculate now
        const now = new Date() / 1;
        const name = validation.value.name;

        //Make sure we are not already hosting this channel
        if (this.channelName == name)
            throw new BadRequestError('channel is already hosted');

        //Update existing channels end
        if (this.channelId != null) {
            await channels.update( 
                { _id: this.channelId, version: DB_VERSION },
                { $set: { 
                    "hosts.$[elem].end": now, 
                    "hosts.$[elem].next": name,
                    "live": false,
                } },
                { arrayFilters: [ { "elem.end": { $lte: 0 } } ]  }
            );
        }
        
        //Prepare the new host item
        let host = {
            start: now,
            end: 0,
            next: "",
            skip: false,
            scores: []
        }
        
        //Updating or Create the existing channel
        const existing = await channels.findOne({ name: name, version: DB_VERSION },  { limit: 1, projection: { _id: 1, name: 1 } });
        if (existing != null) {
            //Updating a existing record
            await channels.update(
                { _id: existing._id },
                { 
                    $push: { hosts: host },
                    $set: { live: true },
                }
            );

            //Get the ID and the name
            this.channelId = existing._id;
            this.channelName = existing.name;
        } else {

            //Create a new record
            const newResult = await channels.insert({
                name: name,
                live: true,
                version: DB_VERSION,
                hosts: [ host ]
            });

            this.channelId = newResult._id;
            this.channelName = name;
        }
        
        //Broadcast the change
        this.scores = [ -1, -1 ];
        gateway.broadcast(EVENT_ORCHESTRA_CHANGE, { name: this.channelName });
        res.send({ name: this.channelName });
    });

    //Gets the current channel
    this.router.get('/channel', (req, res, next) => {
        res.send({ name: this.channelName });
    });

    //Skips the channel
    this.router.post('/skip', auth, async (req, res, next) => {
        //We wanted to be skipped
        await channels.update( 
            { _id: this.channelId },
            { $set: { "hosts.$[elem].skip": true } },
            { arrayFilters: [ { "elem.end": { $lte: 0 } } ]  }
        );

        //Broadcast the event
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
    this.router.post('/score', auth, async (req, res, next) => {
        
        //Vadliate the body
        const validation = rules.score.validate(req.body);
        if (validation.error != null) throw validation.error;
        
        //Push the score to the mongo DB
        this.scores = validation.value;
        await channels.update( 
            { _id: this.channelId, version: DB_VERSION },
            { $push: { "hosts.$[elem].scores": [ (new Date() / 1), this.scores[0], this.scores[1] ] } },
            { arrayFilters: [ { "elem.end": { $lte: 0 } } ]  }
        );

        //Send the events
        gateway.broadcast(EVENT_ORCHESTRA_SCORE, this.scores);
        res.send({ scores: this.scores });
    });

    //Gets the current score
    this.router.get('/score', (req, res, next) => {
        res.send({scores: this.scores });
    });

    return this;
} 