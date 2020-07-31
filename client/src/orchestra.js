import EventEmitter from 'events';

export class Orchestra extends EventEmitter {

    #websocket = null;

    constructor(baseAddres, secured = false) {
        super();
        
        this.baseAddress = baseAddres;
        this.secured = secured;
        this.#websocket = null;

        //Connect automatically to the websocket.
        this.#connect();
    }
    
    /** Connects to the websocket */
    #connect() {
        //Create the websocket
        this.#websocket = new WebSocket((this.secured ? 'wss://' : 'ws://') + this.baseAddress + '/gateway');
        
        //Open Clsoe events
        this.#websocket.addEventListener('open', (event) => {
            console.log("Orchestra Connected");
            this.emit('#ws_OPEN', event);
        });
        this.#websocket.addEventListener('close', (event) => {
            console.warn('Orchestra Disconnected. Reconnecting...', event);
            this.emit('#ws_CLOSE', event);
            setTimeout(() => this.#connect(), 250);
        });

        this.#websocket.addEventListener('message', (event) => {
            try {
                //Parse the payload. If it is a heartbeat, then we will exit early as we dont want to let
                // the consumers handle heartbeat messages.
                const payload = JSON.parse(event.data);
                if (payload.e == 'HEARTBEAT') {
                    this.#websocket.send(event.data);
                    return;
                } 
                
                //Emit the event out
                console.log('Orchestra Event', payload.e);
                this.emit(payload.e, payload.d);                
            } catch(e) {
                console.error('Failed to parse message', e);
            }
        });
    }

    /** Closes the websocket, but it will just start again. */
    _close() {
        this.#websocket.close();
    }

    /** Gets the current name of the channel being hosted. */
    async fetchCurrentChannel() {
        const result = await this.#requestAsync('GET', '/orchestra/channel');
        return result.name;
    }

    /** Get a list of blacklisted users */
    async fetchBlacklist() {
        return await this.#requestAsync('GET', '/blacklist/');
    }

    /** Creates a request to the Orchestra server */
    async #requestAsync(method, endpoint, payload = null) {
        const url = (this.secured ? 'https://' : 'http://') + this.baseAddress + endpoint;
        const result = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: payload ? JSON.stringify(payload) : null
        });

        if (result.status != 200)
            throw new Error('Failed to load resource. Status ' + result.status);

        return await result.json();
    }
}