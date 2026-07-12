'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, SkipForward } from 'lucide-react';

function formatMMSS(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const m = String(Math.floor(clamped / 60)).padStart(2, '0');
  const s = String(clamped % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Web Audio unsupported/blocked - vibration still covers the alert.
  }
}

export default function RestTimer({
  seconds,
  onDone,
}: {
  seconds: number;
  onDone: () => void;
}) {
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const doneFiredRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!doneFiredRef.current) {
        doneFiredRef.current = true;
        playChime();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
      return;
    }

    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  const complete = remaining <= 0;
  const progress = total > 0 ? 1 - remaining / total : 1;

  return (
    <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4 space-y-3">
      <p className="text-xs uppercase font-bold text-blue-300 tracking-wider text-center">
        {complete ? 'Rest Complete' : 'Resting'}
      </p>

      <div
        className={`text-center font-mono font-bold text-4xl tabular-nums ${
          complete ? 'text-green-400' : 'text-white'
        }`}
      >
        {formatMMSS(remaining)}
      </div>

      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>

      {complete ? (
        <button
          onClick={onDone}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-colors"
        >
          Continue
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTotal((t) => t + 15);
              setRemaining((r) => r + 15);
            }}
            className="flex-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-bold transition-colors border border-gray-700"
          >
            <Plus size={16} />
            15s
          </button>
          <button
            onClick={onDone}
            className="flex-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-bold transition-colors border border-gray-700"
          >
            <SkipForward size={16} />
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
