const mongoose = require('mongoose');

const selectionEntrySchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  nomineeName: { type: String, required: true, trim: true },
  fromManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

const seniorSelectionSchema = new mongoose.Schema(
  {
    seniorManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    selections: [selectionEntrySchema],
    status: {
      type: String,
      enum: ['pending', 'submitted'],
      default: 'pending',
    },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SeniorSelection', seniorSelectionSchema);
