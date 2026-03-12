const prisma = require('../config/database');

/**
 * Enregistre une action dans l'historique
 * @param {Object} options - Options d'enregistrement
 * @param {string} options.action - Type d'action (creation, modification, suppression, etc.)
 * @param {string} options.entite - Entité concernée (vente, produit, client, etc.)
 * @param {string} [options.entiteId] - ID de l'entité
 * @param {string} options.description - Description de l'action
 * @param {string} [options.utilisateurId] - ID de l'utilisateur (sera automatiquement ajouté si req est fourni)
 * @param {Object} [options.donneesAvant] - Données avant l'action
 * @param {Object} [options.donneesApres] - Données après l'action
 * @param {Object} [options.req] - Requête Express (pour extraire IP et user agent)
 * @returns {Promise<Object>} L'entrée historique créée
 */
async function logHistorique({
  action,
  entite,
  entiteId,
  description,
  utilisateurId,
  donneesAvant,
  donneesApres,
  req,
}) {
  try {
    const adresseIP = req ? (req.ip || req.connection?.remoteAddress) : null;
    const userAgent = req ? (req.headers['user-agent'] || null) : null;

    const historique = await prisma.historique.create({
      data: {
        action,
        entite,
        entiteId: entiteId || null,
        description,
        utilisateurId: utilisateurId || null,
        donneesAvant: donneesAvant || null,
        donneesApres: donneesApres || null,
        adresseIP,
        userAgent,
      },
    });

    return historique;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement dans l\'historique:', error);
    // On ne propage pas l'erreur pour ne pas bloquer l'opération principale
    return null;
  }
}

module.exports = {
  logHistorique,
};
