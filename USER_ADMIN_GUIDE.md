# Guide d'Administration des Utilisateurs

## 📋 Vue d'ensemble

Dans cette application, **les utilisateurs ne peuvent pas s'inscrire eux-mêmes**. Ils doivent être créés par un administrateur avec un mot de passe temporaire automatique.

### Fonctionnalités Admin

- ✅ **Créer** un utilisateur (mot de passe auto: `123456`)
- ✅ **Lister** tous les utilisateurs
- ✅ **Modifier** un utilisateur
- ✅ **Supprimer** un utilisateur (Soft Delete - désactivation)
- ✅ Chaque utilisateur peut **changer son propre mot de passe**

---

## 🔐 Création d'un Utilisateur

### Qui peut créer des utilisateurs ?
- ✅ **Administrateurs uniquement**
- ❌ Les vendeurs ne peuvent pas créer d'utilisateurs
- ❌ Pas d'inscription publique

### Processus de création

1. **L'admin se connecte** à l'API
2. **Appelle le endpoint** `POST /api/v1/auth/admin/create-user`
3. **Fournit les informations** requises (sans mot de passe)
4. **Le système génère automatiquement** le mot de passe `123456`
5. **Retourne le mot de passe temporaire** dans la réponse

---

## 📡 Endpoints d'Administration

### 1. Créer un utilisateur

**Endpoint :** `POST /api/v1/auth/admin/create-user`

**Authentification :** Requise (Token JWT d'un admin)

**Body requis :**
```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@example.com",
  "telephone": "+22877123456",
  "role": "vendeur",
  "actif": true
}
```

**Champs :**
- `nom` (string, requis) - Minimum 2 caractères
- `prenom` (string, requis) - Minimum 2 caractères
- `email` (string, requis) - Format email valide
- `telephone` (string, requis) - Minimum 8 caractères
- `role` (enum, optionnel) - `admin` ou `vendeur` (défaut: `vendeur`)
- `actif` (boolean, optionnel) - Défaut: `true`

**Réponse succès (201) :**
```json
{
  "success": true,
  "message": "Utilisateur créé avec succès. Mot de passe temporaire: 123456",
  "data": {
    "id": "uuid-1234-5678",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com",
    "telephone": "+22877123456",
    "role": "vendeur",
    "actif": true,
    "creeLe": "2024-12-24T10:00:00Z"
  },
  "timestamp": "2024-12-24T10:00:00Z"
}
```

**Exemple avec cURL :**
```bash
curl -X POST http://localhost:3000/api/v1/auth/admin/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com",
    "telephone": "+22877123456",
    "role": "vendeur"
  }'
```

---

### 2. Lister tous les utilisateurs

**Endpoint :** `GET /api/v1/auth/admin/users`

**Authentification :** Requise (Token JWT d'un admin)

**Réponse succès (200) :**
```json
{
  "success": true,
  "message": "Utilisateurs récupérés avec succès",
  "data": [
    {
      "id": "uuid-1234-5678",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "jean.dupont@example.com",
      "telephone": "+22877123456",
      "role": "vendeur",
      "actif": true,
      "creeLe": "2024-12-24T10:00:00Z",
      "derniereConnexion": "2024-12-24T14:30:00Z"
    }
  ],
  "timestamp": "2024-12-24T15:00:00Z"
}
```

**Exemple avec cURL :**
```bash
curl -X GET http://localhost:3000/api/v1/auth/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 3. Modifier un utilisateur

**Endpoint :** `PUT /api/v1/auth/:id`

**Authentification :** Requise (Token JWT)

**Body optionnel :**
```json
{
  "nom": "Martin",
  "prenom": "Sophie",
  "email": "sophie.martin@example.com",
  "telephone": "+22877234567",
  "role": "admin",
  "actif": true
}
```

**Champs modifiables :**
- `nom` (string, optionnel)
- `prenom` (string, optionnel)
- `email` (string, optionnel)
- `telephone` (string, optionnel)
- `role` (enum, optionnel) - `admin` ou `vendeur`
- `actif` (boolean, optionnel)

**Réponse succès (200) :**
```json
{
  "success": true,
  "message": "Utilisateur mis à jour avec succès",
  "data": {
    "id": "uuid-1234-5678",
    "nom": "Martin",
    "prenom": "Sophie",
    "email": "sophie.martin@example.com",
    "role": "admin",
    "actif": true
  },
  "timestamp": "2024-12-24T15:00:00Z"
}
```

**Exemple avec cURL :**
```bash
curl -X PUT http://localhost:3000/api/v1/auth/{user-id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "nom": "Martin",
    "role": "admin"
  }'
```

---

### 4. Supprimer un utilisateur (Soft Delete)

**Endpoint :** `DELETE /api/v1/auth/admin/users/{id}`

**Authentification :** Requise (Token JWT d'un admin)

**Description :**
- ⚠️ **Soft Delete** : L'utilisateur est désactivé (`actif: false`) au lieu d'être supprimé
- ✅ Les données historiques sont conservées
- ✅ L'utilisateur ne peut plus se connecter

**Réponse succès (200) :**
```json
{
  "success": true,
  "message": "Utilisateur désactivé avec succès",
  "data": {
    "id": "uuid-1234-5678",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com",
    "role": "vendeur",
    "actif": false
  },
  "timestamp": "2024-12-24T15:00:00Z"
}
```

**Exemple avec cURL :**
```bash
curl -X DELETE http://localhost:3000/api/v1/auth/admin/users/{user-id} \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🔑 Gestion du Mot de Passe

### 5. Changer son mot de passe

**Endpoint :** `PUT /api/v1/auth/change-password`

**Authentification :** Requise (Token JWT de l'utilisateur)

**Body requis :**
```json
{
  "oldPassword": "123456",
  "newPassword": "MonNouveauMot2Passe"
}
```

**Règles :**
- `oldPassword` : Doit correspondre au mot de passe actuel
- `newPassword` : Minimum 6 caractères

**Réponse succès (200) :**
```json
{
  "success": true,
  "message": "Mot de passe changé avec succès",
  "timestamp": "2024-12-24T15:00:00Z"
}
```

**Exemple avec cURL :**
```bash
curl -X PUT http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "oldPassword": "123456",
    "newPassword": "MonNouveauMot2Passe"
  }'
```

**Erreurs possibles :**

| Code | Message | Signification |
|------|---------|---------------|
| 400 | Ancien mot de passe incorrect | Le oldPassword ne correspond pas |
| 400 | Validation échouée | newPassword < 6 caractères |
| 401 | Token requis | Pas de token JWT fourni |
| 404 | Utilisateur non trouvé | Utilisateur inexistant |

---

### Mot de passe par défaut
- **Valeur :** `123456`
- **Généré automatiquement** lors de la création par l'admin
- **Affiché dans la réponse** de l'API

### Recommandations de sécurité

1. **Première connexion :**
   - L'admin donne le mot de passe temporaire à l'utilisateur
   - L'utilisateur se connecte avec `123456`
   - L'utilisateur change immédiatement son mot de passe via `PUT /auth/change-password`

2. **Changement de mot de passe :**
   - Endpoint : `PUT /api/v1/auth/change-password`
   - Fournir `oldPassword` et `newPassword`
   - Le nouveau mot de passe doit avoir minimum 6 caractères

---

## 🛡️ Sécurité

### Protection des endpoints

**Middleware `isAdmin` :**
- Vérifie que l'utilisateur authentifié est un admin
- Retourne une erreur 403 si non autorisé

**Erreurs possibles :**

| Code | Message | Signification |
|------|---------|---------------|
| 401 | Token requis | Pas de token JWT fourni |
| 403 | Accès refusé | Utilisateur non-admin |
| 400 | Email déjà utilisé | L'email existe dans la BDD |
| 500 | Erreur serveur | Problème interne |

---

## 📝 Exemples d'Utilisation

### Cas 1 : Créer un vendeur

```javascript
// Requête
POST /api/v1/auth/admin/create-user
Headers: { Authorization: "Bearer ADMIN_TOKEN" }
Body: {
  "nom": "Martin",
  "prenom": "Sophie",
  "email": "sophie.martin@example.com",
  "telephone": "+22877234567",
  "role": "vendeur"
}

// Réponse
{
  "success": true,
  "message": "Utilisateur créé avec succès. Mot de passe temporaire: 123456",
  "data": { ... }
}
```

### Cas 2 : Créer un admin

```javascript
// Requête
POST /api/v1/auth/admin/create-user
Headers: { Authorization: "Bearer ADMIN_TOKEN" }
Body: {
  "nom": "Sy",
  "prenom": "Moussa",
  "email": "moussa.sy@example.com",
  "telephone": "+22877345678",
  "role": "admin"
}

// Réponse
{
  "success": true,
  "message": "Utilisateur créé avec succès. Mot de passe temporaire: 123456",
  "data": { ... }
}
```

### Cas 3 : Gérer la première connexion

**Étapes :**

1. **Admin crée l'utilisateur :**
   ```bash
   # L'admin appelle l'API et reçoit le mot de passe temporaire
   ```

2. **Admin transmet les identifiants :**
   - Email : `jean.dupont@example.com`
   - Mot de passe : `123456`

3. **Utilisateur se connecte :**
   ```bash
   POST /api/v1/auth/login
   Body: {
     "email": "jean.dupont@example.com",
     "motDePasse": "123456"
   }
   ```

4. **Utilisateur change son mot de passe :**
   ```bash
   PUT /api/v1/auth/{user-id}
   Headers: { Authorization: "Bearer USER_TOKEN" }
   Body: {
     "motDePasse": "NouveauMot2Passe"
   }
   ```

---

## ⚠️ Bonnes Pratiques

### Pour les Administrateurs

1. ✅ **Vérifier l'email** avant de créer un utilisateur
2. ✅ **Transmettre le mot de passe temporairement** (oral ou canal sécurisé)
3. ✅ **Demander le changement immédiat** du mot de passe
4. ✅ **Désactiver les comptes inutilisés** (`actif: false`)

### Pour les Nouveaux Utilisateurs

1. ✅ **Changer le mot de passe** dès la première connexion
2. ✅ **Choisir un mot de passe fort** (min 8 caractères, chiffres, symboles)
3. ✅ **Ne jamais partager** ses identifiants
4. ✅ **Se déconnecter** après chaque session

---

## 📊 Workflow Complet

```
┌─────────────┐
│   Admin     │
│  Connecté   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│ POST /auth/admin/create-user│
│ Body: infos utilisateur     │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Système génère mot de passe │
│ automatique: 123456         │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Response:                   │
│ - Utilisateur créé          │
│ - Mot de passe: 123456      │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────┐
│   Admin     │
│  transmet   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Nouvel      │
│ Utilisateur │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│ Login avec 123456           │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Changement mot de passe     │
│ vers nouveau mot de passe   │
└─────────────────────────────┘
```

---

## 📞 Support

Pour toute question ou problème concernant la gestion des utilisateurs, contactez l'équipe de support technique.
