import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';
import { Flame, Moon, Circle } from 'lucide-react';

interface DayActivity {
  date: Date;
  hasWorkout: boolean;
  isRestDay: boolean;
}

export function WeeklyActivity() {
  const [days, setDays] = React.useState<DayActivity[]>([]);
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) return;
    loadWeeklyActivity();
  }, [user]);

  async function loadWeeklyActivity() {
    const sevenDaysAgo = subDays(new Date(), 7);

    // Get both workouts and rest days
    const [workoutsResponse, restDaysResponse] = await Promise.all([
      supabase
        .from('workouts')
        .select('completed_at')
        .eq('user_id', user?.id)
        .gte('completed_at', sevenDaysAgo.toISOString()),
      supabase
        .from('rest_days')
        .select('date')
        .eq('user_id', user?.id)
        .gte('date', sevenDaysAgo.toISOString())
    ]);

    if (workoutsResponse.error || restDaysResponse.error) return;

    const workoutDays = new Set(
      workoutsResponse.data.map(w => new Date(w.completed_at).toDateString())
    );

    const restDays = new Set(
      restDaysResponse.data.map(r => new Date(r.date).toDateString())
    );

    const weekDays: DayActivity[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateString = date.toDateString();
      weekDays.push({
        date,
        hasWorkout: workoutDays.has(dateString),
        isRestDay: restDays.has(dateString)
      });
    }

    setDays(weekDays);
  }

  const getActivityIcon = (day: DayActivity) => {
    if (day.hasWorkout) {
      return <Flame className="w-4 h-4 text-rose-500 animate-pulse" />;
    }
    if (day.isRestDay) {
      return <Moon className="w-4 h-4 text-blue-500" />;
    }
    return <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
  };

  const getActivityTextColor = (day: DayActivity) => {
    if (day.hasWorkout) return "text-rose-400";
    if (day.isRestDay) return "text-blue-400";
    return "text-slate-400 dark:text-slate-500";
  };

  return (
    <div className="flex justify-between mt-4 gap-1">
      {days.map((day, i) => (
        <div key={i} className="flex-1 text-center">
          <div className="flex flex-col items-center">
            {getActivityIcon(day)}
            <span className={`text-xs ${getActivityTextColor(day)}`}>
              {format(day.date, 'EEE')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}