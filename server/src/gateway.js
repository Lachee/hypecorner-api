const express = require('express');

module.exports = function Gateway(app) {

    //Prepare the express WS and our router
    this.wss = require('express-ws')(app);
    this.app = app;
    this.router = express.Router();

    //Prepare a list of events. This isn't required but is a convience.
    this.Events = {
        EVENT_ORCHESTRA_SKIP      : 'ORCHESTRA_SKIP',     //Sent to tell the OCR that we wish to skip this nonsense and please find us a new channel.
        EVENT_ORCHESTRA_PREROLL   : 'ORCHESTRA_PREROLL',  //Sent to tell the embed client and OBS clients to run a preroll for a specified duration as we are about to change.
        EVENT_ORCHESTRA_CHANGE    : 'ORCHESTRA_CHANGE',   //Sent to tell the embed clients to switch channel
        EVENT_ORCHESTRA_SCORE     : 'ORCHESTRA_SCORE',    //Sent every now and again to tell the users what we think the score is. More a reminder to stay connected.

        EVENT_BLACKLIST_ADD       : 'BLACKLIST_ADDED',    //Invoked when a user is added to the blacklist
        EVENT_BLACKLIST_REMOVE    : 'BLACKLIST_REMOVED',  //Invoked when a user is removed from the blacklist

        EVENT_STATUS              : 'STATUS',
    }

    //Main WS route, when someone first joins
    this.router.ws('/gateway', (ws, req) => {
        
        //WS is alive by default.
        ws.isAlive = true;
        
        //If they pong back, then we will set them as alive.
        ws.on('pong', () => {
            ws.isAlive = true;
        });
        
        //They have sent a message
        ws.on('message', function(msg) {
            ws.isAlive = true;
            console.log('WS has sent a message.');
        });        
    });

    //Broadcast function
    this.broadcast = function(event, data) {
        //Create the payload
        const payload = {
            e: event.toUpperCase(),
            d: data
        };

        //Create the json object and send.
        const json = JSON.stringify(payload);
        this.wss.clients.forEach((client) => client.send(json));
    };

    //The views count
    this.views = function() {
        if (this.wss.clients == null) return 0;
        return this.wss.clients.length;
    }

    //Interval the ping rate, every 10s
    setInterval(() => {
       
        if (this.views() > 0) {
            //Ping Everyone
            this.wss.clients.forEach(client => {
                if (client.isAlive) return client.terminate();
                client.isAlive = false;
                client.ping(null, false, true);
            });

            //Update the stats for everyone
            this.broadcast(this.Events.EVENT_STATUS, { views: this.views() });        
        }
    }, 10000);

    return this;
} 