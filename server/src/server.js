const express = require('express');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const seedInitialData = require('./utils/seed');
const { notFound, errorHandler } = require('./middleware/error.middleware');

// Load Environment Variables
dotenv.config();

const app = express();

// Middlewares
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'CRM Sanmora Backend Engine',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// Register Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/roles', require('./routes/role.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/announcements', require('./routes/announcement.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/followups', require('./routes/followup.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/ai', require('./routes/ai.routes'));

// Fallback & Error Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

let serverInstance = null;

const startServer = async () => {
  await connectDB();
  await seedInitialData();

  serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 CRM Sanmora Backend running on http://localhost:${PORT}`);
    console.log(`🔑 Super Admin Email: admin@sanmoracrm.com | Pass: Admin@123456`);
    console.log(`=======================================================`);
  });

  return serverInstance;
};

// Auto start if executed directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
