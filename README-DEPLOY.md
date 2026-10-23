# AI Token Vault — Deploy ke cPanel (Node.js App + MariaDB)

## 1. Bikin database

cPanel → **MySQL® Databases**:
1. *Create New Database* → `aitokenvault` (jadi `cpuser_aitokenvault`)
2. *Add New User* → username + password kuat (**catat password-nya**)
3. *Add User to Database* → pilih user + DB → centang **ALL PRIVILEGES**

Import schema:
1. cPanel → **phpMyAdmin** → pilih database lo
2. Tab **SQL** → paste isi `db/schema.sql` → **Go**
3. Cek: 4 tabel muncul (`atv_users`, `atv_sessions`, `atv_providers`, `atv_tokens`)

## 2. Setup Node.js App

cPanel → **Setup Node.js App** → *Create Application*:

| Field | Isi |
|---|---|
| Node.js version | 18.x atau lebih baru (minimal 18.17) |
| Application mode | Production |
| Application root | `aitokenvault` (folder di home) |
| Application URL | domain lo |
| Application startup file | `server.js` |

Bikin `server.js` di root aplikasi (bukan `npm start`, karena Passenger butuh file entry):

```js
const { createServer } = require('http');
const next = require('next');

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(process.env.PORT || 3000);
});
```

## 3. Environment variables

Masih di Setup Node.js App → bagian **Environment Variables** → tambah satu per satu:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=cpuser_atv
DB_PASSWORD=<password DB yang lo catat tadi>
DB_NAME=cpuser_aitokenvault
TOKEN_ENCRYPTION_KEY=<hasil generate di bawah>
NODE_ENV=production
```

Generate key (jalankan di terminal lokal):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Simpan key ini.** Kalau berubah, semua token lama gak bisa didekripsi.

## 4. Upload & install

1. Upload zip project ke folder `aitokenvault` lewat **File Manager**
2. Extract
3. Balik ke Setup Node.js App → klik **Run NPM Install**
4. Jalankan build dulu lewat **Terminal** cPanel:
   ```bash
   cd ~/aitokenvault
   source /home/cpuser/nodevenv/aitokenvault/18/bin/activate
   npm install
   npm run build
   ```
5. Balik ke Setup Node.js App → **Restart**

## 5. Bikin admin pertama

1. Buka `https://domain-lo/register` → daftar
2. phpMyAdmin → tab SQL:
   ```sql
   UPDATE atv_users SET role='admin', status='active', approved_at=NOW()
   WHERE email='email@lo.com';
   ```
3. Login → cek menu **Admin** muncul di navbar

## 6. Verifikasi

- `https://domain-lo/api/health` → `{"ok":true,"ms":35}`
- Register user kedua → login → harus muncul "menunggu persetujuan admin"
- Login sebagai admin → `/admin/users` → approve user itu
- Login user itu → masuk dashboard
- Tambah provider + token → refresh halaman → token masih ada, DB berisi ciphertext

## Catatan

- **File `server.js` wajib** — Passenger gak bisa langsung jalanin `next start`.
- Kalau build gagal karena memory, jalankan `NODE_OPTIONS=--max-old-space-size=512 npm run build`.
- `atv_sessions` auto-bersih? Tidak — token expired tetap nyimpen baris. Hapus berkala:
  ```sql
  DELETE FROM atv_sessions WHERE expires_at < NOW();
  ```
- Semua tabel pakai prefix `atv_` biar gak nabrak kalau DB dipakai app lain.
