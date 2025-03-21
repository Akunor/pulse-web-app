import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('access_token');

  useEffect(() => {
    if (!accessToken) {
      toast.error('Invalid or expired password reset link');
      navigate('/login');
    }
  }, [accessToken, navigate]);

  const handleSuccess = () => {
    setTimeout(() => navigate('/login'), 2000);
  };

  if (!accessToken) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <ResetPasswordForm onSuccess={handleSuccess} />
    </div>
  );
} 