import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';
import { Flame } from 'lucide-react';

interface DayActivity {
  date: Date;
  hasWorkout: boolean;
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

    const { data, error } = await supabase
      .from('workouts')
      .select('completed_at')
      .eq('user_id', user?.id)
      .gte('completed_at', sevenDaysAgo.toISOString());

    if (error) return;

    const workoutDays = new Set(
      data.map(w => new Date(w.completed_at).toDateString())
    );

    const weekDays: DayActivity[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      weekDays.push({
        date,
        hasWorkout: workoutDays.has(date.toDateString())
      });
    }

    setDays(weekDays);
  }

  return (
    <div className="flex justify-between mt-4 gap-1">
      {days.map((day, i) => (
        <div key={i} className="flex-1 text-center">
          {day.hasWorkout ? (
            <div className="flex flex-col items-center">
              <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
              <span className="text-xs text-rose-400">{format(day.date, 'EEE')}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-4 h-4" />
              <span className="text-xs text-slate-600 dark:text-slate-400">{format(day.date, 'EEE')}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}