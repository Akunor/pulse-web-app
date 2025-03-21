import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface LeaderboardEntry {
  id: string;
  email: string;
  pulse_level: number;
  streak_days: number;
  avatar_url?: string;
}

export default function Leaderboard() {
  const [globalRankings, setGlobalRankings] = useState<LeaderboardEntry[]>([]);
  const [friendsRankings, setFriendsRankings] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchGlobalRankings();
    if (user) {
      fetchFriendsRankings();
    }
  }, [user]);

  const fetchGlobalRankings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, pulse_level, streak_days, avatar_url')
        .order('pulse_level', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGlobalRankings(data || []);
    } catch (error) {
      console.error('Error fetching global rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendsRankings = async () => {
    try {
      // First get all friend IDs
      const { data: friendships, error: friendshipError } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user?.id);

      if (friendshipError) throw friendshipError;

      const friendIds = friendships?.map((f: { friend_id: string }) => f.friend_id) || [];
      if (user?.id) {
        friendIds.push(user.id); // Include current user
      }

      // Then get profiles for all friends
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, pulse_level, streak_days, avatar_url')
        .in('id', friendIds)
        .order('pulse_level', { ascending: false });

      if (profileError) throw profileError;
      setFriendsRankings(profiles || []);
    } catch (error) {
      console.error('Error fetching friends rankings:', error);
    }
  };

  const renderRankingList = (rankings: LeaderboardEntry[]) => {
    return rankings.map((entry, index) => (
      <div
        key={entry.id}
        className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold w-8 text-slate-900 dark:text-white">{index + 1}</span>
          <Avatar>
            <AvatarImage src={entry.avatar_url} />
            <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white">
              {entry.email.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-slate-900 dark:text-white">{entry.email}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {entry.streak_days} day streak
            </div>
          </div>
        </div>
        <div className="text-xl font-bold text-rose-500">
          {entry.pulse_level} Pulse
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <Card className="bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-slate-600 dark:text-slate-400">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="global" className="w-full">
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
            {renderRankingList(globalRankings)}
          </TabsContent>
          <TabsContent value="friends" className="mt-4">
            {renderRankingList(friendsRankings)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 