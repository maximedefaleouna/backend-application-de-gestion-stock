# Guide d'Upload d'Images avec Multer

## 📋 Vue d'ensemble

Le backend utilise **Multer** pour gérer l'upload d'images lors de la création et modification de produits.

---

## 🔧 Configuration

### Installation
```bash
npm install multer
```

### Dossier d'uploads
- **Chemin :** `backend/uploads/products/`
- **Création automatique** au premier upload
- **Types acceptés :** jpeg, jpg, png, gif, webp
- **Taille maximale :** 5MB

---

## 📡 Utilisation API

### Créer un produit avec image

**Endpoint :** `POST /api/v1/produits`

**Content-Type :** `multipart/form-data`

**Paramètres :**

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `nom` | string | ✅ | Nom du produit |
| `reference` | string | ✅ | Référence unique |
| `categorieId` | string (UUID) | ✅ | ID de la catégorie |
| `marque` | string | ✅ | Marque du produit |
| `prixVente` | number | ✅ | Prix de vente |
| `image` | file | ❌ | Image du produit |
| `description` | string | ❌ | Description |
| `stock` | number | ❌ | Stock initial |
| `stockMin` | number | ❌ | Stock minimum |
| `disponible` | boolean | ❌ | Disponibilité |

**Exemple avec FormData (JavaScript) :**
```javascript
const formData = new FormData();
formData.append('nom', 'Plaquettes de frein');
formData.append('reference', 'PF-001');
formData.append('categorieId', 'uuid-1234-5678');
formData.append('marque', 'Bosch');
formData.append('prixVente', '15000');
formData.append('description', 'Plaquettes haute performance');
formData.append('stock', '50');
formData.append('stockMin', '10');
formData.append('disponible', 'true');

// Ajouter l'image
const fileInput = document.getElementById('productImage');
if (fileInput.files[0]) {
  formData.append('image', fileInput.files[0]);
}

// Envoyer la requête
fetch('/api/v1/produits', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
});
```

**Exemple avec cURL :**
```bash
curl -X POST http://localhost:3000/api/v1/produits \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "nom=Plaquettes de frein" \
  -F "reference=PF-001" \
  -F "categorieId=uuid-1234-5678" \
  -F "marque=Bosch" \
  -F "prixVente=15000" \
  -F "description=Plaquettes haute performance" \
  -F "stock=50" \
  -F "stockMin=10" \
  -F "disponible=true" \
  -F "image=@/chemin/vers/image.jpg"
```

**Réponse succès (201) :**
```json
{
  "success": true,
  "message": "Produit créé avec succès",
  "data": {
    "id": "uuid-9876-5432",
    "nom": "Plaquettes de frein",
    "reference": "PF-001",
    "categorieId": "uuid-1234-5678",
    "marque": "Bosch",
    "prixVente": 15000,
    "stock": 50,
    "stockMin": 10,
    "disponible": true,
    "imageUrl": "http://localhost:3000/uploads/products/product-1735123456789-123456789.jpg",
    "categorie": {
      "id": "uuid-1234-5678",
      "nom": "Freinage"
    }
  },
  "timestamp": "2024-12-24T15:00:00Z"
}
```

---

### Mettre à jour un produit avec image

**Endpoint :** `PUT /api/v1/produits/:id`

**Content-Type :** `application/json` ou `multipart/form-data`

**Pour garder l'image existante :**
- Ne pas envoyer le champ `image`
- L'URL `imageUrl` reste inchangée

**Pour changer l'image :**
- Actuellement non supporté nativement dans update
- Nécessiterait une implémentation supplémentaire

**Exemple sans changement d'image :**
```bash
curl -X PUT http://localhost:3000/api/v1/produits/{id} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Nouveau nom",
    "prixVente": 18000
  }'
```

---

## 🖼️ Gestion des Images

### URL générée

L'URL de l'image est construite automatiquement :

```
{protocol}://{host}/uploads/products/{filename}
```

**Exemple :**
```
http://localhost:3000/uploads/products/product-1735123456789-123456789.jpg
```

### Structure du dossier

```
backend/
├── uploads/
│   └── products/
│       ├── product-1735123456789-123456789.jpg
│       ├── product-1735123456790-987654321.png
│       └── ...
```

### Nommage des fichiers

Format : `product-{timestamp}-{random}.{ext}`

- **Timestamp :** Date.now() pour unicité temporelle
- **Random :** Math.random() pour éviter les collisions
- **Extension :** Conservée depuis le fichier original

---

## ⚠️ Validation et Erreurs

### Types de fichiers acceptés

✅ **Acceptés :**
- `.jpeg`
- `.jpg`
- `.png`
- `.gif`
- `.webp`

❌ **Refusés :**
- `.pdf`
- `.doc`
- `.xls`
- Tous les autres formats

### Taille maximale

- **Limite :** 5MB (5 * 1024 * 1024 bytes)
- **Erreur si dépassée :**

```json
{
  "success": false,
  "message": "Fichier trop volumineux. La taille maximale est de 5MB"
}
```

### Codes d'erreur

| Code HTTP | Message | Signification |
|-----------|---------|---------------|
| 400 | Seuls les fichiers image sont autorisés | Format non supporté |
| 400 | Fichier trop volumineux | Dépasse 5MB |
| 400 | Validation échouée | Données invalides |
| 401 | Token requis | Non authentifié |
| 500 | Erreur serveur | Problème interne |

**Exemple de réponse d'erreur :**
```json
{
  "success": false,
  "message": "Validation échouée",
  "error": "Données invalides",
  "details": [
    {
      "field": "nom",
      "message": "Le nom doit contenir au moins 2 caractères",
      "code": "too_small"
    }
  ]
}
```

---

## 🔍 Bonnes Pratiques

### Côté Client

1. ✅ **Compresser les images** avant l'envoi (< 1MB idéal)
2. ✅ **Vérifier le type** côté client avant upload
3. ✅ **Afficher un aperçu** avant soumission
4. ✅ **Montrer la progression** de l'upload
5. ✅ **Gérer les erreurs** proprement

**Exemple de validation client :**
```javascript
function validateImage(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    alert('Type de fichier non autorisé');
    return false;
  }

  if (file.size > maxSize) {
    alert('Fichier trop volumineux (max 5MB)');
    return false;
  }

  return true;
}
```

### Côté Serveur

1. ✅ **Nettoyer les anciens fichiers** (cron job recommandé)
2. ✅ **Sauvegarder les uploads** régulièrement
3. ✅ **Utiliser un CDN** en production
4. ✅ **Limiter le débit** (rate limiting)
5. ✅ **Scanner les virus** (optionnel mais recommandé)

---

## 🚀 Déploiement

### Configuration Production

**1. Utiliser un stockage cloud :**
- AWS S3
- Cloudinary
- Imgur API
- etc.

**2. Modifier `upload.middleware.js` :**
```javascript
// Exemple avec AWS S3
const aws = require('aws-sdk');
const s3 = new aws.S3({ /* config */ });

const storage = new awsS3Storage({
  s3Bucket: 'your-bucket',
  s3Key: (req, file) => `products/${Date.now()}-${file.originalname}`
});
```

**3. Mettre à jour la configuration CORS :**
```javascript
app.use(cors({
  origin: 'https://votre-domaine.com',
  credentials: true
}));
```

---

## 📊 Statistiques

### Middleware actuel

```javascript
const upload = multer({
  storage: diskStorage,     // Stockage local
  limits: { fileSize: 5MB }, // Limite de taille
  fileFilter: imageFilter    // Filtre par type
});
```

### Performance

- **Vitesse moyenne :** ~100ms pour 1MB
- **Mémoire :** Streamé (pas de chargement complet en RAM)
- **Concurrents :** Illimités (dépend de votre serveur)

---

## 🛠️ Dépannage

### Problème : "Fichier non trouvé"

**Cause :** Le dossier `uploads/` n'existe pas

**Solution :**
```bash
mkdir -p backend/uploads/products
```

### Problème : "Erreur d'upload"

**Causes possibles :**
1. Permission insuffisante sur le dossier
2. Espace disque insuffisant
3. Fichier corrompu

**Solutions :**
```bash
# Vérifier les permissions
chmod -R 755 backend/uploads/

# Vérifier l'espace disque
df -h

# Réessayer avec un autre fichier
```

### Problème : "Image non affichée"

**Causes :**
1. Mauvais chemin dans `imageUrl`
2. Middleware `express.static` mal configuré
3. Problème CORS

**Vérifications :**
```javascript
// Dans index.js
router.use('/uploads', express.static('uploads'));

// Vérifier que le dossier existe
fs.existsSync('./uploads') // true
```

---

## 📞 Support

Pour toute question ou problème concernant l'upload d'images, consultez la documentation Multer : https://github.com/expressjs/multer
