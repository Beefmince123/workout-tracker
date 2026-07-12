'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  USER_ID,
  fetchUserRoutines,
  fetchUserExercises,
  createRoutine,
  createWorkout,
  deleteRoutine,
  findOrCreateExercise,
  Routine,
  Exercise,
} from '@/lib/supabase';
import { Plus, Play, Trash2, X } from 'lucide-react';

type DraftExercise = {
  exerciseId: string;
  name: string;
  type: Exercise['type'];
  targetSets: number;
  targetReps: number;
  restSeconds: number;
};

export default function WorkoutPage() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);
  const [exerciseInput, setExerciseInput] = useState('');
  const [newExerciseType, setNewExerciseType] = useState<Exercise['type']>('weighted');
  const [saving, setSaving] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const loadData = async () => {
    try {
      const [userRoutines, userExercises] = await Promise.all([
        fetchUserRoutines(USER_ID),
        fetchUserExercises(USER_ID),
      ]);
      setRoutines(userRoutines);
      setAllExercises(userExercises);
    } catch (error) {
      console.error('Error loading routines:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetModal = () => {
    setShowCreateModal(false);
    setNewRoutineName('');
    setSelectedDays([]);
    setDraftExercises([]);
    setExerciseInput('');
    setNewExerciseType('weighted');
  };

  const handleCreateRoutine = async () => {
    if (!newRoutineName.trim() || saving) return;

    setSaving(true);
    try {
      await createRoutine(
        USER_ID,
        newRoutineName.trim(),
        selectedDays,
        draftExercises.map((ex, idx) => ({
          exerciseId: ex.exerciseId,
          order: idx,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          restSeconds: ex.restSeconds,
        }))
      );
      await loadData();
      resetModal();
    } catch (error) {
      console.error('Error creating routine:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    if (!window.confirm('Delete this routine? This cannot be undone.')) return;

    try {
      await deleteRoutine(routineId);
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    } catch (error) {
      console.error('Error deleting routine:', error);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addExerciseToDraft = async (name: string, type: Exercise['type']) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const exercise = await findOrCreateExercise(USER_ID, trimmed, type);
      if (draftExercises.some((ex) => ex.exerciseId === exercise.id)) return;

      setDraftExercises((prev) => [
        ...prev,
        {
          exerciseId: exercise.id,
          name: exercise.name,
          type: exercise.type,
          targetSets: 3,
          targetReps: 10,
          restSeconds: 90,
        },
      ]);
      setAllExercises((prev) =>
        prev.some((ex) => ex.id === exercise.id) ? prev : [...prev, exercise]
      );
      setExerciseInput('');
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const removeDraftExercise = (exerciseId: string) => {
    setDraftExercises((prev) => prev.filter((ex) => ex.exerciseId !== exerciseId));
  };

  const updateDraftExercise = (
    exerciseId: string,
    field: 'targetSets' | 'targetReps' | 'restSeconds',
    value: number
  ) => {
    setDraftExercises((prev) =>
      prev.map((ex) => (ex.exerciseId === exerciseId ? { ...ex, [field]: value } : ex))
    );
  };

  const handleStartWorkout = async (routineId: string) => {
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

  const matchingExercises = allExercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(exerciseInput.toLowerCase()) &&
      !draftExercises.some((d) => d.exerciseId === ex.id)
  );
  const exactMatch = allExercises.some(
    (ex) => ex.name.toLowerCase() === exerciseInput.trim().toLowerCase()
  );

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Routines</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Routines List */}
      {routines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6.5 8.5v7M4 12h5M19.5 8.5v7M22 12h-5M9 12h6M9 6v12M15 6v12"
              />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <p className="font-bold text-lg text-white">No routines yet</p>
            <p className="text-sm text-gray-400">
              Create your first routine to start tracking
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            Create Routine
          </button>

          {/* Template Shortcuts */}
          <div className="w-full mt-6 space-y-2">
            <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">
              Or start from a template
            </p>
            <div className="grid grid-cols-3 gap-2">
              {['Push', 'Pull', 'Legs'].map((template) => (
                <button
                  key={template}
                  onClick={() => {
                    setNewRoutineName(template);
                    setShowCreateModal(true);
                  }}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white py-3 rounded-lg font-bold text-sm transition-colors"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className="bg-gray-800/50 hover:bg-gray-800 rounded-xl p-4 border border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-white">{routine.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {routine.days_of_week?.join(', ') || 'No days set'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteRoutine(routine.id)}
                    className="bg-gray-700 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                    aria-label="Delete routine"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => handleStartWorkout(routine.id)}
                    disabled={starting}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                    aria-label="Start workout"
                  >
                    <Play size={18} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Routine Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-gray-900 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl p-6 space-y-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <button
                onClick={resetModal}
                className="text-gray-400 hover:text-white font-bold"
              >
                Cancel
              </button>
              <h2 className="text-lg font-bold text-white">New Routine</h2>
              <button
                onClick={handleCreateRoutine}
                disabled={!newRoutineName.trim() || saving}
                className="text-blue-500 hover:text-blue-400 font-bold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Routine Name */}
            <input
              type="text"
              placeholder="Routine name"
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />

            {/* Day Selection */}
            <div className="space-y-2">
              <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                Repeat On
              </p>
              <div className="grid grid-cols-7 gap-2">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`py-2 rounded-full font-bold text-sm transition-colors ${
                      selectedDays.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {day.slice(0, 1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise Picker */}
            <div className="space-y-2">
              <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                Exercises
              </p>

              {draftExercises.length > 0 && (
                <div className="space-y-2">
                  {draftExercises.map((ex) => (
                    <div
                      key={ex.exerciseId}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-semibold">{ex.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{ex.type}</p>
                        </div>
                        <button
                          onClick={() => removeDraftExercise(ex.exerciseId)}
                          className="text-gray-400 hover:text-white p-1"
                          aria-label="Remove exercise"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <label className="block">
                          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                            Sets
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={ex.targetSets}
                            onChange={(e) =>
                              updateDraftExercise(
                                ex.exerciseId,
                                'targetSets',
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                            {ex.type === 'timed' ? 'Seconds' : 'Reps'}
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={ex.targetReps}
                            onChange={(e) =>
                              updateDraftExercise(
                                ex.exerciseId,
                                'targetReps',
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                            Rest (s)
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={5}
                            value={ex.restSeconds}
                            onChange={(e) =>
                              updateDraftExercise(
                                ex.exerciseId,
                                'restSeconds',
                                Math.max(0, parseInt(e.target.value, 10) || 0)
                              )
                            }
                            className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="text"
                placeholder="Search or add an exercise"
                value={exerciseInput}
                onChange={(e) => setExerciseInput(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />

              {exerciseInput.trim() && (
                <div className="space-y-1">
                  {matchingExercises.slice(0, 5).map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExerciseToDraft(ex.name, ex.type)}
                      className="w-full text-left bg-gray-800/50 hover:bg-gray-800 rounded-lg px-4 py-2 text-sm text-white"
                    >
                      {ex.name} <span className="text-gray-400 capitalize">({ex.type})</span>
                    </button>
                  ))}

                  {!exactMatch && (
                    <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-gray-400">
                        Add "{exerciseInput.trim()}" as a new exercise
                      </p>
                      <div className="flex items-center gap-2">
                        <select
                          value={newExerciseType}
                          onChange={(e) =>
                            setNewExerciseType(e.target.value as Exercise['type'])
                          }
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm flex-1"
                        >
                          <option value="weighted">Weighted</option>
                          <option value="bodyweight">Bodyweight</option>
                          <option value="timed">Timed</option>
                        </select>
                        <button
                          onClick={() => addExerciseToDraft(exerciseInput, newExerciseType)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
