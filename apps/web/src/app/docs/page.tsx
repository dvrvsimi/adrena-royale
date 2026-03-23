'use client';

import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Adrena Royale Documentation</h1>
        <p className="text-xl text-gray-400">
          Battle-royale style trading competitions on Adrena Protocol
        </p>
      </div>

      {/* What is Adrena Royale */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2">
          What is Adrena Royale?
        </h2>
        <p className="text-gray-300">
          Adrena Royale is a competitive trading platform that brings battle-royale mechanics
          to perpetual futures trading on Solana. Traders compete in multi-round tournaments
          where the lowest performers are eliminated each round until a champion emerges.
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-primary-400">Key Features:</h3>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>Real-time scoring based on actual Adrena trading performance</li>
            <li>Risk-adjusted scoring that rewards skill over luck</li>
            <li>Progressive elimination rounds with increasing stakes</li>
            <li>Shield mechanics for strategic survival</li>
            <li>Badges and achievements for milestones</li>
          </ul>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2">
          How It Works
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-primary-400 mb-2">1. Tournament Structure</h3>
            <p className="text-gray-300 mb-2">
              Each tournament consists of multiple rounds. After each round, a percentage of
              the lowest-scoring traders are eliminated.
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 font-mono text-sm">
              <div className="grid grid-cols-3 gap-2 text-gray-400">
                <span>Round 1:</span><span>25% eliminated</span><span className="text-green-400">75% survive</span>
                <span>Round 2:</span><span>25% eliminated</span><span className="text-green-400">~56% survive</span>
                <span>Round 3:</span><span>33% eliminated</span><span className="text-green-400">~37% survive</span>
                <span>Round 4:</span><span>50% eliminated</span><span className="text-green-400">~19% survive</span>
                <span>Finals:</span><span>Winner decided</span><span className="text-yellow-400">Champion!</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-primary-400 mb-2">2. Scoring System</h3>
            <p className="text-gray-300 mb-2">
              Your score is calculated based on your closed trades during each round:
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 font-mono text-sm text-gray-300">
              <p>Score = PnL% × SizeMultiplier × DurationMultiplier × (1 - UtilizationPenalty)</p>
            </div>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-1">
              <li><strong>PnL%:</strong> Your profit/loss as percentage of collateral</li>
              <li><strong>SizeMultiplier:</strong> Larger positions score higher (encourages conviction)</li>
              <li><strong>DurationMultiplier:</strong> Quick flips penalized, longer holds rewarded</li>
              <li><strong>UtilizationPenalty:</strong> Trading highly utilized assets costs more</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-primary-400 mb-2">3. Shields</h3>
            <p className="text-gray-300">
              Shields protect you from elimination for one round. You earn shields through:
            </p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-1">
              <li>Daily trading streaks on Adrena (7-day streak = 1 shield)</li>
              <li>High Mutagen balances (top 10% holders get extra shields)</li>
              <li>Tournament entry bonuses (paid entries may include shields)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Testing Guide */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2">
          Testing the Tournament
        </h2>

        <div className="space-y-4">
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-400 mb-2">Development Mode</h3>
            <p className="text-gray-300 text-sm">
              In development mode, mock trading data is generated automatically.
              No real trading is required to see the tournament flow.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-primary-400">Quick Test Flow:</h3>
          <ol className="list-decimal list-inside text-gray-300 space-y-2">
            <li>
              <strong>Create a tournament</strong> - Go to{' '}
              <Link href="/admin" className="text-primary-400 hover:underline">/admin</Link>
              {' '}and create a new tournament
            </li>
            <li>
              <strong>Open entries</strong> - Click "Open Entries" on the tournament page
            </li>
            <li>
              <strong>Register wallets</strong> - Connect different wallets and register
            </li>
            <li>
              <strong>Start tournament</strong> - Click "Start Tournament" when ready
            </li>
            <li>
              <strong>Watch rounds progress</strong> - Scores update every 30 seconds
            </li>
            <li>
              <strong>See eliminations</strong> - Bottom performers marked eliminated each round
            </li>
          </ol>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">API Endpoints for Testing:</h3>
            <div className="font-mono text-sm space-y-1 text-gray-300">
              <p>GET /api/health - Check API status</p>
              <p>GET /api/tournaments - List all tournaments</p>
              <p>GET /api/tournaments/:id - Get tournament details</p>
              <p>GET /api/tournaments/:id/standings - Get current standings</p>
              <p>POST /api/admin/tournaments - Create tournament (admin)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Architecture */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2">
          Technical Architecture
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-primary-400 mb-2">Frontend</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>Next.js 14 (App Router)</li>
              <li>React 18 with TypeScript</li>
              <li>Tailwind CSS</li>
              <li>Solana Wallet Adapter</li>
              <li>Real-time WebSocket updates</li>
            </ul>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-primary-400 mb-2">Backend</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>Express.js with TypeScript</li>
              <li>PostgreSQL + Prisma ORM</li>
              <li>WebSocket for real-time standings</li>
              <li>Cron jobs for round processing</li>
              <li>Adrena Competition Service integration</li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="font-semibold text-primary-400 mb-2">Data Flow</h3>
          <div className="font-mono text-sm text-gray-300">
            <p>Adrena Protocol → Competition Service WebSocket → Our API → Database → Frontend</p>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Position opens/closes are captured via WebSocket, scored using our algorithm,
            and broadcast to connected clients in real-time.
          </p>
        </div>
      </section>

      {/* Links */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2">
          Links & Resources
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="https://github.com/dvrvsimi/adrena-royale"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-800/50 hover:bg-gray-700/50 rounded-lg p-4 flex items-center gap-3 transition-colors"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">GitHub Repository</p>
              <p className="text-sm text-gray-400">View source code</p>
            </div>
          </a>

          <a
            href="https://adrena.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-800/50 hover:bg-gray-700/50 rounded-lg p-4 flex items-center gap-3 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center font-bold">
              A
            </div>
            <div>
              <p className="font-semibold">Adrena Protocol</p>
              <p className="text-sm text-gray-400">Trade perpetuals on Solana</p>
            </div>
          </a>

          <a
            href="https://docs.adrena.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-800/50 hover:bg-gray-700/50 rounded-lg p-4 flex items-center gap-3 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div>
              <p className="font-semibold">Adrena Docs</p>
              <p className="text-sm text-gray-400">Protocol documentation</p>
            </div>
          </a>

          <a
            href="https://autonom.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-800/50 hover:bg-gray-700/50 rounded-lg p-4 flex items-center gap-3 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold">
              Au
            </div>
            <div>
              <p className="font-semibold">Autonom</p>
              <p className="text-sm text-gray-400">Oracle infrastructure partner</p>
            </div>
          </a>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm pt-8 border-t border-gray-800">
        <p>Built for the Adrena x Autonom Trading Competition Bounty</p>
        <p className="mt-1">by dvrvsimi</p>
      </div>
    </div>
  );
}
