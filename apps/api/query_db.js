const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const contracts = await prisma.contrat.findMany({
    where: { actif: true }
  });
  console.log("Active Contracts expected rents sum:", contracts.reduce((sum, c) => sum + c.montantLoyer, 0));
  console.log("Active Contracts count:", contracts.length);
  for (const c of contracts) {
    console.log(`Contract ID: ${c.id}, rent: ${c.montantLoyer}, locataire: ${c.locataireId}, bien: ${c.bienId}`);
  }

  const payments = await prisma.paiement.findMany();
  console.log("Payments count:", payments.length);
  for (const p of payments) {
    console.log(`Payment: ${p.id}, amount: ${p.montant}, type: ${p.type}, date: ${p.datePaiement.toISOString()}`);
  }

  const biens = await prisma.bien.findMany();
  console.log("Biens count:", biens.length);
  for (const b of biens) {
    console.log(`Bien ID: ${b.id}, adresse: ${b.adresse}, statut: ${b.statut}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
