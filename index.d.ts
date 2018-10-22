declare module "p2p-graph" {

  /***
   * @see https://github.com/feross/p2p-graph#api
   */
  type P2pGraphPeer = {
    id: string // must be unique for this graph
    me: boolean, // reference
    name: string // display name
  }

  type P2pGraphEvent = 'select';

  class P2pGraph {
    constructor(rootElem: HTMLElement);

    add(peer: P2pGraphPeer);
    connect(id1: string, id2: string);
    disconnect(id: string);
    areConnected(id1: string, id2: string);
    getLink(i1: string, id2: string);
    hasPeer(...ids: string[]): boolean;
    hasLink(id1: string, id2: string);
    remove(id: string);
    seed(id: string, isSeeding: boolean);
    rate(id1: string, id2: string, avgRate: number);
    list(): P2pGraphPeer[];
    destroy();

    on(event: P2pGraphEvent, callback: (id: string) => void);
  }

  export = P2pGraph;
}

