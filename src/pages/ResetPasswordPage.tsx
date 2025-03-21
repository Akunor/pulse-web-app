import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl w-full max-w-md text-center">
          <p className="text-slate-900 dark:text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <ResetPasswordForm onSuccess={handleSuccess} />
    </div>
  );
} 