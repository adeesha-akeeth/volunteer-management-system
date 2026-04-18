const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  targetPoints: { type: Number, required: true },
  bonusPoints: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  pointsAtStart: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'overdue'], default: 'active' },
  completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
