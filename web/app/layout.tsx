import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'monitor-integrations',
  description: 'Detect drift between integration nodes and your live OpenAPI spec.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
