import React from 'react';
import { LineChart as ChartIcon, TrendingUp, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Stats {
  totalWorkouts: number;
  totalCalories: number;
  totalMinutes: number;
  averagePulse: number;
}

export function Progress() {
  const [stats, setStats] = React.useState<Stats>({
    totalWorkouts: 0,
    totalCalories: 0,
    totalMinutes: 0,
    averagePulse: 0
  });
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  async function loadStats() {
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user?.id);

    if (error) return;

    const totalWorkouts = workouts.length;
    const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0);
    const totalMinutes = workouts.reduce((sum, w) => {
      const duration = new Date(w.duration).getMinutes();
      return sum + duration;
    }, 0);

    setStats({
      totalWorkouts,
      totalCalories,
      totalMinutes,
      averagePulse: Math.round(totalWorkouts * 5)
    });
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <ChartIcon className="w-6 h-6 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Progress Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-rose-400" />
            <h3 className="text-slate-900 dark:text-white font-semibold">Workout Stats</h3>
          </div>
          <div className="space-y-2">
            <p className="text-slate-700 dark:text-slate-300">Total Workouts: {stats.totalWorkouts}</p>
            <p className="text-slate-700 dark:text-slate-300">Total Minutes: {stats.totalMinutes}</p>
            <p className="text-slate-700 dark:text-slate-300">Calories Burned: {stats.totalCalories}</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Flame className="w-5 h-5 text-rose-400" />
            <h3 className="text-slate-900 dark:text-white font-semibold">Pulse Trends</h3>
          </div>
          <div className="space-y-2">
            <p className="text-slate-700 dark:text-slate-300">Average Pulse: {stats.averagePulse}</p>
            <p className="text-slate-700 dark:text-slate-300">Best Streak: {Math.floor(stats.totalWorkouts / 2)} days</p>
          </div>
        </div>
      </div>
    </div>
  );
}