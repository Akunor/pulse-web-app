import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, supabaseInitialized } from '../lib/supabase';

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get the access token from the URL
  const accessToken = searchParams.get('access_token');

  useEffect(() => {
    if (!accessToken) {
      navigate('/settings');
    }
  }, [accessToken, navigate]);

  if (!supabaseInitialized) {
    return (
      <div className="bg-white shadow rounded-lg p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reset Password</h1>
        <div className="bg-yellow-50 p-4 rounded-md">
          <p className="text-yellow-800">
            Please connect to Supabase using the "Connect to Supabase" button in the top right corner to enable password reset functionality.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError('Supabase is not configured. Please connect to Supabase first.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => navigate('/settings'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (!accessToken) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reset Password</h1>
      
      {success ? (
        <div className="bg-green-50 p-4 rounded-md mb-4">
          <p className="text-green-800">
            Password updated successfully! Redirecting...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Reset Password
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default UpdatePasswordPage;