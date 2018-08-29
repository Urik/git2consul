'use strict';

let deferred = Promise.defer();
let promise = deferred.promise;

function setConfig(config) {
    // if deferred is something, this means it's the first time setting the config. 
    // If someone called getConfig() before the config has been initialized, he's going to receive
    // this deferred's promise. Thus, we resolve that promise so whoever is waiting for the config to be initialized gets that config.
    if (deferred) {
        deferred.resolve(config);
        // After whoever asked for the config gets that value, we dereference the deferred object in order to allow the 
        // garbage collector to collect it, and to avoid resolving it more than once..
        deferred = null;
    }
    promise = Promise.resolve(config);
}

function getConfig() {
    return promise;
}

module.exports = {
    setConfig,
    getConfig
}