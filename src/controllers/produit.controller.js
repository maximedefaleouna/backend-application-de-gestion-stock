const prisma = require('../config/database');
const { createProduitSchema, updateProduitSchema } = require('../validators/schemas');
const ApiResponse = require('../utils/apiResponse');
const z = require('zod');
const path = require('path');

class ProduitController {
  /**
   * @swagger
   * /produits:
   *   get:
   *     summary: Récupérer tous les produits
   *     tags: [Produits]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: categorieId
   *         schema:
   *           type: string
   *       - in: query
   *         name: disponible
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Liste des produits
   */
  async getAll(req, res) {
    try {
      const { categorieId, disponible, search } = req.query;

      const where = {};

      if (categorieId) {
        where.categorieId = categorieId;
      }

      if (disponible !== undefined) {
        where.disponible = disponible === 'true';
      }

      if (search) {
        where.OR = [
          { nom: { contains: search, mode: 'insensitive' } },
          { reference: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const produits = await prisma.produit.findMany({
        where,
        include: {
          categorie: {
            select: { id: true, nom: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return ApiResponse.success(res, produits, 'Produits récupérés avec succès');
    } catch (error) {
      console.error('Erreur getAll produits:', error);
      return ApiResponse.error(res, 'Erreur serveur', 500);
    }
  }

  /**
   * @swagger
   * /produits/{id}:
   *   get:
   *     summary: Récupérer un produit par ID
   *     tags: [Produits]
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
   *         description: Produit trouvé
   *       404:
   *         description: Produit non trouvé
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const produit = await prisma.produit.findUnique({
        where: { id },
        include: {
          categorie: true,
          articlesVente: {
            take: 10,
            include: {
              vente: {
                select: {
                  id: true,
                  montantTotal: true,
                  statut: true,
                  createdAt: true
                }
              }
            },
            orderBy: { vente: { createdAt: 'desc' } }
          }
        }
      });

      if (!produit) {
        return ApiResponse.error(res, 'Produit non trouvé', 404);
      }

      return ApiResponse.success(res, produit, 'Produit récupéré avec succès');
    } catch (error) {
      console.error('Erreur getById produit:', error);
      return ApiResponse.error(res, 'Erreur serveur', 500);
    }
  }

  /**
   * @swagger
   * /produits:
   *   post:
   *     summary: Créer un nouveau produit
   *     tags: [Produits]
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
   *               reference:
   *                 type: string
   *               description:
   *                 type: string
   *               categorieId:
   *                 type: string
   *               marque:
   *                 type: string
   *               prixVente:
   *                 type: number
   *               stock:
   *                 type: number
   *               stockMin:
   *                 type: number
   *               imageUrl:
   *                 type: string
   *               disponible:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Produit créé
   *       400:
   *         description: Données invalides
   */
  async create(req, res) {
    try {
      // Gérer l'upload d'image si présente
      let imageUrl = null;
      
      if (req.file) {
        // Construire l'URL de l'image
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        imageUrl = `${baseUrl}/uploads/products/${path.basename(req.file.path)}`;
      }

      // Parser les données du body (sans imageUrl car géré séparément)
      const productData = { ...req.body };
      if (imageUrl) {
        productData.imageUrl = imageUrl;
      }

      const validatedData = createProduitSchema.parse(productData);

      // Vérifier si la référence existe déjà
      const existingProduit = await prisma.produit.findUnique({
        where: { reference: validatedData.reference }
      });

      if (existingProduit) {
        return ApiResponse.error(res, 'Cette référence existe déjà', 400);
      }

      const produit = await prisma.produit.create({
        data: validatedData,
        include: { categorie: true }
      });

      return ApiResponse.created(res, produit, 'Produit créé avec succès');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        return ApiResponse.error(res, 'Validation échouée', 400, errors);
      }
      if (error.code === 'P2002') {
        return ApiResponse.error(res, 'Référence déjà utilisée', 400);
      }
      console.error('Erreur create produit:', error);
      return ApiResponse.error(res, 'Erreur serveur', 500);
    }
  }

  /**
   * @swagger
   * /produits/{id}:
   *   put:
   *     summary: Mettre à jour un produit
   *     tags: [Produits]
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
   *         description: Produit mis à jour
   *       404:
   *         description: Produit non trouvé
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateProduitSchema.parse(req.body);

      const produit = await prisma.produit.update({
        where: { id },
        data: validatedData,
        include: { categorie: true }
      });

      return ApiResponse.success(res, produit, 'Produit mis à jour avec succès');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        return ApiResponse.error(res, 'Validation échouée', 400, errors);
      }
      if (error.code === 'P2025') {
        return ApiResponse.error(res, 'Produit non trouvé', 404);
      }
      console.error('Erreur update produit:', error);
      return ApiResponse.error(res, 'Erreur serveur', 500);
    }
  }

  /**
   * @swagger
   * /produits/{id}:
   *   delete:
   *     summary: Supprimer un produit
   *     tags: [Produits]
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
   *         description: Produit supprimé
   *       404:
   *         description: Produit non trouvé
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.produit.delete({
        where: { id }
      });

      return ApiResponse.success(res, null, 'Produit supprimé avec succès');
    } catch (error) {
      if (error.code === 'P2025') {
        return ApiResponse.error(res, 'Produit non trouvé', 404);
      }
      console.error('Erreur delete produit:', error);
      return ApiResponse.error(res, 'Erreur serveur', 500);
    }
  }

  /**
   * @swagger
   * /produits/stock/alertes:
   *   get:
   *     summary: Récupérer les produits avec stock faible
   *     tags: [Produits]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Produits avec stock faible
   */
  async getLowStock(req, res) {
    try {
      const produits = await prisma.produit.findMany({
        where: {
          stock: {
            lte: prisma.produit.fields.stockMin
          }
        },
        include: {
          categorie: true
        }
      });

      return ApiResponse.success(res, produits, 'Produits avec stock faible récupérés avec succès');
    } catch (error) {
      console.error('Erreur getLowStock produits:', error);
      return ApiResponse.error(res, 'Erreur serveur', 500);
    }
  }
}

module.exports = new ProduitController();
