-- CreateEnum
CREATE TYPE "ActionHistorique" AS ENUM ('creation', 'modification', 'suppression', 'connexion', 'deconnexion', 'vente', 'paiement', 'mouvement_stock', 'consultation');

-- CreateTable
CREATE TABLE "historique" (
    "id" TEXT NOT NULL,
    "action" "ActionHistorique" NOT NULL,
    "entite" TEXT NOT NULL,
    "entite_id" TEXT,
    "description" TEXT NOT NULL,
    "utilisateur_id" TEXT,
    "donnees_avant" JSONB,
    "donnees_apres" JSONB,
    "adresse_ip" TEXT,
    "user_agent" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historique_entite_idx" ON "historique"("entite");

-- CreateIndex
CREATE INDEX "historique_utilisateur_id_idx" ON "historique"("utilisateur_id");

-- CreateIndex
CREATE INDEX "historique_action_idx" ON "historique"("action");

-- CreateIndex
CREATE INDEX "historique_cree_le_idx" ON "historique"("cree_le");

-- AddForeignKey
ALTER TABLE "historique" ADD CONSTRAINT "historique_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
