const Joi           = require('joi');
const express       = require('express');

const NotFoundError     = require('../../http-errors').NotFoundError;
const BadRequestError   = require('../../http-errors').BadRequestError;
const ConflictError     = require('../../http-errors').ConflictError;

const EVENT_BLACKLIST_ADD       = 'BLACKLIST_ADD';
const EVENT_BLACKLIST_REMOVE    = 'BLACKLIST_REMOVE';

const DB_VERSION = 1;

module.exports = function(options) {    
    this.options = options;
    this.router = express.Router();

    const { db, gateway, auth } = this.options;

    //Blacklist entry
    const blacklist = db.get('blacklist');

    //Rules on how to validate blacklist entries
    const rules = {
        name: Joi.string()
                    .min(1).max(25)
                    .lowercase()
                    .pattern(/^[a-zA-Z0-9_]{1,25}$/, 'Twitch channel name')
                    .trim()
                    .required(),
        reason: Joi.string()
                    .min(1).max(128)
                    .trim()
                    .required(),
    };

    //The compiled schema for the rules
    const schema = Joi.object().keys(rules);

    
    //Delete a user from the blacklist
    this.router.delete('/:name', auth, async (req, res, next) => {
        
        //Vadliate the name
        const validation = rules.name.validate(req.params.name);
        if (validation.error != null)
            throw validation.error;
            
        //Delete the record
        const result = await blacklist.remove({ name: validation.value, version: DB_VERSION });
        if (result.deletedCount == 0) throw new NotFoundError('failed to delete any records');

        //Give the results back.
        gateway.broadcast(EVENT_BLACKLIST_REMOVE, {name: validation.value });
        res.send({ count: result.deletedCount });
    });

    //Get the reason a user is on the blacklist
    this.router.get('/:name', async (req, res, next) => {
        
        //Validate the name
        const validation = rules.name.validate(req.params.name);
        if (validation.error != null)
            throw validation.error;

        //Return the specific item
        const result = await blacklist.findOne({ name: validation.value, version: DB_VERSION });
        if (result == null) throw new NotFoundError('failed to find any records with supplied name');
        res.send(result);
    });

    //Add a user to the blacklist
    this.router.post('/', auth, async (req, res, next) => {
        
        //Validate the schema
        const validation = schema.validate(req.body);
        if (validation.error != null) 
            throw validation.error;
        
        //Prepare the object
        const { name, reason } = validation.value;
        const entry = {
            name,
            reason,
            version: DB_VERSION,
            time: (new Date() / 1)
        };

        //Make sure the entry exists
        if (await blacklist.findOne({ name: name, version: DB_VERSION }) !== null)
            throw new ConflictError('Name already exists');
        
        //Upload the entry
        const newEntry = await blacklist.insert(entry);
        
        //Give the results back
        gateway.broadcast(EVENT_BLACKLIST_REMOVE, newEntry);
        res.send(newEntry);
    });

    //Get the blacklist
    this.router.get('/', (req, res, next) => {
        blacklist.find().then(all => res.send(all));
    });

    //Just reutrn the router
    return this;
}