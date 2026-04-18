const Goal = require('../models/Goal');
const Notification = require('../models/Notification');
const { computeBasePoints } = require('./pointsController');

const PRESET_BONUS = { 100: 10, 200: 20, 300: 30, 500: 50, 1000: 100 };

const createGoal = async (req, res) => {
  try {
    const { title, targetPoints, startDate, endDate } = req.body;
    const bonus = PRESET_BONUS[Number(targetPoints)];
    if (!bonus) return res.status(400).json({ message: 'Invalid target points. Choose 100, 200, 300, 500, or 1000.' });
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
    if (!endDate) return res.status(400).json({ message: 'End date is required' });

    const { baseTotal } = await computeBasePoints(req.user.id);

    const goal = await Goal.create({
      user: req.user.id,
      title: title.trim(),
      targetPoints: Number(targetPoints),
      bonusPoints: bonus,
      startDate: startDate || new Date(),
      endDate,
      pointsAtStart: baseTotal
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });
    const { baseTotal: currentBase } = await computeBasePoints(req.user.id);

    const results = await Promise.all(goals.map(async (goal) => {
      const gained = Math.max(0, currentBase - goal.pointsAtStart);
      const progress = Math.min(gained / goal.targetPoints, 1);

      if (goal.status === 'active') {
        if (gained >= goal.targetPoints) {
          goal.status = 'completed';
          goal.completedAt = new Date();
          await goal.save();
          try {
            await Notification.create({
              recipient: goal.user,
              type: 'goal_complete',
              message: `🎯 Goal achieved — "${goal.title}"! +${goal.bonusPoints} bonus pts awarded.`,
              relatedId: goal._id
            });
          } catch {}
        } else if (new Date(goal.endDate) < new Date()) {
          goal.status = 'overdue';
          await goal.save();
          try {
            await Notification.create({
              recipient: goal.user,
              type: 'goal_overdue',
              message: `⏰ Your goal "${goal.title}" passed its deadline without being completed.`,
              relatedId: goal._id
            });
          } catch {}
        }
      }

      return {
        ...goal.toObject(),
        gained,
        progress
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateGoal = async (req, res) => {
  try {
    const { title, targetPoints, startDate, endDate } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    if (title !== undefined) goal.title = title.trim();
    if (targetPoints !== undefined) {
      const bonus = PRESET_BONUS[Number(targetPoints)];
      if (!bonus) return res.status(400).json({ message: 'Invalid target points' });
      goal.targetPoints = Number(targetPoints);
      goal.bonusPoints = bonus;
    }
    if (startDate !== undefined) goal.startDate = startDate;
    if (endDate !== undefined) goal.endDate = endDate;

    await goal.save();

    const { baseTotal: currentBase } = await computeBasePoints(req.user.id);
    const gained = Math.max(0, currentBase - goal.pointsAtStart);
    const progress = Math.min(gained / goal.targetPoints, 1);

    res.json({ ...goal.toObject(), gained, progress });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createGoal, getMyGoals, updateGoal, deleteGoal };
