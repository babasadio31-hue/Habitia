import React, { useEffect, useState } from 'react';
import { 
  Building2, Home, Receipt, Hammer, 
  ArrowUpRight, AlertTriangle, ArrowDownRight, Clock 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Card, Badge, Skeleton } from '../components/ui';
import { fetchWithRetry } from '../utils/api';

interface DashboardData {
  kpis: {
    totalBiens: number;
    biensLoues: number;
    loyerAttendu: number;
    loyerEncaisse: number;
    chantiersEnCours: number;
  };
  monthlyRentsData: { name: string; montant: number }[];
  bienDistribution: { name: string; value: number; color: string }[];
  alerts: { id: string; type: string; message: string; date: string }[];
  last5Payments: any[];
}

// INITIAL EMPTY STATE STRUCTURE
const emptyData: DashboardData = {
  kpis: {
    totalBiens: 0,
    biensLoues: 0,
    loyerAttendu: 0,
    loyerEncaisse: 0,
    chantiersEnCours: 0
  },
  monthlyRentsData: [],
  bienDistribution: [],
  alerts: [],
  last5Payments: []
};

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetchWithRetry('/api/dashboard/stats');
        if (response.ok) {
          const stats = await response.json();
          
          // Apply local withdrawals data to override or populate the rents KPIs
          try {
            const savedWithdraw = localStorage.getItem('habitia_withdraw_data_react');
            if (savedWithdraw) {
              const parsed = JSON.parse(savedWithdraw);
              let totalAttendu = 0;
              let totalEncaisse = 0;
              let hasLines = false;
              Object.values(parsed).forEach((ownerData: any) => {
                if (ownerData && Array.isArray(ownerData.lines)) {
                  ownerData.lines.forEach((line: any) => {
                    totalAttendu += parseFloat(line.loyerMensuel) || 0;
                    totalEncaisse += parseFloat(line.montantPaye) || 0;
                    hasLines = true;
                  });
                }
              });
              if (hasLines) {
                stats.kpis.loyerAttendu = totalAttendu;
                stats.kpis.loyerEncaisse = totalEncaisse;
              }
            }
          } catch(err) {
            console.error("Error loading local collection stats:", err);
          }
          
          setData(stats);
        }
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatFCFA = (val: number) => {
    return val.toLocaleString('fr-FR') + ' FCFA';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Calculate percentages
  const collectionRate = data.kpis.loyerAttendu > 0 
    ? Math.round((data.kpis.loyerEncaisse / data.kpis.loyerAttendu) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      
      {/* HEADER PAGE */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            Tableau de bord
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Aperçu en temps réel de votre parc immobilier et des finances.
          </p>
        </div>
      </div>

      {/* 4 CARDS KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1 */}
        <Card hoverEffect className="relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Biens</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
                {data.kpis.totalBiens}
              </h3>
            </div>
            <div className="p-3 bg-primary-50 dark:bg-primary-950/20 text-primary-500 dark:text-primary-400 rounded-xl group-hover:scale-110 transition-transform">
              <Building2 size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 flex items-center gap-1">
            <ArrowUpRight size={14} className="text-success-500" />
            <span className="text-success-500 font-bold">+12%</span> depuis le mois dernier
          </p>
        </Card>

        {/* KPI 2 */}
        <Card hoverEffect className="relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Biens Loués</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
                {data.kpis.biensLoues}
              </h3>
            </div>
            <div className="p-3 bg-success-50 dark:bg-success-950/20 text-success-500 dark:text-success-400 rounded-xl group-hover:scale-110 transition-transform">
              <Home size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 flex items-center gap-1">
            Taux d'occupation : <span className="font-bold text-slate-700 dark:text-slate-300">
              {data.kpis.totalBiens > 0 ? Math.round((data.kpis.biensLoues / data.kpis.totalBiens) * 100) : 0}%
            </span>
          </p>
        </Card>

        {/* KPI 3 */}
        <Card hoverEffect className="relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Loyers du Mois</p>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white mt-1">
                {formatFCFA(data.kpis.loyerEncaisse)}
              </h3>
              <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                sur {formatFCFA(data.kpis.loyerAttendu)} attendus
              </p>
            </div>
            <div className="p-3 bg-warning-50 dark:bg-warning-950/20 text-warning-500 dark:text-warning-400 rounded-xl group-hover:scale-110 transition-transform">
              <Receipt size={24} />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-warning-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <p className="text-2xs text-slate-400 dark:text-slate-500 mt-1.5 flex justify-between">
              <span>Recouvrement</span>
              <span className="font-bold text-warning-500">{collectionRate}%</span>
            </p>
          </div>
        </Card>

        {/* KPI 4 */}
        <Card hoverEffect className="relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Chantiers en Cours</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
                {data.kpis.chantiersEnCours}
              </h3>
            </div>
            <div className="p-3 bg-danger-50 dark:bg-danger-950/20 text-danger-500 dark:text-danger-400 rounded-xl group-hover:scale-110 transition-transform">
              <Hammer size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 flex items-center gap-1">
            <Clock size={14} className="text-slate-400" />
            Projets de rénovation & suivi
          </p>
        </Card>

      </div>

      {/* GRAPHICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BAR CHART REVENUE */}
        <Card className="lg:col-span-2 flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Loyers Encaissés</h3>
              <p className="text-2xs text-slate-400 dark:text-slate-500">Évolution mensuelle sur les 12 derniers mois</p>
            </div>
          </div>
          <div className="flex-1 w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyRentsData}>
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip 
                  formatter={(value: any) => [formatFCFA(value), 'Revenu']}
                  contentStyle={{ backgroundColor: '#1F2937', color: '#FFF', borderRadius: '8px', border: 'none' }}
                />
                <Bar dataKey="montant" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* PIE CHART BIENS DISTRIBUTION */}
        <Card className="flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Répartition des Biens</h3>
            <p className="text-2xs text-slate-400 dark:text-slate-500">Statut actuel du parc de logements</p>
          </div>
          <div className="flex-1 h-[220px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.bienDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.bienDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} biens`, 'Nombre']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {data.bienDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-2xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-500 dark:text-slate-400">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* ALERTS & RECENT PAYMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ALERTS PANEL */}
        <Card className="flex flex-col justify-between min-h-[320px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-warning-500" />
              Alertes Récentes (Loyers & Contrats)
            </h3>
            <Badge variant="warning">{data.alerts.length} actives</Badge>
          </div>
          <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[260px] pr-1">
            {data.alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                  alert.type === 'danger' 
                    ? 'bg-danger-50/50 border-danger-100/50 dark:bg-danger-950/10 dark:border-danger-900/20' 
                    : alert.type === 'warning'
                    ? 'bg-warning-50/50 border-warning-100/50 dark:bg-warning-950/10 dark:border-warning-900/20'
                    : 'bg-primary-50/50 border-primary-100/50 dark:bg-primary-950/10 dark:border-primary-900/20'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                  alert.type === 'danger' ? 'bg-danger-500' : alert.type === 'warning' ? 'bg-warning-500' : 'bg-primary-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {alert.message}
                  </p>
                  <p className="text-2xs text-slate-400 mt-0.5">{alert.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* LAST PAYMENTS PANEL */}
        <Card className="flex flex-col justify-between min-h-[320px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Derniers Paiements Reçus
            </h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <th className="pb-2 text-2xs font-bold text-slate-400 uppercase tracking-wider">Locataire</th>
                  <th className="pb-2 text-2xs font-bold text-slate-400 uppercase tracking-wider">Montant</th>
                  <th className="pb-2 text-2xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="pb-2 text-2xs font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {data.last5Payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {p.locataireName}
                    </td>
                    <td className="py-2.5 text-xs font-extrabold text-slate-900 dark:text-white">
                      {formatFCFA(p.montant)}
                    </td>
                    <td className="py-2.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="capitalize">{p.type}</span>
                    </td>
                    <td className="py-2.5 text-xs">
                      <Badge variant={p.statut === 'payé' ? 'success' : 'warning'}>
                        {p.statut === 'payé' ? 'Validé' : 'En retard'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>

    </div>
  );
};
export default Dashboard;
