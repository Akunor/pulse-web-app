import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function DeleteAccount() {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    if (confirmationText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      // Call the delete_user_account function with the user ID
      const { data, error } = await supabase
        .rpc('delete_user_account', { user_id: user.id });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (data) {
        toast.success('Account deleted successfully');
        // Sign out and redirect to home page
        await supabase.auth.signOut();
        window.location.href = '/';
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setShowConfirmation(false);
      setConfirmationText('');
    }
  };

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Trash2 className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">Delete Account</h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              Permanently delete your account and all associated data
            </p>
          </div>
        </div>
        {!showConfirmation && (
          <button
            onClick={() => setShowConfirmation(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete Account
          </button>
        )}
      </div>

      {showConfirmation && (
        <div className="space-y-4">
          <div className="text-sm text-red-700 dark:text-red-300">
            <p className="font-medium mb-2">Warning: This action cannot be undone!</p>
            <p>This will permanently delete:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Your profile</li>
              <li>All your workouts</li>
              <li>Notification settings</li>
              <li>All other associated data</li>
            </ul>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-red-900 dark:text-red-100 mb-1">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-800 text-red-900 dark:text-red-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Type DELETE"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmationText !== 'DELETE'}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
            <button
              onClick={() => {
                setShowConfirmation(false);
                setConfirmationText('');
              }}
              className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 