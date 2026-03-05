/**
 * GUIDE RAPIDE - VRAIS NOMS DE CHAMPS PRISMA
 * À utiliser dans TOUS les contrôleurs
 */

// MODEL: Utilisateur
const utilisateurFields = {
  // Champs directs (à utiliser dans les queries Prisma)
  id: 'String',
  nom: 'String',
  prenom: 'String',
  email: 'String',
  motDePasse: 'String',
  telephone: 'String',
  role: 'RoleUtilisateur (admin | vendeur)',
  actif: 'Boolean',
  createdAt: 'DateTime',        // ✅ Utiliser createdAt (PAS creeLe)
  derniereConnexion: 'DateTime?',
  deleted: 'Boolean'
};

// MODEL: Categorie
const categorieFields = {
  id: 'String',
  nom: 'String',
  description: 'String?',
  createdAt: 'DateTime',        // ✅ Utiliser createdAt (PAS creeLe)
  updatedAt: 'DateTime'         // ✅ Utiliser updatedAt (PAS modifieLe)
};

// MODEL: Produit
const produitFields = {
  id: 'String',
  nom: 'String',
  reference: 'String',
  description: 'String?',
  categorieId: 'String',        // ✅ Utiliser categorieId (PAS categorie_id)
  marque: 'String',             // ✅ OBLIGATOIRE (PAS optionnel)
  prixVente: 'Decimal',
  stock: 'Int',
  stockMin: 'Int',
  imageUrl: 'String?',
  disponible: 'Boolean',
  createdAt: 'DateTime',        // ✅ Utiliser createdAt (PAS creeLe)
  updatedAt: 'DateTime'         // ✅ Utiliser updatedAt (PAS modifieLe)
};

// MODEL: Client
const clientFields = {
  id: 'String',
  nom: 'String',
  telephone: 'String',
  email: 'String?',
  adresse: 'String?',
  totalCredit: 'Int',           // ✅ Int (PAS Decimal)
  totalPaye: 'Int',             // ✅ Int (PAS Decimal)
  createdAt: 'DateTime',
  updatedAt: 'DateTime'
};

// MODEL: Vente
const venteFields = {
  id: 'String',
  montantTotal: 'Int',          // ✅ Int (PAS Decimal)
  montantPaye: 'Int',
  montantRestant: 'Int',
  modePaiement: 'ModePaiement (espece | mobile_money | carte | credit)',
  statut: 'StatutVente (completee | credit | partielle | annulee)',
  clientId: 'String?',
  estCredit: 'Boolean',
  vendeurId: 'String',
  createdAt: 'DateTime',
  updatedAt: 'DateTime'
};

// MODEL: ArticleVente
const articleVenteFields = {
  id: 'String',
  venteId: 'String',
  produitId: 'String',
  quantite: 'Int',
  prixUnitaire: 'Int',          // ✅ Int (PAS Decimal)
  prixTotal: 'Int'              // ✅ Int (PAS Decimal)
};

// MODEL: PaiementCredit
const paiementCreditFields = {
  id: 'String',
  clientId: 'String',
  venteId: 'String',
  montant: 'Decimal',           // ✅ Decimal
  modePaiement: 'ModePaiement',
  date: 'DateTime',
  createdAt: 'DateTime'
};

// MODEL: MouvementStock
const mouvementStockFields = {
  id: 'String',
  produitId: 'String',
  type: 'TypeMouvementStock (entree | sortie | ajustement)',
  quantite: 'Int',
  motif: 'String',
  utilisateurId: 'String',
  date: 'DateTime',
  createdAt: 'DateTime'
};

// MODEL: Notification
const notificationFields = {
  id: 'String',
  type: 'TypeNotification (vente | stock | credit | systeme)',
  titre: 'String',
  message: 'String',
  lu: 'Boolean',
  utilisateurId: 'String?',
  createdAt: 'DateTime'
};

// MODEL: Configuration
const configurationFields = {
  id: 'String',
  nom: 'String',
  nomChef: 'String',
  prenomChef: 'String',
  adresse: 'String',
  telephone: 'String',
  email: 'String'
};

/**
 * ERREURS À ÉVITER :
 * ❌ NE PAS UTILISER : creeLe, modifieLe, categorie_id, etc.
 * ✅ UTILISER : createdAt, updatedAt, categorieId, etc.
 * 
 * Dans Prisma, on utilise TOUJOURS le nom du champ JavaScript
 * Le mapping SQL est géré automatiquement par @map()
 */

module.exports = {
  utilisateurFields,
  categorieFields,
  produitFields,
  clientFields,
  venteFields,
  articleVenteFields,
  paiementCreditFields,
  mouvementStockFields,
  notificationFields,
  configurationFields
};
