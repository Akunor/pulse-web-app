import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase, supabaseInitialized } from '../lib/supabase';

function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPasswordRequest = async () => {
    if (!supabase) {
      setError('Supabase is not configured. Please connect to Supabase first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error('No user email found');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!supabaseInitialized) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        <div className="bg-yellow-50 p-4 rounded-md">
          <p className="text-yellow-800">
            Please connect to Supabase using the "Connect to Supabase" button in the top right corner to enable password reset functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-4 rounded-md mb-4">
          <p className="text-green-800">
            Password reset link has been sent to your email address.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleResetPasswordRequest}
          disabled={loading}
          className="w-full flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock className="w-5 h-5 text-gray-600 mr-3" />
          <div className="text-left">
            <h2 className="text-lg font-medium text-gray-900">Password Settings</h2>
            <p className="text-sm text-gray-500">
              {loading ? 'Sending reset link...' : 'Request a password reset link'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

export default SettingsPage;