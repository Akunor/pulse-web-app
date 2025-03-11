interface EmailPayload {
  to: string;
  subject: string;
  pulseLevel?: number;
  streak?: number;
  hasWorkedOut?: boolean;
  isNewUser?: boolean;
  activeUsers?: Array<{ email: string; pulseLevel: number }>;
}

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL || 'http://localhost:3000';

export async function sendWorkoutEmail(payload: EmailPayload) {
  const { to, subject, pulseLevel = 0, streak = 0, hasWorkedOut = false, isNewUser = false, activeUsers = [] } = payload;

  // Build email HTML
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #E11D48;">${isNewUser ? 'Start Your Fitness Journey Today!' : hasWorkedOut ? 'Great Job Today! 🎉' : 'Time to Work Out! 💪'}</h1>
      
      <p>${
        isNewUser ? 'Welcome to Pulse! It\'s time to begin your fitness journey.' :
        hasWorkedOut ? 'You\'ve already completed your workout today. Keep up the great work!' :
        'It\'s your usual workout time. Ready to maintain your streak?'
      }</p>

      <p>Your current stats:</p>
      <ul>
        <li>Pulse Level: ${pulseLevel}</li>
        <li>Streak: ${streak} days</li>
      </ul>

      ${activeUsers.length > 0 ? `
        <div style="background: #F0FDF4; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Friends who worked out today:</h3>
          <ul style="list-style: none; padding: 0;">
            ${activeUsers.map(user => `
              <li style="margin-bottom: 10px;">✅ ${user.email} (Pulse: ${user.pulseLevel})</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <a href="${WEBAPP_URL}" style="display: inline-block; background: #E11D48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        ${hasWorkedOut ? 'View Progress' : 'Start Workout'}
      </a>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Pulse <notifications@${new URL(WEBAPP_URL).hostname}>`,
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error: unknown) {
    console.error('Failed to send email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
} 