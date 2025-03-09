import React from 'react';
import { Settings as SettingsIcon, Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationSettings } from './NotificationSettings';

export function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-6">
          <SettingsIcon className="w-6 h-6 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-rose-500" />
              ) : (
                <Moon className="w-5 h-5 text-rose-500" />
              )}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Switch to {theme === 'dark' ? 'light' : 'dark'} mode
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-rose-500'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <NotificationSettings />
    </div>
  );
}