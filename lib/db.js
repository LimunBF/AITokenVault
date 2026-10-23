// lib/db.js — koneksi MySQL/MariaDB (cPanel).
// Singleton pool: jangan bikin pool baru tiap request (bocor koneksi).
import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (pool) return pool;

  // DB_PASSWORD boleh kosong (MySQL lokal XAMPP), jadi cuma 3 yang wajib.
  const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Env DB belum diset: ${missing.join(', ')}`);
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    timezone: 'Z',
  });

  return pool;
}

// Helper: query yang selalu balikin array of rows.
export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

// Helper: query yang balikin satu row atau null.
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

// Helper: INSERT/UPDATE/DELETE, balikin { affectedRows, insertId }.
export async function run(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}
