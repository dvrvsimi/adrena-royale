import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Adrena Royale',
  description: 'Battle-royale style trading competition on Adrena Protocol',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="border-t border-gray-800 py-6">
              <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
                Adrena Royale &copy; 2024. Built on{' '}
                <a
                  href="https://adrena.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline"
                >
                  Adrena Protocol
                </a>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
