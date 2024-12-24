const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['article', 'essay', 'report', 'thesis', 'memoir', 'internship_report', 'philosophical_essay'],
    default: 'article'
  },
  academicInfo: {
    citationStyle: {
      type: String,
      enum: ['apa', 'mla', 'chicago'],
      default: 'apa'
    },
    references: [{
      title: String,
      authors: [String],
      year: Number,
      url: String,
      type: String,
      citationKey: String
    }]
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  aiAssisted: {
    type: Boolean,
    default: false
  },
  version: {
    type: Number,
    default: 1
  },
  lastEditedAt: {
    type: Date,
    default: Date.now
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null 
  }
}, {
  timestamps: true
});

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;