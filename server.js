require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const debug = require('debug')('app:server'); // Debug logging
const swaggerConfig = require('./config/swagger');
const documentRoutes = require('./routes/documentRoutes'); // Assuming you have a documentRoutes.js file

// Import DB connector
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');

// Import middleware
const errorMiddleware = require('./middleware/errorMiddleware');

// Initialize Express app
const app = express();

// Connect to database
connectDB(); 

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging to file
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs');
}
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'logs', 'access.log'),
  { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));

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
app.use('/api/documents', documentRoutes); // Assuming you have a documentRoutes.js file

// Error handling
app.use(errorMiddleware);

// Swagger
swaggerConfig(app);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  debug(`Server running on port ${PORT}`);
});
