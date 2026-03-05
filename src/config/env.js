require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'votre-secret-key-tres-securisee',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'
};
