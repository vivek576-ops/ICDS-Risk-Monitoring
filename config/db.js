const mongoose = require("mongoose");
const { Sequelize } = require("sequelize");

const connectMongo = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// This version checks both possible names (DATABASE_URL and PG_DATABASE_URL)
const dbUrl = process.env.DATABASE_URL || process.env.PG_DATABASE_URL;

const sequelize = dbUrl
  ? new Sequelize(dbUrl, {
      dialect: "postgres",
      protocol: "postgres",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
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
        dialect: "postgres",
        logging: false,
      }
    );

const connectPostgres = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ PostgreSQL connected successfully`);

    // Only sync if explicitly told to, or on first cloud run
    await sequelize.sync({ alter: true });
    console.log("✅ PostgreSQL tables synced");
  } catch (error) {
    // This will now print the FULL error so we can see what's wrong
    console.error(`❌ PostgreSQL connection error: ${error.name} - ${error.message}`);
    if (error.original) console.error(`Original Error: ${error.original.message}`);
    process.exit(1);
  }
};

module.exports = { connectMongo, connectPostgres, sequelize };