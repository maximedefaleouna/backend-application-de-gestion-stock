# 🔄 Guide d'Intégration Frontend-Backend

## 📋 Vue d'ensemble

Ce document décrit l'intégration complète entre le frontend React et le backend Node.js/Express pour la gestion des produits avec upload d'images.

---

## 🎯 Correspondance des Données

### Structure Product (Frontend ↔ Backend)

| Champ Frontend | Type | Backend (Schema) | Base de données | Requis |
|----------------|------|------------------|-----------------|--------|
| `id` | string | Auto-généré | UUID | - |
| `name` | string | `name` | `nom` | ✅ |
| `reference` | string | `reference` | `reference` | ✅ |
| `description` | string | `description` | `description` | ❌ |
| `category` | string | `category` | `categorieId` | ✅ |
| `brand` | string | `brand` | `marque` | ✅ |
| `compatibleVehicles` | string[] | `compatibleVehicles` | `vehiculesCompatibles` | ❌ |
| `buyPrice` | number | `buyPrice` | `prixAchat` | ❌ |
| `sellPrice` | number | `sellPrice` | `prixVente` | ✅ |
| `stock` | number | `stock` | `stock` | ❌ |
| `minStock` | number | `minStock` | `stockMin` | ❌ |
| `imageUrl` | string | `imageUrl` | `imageUrl` | ❌ |
| `available` | boolean | `available` | `disponible` | ❌ |

---

## 📡 Endpoints API

### 1. Créer un produit

**Endpoint :** `POST /api/v1/produits`

**Content-Type :** `multipart/form-data`

**Correspondance des champs :**

```javascript
// Frontend (FormData)
const formData = new FormData();
formData.append('name', 'Plaquettes de frein');        // ✅ name
formData.append('reference', 'PF-001');                // ✅ reference
formData.append('description', 'Desc...');             // ✅ description
formData.append('category', 'Freinage');               // ✅ category
formData.append('brand', 'Bosch');                     // ✅ brand
formData.append('compatibleVehicles', '["Toyota","Honda"]'); // ✅ compatibleVehicles
formData.append('buyPrice', '10000');                  // ✅ buyPrice
formData.append('sellPrice', '15000');                 // ✅ sellPrice
formData.append('stock', '50');                        // ✅ stock
formData.append('minStock', '10');                     // ✅ minStock
formData.append('available', 'true');                  // ✅ available
formData.append('image', file);                        // ✅ Image upload
```

**Conversion automatique backend :**
```javascript
// Le backend convertit automatiquement :
{
  name: "Plaquettes de frein",         // string ✅
  reference: "PF-001",                 // string ✅
  description: "Desc...",              // string ✅
  category: "Freinage",                // string ✅
  brand: "Bosch",                      // string ✅
  compatibleVehicles: ["Toyota", "Honda"], // parsed from JSON string
  buyPrice: 10000,                     // converted from "10000" to Number
  sellPrice: 15000,                    // converted from "15000" to Number
  stock: 50,                           // converted from "50" to Number
  minStock: 10,                        // converted from "10" to Number
  available: true,                     // converted from "true" to boolean
  imageUrl: "/uploads/products/..."    // added by multer
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Produit créé avec succès",
  "data": {
    "id": "uuid-1234-5678",
    "name": "Plaquettes de frein",
    "reference": "PF-001",
    "description": "Desc...",
    "category": "Freinage",
    "brand": "Bosch",
    "compatibleVehicles": ["Toyota", "Honda"],
    "buyPrice": 10000,
    "sellPrice": 15000,
    "stock": 50,
    "minStock": 10,
    "available": true,
    "imageUrl": "/uploads/products/product-1735123456789-123456789.jpg"
  }
}
```

---

## 🖼️ Gestion des Images

### Upload (Frontend → Backend)

**Composant React :**
```tsx
const [previewImage, setPreviewImage] = useState<string>("");
const fileInputRef = useRef<HTMLInputElement>(null);

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreviewImage(result); // Pour aperçu
      setFormData(prev => ({ ...prev, imageUrl: result })); // Base64 pour preview
    };
    reader.readAsDataURL(file);
  }
};

// Dans le formulaire
<input 
  ref={fileInputRef} 
  type="file" 
  accept="image/*" 
  className="hidden" 
  onChange={handleImageUpload} 
/>
```

**Soumission :**
```tsx
const handleSubmit = async () => {
  const formData = new FormData();
  
  // Champs texte
  formData.append('name', productData.name);
  formData.append('reference', productData.reference);
  formData.append('category', productData.category);
  formData.append('brand', productData.brand);
  // ... autres champs
  
  // Image (seulement si sélectionnée)
  if (fileInputRef.current?.files?.[0]) {
    formData.append('image', fileInputRef.current.files[0]);
  }
  
  // Envoi
  const response = await fetch('/api/v1/produits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Content-Type sera automatiquement défini à multipart/form-data
    },
    body: formData
  });
};
```

### Traitement (Backend)

**Middleware Multer :**
```javascript
// backend/src/middlewares/upload.middleware.js
const upload = multer({
  storage: diskStorage({
    destination: 'uploads/products/',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `product-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter // jpeg, jpg, png, gif, webp seulement
});
```

**Route :**
```javascript
router.post('/produits', 
  authenticate, 
  upload.single('image'),      // Middleware Multer
  validate(createProduitSchema), 
  uploadErrorHandler,          // Gestion erreurs
  produitController.create
);
```

**Contrôleur :**
```javascript
async create(req, res) {
  let imageUrl = null;
  
  if (req.file) {
    // URL relative pour accès frontend
    imageUrl = `/uploads/products/${path.basename(req.file.path)}`;
  }
  
  // Ajouter imageUrl aux données
  const productData = { ...req.body };
  if (imageUrl) {
    productData.imageUrl = imageUrl;
  }
  
  // ... création du produit
}
```

### Affichage (Frontend)

**Configuration Vite :**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/uploads': 'http://localhost:3000'  // Proxy vers backend
    }
  }
});
```

**Affichage dans le composant :**
```tsx
<img 
  src={product.imageUrl} 
  alt={product.name}
  onError={(e) => {
    // Image par défaut si erreur
    e.currentTarget.src = '/placeholder.png';
  }}
/>
```

---

## 🔄 Flux Complet

### Création de produit

```
┌─────────────┐
│  Frontend   │
│   React     │
└──────┬──────┘
       │
       │ 1. Utilisateur remplit formulaire
       │    - Champs texte
       │    - Sélectionne image
       ▼
┌─────────────────────────┐
│  Conversion FormData    │
│  - name: "Produit"      │
│  - image: File          │
│  - sellPrice: "15000"   │
│  - available: "true"    │
└──────┬──────────────────┘
       │
       │ 2. POST /api/v1/produits
       │    Headers: Authorization
       │    Body: FormData
       ▼
┌─────────────┐
│   Backend   │
│   Express   │
└──────┬──────┘
       │
       │ 3. Middleware authenticate
       │    Vérifie token JWT
       ▼
┌─────────────────────┐
│  upload.single()    │
│  - Valide image     │
│  - Sauvegarde       │
│  - req.file ajouté  │
└──────┬──────────────┘
       │
       │ 4. validate()
       │    - name: string ✅
       │    - sellPrice: string → number ✅
       │    - available: string → boolean ✅
       ▼
┌─────────────────────┐
│  Contrôleur         │
│  - Récupère req.file│
│  - Génère imageUrl  │
│  - Parse données    │
└──────┬──────────────┘
       │
       │ 5. Prisma create
       │    INSERT INTO produit
       ▼
┌─────────────┐
│  Response   │
│  + imageUrl │
└──────┬──────┘
       │
       │ 6. Réponse JSON
       │    data.imageUrl: "/uploads/..."
       ▼
┌─────────────┐
│  Frontend   │
│  Affiche    │
│  nouveau    │
│  produit    │
└─────────────┘
```

---

## ⚠️ Points d'Attention

### 1. Types de données

**Problème :** FormData envoie tout en strings

**Solution backend :**
```javascript
// Conversion automatique
if (productData.sellPrice) productData.sellPrice = Number(productData.sellPrice);
if (productData.available !== undefined) productData.available = productData.available === 'true';
if (typeof productData.compatibleVehicles === 'string') {
  productData.compatibleVehicles = JSON.parse(productData.compatibleVehicles);
}
```

### 2. URLs d'images

**Frontend attend :** URL absolue ou relative accessible

**Backend génère :**
```javascript
// ✅ BON - URL relative
imageUrl: `/uploads/products/product-123.jpg`

// ❌ MAUUVAIS - Chemin local
imageUrl: `C:\backend\uploads\products\product-123.jpg`
```

**Configuration requise :**
```javascript
// backend/index.js
router.use('/uploads', express.static('uploads')); // Servir fichiers statiques

// frontend/vite.config.ts
server: {
  proxy: {
    '/uploads': 'http://localhost:3000' // Proxy pour dev
  }
}
```

### 3. Validation

**Erreurs courantes :**

**a) Category requise mais vide :**
```javascript
// Frontend
setFormData({ category: '' }) // ❌ Vide

// Backend validation
category: z.string().min(1, 'La catégorie est requise') // ❌ Erreur
```

**Solution :**
```javascript
// Frontend - Valeur par défaut
const [formData, setFormData] = useState({
  category: categories[0] || '' // ✅ Première catégorie
});
```

**b) Prix négatifs :**
```javascript
// Frontend
sellPrice: -100 // ❌

// Backend
sellPrice: z.number().nonnegative('Le prix doit être positif') // ❌ Erreur
```

**Solution :**
```javascript
// Frontend - Validation avant envoi
if (sellPrice < 0) {
  toast.error('Prix doit être positif');
  return;
}
```

### 4. Tableau compatibleVehicles

**Problème :** Comment envoyer un tableau via FormData ?

**Solution :**
```javascript
// Frontend
formData.append('compatibleVehicles', JSON.stringify(['Toyota', 'Honda']));

// Backend
if (typeof productData.compatibleVehicles === 'string') {
  productData.compatibleVehicles = JSON.parse(productData.compatibleVehicles);
}
```

---

## 🛠️ Configuration Requise

### Backend (.env)

```env
PORT=3000
DATABASE_URL="postgresql://..."
CORS_ORIGIN=http://localhost:5173 # URL frontend
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api/v1
```

### CORS (backend/index.js)

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
```

### Proxy Vite (frontend/vite.config.ts)

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000'
    }
  }
});
```

---

## 📊 Exemple Complet

### Frontend - Composant Products

```tsx
export default function Products() {
  const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProduct());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    // Validation frontend
    if (!formData.name || !formData.reference) {
      toast.error("Nom et référence obligatoires !");
      return;
    }

    const formDataToSend = new FormData();
    
    // Ajouter tous les champs
    formDataToSend.append('name', formData.name);
    formDataToSend.append('reference', formData.reference);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('brand', formData.brand);
    formDataToSend.append('buyPrice', formData.buyPrice.toString());
    formDataToSend.append('sellPrice', formData.sellPrice.toString());
    formDataToSend.append('stock', formData.stock.toString());
    formDataToSend.append('minStock', formData.minStock.toString());
    formDataToSend.append('available', formData.available.toString());
    
    // Ajouter l'image si présente
    if (fileInputRef.current?.files?.[0]) {
      formDataToSend.append('image', fileInputRef.current.files[0]);
    }

    try {
      const response = await fetch('/api/v1/produits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formDataToSend
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Produit créé avec succès !");
        setIsAddDialogOpen(false);
        // Recharger la liste des produits
      } else {
        toast.error(result.message || "Erreur lors de la création");
      }
    } catch (error) {
      toast.error("Erreur de connexion au serveur");
    }
  };

  return (
    // ... JSX avec formulaire
  );
}
```

### Backend - Route complète

```javascript
// backend/index.js
const { upload, uploadErrorHandler } = require('./middlewares/upload.middleware');

// Route de création
router.post('/produits', 
  authenticate,                                    // 1. Auth JWT
  upload.single('image'),                          // 2. Upload image
  validate(createProduitSchema),                   // 3. Validation données
  uploadErrorHandler,                              // 4. Gestion erreurs
  produitController.create.bind(produitController) // 5. Création
);

// Servir les images
router.use('/uploads', express.static('uploads'));
```

---

## ✅ Checklist d'Intégration

### Frontend
- [ ] Formulaire avec tous les champs requis
- [ ] Input file pour image avec accept="image/*"
- [ ] Aperçu image avant upload
- [ ] Conversion en FormData
- [ ] Gestion des types (numbers, booleans)
- [ ] Token JWT dans les headers
- [ ] Gestion des erreurs API

### Backend
- [ ] Middleware Multer configuré
- [ ] Dossier uploads/ créé
- [ ] Schéma de validation aligné avec frontend
- [ ] Conversion des types (strings → numbers/booleans)
- [ ] URL relative pour imageUrl
- [ ] Static middleware pour servir uploads
- [ ] CORS configuré

### Communication
- [ ] Même port backend (3000)
- [ ] Même port frontend (5173)
- [ ] Proxy Vite configuré
- [ ] URLs d'images accessibles
- [ ] Tokens JWT fonctionnels

---

## 🎯 Résumé

**Cette intégration assure :**

1. ✅ **Correspondance parfaite** des champs frontend ↔ backend
2. ✅ **Upload d'images** fluide avec Multer
3. ✅ **Validation cohérente** des deux côtés
4. ✅ **Conversion automatique** des types
5. ✅ **URLs d'images** accessibles
6. ✅ **Erreurs gérées** proprement
7. ✅ **TypeScript** frontend respecté
8. ✅ **Expérience utilisateur** optimale

L'intégration est maintenant **complète et professionnelle** ! 🎉
