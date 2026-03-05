const prisma = require('../config/database');
const { createPaiementCreditSchema } = require('../validators/schemas');

class PaiementCreditController {
  /**
   * @swagger
   * /paiements-credit:
   *   get:
   *     summary: Récupérer tous les paiements de crédit
   *     tags: [Paiements Crédit]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des paiements
   */
  async getAll(req, res) {
    try {
      const paiements = await prisma.paiementCredit.findMany({
        include: {
          client: {
            select: { id: true, nom: true, telephone: true }
          },
          vente: {
            select: { 
              id: true, 
              montantTotal: true,
              montantRestant: true 
            }
          }
        },
        orderBy: { date: 'desc' }
      });

      res.json({ data: paiements });
    } catch (error) {
      console.error('Erreur getAll paiements:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /paiements-credit:
   *   post:
   *     summary: Créer un paiement de crédit
   *     tags: [Paiements Crédit]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               clientId:
   *                 type: string
   *               venteId:
   *                 type: string
   *               montant:
   *                 type: number
   *               modePaiement:
   *                 type: string
   *                 enum: [espece, mobile_money, carte, credit]
   *     responses:
   *       201:
   *         description: Paiement créé
   *       400:
   *         description: Données invalides
   */
  async create(req, res) {
    try {
      const validatedData = createPaiementCreditSchema.parse(req.body);

      // Vérifier si la vente existe et est un crédit
      const vente = await prisma.vente.findUnique({
        where: { id: validatedData.venteId }
      });

      if (!vente) {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }

      if (!vente.estCredit) {
        return res.status(400).json({ error: 'Cette vente n\'est pas un crédit' });
      }

      // Créer le paiement
      const paiement = await prisma.paiementCredit.create({
        data: validatedData
      });

      // Mettre à jour le montant payé de la vente
      await prisma.vente.update({
        where: { id: validatedData.venteId },
        data: {
          montantPaye: {
            increment: validatedData.montant
          },
          montantRestant: {
            decrement: validatedData.montant
          }
        }
      });

      // Mettre à jour le total payé du client
      await prisma.client.update({
        where: { id: validatedData.clientId },
        data: {
          totalPaye: {
            increment: validatedData.montant
          },
          totalCredit: {
            decrement: validatedData.montant
          }
        }
      });

      res.status(201).json({
        message: 'Paiement enregistré avec succès',
        data: paiement
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation échouée', 
          details: error.errors 
        });
      }
      console.error('Erreur create paiement:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /paiements-credit/{id}:
   *   delete:
   *     summary: Supprimer un paiement de crédit
   *     tags: [Paiements Crédit]
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
   *         description: Paiement supprimé
   *       404:
   *         description: Paiement non trouvé
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const paiement = await prisma.paiementCredit.findUnique({
        where: { id }
      });

      if (!paiement) {
        return res.status(404).json({ error: 'Paiement non trouvé' });
      }

      // Annuler les mises à jour
      await prisma.vente.update({
        where: { id: paiement.venteId },
        data: {
          montantPaye: {
            decrement: paiement.montant
          },
          montantRestant: {
            increment: paiement.montant
          }
        }
      });

      await prisma.client.update({
        where: { id: paiement.clientId },
        data: {
          totalPaye: {
            decrement: paiement.montant
          },
          totalCredit: {
            increment: paiement.montant
          }
        }
      });

      await prisma.paiementCredit.delete({
        where: { id }
      });

      res.json({ message: 'Paiement supprimé avec succès' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Paiement non trouvé' });
      }
      console.error('Erreur delete paiement:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

module.exports = new PaiementCreditController();
