const mongoose = require("mongoose");
const { Sequelize } = require("sequelize");

// ─── MongoDB Connection (Documents: screenings, referrals, logs) ───
const connectMongo = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// ─── PostgreSQL Connection (Structured: users, centres, workers, districts) ───
const sequelize = new Sequelize(
  process.env.PG_DATABASE,
  process.env.PG_USER,
  process.env.PG_PASSWORD,
  {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const connectPostgres = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ PostgreSQL connected: ${process.env.PG_HOST}/${process.env.PG_DATABASE}`);

    // Sync models (creates tables if they don't exist)
    // Use { alter: true } in development, { force: false } in production
    await sequelize.sync({
      alter: process.env.NODE_ENV === "development",
    });
    console.log("✅ PostgreSQL tables synced");
  } catch (error) {
    console.error(`❌ PostgreSQL connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectMongo, connectPostgres, sequelize };
