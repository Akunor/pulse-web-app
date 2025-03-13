import React, { useState } from 'react';
import { 
  format, 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay
} from 'date-fns';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface WorkoutDay {
  date: Date;
  workouts: number;
}

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workoutDays, setWorkoutDays] = React.useState<WorkoutDay[]>([]);
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) return;
    loadWorkoutDays();
  }, [user, currentDate]);

  async function loadWorkoutDays() {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const { data, error } = await supabase
      .from('workouts')
      .select('completed_at')
      .eq('user_id', user?.id)
      .gte('completed_at', start.toISOString())
      .lte('completed_at', end.toISOString());

    if (error) return;

    const workoutsByDay = data.reduce((acc: { [key: string]: number }, workout) => {
      const date = new Date(workout.completed_at).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const monthDays = eachDayOfInterval({ start, end });
    const days: WorkoutDay[] = monthDays.map(date => ({
      date,
      workouts: workoutsByDay[date.toDateString()] || 0
    }));

    setWorkoutDays(days);
  }

  const previousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthStart = startOfMonth(currentDate);
  const monthDays = eachDayOfInterval({
    start: monthStart,
    end: endOfMonth(currentDate)
  });

  const emptyDays = monthStart.getDay();
  const emptyStartCells = Array(emptyDays).fill(null);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="w-6 h-6 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Activity Calendar</h2>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <span className="text-slate-900 dark:text-white font-medium">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm text-slate-600 dark:text-slate-400 py-2">
            {day}
          </div>
        ))}
        
        {emptyStartCells.map((_, index) => (
          <div key={`empty-start-${index}`} className="aspect-square" />
        ))}

        {monthDays.map((day, i) => {
          const workoutDay = workoutDays.find(wd => isSameDay(wd.date, day));
          return (
            <div
              key={i}
              className={`aspect-square rounded-lg flex items-center justify-center ${
                isSameMonth(day, currentDate)
                  ? workoutDay?.workouts > 0
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700/30 text-slate-900 dark:text-slate-300'
                  : 'opacity-50 bg-slate-50 dark:bg-slate-700/10 text-slate-500'
              }`}
            >
              <span className="text-sm">{format(day, 'd')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}