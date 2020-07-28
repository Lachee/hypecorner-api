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
const { stringify } = require('querystring');
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

const EVENT_ORCHESTRA_SKIP      = 'ORCHESTRA_SKIP';     //Sent to tell the OCR that we wish to skip this nonsense and please find us a new channel.
const EVENT_ORCHESTRA_PREROLL   = 'ORCHESTRA_PREROLL';  //Sent to tell the embed client and OBS clients to run a preroll for a specified duration as we are about to change.
const EVENT_ORCHESTRA_CHANGE    = 'ORCHESTRA_CHANGE';   //Sent to tell the embed clients to switch channel
const EVENT_ORCHESTRA_SCORE     = 'ORCHESTRA_SCORE';    //Sent every now and again to tell the users what we think the score is. More a reminder to stay connected.
const EVENT_BLACKLIST_ADD       = 'BLACKLIST_ADDED';    //Invoked when a user is added to the blacklist
const EVENT_BLACKLIST_REMOVE    = 'BLACKLIST_REMOVED';  //Invoked when a user is removed from the blacklist

// change channel changes what everyone is watching.
function changeChannel(name) {    
    //Set the name
    currentChannel = name;
    console.log("Now hosting", currentChannel);
    return broadcast(EVENT_ORCHESTRA_CHANGE, { name: currentChannel });
}

// broadcast sends a message to every websocket connection
function broadcast(event, payload = null) {
    //Prepare the payload
    var body = {
        e: event.toUpperCase(),
        d: payload
    };
    var json = JSON.stringify(body);

    //Tell every single connection the new channel name
    var wss = expressWs.getWss('/');
    wss.clients.forEach((client) => client.send(json));
    return body;
}

//Listen to websocket connections. We dont care what they send really.
app.ws('/api/gateway', function(ws, req) {
    ws.on('message', function(msg) {
        console.log("msg from WS client", msg);
    });
    console.log("New WS client connected");
});

/////////////////// CHANNEL
// Gets what channel we are currently on
app.get("/api/channel", (req, res, next) => {
    res.send({ name: currentChannel });
});

/////////////////// ORCHESTRA
// Tells the clients that we are on a new channel
app.post("/api/orchestra/change", basicAuth({ users }), (req, res, next) => {
    var name = req.body.name || "";
    if (name == '') throw new Error('name cannot be empty');
    
    //Update the current channel
    changeChannel(name);
    res.send({ name: currentChannel });
});
// Tells the OCR to skip the current locked on subject
app.post("/api/orchestra/skip", basicAuth({users}), (req, res, next) => {
    console.log("requested a skip");
    let payload = broadcast(EVENT_ORCHESTRA_SKIP);
    res.send(payload);
});
// Tells the clients that we are about to change and you should do the preroll
app.post("/api/orchestra/preroll", basicAuth({users}), (req, res, next) => {
    let payload = broadcast(EVENT_ORCHESTRA_PREROLL, { name: req.body.name || '' });
    res.send(payload);
});
// Reminds all the clients that we still exist and the users current score.
app.post("/api/orchestra/score", basicAuth({users}), (req, res, next) => {
    let arr = req.body;
    if (!Array.isArray(arr) || arr.length != 2) throw new Error('body is a invalid array');
    let payload = broadcast(EVENT_ORCHESTRA_SCORE, arr);
    res.send(payload);
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
        broadcast(EVENT_ORCHESTRA_SKIP);
    }

    //Tell everyone there is a new blacklist
    broadcast(EVENT_BLACKLIST_ADD, { name: name, reason: reason });
    res.send({ name: name, reason: reason });
});

//Remove someone to the blacklist
app.delete("/api/blacklist/:name", basicAuth({ users }), (req, res, next) => {
    var name = req.params.name;                                             //Validate the name
    if (!blacklist[name]) throw new Error("Name is not in the blacklist");

    delete blacklist[name];                                                 //Remove the blacklist    
    fs.writeFileSync(blacklistFile, JSON.stringify(blacklist));             //Write the blacklist
    
    //Tell everyone there is a new blacklist
    broadcast(EVENT_BLACKLIST_REMOVE, { name: name });
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
