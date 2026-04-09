const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Nomination = require('../models/Nomination');
const SeniorSelection = require('../models/SeniorSelection');
const Category = require('../models/Category');
const DirectorAction = require('../models/DirectorAction');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('senior_manager'));

// GET /api/senior/managers  – my reportees with submission status
router.get('/managers', async (req, res) => {
  try {
    const managers = await User.find({
      role: 'manager',
      reportingManager: req.user._id,
    }).select('name email workgroup shift tower');

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
        email: m.email,
        workgroup: m.workgroup,
        shift: m.shift,
        tower: m.tower,
        status: nom ? nom.status : 'not_started',
        submittedAt: nom?.submittedAt || null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/senior/pool  – all submitted nominations grouped by category
router.get('/pool', async (req, res) => {
  try {
    const managers = await User.find({
      role: 'manager',
      reportingManager: req.user._id,
    });

    const nominations = await Nomination.find({
      manager: { $in: managers.map((m) => m._id) },
      status: 'submitted',
    })
      .populate('manager', 'name workgroup shift tower')
      .populate('nominations.category', 'name description order');

    const categories = await Category.find().sort({ order: 1, name: 1 });

    const poolByCategory = categories.map((cat) => {
      const nominees = [];
      nominations.forEach((nom) => {
        const entry = nom.nominations.find(
          (n) => n.category._id.toString() === cat._id.toString()
        );
        if (entry) {
          nominees.push({
            nomineeName: entry.nomineeName,
            nomineeDesignation: entry.nomineeDesignation,
            remarks: entry.remarks,
            manager: nom.manager,
            nominationId: nom._id,
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

// GET /api/senior/selections  – my current selections
router.get('/selections', async (req, res) => {
  try {
    const sel = await SeniorSelection.findOne({
      seniorManager: req.user._id,
    })
      .populate('selections.category', 'name order')
      .populate('selections.fromManager', 'name');
    res.json(sel || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/senior/selections  – save or submit selections
router.post('/selections', async (req, res) => {
  try {
    const { selections, action } = req.body; // action: 'save' | 'submit'

    let existing = await SeniorSelection.findOne({ seniorManager: req.user._id });
    if (existing && existing.status === 'submitted') {
      return res.status(400).json({ message: 'Selections already submitted to director' });
    }

    const isSubmit = action === 'submit';

    if (isSubmit) {
      const categories = await Category.find();
      if (!selections || selections.length !== categories.length) {
        return res.status(400).json({
          message: `Please select one nominee for each of the ${categories.length} categories`,
        });
      }
      for (const s of selections) {
        if (!s.nomineeName || !s.nomineeName.trim()) {
          return res
            .status(400)
            .json({ message: 'All category selections must have a nominee name' });
        }
      }
    }

    const status = isSubmit ? 'submitted' : 'pending';

    if (existing) {
      existing.selections = selections || [];
      existing.status = status;
      if (isSubmit) existing.submittedAt = new Date();
      await existing.save();
    } else {
      existing = await SeniorSelection.create({
        seniorManager: req.user._id,
        selections: selections || [],
        status,
        submittedAt: isSubmit ? new Date() : null,
      });
    }

    res.json(existing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/senior/status
router.get('/status', async (req, res) => {
  try {
    const sel = await SeniorSelection.findOne({ seniorManager: req.user._id });
    const myStatus = sel ? sel.status : 'pending';

    // Check only the director this senior manager reports to
    let directorStatus = 'pending';
    let directorName = '';
    if (req.user.reportingDirector) {
      const dirAct = await DirectorAction.findOne({
        director: req.user.reportingDirector,
        status: 'completed',
      });
      if (dirAct) directorStatus = 'completed';
      const dir = await User.findById(req.user.reportingDirector).select('name technologyGroup');
      if (dir) directorName = `${dir.name}${dir.technologyGroup ? ` (${dir.technologyGroup})` : ''}`;
    }

    res.json({ myStatus, directorStatus, directorName });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
