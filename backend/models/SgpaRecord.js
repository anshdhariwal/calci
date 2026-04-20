const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  credits: { type: String, required: true },
  grade: { type: String, required: true },
});

const sgpaRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  semester: {
    type: String,
    required: [true, 'Semester name is required'],
    trim: true,
  },
  sgpa: {
    type: Number,
    required: true,
    min: 0,
    max: 10,
  },
  subjects: [subjectSchema],
}, { timestamps: true });

module.exports = mongoose.model('SgpaRecord', sgpaRecordSchema);
