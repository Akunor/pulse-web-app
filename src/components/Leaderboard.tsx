import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Medal, Star, Users } from 'lucide-react';

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
  showEmptyMessage?: boolean;
}

function LeaderboardSection({ title, topUsers, userPosition, userNeighbors, currentUserId, showEmptyMessage }: LeaderboardSectionProps) {
  if (showEmptyMessage) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6">
        <div className="text-center py-6 sm:py-8">
          <Users className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
            Add some friends on Pulse to start competing and earning prizes!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top 5 Users */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">{title}</h2>
        <div className="space-y-3 sm:space-y-4">
          {topUsers.map((user, index) => (
            <div
              key={user.id}
              className={`flex items-center justify-between p-3 sm:p-4 rounded-lg transition-colors ${
                user.id === currentUserId
                  ? 'bg-rose-500/10 dark:bg-rose-500/20'
                  : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 flex items-center justify-center text-white text-sm sm:text-base font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white text-sm sm:text-base truncate">
                    {user.email}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-rose-500 whitespace-nowrap">
                        <Star className="w-3 h-3 sm:w-4 sm:h-4 inline" />
                        You
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-2 sm:ml-4 flex-shrink-0">
                {index === 0 && <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />}
                {index === 1 && <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />}
                {index === 2 && <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />}
                <div className="text-rose-500 font-bold text-sm sm:text-base">{user.pulse_level}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User's Position and Neighbors */}
      {currentUserId && userPosition && userPosition > 5 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="text-slate-400 dark:text-slate-500">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {userNeighbors.map((neighbor, index) => (
              <div
                key={neighbor.id}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-lg transition-colors ${
                  neighbor.id === currentUserId
                    ? 'bg-rose-500/10 dark:bg-rose-500/20'
                    : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 flex items-center justify-center text-white text-sm sm:text-base font-bold flex-shrink-0">
                    {userPosition - 1 + index}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white text-sm sm:text-base truncate">
                      {neighbor.email}
                      {neighbor.id === currentUserId && (
                        <span className="ml-2 text-rose-500 whitespace-nowrap">
                          <Star className="w-3 h-3 sm:w-4 sm:h-4 inline" />
                          You
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-rose-500 font-bold text-sm sm:text-base ml-2 sm:ml-4 flex-shrink-0">{neighbor.pulse_level}</div>
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
  const [error, setError] = useState<string | null>(null);
  const [hasFriends, setHasFriends] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadLeaderboards();
  }, []);

  async function loadLeaderboards() {
    try {
      setLoading(true);
      setError(null);
      await loadGlobalLeaderboard();
      if (user) {
        await loadFriendsLeaderboard();
      }
    } catch (error) {
      console.error('Error loading leaderboards:', error);
      setError(error instanceof Error ? error.message : 'Failed to load leaderboards');
    } finally {
      setLoading(false);
    }
  }

  async function loadGlobalLeaderboard() {
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
        const startIndex = Math.max(0, userRank - 2);
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

    // Set hasFriends based on whether there are any friends
    setHasFriends(friendIds.length > 1);

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
      const startIndex = Math.max(0, userRank - 2);
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

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Global Leaderboard */}
      <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-xl p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-6 sm:mb-8 flex items-center">
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mr-2 sm:mr-3" />
          Global Leaderboard
        </h2>
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
        <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-xl p-4 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-6 sm:mb-8 flex items-center">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500 mr-2 sm:mr-3" />
            Friends Leaderboard
          </h2>
          <LeaderboardSection
            title="Top 5 Friends"
            topUsers={friendsTopUsers}
            userPosition={friendsUserPosition}
            userNeighbors={friendsUserNeighbors}
            currentUserId={user.id}
            showEmptyMessage={!hasFriends}
          />
        </div>
      )}
    </div>
  );
} 