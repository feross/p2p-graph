# p2p-graph [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url]

[travis-image]: https://img.shields.io/travis/feross/p2p-graph/master.svg
[travis-url]: https://travis-ci.org/feross/p2p-graph
[npm-image]: https://img.shields.io/npm/v/p2p-graph.svg
[npm-url]: https://npmjs.org/package/p2p-graph
[downloads-image]: https://img.shields.io/npm/dm/p2p-graph.svg
[downloads-url]: https://npmjs.org/package/p2p-graph

### Real-time P2P network visualization with D3

![demo](demo.gif)

Works in the browser with [browserify](http://browserify.org/)! This module is used
by [WebTorrent](http://webtorrent.io). You can see this package in action on the
[webtorrent.io](https://webtorrent.io/) homepage.

## install

```
npm install p2p-graph
```

## usage

```js
var Graph = require('p2p-graph')

var graph = new Graph('.root')

// Add two peers
graph.add({
  id: 'peer1',
  me: true,
  name: 'You'
})
graph.add({
  id: 'peer2',
  name: 'Another Peer'
})

// Connect them
graph.connect('peer1', 'peer2')
```

## api

### graph = new Graph(rootElem)

Create a new P2P graph at the root DOM element `rootElem`. In addition to an
`Element`, a query selector string (like `'.my-cool-element'`) can also be passed
in.

### graph.add(peer)

Add a peer to the graph. The `peer` object should contain:

```
{
  id: 'unique-identifier', // should be unique across all peers
  me: true, // is this the current user?
  name: 'display name' // name to show in the graph UI
}
```

### graph.connect(id1, id2)

Connect to two nodes, identified by `id1` and `id2`, to each other.

### graph.disconnect(id1, id2)

Disconnect two nodes, identified by `id1` and `id2`, from each other.

### graph.remove(id)

Remove a node, identified by `id`, from the graph.

### graph.seed(id, seeding)

Change a node's status identified by `id`, `seeding` must be true or false.

### graph.rate(id1, id2, speed)

Update the transfer rate between two nodes identified by `id1` and `id2`. `speed` must be expressed in bytes.

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
