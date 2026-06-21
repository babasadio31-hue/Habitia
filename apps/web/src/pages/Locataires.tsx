import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Search, Edit2, Trash2, Eye, 
  FileText, Upload, Mail, Phone, Briefcase, ShieldCheck, Send, CheckCircle2,
  ArrowLeft, TrendingUp, Building, Printer
} from 'lucide-react';
import { Card, Button, Input, Table, Badge, Modal, EmptyState, Select, customConfirm, TableSkeleton } from '../components/ui';
import { fetchWithRetry } from '../utils/api';

const monthOptions = [
  { value: '', label: '-- Sélectionner le mois --' },
  { value: '2026-01-01', label: 'Janvier 2026' },
  { value: '2026-02-01', label: 'Février 2026' },
  { value: '2026-03-01', label: 'Mars 2026' },
  { value: '2026-04-01', label: 'Avril 2026' },
  { value: '2026-05-01', label: 'Mai 2026' },
  { value: '2026-06-01', label: 'Juin 2026' },
  { value: '2026-07-01', label: 'Juillet 2026' },
  { value: '2026-08-01', label: 'Août 2026' },
  { value: '2026-09-01', label: 'Septembre 2026' },
  { value: '2026-10-01', label: 'Octobre 2026' },
  { value: '2026-11-01', label: 'Novembre 2026' },
  { value: '2026-12-01', label: 'Décembre 2026' },
  { value: '2027-01-01', label: 'Janvier 2027' },
  { value: '2027-02-01', label: 'Février 2027' },
  { value: '2027-03-01', label: 'Mars 2027' },
  { value: '2027-04-01', label: 'Avril 2027' },
  { value: '2027-05-01', label: 'Mai 2027' },
  { value: '2027-06-01', label: 'Juin 2027' },
  { value: '2027-07-01', label: 'Juillet 2027' },
  { value: '2027-08-01', label: 'Août 2027' },
  { value: '2027-09-01', label: 'Septembre 2027' },
  { value: '2027-10-01', label: 'Octobre 2027' },
  { value: '2027-11-01', label: 'Novembre 2027' },
  { value: '2027-12-01', label: 'Décembre 2027' }
];

// Validation Schema
const tenantSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  telephone: z.string().min(8, "Numéro de téléphone invalide"),
  employeur: z.string().min(2, "L'employeur est requis"),
  garant: z.string().min(2, "Le garant est requis"),
  statut: z.enum(['actif', 'ancien', 'liste_attente']),
  bienId: z.string().optional().or(z.literal('')),
  loyer: z.preprocess((val) => val === '' || val === undefined ? undefined : Number(val), z.number().min(0).optional()),
  caution: z.preprocess((val) => val === '' || val === undefined ? undefined : Number(val), z.number().min(0).optional()),
  dateDebut: z.string().optional().or(z.literal('')),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

interface Tenant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  employeur: string;
  garant: string;
  statut: 'actif' | 'ancien' | 'liste_attente';
  bienAdresse?: string;
  bienId?: string;
  loyer?: number;
  caution?: number;
  dateDebut?: string;
  documents?: { id: string; nom: string; url: string; type: string }[];
}

interface PaymentRecord {
  loyer: number;
  paye: number;
}

const parseStartDate = (dateStr: string | undefined): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const generateMonthsSequence = (startDateStr: string | undefined, count: number = 13) => {
  const months: { key: string; label: string }[] = [];
  const baseDate = parseStartDate(startDateStr);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  
  const frenchMonths = [
    'janv', 'févr', 'mars', 'avr', 'mai', 'juin', 
    'juil', 'août', 'sept', 'oct', 'nov', 'déc'
  ];
  
  for (let i = 0; i < count; i++) {
    const currentMonthIndex = (month + i) % 12;
    const currentYearOffset = Math.floor((month + i) / 12);
    const targetYear = year + currentYearOffset;
    const targetYearShort = String(targetYear).substring(2);
    
    const label = `${frenchMonths[currentMonthIndex]}-${targetYearShort}`;
    const key = `${targetYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
    
    months.push({ key, label });
  }
  return months;
};

const formatCurrency = (val: number, showDashForZero: boolean = true) => {
  if (val === 0 && showDashForZero) {
    return '- FCFA';
  }
  const formatted = Math.abs(val).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  // Replace all spaces with non-breaking spaces
  const spaceFormatted = formatted.replace(/\u202f/g, '\u00A0').replace(/\s/g, '\u00A0');
  if (val < 0) {
    return `-\u00A0${spaceFormatted}\u00A0FCFA`;
  }
  return `${spaceFormatted}\u00A0FCFA`;
};

const BilanLocataireView: React.FC<{
  tenant: Tenant;
  onBack: () => void;
}> = ({ tenant, onBack }) => {
  const [paymentsData, setPaymentsData] = useState<Record<string, PaymentRecord>>({});
  const [editingCell, setEditingCell] = useState<{ monthKey: string; field: 'loyer' | 'paye' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem(`habitia_tenant_payments_${tenant.id}`);
    if (saved) {
      try {
        setPaymentsData(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing payments data:", e);
      }
    }
  }, [tenant.id]);

  const updatePayment = (monthKey: string, field: 'loyer' | 'paye', value: number) => {
    const updated = {
      ...paymentsData,
      [monthKey]: {
        ...paymentsData[monthKey],
        loyer: field === 'loyer' ? value : (paymentsData[monthKey]?.loyer ?? tenant.loyer ?? 0),
        paye: field === 'paye' ? value : (paymentsData[monthKey]?.paye ?? 0)
      }
    };
    setPaymentsData(updated);
    localStorage.setItem(`habitia_tenant_payments_${tenant.id}`, JSON.stringify(updated));
  };

  const months = generateMonthsSequence(tenant.dateDebut, 13);

  let cumulativeExpected = 0;
  let cumulativePaid = 0;

  const rows = months.map((m) => {
    const monthKey = m.key;
    const record = paymentsData[monthKey];
    
    const loyer = record?.loyer ?? tenant.loyer ?? 0;
    const paye = record?.paye ?? 0;
    
    cumulativeExpected += loyer;
    cumulativePaid += paye;
    
    const solde = cumulativePaid - cumulativeExpected;
    const reliquat = solde < 0 ? Math.abs(solde) : 0;
    
    const avance = solde > 0 && loyer > 0 ? Math.max(0, Math.round(solde / loyer)) : 0;
    const retard = solde < 0 && loyer > 0 ? Math.max(0, Math.round(Math.abs(solde) / loyer)) : 0;
    
    let statut: 'avance' | 'ajour' | 'retard' = 'ajour';
    if (solde > 0) statut = 'avance';
    else if (solde < 0) statut = 'retard';
    
    return {
      monthKey,
      label: m.label,
      loyer,
      paye,
      totalPaye: paye > 0 ? cumulativePaid : 0,
      solde,
      reliquat,
      avance,
      retard,
      statut
    };
  });

  const totalLoyer = rows.reduce((sum, r) => sum + r.loyer, 0);
  const totalPayeSum = rows.reduce((sum, r) => sum + r.paye, 0);
  const finalRow = rows[rows.length - 1];
  const finalSolde = finalRow ? finalRow.solde : 0;
  const finalReliquat = finalRow ? finalRow.reliquat : 0;
  const finalAvance = finalRow ? finalRow.avance : 0;
  const finalRetard = finalRow ? finalRow.retard : 0;
  const finalStatut = finalRow ? finalRow.statut : 'ajour';

  // Current month calculation for global Bilan de Situation card
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  let currentStatusRow = rows.find(r => r.monthKey === currentKey);
  if (!currentStatusRow) {
    const pastRows = rows.filter(r => r.monthKey <= currentKey);
    if (pastRows.length > 0) {
      currentStatusRow = pastRows[pastRows.length - 1];
    } else {
      currentStatusRow = rows[0];
    }
  }

  const cardSolde = currentStatusRow ? currentStatusRow.solde : 0;
  const cardReliquat = currentStatusRow ? currentStatusRow.reliquat : 0;
  const cardAvance = currentStatusRow ? currentStatusRow.avance : 0;
  const cardRetard = currentStatusRow ? currentStatusRow.retard : 0;
  const cardStatut = currentStatusRow ? currentStatusRow.statut : 'ajour';

  const handleStartEdit = (monthKey: string, field: 'loyer' | 'paye', currentVal: number) => {
    setEditingCell({ monthKey, field });
    setEditValue(currentVal === 0 ? '' : String(currentVal));
  };

  const handleBlur = () => {
    if (editingCell) {
      const val = editValue === '' ? 0 : Number(editValue);
      if (!isNaN(val)) {
        updatePayment(editingCell.monthKey, editingCell.field, val);
      }
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div className="space-y-6 print-full">
      {/* Print styling injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 15px !important;
            margin-bottom: 20px !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 4px 6px !important;
            font-size: 10px !important;
            color: black !important;
            white-space: nowrap !important;
          }
          th {
            background-color: #f1f5f9 !important;
          }
        }
      ` }} />

      {/* Print Title Header (Only visible when printing) */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-3">
        <h1 className="text-2xl font-bold text-slate-800">HABITIA - BILAN LOCATIF</h1>
        <p className="text-xs text-slate-500">Généré le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>
      
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Retour
          </Button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
              Bilan Locataire : {tenant.prenom} {tenant.nom}
            </h1>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Grille automatisée sur 13 mois glissants à partir du début de bail.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-sm">
            <Printer size={16} />
            Imprimer le Bilan
          </Button>
        </div>
      </div>

      {/* Profile and Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-grid">
        
        {/* Locataire Card */}
        <Card className="p-5 space-y-4 print:border print:p-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white font-bold print:hidden">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white print:text-sm">Dossier Locataire</h3>
              <p className="text-xs text-slate-400 print:hidden">Coordonnées & Justificatifs</p>
            </div>
          </div>
          <div className="space-y-2 text-sm print:text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Nom Complet:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap text-right">{tenant.prenom} {tenant.nom}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Email:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-xs text-right break-all">{tenant.email}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Téléphone:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap text-right">{tenant.telephone}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Employeur:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-right">{tenant.employeur || '-'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Garant:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-right">{tenant.garant || '-'}</span>
            </div>
          </div>
        </Card>

        {/* Logement Card */}
        <Card className="p-5 space-y-4 print:border print:p-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-success-600 to-success-400 flex items-center justify-center text-white font-bold print:hidden">
              <Building size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white print:text-sm">Bail & Logement</h3>
              <p className="text-xs text-slate-400 print:hidden">Conditions contractuelles</p>
            </div>
          </div>
          <div className="space-y-2 text-sm print:text-xs">
            <div className="flex flex-col">
              <span className="text-slate-400 whitespace-nowrap">Adresse du Bien:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{tenant.bienAdresse || 'Non attribué'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Loyer de Base:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap text-right">{tenant.loyer ? formatCurrency(tenant.loyer, false) : '-'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Caution versée:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap text-right">{tenant.caution ? formatCurrency(tenant.caution, false) : '-'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Date début bail:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap text-right">
                {tenant.dateDebut ? new Date(tenant.dateDebut).toLocaleDateString('fr-FR') : '-'}
              </span>
            </div>
          </div>
        </Card>

        {/* Situation Card */}
        <Card className="p-5 space-y-4 print:border print:p-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-warning-600 to-warning-400 flex items-center justify-center text-white font-bold print:hidden">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white print:text-sm">Situation Actuelle</h3>
              <p className="text-xs text-slate-400 print:hidden">Calculs consolidés au mois en cours</p>
            </div>
          </div>
          <div className="space-y-2 text-sm print:text-xs">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400 whitespace-nowrap">Statut Financier:</span>
              {cardStatut === 'avance' && (
                <Badge variant="neutral" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30 whitespace-nowrap">
                  En avance
                </Badge>
              )}
              {cardStatut === 'ajour' && (
                <Badge variant="success" className="whitespace-nowrap">À jour</Badge>
              )}
              {cardStatut === 'retard' && (
                <Badge variant="danger" className="whitespace-nowrap">Pas à jour</Badge>
              )}
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Solde Cumulé:</span>
              <span className={`font-bold whitespace-nowrap text-right ${cardSolde < 0 ? 'text-danger-500' : cardSolde > 0 ? 'text-blue-500' : 'text-success-500'}`}>
                {formatCurrency(cardSolde, false)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Dette (Reliquat):</span>
              <span className={`font-bold whitespace-nowrap text-right ${cardReliquat > 0 ? 'text-danger-500' : 'text-slate-500'}`}>
                {formatCurrency(cardReliquat, false)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Mois d'Avance:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap text-right">{cardAvance}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap">Mois de Retard:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap text-right">{cardRetard}</span>
            </div>
          </div>
        </Card>

      </div>

      {/* Instructions Tip */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-xs text-slate-400 dark:text-slate-500 flex items-center gap-2 no-print">
        <span className="text-primary-500 font-bold">Astuce :</span>
        <span>Double-cliquez ou cliquez sur les cellules des colonnes <strong className="text-slate-700 dark:text-slate-300">Loyer</strong> et <strong className="text-slate-700 dark:text-slate-300">Payé ce mois</strong> pour modifier leurs valeurs en temps réel. Appuyez sur Entrée pour valider.</span>
      </div>

      {/* LEDGER TABLE */}
      <Card className="overflow-x-auto p-0 border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-premium rounded-xl print:border-none print:shadow-none">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300 text-xs">
              <th className="px-3.5 py-2.5 text-center w-24 whitespace-nowrap">Mois</th>
              <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Loyer</th>
              <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Payé ce mois</th>
              <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Total payé</th>
              <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Solde</th>
              <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Reliquat</th>
              <th className="px-3.5 py-2.5 text-center w-24 whitespace-nowrap">Avance(mois)</th>
              <th className="px-3.5 py-2.5 text-center w-24 whitespace-nowrap">Retard(mois)</th>
              <th className="px-3.5 py-2.5 text-center w-32 whitespace-nowrap">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
            {rows.map((row) => (
              <tr key={row.monthKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                {/* Month */}
                <td className="px-3.5 py-2.5 text-center font-medium text-slate-800 dark:text-slate-200 bg-slate-50/30 dark:bg-slate-900/10 border-r border-slate-100 dark:border-slate-850 whitespace-nowrap">
                  {row.label}
                </td>
                
                {/* Loyer */}
                <td className="px-3.5 py-2.5 text-right font-semibold whitespace-nowrap">
                  {editingCell?.monthKey === row.monthKey && editingCell?.field === 'loyer' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleBlur}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full bg-white dark:bg-slate-950 border border-primary-500 text-right px-2 py-0.5 rounded text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  ) : (
                    <div 
                      onClick={() => handleStartEdit(row.monthKey, 'loyer', row.loyer)}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200 transition-colors inline-block w-full text-right"
                    >
                      {formatCurrency(row.loyer, false)}
                    </div>
                  )}
                </td>
                
                {/* Paye ce mois */}
                <td className="px-3.5 py-2.5 text-right font-semibold whitespace-nowrap">
                  {editingCell?.monthKey === row.monthKey && editingCell?.field === 'paye' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleBlur}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full bg-white dark:bg-slate-950 border border-primary-500 text-right px-2 py-0.5 rounded text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  ) : (
                    <div 
                      onClick={() => handleStartEdit(row.monthKey, 'paye', row.paye)}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200 transition-colors inline-block w-full text-right"
                    >
                      {formatCurrency(row.paye)}
                    </div>
                  )}
                </td>
                
                {/* Total paye */}
                <td className="px-3.5 py-2.5 text-right font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatCurrency(row.totalPaye)}
                </td>
                
                {/* Solde */}
                <td className={`px-3.5 py-2.5 text-right font-bold whitespace-nowrap ${row.solde < 0 ? 'text-danger-500' : row.solde > 0 ? 'text-blue-500' : 'text-success-500'}`}>
                  {formatCurrency(row.solde)}
                </td>
                
                {/* Reliquat */}
                <td className={`px-3.5 py-2.5 text-right font-bold whitespace-nowrap ${row.reliquat > 0 ? 'text-danger-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {formatCurrency(row.reliquat)}
                </td>
                
                {/* Avance (mois) */}
                <td className="px-3.5 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {row.avance}
                </td>
                
                {/* Retard (mois) */}
                <td className="px-3.5 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {row.retard}
                </td>
                
                {/* Statut */}
                <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                  {row.statut === 'avance' && (
                    <Badge variant="neutral" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30 whitespace-nowrap">
                      En avance
                    </Badge>
                  )}
                  {row.statut === 'ajour' && (
                    <Badge variant="success" className="whitespace-nowrap">À jour</Badge>
                  )}
                  {row.statut === 'retard' && (
                    <Badge variant="danger" className="whitespace-nowrap">Pas à jour</Badge>
                  )}
                </td>
              </tr>
            ))}
            
            {/* TOTAL FOOTER ROW */}
            <tr className="bg-slate-50/80 dark:bg-slate-900/60 font-bold border-t-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <td className="px-3.5 py-3 text-center border-r border-slate-100 dark:border-slate-850 whitespace-nowrap">
                TOTAL=
              </td>
              <td className="px-3.5 py-3 text-right whitespace-nowrap">
                {formatCurrency(totalLoyer, false)}
              </td>
              <td className="px-3.5 py-3 text-right whitespace-nowrap">
                {formatCurrency(totalPayeSum, false)}
              </td>
              <td className="px-3.5 py-3 text-right text-slate-400 dark:text-slate-500 whitespace-nowrap">
                -
              </td>
              <td className={`px-3.5 py-3 text-right whitespace-nowrap ${finalSolde < 0 ? 'text-danger-500' : finalSolde > 0 ? 'text-blue-500' : 'text-success-500'}`}>
                {formatCurrency(finalSolde, false)}
              </td>
              <td className={`px-3.5 py-3 text-right whitespace-nowrap ${finalReliquat > 0 ? 'text-danger-500' : ''}`}>
                {formatCurrency(finalReliquat, false)}
              </td>
              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                {finalAvance}
              </td>
              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                {finalRetard}
              </td>
              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                {finalStatut === 'avance' && (
                  <Badge variant="neutral" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30 whitespace-nowrap">
                    En avance
                  </Badge>
                )}
                {finalStatut === 'ajour' && (
                  <Badge variant="success" className="whitespace-nowrap">À jour</Badge>
                )}
                {finalStatut === 'retard' && (
                  <Badge variant="danger" className="whitespace-nowrap">Pas à jour</Badge>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

    </div>
  );
};

export const Locataires: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [biens, setBiens] = useState<any[]>([]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema)
  });

  const getHeaders = () => ['Nom & Prénom', 'Email', 'Téléphone', 'Logement Actuel', 'Statut', 'Actions'];

  // Load Tenants
  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithRetry(`/api/locataires?search=${search}`);
      if (response.ok) {
        const result = await response.json();
        setTenants(result.data || []);
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error("Error loading tenants:", e);
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Biens
  const loadBiens = async () => {
    try {
      const response = await fetchWithRetry('/api/biens');
      if (response.ok) {
        const result = await response.json();
        setBiens(result || []);
      }
    } catch (e) {
      console.error("Error loading properties:", e);
    }
  };

  useEffect(() => {
    loadTenants();
  }, [search]);

  useEffect(() => {
    loadBiens();
  }, []);

  const watchedBienId = watch('bienId');

  useEffect(() => {
    if (watchedBienId) {
      const selectedBien = biens.find(b => b.id === watchedBienId);
      if (selectedBien) {
        setValue('loyer', selectedBien.loyer);
        setValue('caution', selectedBien.caution);
      }
    } else {
      setValue('loyer', undefined);
      setValue('caution', undefined);
    }
  }, [watchedBienId, biens, setValue]);

  // Create Tenant
  const onCreateSubmit = async (data: TenantFormValues) => {
    try {
      const response = await fetchWithRetry('/api/locataires', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setIsCreateOpen(false);
        reset();
        loadTenants();
      } else {
        const errData = await response.json();
        alert(errData.error || "Erreur lors de la création du locataire.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau. Impossible d'ajouter le locataire.");
    }
  };

  // Setup Edit
  const handleEditClick = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setValue('nom', tenant.nom);
    setValue('prenom', tenant.prenom);
    setValue('email', tenant.email);
    setValue('telephone', tenant.telephone);
    setValue('employeur', tenant.employeur || '');
    setValue('garant', tenant.garant || '');
    setValue('statut', tenant.statut);
    setValue('bienId', tenant.bienId || '');
    setValue('loyer', tenant.loyer);
    setValue('caution', tenant.caution);
    setValue('dateDebut', tenant.dateDebut || '');
  };

  // Submit Edit
  const onEditSubmit = async (data: TenantFormValues) => {
    if (!editingTenant) return;
    try {
      const response = await fetchWithRetry(`/api/locataires/${editingTenant.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setEditingTenant(null);
        reset();
        loadTenants();
      } else {
        const errData = await response.json();
        alert(errData.error || "Erreur lors de la modification du locataire.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau. Impossible de modifier le locataire.");
    }
  };

  // Delete Tenant
  const handleDelete = async (id: string) => {
    if (!await customConfirm("Voulez-vous vraiment supprimer ce locataire ?")) return;
    try {
      const response = await fetchWithRetry(`/api/locataires/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadTenants();
      } else {
        const errData = await response.json();
        alert(errData.error || "Erreur lors de la suppression du locataire.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau. Impossible de supprimer le locataire. Veuillez vérifier votre connexion.");
    }
  };

  // Send Email rent receipt mock
  const handleSendReceipt = async (id: string) => {
    try {
      const response = await fetchWithRetry(`/api/locataires/${id}/send-receipt`, {
        method: 'POST'
      });
      const data = await response.json();
      alert(data.message || "Quittance de loyer envoyée par e-mail !");
    } catch (e) {
      alert("Quittance de loyer envoyée par e-mail avec succès ! (Mode Hors-ligne)");
    }
  };

  const getStatutBadge = (status: string) => {
    switch (status) {
      case 'actif': return <Badge variant="success">Actif</Badge>;
      case 'ancien': return <Badge variant="neutral">Ancien Locataire</Badge>;
      case 'liste_attente': return <Badge variant="warning">En attente</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (viewingTenant) {
    return (
      <BilanLocataireView 
        tenant={viewingTenant} 
        onBack={() => setViewingTenant(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            Locataires
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Suivi des dossiers locatifs, employeurs, garants et facturations.
          </p>
        </div>
        <div>
          <Button onClick={() => { reset(); setIsCreateOpen(true); }} className="flex items-center gap-2">
            <Plus size={18} />
            Ajouter un Locataire
          </Button>
        </div>
      </div>

      {/* SEARCH CARD */}
      <Card className="py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, employeur ou statut..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* TABLE */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : tenants.length === 0 ? (
        <EmptyState
          title="Aucun locataire trouvé"
          description="Essayez de modifier votre recherche ou ajoutez un nouveau profil locataire."
          ctaText="Ajouter un locataire"
          onCtaClick={() => setIsCreateOpen(true)}
        />
      ) : (
        <Table headers={getHeaders()}>
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">
                {tenant.prenom} {tenant.nom}
              </td>
              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                {tenant.email}
              </td>
              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                {tenant.telephone}
              </td>
              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                {tenant.bienAdresse}
              </td>
              <td className="px-5 py-4 text-sm">
                {getStatutBadge(tenant.statut)}
              </td>
              <td className="px-5 py-4 text-sm flex items-center gap-2">
                <button
                  onClick={() => setViewingTenant(tenant)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg"
                  title="Fiche détaillée"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleSendReceipt(tenant.id)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-warning-500 rounded-lg"
                  title="Envoyer quittance par e-mail"
                >
                  <Send size={16} />
                </button>
                <button
                  onClick={() => handleEditClick(tenant)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-500 rounded-lg"
                  title="Modifier"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(tenant.id)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-danger-500 rounded-lg"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Ajouter un Locataire">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom" error={errors.nom?.message} {...register('nom')} />
            <Input label="Prénom" error={errors.prenom?.message} {...register('prenom')} />
          </div>
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Téléphone" error={errors.telephone?.message} {...register('telephone')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Employeur (Société / Poste)" error={errors.employeur?.message} {...register('employeur')} />
            <Input label="Garant (Nom & Lien)" error={errors.garant?.message} {...register('garant')} />
          </div>
          <Select 
            label="Statut du Locataire"
            options={[
              { value: 'actif', label: 'Locataire Actif' },
              { value: 'liste_attente', label: "Sur Liste d'attente" },
              { value: 'ancien', label: 'Ancien Locataire' }
            ]}
            error={errors.statut?.message}
            {...register('statut')}
          />
          <Select 
            label="Mois de début du bail"
            options={monthOptions}
            error={errors.dateDebut?.message}
            {...register('dateDebut')}
          />
          <Select 
            label="Logement à occuper"
            options={[
              { value: '', label: '-- Sélectionner un bien --' },
              ...biens
                .filter(b => b.statut === 'disponible')
                .map(b => ({
                  value: b.id,
                  label: `${b.adresse} (${b.ville}) - Loyer: ${b.loyer.toLocaleString()} FCFA - Caution: ${b.caution.toLocaleString()} FCFA`
                }))
            ]}
            error={errors.bienId?.message}
            {...register('bienId')}
          />
          {watchedBienId && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
              <Input 
                label="Loyer Mensuel (FCFA)" 
                type="number" 
                error={errors.loyer?.message} 
                {...register('loyer')} 
              />
              <Input 
                label="Caution / Dépôt (FCFA)" 
                type="number" 
                error={errors.caution?.message} 
                {...register('caution')} 
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button type="submit">Valider</Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={editingTenant !== null} onClose={() => setEditingTenant(null)} title="Modifier le Locataire">
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom" error={errors.nom?.message} {...register('nom')} />
            <Input label="Prénom" error={errors.prenom?.message} {...register('prenom')} />
          </div>
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Téléphone" error={errors.telephone?.message} {...register('telephone')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Employeur" error={errors.employeur?.message} {...register('employeur')} />
            <Input label="Garant" error={errors.garant?.message} {...register('garant')} />
          </div>
          <Select 
            label="Statut"
            options={[
              { value: 'actif', label: 'Locataire Actif' },
              { value: 'liste_attente', label: "Sur Liste d'attente" },
              { value: 'ancien', label: 'Ancien Locataire' }
            ]}
            error={errors.statut?.message}
            {...register('statut')}
          />
          <Select 
            label="Mois de début du bail"
            options={monthOptions}
            error={errors.dateDebut?.message}
            {...register('dateDebut')}
          />
          <Select 
            label="Logement à occuper"
            options={[
              { value: '', label: '-- Aucun bien --' },
              ...biens
                .filter(b => b.statut === 'disponible' || b.id === (editingTenant?.bienId || ''))
                .map(b => ({
                  value: b.id,
                  label: `${b.adresse} (${b.ville}) - Loyer: ${b.loyer.toLocaleString()} FCFA - Caution: ${b.caution.toLocaleString()} FCFA`
                }))
            ]}
            error={errors.bienId?.message}
            {...register('bienId')}
          />
          {watchedBienId && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
              <Input 
                label="Loyer Mensuel (FCFA)" 
                type="number" 
                error={errors.loyer?.message} 
                {...register('loyer')} 
              />
              <Input 
                label="Caution / Dépôt (FCFA)" 
                type="number" 
                error={errors.caution?.message} 
                {...register('caution')} 
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setEditingTenant(null)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>



    </div>
  );
};
export default Locataires;
