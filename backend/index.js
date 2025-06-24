import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import connectDB from './config/mongodb.js';

import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
const app = express();
const port = process.env.PORT || 4000;

// ✅ Await DB connection
await connectDB();

const allowedOrigins = ['http://localhost:5173','https://authmern-frontend.vercel.app'];

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));


app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);


app.get('/', (req, res) => {
  res.json({ success: true, message: "API Working" });
});

app.listen(port, () => {
  console.log(`🚀 Server started on PORT: ${port}`);
});
