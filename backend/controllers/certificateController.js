const Certificate = require('../models/Certificate');
const Opportunity = require('../models/Opportunity');

// Issue a certificate
const issueCertificate = async (req, res) => {
  try {
    const { volunteerId, opportunityId, issuedBy, hoursCompleted } = req.body;

    // Check if opportunity exists
    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Check if certificate already issued for this volunteer and opportunity
    const existingCertificate = await Certificate.findOne({
      volunteer: volunteerId,
      opportunity: opportunityId
    });
    if (existingCertificate) {
      return res.status(400).json({ message: 'Certificate already issued for this volunteer and opportunity' });
    }

    // If an org logo was uploaded, save its path
    const orgLogo = req.file ? req.file.path : '';

    const certificate = await Certificate.create({
      volunteer: volunteerId,
      opportunity: opportunityId,
      issuedBy,
      hoursCompleted,
      orgLogo
    });

    res.status(201).json({
      message: 'Certificate issued successfully',
      certificate
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all certificates for the logged in volunteer
const getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ volunteer: req.user.id })
      .populate('opportunity', 'title organization location date')
      .sort({ issueDate: -1 });

    res.status(200).json(certificates);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all certificates (admin view)
const getAllCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate('volunteer', 'name email')
      .populate('opportunity', 'title organization')
      .sort({ issueDate: -1 });

    res.status(200).json(certificates);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single certificate by ID
const getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('volunteer', 'name email')
      .populate('opportunity', 'title organization location date');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.status(200).json(certificate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Revoke a certificate
const revokeCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    certificate.status = 'revoked';
    await certificate.save();

    res.status(200).json({
      message: 'Certificate revoked successfully',
      certificate
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a certificate
const deleteCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    await Certificate.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  issueCertificate,
  getMyCertificates,
  getAllCertificates,
  getCertificateById,
  revokeCertificate,
  deleteCertificate
};