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
const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'CRM Sanmora Backend Engine',
    version: '1.0.0',
    timestamp: new Date()
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Register Routes (Supports both with /api and without /api prefixes)
const authRoutes = require('./routes/auth.routes');
const roleRoutes = require('./routes/role.routes');
const userRoutes = require('./routes/user.routes');
const announcementRoutes = require('./routes/announcement.routes');
const customerRoutes = require('./routes/customer.routes');
const followupRoutes = require('./routes/followup.routes');
const taskRoutes = require('./routes/task.routes');
const aiRoutes = require('./routes/ai.routes');

// Routes mounted with /api
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);

// Fallback direct routes (in case client config omitted /api in NEXT_PUBLIC_API_URL)
app.use('/auth', authRoutes);
app.use('/roles', roleRoutes);
app.use('/users', userRoutes);
app.use('/announcements', announcementRoutes);
app.use('/customers', customerRoutes);
app.use('/followups', followupRoutes);
app.use('/tasks', taskRoutes);
app.use('/ai', aiRoutes);

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
