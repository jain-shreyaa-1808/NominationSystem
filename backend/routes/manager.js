const express = require('express');
const router = express.Router();
const Nomination = require('../models/Nomination');
const Category = require('../models/Category');
const SeniorSelection = require('../models/SeniorSelection');
const DirectorAction = require('../models/DirectorAction');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('manager'));

// GET /api/manager/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/manager/nominations  – my current nominations
router.get('/nominations', async (req, res) => {
  try {
    const nomination = await Nomination.findOne({ manager: req.user._id }).populate(
      'nominations.category',
      'name description order'
    );
    res.json(nomination || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/manager/nominations  – save (draft) or submit
router.post('/nominations', async (req, res) => {
  try {
    const { nominations, action } = req.body; // action: 'save' | 'submit'

    const categories = await Category.find();
    if (!nominations || !Array.isArray(nominations)) {
      return res.status(400).json({ message: 'nominations array is required' });
    }

    let existing = await Nomination.findOne({ manager: req.user._id });
    if (existing && existing.status === 'submitted') {
      return res
        .status(400)
        .json({ message: 'Nominations already submitted and cannot be changed' });
    }

    const isSubmit = action === 'submit';

    if (isSubmit) {
      if (nominations.length !== categories.length) {
        return res.status(400).json({
          message: `Please provide exactly ${categories.length} nominations (one per category)`,
        });
      }
      for (const n of nominations) {
        if (!n.nomineeName || !n.nomineeName.trim()) {
          return res
            .status(400)
            .json({ message: 'All nominee names are required to submit' });
        }
      }
    }

    const status = isSubmit ? 'submitted' : 'draft';

    if (existing) {
      existing.nominations = nominations;
      existing.status = status;
      if (isSubmit) existing.submittedAt = new Date();
      await existing.save();
      existing = await Nomination.findById(existing._id).populate(
        'nominations.category',
        'name description order'
      );
    } else {
      existing = await Nomination.create({
        manager: req.user._id,
        nominations,
        status,
        submittedAt: isSubmit ? new Date() : null,
      });
      existing = await Nomination.findById(existing._id).populate(
        'nominations.category',
        'name description order'
      );
    }

    res.json(existing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/manager/status  – pipeline status view
router.get('/status', async (req, res) => {
  try {
    const nomination = await Nomination.findOne({ manager: req.user._id });
    const myStatus = nomination ? nomination.status : 'not_started';

    let reportingManagerStatus = 'pending';
    let directorStatus = 'pending';

    if (myStatus === 'submitted' && req.user.reportingManager) {
      const smSel = await SeniorSelection.findOne({
        seniorManager: req.user.reportingManager,
      });
      if (smSel && smSel.status === 'submitted') {
        reportingManagerStatus = 'submitted';

        // Find which director THIS manager's senior manager reports to,
        // then check only that director's action — not any director's.
        const seniorMgr = await User.findById(req.user.reportingManager).select('reportingDirector');
        if (seniorMgr?.reportingDirector) {
          const dirAct = await DirectorAction.findOne({
            director: seniorMgr.reportingDirector,
            status: 'completed',
          });
          if (dirAct) directorStatus = 'completed';
        }
      }
    }

    res.json({ myStatus, reportingManagerStatus, directorStatus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
