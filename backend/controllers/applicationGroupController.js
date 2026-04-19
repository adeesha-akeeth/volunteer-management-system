const ApplicationGroup = require('../models/ApplicationGroup');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

const getGroupsForOpportunity = async (req, res) => {
  try {
    const groups = await ApplicationGroup.find({ opportunity: req.params.opportunityId })
      .populate({ path: 'applications', populate: { path: 'volunteer', select: 'name email phone' } });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const { opportunityId, name, description } = req.body;
    const opp = await Opportunity.findById(opportunityId);
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });
    if (opp.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    const group = await ApplicationGroup.create({
      opportunity: opportunityId, name, description: description || '', createdBy: req.user.id
    });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = await ApplicationGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await ApplicationGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    await ApplicationGroup.findByIdAndDelete(req.params.id);
    res.json({ message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const assignToGroup = async (req, res) => {
  try {
    const { applicationId } = req.body;
    const group = await ApplicationGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    // Remove from other groups for same opportunity first
    await ApplicationGroup.updateMany(
      { opportunity: group.opportunity, _id: { $ne: group._id } },
      { $pull: { applications: applicationId } }
    );
    if (!group.applications.map(a => a.toString()).includes(applicationId)) {
      group.applications.push(applicationId);
    }
    await group.save();
    const updated = await ApplicationGroup.findById(group._id)
      .populate({ path: 'applications', populate: { path: 'volunteer', select: 'name email phone' } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const removeFromGroup = async (req, res) => {
  try {
    const group = await ApplicationGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    group.applications = group.applications.filter(a => a.toString() !== req.params.applicationId);
    await group.save();
    res.json({ message: 'Removed from group' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const acceptAllInGroup = async (req, res) => {
  try {
    const group = await ApplicationGroup.findById(req.params.id).populate('applications');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    const pendingIds = group.applications.filter(a => a.status === 'pending').map(a => a._id);
    await Application.updateMany({ _id: { $in: pendingIds } }, { status: 'approved' });
    res.json({ message: `${pendingIds.length} application(s) approved` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const rejectAllInGroup = async (req, res) => {
  try {
    const group = await ApplicationGroup.findById(req.params.id).populate('applications');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    const pendingIds = group.applications.filter(a => a.status === 'pending').map(a => a._id);
    await Application.updateMany({ _id: { $in: pendingIds } }, { status: 'rejected' });
    res.json({ message: `${pendingIds.length} application(s) rejected` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getGroupsForOpportunity, createGroup, updateGroup, deleteGroup,
  assignToGroup, removeFromGroup, acceptAllInGroup, rejectAllInGroup
};
