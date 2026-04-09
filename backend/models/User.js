const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: '' },
    passwordSet: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['admin', 'manager', 'senior_manager', 'director'],
      default: 'manager',
    },
    workgroup:       { type: String, trim: true, default: '' },
    shift:           { type: Number, default: null },
    tower:           { type: String, trim: true, default: '' },
    technologyGroup: { type: String, trim: true, default: '' },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reportingDirector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before save (Mongoose 7: no next() param)
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
