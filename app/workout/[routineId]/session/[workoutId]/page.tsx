'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchRoutine,
  fetchRoutineExercises,
  fetchWorkout,
  fetchWorkoutLogs,
  fetchLastExerciseLog,
  logExercise,
  completeWorkout,
  parseTimestamp,
  Routine,
  RoutineExercise,
  Workout,
  WorkoutLog,
} from '@/lib/supabase';
import SetLogger from '@/components/SetLogger';
import { ChevronLeft } from 'lucide-react';

export default function WorkoutSessionPage() {
  const params = useParams<{ routineId: string; workoutId: string }>();
  const router = useRouter();
  const { routineId, workoutId } = params;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [lastLogs, setLastLogs] = useState<Record<string, WorkoutLog | null>>({});
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

        const lastLogEntries = await Promise.all(
          routineExercises.map(async (re) => {
            if (!re.exercise) return [re.exercise_id, null] as const;
            const last = await fetchLastExerciseLog(re.exercise_id, workoutId);
            return [re.exercise_id, last] as const;
          })
        );
        setLastLogs(Object.fromEntries(lastLogEntries));
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

  const handleLogSet = async (
    exerciseId: string,
    payload: { reps?: number; weight_lbs?: number; duration_seconds?: number }
  ) => {
    await logExercise(workoutId, exerciseId, payload);
    const updatedLogs = await fetchWorkoutLogs(workoutId);
    setLogs(updatedLogs);
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

            return (
              <SetLogger
                key={re.id}
                exercise={exercise}
                routineExercise={re}
                logs={exerciseLogs}
                lastLog={lastLogs[exercise.id] ?? null}
                disabled={isCompleted}
                onLogSet={(payload) => handleLogSet(exercise.id, payload)}
              />
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
