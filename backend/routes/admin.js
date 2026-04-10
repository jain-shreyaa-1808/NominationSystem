const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Category = require('../models/Category');
const Nomination = require('../models/Nomination');
const SeniorSelection = require('../models/SeniorSelection');
const DirectorAction = require('../models/DirectorAction');
const Deadline = require('../models/Deadline');
const { runReminderCheck } = require('../jobs/reminderJob');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

// ───────── USERS ─────────

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
      .populate('reportingManager', 'name email role')
      .sort({ role: 1, name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/users  – assign role to a Cisco employee by email
router.post('/users', async (req, res) => {
  try {
    const { name, email, role, workgroup, shift, tower, reportingManager, reportingDirector, technologyGroup, cwid } = req.body;
    if (!email || !role)
      return res.status(400).json({ message: 'Email and role are required' });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already in use' });

    const user = await User.create({
      name: name || email,
      email,
      cwid: cwid || '',
      role,
      workgroup: workgroup || '',
      shift: shift || null,
      tower: tower || '',
      technologyGroup: technologyGroup || '',
      reportingManager: reportingManager || null,
      reportingDirector: reportingDirector || null,
    });

    const populated = await User.findById(user._id)
      .populate('reportingManager', 'name email role')
      .populate('reportingDirector', 'name email technologyGroup');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, cwid, role, workgroup, shift, tower, reportingManager, reportingDirector, technologyGroup, isActive } = req.body;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (cwid !== undefined) user.cwid = cwid;
    if (role !== undefined) user.role = role;
    if (workgroup !== undefined) user.workgroup = workgroup;
    if (shift !== undefined) user.shift = shift;
    if (tower !== undefined) user.tower = tower;
    if (technologyGroup !== undefined) user.technologyGroup = technologyGroup;
    if (reportingManager !== undefined) user.reportingManager = reportingManager || null;
    if (reportingDirector !== undefined) user.reportingDirector = reportingDirector || null;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    const populated = await User.findById(user._id)
      .populate('reportingManager', 'name email role')
      .populate('reportingDirector', 'name email technologyGroup');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin' && user._id.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot delete yourself' });

    // Cascade: remove submission records and unlink reporting relationships
    if (user.role === 'director') {
      await DirectorAction.findOneAndDelete({ director: user._id });
      // Unlink any senior managers who reported to this director
      await User.updateMany({ reportingDirector: user._id }, { $set: { reportingDirector: null } });
    }
    if (user.role === 'senior_manager') {
      await SeniorSelection.findOneAndDelete({ seniorManager: user._id });
      // Unlink any managers who reported to this senior manager
      await User.updateMany({ reportingManager: user._id }, { $set: { reportingManager: null } });
    }
    if (user.role === 'manager') {
      await Nomination.findOneAndDelete({ manager: user._id });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/senior-managers
router.get('/senior-managers', async (req, res) => {
  try {
    const sms = await User.find({ role: 'senior_manager' }).select('name email tower technologyGroup');
    res.json(sms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/directors
router.get('/directors', async (req, res) => {
  try {
    const dirs = await User.find({ role: 'director' }).select('name email technologyGroup');
    res.json(dirs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ───────── CATEGORIES ─────────

// GET /api/admin/categories
router.get('/categories', async (req, res) => {
  try {
    const cats = await Category.find().sort({ order: 1, name: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/categories
router.post('/categories', async (req, res) => {
  try {
    const { name, description, order } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const cat = await Category.create({ name, description, order: order || 0 });
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ───────── STATUS OVERVIEW ─────────

// GET /api/admin/status
router.get('/status', async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' }).populate(
      'reportingManager',
      'name'
    );
    const seniorManagers = await User.find({ role: 'senior_manager' });
    const directors = await User.find({ role: 'director' });

    const nominations = await Nomination.find();
    const seniorSelections = await SeniorSelection.find();
    const directorActions = await DirectorAction.find();

    const managerStatus = managers.map((m) => {
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
        reportingManager: m.reportingManager,
        status: nom ? nom.status : 'not_started',
        submittedAt: nom?.submittedAt || null,
      };
    });

    const seniorStatus = seniorManagers.map((sm) => {
      const sel = seniorSelections.find(
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

    const directorStatus = directors.map((d) => {
      const act = directorActions.find(
        (a) => a.director.toString() === d._id.toString()
      );
      return {
        _id: d._id,
        name: d.name,
        email: d.email,
        status: act ? act.status : 'pending',
        completedAt: act?.completedAt || null,
      };
    });

    res.json({ managers: managerStatus, seniorManagers: seniorStatus, directors: directorStatus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ───────── DEADLINES ─────────

// GET /api/admin/deadlines  – get all role deadlines
router.get('/deadlines', async (req, res) => {
  try {
    const deadlines = await Deadline.find().sort({ role: 1 });
    res.json(deadlines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/deadlines/:role  – set (upsert) deadline for a role
router.put('/deadlines/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const { deadline, note } = req.body;

    if (!['manager', 'senior_manager', 'director'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (!deadline) {
      return res.status(400).json({ message: 'Deadline date is required' });
    }

    const dl = await Deadline.findOneAndUpdate(
      { role },
      { $set: { deadline: new Date(deadline), note: note || '' } },
      { upsert: true, new: true }
    );
    res.json(dl);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/deadlines/:role  – remove deadline for a role
router.delete('/deadlines/:role', async (req, res) => {
  try {
    await Deadline.findOneAndDelete({ role: req.params.role });
    res.json({ message: 'Deadline removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/deadlines/test-reminders  – manually trigger the reminder check
router.post('/deadlines/test-reminders', async (req, res) => {
  try {
    await runReminderCheck();
    res.json({ message: 'Reminder check triggered. Check server logs for details.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
