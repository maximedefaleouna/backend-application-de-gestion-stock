
const z = require('zod');

const booleanFromMixed = z.preprocess((value) => {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return value;
}, z.boolean());

const stringArrayFromMixed = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}, z.array(z.string()));
// Schéma pour créer un utilisateur (par admin seulement - sans mot de passe)
const createUserSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(8, 'Numéro de téléphone invalide'),
  indicatif: z.string().optional().default('+228'),
  role: z.enum(['admin', 'vendeur']).optional(),
  actif: z.boolean().optional()
});

// Schéma pour la création par admin avec mot de passe automatique
const adminCreateUserSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(8, 'Numéro de téléphone invalide'),
  indicatif: z.string().optional().default('+228'),
  role: z.enum(['admin', 'vendeur']).default('vendeur'),
  actif: z.boolean().default(true)
});

const updateUserSchema = z.object({
  nom: z.string().min(2).optional(),
  prenom: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telephone: z.string().min(8).optional(),
  indicatif: z.string().optional(),
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

// Schéma pour les produits (CORRESPOND EXACTEMENT AU FRONTEND)
const createProduitSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  reference: z.string().min(2, 'La référence est requise'),
  description: z.string().optional().default(''),
  category: z.string().min(1, 'La catégorie est requise'),
  brand: z.string().min(1, 'La marque est requise'),
  compatibleVehicles: stringArrayFromMixed.optional().default([]),
  buyPrice: z.coerce.number().nonnegative('Le prix d\'achat doit être positif').optional().default(0),
  sellPrice: z.coerce.number().nonnegative('Le prix de vente doit être positif'),
  stock: z.coerce.number().int().nonnegative().optional().default(0),
  minStock: z.coerce.number().int().nonnegative().optional().default(5),
  imageUrl: z
    .string()
    .url()
    .or(z.string().startsWith('/uploads/'))
    .or(z.string().startsWith('/api/v1/uploads/'))
    .or(z.literal(''))
    .optional()
    .nullable()
    .default(''),
  available: booleanFromMixed.optional().default(true)
});

const updateProduitSchema = z.object({
  name: z.string().min(2).optional(),
  reference: z.string().min(2).optional(),
  description: z.string().optional(),
  category: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  compatibleVehicles: stringArrayFromMixed.optional(),
  buyPrice: z.coerce.number().nonnegative().optional(),
  sellPrice: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
  imageUrl: z
    .string()
    .url()
    .or(z.string().startsWith('/uploads/'))
    .or(z.string().startsWith('/api/v1/uploads/'))
    .or(z.literal(''))
    .optional()
    .nullable(),
  available: booleanFromMixed.optional()
});

// Schéma pour les clients
const createClientSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  telephone: z.string().min(8, 'Numéro de téléphone invalide'),
  indicatif: z.string().optional().default('+228'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  adresse: z.string().optional().nullable().or(z.literal('')),
  totalCredit: z.number().int().nonnegative().optional(),
  totalPaye: z.number().int().nonnegative().optional()
});

const updateClientSchema = z.object({
  nom: z.string().min(2).optional(),
  telephone: z.string().min(8).optional(),
  indicatif: z.string().optional(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  adresse: z.string().optional().nullable().or(z.literal('')),
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
  dateEcheance: z.string().date().or(z.string().datetime()).optional().nullable(), // Date d'échéance pour les crédits
  nomAcheteur: z.string().min(2).optional().nullable(), // Nom de l'acheteur pour ventes non-crédit
  prenomAcheteur: z.string().min(2).optional().nullable(), // Prénom de l'acheteur pour ventes non-crédit
  telephoneAcheteur: z.string().min(8).optional().nullable(), // Téléphone de l'acheteur pour ventes non-crédit
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
  estCredit: z.boolean().optional(),
  nomAcheteur: z.string().min(2).optional().nullable(),
  prenomAcheteur: z.string().min(2).optional().nullable(),
  telephoneAcheteur: z.string().min(8).optional().nullable()
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


