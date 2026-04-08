const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['application_status', 'new_application', 'donation_status', 'donation_received', 'contribution_received'],
    required: true
  },
  message: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
