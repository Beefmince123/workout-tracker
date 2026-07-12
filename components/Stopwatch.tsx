'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

function formatMMSS(totalSeconds: number) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Stopwatch({
  targetSeconds,
  disabled,
  onSave,
}: {
  targetSeconds?: number;
  disabled?: boolean;
  onSave: (seconds: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const baseRef = useRef(0); // elapsed seconds accumulated before the current run
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      const now = Date.now();
      const sinceStart = Math.floor((now - (startRef.current ?? now)) / 1000);
      const next = baseRef.current + sinceStart;
      setElapsed(next);

      if (targetSeconds && next >= targetSeconds) {
        setRunning(false);
        baseRef.current = next;
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [running, targetSeconds]);

  const handleStartPause = () => {
    if (disabled) return;
    if (running) {
      baseRef.current = elapsed;
      setRunning(false);
    } else {
      startRef.current = Date.now();
      setRunning(true);
    }
  };

  const handleReset = () => {
    if (disabled) return;
    setRunning(false);
    baseRef.current = 0;
    startRef.current = null;
    setElapsed(0);
  };

  const atTarget = Boolean(targetSeconds) && elapsed >= (targetSeconds ?? 0);

  return (
    <div className="space-y-3">
      <div className="text-center">
        <div
          className={`font-mono font-bold text-4xl tabular-nums ${
            atTarget ? 'text-green-400' : 'text-white'
          }`}
        >
          {formatMMSS(elapsed)}
        </div>
        {targetSeconds ? (
          <p className="text-xs text-gray-400 mt-1">Target {formatMMSS(targetSeconds)}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleStartPause}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-colors"
        >
          {running ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={handleReset}
          disabled={disabled}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white p-3 rounded-lg transition-colors"
          aria-label="Reset stopwatch"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <button
        onClick={() => onSave(elapsed)}
        disabled={disabled || elapsed === 0}
        className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white py-2 rounded-lg font-bold text-sm transition-colors border border-gray-700"
      >
        Log Set ({formatMMSS(elapsed)})
      </button>
    </div>
  );
}
