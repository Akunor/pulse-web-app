import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Trophy, Target, Award, Lock } from 'lucide-react';

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
  const [nextNextMilestone, setNextNextMilestone] = useState<Achievement | null>(null);
  const [lastUnlocked, setLastUnlocked] = useState<Achievement | null>(null);

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

      // Find next milestone and next-next milestone
      const unlockedAchievements = achievementsWithStatus.filter(a => a.unlocked);
      const lockedAchievements = achievementsWithStatus.filter(a => 
        !a.unlocked && 
        a.required_pulse > currentPulse
      );
      
      setLastUnlocked(unlockedAchievements[unlockedAchievements.length - 1] || null);
      setNextMilestone(lockedAchievements[0] || null);
      setNextNextMilestone(lockedAchievements[1] || null);
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
            
            {/* Achievement Progress Bar */}
            <div className="mt-8 relative">
              <div className="h-2 bg-rose-200 dark:bg-slate-600 rounded-full overflow-hidden">
                {/* Main progress fill */}
                <div 
                  className="h-full bg-rose-500 dark:bg-rose-400 transition-all duration-500"
                  style={{ 
                    width: nextMilestone 
                      ? `${Math.min((currentPulse / nextMilestone.required_pulse) * 85, 85)}%` 
                      : '100%'
                  }}
                />
                {/* Dashed line for gap to locked achievement */}
                {nextMilestone && nextNextMilestone && (
                  <div 
                    className="absolute top-0 bottom-0 flex items-center"
                    style={{ 
                      left: '85%',
                      right: '15%'
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-between">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="h-full w-1 bg-rose-500 dark:bg-rose-400 rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Achievement Icons */}
              <div className="absolute -top-6 left-0 right-0 flex items-center">
                {/* Last Unlocked Achievement */}
                {lastUnlocked && (
                  <div className="flex flex-col items-center" style={{ marginLeft: '-16px' }}>
                    <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full border-2 border-rose-500 dark:border-rose-400 flex items-center justify-center">
                      <span className="text-xl">{lastUnlocked.badge_icon}</span>
                    </div>
                  </div>
                )}

                {/* Next Achievement */}
                {nextMilestone && (
                  <div className="flex flex-col items-center absolute" style={{ right: '15%' }}>
                    <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full border-2 border-rose-500 dark:border-rose-400 flex items-center justify-center">
                      <span className="text-xl">🎁</span>
                    </div>
                  </div>
                )}

                {/* Next-Next Achievement */}
                {nextNextMilestone && (
                  <div className="flex flex-col items-center absolute" style={{ right: '-16px' }}>
                    <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Achievement Labels */}
              <div className="absolute -bottom-6 left-0 right-0 flex items-center">
                {/* Last Unlocked Achievement Label */}
                {lastUnlocked && (
                  <div className="flex flex-col items-center" style={{ marginLeft: '-16px' }}>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {lastUnlocked.name}
                    </span>
                  </div>
                )}

                {/* Next Achievement Label */}
                {nextMilestone && (
                  <div className="flex flex-col items-center absolute" style={{ right: '15%' }}>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {nextMilestone.name}
                    </span>
                  </div>
                )}

                {/* Next-Next Achievement Label */}
                {nextNextMilestone && (
                  <div className="flex flex-col items-center absolute" style={{ right: '-16px' }}>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      ???
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Text */}
            {nextMilestone && (
              <p className="text-sm text-rose-600 dark:text-rose-400 mt-6">
                {nextMilestone.required_pulse - currentPulse} Pulse to unlock {nextMilestone.name}!
              </p>
            )}
          </div>
        </div>

        {/* Unlocked Achievements */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Your Achievements</h3>
          {achievements
            .filter(a => a.unlocked)
            .sort((a, b) => b.required_pulse - a.required_pulse)
            .map((achievement) => (
              <div
                key={achievement.type}
                className="bg-white dark:bg-slate-700 rounded-lg p-6 border-2 border-rose-500 dark:border-rose-400"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-rose-100 dark:bg-slate-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl">{achievement.badge_icon}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {achievement.name}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {achievement.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {achievement.required_pulse} Pulse
                      </span>
                      <span className="text-sm text-green-600 dark:text-green-400">
                        Unlocked {new Date(achievement.unlocked_at!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
} 