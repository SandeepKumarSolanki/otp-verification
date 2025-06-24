import mongoose from 'mongoose';

const connectDB = async () => {
  const dbURI = `${process.env.MONGODB_URI}/mern-Auth`;

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not defined in environment variables');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(dbURI, {
      dbName: 'mern-Auth',
      serverSelectionTimeoutMS: 5000, // Avoid hanging if DB is unreachable
    });

    console.log(`✅ MongoDB Connected to: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;



// import mongoose from "mongoose";

// const connectDB = async () => {
//     mongoose.connection.on("connected", () => {
//         console.log("MongoDB connected...");
//     });
//     await mongoose.connect(`${process.env.MONGODB_URI}/mern-Auth`)
// }
// export default connectDB;