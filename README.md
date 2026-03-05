# Backend - API Gestion de Stock & Ventes

## 📦 Installation

```bash
npm install
```

## 🔧 Configuration

1. Copiez le fichier `.env.example` vers `.env`:
```bash
copy .env.example .env
```

2. Modifiez les variables d'environnement dans `.env`:
- `DATABASE_URL`: URL de connexion à PostgreSQL
- `JWT_SECRET`: Clé secrète pour JWT (changez-la !)
- `DEFAULT_ADMIN_PASSWORD`: Mot de passe admin par défaut

## 🗄️ Base de données

Générer le client Prisma :
```bash
npm run prisma:generate
```

Créer et appliquer les migrations :
```bash
npm run prisma:migrate
```

Voir la base de données avec Prisma Studio :
```bash
npm run prisma:studio
```

## 🚀 Démarrage

Mode développement (avec rechargement automatique) :
```bash
npm run dev
```

Mode production :
```bash
npm start
```

## 📖 Documentation API

Une fois le serveur démarré, accédez à la documentation Swagger :
- **URL**: http://localhost:3000/api-docs

## 👤 Admin par défaut

Au premier démarrage, un administrateur est créé automatiquement :
- **Email**: admin@example.com
- **Mot de passe**: admin123

⚠️ **Changez ce mot de passe après la première connexion !**

## 🔑 Endpoints API

### Authentification
- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion
- `GET /api/v1/auth/me` - Profil utilisateur (protégé)

### Catégories
- `GET /api/v1/categories` - Liste des catégories
- `POST /api/v1/categories` - Créer une catégorie
- `GET /api/v1/categories/:id` - Détails d'une catégorie
- `PUT /api/v1/categories/:id` - Mettre à jour
- `DELETE /api/v1/categories/:id` - Supprimer

### Produits
- `GET /api/v1/produits` - Liste des produits
- `POST /api/v1/produits` - Créer un produit
- `GET /api/v1/produits/:id` - Détails d'un produit
- `PUT /api/v1/produits/:id` - Mettre à jour
- `DELETE /api/v1/produits/:id` - Supprimer
- `GET /api/v1/produits/stock/alertes` - Alertes stock faible

### Clients
- `GET /api/v1/clients` - Liste des clients
- `POST /api/v1/clients` - Créer un client
- `GET /api/v1/clients/:id` - Détails d'un client
- `PUT /api/v1/clients/:id` - Mettre à jour
- `DELETE /api/v1/clients/:id` - Supprimer
- `GET /api/v1/clients/credits` - Clients avec crédit

### Ventes
- `GET /api/v1/ventes` - Liste des ventes
- `POST /api/v1/ventes` - Créer une vente
- `GET /api/v1/ventes/:id` - Détails d'une vente
- `PUT /api/v1/ventes/:id` - Mettre à jour
- `DELETE /api/v1/ventes/:id` - Supprimer
- `GET /api/v1/ventes/stats` - Statistiques

### Paiements Crédit
- `GET /api/v1/paiements-credit` - Liste des paiements
- `POST /api/v1/paiements-credit` - Créer un paiement
- `DELETE /api/v1/paiements-credit/:id` - Supprimer

### Mouvements de Stock
- `GET /api/v1/mouvements-stock` - Liste des mouvements
- `POST /api/v1/mouvements-stock` - Créer un mouvement
- `DELETE /api/v1/mouvements-stock/:id` - Supprimer

### Notifications
- `GET /api/v1/notifications` - Liste des notifications
- `GET /api/v1/notifications/non-lues` - Notifications non lues
- `PUT /api/v1/notifications/:id/lire` - Marquer comme lue
- `PUT /api/v1/notifications/tout-lire` - Tout marquer comme lu
- `POST /api/v1/notifications` - Créer une notification
- `DELETE /api/v1/notifications/:id` - Supprimer

### Configuration
- `GET /api/v1/configuration` - Récupérer la configuration
- `POST /api/v1/configuration` - Enregistrer la configuration

## 🔐 Authentification

Toutes les routes (sauf `/auth/register` et `/auth/login`) nécessitent un token JWT.

**Header requis**:
```
Authorization: Bearer <votre-token-jwt>
```

## 📁 Structure du projet

```
backend/
├── src/
│   ├── config/          # Configuration (DB, env)
│   ├── controllers/     # Contrôleurs (logique métier)
│   ├── middlewares/     # Middlewares (auth, validation)
│   ├── utils/           # Utilitaires (password, jwt)
│   ├── validators/      # Schémas de validation Zod
│   ├── bootstrap/       # Initialisation (admin par défaut)
│   └── index.js         # Point d'entrée
├── prisma/
│   └── schema.prisma    # Schéma de base de données
└── package.json
```

## 🛠️ Technologies

- **Express.js** - Framework web
- **Prisma** - ORM
- **PostgreSQL** - Base de données
- **Zod** - Validation de schémas
- **JWT** - Authentification
- **Bcrypt** - Hachage de mots de passe
- **Swagger** - Documentation API
- **CORS** - Partage de ressources
