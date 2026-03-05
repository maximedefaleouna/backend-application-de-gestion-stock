# 📖 Guide d'Utilisation de l'API - Gestion de Stock & Ventes

## ⚡ Démarrage Rapide

### 1. Installation et Configuration

```bash
cd backend
npm install
cp .env.example .env
# Modifier .env avec vos paramètres
npm run prisma:migrate
npm run dev
```

### 2. Admin par défaut

Au premier démarrage, un compte admin est créé automatiquement :
- **Email** : `admin@example.com`
- **Mot de passe** : `admin123`

⚠️ **Changez ce mot de passe immédiatement !**

### 3. Documentation Interactive

Accédez à Swagger UI : http://localhost:3000/api-docs

---

## 🔐 Authentification

### S'inscrire (Admin uniquement)

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@example.com",
  "telephone": "0612345678",
  "motDePasse": "MonMot2Passe",
  "role": "vendeur"
}
```

**Réponse 201 :**
```json
{
  "success": true,
  "message": "Utilisateur créé avec succès",
  "data": {
    "id": "uuid",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com",
    "role": "vendeur",
    "actif": true
  },
  "timestamp": "2024-02-26T10:30:00.000Z"
}
```

### Se connecter

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "motDePasse": "admin123"
}
```

**Réponse 200 :**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "utilisateur": {
      "id": "uuid",
      "nom": "Administrateur",
      "prenom": "Principal",
      "email": "admin@example.com",
      "role": "admin"
    }
  },
  "timestamp": "2024-02-26T10:30:00.000Z"
}
```

### Utiliser le Token

Pour toutes les requêtes protégées, ajoutez le header :

```
Authorization: Bearer <votre-token-jwt>
```

---

## 📦 Gestion des Produits

### Créer un Produit

```bash
POST /api/v1/produits
Authorization: Bearer <token>
Content-Type: application/json

{
  "nom": "Huile Moteur 5W40",
  "reference": "HUILE-5W40-001",
  "description": "Huile synthétique pour moteur",
  "categorieId": "uuid-categorie",
  "marque": "Total",
  "prixVente": 45000,
  "stock": 100,
  "stockMin": 10,
  "imageUrl": "https://example.com/image.jpg",
  "disponible": true
}
```

**Champs requis :**
- `nom` (min 2 caractères)
- `reference` (unique)
- `categorieId` (UUID valide)
- `marque` (obligatoire dans Prisma)
- `prixVente` (nombre positif)

**Champs optionnels :**
- `description`
- `stock` (défaut: 0)
- `stockMin` (défaut: 5)
- `imageUrl` (URL valide ou null)
- `disponible` (défaut: true)

### Lister les Produits

```bash
GET /api/v1/produits?categorieId=xxx&disponible=true&search=huile
Authorization: Bearer <token>
```

**Filtres disponibles :**
- `categorieId` - Filtrer par catégorie
- `disponible` - Filtrer par disponibilité (true/false)
- `search` - Recherche dans nom, référence, description

### Récupérer un Produit

```bash
GET /api/v1/produits/{id}
Authorization: Bearer <token>
```

### Mettre à jour un Produit

```bash
PUT /api/v1/produits/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "nom": "Nouveau Nom",
  "prixVente": 50000,
  "stock": 150
}
```

### Supprimer un Produit

```bash
DELETE /api/v1/produits/{id}
Authorization: Bearer <token>
```

### Alertes Stock Faible

```bash
GET /api/v1/produits/stock/alertes
Authorization: Bearer <token>
```

Retourne les produits où `stock <= stockMin`

---

## 🛒 Gestion des Ventes

### Créer une Vente

```bash
POST /api/v1/ventes
Authorization: Bearer <token>
Content-Type: application/json

{
  "montantTotal": 150000,
  "montantPaye": 100000,
  "modePaiement": "espece",
  "statut": "completee",
  "clientId": "uuid-client-optionnel",
  "estCredit": false,
  "articles": [
    {
      "produitId": "uuid-produit-1",
      "quantite": 2,
      "prixUnitaire": 50000
    },
    {
      "produitId": "uuid-produit-2",
      "quantite": 1,
      "prixUnitaire": 50000
    }
  ]
}
```

**Important :**
- Le stock des produits est automatiquement décrémenté
- Un mouvement de stock "sortie" est créé automatiquement
- Si `estCredit: true`, le total crédit du client est mis à jour
- `montantRestant` est calculé automatiquement (`montantTotal - montantPaye`)

**Modes de paiement :**
- `espece`
- `mobile_money`
- `carte`
- `credit`

**Statuts de vente :**
- `completee` - Vente payée entièrement
- `credit` - Vente à crédit
- `partielle` - Paiement partiel
- `annulee` - Vente annulée

### Lister les Ventes

```bash
GET /api/v1/ventes?statut=completee&clientId=xxx&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

**Filtres :**
- `statut` - Filtrer par statut
- `clientId` - Filtrer par client
- `startDate` - Date de début (ISO format)
- `endDate` - Date de fin (ISO format)

### Statistiques des Ventes

```bash
GET /api/v1/ventes/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

**Retourne :**
- Nombre total de ventes
- Montant total des ventes
- Répartition par statut

---

## 👥 Gestion des Clients

### Créer un Client

```bash
POST /api/v1/clients
Authorization: Bearer <token>
Content-Type: application/json

{
  "nom": "Société ABC",
  "telephone": "0612345678",
  "email": "contact@abc.com",
  "adresse": "123 Rue du Commerce"
}
```

### Clients avec Crédit

```bash
GET /api/v1/clients/credits
Authorization: Bearer <token>
```

Retourne les clients où `totalCredit > 0`, triés par crédit décroissant

---

## 💰 Paiements de Crédit

### Enregistrer un Paiement

```bash
POST /api/v1/paiements-credit
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": "uuid-client",
  "venteId": "uuid-vente",
  "montant": 50000,
  "modePaiement": "espece"
}
```

**Effets automatiques :**
- Met à jour `montantPaye` de la vente
- Décrémente `montantRestant` de la vente
- Incrémente `totalPaye` du client
- Décrémente `totalCredit` du client

---

## 📊 Mouvements de Stock

### Créer un Mouvement

```bash
POST /api/v1/mouvements-stock
Authorization: Bearer <token>
Content-Type: application/json

{
  "produitId": "uuid-produit",
  "type": "entree",
  "quantite": 50,
  "motif": "Réapprovisionnement fournisseur"
}
```

**Types de mouvements :**
- `entree` - Ajout au stock (incrémente automatiquement)
- `sortie` - Retrait du stock (décrémente automatiquement)
- `ajustement` - Ajustement manuel (n'affecte pas le stock)

### Lister les Mouvements

```bash
GET /api/v1/mouvements-stock?produitId=xxx&type=entree
Authorization: Bearer <token>
```

---

## 📢 Notifications

### Récupérer les Notifications Non Lues

```bash
GET /api/v1/notifications/non-lues
Authorization: Bearer <token>
```

### Marquer comme Lue

```bash
PUT /api/v1/notifications/{id}/lire
Authorization: Bearer <token>
```

### Tout Marquer comme Lu

```bash
PUT /api/v1/notifications/tout-lire
Authorization: Bearer <token>
```

---

## ⚙️ Configuration

### Obtenir la Configuration

```bash
GET /api/v1/configuration
Authorization: Bearer <token>
```

### Enregistrer la Configuration

```bash
POST /api/v1/configuration
Authorization: Bearer <token>
Content-Type: application/json

{
  "nom": "Ma Boutique",
  "nomChef": "Dupont",
  "prenomChef": "Jean",
  "adresse": "123 Avenue Principale",
  "telephone": "0612345678",
  "email": "contact@boutique.com"
}
```

---

## ❌ Codes d'Erreur

### 400 - Requête Invalide
```json
{
  "success": false,
  "message": "Validation échouée",
  "error": "Données invalides",
  "details": [
    {
      "field": "email",
      "message": "Email invalide",
      "code": "invalid_string"
    }
  ],
  "timestamp": "2024-02-26T10:30:00.000Z"
}
```

### 401 - Non Authentifié
```json
{
  "success": false,
  "message": "Token d'authentification requis",
  "error": "Non authentifié",
  "timestamp": "2024-02-26T10:30:00.000Z"
}
```

### 403 - Accès Refusé
```json
{
  "success": false,
  "message": "Vous devez être administrateur",
  "error": "Accès refusé",
  "timestamp": "2024-02-26T10:30:00.000Z"
}
```

### 404 - Ressource Non Trouvée
```json
{
  "success": false,
  "message": "Produit non trouvé",
  "error": "Ressource non trouvée",
  "timestamp": "2024-02-26T10:30:00.000Z"
}
```

### 409 - Conflit
```json
{
  "success": false,
  "message": "Cette référence existe déjà",
  "error": "Conflit de données",
  "timestamp": "2024-02-26T10:30:00.000Z"
}
```

### 500 - Erreur Serveur
```json
{
  "success": false,
  "message": "Erreur serveur interne",
  "error": "Erreur serveur",
  "timestamp": "2024-02-26T10:30:00.000Z"
}
```

---

## 🎯 Bonnes Pratiques

1. **Toujours vérifier le stock** avant de créer une vente
2. **Utiliser les transactions** pour les opérations critiques
3. **Gérer les erreurs 404** côté frontend
4. **Stocker le token JWT** de manière sécurisée
5. **Renouveler le token** avant expiration (24h par défaut)
6. **Utiliser HTTPS** en production

---

## 📝 Exemple Complet (Node.js)

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

// 1. Se connecter
async function login() {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'admin@example.com',
    motDePasse: 'admin123'
  });
  
  return response.data.data.token;
}

// 2. Créer un produit
async function createProduit(token) {
  const response = await axios.post(
    `${API_URL}/produits`,
    {
      nom: 'Produit Test',
      reference: 'REF-001',
      categorieId: 'uuid-categorie',
      marque: 'Marque X',
      prixVente: 10000,
      stock: 50
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data.data;
}

// Utilisation
(async () => {
  try {
    const token = await login();
    console.log('✅ Connecté');
    
    const produit = await createProduit(token);
    console.log('✅ Produit créé:', produit);
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data);
  }
})();
```
