const prisma = require('../config/database');

class HistoriqueController {
  /**
   * @swagger
   * /historique:
   *   get:
   *     summary: Récupérer l'historique des actions
   *     tags: [Historique]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *       - in: query
   *         name: action
   *         schema:
   *           type: string
   *       - in: query
   *         name: entite
   *         schema:
   *           type: string
   *       - in: query
   *         name: utilisateurId
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Historique récupéré
   */
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      const { action, entite, utilisateurId } = req.query;

      const where = {};

      if (action) {
        where.action = action;
      }

      if (entite) {
        where.entite = entite;
      }

      if (utilisateurId) {
        where.utilisateurId = utilisateurId;
      }

      const [historiques, total] = await Promise.all([
        prisma.historique.findMany({
          where,
          include: {
            utilisateur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.historique.count({ where }),
      ]);

      res.json({
        data: historiques,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Erreur getAll historique:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /historique/stats:
   *   get:
   *     summary: Récupérer les statistiques de l'historique
   *     tags: [Historique]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Statistiques récupérées
   */
  async getStats(req, res) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [totalActions, actionsToday, actionsLastWeek, actionsLastMonth] = await Promise.all([
        prisma.historique.count(),
        prisma.historique.count({ where: { createdAt: { gte: today } } }),
        prisma.historique.count({ where: { createdAt: { gte: lastWeek } } }),
        prisma.historique.count({ where: { createdAt: { gte: lastMonth } } }),
      ]);

      // Group by action
      const groupByAction = await prisma.historique.groupBy({
        by: ['action'],
        _count: {
          action: true,
        },
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
        take: 10,
      });

      // Group by entity
      const groupByEntity = await prisma.historique.groupBy({
        by: ['entite'],
        _count: {
          entite: true,
        },
        orderBy: {
          _count: {
            entite: 'desc',
          },
        },
        take: 10,
      });

      // Top users
      const topUsers = await prisma.historique.groupBy({
        by: ['utilisateurId'],
        _count: {
          utilisateurId: true,
        },
        where: { utilisateurId: { not: null } },
        orderBy: {
          _count: {
            utilisateurId: 'desc',
          },
        },
        take: 10,
      });

      res.json({
        data: {
          totalActions,
          actionsToday,
          actionsLastWeek,
          actionsLastMonth,
          groupByAction,
          groupByEntity,
          topUsers,
        },
      });
    } catch (error) {
      console.error('Erreur getStats historique:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /historique:
   *   post:
   *     summary: Créer une entrée dans l'historique
   *     tags: [Historique]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               action:
   *                 type: string
   *               entite:
   *                 type: string
   *               entiteId:
   *                 type: string
   *               description:
   *                 type: string
   *               donneesAvant:
   *                 type: object
   *               donneesApres:
   *                 type: object
   *     responses:
   *       201:
   *         description: Historique créé
   */
  async create(req, res) {
    try {
      const { action, entite, entiteId, description, donneesAvant, donneesApres } = req.body;

      const utilisateurId = req.user?.id || null;
      const adresseIP = req.ip || req.connection?.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      const historique = await prisma.historique.create({
        data: {
          action,
          entite,
          entiteId: entiteId || null,
          description,
          utilisateurId,
          donneesAvant: donneesAvant || null,
          donneesApres: donneesApres || null,
          adresseIP,
          userAgent,
        },
        include: {
          utilisateur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
              role: true,
            },
          },
        },
      });

      res.status(201).json({
        message: 'Historique enregistré',
        data: historique,
      });
    } catch (error) {
      console.error('Erreur create historique:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

module.exports = new HistoriqueController();
