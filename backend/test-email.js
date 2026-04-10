/**
 * Standalone email test — run with:  node test-email.js
 * Does NOT need MongoDB or the server running.
 * Override recipient: node test-email.js other@email.com
 */
require('dotenv').config();
const { sendDeadlineReminder } = require('./services/emailService');

const TO = process.argv[2] || 'shreya.kmv@gmail.com';

console.log('\n📧 Resend config:');
console.log('  RESEND_API_KEY :', process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.slice(0, 10)}…` : '❌ NOT SET');
console.log('  EMAIL_FROM     :', process.env.EMAIL_FROM || '❌ NOT SET');
console.log('  APP_URL        :', process.env.APP_URL || 'http://localhost:3000');
console.log('  TO             :', TO);
console.log('');

if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY missing from .env');
  process.exit(1);
}

sendDeadlineReminder({
  to: TO,
  name: 'Test User',
  roleLabel: 'Manager',
  deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
  type: '2days',
}).then(() => {
  console.log('✅ Done — check the inbox for', TO);
  process.exit(0);
}).catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
