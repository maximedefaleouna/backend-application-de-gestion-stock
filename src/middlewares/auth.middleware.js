const JwtUtils = require('../utils/jwt');

/**
 * Middleware d'authentification
 * Vérifie si le token JWT est valide et attache l'utilisateur à la requête
 */
function authenticate(req, res, next) {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token d\'authentification requis',
        message: 'Veuillez fournir un token JWT dans le header Authorization: Bearer <token>'
      });
    }

    const token = authHeader.substring(7);

    // Vérifier le token
    const decoded = JwtUtils.verifyToken(token);

    // Attacher les informations utilisateur à la requête
    req.user = decoded;

    next();
  } catch (error) {
    if (error.message === 'Token invalide ou expiré') {
      return res.status(401).json({ 
        error: 'Token invalide ou expiré',
        message: 'Veuillez vous reconnecter'
      });
    }

    console.error('Erreur authenticate:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'authentification' });
  }
}

/**
 * Middleware d'autorisation admin
 * Vérifie si l'utilisateur a le rôle admin
 */
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Accès refusé',
      message: 'Vous devez être administrateur pour effectuer cette action'
    });
  }

  next();
}

/**
 * Middleware d'autorisation vendeur
 * Vérifie si l'utilisateur a le rôle vendeur ou admin
 */
function isSeller(req, res, next) {
  if (!['vendeur', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Accès refusé',
      message: 'Vous devez être vendeur ou administrateur'
    });
  }

  next();
}

module.exports = {
  authenticate,
  isAdmin,
  isSeller
};
