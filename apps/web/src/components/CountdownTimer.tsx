'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  label?: string;
  onExpire?: () => void;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const difference = new Date(targetDate).getTime() - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    expired: false,
  };
}

export function CountdownTimer({ targetDate, label, onExpire, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.expired && onExpire) {
        onExpire();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  // Prevent hydration mismatch
  if (!hasMounted) {
    return null;
  }

  if (timeLeft.expired) {
    return (
      <span className="text-red-400 text-sm font-medium">
        {label ? `${label}: ` : ''}Expired
      </span>
    );
  }

  if (compact) {
    // Compact format: "2d 5h" or "5h 30m" or "30m 15s"
    const parts: string[] = [];
    if (timeLeft.days > 0) {
      parts.push(`${timeLeft.days}d`);
      parts.push(`${timeLeft.hours}h`);
    } else if (timeLeft.hours > 0) {
      parts.push(`${timeLeft.hours}h`);
      parts.push(`${timeLeft.minutes}m`);
    } else {
      parts.push(`${timeLeft.minutes}m`);
      parts.push(`${timeLeft.seconds}s`);
    }

    const isUrgent = timeLeft.days === 0 && timeLeft.hours < 1;

    return (
      <span className={`text-sm font-mono ${isUrgent ? 'text-orange-400' : 'text-gray-400'}`}>
        {label && <span className="text-gray-500">{label}: </span>}
        {parts.join(' ')}
      </span>
    );
  }

  // Full format with boxes
  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6;

  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-gray-500">{label}</p>}
      <div className="flex gap-2">
        {timeLeft.days > 0 && (
          <TimeUnit value={timeLeft.days} unit="d" urgent={isUrgent} />
        )}
        <TimeUnit value={timeLeft.hours} unit="h" urgent={isUrgent} />
        <TimeUnit value={timeLeft.minutes} unit="m" urgent={isUrgent} />
        <TimeUnit value={timeLeft.seconds} unit="s" urgent={isUrgent} />
      </div>
    </div>
  );
}

function TimeUnit({ value, unit, urgent }: { value: number; unit: string; urgent: boolean }) {
  return (
    <div className={`flex items-center gap-0.5 px-2 py-1 rounded ${urgent ? 'bg-orange-900/30' : 'bg-gray-800'}`}>
      <span className={`font-mono text-sm font-bold ${urgent ? 'text-orange-400' : 'text-white'}`}>
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-xs text-gray-500">{unit}</span>
    </div>
  );
}
