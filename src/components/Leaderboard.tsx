import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Medal, Star } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  pulse_level: number;
  avatar_url?: string;
}

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [userNeighbors, setUserNeighbors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    try {
      // Get top 5 users
      const { data: topData, error: topError } = await supabase
        .from('profiles')
        .select('id, username, pulse_level, avatar_url')
        .order('pulse_level', { ascending: false })
        .limit(5);

      if (topError) throw topError;
      setTopUsers(topData || []);

      // Get current user's position and neighbors
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('pulse_level')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;

        // Get user's position
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('pulse_level', userData.pulse_level);

        if (countError) throw countError;
        const userRank = count || 0;
        setUserPosition(userRank);

        // Get neighbors (2 above and 2 below)
        const { data: neighborsData, error: neighborsError } = await supabase
          .from('profiles')
          .select('id, username, pulse_level, avatar_url')
          .order('pulse_level', { ascending: false })
          .range(Math.max(0, userRank - 3), userRank + 1);

        if (neighborsError) throw neighborsError;
        setUserNeighbors(neighborsData || []);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto"></div>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top 5 Users */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Top 5</h2>
        <div className="space-y-4">
          {topUsers.map((user, index) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {index === 0 && <Trophy className="w-6 h-6 text-yellow-500 absolute -top-2 -right-2" />}
                  {index === 1 && <Medal className="w-6 h-6 text-gray-400 absolute -top-2 -right-2" />}
                  {index === 2 && <Medal className="w-6 h-6 text-amber-600 absolute -top-2 -right-2" />}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{user.username}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Level {user.pulse_level}</div>
                </div>
              </div>
              <div className="text-rose-500 font-bold">{user.pulse_level}</div>
            </div>
          ))}
        </div>
      </div>

      {/* User's Position and Neighbors */}
      {user && userPosition && userPosition > 5 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Your Position</h2>
          <div className="space-y-4">
            {userNeighbors.map((neighbor, index) => (
              <div
                key={neighbor.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  neighbor.id === user.id
                    ? 'bg-rose-500/10 dark:bg-rose-500/20'
                    : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold">
                    {userPosition - 2 + index}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {neighbor.username}
                      {neighbor.id === user.id && (
                        <span className="ml-2 text-rose-500">
                          <Star className="w-4 h-4 inline" />
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Level {neighbor.pulse_level}</div>
                  </div>
                </div>
                <div className="text-rose-500 font-bold">{neighbor.pulse_level}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 