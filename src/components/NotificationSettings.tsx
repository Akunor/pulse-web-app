import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface NotificationPreferences {
  preferred_time: string;
  timezone: string;
  is_enabled: boolean;
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    preferred_time: '09:00:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    is_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Generate time options for the select dropdown (30-minute intervals)
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    return {
      value: time,
      label: new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }),
    };
  });

  // Get all available timezones
  const timezones = Intl.supportedValuesOf('timeZone');

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  async function loadPreferences() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('preferred_time, timezone, is_enabled')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        toast.error('Failed to load notification preferences');
        return;
      }

      if (data) {
        setPreferences({
          preferred_time: data.preferred_time,
          timezone: data.timezone,
          is_enabled: data.is_enabled
        });
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
      toast.error('An error occurred while loading preferences');
    } finally {
      setLoading(false);
    }
  }

  async function updatePreferences(updates: Partial<NotificationPreferences>) {
    try {
      const newPreferences = { ...preferences, ...updates };
      
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          preferred_time: newPreferences.preferred_time,
          timezone: newPreferences.timezone,
          is_enabled: newPreferences.is_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating preferences:', error);
        toast.error('Failed to update notification preferences');
        return;
      }

      setPreferences(newPreferences);
      toast.success('Preferences updated successfully');
    } catch (error) {
      console.error('Error in updatePreferences:', error);
      toast.error('An error occurred while updating preferences');
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
          <div className="animate-pulse text-slate-400">Loading preferences...</div>
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
          <label className="text-slate-900 dark:text-white">Enable Daily Reminders</label>
          <button
            onClick={() => updatePreferences({ is_enabled: !preferences.is_enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.is_enabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.is_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-slate-900 dark:text-white">Preferred Time</label>
          <Select
            value={preferences.preferred_time}
            onValueChange={(value) => updatePreferences({ preferred_time: value })}
            disabled={!preferences.is_enabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time) => (
                <SelectItem key={time.value} value={time.value}>
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You'll receive a daily reminder at this time if you haven't worked out yet.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-slate-900 dark:text-white">Time Zone</label>
          <Select
            value={preferences.timezone}
            onValueChange={(value) => updatePreferences({ timezone: value })}
            disabled={!preferences.is_enabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Make sure your time zone is correct to receive notifications at the right time.
          </p>
        </div>
      </div>
    </div>
  );
}