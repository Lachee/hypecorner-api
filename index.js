const http = require('http');
const WebSocket = require('ws');
var ejs = require('ejs');
var fs = require('fs');

//Setup Express
var express = require("express");
var app = express();
var expressWs = require('express-ws')(app);
app.set('view engine', 'ejs');

var currentChannel = "monstercat";

//Listen to websocket connections. We dont care what they send really.
app.ws('/listen', function(ws, req) {
    ws.on('message', function(msg) {
        console.log("msg from WS client", msg);
    });

    console.log("New WS client connected");
});

//When someone posts to the channel name, then we will update the list.
app.post("/channel/:name", (req, res, next) => {
    //Update the post
    currentChannel = req.params.name;
    console.log("Now hosting", currentChannel);

    //Tell every single connection the new channel name
    var wss = expressWs.getWss('/');
    wss.clients.forEach(function (client) {
        client.send(currentChannel);
    });

    //Return the new channel
    res.json({ name: currentChannel });
});

//If someone calls the /channel, we will retunr the current chanenl
app.get("/channel", (req, res, next) => {
    res.json({ name: currentChannel });
});

//Main Page
app.get("/", (req, res, next) => {
    res.render('index', { chat: true, channel: currentChannel });
});
app.get("/embed", (req, res, next) => {
    res.render('index', { chat: false, channel: currentChannel });
});

//Listen
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
