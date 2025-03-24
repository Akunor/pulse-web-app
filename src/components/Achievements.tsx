import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Trophy, Target, Award } from 'lucide-react';

interface Achievement {
  type: string;
  name: string;
  description: string;
  required_pulse: number;
  badge_icon: string;
  color_theme: string;
  unlocked: boolean;
  unlocked_at?: string;
}

interface AchievementsProps {
  currentPulse: number;
}

export function Achievements({ currentPulse }: AchievementsProps) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [nextMilestone, setNextMilestone] = useState<Achievement | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAchievements();
  }, [user, currentPulse]);

  async function loadAchievements() {
    // Get all achievement metadata
    const { data: metadata } = await supabase
      .from('achievement_metadata')
      .select('*')
      .order('required_pulse', { ascending: true });

    // Get user's unlocked achievements
    const { data: unlocked } = await supabase
      .from('achievements')
      .select('milestone, unlocked_at')
      .eq('user_id', user?.id);

    if (metadata) {
      const achievementsWithStatus = metadata.map(meta => ({
        ...meta,
        unlocked: unlocked?.some(u => u.milestone === meta.required_pulse) || false,
        unlocked_at: unlocked?.find(u => u.milestone === meta.required_pulse)?.unlocked_at
      }));

      setAchievements(achievementsWithStatus);

      // Find next milestone
      const next = achievementsWithStatus.find(a => !a.unlocked);
      setNextMilestone(next || null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Trophy className="w-6 h-6 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Achievements</h2>
        </div>

        {/* Progress Overview */}
        <div className="bg-rose-100 dark:bg-slate-700 p-6 rounded-lg border-2 border-rose-500 dark:border-rose-400 mb-8">
          <div className="text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400 font-semibold">Current Pulse</p>
            <p className="text-4xl font-bold text-rose-600 dark:text-rose-400">{currentPulse}</p>
            {nextMilestone && (
              <div className="mt-4">
                <p className="text-sm text-rose-600 dark:text-rose-400">Next Milestone</p>
                <p className="text-xl font-semibold text-rose-600 dark:text-rose-400">
                  {nextMilestone.name} ({nextMilestone.required_pulse} Pulse)
                </p>
                <div className="mt-2 h-2 bg-rose-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 dark:bg-rose-400 transition-all duration-500"
                    style={{ 
                      width: `${Math.min((currentPulse / nextMilestone.required_pulse) * 100, 100)}%` 
                    }}
                  />
                </div>
                <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">
                  {nextMilestone.required_pulse - currentPulse} Pulse to go!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((achievement) => (
            <div
              key={achievement.type}
              className={`bg-white dark:bg-slate-700 rounded-lg p-6 border-2 ${
                achievement.unlocked
                  ? `border-${achievement.color_theme.split('-')[1]} dark:border-${achievement.color_theme.split('-')[1]}`
                  : 'border-slate-200 dark:border-slate-600'
              }`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">{achievement.badge_icon}</span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {achievement.name}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {achievement.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {achievement.required_pulse} Pulse
                </span>
                {achievement.unlocked && (
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Unlocked {new Date(achievement.unlocked_at!).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 