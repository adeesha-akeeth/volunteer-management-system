const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const fs = require('fs');
const path = require('path');

// Create uploads folder if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

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

const favouriteRoutes = require('./routes/favouriteRoutes');
app.use('/api/favourites', favouriteRoutes);

const fundraiserRoutes = require('./routes/fundraiserRoutes');
app.use('/api/fundraisers', fundraiserRoutes);

const voteRoutes = require('./routes/voteRoutes');
app.use('/api/votes', voteRoutes);

const commentRoutes = require('./routes/commentRoutes');
app.use('/api/comments', commentRoutes);

const applicationGroupRoutes = require('./routes/applicationGroupRoutes');
app.use('/api/application-groups', applicationGroupRoutes);

const contributionRoutes = require('./routes/contributionRoutes');
app.use('/api/contributions', contributionRoutes);

const pointsRoutes = require('./routes/pointsRoutes');
app.use('/api/points', pointsRoutes);

const goalRoutes = require('./routes/goalRoutes');
app.use('/api/goals', goalRoutes);

const userFeedbackRoutes = require('./routes/userFeedbackRoutes');
app.use('/api/feedback', userFeedbackRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

const publisherRoutes = require('./routes/publisherRoutes');
app.use('/api/publisher', publisherRoutes);

const followRoutes = require('./routes/followRoutes');
app.use('/api/follows', followRoutes);

const opportunityRatingRoutes = require('./routes/opportunityRatingRoutes');
app.use('/api/opportunity-ratings', opportunityRatingRoutes);

// Seed admin user on startup using env-configured credentials
const seedAdmin = async () => {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      console.log('ADMIN_EMAIL or ADMIN_PASSWORD not set in .env — skipping admin seed');
      return;
    }
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      const hashed = await bcrypt.hash(adminPassword, 10);
      await User.create({ name: 'Admin', email: adminEmail, password: hashed, phone: '', role: 'admin' });
      console.log('Admin user seeded');
    }
  } catch (err) {
    console.log('Admin seed error:', err.message);
  }
};

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected successfully!');
    await seedAdmin();
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.log('MongoDB connection error:', err);
  });