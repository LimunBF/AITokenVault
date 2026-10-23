# Setup Lokal — AI Token Vault

Pakai **Laragon (MySQL 8.4)**. Jangan pakai XAMPP — dua-duanya rebutan port 3306.

## 1. Start Laragon

Buka Laragon → **Start All** (atau minimal **MySQL**).

Cek jalan:
```bash
D:/laragon/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe -u root -e "SELECT VERSION();"
```

Kalau error `Can't connect`, MySQL Laragon belum nyala — atau ada MySQL lain nyangkut di port 3306:
```bash
netstat -ano | grep ":3306" | grep LISTENING
```

## 2. Bikin database (sekali saja)

```bash
MYSQL="D:/laragon/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe"

"$MYSQL" -u root -e "CREATE DATABASE IF NOT EXISTS limunweb_cpuser_aitokenvault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

"$MYSQL" -u root limunweb_cpuser_aitokenvault < db/schema.sql

"$MYSQL" -u root limunweb_cpuser_aitokenvault -e "SHOW TABLES;"
```

Harus muncul 4 tabel: `atv_users`, `atv_sessions`, `atv_providers`, `atv_tokens`.

## 3. .env.local

```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=limunweb_cpuser_aitokenvault
TOKEN_ENCRYPTION_KEY=<64 hex>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Jalanin

```bash
npm install
npm run dev
```

Buka `http://localhost:3000/register`, daftar, lalu promote admin:

```bash
MYSQL="D:/laragon/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe"
"$MYSQL" -u root limunweb_cpuser_aitokenvault -e \
  "UPDATE atv_users SET role='admin', status='active', approved_at=NOW() WHERE email='email@lo.com';"
```

## 5. Uji

```bash
set -a; source .env.local; set +a
node scripts/check-e2e.mjs
```

Harus **28/28 PASS**.

## Buka database pakai GUI

**phpMyAdmin Laragon**: klik kanan ikon Laragon → *Database* → atau buka `http://localhost/phpmyadmin`.

**Alternatif**: HeidiSQL / MySQL Workbench → host `localhost`, port `3306`, user `root`, password kosong.

## Pindah ke cPanel nanti

1. phpMyAdmin cPanel → import `db/schema.sql` ke DB `limunweb_cpuser_aitokenvault`
2. Ganti 5 env var di Setup Node.js App (`DB_USER=limunweb_cpuser`, `DB_PASSWORD=<password DB cPanel>`)
3. Restart

Tidak ada kode yang perlu diubah.
