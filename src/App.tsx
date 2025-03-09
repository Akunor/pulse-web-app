import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Calendar as CalendarIcon, 
  LineChart, 
  User, 
  Heart,
  Activity,
  LogOut,
  Copy,
  Check,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { AuthModal } from './components/AuthModal';
import { FriendsList } from './components/FriendsList';
import { WorkoutList } from './components/WorkoutList';
import { Calendar } from './components/Calendar';
import { Progress } from './components/Progress';
import { Settings } from './components/Settings';
import { WeeklyActivity } from './components/WeeklyActivity';
import { Logo } from './components/Logo';
import { supabase } from './lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userProfile, setUserProfile] = useState({
    pulseLevel: 0,
    lastWorkout: null
  });
  const [copied, setCopied] = useState(false);
  const { user, signOut } = useAuth();
  
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  async function loadUserProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('pulse_level, last_workout_at')
      .eq('id', user?.id)
      .single();

    if (error) {
      toast.error('Failed to load profile');
      return;
    }

    setUserProfile({
      pulseLevel: data.pulse_level || 0,
      lastWorkout: data.last_workout_at
    });
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const copyUserId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast.success('User ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy ID');
    }
  };

  const hasWorkedOutToday = userProfile.lastWorkout && 
    format(new Date(userProfile.lastWorkout), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const renderContent = () => {
    switch (activeTab) {
      case 'workouts':
        return <WorkoutList />;
      case 'calendar':
        return <Calendar />;
      case 'progress':
        return <Progress />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className={`absolute inset-0 rounded-full ${
                    hasWorkedOutToday 
                      ? 'bg-gradient-to-r from-rose-500 to-orange-500 animate-pulse' 
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                  <div className="absolute inset-1 rounded-full bg-white dark:bg-slate-800" />
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <div className="text-7xl font-bold text-slate-900 dark:text-white">{userProfile.pulseLevel}</div>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your Pulse</h2>
                <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
                  {hasWorkedOutToday 
                    ? "You've worked out today! Keep the momentum going!" 
                    : "Complete a workout to increase your Pulse"}
                </p>
                
                <div className="w-full">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Last 7 Days</h3>
                  <WeeklyActivity />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <WorkoutList />
              <FriendsList />
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200`}>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      
      <header className="fixed top-0 left-0 right-0 z-10 bg-gradient-to-r from-rose-500 to-orange-500 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Logo className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold">Pulse</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex flex-col items-end">
                  <span className="text-sm">{user.email}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-white/80">ID: {user.id}</span>
                    <button
                      onClick={copyUserId}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                      title="Copy ID"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <LogOut className="w-6 h-6" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <User className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 pt-24 pb-24">
        {user ? (
          renderContent()
        ) : (
          <div className="text-center py-20">
            <Logo className="w-24 h-24 text-rose-500 mx-auto mb-8" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Welcome to Pulse</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">Sign in to track your fitness journey and connect with friends</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-rose-500 text-white py-2 px-6 rounded-lg hover:bg-rose-600 transition-colors"
            >
              Get Started
            </button>
          </div>
        )}
      </main>

      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 px-4 py-2">
          <div className="max-w-7xl mx-auto flex justify-around">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`p-2 flex flex-col items-center ${activeTab === 'dashboard' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <Logo className="w-6 h-6" />
              <span className="text-xs">Pulse</span>
            </button>
            <button 
              onClick={() => setActiveTab('workouts')}
              className={`p-2 flex flex-col items-center ${activeTab === 'workouts' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <Dumbbell className="w-6 h-6" />
              <span className="text-xs">Workouts</span>
            </button>
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`p-2 flex flex-col items-center ${activeTab === 'calendar' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <CalendarIcon className="w-6 h-6" />
              <span className="text-xs">Calendar</span>
            </button>
            <button 
              onClick={() => setActiveTab('progress')}
              className={`p-2 flex flex-col items-center ${activeTab === 'progress' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <LineChart className="w-6 h-6" />
              <span className="text-xs">Progress</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`p-2 flex flex-col items-center ${activeTab === 'settings' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <SettingsIcon className="w-6 h-6" />
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

export default App;