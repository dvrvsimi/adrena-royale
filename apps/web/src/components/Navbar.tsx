'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function Navbar() {
  const { publicKey } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-600 rounded-lg flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                AR
              </div>
              <span className="text-xl font-bold text-gradient hidden sm:block">
                Adrena Royale
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Tournaments
              </Link>
              <Link
                href="/admin"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Admin
              </Link>
              {publicKey && (
                <Link
                  href={`/profile/${publicKey.toBase58()}`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  My Profile
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700 !rounded-lg !h-10 !px-4" />

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tournaments
              </Link>
              <Link
                href="/admin"
                className="text-gray-400 hover:text-white transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin
              </Link>
              {publicKey && (
                <Link
                  href={`/profile/${publicKey.toBase58()}`}
                  className="text-gray-400 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Profile
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
