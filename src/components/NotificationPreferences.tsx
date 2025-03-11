import { useEffect, useState } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { useToast } from '../hooks/useToast';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface NotificationPreferences {
  preferred_time: string;
  timezone: string;
  is_enabled: boolean;
}

export function NotificationPreferences() {
  const { supabase, user } = useSupabase();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    preferred_time: '09:00:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    is_enabled: true,
  });
  const [loading, setLoading] = useState(true);

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
    async function loadPreferences() {
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .single();

        if (error) throw error;

        if (data) {
          setPreferences(data);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        toast({
          title: 'Error',
          description: 'Failed to load notification preferences',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadPreferences();
    }
  }, [user, supabase, toast]);

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user?.id);

      if (error) throw error;

      setPreferences(prev => ({ ...prev, ...updates }));
      toast({
        title: 'Success',
        description: 'Notification preferences updated',
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Customize when you receive workout reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="notifications-enabled">Enable daily reminders</Label>
          <Switch
            id="notifications-enabled"
            checked={preferences.is_enabled}
            onCheckedChange={(checked) => updatePreferences({ is_enabled: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferred-time">Preferred reminder time</Label>
          <Select
            value={preferences.preferred_time}
            onValueChange={(value) => updatePreferences({ preferred_time: value })}
            disabled={!preferences.is_enabled}
          >
            <SelectTrigger id="preferred-time">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Time zone</Label>
          <Select
            value={preferences.timezone}
            onValueChange={(value) => updatePreferences({ timezone: value })}
            disabled={!preferences.is_enabled}
          >
            <SelectTrigger id="timezone">
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
        </div>
      </CardContent>
    </Card>
  );
} 