'use client';

import { useLiquidity } from '@/hooks/useLiquidity';

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

interface UtilizationBarProps {
  utilization: number;
  targetRatio: number;
  currentRatio: number;
}

function UtilizationBar({ utilization, targetRatio, currentRatio }: UtilizationBarProps) {
  const utilizationPercent = utilization * 100;
  const isHighUtil = utilization > 0.7;
  const isOverweight = currentRatio > targetRatio * 1.1;
  const isUnderweight = currentRatio < targetRatio * 0.9;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Utilization</span>
        <span className={isHighUtil ? 'text-orange-400 font-medium' : 'text-gray-300'}>
          {formatPercent(utilization)}
          {isHighUtil && ' (High)'}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isHighUtil ? 'bg-orange-500' : 'bg-primary-500'
          }`}
          style={{ width: `${utilizationPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          Ratio: {formatPercent(currentRatio)}
          {isOverweight && <span className="text-orange-400"> (Over)</span>}
          {isUnderweight && <span className="text-blue-400"> (Under)</span>}
        </span>
        <span>Target: {formatPercent(targetRatio)}</span>
      </div>
    </div>
  );
}

interface LiquidityWidgetProps {
  compact?: boolean;
}

export function LiquidityWidget({ compact = false }: LiquidityWidgetProps) {
  const { liquidity, isLoading, error } = useLiquidity();

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
        <div className="h-5 w-32 bg-gray-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !liquidity) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
        <div className="text-red-400 text-sm">Failed to load liquidity data</div>
      </div>
    );
  }

  const cacheAge = Math.floor((Date.now() - liquidity.fetchedAt) / 1000);

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Pool Liquidity</h3>
          <p className="text-xs text-gray-500">
            Total: {formatUsd(liquidity.totalPoolValueUsd)}
          </p>
        </div>
        <div className="text-xs text-gray-500">
          {cacheAge}s ago
        </div>
      </div>

      {/* Custodies */}
      <div className={compact ? 'divide-y divide-gray-800/50' : 'p-4 space-y-4'}>
        {liquidity.custodies.map((custody) => (
          <div
            key={custody.symbol}
            className={compact ? 'px-4 py-3' : 'bg-gray-800/30 rounded-lg p-3'}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xs font-bold">
                  {custody.symbol.slice(0, 2)}
                </span>
                <div>
                  <span className="font-medium">{custody.symbol}</span>
                  {!compact && (
                    <p className="text-xs text-gray-500 font-mono">
                      {custody.mint.slice(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {formatUsd(custody.liquidityUsd)}
                </div>
                <div className="text-xs text-gray-500">
                  AUM: {formatUsd(custody.aumUsd)}
                </div>
              </div>
            </div>

            {!compact && (
              <UtilizationBar
                utilization={custody.utilization}
                targetRatio={custody.targetRatio}
                currentRatio={custody.currentRatio}
              />
            )}

            {compact && (
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-500">Util: {formatPercent(custody.utilization)}</span>
                <span className={custody.utilization > 0.7 ? 'text-orange-400' : 'text-gray-400'}>
                  {custody.utilization > 0.7 ? '1.1x bonus' : 'Standard'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
