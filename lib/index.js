var logger = require('./logging.js');

var fs = require('fs');
var os = require('os');

const { parseArgs } = require('./args_parser');
const config_manager = require('./config_manager');

const defaults = require('./defaults');

const config_reader = require('./config_reader.js');
const config_seeder = require('./config_seeder.js');

function setGlobals(args) {
  /**
   * Default config variables
   */
  
  global.endpoint = process.env.CONSUL_ENDPOINT || "127.0.0.1";
  global.port = process.env.CONSUL_PORT || 8500;
  global.secure = process.env.CONSUL_SECURE || false;
  global.token = process.env.TOKEN || null;
  global.config_file = null;
  global.config_key = "git2consul/config";

  if (args.secure || global.secure !== false) {
    // If CONSUL_SECURE is anything but false, set to true to avoid SSL unknown protocol error
    global.secure = true;
  }
  if (args.endpoint) {
    global.endpoint = args.endpoint;
  }
  if (args.config_key) {
    global.config_key = args.config_key;
  }
  if (args.port) {
    global.port = args.port;
  }
  if (args.token) {
    global.token = args.token;
  }
  if (args['config-file']) {
    global.config_file = args['config-file'];
  }
}

/**
 * Read config from a specially named Consul resource.  If the config was not seeded
 * (and this should be done using utils/config_seeder.js), git2consul will not boot.
 */
var read_config = function(cliArgs){
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
    if (cliArgs.no_daemon) {
      config.no_daemon = true;
    }
    if (cliArgs.halt_on_change) {
      config.halt_on_change = true;
    }
    if (cliArgs.max_parallelism) {
      config.max_parallelism = cliArgs.max_parallelism;
    }
    if (cliArgs.local_store) {
      config.local_store = cliArgs.local_store;
    }

    // In these cases the parameters are not defined nor in the config file, nor by CLI parameters
    if (!config.local_store) {
      config.local_store = os.tmpdir();
    }
    if (!config.max_parallelism) {
      config.max_parallelism = defaults.MAX_PARALLELISM;
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

const args = parseArgs();
setGlobals(args);
if (global.config_file) {
  config_seeder.set(global.config_key, global.config_file, function(err) {
    if (err) {
      logger.error(err)
      process.exit(2)
    }
    read_config(args);
  });
} else {
  read_config(args);
}