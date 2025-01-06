import Block from './Block.js'
import Transaction from './Transaction.js'
import {getPublicKeyToHex, generateKeyPair} from './utils.js'

export default class Blockchain {
  // inicjalizacja blokiem początkującym
  constructor(difficulty = 1, chain = null) {
    this.difficulty = difficulty
    this.coinbaseamount = 20
    this.maxTransactionsInBlock = 10
    const {publicKey, privateKey} = generateKeyPair()
    this.coinbaseKeyPair = {
      publicKey: publicKey,
      privateKey: privateKey
    }

    const coinbaseTransaction = this.createCoinbaseTransaction('3056301006072a8648ce3d020106052b8104000a03420004b86156c8c9a6771f4f3a61eac4216dc7e359fb8e261005a8afdcc44bb220d017ef130c7f713ad410ac5738d3b54c9de64885ccf7b0e34a744e8d60609d5d987d')
    coinbaseTransaction.sign(this.coinbaseKeyPair)
    if(chain)
      this.chain = chain.map(b => new Block(b.timestamp, b.data, b.prevHash, b.nonce))
    else
      this.chain = [new Block((+new Date('0')).toString(), [coinbaseTransaction])];
    this.transactions = []
  }

  createCoinbaseTransaction(creatorAddress){
    return new Transaction(
      getPublicKeyToHex(this.coinbaseKeyPair.publicKey),
      creatorAddress,
      this.coinbaseamount,
    )
  }

  getBalance(address) {
    let balance = 0

    this.chain.forEach(block => {
      block.data.forEach(transaction => {
        if (transaction.from === address) {
          balance -= transaction.amount
        }

        if (transaction.to === address) {
          balance += transaction.amount
        }
      })
    })

    return balance
  }

  addTransaction(transaction) {
    if (transaction.isValid(transaction, this)) {
      this.transactions.push(transaction)
    }
  }

  mineTransactions(rewardAddress) {
    if (this.transactions.length === 0) {
      console.log('No transactions to mine!')
      return
    }
    const transactionsToMine = this.transactions.slice(0, this.maxTransactionsInBlock)
    const transactionsInBlock = transactionsToMine.length;

    const publicKeysFrom = [...new Set(transactionsToMine.map(t => t.from))]
    const balances = {}
    for(let publicKey of publicKeysFrom){
      balances[publicKey] = this.getBalance(publicKey)
    }
    const validatedTransactions = []
    for(let transaction of transactionsToMine){
      if(balances[transaction.from] >= transaction.amount){
        validatedTransactions.push(transaction)
        balances[transaction.from] -= transaction.amount
      }
    }

    const rewardTransaction = this.createCoinbaseTransaction(rewardAddress)
    rewardTransaction.sign(this.coinbaseKeyPair)

    const block = new Block(Date.now().toString(), [
      rewardTransaction,
      ...validatedTransactions,
    ])

    this.addBlock(block)

    this.transactions.splice(0, transactionsInBlock)
    return block
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1]
  }

  addBlock(block) {
    this.connectToLastBlock(block)
    block.mine(this.difficulty)

    // uniemożliwienie modyfikacji po dodaniu bloku
    this.chain.push(Object.freeze(block))
  }

  connectToLastBlock(block) {
    block.prevHash = this.getLastBlock().hash
    block.hash = block.getHash()
  }

  syncBlockchain(block) {
    //this.connectToLastBlock(block)
    if(this.isValid()){
      this.chain.push(Object.freeze(block))
    }
  }

  // Weryfikacja czy hashe się zgadzają dla wszystkich bloków
  isValid(blockchain = this) {
    const [INITIAL_BLOCK, ...chain] = blockchain.chain

    for (const currentIndex in chain) {
      const isFirst = Number(currentIndex) === 0
      const prevBlock = isFirst ? INITIAL_BLOCK : chain[currentIndex - 1]
      const currentBlock = chain[currentIndex]
      if(isFirst) continue
      if (
        currentBlock.hash !== currentBlock.getHash() ||
        prevBlock.hash !== currentBlock.prevHash ||
        !currentBlock.hash.startsWith(new Array(blockchain.difficulty + 1).fill(0).join(''))
      ) {
        console.error('❌ validation not passed!')
        return false
      }
    }

    console.log('✅ validation passed!')
    return true
  }

  toString() {
    return JSON.stringify(this, null, 2)
  }
}
