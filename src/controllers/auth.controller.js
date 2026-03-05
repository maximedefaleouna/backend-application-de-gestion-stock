const prisma = require('../config/database');
const PasswordUtils = require('../utils/password');
const JwtUtils = require('../utils/jwt');
const { createUserSchema, loginSchema, updateUserSchema } = require('../validators/schemas');
const {z} = require('zod');
const ApiResponse = require('../utils/apiResponse');

class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Inscription d'un nouvel utilisateur
   *     description: Crée un nouveau compte utilisateur avec les informations fournies. Le rôle par défaut est 'vendeur'.
   *     tags: [Authentification]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - nom
   *               - prenom
   *               - email
   *               - telephone
   *               - motDePasse
   *             properties:
   *               nom:
   *                 type: string
   *                 minLength: 2
   *                 example: Dupont
   *               prenom:
   *                 type: string
   *                 minLength: 2
   *                 example: Jean
   *               email:
   *                 type: string
   *                 format: email
   *                 example: jean.dupont@example.com
   *               telephone:
   *                 type: string
   *                 minLength: 8
   *                 example: 0612345678
   *               motDePasse:
   *                 type: string
   *                 minLength: 6
   *                 example: MonMot2Passe
   *               role:
   *                 type: string
   *                 enum: [admin, vendeur]
   *                 default: vendeur
   *                 example: vendeur
   *               actif:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       201:
   *         description: Utilisateur créé avec succès
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Utilisateur créé avec succès
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       format: uuid
   *                     nom:
   *                       type: string
   *                     prenom:
   *                       type: string
   *                     email:
   *                       type: string
   *                     role:
   *                       type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Données invalides ou email déjà utilisé
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: Validation échouée
   *                 error:
   *                   type: string
   *                   example: Données invalides
   *                 details:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       field:
   *                         type: string
   *                       message:
   *                         type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       500:
   *         description: Erreur serveur interne
   */
  async register(req, res) {
    try {
      const validatedData = createUserSchema.parse(req.body);

      // Vérifier si l'email existe déjà
      const existingUser = await prisma.utilisateur.findUnique({
        where: { email: validatedData.email }
      });

      if (existingUser) {
        return ApiResponse.error(res, 'Cet email est déjà utilisé', 400);
      }

      // Hacher le mot de passe
      const motDePasseHash = await PasswordUtils.hash(validatedData.motDePasse);

      // Créer l'utilisateur
      const utilisateur = await prisma.utilisateur.create({
        data: {
          ...validatedData,
          motDePasse: motDePasseHash,
          role: validatedData.role || 'vendeur'
        },
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          role: true,
          actif: true,
          creeLe: true
        }
      });

      return ApiResponse.created(res, utilisateur, 'Utilisateur créé avec succès');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        return ApiResponse.error(res, 'Validation échouée', 400, errors);
      }
      console.error('Erreur register:', error);
      return ApiResponse.error(res, 'Erreur serveur lors de l\'inscription', 500);
    }
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Connexion d'un utilisateur
   *     description: Authentifie un utilisateur avec son email et mot de passe, retourne un token JWT.
   *     tags: [Authentification]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - motDePasse
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: admin@example.com
   *               motDePasse:
   *                 type: string
   *                 example: admin123
   *     responses:
   *       200:
   *         description: Connexion réussie
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Connexion réussie
   *                 data:
   *                   type: object
   *                   properties:
   *                     token:
   *                       type: string
   *                       description: Token JWT pour l'authentification
   *                     utilisateur:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                         nom:
   *                           type: string
   *                         prenom:
   *                           type: string
   *                         email:
   *                           type: string
   *                         role:
   *                           type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: Identifiants invalides ou compte désactivé
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: Email ou mot de passe incorrect
   *                 error:
   *                   type: string
   *                   example: Non authentifié
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       500:
   *         description: Erreur serveur interne
   */
  async login(req, res) {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Trouver l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { email: validatedData.email }
      });

      if (!utilisateur) {
        return ApiResponse.error(res, 'Email ou mot de passe incorrect', 401);
      }

      // Vérifier si le compte est actif
      if (!utilisateur.actif) {
        return ApiResponse.error(res, 'Compte désactivé', 403);
      }

      // Vérifier le mot de passe
      const passwordValid = await PasswordUtils.compare(
        validatedData.motDePasse,
        utilisateur.motDePasse
      );

      if (!passwordValid) {
        return ApiResponse.error(res, 'Email ou mot de passe incorrect', 401);
      }

      // Mettre à jour la dernière connexion
      await prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: { derniereConnexion: new Date() }
      });

      // Générer le token JWT
      const token = JwtUtils.generateToken({
        userId: utilisateur.id,
        email: utilisateur.email,
        role: utilisateur.role
      });

      const responseData = {
        token,
        utilisateur: {
          id: utilisateur.id,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom,
          email: utilisateur.email,
          role: utilisateur.role,
          avatar: utilisateur.avatar
        }
      };

      return ApiResponse.success(res, responseData, 'Connexion réussie');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        return ApiResponse.error(res, 'Validation échouée', 400, errors);
      }
      console.error('Erreur login:', error);
      return ApiResponse.error(res, 'Erreur serveur lors de la connexion', 500);
    }
  }

  /**
   * @swagger
   * /auth/me:
   *   get:
   *     summary: Récupérer le profil de l'utilisateur connecté
   *     description: Retourne les informations complètes de l'utilisateur authentifié.
   *     tags: [Authentification]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profil récupéré avec succès
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Profil récupéré avec succès
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       format: uuid
   *                     nom:
   *                       type: string
   *                     prenom:
   *                       type: string
   *                     email:
   *                       type: string
   *                     telephone:
   *                       type: string
   *                     role:
   *                       type: string
   *                     avatar:
   *                       type: string
   *                       nullable: true
   *                     actif:
   *                       type: boolean
   *                     creeLe:
   *                       type: string
   *                       format: date-time
   *                     derniereConnexion:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: Non authentifié
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: Token d'authentification requis
   *                 error:
   *                   type: string
   *                   example: Non authentifié
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       404:
   *         description: Utilisateur non trouvé
   *       500:
   *         description: Erreur serveur interne
   */
  async getProfile(req, res) {
    try {
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          role: true,
          actif: true,
          createdAt: true,
          derniereConnexion: true
        }
      });

      if (!utilisateur) {
        return ApiResponse.error(res, 'Utilisateur non trouvé', 404);
      }

      return ApiResponse.success(res, utilisateur, 'Profil récupéré avec succès');
    } catch (error) {
      console.error('Erreur getProfile:', error);
      return ApiResponse.error(res, 'Erreur serveur', 500);
    }
  }

  /**
   * @swagger
   * /auth/{id}:
   *   put:
   *     summary: Mettre à jour un utilisateur
   *     description: Met à jour les informations d'un utilisateur. Seul un admin peut modifier le rôle.
   *     tags: [Authentification]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID de l'utilisateur à mettre à jour
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nom:
   *                 type: string
   *                 minLength: 2
   *                 example: Martin
   *               prenom:
   *                 type: string
   *                 minLength: 2
   *                 example: Sophie
   *               email:
   *                 type: string
   *                 format: email
   *                 example: sophie.martin@example.com
   *               telephone:
   *                 type: string
   *                 minLength: 8
   *                 example: 0698765432
   *               motDePasse:
   *                 type: string
   *                 minLength: 6
   *                 example: NouveauMot2Passe
   *               role:
   *                 type: string
   *                 enum: [admin, vendeur]
   *                 example: vendeur
   *               actif:
   *                 type: boolean
   *                 example: true
   *     responses:
   *       200:
   *         description: Utilisateur mis à jour avec succès
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Utilisateur mis à jour avec succès
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       format: uuid
   *                     nom:
   *                       type: string
   *                     prenom:
   *                       type: string
   *                     email:
   *                       type: string
   *                     role:
   *                       type: string
   *                     actif:
   *                       type: boolean
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Données invalides
   *       401:
   *         description: Non authentifié
   *       403:
   *         description: Accès refusé (seul un admin peut modifier)
   *       404:
   *         description: Utilisateur non trouvé
   *       500:
   *         description: Erreur serveur interne
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateUserSchema.parse(req.body);

      // Si on met à jour le mot de passe, le hacher
      if (validatedData.motDePasse) {
        validatedData.motDePasse = await PasswordUtils.hash(validatedData.motDePasse);
      }

      const utilisateur = await prisma.utilisateur.update({
        where: { id },
        data: validatedData,
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          role: true,
          actif: true
        }
      });

      return ApiResponse.success(res, utilisateur, 'Utilisateur mis à jour avec succès');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        return ApiResponse.error(res, 'Validation échouée', 400, errors);
      }
      if (error.code === 'P2025') {
        return ApiResponse.error(res, 'Utilisateur non trouvé', 404);
      }
      console.error('Erreur updateUser:', error);
      return ApiResponse.error(res, 'Erreur serveur', 500);
    }
  }
}

module.exports = new AuthController();
