import React, { useState } from 'react';
import { Settings as SettingsIcon, Sun, Moon, Bell, Copy, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { NotificationSettings } from './NotificationSettings';
import { PasswordSettings } from './PasswordSettings';
import { DeleteAccount } from './DeleteAccount';
import toast from 'react-hot-toast';

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mt-8">
      <div className="flex items-center space-x-2 mb-6">
        <SettingsIcon className="w-6 h-6 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Moon className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Dark Mode
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {theme === 'dark' ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              theme === 'dark' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">User ID</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{user?.id}</p>
          </div>
          <button
            onClick={copyUserId}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors"
            title="Copy ID"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            )}
          </button>
        </div>

        <PasswordSettings />

        <NotificationSettings />

        <DeleteAccount />
      </div>
    </div>
  );
}