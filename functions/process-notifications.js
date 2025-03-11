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

// Process notifications function
async function processNotifications() {
  console.log('Starting notification processing...');
  
  try {
    // Get webapp URL from app_config
    console.log('Fetching webapp URL from app_config...');
    const { data: configData, error: configError } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'webapp_url')
      .single();
    
    if (configError) {
      console.error('Error fetching webapp URL:', configError);
      throw configError;
    }
    console.log('Webapp URL fetched:', configData.value);
    const webappUrl = configData.value;

    // Get unprocessed notifications
    console.log('Fetching unprocessed notifications...');
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .is('processed_at', null)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      throw fetchError;
    }
    console.log(`Found ${notifications?.length || 0} unprocessed notifications`);

    if (!notifications || notifications.length === 0) {
      console.log('No notifications to process');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No notifications to process' })
      };
    }

    // Process each notification
    for (const notification of notifications) {
      try {
        console.log(`Processing notification ${notification.id} for ${notification.email}...`);
        
        // Send email
        console.log('Sending email...');
        const emailContent = formatEmailContent(notification, webappUrl);
        console.log('Email content prepared:', emailContent);
        
        await transporter.sendMail({
          from: `"Pulse Fitness" <${process.env.GMAIL_USER}>`,
          to: notification.email,
          subject: notification.subject,
          html: emailContent
        });
        console.log('Email sent successfully');

        // Mark as processed
        console.log('Marking notification as processed...');
        const { error: updateError } = await supabase
          .from('notification_queue')
          .update({ 
            processed_at: new Date().toISOString(),
            error: null
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error('Error updating notification status:', updateError);
          throw updateError;
        }
        console.log('Notification marked as processed');

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        
        // Update notification with error
        try {
          await supabase
            .from('notification_queue')
            .update({ 
              processed_at: new Date().toISOString(),
              error: error.message
            })
            .eq('id', notification.id);
          console.log('Error status recorded in database');
        } catch (updateError) {
          console.error('Error updating notification with error status:', updateError);
        }
      }
    }

    console.log('Notification processing completed');
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `Processed ${notifications.length} notifications`
      })
    };
  } catch (error) {
    console.error('Fatal error in notification processing:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}

// Default export for Netlify scheduled function
export default async (req) => {
  // Log the request details
  console.log('Function triggered:', {
    method: req.method,
    url: req.url
  });

  try {
    // Parse the request body to get next_run
    const { next_run } = await req.json();
    console.log('Next scheduled run:', next_run);

    // Process notifications
    return processNotifications();
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Export schedule config
export const config = {
  schedule: "* * * * *"
}; 