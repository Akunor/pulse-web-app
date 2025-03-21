import React from 'react';
import { LineChart as ChartIcon, TrendingUp, Flame, Clock, Calendar, Activity, Target, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns';

interface Stats {
  totalWorkouts: number;
  totalCalories: number;
  totalMinutes: number;
  averagePulse: number;
  weeklyStats: {
    workouts: number;
    averageDuration: number;
    restDays: number;
    streak: number;
  };
  monthlyStats: {
    workouts: number;
    averageDuration: number;
    restDays: number;
    streak: number;
  };
  workoutTypes: {
    [key: string]: number;
  };
  bestStreak: number;
  averageWorkoutsPerWeek: number;
  mostActiveDay: string;
  averageRestDaysPerWeek: number;
}

export function Progress() {
  const [stats, setStats] = React.useState<Stats>({
    totalWorkouts: 0,
    totalCalories: 0,
    totalMinutes: 0,
    averagePulse: 0,
    weeklyStats: {
      workouts: 0,
      averageDuration: 0,
      restDays: 0,
      streak: 0
    },
    monthlyStats: {
      workouts: 0,
      averageDuration: 0,
      restDays: 0,
      streak: 0
    },
    workoutTypes: {},
    bestStreak: 0,
    averageWorkoutsPerWeek: 0,
    mostActiveDay: '',
    averageRestDaysPerWeek: 0
  });
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  async function loadStats() {
    // Get all workouts for the user
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user?.id)
      .order('completed_at', { ascending: true });

    if (workoutsError) return;

    // Get user's highest pulse from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('highest_pulse')
      .eq('id', user?.id)
      .single();

    if (profileError) return;

    // Get rest days
    const { data: restDays, error: restDaysError } = await supabase
      .from('rest_days')
      .select('*')
      .eq('user_id', user?.id)
      .order('date', { ascending: true });

    if (restDaysError) return;

    // Calculate basic stats
    const totalWorkouts = workouts.length;
    const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0);
    const totalMinutes = workouts.reduce((sum, w) => {
      const duration = new Date(w.duration).getMinutes();
      return sum + duration;
    }, 0);

    // Calculate weekly stats
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    
    const weeklyWorkouts = workouts.filter(w => {
      const date = new Date(w.completed_at);
      return date >= weekStart && date <= weekEnd;
    });

    const weeklyRestDays = restDays.filter(r => {
      const date = new Date(r.date);
      return date >= weekStart && date <= weekEnd;
    });

    // Calculate monthly stats
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyWorkouts = workouts.filter(w => {
      const date = new Date(w.completed_at);
      return date >= monthStart && date <= monthEnd;
    });

    const monthlyRestDays = restDays.filter(r => {
      const date = new Date(r.date);
      return date >= monthStart && date <= monthEnd;
    });

    // Calculate workout types
    const workoutTypes = workouts.reduce((acc, w) => {
      acc[w.name] = (acc[w.name] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // Use highest_pulse from profile instead of calculating from workouts
    const highestPulse = profile.highest_pulse;

    // Calculate most active day
    const dayCounts = workouts.reduce((acc, w) => {
      const day = format(new Date(w.completed_at), 'EEEE');
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const mostActiveDay = Object.entries(dayCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'No data';

    // Calculate average workouts per week
    const weeks = Math.ceil((now.getTime() - new Date(workouts[0]?.completed_at || now).getTime()) / (1000 * 60 * 60 * 24 * 7));
    const averageWorkoutsPerWeek = weeks > 0 ? totalWorkouts / weeks : 0;

    // Calculate average rest days per week
    const averageRestDaysPerWeek = weeks > 0 ? restDays.length / weeks : 0;

    setStats({
      totalWorkouts,
      totalCalories,
      totalMinutes,
      averagePulse: Math.round(totalWorkouts * 5),
      weeklyStats: {
        workouts: weeklyWorkouts.length,
        averageDuration: weeklyWorkouts.length > 0 
          ? weeklyWorkouts.reduce((sum, w) => sum + new Date(w.duration).getMinutes(), 0) / weeklyWorkouts.length 
          : 0,
        restDays: weeklyRestDays.length,
        streak: weeklyWorkouts.length > 0 ? 1 : 0
      },
      monthlyStats: {
        workouts: monthlyWorkouts.length,
        averageDuration: monthlyWorkouts.length > 0 
          ? monthlyWorkouts.reduce((sum, w) => sum + new Date(w.duration).getMinutes(), 0) / monthlyWorkouts.length 
          : 0,
        restDays: monthlyRestDays.length,
        streak: monthlyWorkouts.length > 0 ? 1 : 0
      },
      workoutTypes,
      bestStreak: highestPulse,
      averageWorkoutsPerWeek,
      mostActiveDay,
      averageRestDaysPerWeek
    });
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-6">
          <ChartIcon className="w-6 h-6 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Progress Overview</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Overall Stats */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-rose-400" />
              <h3 className="text-slate-900 dark:text-white font-semibold">Overall Stats</h3>
            </div>
            <div className="space-y-2">
              <p className="text-slate-700 dark:text-slate-300">Total Workouts: {stats.totalWorkouts}</p>
              <p className="text-slate-700 dark:text-slate-300">Total Minutes: {stats.totalMinutes}</p>
              <p className="text-slate-700 dark:text-slate-300">Calories Burned: {stats.totalCalories}</p>
              <p className="text-slate-700 dark:text-slate-300">Highest Pulse: {stats.bestStreak}</p>
            </div>
          </div>

          {/* Weekly Stats */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-rose-400" />
              <h3 className="text-slate-900 dark:text-white font-semibold">This Week</h3>
            </div>
            <div className="space-y-2">
              <p className="text-slate-700 dark:text-slate-300">Workouts: {stats.weeklyStats.workouts}</p>
              <p className="text-slate-700 dark:text-slate-300">Avg Duration: {Math.round(stats.weeklyStats.averageDuration)} mins</p>
              <p className="text-slate-700 dark:text-slate-300">Rest Days: {stats.weeklyStats.restDays}</p>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-rose-400" />
              <h3 className="text-slate-900 dark:text-white font-semibold">This Month</h3>
            </div>
            <div className="space-y-2">
              <p className="text-slate-700 dark:text-slate-300">Workouts: {stats.monthlyStats.workouts}</p>
              <p className="text-slate-700 dark:text-slate-300">Avg Duration: {Math.round(stats.monthlyStats.averageDuration)} mins</p>
              <p className="text-slate-700 dark:text-slate-300">Rest Days: {stats.monthlyStats.restDays}</p>
            </div>
          </div>

          {/* Averages */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-rose-400" />
              <h3 className="text-slate-900 dark:text-white font-semibold">Averages</h3>
            </div>
            <div className="space-y-2">
              <p className="text-slate-700 dark:text-slate-300">Workouts per Week: {stats.averageWorkoutsPerWeek.toFixed(1)}</p>
              <p className="text-slate-700 dark:text-slate-300">Rest Days per Week: {stats.averageRestDaysPerWeek.toFixed(1)}</p>
              <p className="text-slate-700 dark:text-slate-300">Most Active Day: {stats.mostActiveDay}</p>
            </div>
          </div>

          {/* Workout Types */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Award className="w-5 h-5 text-rose-400" />
              <h3 className="text-slate-900 dark:text-white font-semibold">Workout Types</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(stats.workoutTypes).map(([type, count]) => (
                <p key={type} className="text-slate-700 dark:text-slate-300">
                  {type}: {count}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}