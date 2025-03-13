import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password === confirmPassword;

  const isPasswordValid = 
    hasMinLength && 
    hasUpperCase && 
    hasLowerCase && 
    hasNumber && 
    hasSpecialChar;

  useEffect(() => {
    // Handle both URL parameters and hash fragments
    const handleResetToken = async () => {
      try {
        // Check if we're coming from a password reset email
        const type = router.query.type;
        if (type === 'recovery') {
          // Get the access token and refresh token
          const { data: { session }, error: recoveryError } = await supabase.auth.getSession();
          
          if (recoveryError) throw recoveryError;
          
          if (!session) {
            // If no session, try to exchange the recovery token
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: router.query.token_hash as string,
              type: 'recovery'
            });
            
            if (error) throw error;
          }
          
          setLoading(false);
          return;
        }

        // Handle other cases (existing code)
        const { error, error_description } = router.query;
        if (error || error_description) {
          throw new Error(error_description as string || 'Reset link has expired');
        }

        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (!accessToken) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Invalid reset link');
          }
        } else {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) throw sessionError;
        }

        setLoading(false);
      } catch (error) {
        console.error('Error in reset flow:', error);
        toast.error(error instanceof Error ? error.message : 'Invalid or expired reset link');
        router.push('/');
      }
    };

    // Only run if we have query parameters
    if (router.isReady) {
      handleResetToken();
    }
  }, [router.isReady, router.query, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error('Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      
      // Sign out after password reset to ensure clean state
      await supabase.auth.signOut();
      
      router.push('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl w-full max-w-md text-center">
          <p className="text-white">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6">Reset Your Password</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-400">
            <h3 className="font-medium text-slate-300">Password Requirements:</h3>
            <ul className="space-y-1">
              <li className={hasMinLength ? "text-green-500" : ""}>
                • At least 8 characters
              </li>
              <li className={hasUpperCase ? "text-green-500" : ""}>
                • At least one uppercase letter
              </li>
              <li className={hasLowerCase ? "text-green-500" : ""}>
                • At least one lowercase letter
              </li>
              <li className={hasNumber ? "text-green-500" : ""}>
                • At least one number
              </li>
              <li className={hasSpecialChar ? "text-green-500" : ""}>
                • At least one special character
              </li>
              <li className={passwordsMatch ? "text-green-500" : ""}>
                • Passwords match
              </li>
            </ul>
          </div>

          <button
            type="submit"
            className="w-full bg-rose-500 text-white py-2 px-4 rounded-lg hover:bg-rose-600 transition-colors"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
} 