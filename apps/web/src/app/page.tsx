import { TournamentList } from '@/components/TournamentList';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative text-center space-y-6 py-16 px-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary-900/50 border border-primary-700/50 rounded-full px-4 py-1.5 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-primary-300">Season 1 Now Live</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-7xl font-black text-gradient tracking-tight">
            ADRENA ROYALE
          </h1>

          {/* Tagline */}
          <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto font-light">
            256 traders enter. Only the <span className="text-primary-400 font-semibold">strongest</span> survive.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 pt-4">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white">5</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">Rounds</div>
            </div>
            <div className="w-px bg-gray-700 hidden sm:block" />
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-orange-400">25%</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">Eliminated/Round</div>
            </div>
            <div className="w-px bg-gray-700 hidden sm:block" />
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-green-400">$$$</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">Prize Pool</div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4 pt-6">
            <Link
              href="/admin"
              className="px-8 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-all glow hover:scale-105"
            >
              Create Tournament
            </Link>
            <a
              href="https://app.adrena.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg border border-gray-700 transition-all hover:scale-105"
            >
              Trade on Adrena
            </a>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 pt-8">
            <div className="flex items-center gap-2 bg-green-900/30 border border-green-800/50 rounded-full px-4 py-2 text-sm text-green-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Real-time Scoring
            </div>
            <div className="flex items-center gap-2 bg-primary-900/30 border border-primary-800/50 rounded-full px-4 py-2 text-sm text-primary-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Shield Protection
            </div>
            <div className="flex items-center gap-2 bg-orange-900/30 border border-orange-800/50 rounded-full px-4 py-2 text-sm text-orange-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              Elimination Rounds
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid sm:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-xl font-bold">1</div>
            <h3 className="font-semibold mb-1">Enter</h3>
            <p className="text-sm text-gray-500">Join with SOL stake or Mutagen tokens</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-xl font-bold">2</div>
            <h3 className="font-semibold mb-1">Trade</h3>
            <p className="text-sm text-gray-500">Compete on Adrena perps platform</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-xl font-bold">3</div>
            <h3 className="font-semibold mb-1">Survive</h3>
            <p className="text-sm text-gray-500">Bottom 25% eliminated each round</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-3 text-xl font-bold">4</div>
            <h3 className="font-semibold mb-1">Win</h3>
            <p className="text-sm text-gray-500">Last traders standing take the prize</p>
          </div>
        </div>
      </div>

      {/* Tournament list with filters */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Active Tournaments</h2>
        <TournamentList showFilters={true} />
      </section>
    </div>
  );
}
