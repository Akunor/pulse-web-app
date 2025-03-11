const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Helper to format email content
function formatEmailContent(notification, webappUrl) {
  if (notification.is_new_user) {
    return `
      <p>Welcome to Pulse Fitness! 🎉</p>
      <p>We're excited to have you join our community. Get started by setting up your profile and tracking your first workout.</p>
      <p><a href="${webappUrl}">Visit Pulse Fitness</a></p>
    `;
  }

  let content = '<p>Hey there! 👋</p>';
  
  if (notification.has_worked_out) {
    content += `<p>Great job on working out today! 💪 Your current Pulse level is ${notification.pulse_level}.</p>`;
  } else {
    content += '<p>Don\'t forget to get your workout in today! ';
    if (notification.active_users > 0) {
      content += `${notification.active_users} of your friends have already worked out today. `;
    }
    content += 'Keep your streak going!</p>';
  }
  
  content += `<p><a href="${webappUrl}">Log your workout now</a></p>`;
  return content;
}

// Main handler function
exports.handler = async function(event, context) {
  try {
    // Get webapp URL from app_config
    const { data: configData, error: configError } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'webapp_url')
      .single();
    
    if (configError) throw configError;
    const webappUrl = configData.value;

    // Get unprocessed notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .is('processed_at', null)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) throw fetchError;

    // Process each notification
    for (const notification of notifications) {
      try {
        // Send email
        await transporter.sendMail({
          from: `"Pulse Fitness" <${process.env.GMAIL_USER}>`,
          to: notification.email,
          subject: notification.subject,
          html: formatEmailContent(notification, webappUrl)
        });

        // Mark as processed
        await supabase
          .from('notification_queue')
          .update({ 
            processed_at: new Date().toISOString(),
            error: null
          })
          .eq('id', notification.id);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Update notification with error
        await supabase
          .from('notification_queue')
          .update({ 
            processed_at: new Date().toISOString(),
            error: error.message
          })
          .eq('id', notification.id);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `Processed ${notifications.length} notifications`
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}; 