'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  USER_ID,
  fetchRecentWorkouts,
  fetchUserRoutines,
  createWorkout,
  deleteWorkout,
  parseTimestamp,
} from '@/lib/supabase';
import { Workout, Routine } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const initData = async () => {
      try {
        const recentWorkouts = await fetchRecentWorkouts(USER_ID, 5);
        setWorkouts(recentWorkouts);

        const userRoutines = await fetchUserRoutines(USER_ID);
        setRoutines(userRoutines);

        // Calculate streak (simplified - count consecutive days with workouts)
        if (recentWorkouts.length > 0) {
          setStreak(recentWorkouts.length); // Placeholder
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  const handleQuickStart = async (routineId: string) => {
    if (starting) return;
    setStarting(true);
    try {
      const workout = await createWorkout(USER_ID, routineId);
      router.push(`/workout/${routineId}/session/${workout.id}`);
    } catch (error) {
      console.error('Error starting workout:', error);
      setStarting(false);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!window.confirm('Delete this workout? This cannot be undone.')) return;

    try {
      await deleteWorkout(workoutId);
      setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="pt-6 px-4 space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-3xl font-bold text-white">Workouts</h1>
      </div>

      {/* Streak Card */}
      {streak > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-4 text-center">
          <p className="text-white/80 text-sm">Current Streak</p>
          <p className="text-4xl font-bold text-white">{streak} 🔥</p>
          <p className="text-white/70 text-xs mt-1">Keep it going!</p>
        </div>
      )}

      {/* Quick Start Buttons */}
      {routines.length > 0 && (
        <div>
          <p className="text-xs uppercase font-bold text-gray-400 mb-3 tracking-wider">
            Quick Start
          </p>
          <div className="space-y-2">
            {routines.slice(0, 3).map((routine) => (
              <button
                key={routine.id}
                onClick={() => handleQuickStart(routine.id)}
                disabled={starting}
                className="block w-full text-left bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors disabled:opacity-50"
              >
                <div className="font-bold text-white">{routine.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {routine.days_of_week?.join(', ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Workouts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">
            Recent Workouts
          </p>
        </div>

        {workouts.length === 0 ? (
          <div className="bg-gray-800/50 rounded-2xl p-8 text-center">
            <p className="text-gray-400 text-sm">No workouts yet</p>
            <p className="text-gray-500 text-xs mt-2">
              Create a routine to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700 transition-colors"
              >
                <Link
                  href={`/workout/${workout.routine_id}/session/${workout.id}`}
                  className="flex-1 min-w-0 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">
                        {workout.routine?.name || 'Workout'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {parseTimestamp(workout.started_at).toLocaleDateString()}
                      </div>
                    </div>
                    {workout.duration_minutes && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-400">
                          {workout.duration_minutes} min
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => handleDeleteWorkout(workout.id)}
                  className="shrink-0 text-gray-500 hover:text-red-500 p-2 mr-2 transition-colors"
                  aria-label="Delete workout"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* No Routines CTA */}
      {routines.length === 0 && (
        <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6 text-center">
          <p className="text-white font-bold mb-2">Get Started</p>
          <p className="text-gray-400 text-sm mb-4">
            Create your first routine to track workouts
          </p>
          <Link
            href="/workout"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            <Plus size={16} />
            Create Routine
          </Link>
        </div>
      )}
    </div>
  );
}
