import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Medal, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface UserProfile {
  id: string;
  email: string;
  pulse_level: number;
  avatar_url?: string;
}

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [userNeighbors, setUserNeighbors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('global');
  const { user } = useAuth();

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  async function loadLeaderboard() {
    try {
      let query = supabase
        .from('profiles')
        .select('id, email, pulse_level, avatar_url')
        .order('pulse_level', { ascending: false });

      let friendIds: string[] = [];
      // If in friends tab, filter for friends only
      if (activeTab === 'friends' && user) {
        // First get all friend IDs
        const { data: friendships, error: friendshipError } = await supabase
          .from('friendships')
          .select('friend_id')
          .eq('user_id', user.id);

        if (friendshipError) throw friendshipError;

        friendIds = friendships?.map((f: { friend_id: string }) => f.friend_id) || [];
        if (user.id) {
          friendIds.push(user.id); // Include current user
        }

        query = query.in('id', friendIds);
      }

      // Get top 5 users
      const { data: topData, error: topError } = await query.limit(5);

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
          .gte('pulse_level', userData.pulse_level)
          .in('id', activeTab === 'friends' ? friendIds : []);

        if (countError) throw countError;
        const userRank = count || 0;
        setUserPosition(userRank);

        // Get neighbors (2 above and 2 below)
        const { data: neighborsData, error: neighborsError } = await query
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-700">
          <TabsTrigger 
            value="global"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-rose-500"
          >
            Global
          </TabsTrigger>
          <TabsTrigger 
            value="friends"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-rose-500"
          >
            Friends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-4">
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
                        <div className="font-medium text-slate-900 dark:text-white">{user.email}</div>
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
                            {neighbor.email}
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
        </TabsContent>

        <TabsContent value="friends" className="mt-4">
          <div className="space-y-6">
            {/* Top 5 Friends */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Top 5 Friends</h2>
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
                        <div className="font-medium text-slate-900 dark:text-white">{user.email}</div>
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
                            {neighbor.email}
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
        </TabsContent>
      </Tabs>
    </div>
  );
} 