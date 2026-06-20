import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './models/index.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import carRoutes from './routes/carRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import renterActionRoutes from './routes/renterActionRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check / Root
app.get('/', (req, res) => {
  res.send('ViVuCar Server is running...');
});

// Get System config public (UC11, UC29)
app.get('/api/system/config', async (req, res) => {
  try {
    const config = await db.system_config.get();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải cấu hình hệ thống.' });
  }
});

// Register routers
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use(carRoutes);
app.use(bookingRoutes);
app.use(supportRoutes);
app.use(adminRoutes);
app.use(emailRoutes);
app.use(paymentRoutes);
app.use(renterActionRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
