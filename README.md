<img align="left" src="https://github.com/Lachee/hypecorner-api/blob/rewrite/client/public/favicon.png" width=256>

.


.

.

## Usage
Really stupid easy. 
1. `npm install`
2. `node index.js`

## API
API isn't documented yet since this is private use at the moment. In general though:
* `/api/gateway` is a websocket you can connect to. It sends events for different things.
* `/api/blacklist` lists blacklisted channels
* `/api/blacklist/:name` gets the reason of a channel blacklist
* `/api/channel` gets the current channel.

every other endpoint requires authorization. See code for details.

## Attribution
This project uses some assets that require attribution. Please find them in `ATTRIBUTION` files.
- `public/sound/ATTRIBUTION` list of sound attributions
