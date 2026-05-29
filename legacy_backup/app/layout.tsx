import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ViePOS',
  description: 'Lean POS for Vietnamese food and beverage businesses',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
