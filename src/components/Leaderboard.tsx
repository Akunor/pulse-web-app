import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Medal, Star } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  pulse_level: number;
}

interface LeaderboardSectionProps {
  title: string;
  topUsers: UserProfile[];
  userPosition: number | null;
  userNeighbors: UserProfile[];
  currentUserId: string | null;
}

function LeaderboardSection({ title, topUsers, userPosition, userNeighbors, currentUserId }: LeaderboardSectionProps) {
  return (
    <div className="space-y-6">
      {/* Top 5 Users */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{title}</h2>
        <div className="space-y-4">
          {topUsers.map((user, index) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{user.email}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Level {user.pulse_level}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                {index === 1 && <Medal className="w-5 h-5 text-gray-400" />}
                {index === 2 && <Medal className="w-5 h-5 text-amber-600" />}
                <div className="text-rose-500 font-bold">{user.pulse_level}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User's Position and Neighbors */}
      {currentUserId && userPosition && userPosition > 5 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Your Position</h2>
          <div className="space-y-4">
            {userNeighbors.map((neighbor, index) => (
              <div
                key={neighbor.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  neighbor.id === currentUserId
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
                      {neighbor.id === currentUserId && (
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

export default function Leaderboard() {
  const [globalTopUsers, setGlobalTopUsers] = useState<UserProfile[]>([]);
  const [globalUserPosition, setGlobalUserPosition] = useState<number | null>(null);
  const [globalUserNeighbors, setGlobalUserNeighbors] = useState<UserProfile[]>([]);
  const [friendsTopUsers, setFriendsTopUsers] = useState<UserProfile[]>([]);
  const [friendsUserPosition, setFriendsUserPosition] = useState<number | null>(null);
  const [friendsUserNeighbors, setFriendsUserNeighbors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadLeaderboards();
  }, []);

  async function loadLeaderboards() {
    try {
      setLoading(true);
      
      // Load global leaderboard
      await loadGlobalLeaderboard();
      
      // Load friends leaderboard
      if (user) {
        await loadFriendsLeaderboard();
      }
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadGlobalLeaderboard() {
    // Get all users sorted by pulse_level
    const { data: allUsers, error: allUsersError } = await supabase
      .from('profiles')
      .select('id, email, pulse_level')
      .order('pulse_level', { ascending: false });

    if (allUsersError) throw allUsersError;

    // Set top 5 users
    setGlobalTopUsers(allUsers.slice(0, 5));

    // If user is logged in, get their position and neighbors
    if (user) {
      const userRank = allUsers.findIndex(u => u.id === user.id) + 1;
      setGlobalUserPosition(userRank);

      if (userRank > 5) {
        const startIndex = Math.max(0, userRank - 3);
        const endIndex = Math.min(allUsers.length, userRank + 1);
        setGlobalUserNeighbors(allUsers.slice(startIndex, endIndex));
      }
    }
  }

  async function loadFriendsLeaderboard() {
    if (!user) return;

    // Get friend IDs
    const { data: friendships, error: friendshipError } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    if (friendshipError) throw friendshipError;

    const friendIds = friendships?.map((f: { friend_id: string }) => f.friend_id) || [];
    friendIds.push(user.id); // Include current user

    // Get profiles for friends
    const { data: friendProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, pulse_level')
      .in('id', friendIds)
      .order('pulse_level', { ascending: false });

    if (profilesError) throw profilesError;

    // Set top 5 friends
    setFriendsTopUsers(friendProfiles.slice(0, 5));

    // Get user's position and neighbors
    const userRank = friendProfiles.findIndex(p => p.id === user.id) + 1;
    setFriendsUserPosition(userRank);

    if (userRank > 5) {
      const startIndex = Math.max(0, userRank - 3);
      const endIndex = Math.min(friendProfiles.length, userRank + 1);
      setFriendsUserNeighbors(friendProfiles.slice(startIndex, endIndex));
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
    <div className="space-y-8">
      {/* Global Leaderboard */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Global Leaderboard</h2>
        <LeaderboardSection
          title="Top 5"
          topUsers={globalTopUsers}
          userPosition={globalUserPosition}
          userNeighbors={globalUserNeighbors}
          currentUserId={user?.id || null}
        />
      </div>

      {/* Friends Leaderboard */}
      {user && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Friends Leaderboard</h2>
          <LeaderboardSection
            title="Top 5 Friends"
            topUsers={friendsTopUsers}
            userPosition={friendsUserPosition}
            userNeighbors={friendsUserNeighbors}
            currentUserId={user.id}
          />
        </div>
      )}
    </div>
  );
} 