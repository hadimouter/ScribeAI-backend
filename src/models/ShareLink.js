const mongoose = require('mongoose');

const shareLinkSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  shareUrl: {  
    type: String,
    required: true
  },
  permission: {
    type: String,
    enum: ['read', 'edit'],
    default: 'read'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  lastAccessedAt: Date,
  accessCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ShareLink', shareLinkSchema);