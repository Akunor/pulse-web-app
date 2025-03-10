import React, { useState, useEffect } from 'react';
import { Dumbbell, Clock, FileWarning as Running, SwissFranc as Swim, Bike, Plus, X, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Workout {
  id: string;
  name: string;
  duration: string;
  completed_at?: string;
  icon: React.ReactNode;
}

const defaultWorkouts: Workout[] = [
  { 
    id: '1', 
    name: 'Running', 
    duration: '30',
    icon: <Running className="w-5 h-5 text-rose-500" />
  },
  { 
    id: '2', 
    name: 'Swimming', 
    duration: '45',
    icon: <Swim className="w-5 h-5 text-rose-500" />
  },
  { 
    id: '3', 
    name: 'Cycling', 
    duration: '60',
    icon: <Bike className="w-5 h-5 text-rose-500" />
  },
  { 
    id: '4', 
    name: 'Strength Training', 
    duration: '45',
    icon: <Dumbbell className="w-5 h-5 text-rose-500" />
  }
];

export function WorkoutList() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [customWorkouts, setCustomWorkouts] = useState<Workout[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customWorkout, setCustomWorkout] = useState({
    name: '',
    duration: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    loadWorkouts();
    loadCustomWorkouts();
  }, [user]);

  async function loadWorkouts() {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user?.id)
      .order('completed_at', { ascending: false });

    if (error) {
      toast.error('Failed to load workouts');
      return;
    }

    setWorkouts(data || []);
  }

  async function loadCustomWorkouts() {
    const { data, error } = await supabase
      .from('custom_workouts')
      .select('*')
      .eq('user_id', user?.id)
      .order('name', { ascending: true });

    if (error) {
      toast.error('Failed to load custom workouts');
      return;
    }

    const customWorkoutsList = data.map(w => ({
      id: w.id,
      name: w.name,
      duration: w.duration,
      icon: <Dumbbell className="w-5 h-5 text-rose-500" />
    }));

    setCustomWorkouts(customWorkoutsList);
  }

  async function removeCustomWorkout(workoutId: string) {
    const { error } = await supabase
      .from('custom_workouts')
      .delete()
      .eq('id', workoutId)
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Failed to remove workout');
      return;
    }

    toast.success('Workout removed');
    loadCustomWorkouts();
  }

  async function completeWorkout(workout: Workout) {
    try {
      const durationInMinutes = parseInt(workout.duration);
      if (isNaN(durationInMinutes)) {
        toast.error('Invalid duration');
        return;
      }

      // Log attempt details
      console.log('Attempting to complete workout:', {
        name: workout.name,
        duration: durationInMinutes,
        userId: user?.id
      });

      const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { error: timezoneError } = await supabase
        .from('profiles')
        .update({ timezone: currentTimezone })
        .eq('id', user?.id);

      if (timezoneError) {
        console.error('Timezone update error:', timezoneError);
        // Continue with workout logging even if timezone update fails
      }

      // Calculate estimated calories (rough estimate based on duration)
      const estimatedCalories = Math.round(durationInMinutes * 7); // Average 7 calories per minute

      const workoutData = {
        user_id: user?.id,
        name: workout.name,
        duration: `${durationInMinutes} minutes`,
        calories: estimatedCalories,
        completed_at: new Date().toISOString()
      };

      // Log the data being sent
      console.log('Sending workout data:', workoutData);

      const { data, error } = await supabase
        .from('workouts')
        .insert([workoutData])
        .select();

      if (error) {
        console.error('Workout completion error:', {
          error,
          details: error.details,
          hint: error.hint,
          message: error.message
        });
        toast.error(`Failed to complete workout: ${error.message}`);
        return;
      }

      console.log('Workout completed successfully:', data);
      toast.success('Workout completed!');
      loadWorkouts();
    } catch (error) {
      console.error('Unexpected error during workout completion:', error);
      toast.error('An unexpected error occurred while completing the workout');
    }
  }

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: customData, error: customError } = await supabase
      .from('custom_workouts')
      .insert([{
        user_id: user?.id,
        name: customWorkout.name,
        duration: customWorkout.duration
      }])
      .select()
      .single();

    if (customError) {
      toast.error('Failed to save custom workout');
      return;
    }

    const workout = {
      id: customData.id,
      name: customWorkout.name,
      duration: customWorkout.duration,
      icon: <Dumbbell className="w-5 h-5 text-rose-500" />
    };

    await completeWorkout(workout);
    loadCustomWorkouts();
    setShowCustomForm(false);
    setCustomWorkout({ name: '', duration: '' });
  };

  const isMainPage = window.location.pathname === '/';

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 ${!isMainPage ? 'mt-8' : ''}`}>
      <div className="flex items-center space-x-2 mb-6">
        <Dumbbell className="w-6 h-6 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Workouts</h2>
      </div>

      <div id="all-workouts" className="space-y-4 mb-8">
        {defaultWorkouts.map((workout) => (
          <div
            key={workout.id}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-rose-500/20 p-3 rounded-full">
                {workout.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{workout.name}</h3>
                <div className="flex items-center space-x-3 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {workout.duration} mins
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => completeWorkout(workout)}
              className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
            >
              Log
            </button>
          </div>
        ))}

        {customWorkouts.map((workout) => (
          <div
            key={workout.id}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-rose-500/20 p-3 rounded-full">
                {workout.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{workout.name}</h3>
                <div className="flex items-center space-x-3 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {workout.duration} mins
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => removeCustomWorkout(workout.id)}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                title="Remove workout"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => completeWorkout(workout)}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
              >
                Log
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mb-8">
        <button
          onClick={() => setShowCustomForm(!showCustomForm)}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {showCustomForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          <span>{showCustomForm ? 'Cancel' : 'Add Custom Workout'}</span>
        </button>

        {showCustomForm && (
          <form onSubmit={handleCustomSubmit} className="mt-4 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">
                  Exercise Name
                </label>
                <input
                  type="text"
                  value={customWorkout.name}
                  onChange={(e) => setCustomWorkout(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={customWorkout.duration}
                  onChange={(e) => setCustomWorkout(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-rose-500 text-white py-2 px-4 rounded-lg hover:bg-rose-600 transition-colors"
              >
                Save & Log
              </button>
            </div>
          </form>
        )}
      </div>

      {workouts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Workout History</h3>
            {isMainPage && (
              <button
                onClick={() => {
                  window.location.href = '/workouts';
                }}
                className="flex items-center text-rose-500 hover:text-rose-600 text-sm font-medium"
              >
                View Full History
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {(isMainPage ? workouts.slice(0, 3) : workouts).map((workout, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg"
              >
                <div>
                  <h4 className="text-slate-900 dark:text-white">{workout.name}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {new Date(workout.completed_at!).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{workout.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}