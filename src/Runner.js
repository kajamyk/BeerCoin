import readlineSync from 'readline'
import Block from './Block.js'
import Wallet from './Wallet.js'
import Node from './Node.js'
import { generateKeyPair } from './utils.js'
import Transaction from './Transaction.js'

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
      'Create transaction': {value: 3},
      'Save wallet': {value: 4},
      'Add key pair': {value: 5},
      'Show connected': {value: 6},
      'Load wallet': {value: 7},
      'Show balance': {value: 8},
      'Mine': {value: 9}
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
          console.log('You need to have a wallet to create transaction!')
          break
        }
        this.terminal.question('From (key index): ', keyIndex => {
          this.terminal.question('To (public key): ', to => {
            this.terminal.question('amount: ', amount => {
              
              const fromPub = this.node.wallet.getPublicKey(keyIndex)
              const fromPriv = this.node.wallet.getPrivateKey(keyIndex)
              const balance = this.node.blockchain.getBalance(fromPub)
              if(balance < Number(amount)){
                console.log(`You cannot send ${amount} coins, you only have ${balance}`)
                return
              }
              const transaction = new Transaction(
                fromPub,
                to,
                Number(amount),
              )
              transaction.sign({
                publicKey: fromPub,
                privateKey: fromPriv,
              })
              this.node.blockchain.addTransaction(transaction)
              this.node.sendTransactionToPeers(transaction)
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
      case '7': {
        // To save the wallet:
        this.terminal.question('Enter password: ', password => {
          const loadedWallet = Wallet.loadFromFile(`myWallet${this.node.port}.dat`, password)
          if (!loadedWallet) {
            console.log('wrong password')
            return
          }
          this.node = new Node(loadedWallet)
        })
        break
      }
      case '8': {
        this.terminal.question('Public key: ', publicKey => {
          const balance = this.node.blockchain.getBalance(publicKey)
          console.log(balance);
        })
        break
      }
      case '9':
        this.terminal.question('Key index:', keyIndex =>{
          const block = this.node.blockchain.mineTransactions(
            this.node.wallet.getPublicKey(keyIndex)
          )
          if(block)
            this.node.sendBlockToPeers(block)
        })
        
        break
      case '10':
        console.log(this.node.blockchain.transactions)
        break
      default:
        break
    }
  }
}
