require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const debug = require('debug')('app:server'); // Debug logging
const swaggerConfig = require('./config/swagger');
const documentRoutes = require('./routes/documentRoutes'); // Assuming you have a documentRoutes.js file

// Import DB connector
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware
const errorMiddleware = require('./middleware/errorMiddleware');

// Initialize Express app
const app = express();

// Connect to database
connectDB(); 

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Middleware
app.use(cors({
  origin: function (origin, callback) {
    callback(null, origin || '*'); 
  },
  credentials: true
}));
// Debug request logger
if (process.env.NODE_ENV === 'development') {
  debug('Debugging is enabled');
  app.use((req, res, next) => {
    debug(`Request URL: ${req.originalUrl} - Method: ${req.method}`);
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes); 
app.use('/api/admin', adminRoutes); 

// Error handling
app.use(errorMiddleware);

// Swagger
swaggerConfig(app);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  debug(`Server running on port ${PORT}`);
});
