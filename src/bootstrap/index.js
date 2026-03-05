const prisma = require('../config/database');
const PasswordUtils = require('../utils/password');

/**
 * Bootstrap de l'administrateur par défaut
 * Crée un admin si aucun utilisateur n'existe dans la base
 */
async function bootstrapDefaultAdmin() {
  try {
    console.log('🔄 Vérification de l\'existence d\'un administrateur...');

    // Vérifier s'il y a déjà des utilisateurs
    const userCount = await prisma.utilisateur.count(
      {
        where: {
          role: 'admin'
        }
      }
    );

    if (userCount === 0) {
      console.log('ℹ️ Aucun utilisateur trouvé. Création de l\'administrateur par défaut...');

      const defaultAdminEmail = 'admin@example.com';
      const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

      // Vérifier si l'admin par défaut existe déjà
      const existingAdmin = await prisma.utilisateur.findUnique({
        where: { email: defaultAdminEmail }
      });

      if (!existingAdmin) {
        // Hacher le mot de passe
        const hashedPassword = await PasswordUtils.hash(defaultAdminPassword);

        // Créer l'administrateur par défaut
        const admin = await prisma.utilisateur.create({
          data: {
            nom: 'Administrateur',
            prenom: 'Principal',
            email: defaultAdminEmail,
            telephone: '0000000000',
            motDePasse: hashedPassword,
            role: 'admin',
            actif: true
          },
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            role: true
          }
        });

        console.log('✅ Administrateur par défaut créé avec succès !');
        console.log('📧 Email: admin@example.com');
        console.log('🔑 Mot de passe: ' + defaultAdminPassword);
        console.log('⚠️  Veuillez changer ce mot de passe après la première connexion !');
      } else {
        console.log('✓ L\'administrateur par défaut existe déjà');
      }
    } else {
      console.log('✓ Des utilisateurs existent déjà dans la base');
    }
  } catch (error) {
    console.error('❌ Erreur lors du bootstrap de l\'admin:', error);
    throw error;
  }
}

/**
 * Bootstrap de la configuration par défaut
 */
async function bootstrapDefaultConfiguration() {
  try {
    console.log('🔄 Vérification de la configuration...');

    const configCount = await prisma.configuration.count();

    if (configCount === 0) {
      console.log('ℹ️ Aucune configuration trouvée. Création de la configuration par défaut...');

      const config = await prisma.configuration.create({
        data: {
          nom: 'Ma Boutique',
          nomChef: 'Nom',
          prenomChef: 'Prénom',
          adresse: 'Adresse de la boutique',
          telephone: '0000000000',
          email: 'contact@boutique.com'
        }
      });

      console.log('✓ Configuration par défaut créée');
    } else {
      console.log('✓ La configuration existe déjà');
    }
  } catch (error) {
    console.error('❌ Erreur lors du bootstrap de la configuration:', error);
    throw error;
  }
}

module.exports = {
  bootstrapDefaultAdmin,
  bootstrapDefaultConfiguration
};
