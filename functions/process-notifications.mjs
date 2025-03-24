import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

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
  const baseStyle = `
    <style>
      .email-container {
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
        background-color: #F43F5E;
        margin: -20px -20px 30px -20px;
        padding: 30px 20px;
        border-radius: 8px 8px 0 0;
      }
      .header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 24px;
      }
      .content {
        line-height: 1.6;
        color: #333333;
        padding: 0 20px;
        background-color: #ffffff;
      }
      .content p {
        color: #333333;
        margin: 16px 0;
      }
      .cta-button {
        display: inline-block;
        background-color: #F43F5E;
        color: #ffffff !important;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        margin-top: 20px;
        font-weight: bold;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #eeeeee;
        font-size: 12px;
        color: #666666;
        text-align: center;
        background-color: #ffffff;
      }
      .footer p {
        color: #666666;
      }
      .emoji {
        font-size: 20px;
        vertical-align: middle;
        margin: 0 4px;
      }
      .highlight {
        color: #F43F5E;
        font-weight: bold;
      }
      /* Additional styles to ensure text visibility */
      .header * {
        color: #ffffff;
      }
      .content * {
        color: #333333;
      }
      .highlight {
        color: #F43F5E !important;
      }
      /* Style for active users section */
      .active-users {
        background-color: #FFF1F2;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        border: 1px solid #F43F5E;
      }
      .active-users p {
        color: #333333;
        margin: 0;
      }
    </style>
  `;

  let content;
  if (notification.is_new_user) {
    content = `
      ${baseStyle}
      <div class="email-container">
        <div class="header">
          <h1>Welcome to Pulse Fitness! <span class="emoji">🎉</span></h1>
        </div>
        <div class="content">
          <p>We're excited to have you join our community!</p>
          <p>Get started by setting up your profile and tracking your first workout. Your fitness journey begins here.</p>
          <center>
            <a href="${webappUrl}" class="cta-button">Visit Pulse Fitness</a>
          </center>
        </div>
        <div class="footer">
          <p>This email was sent by Pulse Fitness. To unsubscribe, update your notification settings in the app.</p>
        </div>
      </div>
    `;
  } else {
    const emoji = notification.has_worked_out ? '💪' : '🏃‍♂️';
    const title = notification.has_worked_out ? 'Great Work Today!' : 'Time to Get Moving!';
    const buttonText = notification.has_worked_out ? 'Check your Pulse dashboard' : 'Log your workout now';
    
    let mainMessage;
    if (notification.has_worked_out) {
      mainMessage = `
        <p>Awesome job on completing your workout! <span class="emoji">🎯</span></p>
        <p>Your current Pulse level is <span class="highlight">${notification.pulse_level}</span>. Keep up the momentum!</p>
      `;
    } else {
      mainMessage = `
        <p>Don't forget to get your workout in today!</p>
        ${notification.active_users > 0 ? 
          `<div class="active-users">
            <p><span class="highlight">${notification.active_users}</span> of your friends have already worked out today. Time to join them! <span class="emoji">💫</span></p>
           </div>` 
          : '<p>Be the first to work out today and inspire others! <span class="emoji">✨</span></p>'}
      `;
    }

    content = `
      ${baseStyle}
      <div class="email-container">
        <div class="header">
          <h1>${title} <span class="emoji">${emoji}</span></h1>
        </div>
        <div class="content">
          ${mainMessage}
          <center>
            <a href="${webappUrl}" class="cta-button">${buttonText}</a>
          </center>
        </div>
        <div class="footer">
          <p>This email was sent by Pulse Fitness. To unsubscribe, update your notification settings in the app.</p>
        </div>
      </div>
    `;
  }
  
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
      .limit(20); // Increased from 10 to 20

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      throw fetchError;
    }
    console.log(`Found ${notifications?.length || 0} unprocessed notifications`);

    if (!notifications || notifications.length === 0) {
      console.log('No notifications to process');
      return new Response(JSON.stringify({ message: 'No notifications to process' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process notifications in parallel batches
    const batchSize = 5; // Process 5 notifications at a time
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(notifications.length/batchSize)}`);
      
      // Process batch in parallel
      await Promise.all(batch.map(async (notification) => {
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
      }));

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('Notification processing completed');
    return new Response(JSON.stringify({ 
      message: `Processed ${notifications.length} notifications`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fatal error in notification processing:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Export schedule config
export const config = {
  schedule: "*/5 * * * *"
}; 