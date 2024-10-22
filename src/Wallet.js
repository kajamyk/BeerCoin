import {encryptAndSave, generateKeyPair, readAndDecrypt} from './utils.js'
import fs from 'fs'

class Wallet {
  #keyPair = []

  constructor(port, arg1, arg2) {
    if (arg1 && arg2) {
      this.#keyPair.push({publicKey: arg1, privateKey: arg2})
      return
    }
    if (arg1) {
      this.#keyPair = arg1
      return
    }

    const {privateKey: generatedPrivateKey, publicKey: generatedPublicKey} =
      generateKeyPair()

    this.#keyPair.push({publicKey: getPublicKeyToHex(generatedPublicKey), privateKey: generatedPrivateKey})

    console.log('Wallet created')
    this.show()
  }

  static loadFromFile(filePath, password) {
    try {
      const data = readAndDecrypt(filePath, password)
      return new Wallet(null, data, null)
    } catch (e) {
      console.log('Error: Invalid password or file path')
    }
  }

  show() {
    const formattedKeys = this.#keyPair.map(pair => ({
      'Public key': pair.publicKey,
      'Private key': pair.privateKey,
    }))

    console.table(formattedKeys)
  }

  saveToFile(filePath, password) {
    fs.writeFileSync(filePath, '')
    this.#keyPair.forEach(pair => {
      const data = {
        publicKey: pair.publicKey,
        privateKey: pair.privateKey,
      }
      encryptAndSave(data, password, filePath)
    })
    console.log('Wallet data saved and encrypted')
  }

  addKeyPair() {
    const {privateKey, publicKey} =
      generateKeyPair()
    this.#keyPair.push({publicKey: getPublicKeyToHex(publicKey), privateKey: privateKey})
  }
}

export default Wallet

const getPublicKeyToHex = publicKey => {
  return publicKey.toString('hex')
}
