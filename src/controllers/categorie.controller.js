const prisma = require('../config/database');
const { createCategorieSchema, updateCategorieSchema } = require('../validators/schemas');
const ApiResponse = require('../utils/apiResponse');
const z = require('zod');

class CategorieController {
  /**
   * @swagger
   * /categories:
   *   get:
   *     summary: Récupérer toutes les catégories
   *     tags: [Catégories]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des catégories
   */
  async getAll(req, res) {
    try {
      const categories = await prisma.categorie.findMany({
        include: {
          produits: {
            select: {
              id: true,
              nom: true,
              reference: true
            }
          },
          _count: {
            select: { produits: true }
          }
        },
        orderBy: { nom: 'asc' }
      });

      res.json({ data: categories });
    } catch (error) {
      console.error('Erreur getAll categories:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /categories/{id}:
   *   get:
   *     summary: Récupérer une catégorie par ID
   *     tags: [Catégories]
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
   *         description: Catégorie trouvée
   *       404:
   *         description: Catégorie non trouvée
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const categorie = await prisma.categorie.findUnique({
        where: { id },
        include: {
          produits: {
            select: {
              id: true,
              nom: true,
              reference: true,
              prixVente: true,
              stock: true
            }
          }
        }
      });

      if (!categorie) {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
      }

      res.json({ data: categorie });
    } catch (error) {
      console.error('Erreur getById categorie:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /categories:
   *   post:
   *     summary: Créer une nouvelle catégorie
   *     tags: [Catégories]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nom:
   *                 type: string
   *               description:
   *                 type: string
   *     responses:
   *       201:
   *         description: Catégorie créée
   *       400:
   *         description: Données invalides
   */
  async create(req, res) {
    try {
      const validatedData = createCategorieSchema.parse(req.body);

      const categorie = await prisma.categorie.create({
        data: validatedData
      });

      res.status(201).json({
        message: 'Catégorie créée avec succès',
        data: categorie
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation échouée', 
          details: error.errors 
        });
      }
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Ce nom de catégorie existe déjà' });
      }
      console.error('Erreur create categorie:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /categories/{id}:
   *   put:
   *     summary: Mettre à jour une catégorie
   *     tags: [Catégories]
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
   *         description: Catégorie mise à jour
   *       404:
   *         description: Catégorie non trouvée
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateCategorieSchema.parse(req.body);

      const categorie = await prisma.categorie.update({
        where: { id },
        data: validatedData
      });

      res.json({
        message: 'Catégorie mise à jour avec succès',
        data: categorie
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation échouée', 
          details: error.errors 
        });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
      }
      console.error('Erreur update categorie:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /categories/{id}:
   *   delete:
   *     summary: Supprimer une catégorie
   *     tags: [Catégories]
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
   *         description: Catégorie supprimée
   *       404:
   *         description: Catégorie non trouvée
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.categorie.delete({
        where: { id }
      });

      res.json({ message: 'Catégorie supprimée avec succès' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          error: 'Impossible de supprimer : cette catégorie contient des produits' 
        });
      }
      console.error('Erreur delete categorie:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

module.exports = new CategorieController();
