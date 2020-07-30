const express = require('express');

module.exports = function Gateway(app) {

    //Prepare the express WS and our router
    this.wss = require('express-ws')(app);
    this.app = app;
    this.router = express.Router();

    //Prepare a list of events. This isn't required but is a convience.
    this.Events = {

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

    /** Broadcasts an event to all connected clients. */
    this.broadcast = function(event, data) {
        //Vadliate we have clients
        if (this.wss == null || this.wss.clients == null)
            return false;

        //Create the payload
        const payload = {
            e: event.toUpperCase(),
            d: data
        };

        //Create the json object and send.
        const json = JSON.stringify(payload);
        this.wss.clients.forEach((client) => client.send(json));
        return true;
    };

    //The views count
    this.views = function() {
        if (this.wss == null || this.wss.clients == null) return 0;
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