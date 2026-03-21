const prisma = require('../config/database');

/**
 * Crée une notification automatique
 * @param {string} type - 'vente', 'stock', 'credit', 'systeme'
 * @param {string} titre - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {string|null} utilisateurId - ID de l'utilisateur concerné (optionnel)
 */
async function createNotification({ type, titre, message, utilisateurId = null }) {
  try {
    await prisma.notification.create({
      data: {
        type,
        titre,
        message,
        utilisateurId,
        lu: false,
      },
    });
    console.log(`Notification créée: ${titre}`);
  } catch (error) {
    console.error('Erreur création notification:', error);
  }
}

/**
 * Vérifie et alerte pour stock faible
 * @param {string} produitId - ID du produit
 * @param {number} stockActuel - Stock actuel
 * @param {number} minStock - Stock minimum
 */
async function checkStockAlert(produitId, stockActuel, minStock) {
  if (stockActuel <= minStock) {
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      select: { nom: true, reference: true },
    });

    await createNotification({
      type: 'stock',
      titre: '⚠️ Stock faible',
      message: `Le produit "${produit?.nom}" (${produit?.reference}) n'a plus que ${stockActuel} unités en stock (minimum: ${minStock})`,
      utilisateurId: null, // Visible par tous les admins
    });
  }
}

/**
 * Crée une notification de nouvelle vente
 * @param {object} vente - La vente créée
 * @param {string} vendeurId - ID du vendeur
 */
async function notifyNewVente(vente, vendeurId) {
  await createNotification({
    type: 'vente',
    titre: '💰 Nouvelle vente',
    message: `Vente #V-${String(vente.venteNumber).padStart(7, '0')} enregistrée - Montant: ${vente.montantTotal} FCFA`,
    utilisateurId: vendeurId,
  });
}

/**
 * Crée une notification de crédit accordé
 * @param {object} vente - La vente à crédit
 * @param {string} clientNom - Nom du client
 * @param {Date} dateEcheance - Date d'échéance
 */
async function notifyNewCredit(vente, clientNom, dateEcheance) {
  await createNotification({
    type: 'credit',
    titre: '💳 Nouveau crédit accordé',
    message: `Crédit de ${vente.montantRestant} FCFA accordé à "${clientNom}" - Échéance: ${new Date(dateEcheance).toLocaleDateString('fr-FR')}`,
    utilisateurId: null, // Visible par admin
  });
}

/**
 * Crée une notification de crédit arrivé à échéance
 * @param {object} vente - La vente à crédit
 * @param {string} clientNom - Nom du client
 */
async function notifyCreditEchu(vente, clientNom) {
  const daysOverdue = Math.floor((new Date() - new Date(vente.dateEcheance)) / (1000 * 60 * 60 * 24));
  await createNotification({
    type: 'credit',
    titre: `🚨 Crédit échoué - ${daysOverdue} jour(s) de retard`,
    message: `Le crédit de ${vente.montantRestant} FCFA de "${clientNom}" est arrivé à échéance depuis le ${new Date(vente.dateEcheance).toLocaleDateString('fr-FR')} (${daysOverdue} jour(s) de retard, reste à payer: ${vente.montantRestant} FCFA)`,
    utilisateurId: null,
  });
}

/**
 * Envoie une notification de rappel de paiement (3 jours avant échéance)
 * @param {object} vente - La vente à crédit
 * @param {string} clientNom - Nom du client
 * @param {number} daysUntilDue - Nombre de jours avant l'échéance
 */
async function notifyCreditRappel(vente, clientNom, daysUntilDue = 3) {
  let messageRappel;
  if (daysUntilDue === 0) {
    messageRappel = `Le crédit de "${clientNom}" (${vente.montantRestant} FCFA) arrive à échéance AUJOURD'HUI (${new Date(vente.dateEcheance).toLocaleDateString('fr-FR')})`;
  } else if (daysUntilDue === 1) {
    messageRappel = `Le crédit de "${clientNom}" (${vente.montantRestant} FCFA) arrive à échéance DEMAIN (${new Date(vente.dateEcheance).toLocaleDateString('fr-FR')})`;
  } else {
    messageRappel = `Le crédit de "${clientNom}" (${vente.montantRestant} FCFA) arrive à échéance dans ${daysUntilDue} jours (${new Date(vente.dateEcheance).toLocaleDateString('fr-FR')})`;
  }
  
  await createNotification({
    type: 'credit',
    titre: `⏰ Rappel de paiement ${daysUntilDue === 0 ? '- URGENT' : ''}`,
    message: messageRappel,
    utilisateurId: null,
  });
}

module.exports = {
  createNotification,
  checkStockAlert,
  notifyNewVente,
  notifyNewCredit,
  notifyCreditEchu,
  notifyCreditRappel,
};
