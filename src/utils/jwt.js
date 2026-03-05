const jwt = require('jsonwebtoken');
const config = require('../config/env');

class JwtUtils {
  static generateToken(payload) {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new Error('Token invalide ou expiré');
    }
  }
}

module.exports = JwtUtils;
