const prisma = require('../config/database');

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Récupérer les statistiques du tableau de bord
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Date de début (par défaut: aujourd'hui)"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Date de fin (par défaut: aujourd'hui)"
 *     responses:
 *       200:
 *         description: Statistiques du tableau de bord
 */

/**
 * @swagger
 * /statistiques:
 *   get:
 *     summary: Récupérer les statistiques détaillées pour les graphiques
 *     tags: [Statistiques]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin
 *     responses:
 *       200:
 *         description: Statistiques détaillées
 */

class DashboardController {
  async getDashboard(req, res) {
    try {
      // Par défaut, aujourd'hui
      const { startDate, endDate } = req.query;
      
      // Gérer les dates avec précision en utilisant le fuseau horaire UTC pour la base de données
      let start, end;
      
      if (startDate) {
        // Créer une date à partir de la chaîne YYYY-MM-DD (date locale)
        const [year, month, day] = startDate.split('-').map(Number);
        // Créer la date en heure locale puis convertir en UTC pour la requête
        const localStart = new Date(year, month - 1, day, 0, 0, 0, 0);
        start = new Date(Date.UTC(
          localStart.getFullYear(),
          localStart.getMonth(),
          localStart.getDate(),
          localStart.getHours(),
          localStart.getMinutes(),
          localStart.getSeconds(),
          localStart.getMilliseconds()
        ));
      } else {
        // Aujourd'hui à 00:00:00
        const now = new Date();
        const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        start = new Date(Date.UTC(
          localStart.getFullYear(),
          localStart.getMonth(),
          localStart.getDate(),
          localStart.getHours(),
          localStart.getMinutes(),
          localStart.getSeconds(),
          localStart.getMilliseconds()
        ));
      }
      
      if (endDate) {
        // Créer une date à partir de la chaîne YYYY-MM-DD (date locale)
        const [year, month, day] = endDate.split('-').map(Number);
        // Créer la date en heure locale puis convertir en UTC pour la requête
        const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
        end = new Date(Date.UTC(
          localEnd.getFullYear(),
          localEnd.getMonth(),
          localEnd.getDate(),
          localEnd.getHours(),
          localEnd.getMinutes(),
          localEnd.getSeconds(),
          localEnd.getMilliseconds()
        ));
      } else {
        // Aujourd'hui à 23:59:59.999
        const now = new Date();
        const localEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        end = new Date(Date.UTC(
          localEnd.getFullYear(),
          localEnd.getMonth(),
          localEnd.getDate(),
          localEnd.getHours(),
          localEnd.getMinutes(),
          localEnd.getSeconds(),
          localEnd.getMilliseconds()
        ));
      }

      console.log('Période dashboard:', { 
        start: start.toISOString(), 
        end: end.toISOString(),
        localStart: new Date(start).toLocaleString('fr-FR'),
        localEnd: new Date(end).toLocaleString('fr-FR')
      });

      // Récupérer toutes les ventes de la période
      const ventes = await prisma.vente.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        include: {
          client: {
            select: { id: true, nom: true, telephone: true }
          },
          vendeur: {
            select: { id: true, nom: true, prenom: true }
          },
          articles: {
            include: {
              produit: {
                select: { id: true, nom: true, reference: true }
              }
            }
          }
        }
      });

      // Calculer les stats principales
      const totalVentes = ventes.length;
      const totalRevenue = ventes.reduce((sum, v) => sum + v.montantTotal, 0);
      const totalPaid = ventes.reduce((sum, v) => sum + v.montantPaye, 0);
      const totalRemaining = ventes.reduce((sum, v) => sum + v.montantRestant, 0);
      
      // Ventes par statut
      const ventesParStatut = ventes.reduce((acc, v) => {
        acc[v.statut] = (acc[v.statut] || 0) + 1;
        return acc;
      }, {});

      // Crédits en cours (ventes avec statut 'credit' ou 'partielle')
      const pendingCredits = ventes
        .filter(v => v.estCredit && v.statut !== 'completee')
        .reduce((sum, v) => sum + v.montantRestant, 0);

      // Nombre de crédits
      const creditCount = ventes.filter(v => v.estCredit).length;

      // Produits les plus vendus
      const productSales = {};
      ventes.forEach(vente => {
        vente.articles.forEach(article => {
          if (!productSales[article.produit.nom]) {
            productSales[article.produit.nom] = {
              name: article.produit.nom,
              quantity: 0,
              revenue: 0
            };
          }
          productSales[article.produit.nom].quantity += article.quantite;
          productSales[article.produit.nom].revenue += article.prixTotal;
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Revenus par jour (pour le graphique)
      const dailyRevenue = {};
      ventes.forEach(vente => {
        const dateKey = new Date(vente.createdAt).toISOString().split('T')[0];
        if (!dailyRevenue[dateKey]) {
          dailyRevenue[dateKey] = {
            date: dateKey,
            revenue: 0,
            sales: 0
          };
        }
        dailyRevenue[dateKey].revenue += vente.montantTotal;
        dailyRevenue[dateKey].sales += 1;
      });

      const revenueData = Object.values(dailyRevenue).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      // Paiements par mode
      const paymentsByMethod = ventes.reduce((acc, v) => {
        acc[v.modePaiement] = (acc[v.modePaiement] || 0) + 1;
        return acc;
      }, {});

      // Alertes stock (produits avec stock bas)
      const lowStockProducts = await prisma.produit.findMany({
        where: {
          stock: {
            lte: prisma.produit.fields.stockMin
          }
        },
        select: {
          id: true,
          nom: true,
          reference: true,
          stock: true,
          stockMin: true
        }
      });

      res.json({
        success: true,
        message: 'Statistiques du tableau de bord récupérées avec succès',
        data: {
          period: {
            startDate: start.toISOString(),
            endDate: end.toISOString()
          },
          summary: {
            totalVentes,
            totalRevenue,
            totalPaid,
            totalRemaining,
            pendingCredits,
            creditCount
          },
          kpis: {
            averageCart: totalVentes > 0 ? Math.round(totalRevenue / totalVentes) : 0,
            completionRate: totalVentes > 0 
              ? Math.round((ventesParStatut['completee'] || 0) / totalVentes * 100) 
              : 0
          },
          ventesParStatut,
          paymentsByMethod,
          topProducts,
          revenueData,
          lowStockProducts: lowStockProducts.map(p => ({
            id: p.id,
            name: p.nom,
            reference: p.reference,
            stock: p.stock,
            stockMin: p.stockMin
          }))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur getDashboard:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erreur serveur lors de la récupération des statistiques' 
      });
    }
  }

  async getStatistiques(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // Gérer les dates avec précision en utilisant le fuseau horaire UTC pour la base de données
      let start, end;
      
      if (startDate) {
        // Créer une date à partir de la chaîne YYYY-MM-DD (date locale)
        const [year, month, day] = startDate.split('-').map(Number);
        // Créer la date en heure locale puis convertir en UTC pour la requête
        const localStart = new Date(year, month - 1, day, 0, 0, 0, 0);
        start = new Date(Date.UTC(
          localStart.getFullYear(),
          localStart.getMonth(),
          localStart.getDate(),
          localStart.getHours(),
          localStart.getMinutes(),
          localStart.getSeconds(),
          localStart.getMilliseconds()
        ));
      } else {
        // Aujourd'hui à 00:00:00
        const now = new Date();
        const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        start = new Date(Date.UTC(
          localStart.getFullYear(),
          localStart.getMonth(),
          localStart.getDate(),
          localStart.getHours(),
          localStart.getMinutes(),
          localStart.getSeconds(),
          localStart.getMilliseconds()
        ));
      }
      
      if (endDate) {
        // Créer une date à partir de la chaîne YYYY-MM-DD (date locale)
        const [year, month, day] = endDate.split('-').map(Number);
        // Créer la date en heure locale puis convertir en UTC pour la requête
        const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
        end = new Date(Date.UTC(
          localEnd.getFullYear(),
          localEnd.getMonth(),
          localEnd.getDate(),
          localEnd.getHours(),
          localEnd.getMinutes(),
          localEnd.getSeconds(),
          localEnd.getMilliseconds()
        ));
      } else {
        // Aujourd'hui à 23:59:59.999
        const now = new Date();
        const localEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        end = new Date(Date.UTC(
          localEnd.getFullYear(),
          localEnd.getMonth(),
          localEnd.getDate(),
          localEnd.getHours(),
          localEnd.getMinutes(),
          localEnd.getSeconds(),
          localEnd.getMilliseconds()
        ));
      }

      console.log('Période statistiques:', { 
        start: start.toISOString(), 
        end: end.toISOString(),
        localStart: new Date(start).toLocaleString('fr-FR'),
        localEnd: new Date(end).toLocaleString('fr-FR')
      });

      // Récupérer toutes les ventes et produits
      const [ventes, produits] = await Promise.all([
        prisma.vente.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end
            }
          },
          include: {
            articles: {
              include: {
                produit: {
                  select: { 
                    id: true, 
                    nom: true, 
                    categorieId: true,
                    categorie: {
                      select: { nom: true }
                    }
                  }
                }
              }
            }
          }
        }),
        prisma.produit.findMany({
          include: {
            categorie: {
              select: { nom: true }
            }
          }
        })
      ]);

      console.log(`Ventes trouvées: ${ventes.length}, Période: ${start.toISOString()} à ${end.toISOString()}`);

      // Évolution des revenus par jour
      const dailyStats = {};
      
      // Générer tous les jours de la période (en UTC)
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        dailyStats[dateKey] = {
          date: dateKey,
          revenue: 0,
          sales: 0,
          dayLabel: currentDate.toLocaleDateString('fr-FR', { weekday: 'short' })
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Remplir avec les données réelles en utilisant createdAt
      ventes.forEach(vente => {
        // Utiliser createdAt pour extraire la date (format UTC)
        const dateKey = new Date(vente.createdAt).toISOString().split('T')[0];
        if (dailyStats[dateKey]) {
          dailyStats[dateKey].revenue += vente.montantTotal;
          dailyStats[dateKey].sales += 1;
        }
      });

      const evolutionData = Object.values(dailyStats);

      // Répartition par catégorie
      const categoryStats = {};
      ventes.forEach(vente => {
        vente.articles.forEach(article => {
          const categoryName = article.produit.categorie?.nom || 'Non classé';
          if (!categoryStats[categoryName]) {
            categoryStats[categoryName] = {
              name: categoryName,
              quantity: 0,
              revenue: 0
            };
          }
          categoryStats[categoryName].quantity += article.quantite;
          categoryStats[categoryName].revenue += article.prixTotal;
        });
      });

      const categoryData = Object.values(categoryStats);

      // Top produits
      const productStats = {};
      ventes.forEach(vente => {
        vente.articles.forEach(article => {
          if (!productStats[article.produit.nom]) {
            productStats[article.produit.nom] = {
              name: article.produit.nom,
              quantity: 0,
              revenue: 0
            };
          }
          productStats[article.produit.nom].quantity += article.quantite;
          productStats[article.produit.nom].revenue += article.prixTotal;
        });
      });

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Stats globales
      const totalRevenue = ventes.reduce((sum, v) => sum + v.montantTotal, 0);
      const totalSales = ventes.length;
      const averageCart = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
      const pendingCredits = ventes
        .filter(v => v.estCredit && v.statut !== 'completee')
        .reduce((sum, v) => sum + v.montantRestant, 0);

      res.json({
        success: true,
        message: 'Statistiques détaillées récupérées avec succès',
        data: {
          period: {
            startDate: start.toISOString(),
            endDate: end.toISOString()
          },
          summary: {
            totalRevenue,
            totalSales,
            averageCart,
            pendingCredits
          },
          evolutionData,
          categoryData,
          topProducts
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur getStatistiques:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erreur serveur lors de la récupération des statistiques détaillées' 
      });
    }
  }
}

module.exports = new DashboardController();
