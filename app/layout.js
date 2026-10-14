import './globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/hooks/use-auth';
import { Navbar } from '@/components/Navbar';
import { Toaster } from '@/components/Toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata = {
  title: 'AI Token Vault',
  description: 'Simpan, kelola, dan amankan token AI lo dalam satu tempat.',
};

export const viewport = {
  themeColor: '#8b5cf6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`dark ${inter.variable} ${mono.variable}`}>
      <body className="font-sans bg-zinc-950 text-zinc-100 antialiased min-h-screen">
        {/* Blob warna yang bergerak pelan di belakang konten */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="animate-blob absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="animate-blob absolute -right-24 top-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl [animation-delay:3s]" />
          <div className="animate-blob absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-600/20 blur-3xl [animation-delay:6s]" />
        </div>

        <AuthProvider>
          <Navbar />
          <Toaster />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
