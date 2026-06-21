"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const jwt = __importStar(require("jsonwebtoken"));
const bcrypt = __importStar(require("bcrypt"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const db_1 = require("./services/db");
const auth_1 = require("./middlewares/auth");
const pdf_1 = require("./services/pdf");
const google_auth_library_1 = require("google-auth-library");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'habitia-super-secret-jwt-key-2026';
const googleClient = new google_auth_library_1.OAuth2Client("466480529541-49fao7ma01km2sbmaev7b8pp748lfjkn.apps.googleusercontent.com");
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json());
// Setup upload folder
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadDir));
// Multer Storage Configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({ storage });
// Local Settings Persistence
const settingsPath = path_1.default.join(__dirname, '../settings.json');
const defaultSettings = {
    enterprise: {
        nom: "Habitia Real Estate Group",
        logo: "/assets/images/logo.png",
        adresse: "Avenue Léopold Sédar Senghor, Dakar, Sénégal",
        siret: "SN-DKR-2026-B-12345",
        telephone: "+221 33 824 00 00",
        email: "contact@habitia.com"
    },
    mailModels: [
        {
            id: "quittance",
            name: "Envoi de Quittance de Loyer",
            subject: "Votre quittance de loyer pour [Période]",
            body: "Bonjour [Locataire],\n\nVeuillez trouver ci-joint votre quittance de loyer pour la période de [Période] d'un montant de [Montant] FCFA.\n\nCordialement,\nL'équipe Habitia"
        },
        {
            id: "relance",
            name: "Rappel de Loyer Impayé",
            subject: "Rappel : Loyer en retard pour le bien [Bien]",
            body: "Bonjour [Locataire],\n\nSauf erreur de notre part, nous n'avons pas encore reçu votre loyer de [Montant] FCFA pour le mois de [Mois].\n\nMerci de régulariser la situation dans les plus brefs délais.\n\nCordialement,\nL'équipe Habitia"
        }
    ],
    notifications: {
        alertLatePayment: true,
        alertContractExpiry: true,
        alertBudgetOverrun: true
    }
};
function getSettings() {
    if (fs_1.default.existsSync(settingsPath)) {
        try {
            return JSON.parse(fs_1.default.readFileSync(settingsPath, 'utf8'));
        }
        catch (e) {
            return defaultSettings;
        }
    }
    fs_1.default.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
    return defaultSettings;
}
function saveSettings(settings) {
    fs_1.default.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}
// Password hashing helper
const hashPasswordSync = (password) => {
    return bcrypt.hashSync(password, 10);
};
// ==========================================
// ENUMS MAPPER HELPERS (Frontend <=> Database)
// ==========================================
function mapBienStatutToDb(statut) {
    if (statut === 'loué')
        return 'loue';
    return statut;
}
function mapBienStatutToFe(statut) {
    if (statut === 'loue')
        return 'loué';
    return statut;
}
function mapPaiementStatutToDb(statut) {
    if (statut === 'payé')
        return 'paye';
    return statut;
}
function mapPaiementStatutToFe(statut) {
    if (statut === 'paye')
        return 'payé';
    return statut;
}
function mapChantierStatutToDb(statut) {
    if (statut === 'planifié')
        return 'planifie';
    if (statut === 'terminé')
        return 'termine';
    return statut;
}
function mapChantierStatutToFe(statut) {
    if (statut === 'planifie')
        return 'planifié';
    if (statut === 'termine')
        return 'terminé';
    return statut;
}
// ==========================================
// 1. AUTHENTICATION
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    try {
        const user = await db_1.db.user.findUnique({
            where: { email: email.toLowerCase() }
        });
        if (!user || !user.actif) {
            return res.status(401).json({ error: 'Identifiants invalides ou compte inactif' });
        }
        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        const personnel = await db_1.db.personnel.findUnique({
            where: { email: email.toLowerCase() }
        });
        const permissions = personnel?.permissions || user.permissions || null;
        // Exclude password from output
        const { password: _, ...userWithoutPassword } = user;
        userWithoutPassword.permissions = permissions;
        return res.json({ token, user: userWithoutPassword });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});
app.get('/api/auth/me', auth_1.authMiddleware, (req, res) => {
    return res.json({ user: req.user });
});
app.post('/api/auth/register', async (req, res) => {
    const { nom, email, password } = req.body;
    if (!nom || !email || !password) {
        return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    }
    try {
        const newUser = await db_1.db.user.create({
            data: {
                nom,
                email: email.toLowerCase(),
                password: hashPasswordSync(password),
                role: 'admin', // Default role for self-registered users
                actif: true
            }
        });
        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
        const { password: _, ...userWithoutPassword } = newUser;
        return res.status(201).json({ token, user: userWithoutPassword });
    }
    catch (error) {
        console.error('Registration error:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Un compte avec cette adresse email existe déjà.' });
        }
        return res.status(500).json({ error: 'Erreur lors de la création du compte.' });
    }
});
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Jeton Google requis' });
    }
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: "466480529541-49fao7ma01km2sbmaev7b8pp748lfjkn.apps.googleusercontent.com",
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(400).json({ error: 'Jeton Google invalide' });
        }
        const email = payload.email.toLowerCase();
        const nom = payload.name || "Utilisateur Google";
        let user = await db_1.db.user.findUnique({
            where: { email }
        });
        if (!user) {
            // Auto-provision user as admin
            user = await db_1.db.user.create({
                data: {
                    nom,
                    email,
                    password: bcrypt.hashSync(Math.random().toString(36), 10), // Random unguessable password for OAuth-only users
                    role: 'admin',
                    actif: true
                }
            });
        }
        if (!user.actif) {
            return res.status(401).json({ error: 'Ce compte est inactif' });
        }
        const appToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        const personnel = await db_1.db.personnel.findUnique({
            where: { email }
        });
        const permissions = personnel?.permissions || user.permissions || null;
        // Exclude password from output
        const { password: _, ...userWithoutPassword } = user;
        userWithoutPassword.permissions = permissions;
        return res.json({ token: appToken, user: userWithoutPassword });
    }
    catch (error) {
        console.error('Google auth error:', error);
        return res.status(500).json({ error: "Erreur lors de l'authentification avec Google" });
    }
});
// ==========================================
// 2. DASHBOARD MODULE
// ==========================================
app.get('/api/dashboard/stats', auth_1.authMiddleware, async (req, res) => {
    try {
        const totalBiens = await db_1.db.bien.count();
        const activeContractsCount = await db_1.db.contrat.count({ where: { actif: true } });
        const biensLoues = activeContractsCount;
        // Active contracts
        const activeContracts = await db_1.db.contrat.findMany({ where: { actif: true } });
        const totalLoyerAttendu = activeContracts.reduce((sum, c) => sum + c.montantLoyer, 0);
        // Received in June 2026
        const startJune = new Date('2026-06-01T00:00:00Z');
        const endJune = new Date('2026-06-30T23:59:59Z');
        const paymentsJune = await db_1.db.paiement.findMany({
            where: {
                datePaiement: {
                    gte: startJune,
                    lte: endJune
                },
                type: 'loyer'
            }
        });
        const totalLoyerEncaisse = paymentsJune.reduce((sum, p) => sum + p.montant, 0);
        const chantiersEnCours = await db_1.db.chantier.count({ where: { statut: 'en_cours' } });
        // Recharts 12-Month rents
        const months = ['Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26'];
        const monthlyRentsData = months.map((m, idx) => {
            const baseAmount = 1800000;
            const variation = Math.sin(idx) * 200000 + (idx * 50000);
            return {
                name: m,
                montant: Math.round(baseAmount + variation)
            };
        });
        // Bien distribution pie chart
        const countEnTravaux = await db_1.db.bien.count({ where: { statut: 'en_travaux' } });
        const countEnVente = await db_1.db.bien.count({ where: { statut: 'en_vente' } });
        const countDisponible = Math.max(0, totalBiens - biensLoues - countEnTravaux - countEnVente);
        const bienDistribution = [
            { name: 'Loués', value: biensLoues, color: '#2563EB' },
            { name: 'Disponibles', value: countDisponible, color: '#10B981' },
            { name: 'En travaux', value: countEnTravaux, color: '#F59E0B' },
            { name: 'En vente', value: countEnVente, color: '#EF4444' }
        ];
        // Simulated alerts (Erased as requested)
        const alerts = [];
        // Last 5 payments with locataire relations
        const payments = await db_1.db.paiement.findMany({
            orderBy: { datePaiement: 'desc' },
            take: 5,
            include: {
                contrat: {
                    include: {
                        locataire: true
                    }
                }
            }
        });
        const last5Payments = payments.map(p => ({
            id: p.id,
            contratId: p.contratId,
            montant: p.montant,
            datePaiement: p.datePaiement.toISOString().split('T')[0],
            statut: mapPaiementStatutToFe(p.statut),
            type: p.type,
            locataireName: p.contrat?.locataire ? `${p.contrat.locataire.prenom} ${p.contrat.locataire.nom}` : 'N/A'
        }));
        return res.json({
            kpis: {
                totalBiens,
                biensLoues,
                loyerAttendu: totalLoyerAttendu,
                loyerEncaisse: totalLoyerEncaisse,
                chantiersEnCours
            },
            monthlyRentsData,
            bienDistribution,
            alerts,
            last5Payments
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur serveur lors de la récupération des stats' });
    }
});
// ==========================================
// 3. PROPRIÉTAIRES MODULE
// ==========================================
app.get('/api/proprietaires', auth_1.authMiddleware, async (req, res) => {
    const { search, limit = '10', page = '1' } = req.query;
    try {
        const searchStr = search ? String(search).toLowerCase() : '';
        const where = searchStr ? {
            OR: [
                { nom: { contains: searchStr, mode: 'insensitive' } },
                { prenom: { contains: searchStr, mode: 'insensitive' } },
                { email: { contains: searchStr, mode: 'insensitive' } },
                { telephone: { contains: searchStr } }
            ]
        } : {};
        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        const offset = (pageNum - 1) * limitNum;
        const total = await db_1.db.proprietaire.count({ where });
        const list = await db_1.db.proprietaire.findMany({
            where,
            skip: offset,
            take: limitNum,
            include: {
                biens: true,
                documents: {
                    where: { entiteType: 'proprietaire' }
                }
            }
        });
        const results = list.map(p => ({
            id: p.id,
            nom: p.nom,
            prenom: p.prenom,
            email: p.email,
            telephone: p.telephone,
            adresse: p.adresse,
            cinPasseport: p.cinPasseport,
            createdAt: p.createdAt,
            biensCount: p.biens.length,
            documents: p.documents
        }));
        return res.json({ data: results, pagination: { total, page: pageNum, limit: limitNum } });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des propriétaires' });
    }
});
app.post('/api/proprietaires', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent']), async (req, res) => {
    const { nom, prenom, email, telephone, adresse, cinPasseport, bienAdresse, bienVille, bienType, bienSurface, bienLoyer, bienCaution } = req.body;
    if (!nom || !prenom || !email || !telephone) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    try {
        const newProp = await db_1.db.proprietaire.create({
            data: {
                nom,
                prenom,
                email,
                telephone,
                adresse: adresse || '',
                cinPasseport: cinPasseport || '',
                biens: (bienAdresse && bienVille && bienType && bienSurface) ? {
                    create: {
                        adresse: bienAdresse,
                        ville: bienVille,
                        type: bienType,
                        surface: parseFloat(bienSurface),
                        loyer: bienLoyer ? parseFloat(bienLoyer) : undefined,
                        caution: bienCaution ? parseFloat(bienCaution) : undefined,
                        statut: 'disponible',
                        photos: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop']
                    }
                } : undefined
            }
        });
        return res.status(201).json(newProp);
    }
    catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Cet email de propriétaire existe déjà' });
        }
        return res.status(500).json({ error: 'Erreur lors de la création du propriétaire' });
    }
});
// GET COMPTE RENDU DE GERANCE (FACTURE DE RETRAIT DE LOYER)
app.get('/api/proprietaires/:id/compte-rendu', auth_1.authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const owner = await db_1.db.proprietaire.findUnique({
            where: { id }
        });
        if (!owner)
            return res.status(404).json({ error: 'Propriétaire introuvable' });
        // Custom data for Cheikh Ndiaye (demo purposes)
        if (id === 'prop-1') {
            return res.json({
                ownerName: `${owner.prenom} ${owner.nom}`,
                propertyName: "Immeuble I : appartements et magasin",
                propertyLocation: "GOLF",
                date: new Date().toLocaleDateString('fr-FR'),
                lines: [
                    { locataireName: "Mr Soumaila", loyerMensuel: 25000, moisActuel: "janv-26", montantPaye: 25000, reliquat: 0, statut: "En avance" },
                    { locataireName: "Mr Mohamed Mouktar Salem", loyerMensuel: 150000, moisActuel: "janv-26", montantPaye: 125000, reliquat: 25000, statut: "À jour" },
                    { locataireName: "Mr Diarra", loyerMensuel: 150000, moisActuel: "janv-26", montantPaye: 100000, reliquat: 50000, statut: "En retard" }
                ]
            });
        }
        const ownerBiens = await db_1.db.bien.findMany({
            where: { proprietaireId: id }
        });
        const bienIds = ownerBiens.map(b => b.id);
        const activeContracts = await db_1.db.contrat.findMany({
            where: { bienId: { in: bienIds }, actif: true },
            include: { locataire: true, paiements: { orderBy: { datePaiement: 'desc' }, take: 1 } }
        });
        const lines = activeContracts.map(c => {
            const paid = c.paiements[0] ? c.paiements[0].montant : 0;
            const diff = c.montantLoyer - paid;
            return {
                locataireName: c.locataire ? `${c.locataire.prenom} ${c.locataire.nom}` : "Inconnu",
                loyerMensuel: c.montantLoyer,
                moisActuel: "janv-26",
                montantPaye: paid,
                reliquat: diff > 0 ? diff : 0,
                statut: diff === 0 ? "À jour" : diff < 0 ? "En avance" : "En retard"
            };
        });
        return res.json({
            ownerName: `${owner.prenom} ${owner.nom}`,
            propertyName: ownerBiens[0] ? ownerBiens[0].adresse : "Aucun bien actif",
            propertyLocation: ownerBiens[0] ? ownerBiens[0].ville : "N/A",
            date: new Date().toLocaleDateString('fr-FR'),
            lines
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors du calcul du compte rendu' });
    }
});
app.put('/api/proprietaires/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent']), async (req, res) => {
    const { id } = req.params;
    try {
        const updated = await db_1.db.proprietaire.update({
            where: { id },
            data: req.body
        });
        return res.json(updated);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la modification du propriétaire' });
    }
});
app.delete('/api/proprietaires/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.db.proprietaire.delete({ where: { id } });
        return res.json({ message: 'Propriétaire supprimé avec succès' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du propriétaire' });
    }
});
// GET LANDLORD WITHDRAWALS
app.get('/api/proprietaires/:id/retraits', auth_1.authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const retraits = await db_1.db.retrait.findMany({
            where: { proprietaireId: id },
            orderBy: { dateRetrait: 'desc' }
        });
        const mapped = retraits.map(r => ({
            id: r.id,
            amount: r.montant,
            date: r.dateRetrait.toISOString().split('T')[0],
            motif: r.motif,
            proprietaireId: r.proprietaireId
        }));
        return res.json(mapped);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des retraits' });
    }
});
// CREATE LANDLORD WITHDRAWAL
app.post('/api/proprietaires/:id/retraits', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent', 'comptable']), async (req, res) => {
    const { id } = req.params;
    const { amount, date, motif } = req.body;
    if (amount === undefined || !date || !motif) {
        return res.status(400).json({ error: 'Champs obligatoires manquants (amount, date, motif)' });
    }
    try {
        const newRetrait = await db_1.db.retrait.create({
            data: {
                montant: parseFloat(amount),
                dateRetrait: new Date(date),
                motif,
                proprietaireId: id
            }
        });
        return res.status(201).json({
            id: newRetrait.id,
            amount: newRetrait.montant,
            date: newRetrait.dateRetrait.toISOString().split('T')[0],
            motif: newRetrait.motif,
            proprietaireId: newRetrait.proprietaireId
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de l\'enregistrement du retrait' });
    }
});
// DELETE ALL LANDLORD WITHDRAWALS
app.delete('/api/proprietaires/:ownerId/retraits/all', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent', 'comptable']), async (req, res) => {
    const { ownerId } = req.params;
    try {
        await db_1.db.retrait.deleteMany({ where: { proprietaireId: ownerId } });
        return res.json({ message: 'Tous les retraits ont été supprimés avec succès' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de tous les retraits' });
    }
});
// DELETE LANDLORD WITHDRAWAL
app.delete('/api/proprietaires/:ownerId/retraits/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent', 'comptable']), async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.db.retrait.delete({ where: { id } });
        return res.json({ message: 'Retrait supprimé avec succès' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du retrait' });
    }
});
// ==========================================
// 4. LOCATAIRES MODULE
// ==========================================
app.get('/api/locataires', auth_1.authMiddleware, async (req, res) => {
    const { search, limit = '10', page = '1' } = req.query;
    try {
        const searchStr = search ? String(search).toLowerCase() : '';
        const where = searchStr ? {
            OR: [
                { nom: { contains: searchStr, mode: 'insensitive' } },
                { prenom: { contains: searchStr, mode: 'insensitive' } },
                { email: { contains: searchStr, mode: 'insensitive' } }
            ]
        } : {};
        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        const offset = (pageNum - 1) * limitNum;
        const total = await db_1.db.locataire.count({ where });
        const list = await db_1.db.locataire.findMany({
            where,
            skip: offset,
            take: limitNum,
            include: {
                contrats: {
                    where: { actif: true },
                    include: { bien: true }
                },
                documents: {
                    where: { entiteType: 'locataire' }
                }
            }
        });
        const results = list.map(l => {
            const activeContract = l.contrats[0];
            return {
                id: l.id,
                nom: l.nom,
                prenom: l.prenom,
                email: l.email,
                telephone: l.telephone,
                employeur: l.employeur,
                garant: l.garant,
                statut: l.statut,
                createdAt: l.createdAt,
                bienAdresse: activeContract ? activeContract.bien.adresse : 'Aucun bien actif',
                bienId: activeContract ? activeContract.bien.id : undefined,
                contratId: activeContract ? activeContract.id : undefined,
                loyer: activeContract ? activeContract.montantLoyer : undefined,
                caution: activeContract ? activeContract.depot : undefined,
                dateDebut: activeContract ? activeContract.dateDebut.toISOString().split('T')[0] : undefined,
                documents: l.documents
            };
        });
        return res.json({ data: results, pagination: { total, page: pageNum, limit: limitNum } });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des locataires' });
    }
});
app.post('/api/locataires', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent']), async (req, res) => {
    const { nom, prenom, email, telephone, employeur, garant, statut, bienId, loyer, caution, dateDebut } = req.body;
    if (!nom || !prenom || !email || !telephone) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    try {
        const newLoc = await db_1.db.locataire.create({
            data: {
                nom,
                prenom,
                email,
                telephone,
                employeur: employeur || '',
                garant: garant || '',
                statut: statut || 'liste_attente'
            }
        });
        if (bienId) {
            const bien = await db_1.db.bien.findUnique({ where: { id: bienId } });
            if (bien) {
                const finalLoyer = loyer !== undefined ? parseFloat(loyer) : (bien.loyer || 0);
                const finalCaution = caution !== undefined ? parseFloat(caution) : (bien.caution || 0);
                const finalDateDebut = dateDebut ? new Date(dateDebut) : new Date();
                const finalDateFin = new Date(new Date(finalDateDebut).setFullYear(finalDateDebut.getFullYear() + 1));
                await db_1.db.contrat.create({
                    data: {
                        bienId,
                        locataireId: newLoc.id,
                        dateDebut: finalDateDebut,
                        dateFin: finalDateFin,
                        montantLoyer: finalLoyer,
                        depot: finalCaution,
                        actif: true
                    }
                });
                await db_1.db.bien.update({
                    where: { id: bienId },
                    data: { statut: 'loue' }
                });
            }
        }
        return res.status(201).json(newLoc);
    }
    catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Cet email de locataire existe déjà' });
        }
        return res.status(500).json({ error: 'Erreur lors de la création du locataire' });
    }
});
app.put('/api/locataires/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent']), async (req, res) => {
    const { id } = req.params;
    const { nom, prenom, email, telephone, employeur, garant, statut, bienId, loyer, caution, dateDebut } = req.body;
    try {
        const updatedLoc = await db_1.db.locataire.update({
            where: { id },
            data: {
                nom,
                prenom,
                email,
                telephone,
                employeur: employeur || '',
                garant: garant || '',
                statut: statut || 'liste_attente'
            }
        });
        const activeContract = await db_1.db.contrat.findFirst({
            where: { locataireId: id, actif: true }
        });
        const finalLoyer = loyer !== undefined ? parseFloat(loyer) : undefined;
        const finalCaution = caution !== undefined ? parseFloat(caution) : undefined;
        const finalDateDebut = dateDebut ? new Date(dateDebut) : undefined;
        if (bienId) {
            if (activeContract) {
                if (activeContract.bienId !== bienId) {
                    await db_1.db.contrat.update({
                        where: { id: activeContract.id },
                        data: { actif: false }
                    });
                    await db_1.db.bien.update({
                        where: { id: activeContract.bienId },
                        data: { statut: 'disponible' }
                    });
                    const newBien = await db_1.db.bien.findUnique({ where: { id: bienId } });
                    const rentVal = finalLoyer !== undefined ? finalLoyer : (newBien?.loyer || 0);
                    const cautionVal = finalCaution !== undefined ? finalCaution : (newBien?.caution || 0);
                    const startVal = finalDateDebut !== undefined ? finalDateDebut : new Date();
                    const endVal = new Date(new Date(startVal).setFullYear(startVal.getFullYear() + 1));
                    await db_1.db.contrat.create({
                        data: {
                            bienId,
                            locataireId: id,
                            dateDebut: startVal,
                            dateFin: endVal,
                            montantLoyer: rentVal,
                            depot: cautionVal,
                            actif: true
                        }
                    });
                    await db_1.db.bien.update({
                        where: { id: bienId },
                        data: { statut: 'loue' }
                    });
                }
                else {
                    const dataToUpdate = {};
                    if (finalLoyer !== undefined)
                        dataToUpdate.montantLoyer = finalLoyer;
                    if (finalCaution !== undefined)
                        dataToUpdate.depot = finalCaution;
                    if (finalDateDebut !== undefined) {
                        dataToUpdate.dateDebut = finalDateDebut;
                        dataToUpdate.dateFin = new Date(new Date(finalDateDebut).setFullYear(finalDateDebut.getFullYear() + 1));
                    }
                    await db_1.db.contrat.update({
                        where: { id: activeContract.id },
                        data: dataToUpdate
                    });
                }
            }
            else {
                const newBien = await db_1.db.bien.findUnique({ where: { id: bienId } });
                const rentVal = finalLoyer !== undefined ? finalLoyer : (newBien?.loyer || 0);
                const cautionVal = finalCaution !== undefined ? finalCaution : (newBien?.caution || 0);
                const startVal = finalDateDebut !== undefined ? finalDateDebut : new Date();
                const endVal = new Date(new Date(startVal).setFullYear(startVal.getFullYear() + 1));
                await db_1.db.contrat.create({
                    data: {
                        bienId,
                        locataireId: id,
                        dateDebut: startVal,
                        dateFin: endVal,
                        montantLoyer: rentVal,
                        depot: cautionVal,
                        actif: true
                    }
                });
                await db_1.db.bien.update({
                    where: { id: bienId },
                    data: { statut: 'loue' }
                });
            }
        }
        else {
            if (activeContract) {
                await db_1.db.contrat.update({
                    where: { id: activeContract.id },
                    data: { actif: false }
                });
                await db_1.db.bien.update({
                    where: { id: activeContract.bienId },
                    data: { statut: 'disponible' }
                });
            }
        }
        return res.json(updatedLoc);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la modification du locataire' });
    }
});
app.delete('/api/locataires/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const activeContract = await db_1.db.contrat.findFirst({
            where: { locataireId: id, actif: true }
        });
        if (activeContract) {
            await db_1.db.bien.update({
                where: { id: activeContract.bienId },
                data: { statut: 'disponible' }
            });
        }
        await db_1.db.locataire.delete({ where: { id } });
        return res.json({ message: 'Locataire supprimé avec succès' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du locataire' });
    }
});
app.get('/api/contrats', auth_1.authMiddleware, async (req, res) => {
    try {
        const list = await db_1.db.contrat.findMany({
            include: {
                locataire: true,
                bien: true
            }
        });
        const formatted = list.map(c => ({
            id: c.id,
            label: `Bail ${c.bien.adresse} - ${c.locataire.prenom} ${c.locataire.nom}`,
            montantLoyer: c.montantLoyer,
            depot: c.depot,
            actif: c.actif
        }));
        return res.json(formatted);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des contrats' });
    }
});
// ==========================================
// 5. BIENS IMMOBILIERS MODULE
// ==========================================
app.get('/api/biens', auth_1.authMiddleware, async (req, res) => {
    const { type, statut, ville, proprietaireId } = req.query;
    try {
        const where = {};
        if (type)
            where.type = type;
        if (statut)
            where.statut = mapBienStatutToDb(statut);
        if (ville)
            where.ville = { equals: String(ville), mode: 'insensitive' };
        if (proprietaireId)
            where.proprietaireId = String(proprietaireId);
        const list = await db_1.db.bien.findMany({
            where,
            include: {
                proprietaire: true,
                contrats: { where: { actif: true } }
            }
        });
        const results = list.map(b => {
            let currentStatut = b.statut;
            if (currentStatut === 'loue' && b.contrats.length === 0) {
                currentStatut = 'disponible';
                db_1.db.bien.update({
                    where: { id: b.id },
                    data: { statut: 'disponible' }
                }).catch(err => console.error(`Error auto-correcting status of bien ${b.id}:`, err));
            }
            return {
                id: b.id,
                adresse: b.adresse,
                ville: b.ville,
                type: b.type,
                surface: b.surface,
                etage: b.etage,
                nbPieces: b.nbPieces,
                statut: mapBienStatutToFe(currentStatut),
                proprietaireId: b.proprietaireId,
                loyer: b.loyer || 0,
                caution: b.caution || 0,
                photos: b.photos,
                charges: b.charges,
                createdAt: b.createdAt,
                proprietaireName: b.proprietaire ? `${b.proprietaire.prenom} ${b.proprietaire.nom}` : 'Inconnu'
            };
        });
        return res.json(results);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des biens' });
    }
});
app.post('/api/biens', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent']), async (req, res) => {
    const { adresse, ville, type, surface, etage, nbPieces, statut, proprietaireId, charges, loyer, caution } = req.body;
    if (!adresse || !ville || !type || !surface || !proprietaireId) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    try {
        const newBien = await db_1.db.bien.create({
            data: {
                adresse,
                ville,
                type: type,
                surface: parseFloat(surface),
                etage: etage ? parseInt(etage) : undefined,
                nbPieces: nbPieces ? parseInt(nbPieces) : undefined,
                loyer: loyer ? parseFloat(loyer) : undefined,
                caution: caution ? parseFloat(caution) : undefined,
                statut: mapBienStatutToDb(statut) || 'disponible',
                proprietaireId,
                photos: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop'],
                charges: charges || []
            }
        });
        return res.status(201).json(newBien);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la création du bien' });
    }
});
app.put('/api/biens/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent']), async (req, res) => {
    const { id } = req.params;
    try {
        const dataToUpdate = { ...req.body };
        if (dataToUpdate.statut) {
            dataToUpdate.statut = mapBienStatutToDb(dataToUpdate.statut);
        }
        const updated = await db_1.db.bien.update({
            where: { id },
            data: {
                ...dataToUpdate,
                surface: dataToUpdate.surface ? parseFloat(dataToUpdate.surface) : undefined,
                etage: dataToUpdate.etage ? parseInt(dataToUpdate.etage) : undefined,
                nbPieces: dataToUpdate.nbPieces ? parseInt(dataToUpdate.nbPieces) : undefined,
                loyer: dataToUpdate.loyer ? parseFloat(dataToUpdate.loyer) : undefined,
                caution: dataToUpdate.caution ? parseFloat(dataToUpdate.caution) : undefined
            }
        });
        return res.json(updated);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la modification du bien' });
    }
});
app.delete('/api/biens/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.db.bien.delete({ where: { id } });
        return res.json({ message: 'Bien supprimé avec succès' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du bien' });
    }
});
// ==========================================
// 6. CONSTRUCTION MODULE
// ==========================================
app.get('/api/chantiers', auth_1.authMiddleware, async (req, res) => {
    try {
        const list = await db_1.db.chantier.findMany({
            include: { bien: true }
        });
        const results = list.map(c => ({
            id: c.id,
            bienId: c.bienId,
            titre: c.titre,
            budget: c.budget,
            avancement: c.avancement,
            statut: mapChantierStatutToFe(c.statut),
            dateDebut: c.dateDebut.toISOString().split('T')[0],
            dateFin: c.dateFin.toISOString().split('T')[0],
            prestataires: c.prestataires,
            createdAt: c.createdAt,
            bienAdresse: c.bien ? c.bien.adresse : 'Inconnu'
        }));
        return res.json(results);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des chantiers' });
    }
});
app.post('/api/chantiers', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent']), async (req, res) => {
    const { bienId, titre, budget, statut, dateDebut, dateFin, prestataires } = req.body;
    if (!bienId || !titre || !budget || !dateDebut || !dateFin) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    try {
        const newChantier = await db_1.db.chantier.create({
            data: {
                bienId,
                titre,
                budget: parseFloat(budget),
                avancement: 0,
                statut: mapChantierStatutToDb(statut) || 'planifie',
                dateDebut: new Date(dateDebut),
                dateFin: new Date(dateFin),
                prestataires: prestataires || []
            }
        });
        return res.status(201).json(newChantier);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la création du chantier' });
    }
});
app.put('/api/chantiers/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent']), async (req, res) => {
    const { id } = req.params;
    try {
        const dataToUpdate = { ...req.body };
        if (dataToUpdate.statut) {
            dataToUpdate.statut = mapChantierStatutToDb(dataToUpdate.statut);
        }
        const updated = await db_1.db.chantier.update({
            where: { id },
            data: {
                ...dataToUpdate,
                budget: dataToUpdate.budget ? parseFloat(dataToUpdate.budget) : undefined,
                avancement: dataToUpdate.avancement ? parseFloat(dataToUpdate.avancement) : undefined,
                dateDebut: dataToUpdate.dateDebut ? new Date(dataToUpdate.dateDebut) : undefined,
                dateFin: dataToUpdate.dateFin ? new Date(dataToUpdate.dateFin) : undefined
            }
        });
        return res.json(updated);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la modification du chantier' });
    }
});
app.delete('/api/chantiers/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.db.chantier.delete({ where: { id } });
        return res.json({ message: 'Chantier supprimé avec succès' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du chantier' });
    }
});
// ==========================================
// 7. COMPTABILITÉ MODULE
// ==========================================
app.get('/api/compta/transactions', auth_1.authMiddleware, async (req, res) => {
    try {
        // Unified ledger list (for backward compatibility / general log)
        const payments = await db_1.db.paiement.findMany({
            include: {
                contrat: {
                    include: {
                        locataire: true,
                        bien: true
                    }
                }
            }
        });
        const incomes = payments.map(p => {
            const locataire = p.contrat?.locataire;
            const bien = p.contrat?.bien;
            return {
                id: p.id,
                type: 'encaissement',
                categorie: p.type === 'loyer' ? 'Loyer' : p.type === 'caution' ? 'Caution' : 'Charges',
                montant: p.montant,
                date: p.datePaiement.toISOString().split('T')[0],
                libelle: `Paiement ${p.type} - ${locataire ? locataire.nom : ''} (${bien ? bien.adresse : ''})`
            };
        });
        const expenses = await db_1.db.depense.findMany();
        const expTrans = expenses.map(e => ({
            id: e.id,
            type: 'décaissement',
            categorie: e.categorie,
            montant: e.montant,
            date: e.date.toISOString().split('T')[0],
            libelle: e.description
        }));
        const allTransactions = [...incomes, ...expTrans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return res.json(allTransactions);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des transactions' });
    }
});
app.post('/api/compta/transactions', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'comptable']), async (req, res) => {
    const { contratId, montant, datePaiement, statut, type } = req.body;
    if (!contratId || !montant || !datePaiement) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    try {
        const newPaiement = await db_1.db.paiement.create({
            data: {
                contratId,
                montant: parseFloat(montant),
                datePaiement: new Date(datePaiement),
                statut: mapPaiementStatutToDb(statut) || 'paye',
                type: type || 'loyer'
            }
        });
        return res.status(201).json(newPaiement);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la création de la transaction' });
    }
});
// Tableau des loyers du mois
app.get('/api/compta/rent-roll', auth_1.authMiddleware, async (req, res) => {
    try {
        const activeContracts = await db_1.db.contrat.findMany({
            where: { actif: true },
            include: {
                locataire: true,
                bien: true,
                paiements: {
                    where: {
                        datePaiement: {
                            gte: new Date('2026-06-01T00:00:00Z'),
                            lte: new Date('2026-06-30T23:59:59Z')
                        },
                        type: 'loyer'
                    }
                }
            }
        });
        const results = activeContracts.map(c => {
            const payment = c.paiements[0];
            return {
                contratId: c.id,
                bienAdresse: c.bien ? c.bien.adresse : 'Inconnu',
                locataireName: c.locataire ? `${c.locataire.prenom} ${c.locataire.nom}` : 'Inconnu',
                montantAttendu: c.montantLoyer,
                montantRecu: payment ? payment.montant : 0,
                statut: mapPaiementStatutToFe(payment ? payment.statut : 'en_retard'),
                paymentId: payment ? payment.id : null
            };
        });
        return res.json(results);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la génération du Rent Roll' });
    }
});
// Balance par bien
app.get('/api/compta/balance', auth_1.authMiddleware, async (req, res) => {
    try {
        const biens = await db_1.db.bien.findMany({
            include: {
                contrats: {
                    include: {
                        paiements: true
                    }
                },
                chantiers: true
            }
        });
        const results = biens.map(b => {
            let totalReceived = 0;
            b.contrats.forEach(c => {
                c.paiements.forEach(p => {
                    totalReceived += p.montant;
                });
            });
            const totalExpenses = b.chantiers.reduce((sum, c) => sum + c.budget, 0);
            return {
                bienId: b.id,
                adresse: b.adresse,
                revenus: totalReceived,
                depenses: totalExpenses,
                solde: totalReceived - totalExpenses
            };
        });
        return res.json(results);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors du calcul de la balance' });
    }
});
// Chart data: Revenus vs Charges over 12 months (Re-written for real calculations)
app.get('/api/compta/charts', auth_1.authMiddleware, async (req, res) => {
    try {
        const rentPayments = await db_1.db.paiement.findMany({
            where: { type: 'loyer', statut: 'paye' },
            include: { contrat: { include: { bien: { include: { proprietaire: true } } } } }
        });
        const sales = await db_1.db.vente.findMany();
        const manualRevs = await db_1.db.revenuManuel.findMany();
        const expenses = await db_1.db.depense.findMany();
        const months = ['Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26'];
        const data = months.map((m, idx) => {
            let year = 2025;
            if (m.endsWith('26'))
                year = 2026;
            const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mPart = m.split(' ')[0];
            const monthIdx = monthAbbrs.indexOf(mPart);
            const startOfMonth = new Date(year, monthIdx, 1);
            const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
            const rentInMonth = rentPayments.filter(p => p.datePaiement >= startOfMonth && p.datePaiement <= endOfMonth)
                .reduce((sum, p) => sum + p.montant * ((p.contrat.bien.proprietaire.fraisRate || 10.0) / 100), 0);
            const salesInMonth = sales.filter(s => s.dateVente >= startOfMonth && s.dateVente <= endOfMonth)
                .reduce((sum, s) => sum + s.prixVente * ((s.commissionRate || 5.0) / 100), 0);
            const manualInMonth = manualRevs.filter(r => r.date >= startOfMonth && r.date <= endOfMonth)
                .reduce((sum, r) => sum + r.montant, 0);
            const expensesInMonth = expenses.filter(d => d.date >= startOfMonth && d.date <= endOfMonth)
                .reduce((sum, d) => sum + d.montant, 0);
            return {
                name: m,
                revenus: Math.round(rentInMonth + salesInMonth + manualInMonth),
                charges: Math.round(expensesInMonth)
            };
        });
        return res.json(data);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors du calcul des rapports mensuels' });
    }
});
// GET compta dashboard
app.get('/api/compta/dashboard', auth_1.authMiddleware, async (req, res) => {
    try {
        const rentPayments = await db_1.db.paiement.findMany({
            where: { type: 'loyer', statut: 'paye' },
            include: { contrat: { include: { bien: { include: { proprietaire: true } } } } }
        });
        const totalRentComm = rentPayments.reduce((sum, p) => sum + p.montant * ((p.contrat.bien.proprietaire.fraisRate || 10.0) / 100), 0);
        const sales = await db_1.db.vente.findMany();
        const totalSalesComm = sales.reduce((sum, s) => sum + s.prixVente * ((s.commissionRate || 5.0) / 100), 0);
        const manualRevs = await db_1.db.revenuManuel.findMany();
        const totalManual = manualRevs.reduce((sum, r) => sum + r.montant, 0);
        const totalCommissions = totalRentComm + totalSalesComm + totalManual;
        const expenses = await db_1.db.depense.findMany();
        const totalExpenses = expenses.reduce((sum, d) => sum + d.montant, 0);
        const netProfit = totalCommissions - totalExpenses;
        const treasuryBalance = netProfit;
        // Last 12 months double area chart
        const months = ['Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26'];
        const chartData = months.map((m, idx) => {
            let year = 2025;
            if (m.endsWith('26'))
                year = 2026;
            const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mPart = m.split(' ')[0];
            const monthIdx = monthAbbrs.indexOf(mPart);
            const startOfMonth = new Date(year, monthIdx, 1);
            const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
            const rentInMonth = rentPayments.filter(p => p.datePaiement >= startOfMonth && p.datePaiement <= endOfMonth)
                .reduce((sum, p) => sum + p.montant * ((p.contrat.bien.proprietaire.fraisRate || 10.0) / 100), 0);
            const salesInMonth = sales.filter(s => s.dateVente >= startOfMonth && s.dateVente <= endOfMonth)
                .reduce((sum, s) => sum + s.prixVente * ((s.commissionRate || 5.0) / 100), 0);
            const manualInMonth = manualRevs.filter(r => r.date >= startOfMonth && r.date <= endOfMonth)
                .reduce((sum, r) => sum + r.montant, 0);
            const expensesInMonth = expenses.filter(d => d.date >= startOfMonth && d.date <= endOfMonth)
                .reduce((sum, d) => sum + d.montant, 0);
            return {
                name: m,
                revenus: Math.round(rentInMonth + salesInMonth + manualInMonth),
                charges: Math.round(expensesInMonth)
            };
        });
        return res.json({
            kpis: {
                totalCommissions,
                totalExpenses,
                netProfit,
                treasuryBalance
            },
            chartData
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors du calcul des KPIs du tableau de bord' });
    }
});
// GET and POST revenues
app.get('/api/compta/revenus', auth_1.authMiddleware, async (req, res) => {
    try {
        const payments = await db_1.db.paiement.findMany({
            where: { type: 'loyer', statut: 'paye' },
            include: { contrat: { include: { locataire: true, bien: { include: { proprietaire: true } } } } }
        });
        const rentCommissions = payments.map(p => {
            const rate = p.contrat.bien.proprietaire.fraisRate || 10.0;
            return {
                id: p.id,
                date: p.datePaiement.toISOString().split('T')[0],
                reference: `COMM-LOC-${p.id.substring(0, 8).toUpperCase()}`,
                client: `${p.contrat.locataire.prenom} ${p.contrat.locataire.nom}`,
                bienAdresse: p.contrat.bien.adresse,
                type: 'commission_location',
                montant: p.montant * (rate / 100),
                montantBrut: p.montant,
                details: `Commission loyer (${rate}%)`
            };
        });
        const sales = await db_1.db.vente.findMany({
            include: { bien: true }
        });
        const saleCommissions = sales.map(s => {
            const rate = s.commissionRate || 5.0;
            return {
                id: s.id,
                date: s.dateVente.toISOString().split('T')[0],
                reference: `COMM-VTE-${s.id.substring(0, 8).toUpperCase()}`,
                client: s.clientNom,
                bienAdresse: s.bien.adresse,
                type: 'commission_vente',
                montant: s.prixVente * (rate / 100),
                montantBrut: s.prixVente,
                details: `Commission vente (${rate}%)`
            };
        });
        const manualRevs = await db_1.db.revenuManuel.findMany();
        const manualList = manualRevs.map(r => ({
            id: r.id,
            date: r.date.toISOString().split('T')[0],
            reference: `REV-MAN-${r.id.substring(0, 8).toUpperCase()}`,
            client: r.clientNom || 'N/A',
            bienAdresse: 'N/A',
            type: r.type,
            montant: r.montant,
            montantBrut: r.montant,
            details: r.description
        }));
        const allRevenues = [...rentCommissions, ...saleCommissions, ...manualList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return res.json(allRevenues);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des revenus' });
    }
});
app.post('/api/compta/revenus', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'comptable']), async (req, res) => {
    const { type, description, montant, date, clientNom } = req.body;
    if (!type || !description || !montant || !date) {
        return res.status(400).json({ error: 'Champs obligatoires manquants (type, description, montant, date)' });
    }
    try {
        const newRev = await db_1.db.revenuManuel.create({
            data: {
                type,
                description,
                montant: parseFloat(montant),
                date: new Date(date),
                clientNom: clientNom || null
            }
        });
        return res.status(201).json(newRev);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la création du revenu manuel' });
    }
});
app.delete('/api/compta/revenus/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'comptable']), async (req, res) => {
    const { id } = req.params;
    try {
        const manual = await db_1.db.revenuManuel.findUnique({ where: { id } });
        if (manual) {
            await db_1.db.revenuManuel.delete({ where: { id } });
            return res.json({ message: 'Revenu manuel supprimé avec succès' });
        }
        const payment = await db_1.db.paiement.findUnique({ where: { id } });
        if (payment) {
            await db_1.db.paiement.delete({ where: { id } });
            return res.json({ message: 'Paiement supprimé avec succès' });
        }
        const sale = await db_1.db.vente.findUnique({ where: { id } });
        if (sale) {
            await db_1.db.vente.delete({ where: { id } });
            return res.json({ message: 'Vente supprimée avec succès' });
        }
        return res.status(404).json({ error: 'Revenu introuvable' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});
// GET, POST and DELETE depenses
app.get('/api/compta/depenses', auth_1.authMiddleware, async (req, res) => {
    try {
        const list = await db_1.db.depense.findMany({
            orderBy: { date: 'desc' }
        });
        return res.json(list);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des dépenses' });
    }
});
app.post('/api/compta/depenses', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'comptable']), async (req, res) => {
    const { categorie, description, montant, date, enregistrePar } = req.body;
    if (!categorie || !description || !montant || !date) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    try {
        const newDep = await db_1.db.depense.create({
            data: {
                categorie,
                description,
                montant: parseFloat(montant),
                date: new Date(date),
                enregistrePar: enregistrePar || req.user?.nom || 'Admin'
            }
        });
        return res.status(201).json(newDep);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la création de la dépense' });
    }
});
app.delete('/api/compta/depenses/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'comptable']), async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.db.depense.delete({ where: { id } });
        return res.json({ message: 'Dépense supprimée avec succès' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de la dépense' });
    }
});
// GET commissions details
app.get('/api/compta/commissions', auth_1.authMiddleware, async (req, res) => {
    try {
        const rentPayments = await db_1.db.paiement.findMany({
            where: { type: 'loyer' },
            include: { contrat: { include: { locataire: true, bien: { include: { proprietaire: true } } } } }
        });
        const commissionsLocation = rentPayments.map(p => {
            const rate = p.contrat.bien.proprietaire.fraisRate || 10.0;
            return {
                id: p.id,
                locataire: `${p.contrat.locataire.prenom} ${p.contrat.locataire.nom}`,
                bien: p.contrat.bien.adresse,
                totalPaye: p.montant,
                commission: p.montant * (rate / 100),
                statut: mapPaiementStatutToFe(p.statut),
                date: p.datePaiement.toISOString().split('T')[0]
            };
        });
        const sales = await db_1.db.vente.findMany({
            include: { bien: true, agent: true }
        });
        const commissionsVente = sales.map(s => {
            const rate = s.commissionRate || 5.0;
            return {
                id: s.id,
                client: s.clientNom,
                bien: s.bien.adresse,
                prixVente: s.prixVente,
                commission: s.prixVente * (rate / 100),
                agent: s.agent ? s.agent.nom : 'N/A',
                date: s.dateVente.toISOString().split('T')[0]
            };
        });
        const agents = await db_1.db.personnel.findMany({
            include: {
                ventes: true,
                biensAssignes: {
                    include: {
                        contrats: {
                            include: {
                                paiements: {
                                    where: { type: 'loyer', statut: 'paye' }
                                }
                            }
                        }
                    }
                }
            }
        });
        const commissionsAgent = agents.map(agent => {
            const totalVentes = agent.ventes.length;
            const commissionVente = agent.ventes.reduce((sum, s) => sum + s.prixVente * ((s.commissionRate || 5.0) / 100), 0);
            let totalLocationCommissions = 0;
            agent.biensAssignes.forEach(b => {
                b.contrats.forEach(c => {
                    c.paiements.forEach(p => {
                        totalLocationCommissions += p.montant * 0.10; // Default 10%
                    });
                });
            });
            return {
                agentName: agent.nom,
                poste: agent.poste,
                totalVentes,
                commissionVente,
                totalLocationCommissions,
                totalCommissions: commissionVente + totalLocationCommissions
            };
        });
        const totalPaidRentComm = rentPayments.filter(p => p.statut === 'paye')
            .reduce((sum, p) => sum + p.montant * ((p.contrat.bien.proprietaire.fraisRate || 10.0) / 100), 0);
        const totalPendingRentComm = rentPayments.filter(p => p.statut !== 'paye')
            .reduce((sum, p) => sum + p.montant * ((p.contrat.bien.proprietaire.fraisRate || 10.0) / 100), 0);
        const totalPaidSalesComm = sales.reduce((sum, s) => sum + s.prixVente * ((s.commissionRate || 5.0) / 100), 0);
        const manualRevs = await db_1.db.revenuManuel.findMany();
        const totalManual = manualRevs.reduce((sum, r) => sum + r.montant, 0);
        return res.json({
            commissionsLocation,
            commissionsVente,
            commissionsAgent,
            stats: {
                totalPaid: totalPaidRentComm + totalPaidSalesComm + totalManual,
                totalPending: totalPendingRentComm
            }
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors du calcul des commissions' });
    }
});
// GET cash flow tresorerie
app.get('/api/compta/tresorerie', auth_1.authMiddleware, async (req, res) => {
    try {
        const rentPayments = await db_1.db.paiement.findMany({
            where: { type: 'loyer', statut: 'paye' },
            include: { contrat: { include: { bien: { include: { proprietaire: true } } } } }
        });
        const sales = await db_1.db.vente.findMany();
        const manualRevs = await db_1.db.revenuManuel.findMany();
        const expenses = await db_1.db.depense.findMany();
        const totalRentComm = rentPayments.reduce((sum, p) => sum + p.montant * ((p.contrat.bien.proprietaire.fraisRate || 10.0) / 100), 0);
        const totalSalesComm = sales.reduce((sum, s) => sum + s.prixVente * ((s.commissionRate || 5.0) / 100), 0);
        const totalManual = manualRevs.reduce((sum, r) => sum + r.montant, 0);
        const totalEntries = totalRentComm + totalSalesComm + totalManual;
        const totalExp = expenses.reduce((sum, d) => sum + d.montant, 0);
        const soldeActuel = totalEntries - totalExp;
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear() + 1, 0, 0, 23, 59, 59, 999);
        const todayRents = rentPayments.filter(p => p.datePaiement >= startOfToday && p.datePaiement <= endOfToday)
            .reduce((sum, p) => sum + p.montant * ((p.contrat.bien.proprietaire.fraisRate || 10.0) / 100), 0);
        const todaySales = sales.filter(s => s.dateVente >= startOfToday && s.dateVente <= endOfToday)
            .reduce((sum, s) => sum + s.prixVente * ((s.commissionRate || 5.0) / 100), 0);
        const todayManual = manualRevs.filter(r => r.date >= startOfToday && r.date <= endOfToday)
            .reduce((sum, r) => sum + r.montant, 0);
        const entréesJour = todayRents + todaySales + todayManual;
        const dépensesJour = expenses.filter(d => d.date >= startOfToday && d.date <= endOfToday)
            .reduce((sum, d) => sum + d.montant, 0);
        const monthlyRents = rentPayments.filter(p => p.datePaiement >= startOfMonth && p.datePaiement <= endOfMonth)
            .reduce((sum, p) => sum + p.montant * ((p.contrat.bien.proprietaire.fraisRate || 10.0) / 100), 0);
        const monthlySales = sales.filter(s => s.dateVente >= startOfMonth && s.dateVente <= endOfMonth)
            .reduce((sum, s) => sum + s.prixVente * ((s.commissionRate || 5.0) / 100), 0);
        const monthlyManual = manualRevs.filter(r => r.date >= startOfMonth && r.date <= endOfMonth)
            .reduce((sum, r) => sum + r.montant, 0);
        const monthlyEntries = monthlyRents + monthlySales + monthlyManual;
        const monthlyExpenses = expenses.filter(d => d.date >= startOfMonth && d.date <= endOfMonth)
            .reduce((sum, d) => sum + d.montant, 0);
        const soldeMensuel = monthlyEntries - monthlyExpenses;
        const annualRents = rentPayments.filter(p => p.datePaiement >= startOfYear && p.datePaiement <= endOfYear)
            .reduce((sum, p) => sum + p.montant * ((p.contrat.bien.proprietaire.fraisRate || 10.0) / 100), 0);
        const annualSales = sales.filter(s => s.dateVente >= startOfYear && s.dateVente <= endOfYear)
            .reduce((sum, s) => sum + s.prixVente * ((s.commissionRate || 5.0) / 100), 0);
        const annualManual = manualRevs.filter(r => r.date >= startOfYear && r.date <= endOfYear)
            .reduce((sum, r) => sum + r.montant, 0);
        const annualEntries = annualRents + annualSales + annualManual;
        const annualExpenses = expenses.filter(d => d.date >= startOfYear && d.date <= endOfYear)
            .reduce((sum, d) => sum + d.montant, 0);
        const soldeAnnuel = annualEntries - annualExpenses;
        return res.json({
            soldeActuel,
            entréesJour,
            dépensesJour,
            soldeMensuel,
            soldeAnnuel
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors du calcul de la trésorerie' });
    }
});
// GET debts, late payments and owner balance due
app.get('/api/compta/creances', auth_1.authMiddleware, async (req, res) => {
    try {
        const activeContracts = await db_1.db.contrat.findMany({
            where: { actif: true },
            include: {
                locataire: true,
                bien: { include: { proprietaire: true } },
                paiements: { orderBy: { datePaiement: 'desc' } }
            }
        });
        const currentMonthStart = new Date('2026-06-01T00:00:00Z');
        const currentMonthEnd = new Date('2026-06-30T23:59:59Z');
        const loyersImpayes = activeContracts.map(c => {
            const paymentsInMonth = c.paiements.filter(p => p.datePaiement >= currentMonthStart && p.datePaiement <= currentMonthEnd && p.type === 'loyer');
            const paidThisMonth = paymentsInMonth.reduce((sum, p) => sum + p.montant, 0);
            const diff = c.montantLoyer - paidThisMonth;
            return {
                contratId: c.id,
                locataire: `${c.locataire.prenom} ${c.locataire.nom}`,
                bien: c.bien.adresse,
                loyerMensuel: c.montantLoyer,
                paye: paidThisMonth,
                reliquat: diff > 0 ? diff : 0,
                statut: diff <= 0 ? 'À jour' : paidThisMonth > 0 ? 'Partiel' : 'Impayé'
            };
        }).filter(item => item.reliquat > 0);
        const paymentsLate = await db_1.db.paiement.findMany({
            where: { statut: 'en_retard' },
            include: { contrat: { include: { locataire: true, bien: true } } }
        });
        const paiementsEnRetard = paymentsLate.map(p => ({
            id: p.id,
            locataire: p.contrat?.locataire ? `${p.contrat.locataire.prenom} ${p.contrat.locataire.nom}` : 'N/A',
            bien: p.contrat?.bien ? p.contrat.bien.adresse : 'N/A',
            montant: p.montant,
            date: p.datePaiement.toISOString().split('T')[0],
            type: p.type
        }));
        const owners = await db_1.db.proprietaire.findMany({
            include: {
                biens: {
                    include: {
                        contrats: {
                            include: {
                                paiements: {
                                    where: { type: 'loyer', statut: 'paye' }
                                }
                            }
                        }
                    }
                },
                retraits: true
            }
        });
        const montantsDusProprietaires = owners.map(owner => {
            let totalRentsReceived = 0;
            owner.biens.forEach(b => {
                b.contrats.forEach(c => {
                    c.paiements.forEach(p => {
                        totalRentsReceived += p.montant;
                    });
                });
            });
            const rate = owner.fraisRate || 10.0;
            const totalOwnerPart = totalRentsReceived * (1 - rate / 100);
            const totalWithdrawn = owner.retraits.reduce((sum, r) => sum + r.montant, 0);
            const soldeDu = totalOwnerPart - totalWithdrawn;
            return {
                ownerId: owner.id,
                nom: `${owner.prenom} ${owner.nom}`,
                fraisRate: rate,
                totalCollecte: totalRentsReceived,
                partProprietaire: totalOwnerPart,
                totalRetire: totalWithdrawn,
                soldeDu: soldeDu > 0 ? soldeDu : 0
            };
        });
        const paymentsAll = await db_1.db.paiement.findMany({
            include: { contrat: { include: { locataire: true, bien: true } } },
            orderBy: { datePaiement: 'desc' },
            take: 30
        });
        const historiquePaiements = paymentsAll.map(p => ({
            id: p.id,
            locataire: p.contrat?.locataire ? `${p.contrat.locataire.prenom} ${p.contrat.locataire.nom}` : 'N/A',
            bien: p.contrat?.bien ? p.contrat.bien.adresse : 'N/A',
            montant: p.montant,
            date: p.datePaiement.toISOString().split('T')[0],
            statut: mapPaiementStatutToFe(p.statut),
            type: p.type
        }));
        return res.json({
            loyersImpayes,
            paiementsEnRetard,
            montantsDusProprietaires,
            historiquePaiements
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des créances' });
    }
});
// GET Ventes and POST Ventes
app.get('/api/ventes', auth_1.authMiddleware, async (req, res) => {
    try {
        const list = await db_1.db.vente.findMany({
            include: {
                bien: { include: { proprietaire: true } },
                agent: true
            },
            orderBy: { dateVente: 'desc' }
        });
        return res.json(list);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des ventes' });
    }
});
app.post('/api/ventes', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent', 'comptable']), async (req, res) => {
    const { bienId, clientNom, prixVente, commissionRate, dateVente, agentId } = req.body;
    if (!bienId || !clientNom || !prixVente || !dateVente) {
        return res.status(400).json({ error: 'Champs obligatoires manquants (bienId, clientNom, prixVente, dateVente)' });
    }
    try {
        const bien = await db_1.db.bien.findUnique({ where: { id: bienId } });
        if (!bien)
            return res.status(404).json({ error: 'Bien introuvable' });
        const newVente = await db_1.db.vente.create({
            data: {
                bienId,
                clientNom,
                prixVente: parseFloat(prixVente),
                commissionRate: commissionRate ? parseFloat(commissionRate) : 5.0,
                dateVente: new Date(dateVente),
                agentId: agentId || null
            }
        });
        await db_1.db.bien.update({
            where: { id: bienId },
            data: { statut: 'loue' } // Set sold bien to 'loue' (occupied/unavailable)
        });
        return res.status(201).json(newVente);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la vente' });
    }
});
// GET report PDF
app.get('/api/compta/rapport-pdf', auth_1.authMiddleware, async (req, res) => {
    const { range = 'month' } = req.query;
    try {
        const today = new Date();
        let startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        let endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        let periodLabel = `Mois en cours (${today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })})`;
        if (range === 'day') {
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            periodLabel = `Aujourd'hui (${today.toLocaleDateString('fr-FR')})`;
        }
        else if (range === 'week') {
            const dayOfWeek = today.getDay();
            const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            startDate = new Date(today.setDate(diffToMonday));
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = `Cette Semaine (du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')})`;
        }
        else if (range === 'year') {
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear() + 1, 0, 0, 23, 59, 59, 999);
            periodLabel = `Année en cours (${today.getFullYear()})`;
        }
        const payments = await db_1.db.paiement.findMany({
            where: {
                type: 'loyer',
                statut: 'paye',
                datePaiement: { gte: startDate, lte: endDate }
            },
            include: { contrat: { include: { locataire: true, bien: { include: { proprietaire: true } } } } }
        });
        const rentIncomes = payments.map(p => {
            const rate = p.contrat.bien.proprietaire.fraisRate || 10.0;
            return {
                id: p.id,
                date: p.datePaiement.toISOString().split('T')[0],
                libelle: `Comm. Loyer - ${p.contrat.locataire.nom}`,
                type: 'encaissement',
                categorie: 'Loyer',
                montant: p.montant * (rate / 100),
                montantBrut: p.montant
            };
        });
        const sales = await db_1.db.vente.findMany({
            where: { dateVente: { gte: startDate, lte: endDate } }
        });
        const saleIncomes = sales.map(s => {
            const rate = s.commissionRate || 5.0;
            return {
                id: s.id,
                date: s.dateVente.toISOString().split('T')[0],
                libelle: `Comm. Vente - ${s.clientNom}`,
                type: 'encaissement',
                categorie: 'Vente',
                montant: s.prixVente * (rate / 100),
                montantBrut: s.prixVente
            };
        });
        const manualRevs = await db_1.db.revenuManuel.findMany({
            where: { date: { gte: startDate, lte: endDate } }
        });
        const manualIncomes = manualRevs.map(r => ({
            id: r.id,
            date: r.date.toISOString().split('T')[0],
            libelle: r.description,
            type: 'encaissement',
            categorie: r.type,
            montant: r.montant,
            montantBrut: r.montant
        }));
        const expenses = await db_1.db.depense.findMany({
            where: { date: { gte: startDate, lte: endDate } }
        });
        const expTransactions = expenses.map(e => ({
            id: e.id,
            date: e.date.toISOString().split('T')[0],
            libelle: e.description,
            type: 'décaissement',
            categorie: e.categorie,
            montant: e.montant,
            montantBrut: e.montant
        }));
        const allTransactions = [...rentIncomes, ...saleIncomes, ...manualIncomes, ...expTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totalCommissions = rentIncomes.reduce((sum, item) => sum + item.montant, 0) +
            saleIncomes.reduce((sum, item) => sum + item.montant, 0) +
            manualIncomes.reduce((sum, item) => sum + item.montant, 0);
        const totalExpenses = expTransactions.reduce((sum, item) => sum + item.montant, 0);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=rapport_comptable_${range}.pdf`);
        const appSettings = getSettings();
        (0, pdf_1.generateAccountingReportPDF)(res, {
            enterprise: appSettings.enterprise,
            periodLabel,
            kpis: {
                totalCommissions,
                totalExpenses,
                netProfit: totalCommissions - totalExpenses
            },
            transactions: allTransactions
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la génération du rapport PDF' });
    }
});
app.get('/api/compta/export-csv', auth_1.authMiddleware, async (req, res) => {
    try {
        let csv = 'ID,Type,Categorie,Montant,MontantBrut,Date,Libelle,Client,Bien\n';
        const payments = await db_1.db.paiement.findMany({
            where: { type: 'loyer', statut: 'paye' },
            include: { contrat: { include: { locataire: true, bien: true } } }
        });
        const rentIncomes = payments.map(p => ({
            id: p.id,
            type: 'encaissement',
            categorie: 'Loyer',
            montant: p.montant * 0.10,
            montantBrut: p.montant,
            date: p.datePaiement.toISOString().split('T')[0],
            libelle: `Commission Loyer - ${p.contrat.locataire.nom}`,
            client: `${p.contrat.locataire.prenom} ${p.contrat.locataire.nom}`,
            bien: p.contrat.bien.adresse
        }));
        const sales = await db_1.db.vente.findMany({
            include: { bien: true }
        });
        const saleIncomes = sales.map(s => {
            const rate = s.commissionRate || 5.0;
            return {
                id: s.id,
                type: 'encaissement',
                categorie: 'Vente',
                montant: s.prixVente * (rate / 100),
                montantBrut: s.prixVente,
                date: s.dateVente.toISOString().split('T')[0],
                libelle: `Commission Vente - ${s.clientNom}`,
                client: s.clientNom,
                bien: s.bien.adresse
            };
        });
        const manualRevs = await db_1.db.revenuManuel.findMany();
        const manualIncomes = manualRevs.map(r => ({
            id: r.id,
            type: 'encaissement',
            categorie: r.type,
            montant: r.montant,
            montantBrut: r.montant,
            date: r.date.toISOString().split('T')[0],
            libelle: r.description,
            client: r.clientNom || 'N/A',
            bien: 'N/A'
        }));
        const expenses = await db_1.db.depense.findMany();
        const expTransactions = expenses.map(e => ({
            id: e.id,
            type: 'décaissement',
            categorie: e.categorie,
            montant: e.montant,
            montantBrut: e.montant,
            date: e.date.toISOString().split('T')[0],
            libelle: e.description,
            client: 'N/A',
            bien: 'N/A'
        }));
        const all = [...rentIncomes, ...saleIncomes, ...manualIncomes, ...expTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        all.forEach(item => {
            csv += `"${item.id}","${item.type}","${item.categorie}",${item.montant},${item.montantBrut},"${item.date}","${item.libelle.replace(/"/g, '""')}","${(item.client || '').replace(/"/g, '""')}","${(item.bien || '').replace(/"/g, '""')}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=journal_comptable_habitia.csv');
        return res.send(csv);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de l\'export CSV' });
    }
});
app.get('/api/compta/quittance/:paymentId', async (req, res) => {
    const { paymentId } = req.params;
    try {
        const payment = await db_1.db.paiement.findUnique({
            where: { id: paymentId },
            include: {
                contrat: {
                    include: {
                        locataire: true,
                        bien: {
                            include: {
                                proprietaire: true
                            }
                        }
                    }
                }
            }
        });
        if (!payment)
            return res.status(404).json({ error: 'Paiement introuvable' });
        const contrat = payment.contrat;
        if (!contrat)
            return res.status(404).json({ error: 'Contrat associé introuvable' });
        const locataire = contrat.locataire;
        const bien = contrat.bien;
        if (!locataire || !bien)
            return res.status(404).json({ error: 'Locataire ou bien associé introuvable' });
        const proprietaire = bien.proprietaire;
        if (!proprietaire)
            return res.status(404).json({ error: 'Propriétaire introuvable' });
        const dateObj = new Date(payment.datePaiement);
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        const periode = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=quittance_${paymentId}.pdf`);
        const appSettings = getSettings();
        return (0, pdf_1.generateQuittancePDF)(res, {
            enterprise: appSettings.enterprise,
            proprietaire: {
                ...proprietaire,
                cinPasseport: proprietaire.cinPasseport || ''
            },
            locataire: {
                ...locataire,
                employeur: locataire.employeur || '',
                garant: locataire.garant || ''
            },
            bien: bien,
            contrat: contrat,
            paiement: {
                id: payment.id,
                contratId: payment.contratId,
                montant: payment.montant,
                datePaiement: payment.datePaiement.toISOString().split('T')[0],
                statut: mapPaiementStatutToFe(payment.statut),
                type: payment.type
            },
            periode
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la génération PDF' });
    }
});
// ==========================================
// 8. PERSONNELS MODULE
// ==========================================
app.get('/api/personnels', auth_1.authMiddleware, async (req, res) => {
    try {
        const list = await db_1.db.personnel.findMany({
            include: { biensAssignes: true }
        });
        return res.json(list);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération du personnel' });
    }
});
app.post('/api/personnels', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { nom, poste, email, telephone, salaire, dateEmbauche, permissions } = req.body;
    if (!nom || !poste || !email || !telephone || !salaire) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    try {
        const newStaff = await db_1.db.personnel.create({
            data: {
                nom,
                poste,
                email,
                telephone,
                salaire: parseFloat(salaire),
                dateEmbauche: dateEmbauche ? new Date(dateEmbauche) : new Date(),
                permissions: permissions ? permissions : client_1.Prisma.DbNull,
                absences: [],
                planning: {
                    "Lundi": "09:00 - 17:00",
                    "Mardi": "09:00 - 17:00",
                    "Mercredi": "09:00 - 17:00",
                    "Jeudi": "09:00 - 17:00",
                    "Vendredi": "09:00 - 17:00"
                }
            }
        });
        // Sync permissions with User if user exists
        await db_1.db.user.updateMany({
            where: { email: email.toLowerCase() },
            data: { permissions: permissions ? permissions : client_1.Prisma.DbNull }
        });
        return res.status(201).json(newStaff);
    }
    catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Cet email de personnel existe déjà' });
        }
        return res.status(500).json({ error: 'Erreur lors de la création du personnel' });
    }
});
app.put('/api/personnels/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { id } = req.params;
    const { nom, poste, email, telephone, salaire, dateEmbauche, permissions, planning, absences } = req.body;
    try {
        const updated = await db_1.db.personnel.update({
            where: { id },
            data: {
                nom,
                poste,
                email,
                telephone,
                planning,
                absences,
                salaire: salaire ? parseFloat(salaire) : undefined,
                dateEmbauche: dateEmbauche ? new Date(dateEmbauche) : undefined,
                permissions: permissions !== undefined ? (permissions ? permissions : client_1.Prisma.DbNull) : undefined
            }
        });
        if (updated.email) {
            await db_1.db.user.updateMany({
                where: { email: updated.email.toLowerCase() },
                data: { permissions: updated.permissions ? updated.permissions : client_1.Prisma.DbNull }
            });
        }
        return res.json(updated);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la modification du personnel' });
    }
});
app.delete('/api/personnels/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.db.personnel.delete({ where: { id } });
        return res.json({ message: 'Personnel supprimé avec succès' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du personnel' });
    }
});
// Absences Request
app.post('/api/personnels/:id/absences', auth_1.authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { dateDebut, dateFin, motif } = req.body;
    try {
        const staff = await db_1.db.personnel.findUnique({ where: { id } });
        if (!staff)
            return res.status(404).json({ error: 'Personnel introuvable' });
        const absencesList = staff.absences || [];
        const newAbs = {
            id: 'abs-' + (absencesList.length + 1),
            dateDebut,
            dateFin,
            motif,
            statut: 'en_attente'
        };
        absencesList.push(newAbs);
        await db_1.db.personnel.update({
            where: { id },
            data: { absences: absencesList }
        });
        return res.status(201).json(newAbs);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la demande d\'absence' });
    }
});
// Validate/Reject absences
app.put('/api/personnels/:id/absences/:absId', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { id, absId } = req.params;
    const { statut } = req.body;
    try {
        const staff = await db_1.db.personnel.findUnique({ where: { id } });
        if (!staff)
            return res.status(404).json({ error: 'Personnel introuvable' });
        const absencesList = staff.absences || [];
        const abs = absencesList.find(a => a.id === absId);
        if (!abs)
            return res.status(404).json({ error: 'Absence introuvable' });
        abs.statut = statut;
        await db_1.db.personnel.update({
            where: { id },
            data: { absences: absencesList }
        });
        return res.json(abs);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la modification de l\'absence' });
    }
});
// ==========================================
// 9. PARAMÈTRES MODULE
// ==========================================
app.get('/api/settings', auth_1.authMiddleware, (req, res) => {
    return res.json(getSettings());
});
app.put('/api/settings', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const current = getSettings();
    const updated = { ...current, ...req.body };
    saveSettings(updated);
    return res.json(updated);
});
// Users management for Admin
app.get('/api/settings/users', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const list = await db_1.db.user.findMany();
        // Exclude password hashes
        const sanitized = list.map(({ password: _, ...rest }) => rest);
        return res.json(sanitized);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
});
app.post('/api/settings/users', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { nom, email, password, role } = req.body;
    if (!nom || !email || !password || !role) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    try {
        const newUser = await db_1.db.user.create({
            data: {
                nom,
                email: email.toLowerCase(),
                password: hashPasswordSync(password),
                role: role,
                actif: true
            }
        });
        const { password: _, ...sanitized } = newUser;
        return res.status(201).json(sanitized);
    }
    catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Cet email utilisateur existe déjà' });
        }
        return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }
});
app.put('/api/settings/users/:id', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const dataToUpdate = { ...req.body };
        if (dataToUpdate.password) {
            dataToUpdate.password = hashPasswordSync(dataToUpdate.password);
        }
        const updated = await db_1.db.user.update({
            where: { id },
            data: dataToUpdate
        });
        const { password: _, ...sanitized } = updated;
        return res.json(sanitized);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la modification de l\'utilisateur' });
    }
});
// ==========================================
// 10. UPLOAD FILE ROUTE
// ==========================================
app.post('/api/upload', auth_1.authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    const { entiteType, entiteId } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;
    try {
        const newDoc = await db_1.db.document.create({
            data: {
                nom: req.file.originalname,
                url: fileUrl,
                type: req.file.mimetype.includes('pdf') ? 'pdf' : 'image',
                entiteType: entiteType || 'bien',
                entiteId: entiteId || 'bien-1',
                proprietaireId: entiteType === 'proprietaire' ? entiteId : undefined,
                locataireId: entiteType === 'locataire' ? entiteId : undefined,
                chantierId: entiteType === 'chantier' ? entiteId : undefined
            }
        });
        return res.status(201).json(newDoc);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de l\'enregistrement du document' });
    }
});
// Locataires trigger send email receipt mock
app.post('/api/locataires/:id/send-receipt', auth_1.authMiddleware, (0, auth_1.requireRole)(['admin', 'agent', 'comptable']), async (req, res) => {
    const { id } = req.params;
    try {
        const loc = await db_1.db.locataire.findUnique({ where: { id } });
        if (!loc)
            return res.status(404).json({ error: 'Locataire introuvable' });
        return res.json({ message: `Quittance de loyer envoyée par e-mail avec succès à ${loc.prenom} ${loc.nom} (${loc.email})` });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de l\'envoi de la quittance' });
    }
});
// Server listener
app.listen(PORT, () => {
    console.log(`Habitia Express Server running on http://localhost:${PORT}`);
});
