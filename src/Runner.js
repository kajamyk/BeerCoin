import readlineSync from 'readline'
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

  promptForOptions() {
    console.log('\n')
    console.table({
      'Save wallet': {value: 1},
      'Load wallet': {value: 2},
      'Show connected': {value: 3},
      'Connect to node': {value: 4},
      'Show wallet': {value: 5},
      'Add key': {value: 6},
    })
    console.log('\n')
    this.terminal.question('Please input value: ', value => {
      this.#selectedOption = value
      this.handleStart()
    })
  }

  handleStart() {
    switch (this.#selectedOption) {
      case '1':
        if (!this.node) {
          console.log('You need to have a wallet!')
          break
        }
        // To save the wallet:
        this.terminal.question('Enter password: ', password => {
          this.node.wallet.saveToFile(`myWallet${this.node.port}.dat`, password)
        })
        break
      case '2':
        // To save the wallet:
        this.terminal.question('Enter password: ', password => {
          const loadedWallet = Wallet.loadFromFile(`myWallet${this.node.port}.dat`, password)
          if (!loadedWallet) {
            console.log('wrong password')
            return
          }
          this.node = new Node(loadedWallet)
          // this.node.run()
        })
        break
      case '3':
        if (!this.node) {
          console.log('You need to have a wallet to show connected nodes!')
          break
        }
        console.table(this.node.knownNodes.map(({port}) => ({port})))
        break
      case '4':
        if (!this.node) {
          console.log('You need to have a wallet to make a connection!')
          break
        }
        this.terminal.question('Enter port: ', port => {
          this.node.connectToNode(port)
        })

        break
      case '5': {
        if (!this.node) {
          console.log('You need to have a wallet to show it!')
          break
        }
        this.node.wallet.show()
        break
      }
      case '6': {
        this.node.wallet.addKeyPair()
        console.log('Key pair was added')
        break
      }
      default:
        break
    }
  }
}
