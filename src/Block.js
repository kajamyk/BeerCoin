import {createHash} from 'crypto'

// Secure Hash Algorithm 256-bit
const SHA256 = message => createHash('sha256').update(message).digest('hex')

export default class Block {
  constructor(timestamp = '', data = [], prevHash = '', nonce = 0) {
    this.timestamp = timestamp
    this.data = data
    this.hash = this.getHash()
    this.prevHash = prevHash
    // licznik prób do proof of work; zmienność hasha
    this.nonce = nonce
  }

  getHash() {
    return SHA256(
      JSON.stringify(this.data) + this.nonce + this.prevHash + this.timestamp,
    )
  }

  // Bitcoin style mining - proof of work
  // kopanie do momentu znalezienia hasha zaczynającego się od danej ilości 0
  mine(difficulty) {
    console.log('⛏️mining...')
    while (!this.hash.startsWith(new Array(difficulty + 1).fill(0).join(''))) {
      this.nonce++
      this.hash = this.getHash()
    }
    console.log('✅mining completed')
  }

  toString() {
    return JSON.stringify(this, null, 2)
  }
}
