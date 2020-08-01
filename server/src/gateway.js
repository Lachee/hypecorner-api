const express = require('express');
const EVENT_STATUS = 'STATUS';
const EVENT_HEARTBEAT = 'HEARTBEAT';

module.exports = function Gateway(app) {

    //Prepare the express WS and our router
    this.wss = require('express-ws')(app).getWss();
    this.app = app;
    this.router = express.Router();
    this.heartbeatDuration = 10000;

    //The route to get connections
    this.router.get('/views', (req, res, next) => {
        res.send({ views: this.views() });
    });

    //Main WS route, when someone first joins
    this.router.ws('/', (ws, req) => {
        const self = this;
        ws.isAlive = true;
        
        //They have sent a message
        ws.on('message', function(msg) {
            //Has responded to a heartbeat, so keep it alive again.
            // (im lazy and should check the event, but any is good enough really)
            ws.isAlive = true;
        });        
        
        //TODO: Create statistics when we get viewers
        console.log("TODO: Create statistics when we get viewers");

        //On close, tell everyone else
        // This is a nice idea, but its better to include this in the heartbeat
        //ws.on('close', function(msg) {
        //    self.broadcast(EVENT_STATUS, { views: self.views() });  
        //});
        
        ////Broadcast to everyone there is new views
        //this.broadcast(EVENT_STATUS, { views: this.views() });   
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
        console.log('📣 Orchestra Broadcast ', event, data);
        return true;
    };

    //The views count
    this.views = function() {
        if (this.wss == null || this.wss.clients == null) return 0;
        return this.wss.clients.size;
    }

    setInterval(() => {        
        this.wss.clients.forEach(client => {
            //Terminate dead clients
            if (!client.isAlive) {
                client.terminate();
                return;
            }
            
            //Trigger a heartbeat
            client.isAlive = false;
            client.send(JSON.stringify({ 
                e: EVENT_HEARTBEAT, 
                d: { 
                    duration: this.heartbeatDuration,
                    viewers: this.views(),
                }
            }));
        });
    }, this.heartbeatDuration)

    return this;
} 