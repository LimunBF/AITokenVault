// Enkripsi/deskripsi token API pakai AES-256-GCM.
// Key: 32-byte hex (64 karakter) dari TOKEN_ENCRYPTION_KEY. IV 12-byte unik per token.
// Server-only (dipanggil dari API route) — key tidak boleh bocor ke client.

function getKeyBytes() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('TOKEN_ENCRYPTION_KEY harus 32-byte hex (64 karakter)');
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function toB64(buf) {
  return Buffer.from(buf).toString('base64');
}

function fromB64(b64) {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function importKey(usage) {
  return crypto.subtle.importKey('raw', getKeyBytes(), { name: 'AES-GCM' }, false, [usage]);
}

// Returns { token_encrypted, token_iv } base64, siap insert ke kolom DB.
export async function encryptToken(plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey('encrypt');
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return { token_encrypted: toB64(ciphertext), token_iv: toB64(iv) };
}

export async function decryptToken(tokenEncryptedB64, tokenIvB64) {
  const key = await importKey('decrypt');
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(tokenIvB64) },
    key,
    fromB64(tokenEncryptedB64)
  );
  return new TextDecoder().decode(plaintext);
}
