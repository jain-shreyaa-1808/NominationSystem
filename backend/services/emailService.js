const { Resend } = require('resend');

/**
 * Returns a Resend client using RESEND_API_KEY from .env.
 * Returns null if not configured so the server keeps running without email.
 */
function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Sends a deadline reminder email to a single user via the Resend API.
 *
 * @param {object} options
 * @param {string} options.to         - Recipient email address
 * @param {string} options.name       - Recipient display name
 * @param {string} options.roleLabel  - Human-friendly role name (e.g. "Manager")
 * @param {Date}   options.deadline   - The deadline date object
 * @param {'2days'|'today'} options.type - Which reminder this is
 */
async function sendDeadlineReminder({ to, name, roleLabel, deadline, type }) {
  const client = getClient();
  if (!client) {
    console.warn('⚠️  Email not configured — skipping reminder to', to);
    return;
  }

  const dateStr = deadline.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isToday = type === 'today';

  const subject = isToday
    ? `URGENT: Nomination deadline is TODAY — ${dateStr}`
    : `Reminder: Nomination deadline in 2 days — ${dateStr}`;

  const urgencyColor  = isToday ? '#dc2626' : '#f59e0b';
  const urgencyLabel  = isToday ? 'TODAY IS THE DEADLINE' : 'DEADLINE IN 2 DAYS';
  const bodyText      = isToday
    ? `This is an urgent reminder that <strong>today is the last day</strong> to complete your nomination submission. Please log in and submit your nominations <strong>before end of day</strong>.`
    : `This is a reminder that the deadline for your nomination submission is <strong>in 2 days</strong>. Please log in and complete your nominations as soon as possible.`;
  const footerText    = isToday
    ? 'If you have already submitted your nominations, you can ignore this email. Otherwise, please complete the process immediately.'
    : 'If you have already submitted, you can ignore this email. Otherwise, make sure to complete before the deadline.';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
    <body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0"
            style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">

            <tr>
              <td style="background:#1e3a5f;padding:24px 32px;text-align:center;">
                <div style="font-size:32px;margin-bottom:8px;">🏆</div>
                <div style="color:#fff;font-size:20px;font-weight:700;">Nomination System</div>
                <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;">Corporate Awards Platform</div>
              </td>
            </tr>

            <tr>
              <td style="background:${urgencyColor};padding:12px 32px;text-align:center;">
                <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                  ⏰ ${urgencyLabel}
                </span>
              </td>
            </tr>

            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 12px;font-size:16px;color:#1e3a5f;font-weight:600;">Dear ${name},</p>
                <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">${bodyText}</p>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="background:#f8fafc;border-radius:10px;border-left:4px solid ${urgencyColor};padding:16px 20px;">
                      <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Deadline</div>
                      <div style="font-size:18px;font-weight:800;color:#1e3a5f;">${dateStr}</div>
                      <div style="font-size:12px;color:#64748b;margin-top:4px;">Role: ${roleLabel}</div>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">${footerText}</p>

                <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                  <tr>
                    <td style="background:#1e3a5f;border-radius:8px;">
                      <a href="${process.env.APP_URL || 'http://localhost:3000'}"
                        style="display:inline-block;padding:12px 28px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;">
                        Open Nomination System →
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                  This is an automated reminder. Please do not reply to this email.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
                <span style="font-size:11px;color:#94a3b8;">
                  © ${new Date().getFullYear()} Nomination System · Corporate Awards Platform
                </span>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  const { data, error } = await client.emails.send({
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to: [to],
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }

  console.log(`📧 Reminder sent to ${to} [${type}] — id: ${data.id}`);
  return data;
}

module.exports = { sendDeadlineReminder };
