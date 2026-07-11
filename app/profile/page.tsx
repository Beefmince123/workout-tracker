'use client';

import { useEffect, useState } from 'react';
import { supabase, USER_ID, fetchUserExercises, parseTimestamp } from '@/lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search } from 'lucide-react';

interface ExerciseHistory {
  date: string;
  reps?: number;
  weight?: number;
  duration?: number;
  label: string;
}

export default function ProfilePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, best: 0, avg: 0, streak: 0 });

  useEffect(() => {
    const initData = async () => {
      try {
        const data = await fetchUserExercises(USER_ID);
        setExercises(data || []);
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    initData();
  }, []);

  const handleExerciseSelect = async (exercise: any) => {
    setSelectedExercise(exercise);
    setLoading(true);

    try {
      const { data } = await supabase
        .from('workout_logs')
        .select(`
          *,
          workout:workouts(started_at)
        `)
        .eq('exercise_id', exercise.id)
        .order('logged_at', { ascending: true });

      if (data) {
        const historyData: ExerciseHistory[] = data.map((log: any) => {
          let label = '';
          if (log.reps) label = `${log.reps} reps`;
          if (log.weight_lbs) label += ` @ ${log.weight_lbs}lbs`;
          if (log.duration_seconds) label = `${Math.round(log.duration_seconds / 60)} min`;

          return {
            date: parseTimestamp(log.logged_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            reps: log.reps,
            weight: log.weight_lbs,
            duration: log.duration_seconds,
            label,
          };
        });

        setHistory(historyData);

        // Calculate stats
        const reps = data
          .filter((l: any) => l.reps)
          .map((l: any) => l.reps);
        const weights = data
          .filter((l: any) => l.weight_lbs)
          .map((l: any) => l.weight_lbs);

        const displayValue = reps.length > 0 ? reps : weights;

        setStats({
          total: data.length,
          best: Math.max(...displayValue, 0),
          avg: displayValue.length > 0
            ? Math.round(displayValue.reduce((a: number, b: number) => a + b, 0) / displayValue.length)
            : 0,
          streak: 0,
        });
      }
    } catch (error) {
      console.error('Error loading exercise history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Progress</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Exercise List or Details */}
      {!selectedExercise ? (
        <div className="space-y-2">
          {filteredExercises.length === 0 ? (
            <div className="bg-gray-800/30 rounded-lg p-6 text-center">
              <p className="text-gray-400 text-sm">
                {exercises.length === 0
                  ? 'Log some workouts to see exercise history'
                  : 'No exercises found'}
              </p>
            </div>
          ) : (
            filteredExercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => handleExerciseSelect(exercise)}
                className="w-full bg-gray-800/50 hover:bg-gray-800 rounded-lg p-4 text-left border border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{exercise.name}</p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">
                      {exercise.type}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedExercise(null);
              setHistory([]);
            }}
            className="text-blue-500 hover:text-blue-400 text-sm font-bold"
          >
            ← Back
          </button>

          {/* Exercise Title */}
          <div>
            <h2 className="text-2xl font-bold text-white">{selectedExercise.name}</h2>
            <p className="text-sm text-gray-400 mt-1 capitalize">
              {selectedExercise.type}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Personal Best</p>
              <p className="text-2xl font-bold text-blue-400 mt-2">{stats.best}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Average</p>
              <p className="text-2xl font-bold text-blue-400 mt-2">{stats.avg}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Total Logs</p>
              <p className="text-2xl font-bold text-blue-400 mt-2">{stats.total}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
              <p className="text-2xl font-bold text-blue-400 mt-2">{stats.streak}</p>
            </div>
          </div>

          {/* Progress Graph */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-400">Loading graph...</p>
            </div>
          ) : history.length > 0 ? (
            <div className="bg-gray-800/30 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.5)"
                    style={{ fontSize: 12 }}
                  />
                  <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  {history[0]?.reps && (
                    <Line
                      type="monotone"
                      dataKey="reps"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                    />
                  )}
                  {history[0]?.weight && (
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-gray-800/30 rounded-lg p-6 text-center">
              <p className="text-gray-400 text-sm">No history for this exercise</p>
            </div>
          )}

          {/* Recent Attempts */}
          <div className="space-y-2">
            <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">
              Recent Attempts
            </p>
            <div className="space-y-2">
              {history.slice().reverse().slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800/50 rounded-lg p-3 border border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
