const consul = require('consul');
const memoizee = require('memoizee');

// Getting consul is an expensive operation which can build up over time, so we'll cache it and reinstantiate if needed every 30 seconds.
// This lowers instantiation time from an average of 0.2 msec to 0.02 msec. Times 250000 instantiations, it lowers time from 50 seconds to 5 seconds.
const instantiateConsul = memoizee((config) => consul(config), { primitive: true, maxAge: 30000 });

module.exports = {
    getConsul() {
        const consulInstance = instantiateConsul({'host': global.endpoint, 'port': global.port, 'secure': global.secure});
        return consulInstance;
    }
};