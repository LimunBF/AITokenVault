/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // jangan bocorin "X-Powered-By: Next.js"

  // Security headers — dipasang di semua response.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Cegah clickjacking: halaman gak bisa di-iframe situs lain.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Cegah MIME sniffing.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Jangan kirim URL lengkap ke situs luar.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Matikan fitur browser yang gak dipakai.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Paksa HTTPS (aktif otomatis begitu situs pakai SSL).
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // CSP: hanya izinkan script/style dari origin sendiri.
          // 'unsafe-inline' di style dibutuhkan Next.js + Framer Motion.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
