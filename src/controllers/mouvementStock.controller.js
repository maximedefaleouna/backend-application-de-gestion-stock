const prisma = require('../config/database');
const { createMouvementStockSchema } = require('../validators/schemas');

class MouvementStockController {
  /**
   * @swagger
   * /mouvements-stock:
   *   get:
   *     summary: Récupérer tous les mouvements de stock
   *     tags: [Mouvements Stock]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: produitId
   *         schema:
   *           type: string
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [entree, sortie, ajustement]
   *     responses:
   *       200:
   *         description: Liste des mouvements
   */
  async getAll(req, res) {
    try {
      const { produitId, type } = req.query;

      const where = {};
      if (produitId) where.produitId = produitId;
      if (type) where.type = type;

      const mouvements = await prisma.mouvementStock.findMany({
        where,
        include: {
          produit: {
            select: { id: true, nom: true, reference: true }
          },
          utilisateur: {
            select: { id: true, nom: true, prenom: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      res.json({ data: mouvements });
    } catch (error) {
      console.error('Erreur getAll mouvements:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /mouvements-stock:
   *   post:
   *     summary: Créer un mouvement de stock
   *     tags: [Mouvements Stock]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               produitId:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [entree, sortie, ajustement]
   *               quantite:
   *                 type: number
   *               motif:
   *                 type: string
   *     responses:
   *       201:
   *         description: Mouvement créé
   *       400:
   *         description: Données invalides
   */
  async create(req, res) {
    try {
      const validatedData = createMouvementStockSchema.parse(req.body);

      const mouvement = await prisma.mouvementStock.create({
        data: {
          ...validatedData,
          utilisateurId: req.user.userId
        },
        include: {
          produit: true,
          utilisateur: true
        }
      });

      // Mettre à jour le stock si c'est une entrée ou sortie
      if (validatedData.type === 'entree') {
        await prisma.produit.update({
          where: { id: validatedData.produitId },
          data: {
            stock: {
              increment: validatedData.quantite
            }
          }
        });
      } else if (validatedData.type === 'sortie') {
        await prisma.produit.update({
          where: { id: validatedData.produitId },
          data: {
            stock: {
              decrement: validatedData.quantite
            }
          }
        });
      }

      res.status(201).json({
        message: 'Mouvement de stock créé avec succès',
        data: mouvement
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation échouée', 
          details: error.errors 
        });
      }
      console.error('Erreur create mouvement:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /mouvements-stock/{id}:
   *   delete:
   *     summary: Supprimer un mouvement de stock
   *     tags: [Mouvements Stock]
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
   *         description: Mouvement supprimé
   *       404:
   *         description: Mouvement non trouvé
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.mouvementStock.delete({
        where: { id }
      });

      res.json({ message: 'Mouvement de stock supprimé avec succès' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Mouvement non trouvé' });
      }
      console.error('Erreur delete mouvement:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

module.exports = new MouvementStockController();
