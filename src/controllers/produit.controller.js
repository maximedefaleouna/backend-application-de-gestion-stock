const prisma = require('../config/database');
const { createProduitSchema, updateProduitSchema } = require('../validators/schemas');
const ApiResponse = require('../utils/apiResponse');
const z = require('zod');
const path = require('path');
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const { logHistorique } = require('../utils/historique');
const { checkStockAlert } = require('../utils/notifications');

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
        imageUrl = `/uploads/products/${path.basename(req.file.path)}`;
      }

      // Parser les données du body (sans imageUrl car géré séparément)
      const productData = { ...req.body };
      
      // Si une image a été uploadée, on l'ajoute
      if (imageUrl) {
        productData.imageUrl = imageUrl;
      }

      // Convertir les types si nécessaire (les FormData envoient des strings)
      if (productData.sellPrice) productData.sellPrice = Number(productData.sellPrice);
      if (productData.buyPrice) productData.buyPrice = Number(productData.buyPrice);
      if (productData.stock !== undefined) productData.stock = Number(productData.stock);
      if (productData.minStock !== undefined) productData.minStock = Number(productData.minStock);
      if (productData.available !== undefined) productData.available = productData.available === 'true';
      if (typeof productData.compatibleVehicles === 'string') {
        try {
          productData.compatibleVehicles = JSON.parse(productData.compatibleVehicles);
        } catch {
          productData.compatibleVehicles = [];
        }
      }

      const validatedData = createProduitSchema.parse(productData);
      let categorieId = validatedData.category;

      // Accepter soit un ID UUID, soit un nom de catégorie côté frontend
      if (!UUID_REGEX.test(categorieId)) {
        const categorie = await prisma.categorie.findFirst({
          where: { nom: categorieId },
          select: { id: true }
        });

        if (!categorie) {
          return ApiResponse.error(res, 'Catégorie invalide ou inexistante', 400);
        }
        categorieId = categorie.id;
      }

      // Vérifier si la référence existe déjà
      const existingProduit = await prisma.produit.findUnique({
        where: { reference: validatedData.reference }
      });

      if (existingProduit) {
        return ApiResponse.error(res, 'Cette référence existe déjà', 400);
      }

      const produit = await prisma.produit.create({
        data: {
          nom: validatedData.name,
          reference: validatedData.reference,
          description: validatedData.description,
          categorieId,
          marque: validatedData.brand,
          prixVente: validatedData.sellPrice,
          stock: validatedData.stock,
          stockMin: validatedData.minStock,
          imageUrl: validatedData.imageUrl || null,
          disponible: validatedData.available
        },
        include: { categorie: true }
      });

      // Vérifier si le stock initial est déjà en dessous du minimum
      await checkStockAlert(produit.id, produit.stock, produit.stockMin);

      // Logger la création
      await logHistorique({
        action: 'creation',
        entite: 'produit',
        entiteId: produit.id,
        description: `Produit ${produit.nom} (${produit.reference}) créé`,
        utilisateurId: req.user.userId,
        donneesApres: produit,
        req,
      });

      return ApiResponse.created(res, produit, 'Produit créé avec succès');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues || error.errors || [];
        const errors = issues.map(err => ({
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
      const dataToUpdate = {};

      if (validatedData.name !== undefined) dataToUpdate.nom = validatedData.name;
      if (validatedData.reference !== undefined) dataToUpdate.reference = validatedData.reference;
      if (validatedData.description !== undefined) dataToUpdate.description = validatedData.description;
      if (validatedData.brand !== undefined) dataToUpdate.marque = validatedData.brand;
      if (validatedData.sellPrice !== undefined) dataToUpdate.prixVente = validatedData.sellPrice;
      if (validatedData.stock !== undefined) dataToUpdate.stock = validatedData.stock;
      if (validatedData.minStock !== undefined) dataToUpdate.stockMin = validatedData.minStock;
      if (validatedData.imageUrl !== undefined) dataToUpdate.imageUrl = validatedData.imageUrl || null;
      if (validatedData.available !== undefined) dataToUpdate.disponible = validatedData.available;

      if (validatedData.category !== undefined) {
        let categorieId = validatedData.category;
        if (!UUID_REGEX.test(categorieId)) {
          const categorie = await prisma.categorie.findFirst({
            where: { nom: categorieId },
            select: { id: true }
          });

          if (!categorie) {
            return ApiResponse.error(res, 'Catégorie invalide ou inexistante', 400);
          }
          categorieId = categorie.id;
        }
        dataToUpdate.categorieId = categorieId;
      }

      const produit = await prisma.produit.update({
        where: { id },
        data: dataToUpdate,
        include: { categorie: true }
      });

      // Vérifier si le stock est en dessous du minimum et alerter
      if (dataToUpdate.stock !== undefined || dataToUpdate.minStock !== undefined) {
        await checkStockAlert(produit.id, produit.stock, produit.stockMin);
      }

      // Logger la modification
      await logHistorique({
        action: 'modification',
        entite: 'produit',
        entiteId: produit.id,
        description: `Produit ${produit.nom} (${produit.reference}) modifié`,
        utilisateurId: req.user.userId,
        donneesAvant: await prisma.produit.findUnique({ where: { id } }),
        donneesApres: produit,
        req,
      });

      return ApiResponse.success(res, produit, 'Produit mis à jour avec succès');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues || error.errors || [];
        const errors = issues.map(err => ({
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

      // Récupérer le produit avant suppression
      const oldProduit = await prisma.produit.findUnique({ where: { id } });

      await prisma.produit.delete({
        where: { id }
      });

      // Logger la suppression
      await logHistorique({
        action: 'suppression',
        entite: 'produit',
        entiteId: id,
        description: `Produit ${oldProduit?.nom} (${oldProduit?.reference}) supprimé`,
        utilisateurId: req.user.userId,
        donneesAvant: oldProduit,
        req,
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

