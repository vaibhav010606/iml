import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'TurboQuant | Two-Stage Vector Compression',
  description: 'Real-time dual-stage vector compression pipeline for dense embeddings.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-[#020817] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
