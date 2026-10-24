# AI Token Vault

Vault pribadi buat nyimpen API key & token AI (OpenAI, Anthropic, Midjourney, dll) dengan enkripsi AES-256-GCM di sisi server. Multi-user dengan approval admin, self-hosted di cPanel.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![MySQL](https://img.shields.io/badge/MySQL-8.4%20%7C%20MariaDB%2010.4-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## Fitur

| Fitur | Keterangan |
|---|---|
| Enkripsi token | AES-256-GCM, IV unik per token. Plaintext gak pernah masuk DB |
| Reveal on-demand | Token hanya didekripsi saat user klik "Tampilkan" |
| Multi-user | Registrasi → approval admin → aktif |
| Isolasi data | Setiap query difilter `user_id`; akses lintas user → 404 |
| Soft delete | Token dihapus tetap tersimpan (audit trail) |
| Anti brute-force | Rate limit login 8×/15 menit, register 5×/jam per IP |
| Security headers | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy |
| UI boomer-friendly | Font besar, kontras tinggi, animasi halus |

---

## Stack

- **Next.js 14** (App Router, JavaScript — no TypeScript)
- **MySQL 8.4 / MariaDB 10.4+** via `mysql2@3.11.3` (prepared statements)
- **bcryptjs@2.4.3** — hashing password, cost 12
- **AES-256-GCM** — enkripsi token (`node:crypto`)
- **Framer Motion** — animasi
- **Tailwind CSS** — styling

Tanpa ORM, tanpa layanan eksternal. Semua data di DB lo sendiri.

---

## Mulai Cepat (lokal)

### 1. Prasyarat

- Node.js **≥ 18.17** (cek: `node --version`)
- MySQL 8.4 atau MariaDB 10.4+ (Laragon / XAMPP / Docker)

> Pakai **satu** server saja. XAMPP dan Laragon sama-sama pakai port 3306 — kalau dua-duanya jalan, salah satu gak bisa connect.

### 2. Bikin database

```bash
MYSQL="mysql -u root"   # sesuaikan path & kredensial lo

$MYSQL -e "CREATE DATABASE limunweb_cpuser_aitokenvault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
$MYSQL limunweb_cpuser_aitokenvault < db/schema.sql
$MYSQL limunweb_cpuser_aitokenvault -e "SHOW TABLES;"
```

Harus muncul 4 tabel: `atv_users`, `atv_sessions`, `atv_providers`, `atv_tokens`.

### 3. Environment

```bash
cp .env.example .env.local
```

Isi `.env.local`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=limunweb_cpuser_aitokenvault

# Wajib: 64 karakter hex
TOKEN_ENCRYPTION_KEY=<hasil generate di bawah>

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Penting:** simpan `TOKEN_ENCRYPTION_KEY` di tempat aman (password manager). Kalau hilang, semua token yang udah tersimpan **gak bisa didekripsi selamanya**. Kalau diganti, sama saja.

### 4. Jalanin

```bash
npm install
npm run dev
```

Buka `http://localhost:3000/register`, daftar, lalu aktifkan akun pertama sebagai admin:

```bash
mysql -u root limunweb_cpuser_aitokenvault -e \
  "UPDATE atv_users SET role='admin', status='active', approved_at=NOW() WHERE email='email@lo.com';"
```

Login → dashboard. User berikutnya daftar sendiri dan lo approve dari menu **Admin**.

---

## Struktur Proyek

```
app/
  api/
    auth/{register,login,logout,me}/route.js   # autentikasi
    providers/{route.js,[id]/route.js}         # CRUD provider AI
    tokens/{route.js,[id]/route.js}            # CRUD token (+ reveal)
    admin/users/route.js                       # approve/reject user
    health/route.js                            # ping DB
  dashboard/                                   # halaman utama
  admin/users/                                 # panel admin
  login/, register/, page.js                   # publik
components/                                    # Navbar, ProviderCard, dll
hooks/                                         # use-auth, use-guard
lib/
  db.js            # pool mysql2 (singleton)
  auth.js          # bcrypt + session cookie
  crypto.js        # AES-256-GCM
  security.js      # validasi URL, rate limit, error aman
db/schema.sql      # 4 tabel + index
scripts/
  check-e2e.mjs        # 28 test fungsional
  check-security.mjs   # 29 test keamanan
server.js          # entry point Passenger (cPanel)
```

---

## Model Keamanan

### Autentikasi

- Password di-hash **bcrypt cost 12** — gak pernah disimpan plaintext
- Session: token acak 32 byte (64 hex) di cookie `atv_session`, `HttpOnly` + `SameSite=Lax` + `Secure` (production)
- Session disimpan di DB, bukan JWT — bisa dicabut instan saat logout/reject/delete
- Login **status-driven**: `pending` → 403 dengan pesan jelas, `rejected` → 403, `active` → masuk

### Enkripsi token

```
plaintext → AES-256-GCM(key, IV acak 12 byte) → ciphertext + IV → DB
```

- Key dari env `TOKEN_ENCRYPTION_KEY`, gak pernah dikirim ke client
- `token_encrypted` & `token_iv` gak pernah ada di response list — hanya endpoint reveal yang mendekripsi
- IV unik per token (diverifikasi di test)

### Otorisasi

Setiap query difilter `user_id` dari session, **bukan** dari input client:

```js
// Semua route data
WHERE id = ? AND user_id = ?
```

Akses resource milik user lain → **404** (bukan 403, biar gak bocorin eksistensi resource).

### Tabel ancaman

| Serangan | Pertahanan | Status |
|---|---|---|
| SQL injection | Prepared statement (`pool.execute`) di 100% query | ✅ |
| XSS via URL provider | `safeUrl()` — hanya `http:`/`https:`; `javascript:`/`data:` ditolak | ✅ |
| Brute force login | 8 percobaan / 15 menit per IP+email → 429 | ✅ |
| Spam registrasi | 5 akun / jam per IP → 429 | ✅ |
| Timing attack (enumerasi email) | bcrypt dummy hash dijalankan walau user gak ada — selisih 3ms | ✅ |
| IDOR (akses data user lain) | Filter `user_id` di setiap query; terverifikasi 404 | ✅ |
| Privilege escalation | `requireAdmin()` cek `role` + `status` server-side | ✅ |
| Session forgery | Token 256-bit acak, dicocokkan ke DB | ✅ |
| Mass assignment | Field whitelist; `user_id`/`id` dari client diabaikan | ✅ |
| Prototype pollution | Field eksplisit, gak ada spread `...body` ke query | ✅ |
| Payload raksasa | Batas body 100 KB → 413 | ✅ |
| Kebocoran error internal | `safeError()` — detail ke server log, client dapat pesan generik | ✅ |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` | ✅ |
| Session hijacking | `HttpOnly` + `Secure` (prod) + `SameSite=Lax` | ✅ |
| CSRF | `checkOrigin()` validasi Origin/Referer untuk semua POST/PUT/DELETE/PATCH; `SameSite=Lax` + `Content-Type: application/json` | ✅ |
| Password lemah | Minimal 8 karakter | ✅ |

**Catatan CSRF:** `SameSite=Lax` memblokir cross-site POST, jadi serangan CSRF standar gak jalan. Kalau nanti butuh proteksi berlapis (misal ada form multipart), tambahkan CSRF token per sesi.

### Yang belum ada (kalau perlu)

| Item | Kapan dibutuhkan |
|---|---|
| 2FA / TOTP | Kalau vault dipakai banyak orang |
| Audit log akses token | Kalau butuh kepatuhan (compliance) |
| Rate limit terdistribusi | Kalau app jalan di >1 proses/instance — sekarang in-memory |
| Rotasi key | Butuh skema enkripsi berlapis (key versioning) |
| Email verifikasi | Kalau pendaftaran dibuka publik tanpa approval manual |

---

## Testing

### Test fungsional (28 cek)

```bash
set -a; source .env.local; set +a
DISABLE_RATE_LIMIT=1 node scripts/check-e2e.mjs
```

Cakupan: register → pending → approve → login → CRUD provider & token → enkripsi → isolasi antar user → logout.

### Test keamanan (44 cek)

```bash
set -a; source .env.local; set +a
node scripts/security-audit.mjs
```

Jalankan **tanpa** `DISABLE_RATE_LIMIT` — test ini justru memverifikasi rate limit bekerja. Skrip akan seed user langsung ke DB agar tidak terblokir rate limit register.

Contoh hasil (semua cek lolos):

```
OK   [critical] SQLI-1 injection di provider_id: ' OR '1'='1 :: status 200
OK   [critical] IDOR-1 B baca provider A :: status 404
OK   [critical] MASS-1 user_id di body diabaikan :: aman
OK   [high] RATE-1 rate limit login :: diblokir setelah 8 percobaan
OK   [critical] CRYPTO-1 plaintext tidak tersimpan di DB :: cek DB
OK   [medium] CSRF-1 POST cross-origin ditolak :: 403
=== RINGKASAN ===
Total cek: 44
Temuan: 0
SEMUA AMAN
```

MIT
