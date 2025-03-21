import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Users, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Friend {
  id: string;
  email: string;
  pulse_level: number;
  last_workout_at: string | null;
}

interface Friendship {
  friend: Friend;
}

export function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendInput, setFriendInput] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          friend:friend_id(
            id,
            email,
            pulse_level,
            last_workout_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to load friends');
        return;
      }

      setFriends((friendships as unknown as Friendship[]).map(f => f.friend).filter(Boolean));
    } catch (error) {
      toast.error('Failed to load friends');
    }
  }

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to add friends');
        return;
      }

      const friendId = friendInput.trim();

      if (!friendId) {
        toast.error('Please enter a User ID');
        return;
      }

      if (user.id === friendId) {
        toast.error("You can't add yourself as a friend");
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .rpc('get_profile_by_id', {
          lookup_id: friendId
        });

      if (profileError || !profiles || profiles.length === 0) {
        toast.error('User not found. Please check the ID and try again.');
        return;
      }

      const { data: existingFriendship, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', user.id)
        .eq('friend_id', friendId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        toast.error('Failed to check existing friendship');
        return;
      }

      if (existingFriendship) {
        toast.error('Already friends with this user');
        return;
      }

      const { error: addError } = await supabase
        .rpc('create_reciprocal_friendship', {
          user1_id: user.id,
          user2_id: friendId
        });

      if (addError) {
        console.error('Add friendship error:', addError);
        toast.error('Failed to add friend');
        return;
      }

      toast.success('Friend added successfully!');
      setFriendInput('');
      setShowAddFriend(false);
      loadFriends();
    } catch (error) {
      console.error('Add friend error:', error);
      toast.error('Failed to add friend');
    } finally {
      setIsLoading(false);
    }
  }

  const hasWorkedOutToday = (lastWorkoutAt: string | null) => {
    if (!lastWorkoutAt) return false;
    return format(new Date(lastWorkoutAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Users className="w-6 h-6 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Friends</h2>
        </div>
        <button
          onClick={() => setShowAddFriend(!showAddFriend)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <UserPlus className="w-5 h-5 text-rose-400" />
        </button>
      </div>

      {showAddFriend && (
        <div className="mb-6">
          <form onSubmit={addFriend} className="flex space-x-2">
            <input
              type="text"
              value={friendInput}
              onChange={(e) => setFriendInput(e.target.value)}
              placeholder="Enter friend's User ID"
              className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="flex items-center space-x-2 truncate">
                {hasWorkedOutToday(friend.last_workout_at) && (
                  <Flame className="w-4 h-4 text-rose-500 animate-pulse flex-shrink-0" />
                )}
                <span className="text-slate-900 dark:text-white truncate">{friend.email}</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-400 ml-4">
              {friend.pulse_level}
            </div>
          </div>
        ))}

        {friends.length === 0 && (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            <p>No friends added yet</p>
            <p className="text-sm mt-2">Add friends by asking them for their User ID. This is found under Settings.</p>
          </div>
        )}
      </div>
    </div>
  );
}