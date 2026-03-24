import { TournamentList } from '@/components/TournamentList';
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      {/* Hero section - Full viewport */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden -mt-8 -mx-4 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative text-center space-y-8 max-w-4xl mx-auto">
          {/* Title */}
          <h1 className="text-6xl sm:text-8xl font-black text-gradient tracking-tight">
            ADRENA ROYALE
          </h1>

          {/* Tagline */}
          <p className="text-2xl sm:text-3xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
            Last trader standing <span className="text-primary-400 font-semibold">wins it all</span>.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-12 pt-8">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white">5</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">Rounds</div>
            </div>
            <div className="w-px bg-gray-700 hidden sm:block" />
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-orange-400">25%</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">Eliminated/Round</div>
            </div>
            <div className="w-px bg-gray-700 hidden sm:block" />
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-green-400">$$$</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">Prize Pool</div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4 pt-8">
            <Link
              href="/admin"
              className="px-10 py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-all glow hover:scale-105 text-lg"
            >
              Create Tournament
            </Link>
            <a
              href="https://app.adrena.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl border border-gray-700 transition-all hover:scale-105 text-lg"
            >
              Trade on Adrena
            </a>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-4 pt-8">
            <div className="flex items-center gap-2 bg-green-900/30 border border-green-800/50 rounded-full px-5 py-2.5 text-sm text-green-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Real-time Scoring
            </div>
            <div className="flex items-center gap-2 bg-primary-900/30 border border-primary-800/50 rounded-full px-5 py-2.5 text-sm text-primary-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Shield Protection
            </div>
            <div className="flex items-center gap-2 bg-orange-900/30 border border-orange-800/50 rounded-full px-5 py-2.5 text-sm text-orange-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              Elimination Rounds
            </div>
          </div>
        </div>

        {/* Scroll indicator - positioned at bottom of section */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* How it works - Full viewport */}
      <section className="min-h-screen flex flex-col items-center justify-center py-24 -mx-4 px-4">
        <div className="max-w-5xl mx-auto w-full">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-16">How It Works</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-lg shadow-primary-600/30">
                1
              </div>
              <h3 className="text-xl font-semibold">Enter</h3>
              <p className="text-gray-400 leading-relaxed">
                Join with SOL stake or Mutagen tokens
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-lg shadow-primary-600/30">
                2
              </div>
              <h3 className="text-xl font-semibold">Trade</h3>
              <p className="text-gray-400 leading-relaxed">
                Compete on Adrena perps platform
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-lg shadow-orange-600/30">
                3
              </div>
              <h3 className="text-xl font-semibold">Survive</h3>
              <p className="text-gray-400 leading-relaxed">
                Bottom 25% eliminated each round
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-yellow-500 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-lg shadow-yellow-500/30">
                4
              </div>
              <h3 className="text-xl font-semibold">Win</h3>
              <p className="text-gray-400 leading-relaxed">
                Last traders standing take the prize
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tournament list */}
      <section className="py-24 -mx-4 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">Active Tournaments</h2>
          <TournamentList showFilters={true} />
        </div>
      </section>
    </div>
  );
}
