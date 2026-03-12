const prisma = require('../config/database');
const { createClientSchema, updateClientSchema } = require('../validators/schemas');
const z = require('zod');
const { logHistorique } = require('../utils/historique');

class ClientController {
  /**
   * @swagger
   * /clients:
   *   get:
   *     summary: Récupérer tous les clients
   *     tags: [Clients]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des clients
   */
  async getAll(req, res) {
    try {
      const clients = await prisma.client.findMany({
        include: {
          ventes: {
            select: {
              id: true,
              montantTotal: true,
              statut: true,
              createdAt: true
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: { ventes: true }
          }
        },
        orderBy: { nom: 'asc' }
      });

      res.json({ data: clients });
    } catch (error) {
      console.error('Erreur getAll clients:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /clients/{id}:
   *   get:
   *     summary: Récupérer un client par ID
   *     tags: [Clients]
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
   *         description: Client trouvé
   *       404:
   *         description: Client non trouvé
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          ventes: {
            include: {
              articles: {
                include: {
                  produit: {
                    select: { id: true, nom: true, reference: true }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          paiementsCredit: {
            orderBy: { date: 'desc' }
          }
        }
      });

      if (!client) {
        return res.status(404).json({ error: 'Client non trouvé' });
      }

      res.json({ data: client });
    } catch (error) {
      console.error('Erreur getById client:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /clients:
   *   post:
   *     summary: Créer un nouveau client
   *     tags: [Clients]
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
   *               telephone:
   *                 type: string
   *               email:
   *                 type: string
   *               adresse:
   *                 type: string
   *     responses:
   *       201:
   *         description: Client créé
   *       400:
   *         description: Données invalides
   */
  async create(req, res) {
    try {
      const validatedData = createClientSchema.parse(req.body);

      const client = await prisma.client.create({
        data: validatedData
      });

      // Logger la création
      await logHistorique({
        action: 'creation',
        entite: 'client',
        entiteId: client.id,
        description: `Client ${client.nom} créé`,
        utilisateurId: req.user.userId,
        donneesApres: client,
        req,
      });

      res.status(201).json({
        message: 'Client créé avec succès',
        data: client
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation échouée', 
          details: error.errors 
        });
      }
      console.error('Erreur create client:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /clients/{id}:
   *   put:
   *     summary: Mettre à jour un client
   *     tags: [Clients]
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
   *         description: Client mis à jour
   *       404:
   *         description: Client non trouvé
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateClientSchema.parse(req.body);

      // Récupérer l'ancien client pour comparaison
      const oldClient = await prisma.client.findUnique({ where: { id } });

      const client = await prisma.client.update({
        where: { id },
        data: validatedData
      });

      // Logger la modification
      await logHistorique({
        action: 'modification',
        entite: 'client',
        entiteId: client.id,
        description: `Client ${client.nom} modifié`,
        utilisateurId: req.user.userId,
        donneesAvant: oldClient,
        donneesApres: client,
        req,
      });

      res.json({
        message: 'Client mis à jour avec succès',
        data: client
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation échouée', 
          details: error.errors 
        });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Client non trouvé' });
      }
      console.error('Erreur update client:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /clients/{id}:
   *   delete:
   *     summary: Supprimer un client
   *     tags: [Clients]
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
   *         description: Client supprimé
   *       404:
   *         description: Client non trouvé
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.client.delete({
        where: { id }
      });

      res.json({ message: 'Client supprimé avec succès' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Client non trouvé' });
      }
      console.error('Erreur delete client:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /clients/credits:
   *   get:
   *     summary: Récupérer les clients avec crédit
   *     tags: [Clients]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Clients avec crédit
   */
  async getClientsWithCredit(req, res) {
    try {
      const clients = await prisma.client.findMany({
        where: {
          totalCredit: {
            gt: 0
          }
        },
        orderBy: { totalCredit: 'desc' }
      });

      res.json({ data: clients });
    } catch (error) {
      console.error('Erreur getClientsWithCredit:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

module.exports = new ClientController();
