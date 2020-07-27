require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');
var ejs = require('ejs');
var fs = require('fs');

//Setup Express
var express = require("express");
var app = express();
var expressWs = require('express-ws')(app);
var basicAuth = require('express-basic-auth');
app.set('view engine', 'ejs');
app.use(express.json());

//Setup the authorization
var users = {};
users[process.env.AUTH_NAME || "admin"] = process.env.AUTH_KEY;

//setup the default channel
var currentChannel = process.env.DEFAULT_CHANNEL || "monstercat";

//setup teh blacklist
const blacklistFile = process.env.BLACKLIST || "blacklist.json";
var blacklist = {
    "hypecorner": "Compilation Stream",
    "theconsolestreamer": "Extreme Toxicity",
};
fs.readFile(blacklistFile, (err, data) => {

    //If we failed, Write the default
    if (err) { 
        console.error("Failed to load blacklist", err);
        fs.writeFileSync(blacklistFile, JSON.stringify(blacklist));
        return;
    }

    //Continue
    blacklist = JSON.parse(data);
    console.log("Blacklist Loaded", blacklist);
});


console.log("Starting");

// setChannel changes what everyone is watching.
function setChannel(name) {
    console.log("Now hosting", currentChannel);

    //Set the name
    currentChannel = name;

    //Tell every single connection the new channel name
    var wss = expressWs.getWss('/');
    wss.clients.forEach(function (client) {
        client.send(currentChannel);
    });
}

//Listen to websocket connections. We dont care what they send really.
app.ws('/listen', function(ws, req) {
    ws.on('message', function(msg) {
        console.log("msg from WS client", msg);
    });
    console.log("New WS client connected");
});

/////////////////// CHANNEL
//When someone posts to the channel name, then we will update the list.
app.post("/api/channel/:name", basicAuth({ users }), (req, res, next) => {
    //Update the post
    setChannel(req.params.name);

    //Return the new channel
    res.send({ name: currentChannel });
});

//If someone calls the /channel, we will retunr the current chanenl
app.get("/api/channel", (req, res, next) => {
    res.send({ name: currentChannel });
});

/////////////////// BLACKLIST
//Adds someone to the blacklist
app.post("/api/blacklist/:name", basicAuth({ users }), (req, res, next) => {
    var name = req.params.name;                                             //Validate the reason and name
    var reason = req.body.reason || '';
    if (reason == '') throw new Error("Reason cannot be empty");
    if (name == '') throw new Error("Name cannot be empty");

    //Set the blacklist
    blacklist[name] = reason;                                               //Add the blacklist anad write
    fs.writeFileSync(blacklistFile, JSON.stringify(blacklist));

    // If we have blacklisted someone, lets just return to a default
    if (currentChannel == name) {
        console.warn("Black listed current player! Not sure who to run next, so just doing default.");
        setChannel("monstercat");
    }

    //Return the response
    res.send({ name: name, reason: reason });
});
//Remove someone to the blacklist
app.delete("/api/blacklist/:name", basicAuth({ users }), (req, res, next) => {
    var name = req.params.name;                                             //Validate the name
    if (!blacklist[name]) throw new Error("Name is not in the blacklist");

    delete blacklist[name];                                                 //Remove the blacklist
    
    fs.writeFileSync(blacklistFile, JSON.stringify(blacklist));          //Write the blacklist
    res.send({ name: name });
});
//Gets the reason someone is blacklisted
app.get("/api/blacklist/:name", (req, res, next) => {
    var name = req.params.name;                                             //Return the blacklist item
    if (!blacklist[name]) throw new Error("Name is not in the blacklist");
    res.send({ name: name, reason: blacklist[name] });
});
//Gets a list of blacklisted channels
app.get("/api/blacklist", (req, res, next) => {                                 //Return the entire blacklist
    res.send(blacklist);
});

/////////////////// PAGES
app.get("/", (req, res, next) => {
    res.render('index', { chat: true, channel: currentChannel });
});
app.get("/embed", (req, res, next) => {
    res.render('index', { chat: false, channel: currentChannel });
});
app.get("/blacklist", (req, res, next) => {
    res.render('blacklist', { blacklist: blacklist });
});

//Listen
app.listen(process.env.PORT || 3000, () => {
    console.log("Server running on port ", process.env.PORT || 3000);
});
