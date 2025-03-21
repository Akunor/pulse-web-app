import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Get the access token from either the search params or hash fragment
  const accessToken = searchParams.get('access_token') || 
                     location.hash.replace('#access_token=', '');

  useEffect(() => {
    if (!accessToken) {
      toast.error('Invalid or expired password reset link');
      navigate('/');
    }
  }, [accessToken, navigate]);

  const handleSuccess = () => {
    setTimeout(() => navigate('/'), 2000);
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