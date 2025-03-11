import { supabase } from './supabase';

export async function testNotification(userId: string) {
  try {
    // Get user's notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError) throw settingsError;

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Insert a test notification into the queue
    const { error: queueError } = await supabase
      .from('notification_queue')
      .insert({
        user_id: userId,
        email: profile.email,
        subject: 'Test Notification',
        pulse_level: 0,
        streak: 0,
        has_worked_out: false,
        is_new_user: false,
        active_users: 0
      });

    if (queueError) throw queueError;

    return { success: true, message: 'Test notification queued successfully' };
  } catch (error) {
    console.error('Error testing notification:', error);
    return { success: false, message: error instanceof Error ? error.message : 'An error occurred' };
  }
}

export async function getNotificationStatus(userId: string) {
  try {
    // Get user's notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError) throw settingsError;

    // Get pending notifications
    const { data: pendingNotifications, error: queueError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .is('processed_at', null);

    if (queueError) throw queueError;

    return {
      success: true,
      settings,
      pendingNotifications: pendingNotifications || []
    };
  } catch (error) {
    console.error('Error getting notification status:', error);
    return { success: false, message: error instanceof Error ? error.message : 'An error occurred' };
  }
} 