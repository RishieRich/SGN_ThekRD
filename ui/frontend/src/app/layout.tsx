import type {Metadata, Viewport} from 'next';
import {Fraunces, Inter, Noto_Sans_Devanagari, Noto_Sans_Gujarati} from 'next/font/google';
import './globals.css';

const inter = Inter({subsets: ['latin'], variable: '--font-ui-en', display: 'swap'});
const fraunces = Fraunces({subsets: ['latin'], variable: '--font-display', display: 'swap'});
const devanagari = Noto_Sans_Devanagari({subsets: ['devanagari'], variable: '--font-ui-devanagari', display: 'swap'});
const gujarati = Noto_Sans_Gujarati({subsets: ['gujarati'], variable: '--font-ui-gujarati', display: 'swap'});

export const metadata: Metadata = {
  title: 'ARQ Thekedar',
  description: 'Hajri se hisaab tak — attendance and accounts for labour contractors.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: 'rgb(43 18 51)'
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body className={`${inter.variable} ${fraunces.variable} ${devanagari.variable} ${gujarati.variable}`}>
        {children}
      </body>
    </html>
  );
}
