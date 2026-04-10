const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Nomination = require('../models/Nomination');
const SeniorSelection = require('../models/SeniorSelection');
const DirectorAction = require('../models/DirectorAction');
const Category = require('../models/Category');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('director'));

// GET /api/director/senior-managers  – only SMs that report to this director
router.get('/senior-managers', async (req, res) => {
  try {
    const sms = await User.find({ role: 'senior_manager', reportingDirector: req.user._id });
    const selections = await SeniorSelection.find({
      seniorManager: { $in: sms.map((sm) => sm._id) },
    });

    const result = sms.map((sm) => {
      const sel = selections.find(
        (s) => s.seniorManager.toString() === sm._id.toString()
      );
      return {
        _id: sm._id,
        name: sm.name,
        email: sm.email,
        tower: sm.tower,
        status: sel ? sel.status : 'pending',
        submittedAt: sel?.submittedAt || null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/director/managers-status  – managers in this director's chain only
router.get('/managers-status', async (req, res) => {
  try {
    // Only show managers whose senior manager reports to THIS director
    const mySMs = await User.find({ role: 'senior_manager', reportingDirector: req.user._id }).select('_id');
    const smIds = mySMs.map((sm) => sm._id);

    const managers = await User.find({ role: 'manager', reportingManager: { $in: smIds } }).populate(
      'reportingManager',
      'name tower'
    );
    const nominations = await Nomination.find({
      manager: { $in: managers.map((m) => m._id) },
    });

    const result = managers.map((m) => {
      const nom = nominations.find(
        (n) => n.manager.toString() === m._id.toString()
      );
      return {
        _id: m._id,
        name: m.name,
        workgroup: m.workgroup,
        shift: m.shift,
        tower: m.tower,
        reportingManager: m.reportingManager,
        status: nom ? nom.status : 'not_started',
        submittedAt: nom?.submittedAt || null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/director/pool  – selections from SMs that report to this director
router.get('/pool', async (req, res) => {
  try {
    const mySMs = await User.find({ role: 'senior_manager', reportingDirector: req.user._id });
    const allSelections = await SeniorSelection.find({
      status: 'submitted',
      seniorManager: { $in: mySMs.map((sm) => sm._id) },
    })
      .populate('seniorManager', 'name tower email')
      .populate('selections.category', 'name description order');

    const categories = await Category.find().sort({ order: 1, name: 1 });

    const poolByCategory = categories.map((cat) => {
      const nominees = [];
      allSelections.forEach((sel) => {
        const entry = sel.selections.find(
          (s) => s.category._id.toString() === cat._id.toString()
        );
        if (entry) {
          nominees.push({
            nomineeName: entry.nomineeName,
            fromSeniorManager: sel.seniorManager,
            selectionId: sel._id,
            entryId: entry._id,
          });
        }
      });
      return { category: cat, nominees };
    });

    res.json(poolByCategory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/director/action  – my current action/selections
router.get('/action', async (req, res) => {
  try {
    const action = await DirectorAction.findOne({ director: req.user._id }).populate(
      'selections.category',
      'name'
    );
    res.json(action || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/director/action  – save working selections or mark complete
router.post('/action', async (req, res) => {
  try {
    const { selections, action } = req.body; // action: 'save' | 'complete'

    let existing = await DirectorAction.findOne({ director: req.user._id });
    if (existing && existing.status === 'completed') {
      return res.status(400).json({ message: 'Action already marked as completed' });
    }

    const isComplete = action === 'complete';
    const status = isComplete ? 'completed' : 'pending';

    if (existing) {
      existing.selections = selections || [];
      existing.status = status;
      if (isComplete) existing.completedAt = new Date();
      await existing.save();
    } else {
      existing = await DirectorAction.create({
        director: req.user._id,
        selections: selections || [],
        status,
        completedAt: isComplete ? new Date() : null,
      });
    }

    res.json(existing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
