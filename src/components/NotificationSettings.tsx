import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface NotificationSettings {
  preferred_time: string;
  enabled: boolean;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    preferred_time: '12:00',
    enabled: true
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  async function loadSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_settings')
        .select('preferred_time, enabled')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        toast.error('Failed to load notification settings');
        return;
      }

      if (data) {
        setSettings({
          preferred_time: data.preferred_time.slice(0, 5), // Convert "HH:MM:SS" to "HH:MM"
          enabled: data.enabled
        });
      } else {
        // Create default settings if they don't exist
        const { error: insertError } = await supabase
          .from('notification_settings')
          .insert([
            {
              user_id: user?.id,
              preferred_time: '12:00:00',
              enabled: true
            }
          ]);

        if (insertError) {
          console.error('Error creating settings:', insertError);
          toast.error('Failed to create notification settings');
        }
      }
    } catch (error) {
      console.error('Error in loadSettings:', error);
      toast.error('An error occurred while loading settings');
    } finally {
      setLoading(false);
    }
  }

  async function updateSettings(updates: Partial<NotificationSettings>) {
    try {
      const newSettings = { ...settings, ...updates };
      
      const { error } = await supabase
        .from('notification_settings')
        .update({
          preferred_time: newSettings.preferred_time,
          enabled: newSettings.enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating settings:', error);
        toast.error('Failed to update notification settings');
        return;
      }

      setSettings(newSettings);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error in updateSettings:', error);
      toast.error('An error occurred while updating settings');
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Bell className="w-6 h-6 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notification Settings</h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-pulse text-slate-400">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Bell className="w-6 h-6 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notification Settings</h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <label className="text-slate-900 dark:text-white">Enable Notifications</label>
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
          <label className="block text-slate-900 dark:text-white">Preferred Time</label>
          <input
            type="time"
            value={settings.preferred_time}
            onChange={(e) => updateSettings({ preferred_time: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This time will be used if you haven't worked out before.
            Otherwise, notifications will be sent around your usual workout time.
          </p>
        </div>
      </div>
    </div>
  );
}