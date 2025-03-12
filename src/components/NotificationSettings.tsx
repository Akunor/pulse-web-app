import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface NotificationSettings {
  preferred_time: string;
  enabled: boolean;
}

export function NotificationSettings(): JSX.Element {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    preferred_time: '12:00:00',
    enabled: true
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          preferred_time: data.preferred_time,
          enabled: data.enabled
        });
      }
    } catch (error: unknown) {
      console.error('Error loading notification settings:', error);
      toast.error('Failed to load notification settings');
    }
  };

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user?.id);

      if (error) throw error;

      setSettings((prev: NotificationSettings) => ({ ...prev, ...updates }));
      toast.success('Notification settings updated');
    } catch (error: unknown) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification settings');
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    // Convert from HH:mm to HH:mm:00 format
    const formattedTime = time + ':00';
    updateSettings({ preferred_time: formattedTime });
  };

  // Convert HH:mm:ss to HH:mm for input value
  const displayTime = settings.preferred_time.slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Bell className="w-6 h-6 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notification Settings</h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <label className="text-slate-900 dark:text-white">Enable Daily Reminders</label>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-900 dark:text-white">Preferred Time (24-hour)</label>
          <input
            type="time"
            value={displayTime}
            onChange={handleTimeChange}
            disabled={!settings.enabled}
            className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-500 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:text-rose-500 dark:[&::-webkit-calendar-picker-indicator]:text-rose-400 [&::-webkit-calendar-picker-indicator]:filter-[&::-webkit-calendar-picker-indicator]:invert-[0.4] dark:[&::-webkit-calendar-picker-indicator]:invert-[0.7]"
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You'll receive a daily reminder at this time if you haven't worked out yet.
          </p>
        </div>
      </div>
    </div>
  );
}