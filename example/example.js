localStorage.debug = '*'; // enable debug

var async = require('async');
var debug = require('debug')('example');
var PeerGraph = require('p2p-graph');

debug('Start torrent-graph');
var graph = new PeerGraph('.torrent-graph');
graph.add({
  id: 'You',
  me: true,
  name: 'You'
});
graph.add({
  id: 'Thing1',
  me: false,
  name: '192.168.1.20'
});
graph.add({
  id: 'Thing2',
  me: false,
  name: '192.168.1.44'
});

async.series([
    function(callback) {
      setTimeout(function() {
        graph.connect('You', 'Thing1');
        callback(null, 1);
      }, 2000);
    },
    function(callback) {
      setTimeout(function() {
        graph.rate('You', 'Thing1', 150 * 1000); // 150 KB/s
        callback(null, 1);
      }, 1000);
    },
    function(callback) {
      setTimeout(function() {
        graph.rate('You', 'Thing1', 500 * 1000); // 500 KB/s
        callback(null, 1);
      }, 1000);
    },
    function(callback) {
      setTimeout(function() {
        graph.rate('You', 'Thing1', 2500 * 1000); // 2.5 MB/s
        callback(null, 1);
      }, 1000);
    },
    function(callback) {
      setTimeout(function() {
        graph.rate('You', 'Thing1', 5000 * 1000); // 5 MB/s
        callback(null, 1);
      }, 1000);
    },
    function(callback) {
      setTimeout(function() {
        graph.rate('You', 'Thing1', 2500 * 1000); // 2.5 MB/s
        callback(null, 1);
      }, 1000);
    },
    function(callback) {
      setTimeout(function() {
        graph.rate('You', 'Thing1', 1000 * 1000); // 1 MB/s
        callback(null, 1);
      }, 1000);
    },
    function(callback) {
      setTimeout(function() {
        debug('TODO: choke() - set opacity to 0.5');
        graph.choke('You', 'Thing1');
        callback(null, 1);
      }, 2000);
    },
    function(callback) {
      setTimeout(function() {
        debug('TODO: unchoke() - get back to default link opacity');
        graph.unchoke('You', 'Thing1');
        callback(null, 1);
      }, 2000);
    },
    function(callback) {
      setTimeout(function() {
        graph.disconnect('You', 'Thing1');
        callback(null, 1);
      }, 2000);
    },
    function(callback) {
      setTimeout(function() {
        graph.remove('Thing1');
        callback(null, 1);
      }, 2000);
    },
    function(callback) {
      setTimeout(function() {
        graph.seed('Thing2', true);
        callback(null, 1);
      }, 2000);
    },
    function(callback) {
      setTimeout(function() {
        graph.seed('Thing2', false);
        callback(null, 1);
      }, 2000);
    }
  ],
  function(err, results) {
    debug('Finished.');
  });
