const { PrismaClient } = require('@prisma/client');
const PasswordUtils = require('../src/utils/password');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Vérifier si un admin existe déjà
  const existingAdmin = await prisma.utilisateur.findFirst({
    where: { role: 'admin' }
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists. Skipping seed.');
    return;
  }

  // Créer un mot de passe haché en utilisant l'utilitaire du projet
  const hashedPassword = await PasswordUtils.hash('123456');

  // Créer l'utilisateur admin par défaut
  const admin = await prisma.utilisateur.create({
    data: {
      nom: 'Principal',
      prenom: 'Admin',
      email: 'admin@autopiecesplus.com',
      telephone: '+22877123456',
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

  console.log('✅ Admin user created successfully!');
  console.log('📧 Email: admin@autopiecesplus.com');
  console.log('🔑 Password: 123456');
  console.log('⚠️  Please change the password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
