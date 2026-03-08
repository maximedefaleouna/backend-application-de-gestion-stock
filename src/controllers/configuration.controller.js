const prisma = require('../config/database');
const { createConfigurationSchema } = require('../validators/schemas');
const z = require('zod');

class ConfigurationController {
  /**
   * @swagger
   * /configuration:
   *   get:
   *     summary: Récupérer la configuration
   *     tags: [Configuration]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Configuration récupérée
   */
  async get(req, res) {
    try {
      const config = await prisma.configuration.findFirst();

      if (!config) {
        return res.status(404).json({ error: 'Configuration non trouvée' });
      }

      res.json({ data: config });
    } catch (error) {
      console.error('Erreur get configuration:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * @swagger
   * /configuration:
   *   post:
   *     summary: Créer ou mettre à jour la configuration
   *     tags: [Configuration]
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
   *               nomChef:
   *                 type: string
   *               prenomChef:
   *                 type: string
   *               adresse:
   *                 type: string
   *               telephone:
   *                 type: string
   *               email:
   *                 type: string
   *     responses:
   *       200:
   *         description: Configuration créée/mise à jour
   */
  async save(req, res) {
    try {
      const validatedData = createConfigurationSchema.parse(req.body);

      // Vérifier si une configuration existe déjà
      const existingConfig = await prisma.configuration.findFirst();

      let config;
      if (existingConfig) {
        config = await prisma.configuration.update({
          where: { id: existingConfig.id },
          data: validatedData
        });
      } else {
        config = await prisma.configuration.create({
          data: validatedData
        });
      }

      res.json({
        message: 'Configuration enregistrée avec succès',
        data: config
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation échouée', 
          details: error.errors 
        });
      }
      console.error('Erreur save configuration:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

module.exports = new ConfigurationController();
