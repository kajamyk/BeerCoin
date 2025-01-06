import WebSocket, {WebSocketServer} from 'ws'
import Blockchain from './Blockchain.js'
import Block from './Block.js'
import Transaction from './Transaction.js'

const P2P_PORT = process.env.P2P_PORT || '3001'
let alternativeBlockchains = []
let blockchain = new Blockchain()

export default class Node {
  port = P2P_PORT
  wallet
  knownNodes = []
  maxChainLengthDifference = 2

  constructor(wallet) {
    this.port = P2P_PORT
    this.wallet = wallet
    this.knownNodes = []
    this.maxChainLengthDifference = 2
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
          this.connectToNode({
            port,
            shouldConnectToBlockchain: true,
          })
        } catch (e) {
          console.log(`Failed to connect to node ${port}`)
        }
        return
      } else if (parsedMessage.type === 'sendBlockchain') {
        const {payload: data} = parsedMessage

        const receivedBlockchain = new Blockchain(
          data.blockchain.difficulty,
          data.blockchain.chain,
        )

        if(receivedBlockchain.isValid()){
          const currentBlockchainLength = blockchain.chain.length
          const receivedBlockchainLenth = receivedBlockchain.chain.length
          const lengthDifference = currentBlockchainLength - receivedBlockchainLenth
          
          if(lengthDifference <= this.maxChainLengthDifference && lengthDifference >= -this.maxChainLengthDifference){
            if(lengthDifference >= 0){
              alternativeBlockchains.push(receivedBlockchain)
            }
            else{
              alternativeBlockchains.push(blockchain)
              blockchain = receivedBlockchain
            }
          }
          else if(lengthDifference > this.maxChainLengthDifference){
            //odrzuć otrzymany blockchain
          }
          else {
            blockchain = receivedBlockchain
          }
        }

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

        const blockchains = [blockchain, ...alternativeBlockchains]
        for(let b of blockchains){
          if(b.getLastBlock().getHash() === block.prevHash){
            b.syncBlockchain(
              new Block(block.timestamp, block.data, block.prevHash, block.nonce),
            )
            break
          }
        }

        if(alternativeBlockchains.length > 0){
          const currentBlockchainLength = blockchain.chain.length
          const longestAlternativeBlockchain = alternativeBlockchains.reduce((prev, current) => {return (prev && prev.chain.length > current.chain.length) ? prev : current})
          if(longestAlternativeBlockchain.chain.length - currentBlockchainLength > this.maxChainLengthDifference){
            alternativeBlockchains.push(blockchain)
            blockchain = longestAlternativeBlockchain

            const minBlockchainLength = blockchain.chain.length - this.maxChainLengthDifference
            alternativeBlockchains = alternativeBlockchains.filter(b => b.chain.length >= minBlockchainLength)
          }
        }
        

        console.log('Added block to blockchain, blockchain is synchronized ⛓️')
        return
      } else if (parsedMessage.type === 'addTransaction') {
        const {
          payload: {port, transaction},
        } = parsedMessage
        if (
          !this.knownNodes.some(
            node => node.port === port,
          )
        ) {
          return
        }

        blockchain.addTransaction(
          new Transaction(transaction.from, transaction.to, transaction.amount, transaction.signature),
        )
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
                blockchain: blockchain,
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

  sendTransactionToPeers(transaction) {

    this.knownNodes.forEach(({socket}) => {
      try {
        socket.send(
          JSON.stringify({
            type: 'addTransaction',
            payload: {
              port: this.port,
              transaction,
            },
          }),
        )
      } catch (e) {
        console.log(`Failed to connect to node ${this.port}`)
      }
    })
  }

  getAlternativeBlockchains(){
    return alternativeBlockchains
  }

  getBlockchain(){
    return blockchain
  }

  sendBlockchainToPeers(){
    this.knownNodes.forEach(({socket}) => {
      try {
        socket.send(
          JSON.stringify({
            payload: {
              port: this.port,
              blockchain: blockchain,
            },
            type: 'sendBlockchain',
          }),
        )
      } catch (e) {
        console.log(`Failed to connect to node ${port}`)
      }
    })
  }
  
}
