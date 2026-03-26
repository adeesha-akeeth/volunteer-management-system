const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  photo: {
    type: String,
    default: ''
  },
  opportunities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Favourite', favouriteSchema);