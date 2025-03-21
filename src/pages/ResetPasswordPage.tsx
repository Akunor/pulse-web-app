import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  
  // Get the recovery token from the URL
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token || type !== 'recovery') {
        toast.error('Invalid or expired password reset link');
        navigate('/');
        return;
      }

      try {
        // Verify the recovery token
        const { error } = await supabase.auth.verifyOtp({
          token,
          type: 'recovery'
        });

        if (error) throw error;

        setIsVerifying(false);
      } catch (error) {
        console.error('Error verifying token:', error);
        toast.error('Invalid or expired password reset link');
        navigate('/');
      }
    };

    verifyToken();
  }, [token, type, navigate]);

  const handleSuccess = () => {
    setTimeout(() => navigate('/'), 2000);
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl w-full max-w-md text-center">
          <p className="text-slate-900 dark:text-white">Verifying reset link...</p>
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