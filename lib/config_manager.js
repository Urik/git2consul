'use strict';

let myResolve;
let promise = new Promise((resolve) => myResolve = resolve);

let hasSetConfig = false;
function setConfig(config) {
    if (!hasSetConfig) {
        // If someone called getConfig() before the config has been initialized, he's going to receive
        // an unresolved promise. Thus, we resolve that promise so whoever is waiting for the config to be initialized gets that config.
        // We only want that to happen only once though, afterwards getConfig() will always return a resolved promise, hence we set hasSetConfig to true.
        myResolve(config);
        hasSetConfig = true;
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