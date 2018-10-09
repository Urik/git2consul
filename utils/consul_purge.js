var _ = require('underscore');
const { getConsul } = require('../lib/consul/consul_factory');

var kill_entry = function(key) {

  // Do not allow consul config to be purged.
  if (key === 'git2consul/config') return;

  console.log('Deleting %s', key);

  var params = {'key': key};

  if (process.env.TOKEN) {
    params = _.extend(params, {'token': process.env.TOKEN})
  }

  getConsul().kv.del(params, function(err) {
    if (err) return console.error(err);
  });
};

console.log('Deleting all keys');

var get_all_params = {key: '', recurse: true}
if (process.env.TOKEN) {
  params = _.extend(get_all_params, {'token': process.env.TOKEN})
}

getConsul().kv.get(get_all_params, function (err, items) {
  if (err) return console.error(err);

  if (items) {
    items.forEach(function(item) {
      kill_entry(item.Key);
    });
  }
});
