const prisma = require('../config/database');
const { createVenteSchema, updateVenteSchema } = require('../validators/schemas');
const z = require('zod');
const { logHistorique } = require('../utils/historique');
const { notifyNewVente, notifyNewCredit, checkStockAlert } = require('../utils/notifications');

class VenteController {
  /**
   * @swagger
   * /ventes:
   *   get:
   *     summary: Récupérer toutes les ventes
   *     tags: [Ventes]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: statut
   *         schema:
   *           type: string
   *           enum: [completee, credit, partielle, annulee]
   *       - in: query
   *         name: clientId
   *         schema:
   *           type: string
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Liste des ventes
   */
  async getAll(req, res) {
    try {
      const { statut, clientId, startDate, endDate } = req.query;

      const where = {};

      if (statut) {
        where.statut = statut;
      }

      if (clientId) {
        where.clientId = clientId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const ventes = await prisma.vente.findMany({
        where,
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
        },
        orderBy: { createdAt: 'desc' }
      });

      // Formater les numeros de vente
      const formattedVentes = ventes.map(vente => ({
        ...vente,
        formattedVenteNumber: `V-${String(vente.venteNumber).padStart(7, '0')}`
      }));

      res.json({ data: formattedVentes });
    } catch (error) {
      console.error('Erreur getAll ventes:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /ventes/{id}:
   *   get:
   *     summary: Récupérer une vente par ID
   *     tags: [Ventes]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Vente trouvée
   *       404:
   *         description: Vente non trouvée
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const vente = await prisma.vente.findUnique({
        where: { id },
        include: {
          client: true,
          vendeur: {
            select: { id: true, nom: true, prenom: true, email: true }
          },
          articles: {
            include: {
              produit: {
                select: { id: true, nom: true, reference: true, imageUrl: true }
              }
            }
          },
          paiementsCredit: true
        }
      });

      if (!vente) {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }

      // Ajouter le numero de vente formaté
      const formattedVente = {
        ...vente,
        formattedVenteNumber: `V-${String(vente.venteNumber).padStart(7, '0')}`
      };

      res.json({ data: formattedVente });
    } catch (error) {
      console.error('Erreur getById vente:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /ventes:
   *   post:
   *     summary: Créer une nouvelle vente
   *     tags: [Ventes]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               montantTotal:
   *                 type: number
   *               montantPaye:
   *                 type: number
   *               modePaiement:
   *                 type: string
   *                 enum: [espece, mobile_money, carte, credit]
   *               statut:
   *                 type: string
   *                 enum: [completee, credit, partielle, annulee]
   *               clientId:
   *                 type: string
   *               estCredit:
   *                 type: boolean
   *               articles:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     produitId:
   *                       type: string
   *                     quantite:
   *                       type: number
   *                     prixUnitaire:
   *                       type: number
   *     responses:
   *       201:
   *         description: Vente créée
   *       400:
   *         description: Données invalides
   */
  async create(req, res) {
    try {
      const validatedData = createVenteSchema.parse(req.body);
      const { articles, ...venteData } = validatedData;

      // Vérifier le stock pour chaque produit
      for (const article of articles) {
        const produit = await prisma.produit.findUnique({
          where: { id: article.produitId }
        });

        if (!produit) {
          return res.status(404).json({ 
            error: `Produit non trouvé: ${article.produitId}` 
          });
        }

        if (produit.stock < article.quantite) {
          return res.status(400).json({ 
            error: `Stock insuffisant pour ${produit.nom}. Stock actuel: ${produit.stock}` 
          });
        }
      }

      // Si c'est un crédit, vérifier que la date d'échéance est fournie
      if (validatedData.estCredit && !validatedData.dateEcheance) {
        return res.status(400).json({ 
          error: 'La date d\'échéance est obligatoire pour les ventes à crédit' 
        });
      }

      // Créer la vente avec les articles (venteNumber est auto-généré)
      const vente = await prisma.vente.create({
        data: {
          ...venteData,
          montantRestant: venteData.montantTotal - (venteData.montantPaye || 0),
          vendeurId: req.user.userId,
          articles: {
            create: articles.map(article => ({
              produitId: article.produitId,
              quantite: article.quantite,
              prixUnitaire: article.prixUnitaire,
              prixTotal: article.quantite * article.prixUnitaire
            }))
          }
        },
        include: {
          articles: {
            include: {
              produit: true
            }
          },
          client: true
        }
      });

      // Mettre à jour le stock des produits
      for (const article of articles) {
        await prisma.produit.update({
          where: { id: article.produitId },
          data: {
            stock: {
              decrement: article.quantite
            }
          }
        });

        // Créer un mouvement de stock
        const produit = await prisma.produit.findUnique({
          where: { id: article.produitId }
        });

        await prisma.mouvementStock.create({
          data: {
            produitId: article.produitId,
            type: 'sortie',
            quantite: article.quantite,
            motif: `Vente #${vente.id}`,
            utilisateurId: req.user.userId
          }
        });
      }

      // Si c'est un crédit, mettre à jour le total credit du client
      if (vente.estCredit && vente.clientId) {
        const client = await prisma.client.findUnique({
          where: { id: vente.clientId },
          select: { nom: true }
        });
        
        await prisma.client.update({
          where: { id: vente.clientId },
          data: {
            totalCredit: {
              increment: vente.montantRestant
            }
          }
        });
        
        // Notification pour nouveau crédit
        await notifyNewCredit(vente, client?.nom || 'Client', vente.dateEcheance);
      }

      // Formater le numero de vente (V-0000001, V-0000002, etc.)
      const formattedVenteNumber = `V-${String(vente.venteNumber).padStart(7, '0')}`;

      // Notification pour nouvelle vente
      await notifyNewVente(vente, req.user.userId);

      // Logger la création de la vente
      await logHistorique({
        action: 'vente',
        entite: 'vente',
        entiteId: vente.id,
        description: `Vente #${formattedVenteNumber} créée - Montant: ${vente.montantTotal} FCFA`,
        utilisateurId: req.user.userId,
        donneesApres: {
          ...vente,
          formattedVenteNumber,
          articles: vente.articles
        },
        req,
      });

      res.status(201).json({
        message: 'Vente créée avec succès',
        data: {
          ...vente,
          formattedVenteNumber
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation échouée', 
          details: error.errors 
        });
      }
      console.error('Erreur create vente:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /ventes/{id}:
   *   put:
   *     summary: Mettre à jour une vente
   *     tags: [Ventes]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Vente mise à jour
   *       404:
   *         description: Vente non trouvée
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateVenteSchema.parse(req.body);

      const vente = await prisma.vente.update({
        where: { id },
        data: {
          ...validatedData,
          montantRestant: validatedData.montantTotal - validatedData.montantPaye
        },
        include: {
          articles: {
            include: { produit: true }
          }
        }
      });

      res.json({
        message: 'Vente mise à jour avec succès',
        data: vente
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation échouée', 
          details: error.errors 
        });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }
      console.error('Erreur update vente:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /ventes/{id}:
   *   delete:
   *     summary: Supprimer une vente
   *     tags: [Ventes]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Vente supprimée
   *       404:
   *         description: Vente non trouvée
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      // Récupérer la vente pour restaurer le stock
      const vente = await prisma.vente.findUnique({
        where: { id },
        include: { articles: true }
      });

      if (!vente) {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }

      // Restaurer le stock
      for (const article of vente.articles) {
        await prisma.produit.update({
          where: { id: article.produitId },
          data: {
            stock: {
              increment: article.quantite
            }
          }
        });
      }

      // Supprimer la vente
      await prisma.vente.delete({
        where: { id }
      });

      res.json({ message: 'Vente supprimée avec succès' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }
      console.error('Erreur delete vente:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /ventes/stats:
   *   get:
   *     summary: Statistiques des ventes
   *     tags: [Ventes]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Statistiques des ventes
   */
  async getStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const where = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const totalVentes = await prisma.vente.count({ where });
      
      const totalMontant = await prisma.vente.aggregate({
        where,
        _sum: { montantTotal: true }
      });

      const ventesParStatut = await prisma.vente.groupBy({
        by: ['statut'],
        where,
        _count: { id: true }
      });

      res.json({
        data: {
          totalVentes,
          totalMontant: totalMontant._sum.montantTotal || 0,
          ventesParStatut
        }
      });
    } catch (error) {
      console.error('Erreur getStats ventes:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

module.exports = new VenteController();
