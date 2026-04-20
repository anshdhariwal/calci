const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const SgpaRecord = require('../models/SgpaRecord');

// POST /api/sgpa — save a new record
router.post('/', protect, async (req, res) => {
  const { semester, sgpa, subjects } = req.body;
  if (!semester || sgpa === undefined) {
    return res.status(400).json({ message: 'Semester and SGPA are required' });
  }
  try {
    const record = await SgpaRecord.create({
      user: req.user._id,
      semester,
      sgpa: parseFloat(sgpa),
      subjects: subjects || [],
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sgpa — get all records for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const records = await SgpaRecord.find({ user: req.user._id }).sort({ createdAt: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sgpa/analytics — MUST be before /:id to avoid route collision
router.get('/analytics', protect, async (req, res) => {
  try {
    const records = await SgpaRecord.find({ user: req.user._id }).sort({ createdAt: 1 });
    if (records.length === 0) return res.json({ records: [], average: 0, highest: null, lowest: null });

    const sgpas = records.map(r => r.sgpa);
    const average = (sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2);
    const highest = records.reduce((a, b) => (a.sgpa > b.sgpa ? a : b));
    const lowest = records.reduce((a, b) => (a.sgpa < b.sgpa ? a : b));

    res.json({ records, average: parseFloat(average), highest, lowest });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/sgpa/:id — update semester name or subjects
router.put('/:id', protect, async (req, res) => {
  try {
    const record = await SgpaRecord.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const { semester, sgpa, subjects } = req.body;
    if (semester !== undefined) record.semester = semester;
    if (sgpa !== undefined) record.sgpa = parseFloat(sgpa);
    if (subjects !== undefined) record.subjects = subjects;

    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/sgpa/:id — delete a record
router.delete('/:id', protect, async (req, res) => {
  try {
    const record = await SgpaRecord.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
