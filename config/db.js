const mongoose = require("mongoose");
const { Sequelize } = require("sequelize");

// ─── MongoDB Connection ───
const connectMongo = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// ─── PostgreSQL Connection ───
// This logic checks if you provided a single URL (Production) or separate parts (Local)
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Required for Neon.tech
        },
      },
      logging: false,
    })
  : new Sequelize(
      process.env.PG_DATABASE,
      process.env.PG_USER,
      process.env.PG_PASSWORD,
      {
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        dialect: "postgres",
        logging: false,
      }
    );

const connectPostgres = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ PostgreSQL connected successfully`);

    // In production, we use { alter: true } for the first run to create tables
    await sequelize.sync({ alter: true });
    console.log("✅ PostgreSQL tables synced");
  } catch (error) {
    console.error(`❌ PostgreSQL connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectMongo, connectPostgres, sequelize };