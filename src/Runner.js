import readlineSync from 'readline'
import Block from './Block.js'
import Wallet from './Wallet.js'
import Node from './Node.js'

export default class Runner {
  #selectedOption

  constructor() {
    this.#selectedOption = null
    this.terminal = readlineSync.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    this.node = undefined
  }

  run() {
    const wallet = new Wallet()
    this.node = new Node(wallet)
    this.node.run()
    this.promptForOptions()
    this.terminal.on('line', input => {
      this.promptForOptions()
    })
  }

  async promptForOptions() {
    console.log('\n')
    console.table({
      'Connect to node': {value: 1},
      'Show wallet': {value: 2},
      'Add block': {value: 3},
      'Save wallet': {value: 4},
      'Add key pair': {value: 5},
      'Show connected': {value: 6},
    })
    console.log('\n')
    this.terminal.question('Please input value: ', async value => {
      this.#selectedOption = value
      await this.handleStart()
      await this.promptForOptions()
    })
  }

  async handleStart() {
    console.log('You selected: ', this.#selectedOption)
    switch (this.#selectedOption) {
      case '1':
        if (!this.node) {
          console.log('You need to have a wallet to make a connection!')
          break
        }
        this.terminal.question('Enter port: ', port => {
          this.node.connectToNode({port, shouldConnectToBlockchain: true})
        })

        break
      case '2': {
        if (!this.node) {
          console.log('You need to have a wallet to show it!')
          break
        }
        this.node.wallet.show()
        break
      }
      case '3': {
        if (!this.node) {
          console.log('You need to have a wallet to add block!')
          break
        }
        this.terminal.question('From: ', from => {
          this.terminal.question('to: ', to => {
            this.terminal.question('amount: ', amount => {
              const block = new Block(Date.now().toString(), [
                {from, to, amount},
              ])
              this.node.blockchain.addBlock(block)
              this.node.sendBlockToPeers(block)
            })
          })
        })
        break
      }
      case '4': {
        if (!this.node) {
          console.log('You need to have a wallet!')
          break
        }
        // To save the wallet:
        this.terminal.question('Enter password: ', password => {
          this.node.wallet.saveToFile(`myWallet${this.node.port}.dat`, password)
        })
        break
      }
      case '5': {
        this.node.wallet.addKeyPair()
        console.log('Key pair was added')
        break
      }
      case '6': {
        if (!this.node) {
          console.log('You need to have a wallet to show connected nodes!')
          break
        }
        console.table(this.node.knownNodes.map(({port}) => ({port})))
        break
      }
      default:
        break
    }
  }
}
