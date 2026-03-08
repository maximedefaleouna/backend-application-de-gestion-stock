const prisma = require('../config/database');
const { createNotificationSchema } = require('../validators/schemas');
const z = require('zod');

class NotificationController {
  /**
   * @swagger
   * /notifications:
   *   get:
   *     summary: Récupérer les notifications
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des notifications
   */
  async getAll(req, res) {
    try {
      const notifications = await prisma.notification.findMany({
        where: req.user.role === 'admin' 
          ? {} 
          : { OR: [{ utilisateurId: req.user.userId }, { utilisateurId: null }] },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ data: notifications });
    } catch (error) {
      console.error('Erreur getAll notifications:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /notifications/non-lues:
   *   get:
   *     summary: Récupérer les notifications non lues
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Notifications non lues
   */
  async getUnread(req, res) {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          lu: false,
          OR: req.user.role === 'admin'
            ? {}
            : [{ utilisateurId: req.user.userId }, { utilisateurId: null }]
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ data: notifications });
    } catch (error) {
      console.error('Erreur getUnread notifications:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /notifications/{id}/lire:
   *   put:
   *     summary: Marquer une notification comme lue
   *     tags: [Notifications]
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
   *         description: Notification marquée comme lue
   *       404:
   *         description: Notification non trouvée
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.update({
        where: { id },
        data: { lu: true }
      });

      res.json({
        message: 'Notification marquée comme lue',
        data: notification
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Notification non trouvée' });
      }
      console.error('Erreur markAsRead notifications:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /notifications/tout-lire:
   *   put:
   *     summary: Marquer toutes les notifications comme lues
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Toutes les notifications marquées comme lues
   */
  async markAllAsRead(req, res) {
    try {
      await prisma.notification.updateMany({
        where: {
          OR: req.user.role === 'admin'
            ? {}
            : [{ utilisateurId: req.user.userId }]
        },
        data: { lu: true }
      });

      res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
    } catch (error) {
      console.error('Erreur markAllAsRead notifications:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /notifications:
   *   post:
   *     summary: Créer une notification
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [vente, stock, credit, systeme]
   *               titre:
   *                 type: string
   *               message:
   *                 type: string
   *               utilisateurId:
   *                 type: string
   *     responses:
   *       201:
   *         description: Notification créée
   */
  async create(req, res) {
    try {
      const validatedData = createNotificationSchema.parse(req.body);

      const notification = await prisma.notification.create({
        data: validatedData
      });

      res.status(201).json({
        message: 'Notification créée avec succès',
        data: notification
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation échouée', 
          details: error.errors 
        });
      }
      console.error('Erreur create notification:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /notifications/{id}:
   *   delete:
   *     summary: Supprimer une notification
   *     tags: [Notifications]
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
   *         description: Notification supprimée
   *       404:
   *         description: Notification non trouvée
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.notification.delete({
        where: { id }
      });

      res.json({ message: 'Notification supprimée avec succès' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Notification non trouvée' });
      }
      console.error('Erreur delete notification:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

module.exports = new NotificationController();
