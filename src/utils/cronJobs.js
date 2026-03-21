const prisma = require('../config/database');
const { notifyCreditEchu, notifyCreditRappel, checkStockAlert } = require('./notifications');

/**
 * Vérifie TOUS les produits et génère des alertes pour stock faible
 */
async function checkAllStockAlerts() {
  try {
    console.log('🔍 Vérification de tous les stocks...');
    
    const products = await prisma.produit.findMany({
      select: {
        id: true,
        nom: true,
        reference: true,
        stock: true,
        stockMin: true,
      }
    });
    
    let alertCount = 0;
    
    for (const product of products) {
      if (product.stock <= product.stockMin) {
        await checkStockAlert(product.id, product.stock, product.stockMin);
        alertCount++;
        console.log(`⚠️ Alerte créée: ${product.nom} - Stock: ${product.stock}/${product.stockMin}`);
      }
    }
    
    console.log(`✅ Vérification stock terminée - ${alertCount} alertes créées`);
  } catch (error) {
    console.error('❌ Erreur vérification stocks:', error);
  }
}

/**
 * Vérifie quotidiennement les crédits arrivant à échéance
 * - Crédits échus (date dépassée)
 * - Rappels 3 jours avant échéance
 */
async function checkCreditDeadlines() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    console.log('🔍 Vérification des crédits -', today.toLocaleDateString('fr-FR'));

    // 1. Crédits échus non payés (date d'échéance dépassée)
    const creditsEchus = await prisma.vente.findMany({
      where: {
        estCredit: true,
        montantRestant: { gt: 0 },
        dateEcheance: { lt: today },
      },
      include: {
        client: {
          select: { nom: true }
        }
      }
    });

    for (const credit of creditsEchus) {
      await notifyCreditEchu(credit, credit.client?.nom || 'Client');
      console.log(`🚨 Crédit échu notifié: ${credit.client?.nom} - ${credit.montantRestant} FCFA`);
    }

    // 2. Crédits arrivant à échéance dans 3 jours (mais pas aujourd'hui)
    const creditsBientotEchus = await prisma.vente.findMany({
      where: {
        estCredit: true,
        montantRestant: { gt: 0 },
        dateEcheance: {
          gte: today,
          lte: in3Days
        }
      },
      include: {
        client: {
          select: { nom: true }
        }
      }
    });

    for (const credit of creditsBientotEchus) {
      const echeanceDate = new Date(credit.dateEcheance);
      const diffTime = echeanceDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Ne pas envoyer de rappel si c'est déjà échu ou si c'est dans plus de 3 jours
      if (diffDays < 0 || diffDays > 3) continue;
      
      await notifyCreditRappel(credit, credit.client?.nom || 'Client', diffDays);
      const echeanceText = diffDays === 0 ? "aujourd'hui" : diffDays === 1 ? "demain" : `dans ${diffDays} jours`;
      console.log(`⏰ Rappel envoyé: ${credit.client?.nom} - Échéance: ${echeanceDate.toLocaleDateString('fr-FR')} (${echeanceText})`);
    }

    console.log(`✅ Vérification terminée - ${creditsEchus.length} échus, ${creditsBientotEchus.length} rappels`);
  } catch (error) {
    console.error('❌ Erreur vérification crédits:', error);
  }
}

module.exports = {
  checkAllStockAlerts,
  checkCreditDeadlines
};
