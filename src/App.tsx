import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Calendar as CalendarIcon, 
  LineChart, 
  User,
  Activity,
  LogOut,
  Copy,
  Check,
  Settings as SettingsIcon,
  CheckCircle,
  AlertCircle,
  Trophy,
  Menu,
  X
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
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ResetPasswordPage from './pages/ResetPasswordPage';
import LeaderboardPage from './pages/LeaderboardPage';

// Add this near your other interfaces/types
interface BirthdayRange {
  start: Date;
  end: Date;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [userProfile, setUserProfile] = useState({
    pulseLevel: 0,
    lastWorkout: null,
    restDayUsed: false
  });
  const [copied, setCopied] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Add effect to handle auth modal flag
  useEffect(() => {
    const shouldShowAuthModal = localStorage.getItem('showAuthModal');
    if (shouldShowAuthModal === 'true') {
      setShowAuthModal(true);
      localStorage.removeItem('showAuthModal');
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  async function loadUserProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('pulse_level, last_workout_at, rest_day_used')
      .eq('id', user?.id)
      .single();

    if (error) {
      toast.error('Failed to load profile');
      return;
    }

    setUserProfile({
      pulseLevel: data.pulse_level || 0,
      lastWorkout: data.last_workout_at,
      restDayUsed: data.rest_day_used || false
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

  // Add this function to check birthday range
  const isInBirthdayRange = (userId: string): boolean => {
    // Using your ID for testing
    if (userId !== '079f3c6e-1362-4e5a-8110-b161691b4102') return false;

    const today = new Date();
    // March 16th
    const birthday = new Date(today.getFullYear(), 2, 16); // Month is 0-based, so 2 = March
    const rangeEnd = new Date(birthday);
    rangeEnd.setDate(birthday.getDate() + 3);

    // For testing: log the date range
    console.log('Birthday:', birthday.toLocaleDateString());
    console.log('Range End:', rangeEnd.toLocaleDateString());
    console.log('Today:', today.toLocaleDateString());
    console.log('Is in range:', today >= birthday && today <= rangeEnd);

    return today >= birthday && today <= rangeEnd;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'workouts':
        return <WorkoutList onNavigateToWorkouts={() => setActiveTab('workouts')} />;
      case 'calendar':
        return <Calendar />;
      case 'progress':
        return <Progress />;
      case 'settings':
        return <Settings />;
      case 'leaderboard':
        return <LeaderboardPage />;
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
                
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-6 w-full">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Rest Day Status</h3>
                    <div className="flex items-center gap-2">
                      {userProfile.restDayUsed ? (
                        <>
                          <AlertCircle className="w-5 h-5 text-rose-500" />
                          <span className="text-sm font-medium text-rose-500">Used</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 text-sky-500" />
                          <span className="text-sm font-medium text-sky-500">Available</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {userProfile.restDayUsed 
                      ? "You've used your rest day. Your Pulse will start decreasing if you don't work out today."
                      : "You have a rest day available, everyone needs one once in a while!"}
                  </p>
                </div>
                
                <div className="w-full">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Last 7 Days</h3>
                  <WeeklyActivity />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
                <WorkoutList onNavigateToWorkouts={() => setActiveTab('workouts')} />
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
                <FriendsList />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div className={`min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200`}>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        
        <header className="fixed top-0 left-0 right-0 z-10 bg-gradient-to-r from-rose-500 to-orange-500 text-white p-2">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Logo className="h-20 w-auto py-1" variant="main" />
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm">{user.email}</span>
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

        <main className="max-w-7xl mx-auto p-4 pt-32 pb-24">
          {user && isInBirthdayRange(user.id) && (
            <div className="bg-rose-500/10 rounded-xl p-6 mb-6 text-center animate-fade-in">
              <div className="text-2xl font-bold text-rose-500 mb-2">
                🎉 Happy Birthday! 🎉
              </div>
              <div className="text-slate-300">
                Dear Lichey, happy birthday! I know this isn't the most glamorous birthday gift, but I hope it meets the standard for a cutesy little present. I love you so much, and I miss you every single day. I can't wait to see you again, and I promise I'll get you something super special for your next birthday. Lots of worldwide love, Samuel ❤️
              </div>
            </div>
          )}
          
          {user ? (
            renderContent()
          ) : (
            <div className="text-center py-20">
              <Logo className="w-24 h-24 text-rose-500 mx-auto mb-8" variant="main" />
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
          <>
            {/* Mobile Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 px-4 py-2">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`p-2 flex flex-col items-center ${activeTab === 'dashboard' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  {activeTab === 'dashboard' ? (
                    <>
                      <Logo className="w-6 h-6" variant="small" />
                      <span className="text-xs">Pulse</span>
                    </>
                  ) : activeTab === 'workouts' ? (
                    <>
                      <Dumbbell className="w-6 h-6" />
                      <span className="text-xs">Workouts</span>
                    </>
                  ) : activeTab === 'calendar' ? (
                    <>
                      <CalendarIcon className="w-6 h-6" />
                      <span className="text-xs">Calendar</span>
                    </>
                  ) : activeTab === 'progress' ? (
                    <>
                      <LineChart className="w-6 h-6" />
                      <span className="text-xs">Progress</span>
                    </>
                  ) : activeTab === 'leaderboard' ? (
                    <>
                      <Trophy className="w-6 h-6" />
                      <span className="text-xs">Leaderboard</span>
                    </>
                  ) : activeTab === 'settings' ? (
                    <>
                      <SettingsIcon className="w-6 h-6" />
                      <span className="text-xs">Settings</span>
                    </>
                  ) : null}
                </button>
                <button 
                  onClick={() => setShowNavMenu(!showNavMenu)}
                  className="p-2 text-slate-600 dark:text-slate-400"
                >
                  {showNavMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {showNavMenu && (
              <div className="md:hidden fixed bottom-16 left-0 right-0 z-10 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
                <div className="grid grid-cols-3 gap-4">
                  <button 
                    onClick={() => {
                      setActiveTab('dashboard');
                      setShowNavMenu(false);
                    }}
                    className={`p-2 flex flex-col items-center ${activeTab === 'dashboard' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    <Logo className="w-6 h-6" variant="small" />
                    <span className="text-xs">Pulse</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('workouts');
                      setShowNavMenu(false);
                    }}
                    className={`p-2 flex flex-col items-center ${activeTab === 'workouts' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    <Dumbbell className="w-6 h-6" />
                    <span className="text-xs">Workouts</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('calendar');
                      setShowNavMenu(false);
                    }}
                    className={`p-2 flex flex-col items-center ${activeTab === 'calendar' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    <CalendarIcon className="w-6 h-6" />
                    <span className="text-xs">Calendar</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('progress');
                      setShowNavMenu(false);
                    }}
                    className={`p-2 flex flex-col items-center ${activeTab === 'progress' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    <LineChart className="w-6 h-6" />
                    <span className="text-xs">Progress</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('leaderboard');
                      setShowNavMenu(false);
                    }}
                    className={`p-2 flex flex-col items-center ${activeTab === 'leaderboard' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    <Trophy className="w-6 h-6" />
                    <span className="text-xs">Leaderboard</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('settings');
                      setShowNavMenu(false);
                    }}
                    className={`p-2 flex flex-col items-center ${activeTab === 'settings' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    <SettingsIcon className="w-6 h-6" />
                    <span className="text-xs">Settings</span>
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Navigation */}
            <nav className="hidden md:flex fixed bottom-0 left-0 right-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 px-4 py-2">
              <div className="max-w-7xl mx-auto flex justify-around w-full">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`p-2 flex flex-col items-center ${activeTab === 'dashboard' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  <Logo className="w-6 h-6" variant="small" />
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
                  onClick={() => setActiveTab('leaderboard')}
                  className={`p-2 flex flex-col items-center ${activeTab === 'leaderboard' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  <Trophy className="w-6 h-6" />
                  <span className="text-xs">Leaderboard</span>
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
          </>
        )}
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;