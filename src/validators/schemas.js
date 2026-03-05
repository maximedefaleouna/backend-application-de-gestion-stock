
const z = require('zod');

// Schéma pour créer un utilisateur (par admin seulement - sans mot de passe)
const createUserSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(8, 'Numéro de téléphone invalide'),
  role: z.enum(['admin', 'vendeur']).optional(),
  actif: z.boolean().optional()
});

// Schéma pour la création par admin avec mot de passe automatique
const adminCreateUserSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(8, 'Numéro de téléphone invalide'),
  role: z.enum(['admin', 'vendeur']).default('vendeur'),
  actif: z.boolean().default(true)
});

const updateUserSchema = z.object({
  nom: z.string().min(2).optional(),
  prenom: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telephone: z.string().min(8).optional(),
  role: z.enum(['admin', 'vendeur']).optional(),
  actif: z.boolean().optional()
});

// Schéma pour changer son propre mot de passe
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'L\'ancien mot de passe est requis'),
  newPassword: z.string().min(6, 'Le nouveau mot de passe doit contenir au moins 6 caractères')
});

// Schéma pour le login
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  motDePasse: z.string().min(1, 'Mot de passe requis')
});

// Schéma pour les catégories
const createCategorieSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().optional()
});

const updateCategorieSchema = z.object({
  nom: z.string().min(2).optional(),
  description: z.string().optional()
});

// Schéma pour les produits (CORRESPOND AU SCHEMA PRISMA)
const createProduitSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  reference: z.string().min(2, 'La référence est requise'),
  description: z.string().optional(),
  categorieId: z.string().uuid('ID de catégorie invalide'),
  marque: z.string().min(1, 'La marque est requise'),
  prixVente: z.number().positive('Le prix doit être positif'),
  stock: z.number().int().nonnegative().optional(),
  stockMin: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url().optional().nullable(),
  disponible: z.boolean().optional()
});

const updateProduitSchema = z.object({
  nom: z.string().min(2).optional(),
  reference: z.string().min(2).optional(),
  description: z.string().optional(),
  categorieId: z.string().uuid().optional(),
  marque: z.string().min(1).optional(),
  prixVente: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  stockMin: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url().optional().nullable(),
  disponible: z.boolean().optional()
});

// Schéma pour les clients
const createClientSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  telephone: z.string().min(8, 'Numéro de téléphone invalide'),
  email: z.string().email().optional().nullable(),
  adresse: z.string().optional().nullable(),
  totalCredit: z.number().int().nonnegative().optional(),
  totalPaye: z.number().int().nonnegative().optional()
});

const updateClientSchema = z.object({
  nom: z.string().min(2).optional(),
  telephone: z.string().min(8).optional(),
  email: z.string().email().optional().nullable(),
  adresse: z.string().optional().nullable(),
  totalCredit: z.number().int().nonnegative().optional(),
  totalPaye: z.number().int().nonnegative().optional()
});

// Schéma pour les ventes (CORRESPOND AU SCHEMA PRISMA - Int pas Decimal)
const createVenteSchema = z.object({
  montantTotal: z.number().int().nonnegative(),
  montantPaye: z.number().int().nonnegative().optional(),
  modePaiement: z.enum(['espece', 'mobile_money', 'carte', 'credit']),
  statut: z.enum(['completee', 'credit', 'partielle', 'annulee']),
  clientId: z.string().uuid().optional().nullable(),
  estCredit: z.boolean().optional(),
  articles: z.array(z.object({
    produitId: z.string().uuid(),
    quantite: z.number().int().positive(),
    prixUnitaire: z.number().int().nonnegative()
  }))
});

const updateVenteSchema = z.object({
  montantTotal: z.number().int().nonnegative().optional(),
  montantPaye: z.number().int().nonnegative().optional(),
  modePaiement: z.enum(['espece', 'mobile_money', 'carte', 'credit']).optional(),
  statut: z.enum(['completee', 'credit', 'partielle', 'annulee']).optional(),
  clientId: z.string().uuid().optional().nullable(),
  estCredit: z.boolean().optional()
});

// Schéma pour les paiements de crédit
const createPaiementCreditSchema = z.object({
  clientId: z.string().uuid(),
  venteId: z.string().uuid(),
  montant: z.number().positive('Le montant doit être positif'),
  modePaiement: z.enum(['espece', 'mobile_money', 'carte', 'credit'])
});

// Schéma pour les mouvements de stock
const createMouvementStockSchema = z.object({
  produitId: z.string().uuid(),
  type: z.enum(['entree', 'sortie', 'ajustement']),
  quantite: z.number().int(),
  motif: z.string().min(2, 'Le motif est requis')
});

// Schéma pour les notifications
const createNotificationSchema = z.object({
  type: z.enum(['vente', 'stock', 'credit', 'systeme']),
  titre: z.string().min(2, 'Le titre est requis'),
  message: z.string().min(2, 'Le message est requis'),
  utilisateurId: z.string().uuid().optional().nullable()
});

// Schéma pour la configuration
const createConfigurationSchema = z.object({
  nom: z.string().min(2),
  nomChef: z.string().min(2),
  prenomChef: z.string().min(2),
  adresse: z.string().min(5),
  telephone: z.string().min(8),
  email: z.string().email()
});

module.exports = {
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
};
