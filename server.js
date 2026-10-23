// server.js — entry point Passenger (cPanel Node.js App).
// `next start` gak bisa dipakai langsung di Passenger: butuh file yang listen sendiri.
const { createServer } = require('http');
const next = require('next');

const port = process.env.PORT || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port);
});
