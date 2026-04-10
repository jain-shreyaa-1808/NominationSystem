const mongoose = require('mongoose');

// Stores one deadline per role, set by admin.
// When a deadline approaches, the reminder cron job reads this and emails users.
const deadlineSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['manager', 'senior_manager', 'director'],
      required: true,
      unique: true, // only one deadline per role at a time
    },
    deadline: {
      type: Date,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deadline', deadlineSchema);
