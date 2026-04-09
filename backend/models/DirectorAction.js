const mongoose = require('mongoose');

const directorSelectionEntrySchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  nomineeName: { type: String, required: true, trim: true },
  fromSeniorManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

const directorActionSchema = new mongoose.Schema(
  {
    director: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Director's internal selections (not exposed to lower roles)
    selections: [directorSelectionEntrySchema],
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DirectorAction', directorActionSchema);
