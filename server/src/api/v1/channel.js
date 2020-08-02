const Joi = require('joi');
const express = require('express');

module.exports = function(options) {    
    this.options = options;
    this.router = express.Router();

    const { db, auth, bucket } = this.options;
    const channels = db.get('channels');

    const rules = {       
        name: Joi.string()
            .min(1).max(25)
            .lowercase()
            .pattern(/^[a-zA-Z0-9_]{1,25}$/, 'Twitch channel name')
            .trim()
            .required(),

        image: Joi.string()
                .trim()
                .dataUri()
                .required(),
    }

    // Sets the channels thumbnail
    this.router.post('/:name/thumbail', auth, async (req, res, next) => {

        //Stop if we cannot process images
        if (bucket == null)
            throw new Error('Thumbnails are not configured on this instance');

        //Vadliate the name
        let validation = rules.name.validate(req.params.name);
        if (validation.error) throw validation.error;

        //Validate the body
        //TODO: Actual image validation
        validation = rules.image.validate(req.body);
        if (validation.error) throw validation.error;
        
        //Finally upload the image
        const buffer = Buffer.from(validation.value.image.replace(/^data:image\/\w+;base64,/, ""),'base64');
        bucket.putObject({
            Bucket: process.env.AWS_BUCKET,
            Key: `${name}.jpg`,
            Body: buff,
            ContentType: 'image/jpeg'
        }, (err, data) => {
            if (err) throw err;
            res.send(data);
        });
    });
    
    
    //Just reutrn the router
    return this;
}