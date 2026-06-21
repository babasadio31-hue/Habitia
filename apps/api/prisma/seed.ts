import { PrismaClient, Role, LocataireStatut, BienType, BienStatut, PaiementStatut, PaiementType, ChantierStatut } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const hashPasswordSync = (password: string) => {
  return bcrypt.hashSync(password, 10);
};

async function main() {
  console.log('Clearing database tables...');
  
  // Delete in reverse order of dependencies
  await prisma.document.deleteMany();
  await prisma.paiement.deleteMany();
  await prisma.contrat.deleteMany();
  await prisma.chantier.deleteMany();
  await prisma.bien.deleteMany();
  await prisma.proprietaire.deleteMany();
  await prisma.locataire.deleteMany();
  await prisma.personnel.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding Users...');
  const u1 = await prisma.user.create({
    data: {
      id: 'u-admin',
      nom: 'Sadio Diallo',
      email: 'admin@habitia.com',
      password: hashPasswordSync('admin123'),
      role: Role.admin,
      actif: true,
    },
  });

  const u2 = await prisma.user.create({
    data: {
      id: 'u-agent',
      nom: 'Fatou Diop',
      email: 'agent@habitia.com',
      password: hashPasswordSync('agent123'),
      role: Role.agent,
      actif: true,
    },
  });

  const u3 = await prisma.user.create({
    data: {
      id: 'u-compta',
      nom: 'Amath Sow',
      email: 'compta@habitia.com',
      password: hashPasswordSync('compta123'),
      role: Role.comptable,
      actif: true,
    },
  });

  const u4 = await prisma.user.create({
    data: {
      id: 'u-read',
      nom: 'Jean Dupont',
      email: 'lecture@habitia.com',
      password: hashPasswordSync('read123'),
      role: Role.lecture_seule,
      actif: true,
    },
  });

  console.log('Seeding Proprietaires...');
  const prop1 = await prisma.proprietaire.create({
    data: {
      id: 'prop-1',
      nom: 'Ndiaye',
      prenom: 'Cheikh',
      email: 'cheikh.ndiaye@gmail.com',
      telephone: '+221 77 123 45 67',
      adresse: 'Almadies, Lot 4, Dakar',
      cinPasseport: 'A1234567B',
    },
  });

  const prop2 = await prisma.proprietaire.create({
    data: {
      id: 'prop-2',
      nom: 'Sall',
      prenom: 'Aminata',
      email: 'aminata.sall@outlook.com',
      telephone: '+221 78 987 65 43',
      adresse: 'Fann Résidence, Villa 12, Dakar',
      cinPasseport: 'B9876543C',
    },
  });

  const prop3 = await prisma.proprietaire.create({
    data: {
      id: 'prop-3',
      nom: 'Mbodj',
      prenom: 'Omar',
      email: 'omar.mbodj@yahoo.fr',
      telephone: '+221 70 555 44 33',
      adresse: 'Plateau, Rue Carnot, Dakar',
      cinPasseport: 'C4445556D',
    },
  });

  console.log('Seeding Locataires...');
  const loc1 = await prisma.locataire.create({
    data: {
      id: 'loc-1',
      nom: 'Kaba',
      prenom: 'Ibrahima',
      email: 'ibrahima.kaba@gmail.com',
      telephone: '+221 77 222 33 44',
      employeur: 'Orange Sénégal',
      garant: 'Kaba Amadou (Père)',
      statut: LocataireStatut.actif,
    },
  });

  const loc2 = await prisma.locataire.create({
    data: {
      id: 'loc-2',
      nom: 'Fall',
      prenom: 'Mariama',
      email: 'mariama.fall@hotmail.com',
      telephone: '+221 76 333 44 55',
      employeur: 'Banque Centrale (BCEAO)',
      garant: 'Fall Ousmane (Oncle)',
      statut: LocataireStatut.actif,
    },
  });

  const loc3 = await prisma.locataire.create({
    data: {
      id: 'loc-3',
      nom: 'Traoré',
      prenom: 'Sekou',
      email: 'sekou.traore@live.fr',
      telephone: '+221 78 444 55 66',
      employeur: 'Senelec',
      garant: 'Traoré Moussa (Frère)',
      statut: LocataireStatut.actif,
    },
  });

  const loc4 = await prisma.locataire.create({
    data: {
      id: 'loc-4',
      nom: 'Gaye',
      prenom: 'Aissatou',
      email: 'aissatou.gaye@gmail.com',
      telephone: '+221 77 666 77 88',
      employeur: 'Étudiante',
      garant: 'Gaye Birame (Père)',
      statut: LocataireStatut.liste_attente,
    },
  });

  const loc5 = await prisma.locataire.create({
    data: {
      id: 'loc-5',
      nom: 'Sarr',
      prenom: 'Babacar',
      email: 'babacar.sarr@gmail.com',
      telephone: '+221 70 888 99 00',
      employeur: 'Freelance Dev',
      garant: 'Auto-garantie',
      statut: LocataireStatut.ancien,
    },
  });

  console.log('Seeding Biens...');
  const bien1 = await prisma.bien.create({
    data: {
      id: 'bien-1',
      adresse: 'Almadies, Face Clinique des Grès',
      ville: 'Dakar',
      type: BienType.villa,
      surface: 350,
      etage: 0,
      nbPieces: 6,
      statut: BienStatut.loue,
      proprietaireId: prop1.id,
      photos: ['https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&auto=format&fit=crop'],
      charges: ['Syndic: 50 000 FCFA/mois', 'Gardiennage: 30 000 FCFA/mois'],
    },
  });

  const bien2 = await prisma.bien.create({
    data: {
      id: 'bien-2',
      adresse: 'Mermoz, Rue MZ-102',
      ville: 'Dakar',
      type: BienType.appartement,
      surface: 120,
      etage: 3,
      nbPieces: 3,
      statut: BienStatut.loue,
      proprietaireId: prop1.id,
      photos: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop'],
      charges: ['Entretien ascenseur: 15 000 FCFA/mois', 'Nettoyage: 10 000 FCFA/mois'],
    },
  });

  const bien3 = await prisma.bien.create({
    data: {
      id: 'bien-3',
      adresse: 'Plateau, Avenue Pompidou',
      ville: 'Dakar',
      type: BienType.bureau,
      surface: 80,
      etage: 1,
      nbPieces: 2,
      statut: BienStatut.disponible,
      proprietaireId: prop2.id,
      photos: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop'],
      charges: ['Syndic de copropriété: 45 000 FCFA/mois'],
    },
  });

  const bien4 = await prisma.bien.create({
    data: {
      id: 'bien-4',
      adresse: 'Ngor, Virage Est',
      ville: 'Dakar',
      type: BienType.appartement,
      surface: 180,
      etage: 2,
      nbPieces: 4,
      statut: BienStatut.en_travaux,
      proprietaireId: prop3.id,
      photos: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop'],
      charges: ['Gardiennage: 25 000 FCFA/mois'],
    },
  });

  const bien5 = await prisma.bien.create({
    data: {
      id: 'bien-5',
      adresse: 'Lac Rose, Secteur 3',
      ville: 'Rufisque',
      type: BienType.terrain,
      surface: 500,
      statut: BienStatut.en_vente,
      proprietaireId: prop2.id,
      photos: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop'],
      charges: [],
    },
  });

  console.log('Seeding Contrats...');
  const cont1 = await prisma.contrat.create({
    data: {
      id: 'cont-1',
      bienId: bien1.id,
      locataireId: loc1.id,
      dateDebut: new Date('2025-01-01T00:00:00Z'),
      dateFin: new Date('2025-12-31T00:00:00Z'),
      montantLoyer: 1500000,
      depot: 3000000,
      actif: true,
    },
  });

  const cont2 = await prisma.contrat.create({
    data: {
      id: 'cont-2',
      bienId: bien2.id,
      locataireId: loc2.id,
      dateDebut: new Date('2025-03-01T00:00:00Z'),
      dateFin: new Date('2026-02-28T00:00:00Z'),
      montantLoyer: 650000,
      depot: 1300000,
      actif: true,
    },
  });

  console.log('Seeding Paiements...');
  const months = ['01', '02', '03', '04', '05', '06'];
  for (const m of months) {
    // Contrat 1 payments
    await prisma.paiement.create({
      data: {
        id: `pay-c1-${m}`,
        contratId: cont1.id,
        montant: 1500000,
        datePaiement: new Date(`2026-${m}-05T00:00:00Z`),
        statut: m === '06' ? PaiementStatut.partiel : PaiementStatut.paye,
        type: PaiementType.loyer,
      },
    });

    // Contrat 2 payments
    await prisma.paiement.create({
      data: {
        id: `pay-c2-${m}`,
        contratId: cont2.id,
        montant: 650000,
        datePaiement: new Date(`2026-${m}-02T00:00:00Z`),
        statut: m === '05' ? PaiementStatut.en_retard : PaiementStatut.paye,
        type: PaiementType.loyer,
      },
    });
  }

  // Deposit payment
  await prisma.paiement.create({
    data: {
      id: 'pay-dep-1',
      contratId: cont1.id,
      montant: 3000000,
      datePaiement: new Date('2024-12-28T00:00:00Z'),
      statut: PaiementStatut.paye,
      type: PaiementType.caution,
    },
  });

  console.log('Seeding Chantiers...');
  const chan1 = await prisma.chantier.create({
    data: {
      id: 'chan-1',
      bienId: bien4.id,
      titre: 'Rénovation Complète Plomberie et Peinture',
      budget: 4500000,
      avancement: 65,
      statut: ChantierStatut.en_cours,
      dateDebut: new Date('2026-05-10T00:00:00Z'),
      dateFin: new Date('2026-07-15T00:00:00Z'),
      prestataires: [
        { nom: 'ETS Bati-Pro', specialite: 'Gros Œuvre / Peinture', contact: '+221 77 600 11 22', montant: 3000000 },
        { nom: 'Sene-Plomberie', specialite: 'Plomberie', contact: '+221 78 500 44 88', montant: 1500000 },
      ],
    },
  });

  const chan2 = await prisma.chantier.create({
    data: {
      id: 'chan-2',
      bienId: bien5.id,
      titre: 'Clôture du terrain Lac Rose',
      budget: 2000000,
      avancement: 100,
      statut: ChantierStatut.termine,
      dateDebut: new Date('2026-02-01T00:00:00Z'),
      dateFin: new Date('2026-03-05T00:00:00Z'),
      prestataires: [
        { nom: 'Maçonnerie du Rail', specialite: 'Clôture & Portails', contact: '+221 76 999 88 77', montant: 2000000 },
      ],
    },
  });

  console.log('Seeding Personnels...');
  await prisma.personnel.create({
    data: {
      id: 'pers-1',
      nom: 'Goudiaby',
      poste: 'Gestionnaire de Biens',
      email: 'goudiaby@habitia.com',
      telephone: '+221 77 412 33 22',
      salaire: 450000,
      dateEmbauche: new Date('2024-01-15T00:00:00Z'),
      absences: [
        { id: 'abs-1', dateDebut: '2026-08-10', dateFin: '2026-08-24', motif: 'Congés Annuels', statut: 'validé' },
      ],
      planning: {
        Lundi: '08h00 - 17h00',
        Mardi: '08h00 - 17h00',
        Mercredi: '08h00 - 17h00',
        Jeudi: '08h00 - 17h00',
        Vendredi: '08h00 - 16h00',
      },
      biensAssignes: {
        connect: [{ id: bien1.id }, { id: bien2.id }, { id: bien3.id }],
      },
    },
  });

  await prisma.personnel.create({
    data: {
      id: 'pers-2',
      nom: 'Diallo',
      poste: 'Chargé Maintenance',
      email: 'diallo.maint@habitia.com',
      telephone: '+221 78 555 66 77',
      salaire: 350000,
      dateEmbauche: new Date('2025-06-01T00:00:00Z'),
      absences: [],
      planning: {
        Lundi: '08h30 - 17h30',
        Mardi: '08h30 - 17h30',
        Mercredi: '08h30 - 17h30',
        Jeudi: '08h30 - 17h30',
        Vendredi: '08h30 - 17h30',
        Samedi: '09h00 - 13h00',
      },
      biensAssignes: {
        connect: [{ id: bien4.id }],
      },
    },
  });

  console.log('Seeding Documents...');
  await prisma.document.create({
    data: {
      id: 'doc-1',
      nom: 'Contrat de Mandat Ndiaye.pdf',
      url: '/uploads/mandat_ndiaye.pdf',
      type: 'pdf',
      entiteType: 'proprietaire',
      entiteId: prop1.id,
      proprietaireId: prop1.id,
    },
  });

  await prisma.document.create({
    data: {
      id: 'doc-2',
      nom: 'CIN_Ibrahima_Kaba.jpg',
      url: '/uploads/cin_kaba.jpg',
      type: 'image',
      entiteType: 'locataire',
      entiteId: loc1.id,
      locataireId: loc1.id,
    },
  });

  await prisma.document.create({
    data: {
      id: 'doc-3',
      nom: 'Facture Plomberie Sene-Plomberie.pdf',
      url: '/uploads/facture_plomberie.pdf',
      type: 'pdf',
      entiteType: 'chantier',
      entiteId: chan1.id,
      chantierId: chan1.id,
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
