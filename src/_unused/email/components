import { useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { sendWorkoutEmail } from '../utils/email';

interface Notification {
  id: string;
  email: string;
  subject: string;
  pulse_level: number;
  streak: number;
  has_worked_out: boolean;
  is_new_user: boolean;
  active_users: Array<{ email: string; pulseLevel: number }>;
}

export function NotificationProcessor() {
  const { supabase } = useSupabase();

  useEffect(() => {
    const processNotifications = async () => {
      try {
        // Get unprocessed notifications
        const { data: notifications, error } = await supabase
          .from('notification_queue')
          .select('*')
          .is('processed_at', null)
          .limit(10);

        if (error) {
          console.error('Error fetching notifications:', error);
          return;
        }

        if (!notifications?.length) return;

        // Process each notification
        for (const notification of notifications as Notification[]) {
          try {
            const result = await sendWorkoutEmail({
              to: notification.email,
              subject: notification.subject,
              pulseLevel: notification.pulse_level,
              streak: notification.streak,
              hasWorkedOut: notification.has_worked_out,
              isNewUser: notification.is_new_user,
              activeUsers: notification.active_users || [],
            });

            // Update notification status
            await supabase
              .from('notification_queue')
              .update({
                processed_at: new Date().toISOString(),
                error: result.success ? null : result.error,
              })
              .eq('id', notification.id);

          } catch (error) {
            console.error('Error processing notification:', error);
            
            // Update notification with error
            await supabase
              .from('notification_queue')
              .update({
                processed_at: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
              })
              .eq('id', notification.id);
          }
        }
      } catch (error) {
        console.error('Error in notification processor:', error);
      }
    };

    // Process notifications every minute
    const interval = setInterval(processNotifications, 60000);
    processNotifications(); // Initial processing

    return () => clearInterval(interval);
  }, [supabase]);

  return null;
} 