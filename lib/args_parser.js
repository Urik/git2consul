const yargs = require('yargs');

const booleanArg = (aliases, describe) => ({
    alias: aliases,
    describe
});

const requiresArg = (aliases, describe = '', nargs = 1, isString = false) => ({
    alias: aliases,
    describe,
    nargs,
    string: isString,
    requiresArg: true
});

const nonNumeric = [undefined, undefined, true];

function parseArgs() {
    return yargs
        .options({
            n: booleanArg('no_daemon', 'No daemon if flag is present'),
            h: booleanArg('halt_on_change', 'Halt on change if flag is present'),
            d: requiresArg('local_store'),
            mp: requiresArg('max_parallelism'),
            mr: requiresArg('max_retries'),
            w: requiresArg('max_retry_wait'),
            s: booleanArg('secure'),
            e: requiresArg('endpoint', ...nonNumeric),
            c: requiresArg(['config-key', 'config_key'], ...nonNumeric),
            p: requiresArg('port'),
            t: requiresArg('token', ...nonNumeric),
            f: requiresArg('config-file', ...nonNumeric),

        }).argv;
}

module.exports = { parseArgs }