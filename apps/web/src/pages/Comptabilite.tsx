import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, FileText, Download, TrendingUp, DollarSign, 
  ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2, ShieldAlert,
  Wallet, FileSpreadsheet, Calendar, User, ShoppingCart, Percent,
  AlertTriangle, ArrowLeftRight, Trash2, Award, Printer
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend,
  BarChart, Bar, Cell
} from 'recharts';
import { Card, Button, Input, Table, Badge, Modal, Select, customConfirm, Skeleton, TableSkeleton } from '../components/ui';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { fetchWithRetry } from '../utils/api';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const depenseSchema = z.object({
  categorie: z.string().min(1, "La catégorie est requise"),
  description: z.string().min(3, "La description doit contenir au moins 3 caractères"),
  montant: z.coerce.number().min(1, "Le montant doit être supérieur à 0"),
  date: z.string().min(10, "La date est requise"),
  enregistrePar: z.string().optional(),
});

const venteSchema = z.object({
  bienId: z.string().min(1, "Le bien immobilier est requis"),
  clientNom: z.string().min(3, "Le nom du client doit faire au moins 3 caractères"),
  prixVente: z.coerce.number().min(1, "Le prix de vente doit être supérieur à 0"),
  commissionRate: z.coerce.number().min(0.1, "Le taux de commission doit être supérieur à 0%").max(100),
  dateVente: z.string().min(10, "La date de la vente est requise"),
  agentId: z.string().optional(),
});

const revenuManuelSchema = z.object({
  type: z.enum(['frais_dossier', 'honoraires_gestion', 'autres']),
  description: z.string().min(3, "La description est requise"),
  montant: z.coerce.number().min(1, "Le montant doit être supérieur à 0"),
  date: z.string().min(10, "La date est requise"),
  clientNom: z.string().optional(),
});

const retraitSchema = z.object({
  proprietaireId: z.string().min(1, "Le propriétaire est requis"),
  amount: z.coerce.number().min(1, "Le montant doit être supérieur à 0"),
  date: z.string().min(10, "La date est requise"),
  motif: z.string().min(3, "Le motif doit faire au moins 3 caractères"),
});

const paiementLoyerSchema = z.object({
  contratId: z.string().min(1, "Le bail/contrat est requis"),
  montant: z.coerce.number().min(1, "Le montant doit être supérieur à 0"),
  datePaiement: z.string().min(10, "La date de paiement est requise"),
  statut: z.enum(['payé', 'en_retard', 'partiel']),
  type: z.enum(['loyer', 'charges', 'caution']),
});

type DepenseFormValues = z.infer<typeof depenseSchema>;
type VenteFormValues = z.infer<typeof venteSchema>;
type RevenuManuelFormValues = z.infer<typeof revenuManuelSchema>;
type RetraitFormValues = z.infer<typeof retraitSchema>;
type PaiementLoyerFormValues = z.infer<typeof paiementLoyerSchema>;

export const Comptabilite: React.FC = () => {
  const { user } = useAuthStore();

  const allTabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <BarChart2 size={16} /> },
    { id: 'revenus', label: 'Entrées / Revenus', icon: <ArrowUpRight size={16} /> },
    { id: 'depenses', label: 'Dépenses', icon: <ArrowDownRight size={16} /> },
    { id: 'commissions', label: 'Commissions', icon: <Percent size={16} /> },
    { id: 'tresorerie', label: 'Trésorerie', icon: <Wallet size={16} /> },
    { id: 'creances', label: 'Créances & Dûs', icon: <ShieldAlert size={16} /> },
    { id: 'rapports', label: 'Rapports & Exports', icon: <FileText size={16} /> }
  ];

  const allowedTabs = allTabs.filter(tab => {
    if (user?.role === 'admin') return true;
    if (user?.permissions?.tabs?.comptabilite) {
      return user.permissions.tabs.comptabilite.includes(tab.id);
    }
    return true;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'revenus' | 'depenses' | 'commissions' | 'tresorerie' | 'creances' | 'rapports'>('dashboard');

  useEffect(() => {
    if (allowedTabs.length > 0) {
      const isAllowed = allowedTabs.some(t => t.id === activeTab);
      if (!isAllowed) {
        setActiveTab(allowedTabs[0].id as any);
      }
    }
  }, [user, allowedTabs, activeTab]);

  const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('all');
  const [revPeriod, setRevPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all');
  const [revStartDate, setRevStartDate] = useState<string>('');
  const [revEndDate, setRevEndDate] = useState<string>('');
  const [expPeriod, setExpPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all');
  const [expStartDate, setExpStartDate] = useState<string>('');
  const [expEndDate, setExpEndDate] = useState<string>('');
  
  // Data states
  const [kpis, setKpis] = useState({ totalCommissions: 0, totalExpenses: 0, netProfit: 0, treasuryBalance: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<{ commissionsLocation: any[], commissionsVente: any[], commissionsAgent: any[], stats: { totalPaid: number, totalPending: number } }>({
    commissionsLocation: [],
    commissionsVente: [],
    commissionsAgent: [],
    stats: { totalPaid: 0, totalPending: 0 }
  });
  const [tresorerie, setTresorerie] = useState({ soldeActuel: 0, entréesJour: 0, dépensesJour: 0, soldeMensuel: 0, soldeAnnuel: 0 });
  const [creances, setCreances] = useState<{ loyersImpayes: any[], paiementsEnRetard: any[], montantsDusProprietaires: any[], historiquePaiements: any[] }>({
    loyersImpayes: [],
    paiementsEnRetard: [],
    montantsDusProprietaires: [],
    historiquePaiements: []
  });

  // Dropdown lists
  const [biens, setBiens] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal open states
  const [isDepenseOpen, setIsDepenseOpen] = useState(false);
  const [isVenteOpen, setIsVenteOpen] = useState(false);
  const [isRevenuOpen, setIsRevenuOpen] = useState(false);
  const [isRetraitOpen, setIsRetraitOpen] = useState(false);
  const [isLoyerOpen, setIsLoyerOpen] = useState(false);

  // Form hooks
  const { register: regDepense, handleSubmit: subDepense, reset: resDepense, formState: { errors: errDepense } } = useForm<DepenseFormValues>({ resolver: zodResolver(depenseSchema) });
  const { register: regVente, handleSubmit: subVente, reset: resVente, formState: { errors: errVente }, setValue: setVenteValue } = useForm<VenteFormValues>({ resolver: zodResolver(venteSchema), defaultValues: { commissionRate: 5 } });
  const { register: regRevenu, handleSubmit: subRevenu, reset: resRevenu, formState: { errors: errRevenu } } = useForm<RevenuManuelFormValues>({ resolver: zodResolver(revenuManuelSchema) });
  const { register: regRetrait, handleSubmit: subRetrait, reset: resRetrait, formState: { errors: errRetrait } } = useForm<RetraitFormValues>({ resolver: zodResolver(retraitSchema) });
  const { register: regLoyer, handleSubmit: subLoyer, reset: resLoyer, formState: { errors: errLoyer } } = useForm<PaiementLoyerFormValues>({ resolver: zodResolver(paiementLoyerSchema) });

  const formatFCFA = (val: number) => {
    return (val || 0).toLocaleString('fr-FR') + ' FCFA';
  };

  const isDateInFilter = (dateStr: string | Date, filter: 'day' | 'week' | 'month' | 'year' | 'all') => {
    if (filter === 'all') return true;
    const date = new Date(dateStr);
    const today = new Date();
    
    const dYear = date.getFullYear();
    const dMonth = date.getMonth();
    const dDate = date.getDate();
    
    const tYear = today.getFullYear();
    const tMonth = today.getMonth();
    const tDate = today.getDate();
    
    if (filter === 'day') {
      return dYear === tYear && dMonth === tMonth && dDate === tDate;
    }
    if (filter === 'week') {
      const dayOfWeek = today.getDay();
      const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      const dateTime = date.getTime();
      return dateTime >= startOfWeek.getTime() && dateTime <= endOfWeek.getTime();
    }
    if (filter === 'month') {
      return dYear === tYear && dMonth === tMonth;
    }
    if (filter === 'year') {
      return dYear === tYear;
    }
    return true;
  };

  const filteredRevenues = revenues.filter(r => {
    if (revPeriod === 'all') return true;
    if (revPeriod === 'custom') {
      if (!revStartDate && !revEndDate) return true;
      const rTime = new Date(r.date).getTime();
      const start = revStartDate ? new Date(revStartDate).getTime() : -Infinity;
      const end = revEndDate ? new Date(revEndDate + 'T23:59:59').getTime() : Infinity;
      return rTime >= start && rTime <= end;
    }
    return isDateInFilter(r.date, revPeriod);
  });
  const filteredExpenses = expenses.filter(e => {
    if (expPeriod === 'all') return true;
    if (expPeriod === 'custom') {
      if (!expStartDate && !expEndDate) return true;
      const eTime = new Date(e.date).getTime();
      const start = expStartDate ? new Date(expStartDate).getTime() : -Infinity;
      const end = expEndDate ? new Date(expEndDate + 'T23:59:59').getTime() : Infinity;
      return eTime >= start && eTime <= end;
    }
    return isDateInFilter(e.date, expPeriod);
  });

  const totalCommissions = filteredRevenues.reduce((sum, r) => sum + (r.montant || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.montant || 0), 0);
  const netProfit = totalCommissions - totalExpenses;
  const treasuryBalance = netProfit;

  const monthlyRevsTotal = revenues.filter(r => isDateInFilter(r.date, 'month')).reduce((sum, r) => sum + (r.montant || 0), 0);
  const monthlyExpsTotal = expenses.filter(e => isDateInFilter(e.date, 'month')).reduce((sum, e) => sum + (e.montant || 0), 0);
  const currentMonthSolde = monthlyRevsTotal - monthlyExpsTotal;

  const annualRevsTotal = revenues.filter(r => isDateInFilter(r.date, 'year')).reduce((sum, r) => sum + (r.montant || 0), 0);
  const annualExpsTotal = expenses.filter(e => isDateInFilter(e.date, 'year')).reduce((sum, e) => sum + (e.montant || 0), 0);
  const currentYearSolde = annualRevsTotal - annualExpsTotal;

  const getFluxCardTitle = () => {
    switch (periodFilter) {
      case 'day': return "Flux Journalier (Aujourd'hui)";
      case 'week': return "Flux Hebdomadaire (Cette Semaine)";
      case 'month': return "Flux Mensuel (Ce Mois)";
      case 'year': return "Flux Annuel (Cette Année)";
      default: return "Flux Global (Tout)";
    }
  };

  const getBeneficeLabel = () => {
    return periodFilter === 'all' ? "Bénéfice cumulé" : "Bénéfice sur la période";
  };

  const getDepenseLabel = () => {
    return periodFilter === 'all' ? "Dépenses totales" : "Dépenses sur la période";
  };

  const loadAllData = async () => {
    setIsLoading(true);

    try {
      // 1. Load dashboard & general data
      const dbRes = await fetchWithRetry('/api/compta/dashboard');
      if (dbRes.ok) {
        const data = await dbRes.json();
        setKpis(data.kpis);
        setChartData(data.chartData);
      }

      // 2. Load revenues
      const revRes = await fetchWithRetry('/api/compta/revenus');
      if (revRes.ok) setRevenues(await revRes.json());

      // 3. Load expenses
      const expRes = await fetchWithRetry('/api/compta/depenses');
      if (expRes.ok) setExpenses(await expRes.json());

      // 4. Load commissions
      const commRes = await fetchWithRetry('/api/compta/commissions');
      if (commRes.ok) setCommissions(await commRes.json());

      // 5. Load tresorerie
      const tresRes = await fetchWithRetry('/api/compta/tresorerie');
      if (tresRes.ok) setTresorerie(await tresRes.json());

      // 6. Load creances / debts
      const creRes = await fetchWithRetry('/api/compta/creances');
      if (creRes.ok) setCreances(await creRes.json());

      // 7. Load dropdown options
      const [biensRes, ownersRes, agentsRes, contractsRes] = await Promise.all([
        fetchWithRetry('/api/biens'),
        fetchWithRetry('/api/proprietaires'),
        fetchWithRetry('/api/personnels'),
        fetchWithRetry('/api/contrats')
      ]);

      if (biensRes.ok) setBiens(await biensRes.json());
      if (ownersRes.ok) {
        const ownersData = await ownersRes.json();
        setOwners(ownersData.data || []);
      }
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (contractsRes.ok) setContracts(await contractsRes.json());

    } catch (e) {
      console.error("Error loading accounting data:", e);
      toast.error("Impossible de récupérer les données comptables du serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Submit handers
  const onSubmitDepense = async (data: DepenseFormValues) => {
    try {
      const response = await fetchWithRetry('/api/compta/depenses', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        toast.success("Dépense enregistrée avec succès.");
        setIsDepenseOpen(false);
        resDepense();
        loadAllData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Erreur lors de la création de la dépense.");
      }
    } catch (e) {
      toast.error("Erreur réseau lors de la création de la dépense.");
    }
  };

  const onSubmitVente = async (data: VenteFormValues) => {
    try {
      const response = await fetchWithRetry('/api/ventes', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        toast.success("Vente enregistrée. Commission comptabilisée !");
        setIsVenteOpen(false);
        resVente();
        loadAllData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Erreur lors de l'enregistrement de la vente.");
      }
    } catch (e) {
      toast.error("Erreur réseau lors de la vente.");
    }
  };

  const onSubmitRevenu = async (data: RevenuManuelFormValues) => {
    try {
      const response = await fetchWithRetry('/api/compta/revenus', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        toast.success("Revenu manuel enregistré.");
        setIsRevenuOpen(false);
        resRevenu();
        loadAllData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Erreur lors de la création du revenu.");
      }
    } catch (e) {
      toast.error("Erreur réseau lors du revenu.");
    }
  };

  const onSubmitRetrait = async (data: RetraitFormValues) => {
    try {
      const response = await fetchWithRetry(`/api/proprietaires/${data.proprietaireId}/retraits`, {
        method: 'POST',
        body: JSON.stringify({ amount: data.amount, date: data.date, motif: data.motif })
      });
      if (response.ok) {
        toast.success("Retrait propriétaire enregistré. Bilan mis à jour.");
        setIsRetraitOpen(false);
        resRetrait();
        loadAllData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Erreur lors du retrait.");
      }
    } catch (e) {
      toast.error("Erreur réseau lors du retrait propriétaire.");
    }
  };

  const onSubmitLoyer = async (data: PaiementLoyerFormValues) => {
    try {
      const response = await fetchWithRetry('/api/compta/transactions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        toast.success("Paiement de loyer enregistré. Commission auto-calculée !");
        setIsLoyerOpen(false);
        resLoyer();
        loadAllData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Erreur lors de l'enregistrement du loyer.");
      }
    } catch (e) {
      toast.error("Erreur réseau.");
    }
  };

  const handleDeleteDepense = async (id: string) => {
    if (!await customConfirm("Voulez-vous vraiment supprimer cette dépense ?")) return;
    try {
      const response = await fetchWithRetry(`/api/compta/depenses/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success("Dépense supprimée avec succès.");
        loadAllData();
      } else {
        toast.error("Impossible de supprimer cette dépense.");
      }
    } catch (e) {
      toast.error("Erreur réseau.");
    }
  };

  const handlePrintRevenu = (rev: any) => {
    const printHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="margin: 0; color: #1e3a8a; font-size: 24px; font-weight: 800;">HABITIA REAL ESTATE</h2>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">REÇU DE TRANSACTION</p>
        </div>
        
        <div style="border-top: 2px solid #f1f5f9; border-bottom: 2px solid #f1f5f9; padding: 15px 0; margin-bottom: 25px;">
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Référence :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #0f172a;">${rev.reference}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Date :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #0f172a;">${rev.date}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Client / Entité :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #0f172a;">${rev.client}</td>
            </tr>
            ${rev.bienAdresse && rev.bienAdresse !== 'N/A' ? `
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Bien Concerné :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #0f172a;">${rev.bienAdresse}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Type de Service :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #0f172a; text-transform: uppercase;">${rev.type.replace('_', ' ')}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Montant Honoraires Agence</span>
          <span style="font-size: 28px; font-weight: 900; color: #10b981; display: block; margin-top: 5px;">${rev.montant.toLocaleString('fr-FR')} FCFA</span>
          ${rev.montantBrut && rev.montantBrut !== rev.montant ? `
            <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 5px;">Calculé sur un montant brut de ${rev.montantBrut.toLocaleString('fr-FR')} FCFA</span>
          ` : ''}
        </div>

        <div style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 30px;">
          <span style="font-weight: 700; color: #0f172a; display: block; margin-bottom: 5px;">Détails :</span>
          ${rev.details || 'Aucun détail supplémentaire fourni.'}
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 11px;">
          <div style="width: 150px; border-top: 1px dashed #cbd5e1; padding-top: 8px; color: #64748b;">
            Signature Client
          </div>
          <div style="width: 150px; border-top: 1px dashed #cbd5e1; padding-top: 8px; color: #64748b;">
            Le Gérant Habitia
          </div>
        </div>
      </div>
    `;

    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printHtml;
    setTimeout(() => {
      window.print();
      document.body.innerHTML = originalBody;
      window.location.reload();
    }, 250);
  };

  const handlePrintRevenuesList = () => {
    const totalBrut = filteredRevenues.reduce((sum, r) => sum + (r.montantBrut || 0), 0);
    const totalPart = filteredRevenues.reduce((sum, r) => sum + (r.montant || 0), 0);

    const printHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; color: #0f172a;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0; color: #1e3a8a; font-size: 20px; font-weight: 800;">HABITIA REAL ESTATE</h2>
            <p style="margin: 3px 0 0 0; color: #64748b; font-size: 11px;">Rapport du Grand Livre des Entrées</p>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <p style="margin: 0;">Date d'impression : ${new Date().toLocaleDateString('fr-FR')}</p>
            <p style="margin: 3px 0 0 0; font-weight: bold; color: #1e3a8a;">Filtre Période : ${
              revPeriod === 'all' ? 'Tout Historique' :
              revPeriod === 'day' ? "Aujourd'hui" :
              revPeriod === 'week' ? 'Cette Semaine' :
              revPeriod === 'month' ? 'Ce Mois' :
              revPeriod === 'year' ? 'Cette Année' :
              `Du ${revStartDate || 'N/A'} au ${revEndDate || 'N/A'}`
            }</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #1e3a8a; color: white; text-align: left; font-weight: bold;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Date</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Référence</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Client / Bail</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Type</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Montant Brut</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Part Agence</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRevenues.length === 0 ? `
              <tr>
                <td colspan="6" style="padding: 15px; text-align: center; color: #64748b; font-weight: bold;">Aucun revenu trouvé pour cette période.</td>
              </tr>
            ` : filteredRevenues.map(rev => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${rev.date}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${rev.reference}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">
                  <strong style="color: #334155; display: block;">${rev.client}</strong>
                  <span style="font-size: 9px; color: #64748b; font-style: italic;">${rev.bienAdresse || ''}</span>
                </td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-transform: capitalize;">${rev.type.replace('_', ' ')}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${rev.montantBrut.toLocaleString('fr-FR')} FCFA</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold; color: #10b981;">${rev.montant.toLocaleString('fr-FR')} FCFA</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
              <td colspan="4" style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">TOTAL :</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${totalBrut.toLocaleString('fr-FR')} FCFA</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #10b981; font-size: 12px;">${totalPart.toLocaleString('fr-FR')} FCFA</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 11px;">
          <div style="width: 200px; border-top: 1px dashed #cbd5e1; padding-top: 8px; color: #64748b;">
            Le Responsable Financier
          </div>
          <div style="width: 200px; border-top: 1px dashed #cbd5e1; padding-top: 8px; color: #64748b;">
            La Direction Habitia
          </div>
        </div>
      </div>
    `;

    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printHtml;
    setTimeout(() => {
      window.print();
      document.body.innerHTML = originalBody;
      window.location.reload();
    }, 250);
  };

  const handlePrintExpensesList = () => {
    const totalExp = filteredExpenses.reduce((sum, e) => sum + (e.montant || 0), 0);

    const printHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; color: #0f172a;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0; color: #991b1b; font-size: 20px; font-weight: 800;">HABITIA REAL ESTATE</h2>
            <p style="margin: 3px 0 0 0; color: #64748b; font-size: 11px;">Registre des Dépenses Agence</p>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <p style="margin: 0;">Date d'impression : ${new Date().toLocaleDateString('fr-FR')}</p>
            <p style="margin: 3px 0 0 0; font-weight: bold; color: #991b1b;">Filtre Période : ${
              expPeriod === 'all' ? 'Tout Historique' :
              expPeriod === 'day' ? "Aujourd'hui" :
              expPeriod === 'week' ? 'Cette Semaine' :
              expPeriod === 'month' ? 'Ce Mois' :
              expPeriod === 'year' ? 'Cette Année' :
              `Du ${expStartDate || 'N/A'} au ${expEndDate || 'N/A'}`
            }</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #991b1b; color: white; text-align: left; font-weight: bold;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Date</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Catégorie</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Description</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Montant</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Enregistré Par</th>
            </tr>
          </thead>
          <tbody>
            ${filteredExpenses.length === 0 ? `
              <tr>
                <td colspan="5" style="padding: 15px; text-align: center; color: #64748b; font-weight: bold;">Aucune dépense trouvée pour cette période.</td>
              </tr>
            ` : filteredExpenses.map(exp => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${new Date(exp.date).toLocaleDateString('fr-FR')}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; text-transform: capitalize; color: #991b1b;">${exp.categorie}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${exp.description}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold; color: #ef4444;">${exp.montant.toLocaleString('fr-FR')} FCFA</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 500;">${exp.enregistrePar || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
              <td colspan="3" style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">TOTAL :</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #ef4444; font-size: 12px;">${totalExp.toLocaleString('fr-FR')} FCFA</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;"></td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 11px;">
          <div style="width: 200px; border-top: 1px dashed #cbd5e1; padding-top: 8px; color: #64748b;">
            Le Responsable Financier
          </div>
          <div style="width: 200px; border-top: 1px dashed #cbd5e1; padding-top: 8px; color: #64748b;">
            La Direction Habitia
          </div>
        </div>
      </div>
    `;

    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printHtml;
    setTimeout(() => {
      window.print();
      document.body.innerHTML = originalBody;
      window.location.reload();
    }, 250);
  };

  const handleDeleteRevenu = async (id: string) => {
    if (!await customConfirm("Voulez-vous vraiment supprimer ce revenu manuel ?")) return;
    try {
      const response = await fetchWithRetry(`/api/compta/revenus/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success("Revenu supprimé avec succès.");
        loadAllData();
      } else {
        toast.error("Impossible de supprimer ce revenu.");
      }
    } catch (e) {
      toast.error("Erreur réseau.");
    }
  };

  const handleDownloadPDFReport = (range: 'day' | 'week' | 'month' | 'year') => {
    const token = localStorage.getItem('habitia_token');
    window.open(`/api/compta/rapport-pdf?range=${range}&token=${token}`, '_blank');
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('habitia_token');
    window.open(`/api/compta/export-csv?token=${token}`, '_blank');
  };

  // Badges and render helpers
  const getBadgeForType = (type: string) => {
    switch (type) {
      case 'commission_location':
        return <Badge variant="primary" className="gap-1"><Wallet size={12} /> Loyer</Badge>;
      case 'commission_vente':
        return <Badge variant="success" className="gap-1"><ShoppingCart size={12} /> Vente</Badge>;
      case 'frais_dossier':
        return <Badge variant="warning">Dossier</Badge>;
      case 'honoraires_gestion':
        return <Badge variant="warning">Honoraires</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-primary-500" /> Module Comptabilité & Trésorerie
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Suivi automatisé des commissions agence, encaissements de loyer, ventes immobilières et dépenses opérationnelles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as any)}
            className="px-3.5 py-2 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-bold transition-all cursor-pointer mr-2"
          >
            <option value="all">Tout Historique</option>
            <option value="day">Journalier</option>
            <option value="week">Hebdomadaire</option>
            <option value="month">Mensuel</option>
            <option value="year">Annuel</option>
          </select>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs">
            <Download size={15} /> Export CSV Journal
          </Button>
          <Button variant="success" onClick={() => setIsLoyerOpen(true)} className="flex items-center gap-1.5 text-xs">
            <DollarSign size={15} /> Saisir Encaissement
          </Button>
          <Button variant="primary" onClick={() => setIsVenteOpen(true)} className="flex items-center gap-1.5 text-xs">
            <ShoppingCart size={15} /> Enregistrer Vente
          </Button>
          <Button variant="danger" onClick={() => setIsDepenseOpen(true)} className="flex items-center gap-1.5 text-xs">
            <ArrowDownRight size={15} /> Saisir Dépense
          </Button>
          <Button variant="ghost" onClick={() => setIsRetraitOpen(true)} className="flex items-center gap-1.5 text-xs border border-slate-200/50 dark:border-slate-800">
            <ArrowLeftRight size={15} /> Retrait Propriétaire
          </Button>
        </div>
      </div>

      {/* COMPTA KPI CARDS */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 border border-slate-100 dark:border-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card hoverEffect className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-50 dark:bg-primary-950/20 text-primary-500 rounded-lg">
                <Percent size={20} />
              </div>
              <div>
                <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Commissions Encaissées</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white block mt-0.5">{formatFCFA(totalCommissions)}</span>
              </div>
            </div>
          </Card>

          <Card hoverEffect className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-danger-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-danger-50 dark:bg-danger-950/20 text-danger-500 rounded-lg">
                <ArrowDownRight size={20} />
              </div>
              <div>
                <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Dépenses</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white block mt-0.5">{formatFCFA(totalExpenses)}</span>
              </div>
            </div>
          </Card>

          <Card hoverEffect className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-success-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-success-50 dark:bg-success-950/20 text-success-500 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Bénéfice Net</span>
                <span className={`text-base font-extrabold block mt-0.5 ${netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {formatFCFA(netProfit)}
                </span>
              </div>
            </div>
          </Card>

          <Card hoverEffect className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-lg">
                <Wallet size={20} />
              </div>
              <div>
                <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Solde Trésorerie</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white block mt-0.5">{formatFCFA(treasuryBalance)}</span>
              </div>
            </div>
          </Card>

          <Card hoverEffect className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-warning-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-warning-50 dark:bg-warning-950/20 text-warning-500 rounded-lg">
                <ShieldAlert size={20} />
              </div>
              <div>
                <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Créances / Dûs</span>
                <span className="text-base font-extrabold text-warning-600 block mt-0.5">
                  {creances.loyersImpayes.length} loyers en retard
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* COMPTA NAVIGATION TABS */}
      <div className="flex overflow-x-auto border-b border-slate-200/60 dark:border-slate-800 gap-6 pb-0 scrollbar-none">
        {allowedTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-primary-500 text-primary-500' 
                : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENTS */}
      {isLoading ? (
        <TableSkeleton rows={7} cols={5} />
      ) : (
        <div className="space-y-6">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Graphic Chart */}
              <Card className="xl:col-span-2 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Évolution Mensuelle : Flux de Trésorerie</h3>
                  <p className="text-2xs text-slate-400 dark:text-slate-500">Comparaison en temps réel des revenus d'agence (commissions) et dépenses.</p>
                </div>
                <div className="w-full h-80 mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRevs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" fontSize={10} tickLine={false} />
                      <YAxis fontSize={10} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                      <Tooltip formatter={(value: any) => formatFCFA(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="revenus" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevs)" name="Revenus d'Agence" />
                      <Area type="monotone" dataKey="charges" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" name="Dépenses d'Agence" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Quick Actions / Recent transactions */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">Saisies Rapides</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="success" size="sm" onClick={() => setIsLoyerOpen(true)} className="flex items-center gap-1 justify-start">
                      <DollarSign size={14} /> Loyers
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setIsVenteOpen(true)} className="flex items-center gap-1 justify-start">
                      <ShoppingCart size={14} /> Ventes
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setIsDepenseOpen(true)} className="flex items-center gap-1 justify-start">
                      <ArrowDownRight size={14} /> Dépenses
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setIsRevenuOpen(true)} className="flex items-center gap-1 justify-start">
                      <Plus size={14} /> Frais/Dossier
                    </Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">Statistiques Clés</h3>
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">{getBeneficeLabel()}</span>
                      <span className="font-bold text-slate-800 dark:text-white">{formatFCFA(netProfit)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      <span className="text-slate-400 font-medium">Créances en attente</span>
                      <span className="font-bold text-warning-600">{creances.loyersImpayes.reduce((sum, item) => sum + item.reliquat, 0).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      <span className="text-slate-400 font-medium">{getDepenseLabel()}</span>
                      <span className="font-bold text-danger-500">{formatFCFA(totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      <span className="text-slate-400 font-medium">Taux d'occupation</span>
                      <span className="font-bold text-slate-800 dark:text-white">82%</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: REVENUS */}
          {activeTab === 'revenus' && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Grand Livre des Entrées</h3>
                  <p className="text-[10px] text-slate-400">Visualisez et filtrez l'ensemble des revenus agence.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Période :</span>
                    <select
                      value={revPeriod}
                      onChange={(e) => setRevPeriod(e.target.value as any)}
                      className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-bold transition-all cursor-pointer"
                    >
                      <option value="all">Tout Historique</option>
                      <option value="day">Aujourd'hui</option>
                      <option value="week">Cette Semaine</option>
                      <option value="month">Ce Mois</option>
                      <option value="year">Cette Année</option>
                      <option value="custom">Période Personnalisée</option>
                    </select>
                  </div>

                  {revPeriod === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={revStartDate}
                        onChange={(e) => setRevStartDate(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-xs"
                      />
                      <span className="text-xs text-slate-400">à</span>
                      <input
                        type="date"
                        value={revEndDate}
                        onChange={(e) => setRevEndDate(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-xs"
                      />
                    </div>
                  )}

                  <Button variant="secondary" size="sm" onClick={handlePrintRevenuesList} className="flex items-center gap-1.5 text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700">
                    <Printer size={14} /> Imprimer la Liste
                  </Button>
                  <Button variant="success" size="sm" onClick={() => setIsRevenuOpen(true)} className="flex items-center gap-1 text-xs text-white">
                    <Plus size={14} /> Saisir un Revenu Agence
                  </Button>
                </div>
              </div>
              <Table headers={['Date', 'Référence', 'Client / Bail', 'Type', 'Montant Brut', 'Part Agence (Revenu)', 'Actions']}>
                {filteredRevenues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-xs font-semibold text-slate-400">Aucun revenu enregistré dans le système pour cette période.</td>
                  </tr>
                ) : (
                  filteredRevenues.map((rev) => {
                    const isDeletable = true;
                    return (
                      <tr key={rev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono">{rev.date}</td>
                        <td className="px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">{rev.reference}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">{rev.client}</span>
                          <span className="text-3xs block italic">{rev.bienAdresse}</span>
                        </td>
                        <td className="px-5 py-3.5 text-xs">{getBadgeForType(rev.type)}</td>
                        <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{formatFCFA(rev.montantBrut)}</td>
                        <td className="px-5 py-3.5 text-xs font-bold text-success-600 dark:text-success-400 font-mono">{formatFCFA(rev.montant)}</td>
                        <td className="px-5 py-3.5 text-xs">
                          {isDeletable && (
                            <button
                              onClick={() => handleDeleteRevenu(rev.id)}
                              className="p-1.5 hover:bg-danger-50 dark:hover:bg-danger-950/20 text-danger-500 rounded-lg flex items-center justify-center transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </Table>
            </div>
          )}

          {/* TAB: DÉPENSES */}
          {activeTab === 'depenses' && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Registre des Dépenses Agence</h3>
                  <p className="text-[10px] text-slate-400">Visualisez et filtrez l'ensemble des dépenses opérationnelles de l'agence.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Période :</span>
                    <select
                      value={expPeriod}
                      onChange={(e) => setExpPeriod(e.target.value as any)}
                      className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-danger-500 font-bold transition-all cursor-pointer"
                    >
                      <option value="all">Tout Historique</option>
                      <option value="day">Aujourd'hui</option>
                      <option value="week">Cette Semaine</option>
                      <option value="month">Ce Mois</option>
                      <option value="year">Cette Année</option>
                      <option value="custom">Période Personnalisée</option>
                    </select>
                  </div>

                  {expPeriod === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={expStartDate}
                        onChange={(e) => setExpStartDate(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-xs"
                      />
                      <span className="text-xs text-slate-400">à</span>
                      <input
                        type="date"
                        value={expEndDate}
                        onChange={(e) => setExpEndDate(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-xs"
                      />
                    </div>
                  )}

                  <Button variant="secondary" size="sm" onClick={handlePrintExpensesList} className="flex items-center gap-1.5 text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700">
                    <Printer size={14} /> Imprimer la Liste
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setIsDepenseOpen(true)} className="flex items-center gap-1 text-xs text-white">
                    <Plus size={14} /> Enregistrer une Dépense
                  </Button>
                </div>
              </div>
              <Table headers={['Date', 'Catégorie', 'Description', 'Montant', 'Enregistré Par', 'Actions']}>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs font-semibold text-slate-400">Aucune dépense enregistrée pour cette période.</td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono">{new Date(exp.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                        <Badge variant="danger">{exp.categorie}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">{exp.description}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-danger-500 font-mono">{formatFCFA(exp.montant)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">{exp.enregistrePar}</td>
                      <td className="px-5 py-3.5 text-xs flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteDepense(exp.id)}
                          className="p-1 hover:bg-danger-50 dark:hover:bg-danger-950/20 text-danger-500 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </Table>
            </div>
          )}

          {/* TAB: COMMISSIONS */}
          {activeTab === 'commissions' && (
            <div className="space-y-6">
              {/* Commissions Statistics Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 p-5 flex items-center justify-between">
                  <div>
                    <span className="text-3xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Commissions Perçues & Validées</span>
                    <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300 block mt-1">{formatFCFA(commissions.stats.totalPaid)}</span>
                  </div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <TrendingUp size={22} />
                  </div>
                </Card>
                <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30 p-5 flex items-center justify-between">
                  <div>
                    <span className="text-3xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Commissions en Attente (Loyers Impayés)</span>
                    <span className="text-lg font-extrabold text-amber-700 dark:text-amber-300 block mt-1">{formatFCFA(commissions.stats.totalPending)}</span>
                  </div>
                  <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                    <Calendar size={22} />
                  </div>
                </Card>
              </div>

              {/* Commission Ventilation Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Location Commissions */}
                <Card className="p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><Wallet size={15} className="text-primary-500" /> Commissions sur Locations (Gérance)</h3>
                  <div className="overflow-x-auto max-h-[300px]">
                    <Table headers={['Locataire / Bien', 'Paiement', 'Com (10%)', 'Statut']}>
                      {commissions.commissionsLocation.map((c, i) => (
                        <tr key={i} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300">
                            <span className="block">{c.locataire}</span>
                            <span className="text-3xs text-slate-400 font-normal">{c.bien}</span>
                          </td>
                          <td className="px-4 py-2 text-slate-500">{formatFCFA(c.totalPaye)}</td>
                          <td className="px-4 py-2 font-bold text-primary-500 font-mono">{formatFCFA(c.commission)}</td>
                          <td className="px-4 py-2">
                            <Badge variant={c.statut === 'payé' ? 'success' : 'danger'}>{c.statut}</Badge>
                          </td>
                        </tr>
                      ))}
                    </Table>
                  </div>
                </Card>

                {/* Vente Commissions */}
                <Card className="p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><ShoppingCart size={15} className="text-success-500" /> Commissions sur Ventes (Transaction)</h3>
                  <div className="overflow-x-auto max-h-[300px]">
                    <Table headers={['Client / Bien', 'Prix de Vente', 'Com (5%)', 'Agent']}>
                      {commissions.commissionsVente.map((c, i) => (
                        <tr key={i} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300">
                            <span className="block">{c.client}</span>
                            <span className="text-3xs text-slate-400 font-normal">{c.bien}</span>
                          </td>
                          <td className="px-4 py-2 text-slate-500">{formatFCFA(c.prixVente)}</td>
                          <td className="px-4 py-2 font-bold text-success-600 font-mono">{formatFCFA(c.commission)}</td>
                          <td className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400">{c.agent}</td>
                        </tr>
                      ))}
                    </Table>
                  </div>
                </Card>

                {/* Commissions By Agent */}
                <Card className="xl:col-span-2 p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><Award size={15} className="text-warning-500" /> Performance des Agents (Commissions Générées)</h3>
                  <Table headers={['Nom de l\'Agent', 'Poste', 'Ventes Réalisées', 'Commissions Vente', 'Commissions Gérance', 'Total Commissions']}>
                    {commissions.commissionsAgent.map((agent, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{agent.agentName}</td>
                        <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 capitalize">{agent.poste}</td>
                        <td className="px-5 py-3 text-xs font-mono font-bold">{agent.totalVentes} ventes</td>
                        <td className="px-5 py-3 text-xs font-mono font-bold text-success-600">{formatFCFA(agent.commissionVente)}</td>
                        <td className="px-5 py-3 text-xs font-mono text-primary-500">{formatFCFA(agent.totalLocationCommissions)}</td>
                        <td className="px-5 py-3 text-sm font-extrabold font-mono text-slate-900 dark:text-white">{formatFCFA(agent.totalCommissions)}</td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: TRÉSORERIE */}
          {activeTab === 'tresorerie' && (
            <div className="space-y-6">
              {/* Daily / Monthly cash state */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-primary-500 to-primary-600 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />
                  <span className="text-3xs font-extrabold uppercase tracking-widest text-white/70 block">Solde Période Disponible</span>
                  <span className="text-2xl font-black block mt-2">{formatFCFA(netProfit)}</span>
                  <p className="text-3xs text-white/50 mt-4 italic">Pour la période sélectionnée (Entrées - Dépenses)</p>
                </Card>

                <Card className="p-6 relative overflow-hidden">
                  <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{getFluxCardTitle()}</span>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex-1">
                      <span className="text-2xs text-slate-400 font-medium block">Entrées</span>
                      <span className="text-xs font-extrabold text-success-600 block">+{formatFCFA(totalCommissions)}</span>
                    </div>
                    <div className="flex-1 border-l border-slate-100 dark:border-slate-800/60 pl-4">
                      <span className="text-2xs text-slate-400 font-medium block">Dépenses</span>
                      <span className="text-xs font-extrabold text-danger-500 block">-{formatFCFA(totalExpenses)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 relative overflow-hidden">
                  <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Périodes Clés</span>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex-1">
                      <span className="text-2xs text-slate-400 font-medium block">Solde de ce mois</span>
                      <span className={`text-xs font-extrabold block ${currentMonthSolde >= 0 ? 'text-success-600' : 'text-danger-500'}`}>
                        {formatFCFA(currentMonthSolde)}
                      </span>
                    </div>
                    <div className="flex-1 border-l border-slate-100 dark:border-slate-800/60 pl-4">
                      <span className="text-2xs text-slate-400 font-medium block">Solde de l'Année</span>
                      <span className={`text-xs font-extrabold block ${currentYearSolde >= 0 ? 'text-success-600' : 'text-danger-500'}`}>
                        {formatFCFA(currentYearSolde)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Cash flow graph/details */}
              <Card className="p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">État comparatif des Revenus vs Charges</h3>
                <div className="w-full h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" fontSize={9} />
                      <YAxis fontSize={9} />
                      <Tooltip formatter={(value: any) => formatFCFA(value)} />
                      <Legend />
                      <Bar dataKey="revenus" fill="#10B981" name="Encaissements / Commissions" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="charges" fill="#EF4444" name="Décaissements / Charges" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* TAB: CRÉANCES */}
          {activeTab === 'creances' && (
            <div className="space-y-6">
              
              {/* Unpaid / Late Rents */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 text-danger-600"><AlertTriangle size={15} /> Loyers Impayés de la Période (Mois Glissant)</h3>
                  <Table headers={['Locataire', 'Logement', 'Attendu', 'Payé', 'Reliquat', 'Statut']}>
                    {creances.loyersImpayes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-2xs text-slate-400">Aucun loyer impayé pour cette période.</td>
                      </tr>
                    ) : (
                      creances.loyersImpayes.map((item, i) => (
                        <tr key={i} className="text-xs">
                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">{item.locataire}</td>
                          <td className="px-4 py-2 text-slate-500">{item.bien}</td>
                          <td className="px-4 py-2 font-mono text-slate-500">{formatFCFA(item.loyerMensuel)}</td>
                          <td className="px-4 py-2 font-mono text-success-600">+{formatFCFA(item.paye)}</td>
                          <td className="px-4 py-2 font-mono font-bold text-danger-500">{formatFCFA(item.reliquat)}</td>
                          <td className="px-4 py-2"><Badge variant="danger">{item.statut}</Badge></td>
                        </tr>
                      ))
                    )}
                  </Table>
                </Card>

                {/* Payments in Delay */}
                <Card className="p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 text-warning-500"><Calendar size={15} /> Historique des Paiements en Retard Détectés</h3>
                  <Table headers={['Locataire', 'Bien / Type', 'Montant', 'Date', 'Type']}>
                    {creances.paiementsEnRetard.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-2xs text-slate-400 font-semibold">Aucun paiement en retard enregistré.</td>
                      </tr>
                    ) : (
                      creances.paiementsEnRetard.map((item, i) => (
                        <tr key={i} className="text-xs">
                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">{item.locataire}</td>
                          <td className="px-4 py-2 text-slate-500">{item.bien}</td>
                          <td className="px-4 py-2 font-mono font-bold text-warning-600">{formatFCFA(item.montant)}</td>
                          <td className="px-4 py-2 font-mono text-slate-500">{item.date}</td>
                          <td className="px-4 py-2 capitalize font-semibold">{item.type}</td>
                        </tr>
                      ))
                    )}
                  </Table>
                </Card>
              </div>

              {/* Owner payouts (Connecting retraits and collectes) */}
              <Card className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><ArrowLeftRight size={15} className="text-primary-500" /> Bilan Financier des Propriétaires & Retraits de Loyers</h3>
                  <Button variant="ghost" size="sm" onClick={() => setIsRetraitOpen(true)} className="flex items-center gap-1 text-xs border border-slate-200/50 dark:border-slate-800">
                    <Plus size={14} /> Enregistrer un Retrait Propriétaire
                  </Button>
                </div>
                <Table headers={['Propriétaire', 'Gérance (Taux)', 'Collecté Brut', 'Net Propriétaire (Avant retrait)', 'Déjà Retiré / Payé', 'Solde Restant Dû']}>
                  {creances.montantsDusProprietaires.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{item.nom}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-bold">{item.fraisRate}%</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{formatFCFA(item.totalCollecte)}</td>
                      <td className="px-5 py-3.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{formatFCFA(item.partProprietaire)}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-danger-500">-{formatFCFA(item.totalRetire)}</td>
                      <td className="px-5 py-3.5 text-sm font-mono font-extrabold">
                        <Badge variant={item.soldeDu > 0 ? 'success' : 'neutral'}>
                          {formatFCFA(item.soldeDu)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </Table>
              </Card>

              {/* General Payments Ledger */}
              <Card className="p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Historique de tous les paiements (Loyers / cautions)</h3>
                <div className="overflow-x-auto">
                  <Table headers={['Date', 'Locataire', 'Logement', 'Montant', 'Statut', 'Catégorie']}>
                    {creances.historiquePaiements.slice(0, 10).map((item, i) => (
                      <tr key={i} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-4 py-2 font-mono text-slate-500">{item.date}</td>
                        <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">{item.locataire}</td>
                        <td className="px-4 py-2 text-slate-500">{item.bien}</td>
                        <td className="px-4 py-2 font-bold text-slate-900 dark:text-white font-mono">{formatFCFA(item.montant)}</td>
                        <td className="px-4 py-2">
                          <Badge variant={item.statut === 'payé' ? 'success' : item.statut === 'partiel' ? 'warning' : 'danger'}>{item.statut}</Badge>
                        </td>
                        <td className="px-4 py-2 capitalize font-semibold">{item.type}</td>
                      </tr>
                    ))}
                  </Table>
                </div>
              </Card>

            </div>
          )}

          {/* TAB: REPORTS */}
          {activeTab === 'rapports' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {[
                { id: 'day', label: 'Rapport Journalier', desc: 'Bilan comptable complet des dernières 24 heures.' },
                { id: 'week', label: 'Rapport Hebdomadaire', desc: 'Synthèse des transactions de la semaine en cours.' },
                { id: 'month', label: 'Rapport Mensuel', desc: 'Analyse financière de la trésorerie et des loyers de ce mois.' },
                { id: 'year', label: 'Rapport Annuel', desc: 'Historique consolidé des flux de l\'année en cours.' }
              ].map((rep) => (
                <Card key={rep.id} hoverEffect className="p-6 flex flex-col justify-between h-48 border border-slate-100 dark:border-slate-800">
                  <div className="space-y-2">
                    <span className="p-2 bg-primary-50 dark:bg-primary-950/20 text-primary-500 rounded-lg inline-block">
                      <FileText size={18} />
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">{rep.label}</h4>
                    <p className="text-3xs text-slate-400 dark:text-slate-500">{rep.desc}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDownloadPDFReport(rep.id as any)}
                    className="flex items-center gap-1.5 w-full mt-4 text-xs font-semibold"
                  >
                    <Download size={14} /> Générer PDF
                  </Button>
                </Card>
              ))}
            </div>
          )}

        </div>
      )}

      {/* MODAL: SAISIR DÉPENSE */}
      <Modal isOpen={isDepenseOpen} onClose={() => setIsDepenseOpen(false)} title="Enregistrer une Dépense Opérationnelle">
        <form onSubmit={subDepense(onSubmitDepense)} className="space-y-4">
          <Select
            label="Catégorie de la dépense"
            options={[
              { value: 'salaires', label: 'Salaires des Employés' },
              { value: 'publicite', label: 'Publicités / Marketing' },
              { value: 'internet', label: 'Abonnement Internet' },
              { value: 'telephone', label: 'Téléphone / Communication' },
              { value: 'transport', label: 'Frais de Transport / Carburant' },
              { value: 'fournitures', label: 'Fournitures de Bureau' },
              { value: 'entretien', label: 'Entretien des Locaux / Matériel' },
              { value: 'autres', label: 'Autres charges / Dépenses' }
            ]}
            error={errDepense.categorie?.message}
            {...regDepense('categorie')}
          />
          <Input label="Description / Justification" error={errDepense.description?.message} {...regDepense('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Montant Dépensé (FCFA)" type="number" error={errDepense.montant?.message} {...regDepense('montant')} />
            <Input label="Date" type="date" error={errDepense.date?.message} {...regDepense('date')} />
          </div>
          <Input label="Nom de l'utilisateur (Optionnel)" error={errDepense.enregistrePar?.message} {...regDepense('enregistrePar')} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsDepenseOpen(false)}>Annuler</Button>
            <Button variant="danger" type="submit">Valider la Dépense</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ENREGISTRER UNE VENTE */}
      <Modal isOpen={isVenteOpen} onClose={() => setIsVenteOpen(false)} title="Enregistrer une Vente de Bien Immobilier">
        <form onSubmit={subVente(onSubmitVente)} className="space-y-4">
          <Select
            label="Bien Immobilier concerné (En Vente)"
            options={biens.filter(b => b.statut === 'en_vente' || b.statut === 'disponible').map(b => ({
              value: b.id,
              label: `${b.adresse} (${b.ville}) - ${b.loyer ? b.loyer.toLocaleString() : b.surface + 'm²'}`
            }))}
            error={errVente.bienId?.message}
            {...regVente('bienId')}
          />
          <Input label="Nom complet de l'Acheteur (Client)" error={errVente.clientNom?.message} {...regVente('clientNom')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prix de Vente Total (FCFA)" type="number" error={errVente.prixVente?.message} {...regVente('prixVente')} />
            <Input label="Date de la vente" type="date" error={errVente.dateVente?.message} {...regVente('dateVente')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Taux de Commission Agence (%)" type="number" step="0.1" error={errVente.commissionRate?.message} {...regVente('commissionRate')} />
            <Select
              label="Agent négociateur"
              options={[{ value: '', label: 'Aucun agent' }, ...agents.map(a => ({ value: a.id, label: a.nom }))]}
              error={errVente.agentId?.message}
              {...regVente('agentId')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsVenteOpen(false)}>Annuler</Button>
            <Button type="submit">Enregistrer la Vente</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: SAISIR REVENU MANUEL */}
      <Modal isOpen={isRevenuOpen} onClose={() => setIsRevenuOpen(false)} title="Saisir un autre type de Revenu Agence">
        <form onSubmit={subRevenu(onSubmitRevenu)} className="space-y-4">
          <Select
            label="Type de Revenu"
            options={[
              { value: 'frais_dossier', label: 'Frais de Dossier Locataire' },
              { value: 'honoraires_gestion', label: 'Honoraires de Gérance Particuliers' },
              { value: 'autres', label: 'Autres Commissions / Prestations' }
            ]}
            error={errRevenu.type?.message}
            {...regRevenu('type')}
          />
          <Input label="Description / Libellé de l'opération" error={errRevenu.description?.message} {...regRevenu('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Montant du Revenu (FCFA)" type="number" error={errRevenu.montant?.message} {...regRevenu('montant')} />
            <Input label="Date de perception" type="date" error={errRevenu.date?.message} {...regRevenu('date')} />
          </div>
          <Input label="Nom du client (Optionnel)" error={errRevenu.clientNom?.message} {...regRevenu('clientNom')} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsRevenuOpen(false)}>Annuler</Button>
            <Button variant="success" type="submit">Enregistrer le Revenu</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RETRAIT PROPRIÉTAIRE */}
      <Modal isOpen={isRetraitOpen} onClose={() => setIsRetraitOpen(false)} title="Enregistrer un Retrait de Loyer Propriétaire">
        <form onSubmit={subRetrait(onSubmitRetrait)} className="space-y-4">
          <Select
            label="Propriétaire Mandant"
            options={owners.map(o => ({ value: o.id, label: `${o.prenom} ${o.nom}` }))}
            error={errRetrait.proprietaireId?.message}
            {...regRetrait('proprietaireId')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Montant du retrait (FCFA)" type="number" error={errRetrait.amount?.message} {...regRetrait('amount')} />
            <Input label="Date du retrait" type="date" error={errRetrait.date?.message} {...regRetrait('date')} />
          </div>
          <Input label="Motif / Justificatif" error={errRetrait.motif?.message} {...regRetrait('motif')} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsRetraitOpen(false)}>Annuler</Button>
            <Button type="submit">Enregistrer le Retrait</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: SAISIR ENCAISSEMENT (LOYER) */}
      <Modal isOpen={isLoyerOpen} onClose={() => setIsLoyerOpen(false)} title="Saisir un Règlement de Loyer (Automatisé)">
        <form onSubmit={subLoyer(onSubmitLoyer)} className="space-y-4">
          <Select
            label="Contrat / Bail concerné"
            options={contracts.map(c => ({ value: c.id, label: c.label }))}
            error={errLoyer.contratId?.message}
            {...regLoyer('contratId')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Montant Reçu (FCFA)" type="number" error={errLoyer.montant?.message} {...regLoyer('montant')} />
            <Input label="Date du paiement" type="date" error={errLoyer.datePaiement?.message} {...regLoyer('datePaiement')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type de Règlement"
              options={[
                { value: 'loyer', label: 'Loyer Principal' },
                { value: 'charges', label: 'Provisions charges' },
                { value: 'caution', label: 'Dépôt de Garantie (Caution)' }
              ]}
              error={errLoyer.type?.message}
              {...regLoyer('type')}
            />
            <Select
              label="Statut du Règlement"
              options={[
                { value: 'payé', label: 'Réglé (Total)' },
                { value: 'partiel', label: 'Paiement Partiel' },
                { value: 'en_retard', label: 'En retard / Impayé' }
              ]}
              error={errLoyer.statut?.message}
              {...regLoyer('statut')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsLoyerOpen(false)}>Annuler</Button>
            <Button variant="success" type="submit">Enregistrer le Loyer</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Comptabilite;
