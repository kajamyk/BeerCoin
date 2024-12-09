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
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, 32) // 256-bitowy klucz
  const iv = randomBytes(12) //wektor inicjalizacyjny

  const cipher = createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // Pobieranie tagu uwierzytelnienia (GCM) -> weryfikacja autentyczności danych
  const authTag = cipher.getAuthTag()

  const fileData = {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    content: encrypted,
  }
  fs.appendFileSync(filePath, JSON.stringify(fileData) + '\n')
}

export function readAndDecrypt(filePath, password) {
  let decryptedKeys = []

  fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .forEach((line) => {
      if (line.trim() === '') {
        return
      }

      const parsedLine = JSON.parse(line)

      const salt = Buffer.from(parsedLine.salt, 'hex')
      const iv = Buffer.from(parsedLine.iv, 'hex')
      const authTag = Buffer.from(parsedLine.authTag, 'hex')
      const encryptedContent = parsedLine.content

      const key = scryptSync(password, salt, 32)
      // Advanced Encryption Standard - symetryczny szyfr blokowy
      // GCM - The Galois/Counter Mode - bezpieczny od CBC - ten szyfruje każdy blok z poprzednim i nie może być zrównoleglony
      // Bloki szyfrowane niezależnie
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag) // Ustawianie tagu uwierzytelnienia

      try {
        let decrypted = decipher.update(encryptedContent, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        const decryptedObject = JSON.parse(decrypted)

        decryptedKeys.push({
          publicKey: decryptedObject.publicKey,
          privateKey: decryptedObject.privateKey,
        })
      } catch (err) {
        console.error('Decryption failed:', err.message)
      }
    })
  return decryptedKeys
}

export function getPublicKeyToHex(publicKey) {
  return publicKey.toString('hex')
}