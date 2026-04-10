const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['volunteer', 'organization', 'admin'],
    default: 'volunteer'
  },
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);