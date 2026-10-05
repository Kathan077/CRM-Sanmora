const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const connUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm_sanmora';

  try {
    // Set strictQuery option
    mongoose.set('strictQuery', false);

    // Try connecting to primary MongoDB (local or Atlas)
    const conn = await mongoose.connect(connUri, {
      maxPoolSize: 100,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 3000 // Quick fallback if MongoDB is not running locally
    });

    console.log(`[Database] MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.warn(`[Database Warning] Local MongoDB connection failed (${error.message}).`);
    console.log(`[Database] Starting In-Memory MongoDB Server for instant seamless operation...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();

      const conn = await mongoose.connect(memUri);
      console.log(`[Database] Connected to In-Memory MongoDB: ${memUri}`);
      return conn;
    } catch (memErr) {
      console.error(`[Database Error] Could not start MongoDB connection: ${memErr.message}`);
      process.exit(1);
    }
  }
};

const closeDB = async () => {
  await mongoose.connection.close();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};

module.exports = { connectDB, closeDB };
