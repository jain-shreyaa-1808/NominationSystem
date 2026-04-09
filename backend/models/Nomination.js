const mongoose = require('mongoose');

const nominationEntrySchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  nomineeName: { type: String, required: true, trim: true },
  nomineeDesignation: { type: String, trim: true, default: '' },
  remarks: { type: String, trim: true, default: '' },
});

const nominationSchema = new mongoose.Schema(
  {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    nominations: [nominationEntrySchema],
    status: {
      type: String,
      enum: ['draft', 'submitted'],
      default: 'draft',
    },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Nomination', nominationSchema);
