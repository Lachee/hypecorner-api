const Joi                                   = require('joi');
const express                               = require('express');
const fileUpload                            = require('express-fileupload');
const { NotFoundError, BadRequestError }    = require('../../http-errors');

const DB_VERSION = 2;

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
    this.router.use('/:name/thumbnail', fileUpload({}));
    this.router.post('/:name/thumbnail', auth, async (req, res, next) => {

        //Stop if we cannot process images
        if (bucket == null)
            throw new Error('Thumbnails are not configured on this instance');

        //Vadliate the name
        let validation = rules.name.validate(req.params.name);
        if (validation.error) throw validation.error;
        const name = validation.value;

        //Make sure the image exists
        if (!req.files.image) 
            throw new BadRequestError('Image not supplied');

        //Finally upload the image
        bucket.putObject({
            Bucket: process.env.AWS_BUCKET,
            Key: `${name}.jpg`,
            Body: req.files.image.data,
            ContentType: 'image/jpeg'
        }, (err, data) => {
            if (err) throw err;
            res.send(data);
        });
    });
    
    // Gets the top 10 recent channels
    this.router.get('/recent', async (req, res, next) => {
        const result = await channels.aggregate([
            { '$project': { 'name': 1, 'hosts.start': true } }, 
            { '$unwind': '$hosts' }, 
            { '$sort': { 'hosts.start': -1 }}, 
            { '$limit': 10 }
        ]);
        res.send(result);
    });

    // Gets information about a specific channel
    this.router.get('/:name', async (req, res, next) => {
        //Validate the name
        const validation = rules.name.validate(req.params.name);
        if (validation.error != null)
            throw validation.error;

        const name = validation.value;

        //Get the object
        const result = await channels.findOne(
            { name: name , version: DB_VERSION },
            { 
                projection: {
                    '_id': true,
                    'name': true,
                    'live': true,
                    'title': true,
                } 
            }
        );
        if (result == null) throw new NotFoundError('failed to find any channels with specified name');

        result.url = "https://twitch.tv/" + name;
        if (bucket != null) result.thumbnail = `https://${process.env.BUCKET_NAME}/${name}.jpg`;
        
        res.send(result);
    });
    
    //Just reutrn the router
    return this;
}