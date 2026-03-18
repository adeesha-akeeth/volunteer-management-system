const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Volunteer Management API is running!' });
});

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Opportunity Routes
const opportunityRoutes = require('./routes/opportunityRoutes');
app.use('/api/opportunities', opportunityRoutes);

// Application Routes
const applicationRoutes = require('./routes/applicationRoutes');
app.use('/api/applications', applicationRoutes);

// Hours Routes
const hoursRoutes = require('./routes/hoursRoutes');
app.use('/api/hours', hoursRoutes);

// Feedback Routes
const feedbackRoutes = require('./routes/feedbackRoutes');
app.use('/api/feedback', feedbackRoutes);

// Donation Routes
const donationRoutes = require('./routes/donationRoutes');
app.use('/api/donations', donationRoutes);

// Certificate Routes
const certificateRoutes = require('./routes/certificateRoutes');
app.use('/api/certificates', certificateRoutes);

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully!');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.log('MongoDB connection error:', err);
  });