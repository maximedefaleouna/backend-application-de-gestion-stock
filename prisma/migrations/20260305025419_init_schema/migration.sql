-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('admin', 'vendeur');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('espece', 'mobile_money', 'carte', 'credit');

-- CreateEnum
CREATE TYPE "StatutVente" AS ENUM ('completee', 'credit', 'partielle', 'annulee');

-- CreateEnum
CREATE TYPE "TypeMouvementStock" AS ENUM ('entree', 'sortie', 'ajustement');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('vente', 'stock', 'credit', 'systeme');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL DEFAULT 'vendeur',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniere_connexion" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "categorie_id" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "prix_vente" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_min" INTEGER NOT NULL DEFAULT 5,
    "image_url" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "adresse" TEXT,
    "total_credit" INTEGER NOT NULL DEFAULT 0,
    "total_paye" INTEGER NOT NULL DEFAULT 0,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventes" (
    "id" TEXT NOT NULL,
    "montant_total" INTEGER NOT NULL,
    "montant_paye" INTEGER NOT NULL DEFAULT 0,
    "montant_restant" INTEGER NOT NULL DEFAULT 0,
    "mode_paiement" "ModePaiement" NOT NULL DEFAULT 'espece',
    "statut" "StatutVente" NOT NULL DEFAULT 'completee',
    "client_id" TEXT,
    "est_credit" BOOLEAN NOT NULL DEFAULT false,
    "vendeur_id" TEXT NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles_vente" (
    "id" TEXT NOT NULL,
    "vente_id" TEXT NOT NULL,
    "produit_id" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" INTEGER NOT NULL,
    "prix_total" INTEGER NOT NULL,

    CONSTRAINT "articles_vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_credit" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "vente_id" TEXT NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "mode_paiement" "ModePaiement" NOT NULL DEFAULT 'espece',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_stock" (
    "id" TEXT NOT NULL,
    "produit_id" TEXT NOT NULL,
    "type" "TypeMouvementStock" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "utilisateur_id" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configurations" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "nomChef" TEXT NOT NULL,
    "prenomChef" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_nom_key" ON "categories"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "produits_reference_key" ON "produits"("reference");

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_vendeur_id_fkey" FOREIGN KEY ("vendeur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles_vente" ADD CONSTRAINT "articles_vente_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "ventes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles_vente" ADD CONSTRAINT "articles_vente_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_credit" ADD CONSTRAINT "paiements_credit_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_credit" ADD CONSTRAINT "paiements_credit_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "ventes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
