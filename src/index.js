require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');

const app = express();

// رؤوس أمان أساسية (helmet) - بتمنع كذا نوع هجوم شائع زي clickjacking
app.use(helmet());

// حد أقصى لحجم الطلبات عشان محدش يبعت بيانات ضخمة يعطل السيرفر
app.use(express.json({ limit: '100kb' }));

// CORS: نقبل طلبات من دومين المتجر بس في الإنتاج
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
  })
);

// حد أقصى عام لكل الطلبات من نفس الـ IP (حماية إضافية من إساءة الاستخدام)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// معالج أخطاء عام - عشان محدش يشوف تفاصيل تقنية حساسة لو حصل خطأ غير متوقع
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'حصل خطأ في السيرفر' });
});

// على Render/Railway السيرفر بيفضل شغال طول الوقت (app.listen)
// على Vercel، النظام serverless وبيستدعي الملف ده مباشرة، فمش محتاجين app.listen هناك
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ الباك إند شغال على بورت ${PORT}`);
  });
}

module.exports = app;
