import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipher, createDecipher, randomBytes } from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

  constructor(private configService: ConfigService) {}

  /**
   * Encrypts a field using AES-GCM with a random nonce
   * Returns base64 encoded: nonce + tag + ciphertext
   */
  async encryptField(plaintext: string): Promise<string> {
    const key = this.getEncryptionKey();
    const iv = randomBytes(this.ivLength);
    
    const cipher = createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('field-encryption', 'utf8'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    // Combine: nonce + tag + ciphertext
    const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'base64')]);
    return combined.toString('base64');
  }

  /**
   * Decrypts a field using AES-GCM
   * Expects base64 encoded: nonce + tag + ciphertext
   */
  async decryptField(encryptedData: string): Promise<string> {
    const key = this.getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract: nonce + tag + ciphertext
    const iv = combined.subarray(0, this.ivLength);
    const tag = combined.subarray(this.ivLength, this.ivLength + this.tagLength);
    const ciphertext = combined.subarray(this.ivLength + this.tagLength);
    
    const decipher = createDecipher(this.algorithm, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('field-encryption', 'utf8'));
    
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Masks sensitive data for logging
   */
  maskSensitiveData(data: string, type: 'account' | 'routing' | 'name' | 'iban'): string {
    switch (type) {
      case 'account':
        return data.length >= 4 ? `****${data.slice(-4)}` : '****';
      case 'routing':
        return data.length >= 4 ? `${data.slice(0, 4)}****${data.slice(-1)}` : '****';
      case 'name':
        if (data.length <= 2) return '**';
        return `${data.slice(0, 1)}${'*'.repeat(data.length - 2)}${data.slice(-1)}`;
      case 'iban':
        return data.length >= 8 ? `${data.slice(0, 4)}****${data.slice(-4)}` : '****';
      default:
        return '****';
    }
  }

  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // For now, use the key directly. In production, this should use KMS
    const keyBuffer = Buffer.from(key, 'base64');
    if (keyBuffer.length !== this.keyLength) {
      throw new Error(`ENCRYPTION_KEY must be ${this.keyLength} bytes (base64 encoded)`);
    }
    
    return keyBuffer;
  }
}
