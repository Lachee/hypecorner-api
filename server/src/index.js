require('dotenv').config();
const express       = require('express');
const express_err   = require('express-async-errors');
const morgan        = require('morgan');
const helmet        = require('helmet');
const cors          = require('cors');

//setup monk
const monk = require('monk');
const db = monk(process.env.DATABASE_URL);

//Setup express
const app = express();
app.use(express.json());
app.use(morgan());
app.use(helmet());
app.use(cors());

//Setup the auth
const authentication = require('./authorize');

//Prepare the gateway
const gateway = require('./gateway')(app);
app.use('/api', gateway.router);               //This will be eventually /api too, but disbaled to help debug routing.

//Prepare the routes
const options = { 
    app, 
    gateway,
    db,
    auth: authentication({
        database: db,
        key: process.env.AUTH_KEY,
    })
};

//Setup the API
app.use('/api', require('./api/v1')(options));

//Use the middleware
const middlewares = require('./middlewares');
app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

//Using the MongoDB, we need to quickly purge the invalid entries.
const channels = db.get('channels');
channels.update(
    { live: true }, 
    { $pop: { hosts: 1 }, $set: { live: false } }
);

//setup the port and listen
const port = process.env.PORT || 2525;
app.listen(port, () => {
    console.log(`API Listening at http://localhost:${port}`);
});