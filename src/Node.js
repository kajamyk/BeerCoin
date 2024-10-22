import WebSocket, {WebSocketServer} from 'ws'

const P2P_PORT = process.env.P2P_PORT || '3000'

export default class Node {
  #validationMessages

  constructor(wallet) {
    this.port = P2P_PORT
    this.wallet = wallet
    this.knownNodes = []
    this.#validationMessages = {}
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
        const port = data.port
        await this.connectToNode(port)

        return
      }
      throw new Error('Unhandled message')
    })
  }

  connectToNode(port) {
    const socket = new WebSocket(`ws://localhost:${port}`)
    socket.on('open', () => {
      console.log(`You connected to node ${port}`)
      this.knownNodes.forEach(({socket: knownSocket, ...rest}) => {
        socket.send(JSON.stringify({payload: rest, type: 'connect'}))
      })
      socket.send(
        JSON.stringify({
          payload: {
            port: this.port,
          },
          type: 'connect',
        }),
      )
    })

    if (this.knownNodes.some(node => node.port === port)) return
    if (!port || !socket) {
      return
    }
    this.knownNodes.push({port, socket})
  }
}
