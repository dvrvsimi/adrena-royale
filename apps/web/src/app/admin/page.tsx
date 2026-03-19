'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSignMessage } from '@/hooks/useSignMessage';
import { api } from '@/lib/api';
import { DEFAULT_ROUND_CONFIGS, EntryType } from '@adrena-royale/shared';

const IS_DEV = process.env.NODE_ENV === 'development';

export default function AdminPage() {
  const { publicKey, connected } = useWallet();
  const { signAuthMessage } = useSignMessage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState<{
    name: string;
    description: string;
    entryType: EntryType;
    entryFeeSol: string;
    scheduledStart: string;
    entryDeadline: string;
  }>({
    name: '',
    description: '',
    entryType: 'FREE',
    entryFeeSol: '',
    scheduledStart: '',
    entryDeadline: '',
  });

  // In dev mode, allow access without wallet
  const canAccess = IS_DEV || (connected && publicKey);

  if (!canAccess) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold">Admin Panel</h2>
        <p className="text-gray-400 mt-2">
          Connect your admin wallet to access this page.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // In dev mode, skip signing
      let auth = undefined;
      if (!IS_DEV && publicKey && signAuthMessage) {
        auth = await signAuthMessage();
        if (!auth) throw new Error('Failed to sign message');
      }

      await api.createTournament(
        {
          name: form.name,
          description: form.description || undefined,
          entryType: form.entryType,
          entryFeeSol: form.entryFeeSol ? parseFloat(form.entryFeeSol) : undefined,
          scheduledStart: new Date(form.scheduledStart).toISOString(),
          entryDeadline: new Date(form.entryDeadline).toISOString(),
          roundConfigs: [...DEFAULT_ROUND_CONFIGS],
        },
        auth
      );

      setMessage({ type: 'success', text: 'Tournament created successfully!' });
      setForm({
        name: '',
        description: '',
        entryType: 'FREE',
        entryFeeSol: '',
        scheduledStart: '',
        entryDeadline: '',
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create tournament' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        {IS_DEV && (
          <span className="bg-yellow-900/50 text-yellow-400 text-xs px-3 py-1 rounded-full border border-yellow-700">
            Dev Mode
          </span>
        )}
      </div>

      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-semibold mb-6">Create Tournament</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Tournament Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Entry Type
              </label>
              <select
                value={form.entryType}
                onChange={(e) => setForm({ ...form, entryType: e.target.value as any })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="FREE">Free</option>
                <option value="SOL_STAKE">SOL Stake</option>
                <option value="MUTAGEN_COMMIT">Mutagen Commit</option>
              </select>
            </div>

            {form.entryType === 'SOL_STAKE' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Entry Fee (SOL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.entryFeeSol}
                  onChange={(e) => setForm({ ...form, entryFeeSol: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Scheduled Start
              </label>
              <input
                type="datetime-local"
                value={form.scheduledStart}
                onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Entry Deadline
              </label>
              <input
                type="datetime-local"
                value={form.entryDeadline}
                onChange={(e) => setForm({ ...form, entryDeadline: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-900/50 text-green-400'
                  : 'bg-red-900/50 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>
        </form>
      </div>
    </div>
  );
}
