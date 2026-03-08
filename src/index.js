const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const z = require('zod');
require('dotenv').config();

const config = require('./config/env');
const prisma = require('./config/database');
const authController = require('./controllers/auth.controller');
const categorieController = require('./controllers/categorie.controller');
const produitController = require('./controllers/produit.controller');
const clientController = require('./controllers/client.controller');
const venteController = require('./controllers/vente.controller');
const paiementCreditController = require('./controllers/paiementCredit.controller');
const mouvementStockController = require('./controllers/mouvementStock.controller');
const notificationController = require('./controllers/notification.controller');
const configurationController = require('./controllers/configuration.controller');
const { authenticate, isAdmin } = require('./middlewares/auth.middleware');
const validate = require('./middlewares/validate.middleware');
const { upload, uploadErrorHandler } = require('./middlewares/upload.middleware');
const { bootstrapDefaultAdmin, bootstrapDefaultConfiguration } = require('./bootstrap');
const ApiResponse = require('./utils/apiResponse');
const {
  createUserSchema,
  adminCreateUserSchema,
  updateUserSchema,
  changePasswordSchema,
  loginSchema,
  createCategorieSchema,
  updateCategorieSchema,
  createProduitSchema,
  updateProduitSchema,
  createClientSchema,
  updateClientSchema,
  createVenteSchema,
  updateVenteSchema,
  createPaiementCreditSchema,
  createMouvementStockSchema,
  createNotificationSchema,
  createConfigurationSchema
} = require('./validators/schemas');

const app = express();

// Configuration Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gestion de Stock & Ventes',
      version: '1.0.0',
      description: 'API RESTful pour la gestion de stock et de ventes d\'une boutique',
      contact: {
        name: 'Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Serveur API'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    './src/controllers/*.js',
    './src/routes/*.js'
  ]
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));
app.use('/api/v1/uploads', express.static(uploadsPath));

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.get('/', (req, res) => {
  res.json({
    message: 'API Gestion de Stock & Ventes',
    version: '1.0.0',
    docs: '/api-docs'
  });
});

// Routes
const router = express.Router();

// Routes publiques
router.post('/auth/login', validate(loginSchema), authController.login.bind(authController));

// Routes protÃ©gÃ©es - Authentification
router.get('/auth/me', authenticate, authController.getProfile.bind(authController));
router.put('/auth/:id', authenticate, validate(updateUserSchema), authController.updateUser.bind(authController));

// Routes protÃ©gÃ©es - Administration (Admin seulement)
router.post('/auth/admin/create-user', authenticate, isAdmin, validate(adminCreateUserSchema), authController.createUserByAdmin.bind(authController));
router.get('/auth/admin/users', authenticate, isAdmin, authController.getAllUsers.bind(authController));
router.delete('/auth/admin/users/:id', authenticate, isAdmin, authController.softDeleteUser.bind(authController));

// Routes protÃ©gÃ©es - Changement de mot de passe
router.put('/auth/change-password', authenticate, validate(changePasswordSchema), authController.changePassword.bind(authController));

// Routes protÃ©gÃ©es - CatÃ©gories
router.get('/categories', authenticate, categorieController.getAll.bind(categorieController));
router.get('/categories/:id', authenticate, categorieController.getById.bind(categorieController));
router.post('/categories', authenticate, validate(createCategorieSchema), categorieController.create.bind(categorieController));
router.put('/categories/:id', authenticate, validate(updateCategorieSchema), categorieController.update.bind(categorieController));
router.delete('/categories/:id', authenticate, categorieController.delete.bind(categorieController));

// Routes protÃ©gÃ©es - Produits
router.get('/produits', authenticate, produitController.getAll.bind(produitController));
router.get('/produits/:id', authenticate, produitController.getById.bind(produitController));
router.post('/produits', authenticate, upload.single('image'), validate(createProduitSchema), uploadErrorHandler, produitController.create.bind(produitController));
router.put('/produits/:id', authenticate, validate(updateProduitSchema), produitController.update.bind(produitController));
router.delete('/produits/:id', authenticate, produitController.delete.bind(produitController));
router.get('/produits/stock/alertes', authenticate, produitController.getLowStock.bind(produitController));

// Routes protÃ©gÃ©es - Clients
router.get('/clients', authenticate, clientController.getAll.bind(clientController));
router.get('/clients/:id', authenticate, clientController.getById.bind(clientController));
router.post('/clients', authenticate, validate(createClientSchema), clientController.create.bind(clientController));
router.put('/clients/:id', authenticate, validate(updateClientSchema), clientController.update.bind(clientController));
router.delete('/clients/:id', authenticate, clientController.delete.bind(clientController));
router.get('/clients/credits', authenticate, clientController.getClientsWithCredit.bind(clientController));

// Routes protÃ©gÃ©es - Ventes
router.get('/ventes', authenticate, venteController.getAll.bind(venteController));
router.get('/ventes/stats', authenticate, venteController.getStats.bind(venteController));
router.get('/ventes/:id', authenticate, venteController.getById.bind(venteController));
router.post('/ventes', authenticate, validate(createVenteSchema), venteController.create.bind(venteController));
router.put('/ventes/:id', authenticate, validate(updateVenteSchema), venteController.update.bind(venteController));
router.delete('/ventes/:id', authenticate, venteController.delete.bind(venteController));

// Routes protÃ©gÃ©es - Paiements CrÃ©dit
router.get('/paiements-credit', authenticate, paiementCreditController.getAll.bind(paiementCreditController));
router.post('/paiements-credit', authenticate, validate(createPaiementCreditSchema), paiementCreditController.create.bind(paiementCreditController));
router.delete('/paiements-credit/:id', authenticate, paiementCreditController.delete.bind(paiementCreditController));

// Routes protÃ©gÃ©es - Mouvements de Stock
router.get('/mouvements-stock', authenticate, mouvementStockController.getAll.bind(mouvementStockController));
router.post('/mouvements-stock', authenticate, validate(createMouvementStockSchema), mouvementStockController.create.bind(mouvementStockController));
router.delete('/mouvements-stock/:id', authenticate, mouvementStockController.delete.bind(mouvementStockController));

// Routes protÃ©gÃ©es - Notifications
router.get('/notifications', authenticate, notificationController.getAll.bind(notificationController));
router.get('/notifications/non-lues', authenticate, notificationController.getUnread.bind(notificationController));
router.put('/notifications/:id/lire', authenticate, notificationController.markAsRead.bind(notificationController));
router.put('/notifications/tout-lire', authenticate, notificationController.markAllAsRead.bind(notificationController));
router.post('/notifications', authenticate, validate(createNotificationSchema), notificationController.create.bind(notificationController));
router.delete('/notifications/:id', authenticate, notificationController.delete.bind(notificationController));

// Routes protÃ©gÃ©es - Configuration
router.get('/configuration', authenticate, configurationController.get.bind(configurationController));
router.post('/configuration', authenticate, validate(createConfigurationSchema), configurationController.save.bind(configurationController));

// Utilisation du routeur
app.use('/api/v1', router);

// Gestion des erreurs 404
app.use((req, res, next) => {
  return ApiResponse.error(res, `Ressource non trouvÃ©e: ${req.originalUrl}`, 404);
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  
  // Erreur Prisma
  if (err.code?.startsWith('P2')) {
    const prismaErrors = {
      'P2002': 'Cette ressource existe dÃ©jÃ ',
      'P2003': 'Impossible de supprimer : donnÃ©es liÃ©es existantes',
      'P2025': 'Ressource non trouvÃ©e',
      'P2006': 'Valeur invalide pour le type de donnÃ©es'
    };
    
    const message = prismaErrors[err.code] || 'Erreur base de donnÃ©es';
    return ApiResponse.error(res, message, 400);
  }
  
  // Erreur Zod
  if (err instanceof z.ZodError) {
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code
    }));
    return ApiResponse.error(res, 'Validation Ã©chouÃ©e', 400, errors);
  }
  
  // RÃ©ponse erreur par dÃ©faut
  return ApiResponse.error(
    res, 
    err.message || 'Erreur serveur interne', 
    err.status || 500
  );
});

// DÃ©marrage du serveur
async function startServer() {
  try {
    // Test de la connexion Ã  la base de donnÃ©es
    await prisma.$connect();
    console.log('âœ… ConnectÃ© Ã  la base de donnÃ©es');

    // Bootstrap
    await bootstrapDefaultAdmin();
    await bootstrapDefaultConfiguration();

    // DÃ©marrer le serveur
    app.listen(config.port, () => {
      console.log(`\nðŸš€ Serveur dÃ©marrÃ© sur le port ${config.port}`);
      console.log(`ðŸ“– Documentation Swagger: http://localhost:${config.port}/api-docs`);
      console.log(`ðŸŒ API Endpoint: http://localhost:${config.port}/api/v1\n`);
    });
  } catch (error) {
    console.error('âŒ Erreur lors du dÃ©marrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion de l'arrÃªt propre
process.on('SIGINT', async () => {
  console.log('\nâ¹ï¸  ArrÃªt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nâ¹ï¸  ArrÃªt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

