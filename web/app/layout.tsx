import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'drift/ci — Catch breaking API drift before your customers do',
  description:
    'Diff what your Make / n8n integration actually calls against your live OpenAPI spec. Exits 1 on breaking drift. Drop it in CI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        {children}
        <Script
          src="https://t.raah.dev/script.js"
          data-pid="proj_oat0m821mw6zj943"
          data-domain="driftci.com"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
