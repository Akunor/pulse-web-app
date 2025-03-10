import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const WEBAPP_URL = Deno.env.get('WEBAPP_URL')

interface EmailPayload {
  to: string
  subject: string
  pulseLevel?: number
  streak?: number
  hasWorkedOut?: boolean
  isNewUser?: boolean
  activeUsers?: Array<{ email: string; pulseLevel: number }>
}

serve(async (req) => {
  try {
    const payload: EmailPayload = await req.json()
    const { to, subject, pulseLevel = 0, streak = 0, hasWorkedOut = false, isNewUser = false, activeUsers = [] } = payload

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
    `

    // Send email using Resend
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
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}) 