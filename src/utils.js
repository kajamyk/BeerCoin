import {createCipheriv, createDecipheriv, generateKeyPairSync, randomBytes, scryptSync} from 'crypto'
import fs from 'fs'

export function generateKeyPair() {
  return generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: {
      // Subject Public Key Info - standard dla kluczy publicznych
      type: 'spki',
      // format binarny
      format: 'der',
    },
    privateKeyEncoding: {
      // standard przechowywania kluczy prywatnych
      type: 'pkcs8',
      // base64
      format: 'pem',
    },
  })
}

export function encryptAndSave(data, password, filePath) {
  // TODO fix salt
  const key = scryptSync(password, 'salt', 24) // Derive key from password
  // TODO za mało bitów? ale jest 16 bajtów - chyba ok?
  const iv = randomBytes(16) // Initialization vector
  const cipher = createCipheriv('aes-192-gcm', key, iv)
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const fileData = {iv: iv.toString('hex'), content: encrypted}
  fs.appendFileSync(filePath, JSON.stringify(fileData) + '\n')
}

export function readAndDecrypt(filePath, password) {
  const key = scryptSync(password, 'salt', 24)
  let decryptedKeys = []

  fs.readFileSync(filePath, 'utf8').split('\n').forEach(line => {
    if (line.trim() === '') {
      return
    }

    const parsedLine = JSON.parse(line)
    // Advanced Encryption Standard - symetryczny szyfr blokowy
    // GCM - The Galois/Counter Mode - bezpieczny od CBC - ten szyfruje każdy blok z poprzednim i nie może być zrównoleglony
    // Bloki szyfrowane niezależnie
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(parsedLine.iv, 'hex'),
    )

    let decrypted = decipher.update(parsedLine.content, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    const decryptedObject = JSON.parse(decrypted)

    decryptedKeys.push({
      publicKey: decryptedObject.publicKey,
      privateKey: decryptedObject.privateKey,
    })
  })

  return decryptedKeys
}
