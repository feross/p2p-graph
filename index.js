module.exports = P2PGraph

var d3 = require('d3')
var debug = require('debug')('p2p-graph')
var EventEmitter = require('events')
var inherits = require('inherits')
var throttle = require('throttleit')

var STYLE = {
  links: {
    width: 0.7, // default link thickness
    maxWidth: 5.0, // max thickness
    maxBytes: 2097152 // link max thickness at 2MB
  }
}

var COLORS = {
  links: {
    color: '#C8C8C8'
  },
  text: {
    subtitle: '#C8C8C8'
  },
  nodes: {
    method: function (d, i) {
      return d.me
        ? d3.hsl(210, 0.7, 0.725) // blue
        : d.seeder
          ? d3.hsl(120, 0.7, 0.725) // green
          : d3.hsl(55, 0.7, 0.725) // yellow
    },
    hover: '#A9A9A9',
    dep: '#252929'
  }
}

inherits(P2PGraph, EventEmitter)

function P2PGraph (root) {
  var self = this
  if (!(self instanceof P2PGraph)) return new P2PGraph(root)

  EventEmitter.call(self)

  if (typeof root === 'string') root = document.querySelector(root)
  self._root = root

  self._model = {
    nodes: [],
    links: [],
    focused: null
  }

  self._model.links.forEach(function (link) {
    var source = self._model.nodes[link.source]
    var target = self._model.nodes[link.target]

    source.children = source.children || []
    source.children.push(link.target)

    target.parents = target.parents || []
    target.parents.push(link.source)
  })

  self._svg = d3.select(self._root).append('svg')

  self._resize()

  self._force = d3.layout.force()
    .size([self._width, self._height])
    .nodes(self._model.nodes)
    .links(self._model.links)
    .on('tick', function () {
      self._link
        .attr('x1', function (d) {
          return d.source.x
        })
        .attr('y1', function (d) {
          return d.source.y
        })
        .attr('x2', function (d) {
          return d.target.x
        })
        .attr('y2', function (d) {
          return d.target.y
        })

      self._node
        .attr('cx', function (d) {
          return d.x
        })
        .attr('cy', function (d) {
          return d.y
        })

      self._node.attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')'
      })
    })

  self._node = self._svg.selectAll('.node')
  self._link = self._svg.selectAll('.link')

  self._update()

  self._resizeThrottled = throttle(function () {
    self._resize()
  }, 500)
  window.addEventListener('resize', self._resizeThrottled)
}

P2PGraph.prototype.list = function () {
  var self = this
  debug('list')
  return self._model.nodes
}

P2PGraph.prototype.add = function (node) {
  var self = this
  debug('add %s %o', node.id, node)
  if (self._getNode(node.id)) throw new Error('add: cannot add duplicate node')
  self._model.nodes.push(node)
  self._update()
}

P2PGraph.prototype.remove = function (id) {
  var self = this
  debug('remove %s', id)
  var index = self._getNodeIndex(id)
  if (index === -1) throw new Error('remove: node does not exist')

  if (self._model.focused && self._model.focused.id === id) {
    self._model.focused = null
    self.emit('select', false)
  }

  self._model.nodes.splice(index, 1)
  self._update()
}

P2PGraph.prototype.connect = function (sourceId, targetId) {
  var self = this
  debug('connect %s %s', sourceId, targetId)

  var sourceNode = self._getNode(sourceId)
  if (!sourceNode) throw new Error('connect: invalid source id')
  var targetNode = self._getNode(targetId)
  if (!targetNode) throw new Error('connect: invalid target id')

  if (self.getLink(sourceNode.index, targetNode.index)) {
    throw new Error('connect: cannot make duplicate connection')
  }

  self._model.links.push({
    source: sourceNode.index,
    target: targetNode.index
  })
  self._update()
}

P2PGraph.prototype.disconnect = function (sourceId, targetId) {
  var self = this
  debug('disconnect %s %s', sourceId, targetId)

  var sourceNode = self._getNode(sourceId)
  if (!sourceNode) throw new Error('disconnect: invalid source id')
  var targetNode = self._getNode(targetId)
  if (!targetNode) throw new Error('disconnect: invalid target id')

  var index = self.getLinkIndex(sourceNode.index, targetNode.index)
  if (index === -1) throw new Error('disconnect: connection does not exist')

  self._model.links.splice(index, 1)
  self._update()
}

P2PGraph.prototype.hasPeer = function () {
  var self = this
  var args = Array.prototype.slice.call(arguments, 0)
  debug('Checking for peers:', args)
  return args.every(function (nodeId) {
    return self._getNode(nodeId)
  })
}

P2PGraph.prototype.hasLink = function (sourceId, targetId) {
  var self = this
  var sourceNode = self._getNode(sourceId)
  if (!sourceNode) throw new Error('hasLink: invalid source id')
  var targetNode = self._getNode(targetId)
  if (!targetNode) throw new Error('hasLink: invalid target id')
  return !!self.getLink(sourceNode.index, targetNode.index)
}

P2PGraph.prototype.areConnected = function (sourceId, targetId) {
  var self = this
  var sourceNode = self._getNode(sourceId)
  if (!sourceNode) throw new Error('areConnected: invalid source id')
  var targetNode = self._getNode(targetId)
  if (!targetNode) throw new Error('areConnected: invalid target id')
  return self.getLink(sourceNode.index, targetNode.index) ||
    self.getLink(targetNode.index, sourceNode.index)
}

P2PGraph.prototype.unchoke = function (sourceId, targetId) {
  debug('unchoke %s %s', sourceId, targetId)
  // TODO: resume opacity
}

P2PGraph.prototype.choke = function (sourceId, targetId) {
  debug('choke %s %s', sourceId, targetId)
  // TODO: lower opacity
}

P2PGraph.prototype.seed = function (id, isSeeding) {
  var self = this
  debug(id, 'isSeeding:', isSeeding)
  if (typeof isSeeding !== 'boolean') throw new Error('seed: 2nd param must be a boolean')
  var index = self._getNodeIndex(id)
  if (index === -1) throw new Error('seed: node does not exist')
  self._model.nodes[index].seeder = isSeeding
  self._update()
}

P2PGraph.prototype.rate = function (sourceId, targetId, bytesRate) {
  var self = this
  debug('rate update:', sourceId + '<->' + targetId, 'at', bytesRate)
  if (typeof bytesRate !== 'number' || bytesRate < 0) throw new Error('rate: 3th param must be a positive number')
  var sourceNode = self._getNode(sourceId)
  if (!sourceNode) throw new Error('rate: invalid source id')
  var targetNode = self._getNode(targetId)
  if (!targetNode) throw new Error('rate: invalid target id')
  var index = self.getLinkIndex(sourceNode.index, targetNode.index)
  if (index === -1) throw new Error('rate: connection does not exist')
  self._model.links[index].rate = speedRange(bytesRate)
  debug('rate:', self._model.links[index].rate)
  self._update()

  function speedRange (bytes) {
    return Math.min(bytes, STYLE.links.maxBytes) *
      STYLE.links.maxWidth / STYLE.links.maxBytes
  }
}

P2PGraph.prototype.getLink = function (source, target) {
  var self = this
  for (var i = 0, len = self._model.links.length; i < len; i += 1) {
    var link = self._model.links[i]
    if (link.source === self._model.nodes[source] &&
        link.target === self._model.nodes[target]) {
      return link
    }
  }
  return null
}

P2PGraph.prototype.destroy = function () {
  var self = this
  debug('destroy')

  self._root.remove()
  window.removeEventListener('resize', self._resizeThrottled)

  self._root = null
  self._resizeThrottled = null
}

P2PGraph.prototype._update = function () {
  var self = this

  self._link = self._link.data(self._model.links)
  self._node = self._node.data(self._model.nodes, function (d) {
    return d.id
  })

  self._link.enter()
    .insert('line', '.node')
    .attr('class', 'link')
    .style('stroke', COLORS.links.color)
    .style('opacity', 0.5)

  self._link
    .exit()
    .remove()

  self._link.style('stroke-width', function (d) {
    // setting thickness
    return d.rate
      ? d.rate < STYLE.links.width ? STYLE.links.width : d.rate
      : STYLE.links.width
  })

  var g = self._node.enter()
    .append('g')
    .attr('class', 'node')

  g.call(self._force.drag)

  g.append('circle')
    .on('mouseover', function (d) {
      d3.select(this)
        .style('fill', COLORS.nodes.hover)

      d3.selectAll(self._childNodes(d))
        .style('fill', COLORS.nodes.hover)
        .style('stroke', COLORS.nodes.method)
        .style('stroke-width', 2)

      d3.selectAll(self._parentNodes(d))
        .style('fill', COLORS.nodes.dep)
        .style('stroke', COLORS.nodes.method)
        .style('stroke-width', 2)
    })
    .on('mouseout', function (d) {
      d3.select(this)
        .style('fill', COLORS.nodes.method)

      d3.selectAll(self._childNodes(d))
        .style('fill', COLORS.nodes.method)
        .style('stroke', null)

      d3.selectAll(self._parentNodes(d))
        .style('fill', COLORS.nodes.method)
        .style('stroke', null)
    })
    .on('click', function (d) {
      if (self._model.focused === d) {
        self._force
          .charge(-200 * self._scale())
          .linkDistance(100 * self._scale())
          .linkStrength(1)
          .start()

        self._node.style('opacity', 1)
        self._link.style('opacity', 0.3)

        self._model.focused = null
        self.emit('select', false)
        return
      }

      self._model.focused = d
      self.emit('select', d.id)

      self._node.style('opacity', function (o) {
        o.active = self._connected(d, o)
        return o.active ? 1 : 0.2
      })

      self._force.charge(function (o) {
        return (o.active ? -100 : -5) * self._scale()
      }).linkDistance(function (l) {
        return (l.source.active && l.target.active ? 100 : 60) * self._scale()
      }).linkStrength(function (l) {
        return (l.source === d || l.target === d ? 1 : 0) * self._scale()
      }).start()

      self._link.style('opacity', function (l, i) {
        return l.source.active && l.target.active ? 1 : 0.02
      })
    })

  self._node
    .select('circle')
    .attr('r', function (d) {
      return self._scale() * (d.me ? 15 : 10)
    })
    .style('fill', COLORS.nodes.method)

  g.append('text')
    .attr('class', 'text')
    .text(function (d) {
      return d.name
    })

  self._node
    .select('text')
    .attr('font-size', function (d) {
      return d.me ? 16 * self._scale() : 12 * self._scale()
    })
    .attr('dx', 0)
    .attr('dy', function (d) {
      return d.me ? -22 * self._scale() : -15 * self._scale()
    })

  self._node
    .exit()
    .remove()

  self._force
    .linkDistance(100 * self._scale())
    .charge(-200 * self._scale())
    .start()
}

P2PGraph.prototype._childNodes = function (d) {
  var self = this
  if (!d.children) return []

  return d.children
    .map(function (child) {
      return self._node[0][child]
    }).filter(function (child) {
      return child
    })
}

P2PGraph.prototype._parentNodes = function (d) {
  var self = this
  if (!d.parents) return []

  return d.parents
    .map(function (parent) {
      return self._node[0][parent]
    }).filter(function (parent) {
      return parent
    })
}

P2PGraph.prototype._connected = function (d, o) {
  return o.id === d.id ||
    (d.children && d.children.indexOf(o.id) !== -1) ||
    (o.children && o.children.indexOf(d.id) !== -1) ||
    (o.parents && o.parents.indexOf(d.id) !== -1) ||
    (d.parents && d.parents.indexOf(o.id) !== -1)
}

P2PGraph.prototype._getNode = function (id) {
  var self = this
  for (var i = 0, len = self._model.nodes.length; i < len; i += 1) {
    var node = self._model.nodes[i]
    if (node.id === id) return node
  }
  return null
}

P2PGraph.prototype._scale = function () {
  var self = this
  var len = self._model.nodes.length
  return len < 10
    ? 1
    : Math.max(0.2, 1 - ((len - 10) / 100))
}

P2PGraph.prototype._resize = function (e) {
  var self = this
  self._width = self._root.offsetWidth
  self._height = window.innerWidth >= 900 ? 400 : 250

  self._svg
    .attr('width', self._width)
    .attr('height', self._height)

  if (self._force) {
    self._force
      .size([self._width, self._height])
      .resume()
  }
}

P2PGraph.prototype._getNodeIndex = function (id) {
  var self = this
  for (var i = 0, len = self._model.nodes.length; i < len; i += 1) {
    var node = self._model.nodes[i]
    if (node.id === id) return i
  }
  return -1
}

P2PGraph.prototype.getLinkIndex = function (source, target) {
  var self = this
  for (var i = 0, len = self._model.links.length; i < len; i += 1) {
    var link = self._model.links[i]
    if (link.source === self._model.nodes[source] &&
        link.target === self._model.nodes[target]) {
      return i
    }
  }
  return -1
}
