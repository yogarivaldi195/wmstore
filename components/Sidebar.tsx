
import React from 'react';
import { LayoutDashboard, Package, ArrowRightLeft, Sparkles, Settings, LogOut, Hexagon, ClipboardList, Shield, ShoppingCart, Users } from 'lucide-react';
import { UserProfile } from '../types';
import { Language } from '../lib/i18n';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  currentUser: UserProfile;
  onLogout: () => void;
  lang: Language;
  t: any;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, currentUser, onLogout, t }) => {
  
  const allNavItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, roles: ['ADMIN', 'STAFF', 'USER'] },
    { id: 'inventory', label: t.inventory, icon: Package, roles: ['ADMIN', 'STAFF', 'USER'] },
    { id: 'purchase', label: t.purchase, icon: ShoppingCart, roles: ['ADMIN', 'STAFF'] },
    { id: 'opname', label: t.stockOpname, icon: ClipboardList, roles: ['ADMIN', 'STAFF'] },
    { id: 'transactions', label: t.transactions, icon: ArrowRightLeft, roles: ['ADMIN', 'STAFF'] },
    { id: 'users', label: t.users, icon: Users, roles: ['ADMIN'] },
    { id: 'intelligence', label: t.intelligence, icon: Sparkles, roles: ['ADMIN'] },
    { id: 'settings', label: t.settings, icon: Settings, roles: ['ADMIN'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="h-full w-72 p-6 flex flex-col md:perspective-[1000px]">
      <div className="glass-panel h-full rounded-[2rem] flex flex-col relative overflow-hidden md:transition-transform md:duration-500 md:hover:rotate-y-2 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.3)] bg-black/40">
        
        <div className="p-8 flex items-center gap-4 relative z-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-500"></div>
            <div className="relative bg-gradient-to-br from-indigo-600 to-violet-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/30 border border-white/20">
              <Hexagon className="w-6 h-6 text-white fill-white/20" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-[Space_Grotesk] text-glow">eSTORE</h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase font-semibold">WMS Online</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-3 mt-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`group relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-500 overflow-hidden ${
                  isActive
                    ? 'text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-105 translate-x-2'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 to-purple-600/90 opacity-100">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                  </div>
                )}
                
                <div className={`relative z-10 p-1 rounded-lg transition-all duration-300 ${isActive ? 'bg-white/20 shadow-inner' : 'bg-transparent group-hover:bg-white/5'}`}>
                  <item.icon className={`w-5 h-5 transition-all duration-500 ${isActive ? 'text-white scale-110' : 'text-slate-500 group-hover:text-indigo-300'}`} />
                </div>
                
                <span className="relative z-10 font-[Outfit] tracking-wide">{item.label}</span>
                
                {isActive && <div className="absolute right-4 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />}
              </button>
            );
          })}
        </nav>

        <div className="p-6 mx-4 mb-4 border-t border-white/5 bg-black/20 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center border border-white/10">
               {currentUser.role === 'ADMIN' ? <Shield className="w-4 h-4 text-amber-400" /> : <span className="text-xs font-bold">{currentUser.name.substring(0,2).toUpperCase()}</span>}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs text-white font-medium truncate">{currentUser.name}</p>
              <p className={`text-[10px] font-bold tracking-wider ${currentUser.role === 'ADMIN' ? 'text-amber-400' : currentUser.role === 'STAFF' ? 'text-indigo-400' : 'text-slate-500'}`}>
                {currentUser.role} ACCESS
              </p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <LogOut className="w-3.5 h-3.5" />
            {t.logout}
          </button>
        </div>
      </div>
    </div>
  );
};
