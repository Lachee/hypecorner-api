
const Joi = require('joi');
const express = require('express');

module.exports = function(options) {    
    this.options = options;
    this.router = express.Router();

    const { db, auth } = this.options;
    const channels = db.get('channels');

    const rules = {       
        name: Joi.string()
            .min(1).max(25)
            .lowercase()
            .pattern(/^[a-zA-Z0-9_]{1,25}$/, 'Twitch channel name')
            .trim()
            .required(),
    }

    //Gets the channel hosts
    this.router.get('/:name', auth, async (req, res, next) => {
        const validation = rules.name.validate(req.params.name);
        if (validation.error) throw validation.error;

        const results = await channels.findOne({ name: validation.value }, { projection: { hosts: 1 } } );
        res.send(results);
    });

    //Just reutrn the router
    return this;
}