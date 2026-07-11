'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchRoutine,
  fetchRoutineExercises,
  fetchWorkout,
  fetchWorkoutLogs,
  logExercise,
  completeWorkout,
  parseTimestamp,
  Routine,
  RoutineExercise,
  Workout,
  WorkoutLog,
} from '@/lib/supabase';
import { ChevronLeft, Check } from 'lucide-react';

type SetInput = { reps: string; weight: string; duration: string };

export default function WorkoutSessionPage() {
  const params = useParams<{ routineId: string; workoutId: string }>();
  const router = useRouter();
  const { routineId, workoutId } = params;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [inputs, setInputs] = useState<Record<string, SetInput>>({});
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [routineData, routineExercises, workoutData, workoutLogs] = await Promise.all([
          fetchRoutine(routineId),
          fetchRoutineExercises(routineId),
          fetchWorkout(workoutId),
          fetchWorkoutLogs(workoutId),
        ]);
        setRoutine(routineData);
        setExercises(routineExercises);
        setWorkout(workoutData);
        setLogs(workoutLogs);
      } catch (error) {
        console.error('Error loading workout session:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [routineId, workoutId]);

  useEffect(() => {
    if (!workout || workout.completed_at) return;

    const startedAt = parseTimestamp(workout.started_at).getTime();
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [workout]);

  const getInput = (exerciseId: string): SetInput =>
    inputs[exerciseId] || { reps: '', weight: '', duration: '' };

  const updateInput = (exerciseId: string, field: keyof SetInput, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [exerciseId]: { ...getInput(exerciseId), [field]: value },
    }));
  };

  const handleAddSet = async (exerciseId: string, type: string) => {
    const input = getInput(exerciseId);

    try {
      if (type === 'timed') {
        const durationSeconds = parseInt(input.duration, 10);
        if (!durationSeconds) return;
        await logExercise(workoutId, exerciseId, { duration_seconds: durationSeconds });
      } else {
        const reps = parseInt(input.reps, 10);
        if (!reps) return;
        const weight = type === 'weighted' && input.weight ? parseFloat(input.weight) : undefined;
        await logExercise(workoutId, exerciseId, { reps, weight_lbs: weight });
      }

      const updatedLogs = await fetchWorkoutLogs(workoutId);
      setLogs(updatedLogs);
      setInputs((prev) => ({ ...prev, [exerciseId]: { reps: '', weight: '', duration: '' } }));
    } catch (error) {
      console.error('Error logging set:', error);
    }
  };

  const handleFinish = async () => {
    if (finishing || !workout) return;
    setFinishing(true);
    try {
      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      await completeWorkout(workoutId, durationMinutes);
      router.push('/');
    } catch (error) {
      console.error('Error finishing workout:', error);
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const isCompleted = Boolean(workout?.completed_at);
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <div className="pt-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/workout')}
          className="text-gray-400 hover:text-white flex items-center gap-1"
        >
          <ChevronLeft size={20} />
          <span className="text-sm">Routines</span>
        </button>
        {!isCompleted && (
          <div className="text-blue-400 font-mono font-bold text-lg">
            {minutes}:{seconds}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">{routine?.name}</h1>
        {isCompleted && (
          <p className="text-xs text-gray-400 mt-1">
            Completed &middot; {workout?.duration_minutes} min
          </p>
        )}
      </div>

      {exercises.length === 0 ? (
        <div className="bg-gray-800/30 rounded-lg p-6 text-center">
          <p className="text-gray-400 text-sm">This routine has no exercises yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exercises.map((re) => {
            const exercise = re.exercise;
            if (!exercise) return null;
            const exerciseLogs = logs.filter((l) => l.exercise_id === exercise.id);
            const input = getInput(exercise.id);

            return (
              <div
                key={re.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3"
              >
                <div>
                  <p className="font-bold text-white">{exercise.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{exercise.type}</p>
                </div>

                {exerciseLogs.length > 0 && (
                  <div className="space-y-1">
                    {exerciseLogs.map((log, idx) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="text-gray-400">Set {idx + 1}</span>
                        <span className="text-white font-semibold">
                          {log.duration_seconds
                            ? `${log.duration_seconds}s`
                            : `${log.reps} reps${log.weight_lbs ? ` @ ${log.weight_lbs}lbs` : ''}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {!isCompleted && (
                  <div className="flex items-center gap-2">
                    {exercise.type === 'timed' ? (
                      <input
                        type="number"
                        placeholder="Seconds"
                        value={input.duration}
                        onChange={(e) => updateInput(exercise.id, 'duration', e.target.value)}
                        className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <>
                        <input
                          type="number"
                          placeholder="Reps"
                          value={input.reps}
                          onChange={(e) => updateInput(exercise.id, 'reps', e.target.value)}
                          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        {exercise.type === 'weighted' && (
                          <input
                            type="number"
                            placeholder="Weight (lbs)"
                            value={input.weight}
                            onChange={(e) => updateInput(exercise.id, 'weight', e.target.value)}
                            className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                          />
                        )}
                      </>
                    )}
                    <button
                      onClick={() => handleAddSet(exercise.id, exercise.type)}
                      className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                      aria-label="Log set"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isCompleted && (
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          {finishing ? 'Finishing...' : 'Finish Workout'}
        </button>
      )}
    </div>
  );
}
