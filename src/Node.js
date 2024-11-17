import WebSocket, {WebSocketServer} from 'ws'
import Blockchain from './Blockchain.js'
import Block from './Block.js'

const P2P_PORT = process.env.P2P_PORT || '3000'

export default class Node {
  #validationMessages

  constructor(wallet) {
    this.port = P2P_PORT
    this.wallet = wallet
    this.knownNodes = []
    this.#validationMessages = {}
    this.blockchain = new Blockchain()
  }

  run() {
    const server = new WebSocketServer({port: P2P_PORT})
    server.on('connection', socket => this.connectSocket(socket))
  }

  connectSocket(socket) {
    console.log(`Socket connected to you!`)
    this.messageHandler(socket)
  }

  messageHandler(socket) {
    socket.on('message', async message => {
      const parsedMessage = JSON.parse(message)
      if (parsedMessage.type === 'connect') {
        const {payload: data} = parsedMessage
        if (
          this.knownNodes.some(node => node.port === data.port) ||
          data.port === this.port
        ) {
          return
        }
        const {port, withBlockchain} = data

        try {
          await this.connectToNode({
            port,
            shouldConnectToBlockchain: withBlockchain,
          })
        } catch (e) {
          console.log(`Failed to connect to node ${port}`)
        }
        return
      } else if (parsedMessage.type === 'sendBlockchain') {
        const {payload: data} = parsedMessage

        this.blockchain = new Blockchain(
          data.blockchain.difficulty,
          data.blockchain.chain,
        )

        return
      } else if (parsedMessage.type === 'addBlock') {
        const {
          payload: {port, block},
        } = parsedMessage

        if (
          !this.knownNodes.some(
            node => node.port === port,
          )
        ) {
          return
        }

        this.blockchain.syncBlockchain(
          new Block(block.timestamp, block.data, block.prevHash, block.nonce),
        )
        console.log('Added block to blockchain, blockchain is synchronized ⛓️')
        return
      }
      throw new Error('Unhandled message type')
    })
  }

  connectToNode({
    port,
    isInitialConnection = false,
    shouldConnectToBlockchain = false,
  }) {
    const socket = new WebSocket(`ws://localhost:${port}`)
    socket.on('open', () => {
      // tuu
      console.log(`You connected to node ${port}`)
      this.knownNodes.forEach(({socket: knownSocket, ...rest}) => {
        socket.send(JSON.stringify({payload: rest, type: 'connect'}))
      })
      try {
        socket.send(
          JSON.stringify({
            payload: {
              port: this.port,
              withBlockchain: isInitialConnection,
            },
            type: 'connect',
          }),
        )
      } catch (e) {
        console.log(`Failed to connect to node ${port}`)
      }
      if (shouldConnectToBlockchain) {
        try {
          socket.send(
            JSON.stringify({
              payload: {
                port: this.port,
                blockchain: this.blockchain,
              },
              type: 'sendBlockchain',
            }),
          )
        } catch (e) {
          console.log(`Failed to connect to node ${port}`)
        }
      }
    })

    if (this.knownNodes.some(node => node.port === port)) return
    if (!port || !socket) {
      return
    }

    this.knownNodes.push({port, socket})
  }


  sendBlockToPeers(block) {
    this.knownNodes.forEach(({socket}) => {
      try {
        socket.send(
          JSON.stringify({
            type: 'addBlock',
            payload: {
              port: this.port,
              block,
            },
          }),
        )
      } catch (e) {
        console.log(`Failed to connect to node ${this.port}`)
      }
    })
  }
}
