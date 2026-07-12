'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Exercise, RoutineExercise, WorkoutLog } from '@/lib/supabase';
import Stopwatch from './Stopwatch';
import RestTimer from './RestTimer';

type SetPayload = { reps?: number; weight_lbs?: number; duration_seconds?: number };

function describeLog(log: WorkoutLog) {
  if (log.duration_seconds) {
    const m = Math.floor(log.duration_seconds / 60);
    const s = log.duration_seconds % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
  }
  return `${log.reps} reps${log.weight_lbs ? ` @ ${log.weight_lbs}lbs` : ''}`;
}

export default function SetLogger({
  exercise,
  routineExercise,
  logs,
  lastLog,
  disabled,
  onLogSet,
}: {
  exercise: Exercise;
  routineExercise: RoutineExercise;
  logs: WorkoutLog[];
  lastLog: WorkoutLog | null;
  disabled: boolean;
  onLogSet: (data: SetPayload) => Promise<void>;
}) {
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [showRest, setShowRest] = useState(false);
  const [saving, setSaving] = useState(false);

  const setNumber = logs.length + 1;
  const targetSets = routineExercise.target_sets;
  const targetReps = routineExercise.target_reps;
  const restSeconds = routineExercise.rest_seconds;
  const isTimed = exercise.type === 'timed';

  const finishSet = async (payload: SetPayload) => {
    setSaving(true);
    try {
      await onLogSet(payload);
      setReps('');
      setWeight('');
      setShowRest(true);
    } finally {
      setSaving(false);
    }
  };

  const handleLogReps = () => {
    const repsNum = parseInt(reps, 10);
    if (!repsNum) return;
    const weightNum = exercise.type === 'weighted' && weight ? parseFloat(weight) : undefined;
    finishSet({ reps: repsNum, weight_lbs: weightNum });
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-white">{exercise.name}</p>
          <p className="text-xs text-gray-400 capitalize">{exercise.type}</p>
        </div>
        {!disabled && (
          <div className="text-right">
            <p className="text-sm font-bold text-blue-400">
              Set {Math.min(setNumber, targetSets)} of {targetSets}
            </p>
            {!isTimed && (
              <p className="text-xs text-gray-500">Target {targetReps} reps</p>
            )}
          </div>
        )}
      </div>

      {lastLog && (
        <p className="text-xs text-gray-500">
          Last time: <span className="text-gray-300">{describeLog(lastLog)}</span>
        </p>
      )}

      {logs.length > 0 && (
        <div className="space-y-1">
          {logs.map((log, idx) => (
            <div
              key={log.id}
              className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm"
            >
              <span className="text-gray-400">Set {idx + 1}</span>
              <span className="text-white font-semibold">{describeLog(log)}</span>
            </div>
          ))}
        </div>
      )}

      {!disabled && showRest && (
        <RestTimer seconds={restSeconds} onDone={() => setShowRest(false)} />
      )}

      {!disabled && !showRest && (
        isTimed ? (
          <Stopwatch
            targetSeconds={targetReps || undefined}
            disabled={saving}
            onSave={(seconds) => finishSet({ duration_seconds: seconds })}
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Reps"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              disabled={saving}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            {exercise.type === 'weighted' && (
              <input
                type="number"
                placeholder="Weight (lbs)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                disabled={saving}
                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            )}
            <button
              onClick={handleLogReps}
              disabled={saving || !reps}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-3 rounded-lg transition-colors"
              aria-label="Log set"
            >
              <Check size={18} />
            </button>
          </div>
        )
      )}
    </div>
  );
}
