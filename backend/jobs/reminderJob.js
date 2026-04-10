const cron = require('node-cron');
const Deadline = require('../models/Deadline');
const User = require('../models/User');
const Nomination = require('../models/Nomination');
const SeniorSelection = require('../models/SeniorSelection');
const DirectorAction = require('../models/DirectorAction');
const { sendDeadlineReminder } = require('../services/emailService');

const ROLE_LABELS = {
  manager: 'Manager',
  senior_manager: 'Senior Manager',
  director: 'Director',
};

/**
 * Returns true if date1 and date2 fall on the same calendar day (ignores time).
 */
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Returns the difference in whole calendar days between two dates (date2 - date1).
 * e.g. diffDays(today, deadline) = 2 means deadline is 2 days from now.
 */
function diffDays(date1, date2) {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * For a given role and list of users, finds which users have NOT yet submitted.
 */
async function getPendingUsers(role, users) {
  const ids = users.map((u) => u._id);

  if (role === 'manager') {
    const submitted = await Nomination.find({
      manager: { $in: ids },
      status: 'submitted',
    }).select('manager');
    const submittedIds = new Set(submitted.map((n) => n.manager.toString()));
    return users.filter((u) => !submittedIds.has(u._id.toString()));
  }

  if (role === 'senior_manager') {
    const submitted = await SeniorSelection.find({
      seniorManager: { $in: ids },
      status: 'submitted',
    }).select('seniorManager');
    const submittedIds = new Set(submitted.map((s) => s.seniorManager.toString()));
    return users.filter((u) => !submittedIds.has(u._id.toString()));
  }

  if (role === 'director') {
    const completed = await DirectorAction.find({
      director: { $in: ids },
      status: 'completed',
    }).select('director');
    const completedIds = new Set(completed.map((a) => a.director.toString()));
    return users.filter((u) => !completedIds.has(u._id.toString()));
  }

  return [];
}

/**
 * Core logic: check each deadline and email pending users if reminder is due.
 * Called by the cron job and also exported so admin can trigger a test run.
 */
async function runReminderCheck() {
  console.log(`\n🔔 [${new Date().toISOString()}] Running deadline reminder check…`);

  const deadlines = await Deadline.find();
  if (deadlines.length === 0) {
    console.log('   No deadlines configured — nothing to do.');
    return;
  }

  const today = new Date();

  for (const dl of deadlines) {
    const diff = diffDays(today, dl.deadline);
    const isToday = isSameDay(today, dl.deadline);

    if (diff !== 2 && !isToday) {
      console.log(`   [${dl.role}] deadline in ${diff} day(s) — no reminder needed today.`);
      continue;
    }

    const reminderType = isToday ? 'today' : '2days';
    console.log(`   [${dl.role}] Sending "${reminderType}" reminders…`);

    // Get all active users with this role who haven't submitted yet
    const allUsers = await User.find({ role: dl.role, isActive: true }).select('name email');
    const pendingUsers = await getPendingUsers(dl.role, allUsers);

    if (pendingUsers.length === 0) {
      console.log(`   [${dl.role}] All users have already submitted — skipping.`);
      continue;
    }

    console.log(`   [${dl.role}] Sending to ${pendingUsers.length} user(s)…`);

    for (const user of pendingUsers) {
      try {
        await sendDeadlineReminder({
          to: user.email,
          name: user.name,
          roleLabel: ROLE_LABELS[dl.role] || dl.role,
          deadline: dl.deadline,
          type: reminderType,
        });
      } catch (err) {
        console.error(`   ❌ Failed to send to ${user.email}:`, err.message);
      }
    }
  }

  console.log('✅ Reminder check complete.\n');
}

/**
 * Starts the cron job. Runs every day at 8:00 AM server time.
 * Schedule string '0 8 * * *' means: minute=0, hour=8, every day.
 */
function startReminderJob() {
  // Run at 08:00 every day
  cron.schedule('0 8 * * *', async () => {
    try {
      await runReminderCheck();
    } catch (err) {
      console.error('❌ Reminder job error:', err.message);
    }
  });
  console.log('⏰ Deadline reminder job scheduled (runs daily at 08:00)');
}

module.exports = { startReminderJob, runReminderCheck };
