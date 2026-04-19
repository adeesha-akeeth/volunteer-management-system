const UserFeedback = require('../models/UserFeedback');
const User = require('../models/User');
const Notification = require('../models/Notification');

const createFeedback = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    const imageUrl = req.file ? req.file.path.replace(/\\/g, '/') : '';
    const feedback = await UserFeedback.create({
      user: req.user.id,
      title: title.trim(),
      message: message.trim(),
      image: imageUrl
    });

    try {
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await Notification.create({
          recipient: admin._id,
          type: 'new_feedback',
          message: `📩 New feedback from a user: "${title.trim()}"`,
          relatedId: feedback._id
        });
      }
    } catch {}

    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyFeedbacks = async (req, res) => {
  try {
    const feedbacks = await UserFeedback.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateFeedback = async (req, res) => {
  try {
    const { title, message, removeImage } = req.body;
    const feedback = await UserFeedback.findOne({ _id: req.params.id, user: req.user.id });
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    if (feedback.status === 'replied') {
      return res.status(400).json({ message: 'Cannot edit feedback that has already been replied to' });
    }
    if (title) feedback.title = title.trim();
    if (message) feedback.message = message.trim();
    if (req.file) {
      feedback.image = req.file.path.replace(/\\/g, '/');
    } else if (removeImage === 'true') {
      feedback.image = '';
    }
    await feedback.save();
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteFeedback = async (req, res) => {
  try {
    const feedback = await UserFeedback.findOne({ _id: req.params.id, user: req.user.id });
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    if (feedback.status === 'replied') {
      return res.status(400).json({ message: 'Cannot delete feedback that has already been replied to' });
    }
    await UserFeedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllFeedbacks = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const feedbacks = await UserFeedback.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const replyToFeedback = async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply?.trim()) return res.status(400).json({ message: 'Reply cannot be empty' });

    const feedback = await UserFeedback.findById(req.params.id).populate('user', 'name');
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    const imageUrl = req.file ? req.file.path.replace(/\\/g, '/') : '';
    feedback.replies.push({ text: reply.trim(), image: imageUrl });
    feedback.adminReply = reply.trim();
    feedback.status = 'replied';
    feedback.repliedAt = new Date();
    await feedback.save();

    try {
      await Notification.create({
        recipient: feedback.user._id,
        type: 'feedback_reply',
        message: `💬 Admin replied to your feedback: "${feedback.title}"`,
        relatedId: feedback._id
      });
    } catch {}

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createFeedback, getMyFeedbacks, updateFeedback, deleteFeedback, getAllFeedbacks, replyToFeedback };
