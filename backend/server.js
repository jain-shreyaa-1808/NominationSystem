const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// In production the frontend is served from the same origin, no CORS needed.
// In development allow localhost:3000.
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: 'http://localhost:3000' }));
}

app.use(express.json());

// API routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/manager',  require('./routes/manager'));
app.use('/api/senior',   require('./routes/seniorManager'));
app.use('/api/director', require('./routes/director'));
app.use('/api/ai',       require('./routes/ai'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(buildPath));
  // All non-API routes return the React app
  app.get('*', (_req, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

// MongoDB connection
const mongoOptions = {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
};
if (process.env.MONGO_TLS_ALLOW_INVALID_CERT === 'true') {
  mongoOptions.tlsAllowInvalidCertificates = true;
  mongoOptions.tls = true;
  console.log('⚠️  TLS certificate validation disabled (corporate mode)');
}

mongoose
  .connect(process.env.MONGO_URI, mongoOptions)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
