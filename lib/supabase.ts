import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Personal app, no auth - all queries scoped to this user
export const USER_ID = 'f6041162-f49c-4aa1-88b6-6c220f1492f1';

// Supabase columns are `timestamp without time zone`, so values like
// "2026-07-10T23:56:26.544" come back with no offset. `new Date()` treats
// that as local time instead of UTC, so callers must go through this.
export const parseTimestamp = (value: string) =>
  new Date(/Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);

// Types
export interface Routine {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  days_of_week: string[]; // ["Monday", "Tuesday", etc]
  created_at: string;
}

export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  type: 'bodyweight' | 'weighted' | 'timed';
  created_at: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: number;
  rest_seconds: number;
  created_at: string;
  exercise?: Exercise;
}

export interface Workout {
  id: string;
  user_id: string;
  routine_id: string;
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  routine?: Routine;
}

export interface WorkoutLog {
  id: string;
  workout_id: string;
  exercise_id: string;
  reps?: number;
  weight_lbs?: number;
  duration_seconds?: number;
  notes?: string;
  logged_at: string;
  exercise?: Exercise;
}

// Helper Functions
export const fetchUserRoutines = async (userId: string) => {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data as Routine[];
};

export const fetchRoutineExercises = async (routineId: string) => {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select(`*, exercise:exercises(*)`)
    .eq('routine_id', routineId)
    .order('order_index');
  
  if (error) throw error;
  return data as RoutineExercise[];
};

export const fetchRecentWorkouts = async (userId: string, limit = 5) => {
  const { data, error } = await supabase
    .from('workouts')
    .select(`*, routine:routines(name)`)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data as Workout[];
};

export const fetchRoutine = async (routineId: string) => {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('id', routineId)
    .single();

  if (error) throw error;
  return data as Routine;
};

export const fetchWorkout = async (workoutId: string) => {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (error) throw error;
  return data as Workout;
};

export const fetchWorkoutLogs = async (workoutId: string) => {
  const { data, error } = await supabase
    .from('workout_logs')
    .select(`*, exercise:exercises(*)`)
    .eq('workout_id', workoutId);
  
  if (error) throw error;
  return data as WorkoutLog[];
};

export const fetchExerciseHistory = async (userId: string, exerciseName: string, limit = 50) => {
  const { data, error } = await supabase
    .from('workout_logs')
    .select(`
      *,
      workout:workouts(started_at)
    `)
    .eq('exercise_id', exerciseName)
    .order('logged_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data as WorkoutLog[];
};

export const createWorkout = async (userId: string, routineId: string) => {
  const { data, error } = await supabase
    .from('workouts')
    .insert([{
      user_id: userId,
      routine_id: routineId,
      started_at: new Date().toISOString(),
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data as Workout;
};

export const completeWorkout = async (workoutId: string, durationMinutes: number) => {
  const { error } = await supabase
    .from('workouts')
    .update({
      completed_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq('id', workoutId);
  
  if (error) throw error;
};

export const logExercise = async (
  workoutId: string,
  exerciseId: string,
  data: {
    reps?: number;
    weight_lbs?: number;
    duration_seconds?: number;
    notes?: string;
  }
) => {
  const { error } = await supabase
    .from('workout_logs')
    .insert([{
      workout_id: workoutId,
      exercise_id: exerciseId,
      ...data,
      logged_at: new Date().toISOString(),
    }]);
  
  if (error) throw error;
};

export const createRoutine = async (
  userId: string,
  name: string,
  daysOfWeek: string[],
  exercises: Array<{
    exerciseId: string;
    order: number;
    targetSets: number;
    targetReps: number;
    restSeconds: number;
  }>
) => {
  // Create routine
  const { data: routineData, error: routineError } = await supabase
    .from('routines')
    .insert([{
      user_id: userId,
      name,
      days_of_week: daysOfWeek,
    }])
    .select()
    .single();

  if (routineError) throw routineError;

  // Create routine exercises
  if (exercises.length > 0) {
    const { error: exerciseError } = await supabase
      .from('routine_exercises')
      .insert(
        exercises.map((ex) => ({
          routine_id: routineData.id,
          exercise_id: ex.exerciseId,
          order_index: ex.order,
          target_sets: ex.targetSets,
          target_reps: ex.targetReps,
          rest_seconds: ex.restSeconds,
        }))
      );

    if (exerciseError) throw exerciseError;
  }

  return routineData as Routine;
};

export const deleteRoutine = async (routineId: string) => {
  const { error: exercisesError } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('routine_id', routineId);

  if (exercisesError) throw exercisesError;

  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', routineId);

  if (error) throw error;
};

export const fetchUserExercises = async (userId: string) => {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;
  return data as Exercise[];
};

// Most recent logged set for this exercise from a previous workout, used to
// show "last time" performance while logging a new set.
export const fetchLastExerciseLog = async (exerciseId: string, excludeWorkoutId: string) => {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('exercise_id', exerciseId)
    .neq('workout_id', excludeWorkoutId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as WorkoutLog | null;
};

export const deleteWorkout = async (workoutId: string) => {
  const { error: logsError } = await supabase
    .from('workout_logs')
    .delete()
    .eq('workout_id', workoutId);

  if (logsError) throw logsError;

  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId);

  if (error) throw error;
};

export const findOrCreateExercise = async (
  userId: string,
  name: string,
  type: Exercise['type']
) => {
  const { data: existing, error: findError } = await supabase
    .from('exercises')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', name.trim())
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing as Exercise;

  const { data, error } = await supabase
    .from('exercises')
    .insert([{ user_id: userId, name: name.trim(), type }])
    .select()
    .single();

  if (error) throw error;
  return data as Exercise;
};
