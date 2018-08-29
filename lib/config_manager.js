'use strict';

let deferred = Promise.defer();
let promise = deferred.promise;

function setConfig(config) {
    // We do this in order to return a pending promise if someone asks for the config before initialization.
    // If promise and deferred.promise are not equal, this means we're overwriting the config, thus we 
    // create a new config promise and return that one instead.
    if (promise === deferred.promise) {
        deferred.resolve(config);
    } else {
        promise = Promise.resolve(config);
    }
}

function getConfig() {
    return promise;
}

module.exports = {
    setConfig,
    getConfig
}