import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserCheck, Home, 
  Hammer, Receipt, Briefcase, Settings, 
  Menu, X, Sun, Moon, LogOut, Building 
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { name: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Propriétaires', path: '/proprietaires', icon: Users },
    { name: 'Locataires', path: '/locataires', icon: UserCheck },
    { name: 'Biens immobiliers', path: '/biens', icon: Home },
    { name: 'Construction', path: '/construction', icon: Hammer },
    { name: 'Comptabilité', path: '/comptabilite', icon: Receipt },
    { name: 'Personnels', path: '/personnels', icon: Briefcase },
    { name: 'Paramètres', path: '/parametres', icon: Settings },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (user?.role === 'admin') return true;
    if (user?.permissions?.pages) {
      return user.permissions.pages.includes(item.path);
    }
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return '';
    const roles: Record<string, string> = {
      admin: 'Administrateur',
      agent: 'Agent Immobilier',
      comptable: 'Comptable',
      lecture_seule: 'Lecture Seule'
    };
    return roles[role] || role;
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform duration-300 md:translate-x-0 md:static ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* LOGO AREA */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500 rounded-lg text-white">
              <Building size={20} />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent font-sans">
              Habitia
            </span>
          </div>
          <button 
            className="md:hidden text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* MENU ITEMS */}
        <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/15'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* HEADER */}
        <header className="h-16 border-b border-slate-200/60 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          
          {/* MENU TOGGLE FOR MOBILE */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg"
          >
            <Menu size={20} />
          </button>

          {/* PAGE TITLE METRICS placeholder */}
          <div className="hidden md:block">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Système de Gestion Immobilière
            </span>
          </div>

          {/* USER ACTIONS & THEME TOGGLE */}
          <div className="flex items-center gap-4">
            
            {/* THEME TOGGLE */}
            <button
              onClick={toggleTheme}
              className="text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

            {/* USER INFO */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {user?.nom}
                </div>
                <div className="text-2xs font-semibold text-primary-500 dark:text-primary-400">
                  {getRoleLabel(user?.role)}
                </div>
              </div>
              
              {/* DISCONNECT */}
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950/20 p-2 rounded-xl transition-all"
                title="Déconnexion"
              >
                <LogOut size={18} />
              </button>
            </div>

          </div>
        </header>

        {/* CONTAINER FOR CONTENT */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

    </div>
  );
};
export default Layout;
