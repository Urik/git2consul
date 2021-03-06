var logger = require('./logging.js');

var fs = require('fs');
var os = require('os');

const config_manager = require('./config_manager');

/**
 * Default config variables
 */

global.endpoint = process.env.CONSUL_ENDPOINT || "127.0.0.1";
global.port = process.env.CONSUL_PORT || 8500;
global.secure = process.env.CONSUL_SECURE || false;
global.token = process.env.TOKEN || null;
global.config_file = null;
global.config_key = "git2consul/config"

/**
 * Parse out flags and override defaults if they are set
 */
for (var i=2; i<process.argv.length; ++i) {
  // If CONSUL_SECURE is anything but false, set to true to avoid SSL unknown protocol error
  if(process.argv[i] === '-s' || process.argv[i] === '--secure' || global.secure !== false) global.secure = true

  if(process.argv[i] === '-e' || process.argv[i] === '--endpoint') {
    if(i+1 >= process.argv.length) {
      logger.error("No endpoint provided with --endpoint option");
      process.exit(3);
    }
    global.endpoint = process.argv[i+1];
  }

  if(process.argv[i] === '-c' || process.argv[i] === '--config-key' || process.argv[i] === '--config_key') {
    if(i+1 >= process.argv.length) {
      logger.error("No consul Key name provided with --config-key option");
      process.exit(4);
    }
    global.config_key = process.argv[i+1];
  }

  if(process.argv[i] === '-p' || process.argv[i] === '--port') {
    if(i+1 >= process.argv.length) {
      logger.error("No port provided with --port option");
      process.exit(5);
    }
    global.port = process.argv[i+1];
  }

  if(process.argv[i] === '-t' || process.argv[i] === '--token') {
    if(i+1 >= process.argv.length) {
      logger.error("No token provided with --token option");
      process.exit(6);
    }
    global.token = process.argv[i+1];
  }

  if(process.argv[i] === '-f' || process.argv[i] === '--config-file') {
    if(i+1 >= process.argv.length) {
      logger.error("No file provided with --config-file option");
      process.exit(7);
    }
    global.config_file = process.argv[i+1];
  }
}

var config_reader = require('./config_reader.js');
var config_seeder = require('./config_seeder.js');

function setValueConfigArgument(i, shortFlag, longFlag, errorMessage, configSetter) {
  if (process.argv[i] === shortFlag || process.argv[i] === longFlag) {
    if (i+1 > process.argv.length) {
      logger.error(errorMessage);
      process.exit(3);
    }
    configSetter(process.argv[i+1]);  
  }
}

/**
 * Read config from a specially named Consul resource.  If the config was not seeded
 * (and this should be done using utils/config_seeder.js), git2consul will not boot.
 */
var read_config = function(){
  config_reader.read({'key': global.config_key}, function(err, config) {
    if (err) return console.error(err);

    // Logging configuration is specified in the config object, so initialize our logger
    // around that config.
    logger.init(config);

    if (global.token) {
      // If a token was configured, register it with the consul broker
      require('./consul').setToken(global.token);
    }

    var git = require('./git');

    if (!config.repos || !config.repos.length > 0) {
      // Fail startup.
      logger.error("No repos found in configuration.  Halting.")
      process.exit(1);
    }

    if (config.max_sockets) {
      require('http').globalAgent.maxSockets = config.max_sockets;
      require('https').globalAgent.maxSockets = config.max_sockets;
    }

    // Process command line switches, if any.  Command-line switches override the settings
    // loaded from Consul.
    for (var i=2; i<process.argv.length; ++i) {
      if (process.argv[i] === '-n' || process.argv[i] === '--no_daemon') config['no_daemon'] = true;
      if (process.argv[i] === '-h' || process.argv[i] === '--halt_on_change') config['halt_on_change'] = true;
      setValueConfigArgument(i, '-mp', '--max_parallelism', 'No value provided for max parallelism', val => config.max_parallelism = Number(val));
      setValueConfigArgument(i, '-w', '--max_retry_wait', 'No value provided for max retry wait', val => config.max_retry_wait = Number(val));
      setValueConfigArgument(i, '-d', '--local_store', 'No dir provided with --local_store option', val => config.local_store = val);
    }

    if (!config.local_store) {
      config.local_store = os.tmpdir();
    }

    config_manager.setConfig(config);

    logger.info('git2consul is running');

    process.on('uncaughtException', function(err) {
      logger.error("Uncaught exception " + err);
    });

    // Set up git for each repo
    git.createRepos(config, function(err) {
      if (err) {
        logger.error('Failed to create repos due to %s', err);
        setTimeout(function() {
          // If any git manager failed to start, consider this a fatal error.
          process.exit(2);
        }, 2000);
      }
    });
  });
};

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', JSON.stringify(p.stack), 'reason:', JSON.stringify(reason.stack));
  console.log(JSON.stringify(reason));
  // application specific logging, throwing an error, or other logic here
});

if (global.config_file) {
  config_seeder.set(global.config_key, global.config_file, function(err) {
    if (err) {
      logger.error(err)
      process.exit(2)
    }
    read_config();
  });
} else {
  read_config();
}
