import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Logo } from '../components/Logo';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the recovery token from the URL
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a valid session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.error('No valid session:', error);
          toast.error('Invalid or expired password reset link');
          // Sign out and clear any existing session
          await supabase.auth.signOut();
          localStorage.setItem('showAuthModal', 'true');
          navigate('/');
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking session:', error);
        toast.error('Invalid or expired password reset link');
        // Sign out and clear any existing session
        await supabase.auth.signOut();
        localStorage.setItem('showAuthModal', 'true');
        navigate('/');
      }
    };

    checkSession();
  }, [navigate]);

  const handleSuccess = () => {
    toast.success('Password reset successful! Please log in with your new password.');
    // Store a flag in localStorage to trigger the auth modal
    localStorage.setItem('showAuthModal', 'true');
    // Ensure we're signed out
    supabase.auth.signOut();
    setTimeout(() => navigate('/'), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl w-full max-w-md text-center shadow-lg">
          <Logo className="w-24 h-24 text-rose-500 mx-auto mb-6" variant="main" />
          <p className="text-slate-900 dark:text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="w-24 h-24 text-rose-500 mx-auto mb-4" variant="main" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Reset Password</h1>
          <p className="text-slate-600 dark:text-slate-400">Enter your new password below</p>
        </div>
        <ResetPasswordForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
} 