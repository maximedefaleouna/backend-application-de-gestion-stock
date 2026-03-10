const prisma = require('../config/database');
const { createPaiementCreditSchema } = require('../validators/schemas');
const z = require('zod');

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
   * /paiements-credit/all:
   *   get:
   *     summary: Récupérer tous les clients avec leurs dettes
   *     tags: [Paiements Crédit]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des clients avec dettes
   */
  async getAllDebts(req, res) {
    try {
      const { clientId } = req.params;

      // Récupérer le client avec ses ventes à crédit
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          ventes: {
            where: { estCredit: true },
            orderBy: { createdAt: 'desc' },
            include: {
              articles: {
                include: {
                  produit: {
                    select: { nom: true, reference: true }
                  }
                }
              }
            }
          },
          paiementsCredit: {
            orderBy: { date: 'desc' },
            include: {
              vente: {
                select: { 
                  id: true,
                  montantTotal: true,
                  montantRestant: true
                }
              }
            }
          }
        }
      });

      if (!client) {
        return res.status(404).json({ error: 'Client non trouvé' });
      }

      // Calculer le total des dettes restantes
      const totalRestant = client.ventes.reduce((sum, v) => sum + v.montantRestant, 0);

      res.json({
        success: true,
        data: {
          client: {
            id: client.id,
            nom: client.nom,
            telephone: client.telephone,
            email: client.email,
            adresse: client.adresse,
            totalCredit: client.totalCredit,
            totalPaye: client.totalPaye,
            resteAPayer: totalRestant
          },
          ventes: client.ventes.map(vente => ({
            id: vente.id,
            venteNumber: vente.venteNumber,
            formattedVenteNumber: `V-${String(vente.venteNumber).padStart(7, '0')}`,
            montantTotal: vente.montantTotal,
            montantPaye: vente.montantPaye,
            montantRestant: vente.montantRestant,
            statut: vente.statut,
            createdAt: vente.createdAt,
            articles: vente.articles.map(a => ({
              produit: a.produit.nom,
              reference: a.produit.reference,
              quantite: a.quantite,
              prixUnitaire: a.prixUnitaire
            }))
          })),
          paiements: client.paiementsCredit.map(p => ({
            id: p.id,
            montant: Number(p.montant),
            modePaiement: p.modePaiement,
            date: p.date,
            vente: {
              id: p.vente.id,
              venteNumber: p.vente.venteNumber,
              formattedVenteNumber: `V-${String(p.vente.venteNumber).padStart(7, '0')}`,
              resteApresPaiement: p.vente.montantRestant
            }
          }))
        }
      });
    } catch (error) {
      console.error('Erreur getClientDebts:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /paiements-credit/all:
   *   get:
   *     summary: Récupérer tous les clients avec leurs dettes
   *     tags: [Paiements Crédit]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des clients avec dettes
   */
  async getAllDebts(req, res) {
    try {
      const clients = await prisma.client.findMany({
        where: {
          totalCredit: { gt: 0 }
        },
        include: {
          ventes: {
            where: {
              estCredit: true,
              montantRestant: { gt: 0 }
            },
            select: {
              id: true,
              montantTotal: true,
              montantRestant: true,
              createdAt: true
            }
          }
        },
        orderBy: { totalCredit: 'desc' }
      });

      const clientsWithDebts = clients.map(client => ({
        id: client.id,
        nom: client.nom,
        telephone: client.telephone,
        email: client.email,
        totalDette: client.totalCredit,
        totalPaye: client.totalPaye,
        nombreVentesEnCours: client.ventes.length,
        ventes: client.ventes
      }));

      res.json({
        success: true,
        data: clientsWithDebts
      });
    } catch (error) {
      console.error('Erreur getAllDebts:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /paiements-credit/client/:clientId:
   *   get:
   *     summary: Récupérer toutes les dettes d'un client avec l'historique des paiements
   *     tags: [Paiements Crédit]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: clientId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Dettes du client avec historique
   */
  async getClientDebts(req, res) {
    try {
      const { clientId } = req.params;

      // Récupérer le client avec ses ventes à crédit
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          ventes: {
            where: { estCredit: true },
            orderBy: { createdAt: 'desc' },
            include: {
              articles: {
                include: {
                  produit: {
                    select: { nom: true, reference: true }
                  }
                }
              }
            }
          },
          paiementsCredit: {
            orderBy: { date: 'desc' },
            include: {
              vente: {
                select: { 
                  id: true,
                  montantTotal: true,
                  montantRestant: true
                }
              }
            }
          }
        }
      });

      if (!client) {
        return res.status(404).json({ error: 'Client non trouvé' });
      }

      // Calculer le total des dettes restantes
      const totalRestant = client.ventes.reduce((sum, v) => sum + v.montantRestant, 0);

      res.json({
        success: true,
        data: {
          client: {
            id: client.id,
            nom: client.nom,
            telephone: client.telephone,
            email: client.email,
            adresse: client.adresse,
            totalCredit: client.totalCredit,
            totalPaye: client.totalPaye,
            resteAPayer: totalRestant
          },
          ventes: client.ventes.map(vente => ({
            id: vente.id,
            montantTotal: vente.montantTotal,
            montantPaye: vente.montantPaye,
            montantRestant: vente.montantRestant,
            statut: vente.statut,
            createdAt: vente.createdAt,
            articles: vente.articles.map(a => ({
              produit: a.produit.nom,
              reference: a.produit.reference,
              quantite: a.quantite,
              prixUnitaire: a.prixUnitaire
            }))
          })),
          paiements: client.paiementsCredit.map(p => ({
            id: p.id,
            montant: Number(p.montant),
            modePaiement: p.modePaiement,
            date: p.date,
            vente: {
              id: p.vente.id,
              resteApresPaiement: p.vente.montantRestant
            }
          }))
        }
      });
    } catch (error) {
      console.error('Erreur getClientDebts:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /paiements-credit:
   *   post:
   *     summary: Créer un paiement de crédit (partiel ou total)
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
   *                 description: Montant du paiement (peut être partiel ou total)
   *               modePaiement:
   *                 type: string
   *                 enum: [espece, mobile_money, carte, credit]
   *     responses:
   *       201:
   *         description: Paiement créé avec succès
   *       400:
   *         description: Données invalides ou montant insuffisant
   */
  async create(req, res) {
    try {
      const validatedData = createPaiementCreditSchema.parse(req.body);

      // Vérifier si la vente existe et est un crédit
      const vente = await prisma.vente.findUnique({
        where: { id: validatedData.venteId },
        include: {
          client: true
        }
      });

      if (!vente) {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }

      if (!vente.estCredit) {
        return res.status(400).json({ error: 'Cette vente n\'est pas un crédit' });
      }

      // Vérifier si le montant restant est suffisant
      if (validatedData.montant > vente.montantRestant) {
        return res.status(400).json({ 
          error: `Le montant ne peut pas dépasser le reste dû (${vente.montantRestant} F)`,
          montantRestant: vente.montantRestant
        });
      }

      // Vérifier si c'est un paiement total ou partiel
      const isFullPayment = validatedData.montant >= vente.montantRestant;

      // Créer le paiement
      const paiement = await prisma.paiementCredit.create({
        data: {
          ...validatedData,
          montant: validatedData.montant
        },
        include: {
          client: true,
          vente: true
        }
      });

      // Mettre à jour la vente
      const updatedVente = await prisma.vente.update({
        where: { id: validatedData.venteId },
        data: {
          montantPaye: {
            increment: validatedData.montant
          },
          montantRestant: {
            decrement: validatedData.montant
          },
          // Si paiement total, changer le statut
          statut: isFullPayment ? 'completee' : vente.statut
        },
        include: {
          client: true
        }
      });

      // Mettre à jour le client
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

      // Créer une notification pour le paiement
      try {
        await prisma.notification.create({
          data: {
            type: 'credit',
            titre: isFullPayment ? 'Dette entièrement payée' : 'Paiement de dette reçu',
            message: `${vente.client.nom} a payé ${validatedData.montant} F sur la vente #${vente.id}. ${isFullPayment ? 'Dette soldée.' : `Reste à payer: ${updatedVente.montantRestant} F`}`,
            utilisateurId: req.user.userId
          }
        });
      } catch (notifError) {
        console.error('Erreur création notification:', notifError);
      }

      res.status(201).json({
        success: true,
        message: isFullPayment ? 'Dette entièrement payée' : 'Paiement partiel enregistré',
        data: {
          paiement: {
            id: paiement.id,
            montant: Number(paiement.montant),
            modePaiement: paiement.modePaiement,
            date: paiement.date
          },
          vente: {
            id: updatedVente.id,
            montantTotal: updatedVente.montantTotal,
            montantPaye: updatedVente.montantPaye,
            montantRestant: updatedVente.montantRestant,
            statut: updatedVente.statut,
            estSoldee: isFullPayment
          }
        }
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
