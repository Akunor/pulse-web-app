import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { testNotification, getNotificationStatus } from '../lib/notifications';

interface NotificationSettings {
  preferred_time: string;
  enabled: boolean;
}

interface NotificationStatus {
  success: boolean;
  settings?: NotificationSettings;
  pendingNotifications?: Array<{
    id: string;
    user_id: string;
    email: string;
    subject: string;
    processed_at: string | null;
  }>;
  message?: string;
}

export function NotificationSettings(): JSX.Element {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    preferred_time: '12:00:00',
    enabled: true
  });
  const [testing, setTesting] = useState(false);

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

  const handleTestNotification = async () => {
    if (!user) return;
    setTesting(true);
    try {
      const result = await testNotification(user.id);
      if (result.success) {
        toast.success('Test notification queued successfully');
        // Check notification status after a short delay
        setTimeout(async () => {
          const status: NotificationStatus = await getNotificationStatus(user.id);
          if (status.success && status.pendingNotifications && status.pendingNotifications.length > 0) {
            toast.success('Notification is in queue and will be processed soon');
          }
        }, 2000);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  // Generate time options for the select
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00:00`;
  });

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
          <label className="text-sm text-slate-900 dark:text-white">Preferred Time</label>
          <Select
            value={settings.preferred_time}
            onValueChange={(value: string) => updateSettings({ preferred_time: value })}
            disabled={!settings.enabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time) => (
                <SelectItem key={time} value={time}>
                  {new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true 
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You'll receive a daily reminder at this time if you haven't worked out yet.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleTestNotification}
            disabled={!settings.enabled || testing}
            className={`w-full py-2 px-4 rounded-lg text-white transition-colors ${
              settings.enabled && !testing
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
            }`}
          >
            {testing ? 'Sending...' : 'Send Test Notification'}
          </button>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Send a test notification to verify your settings.
          </p>
        </div>
      </div>
    </div>
  );
}