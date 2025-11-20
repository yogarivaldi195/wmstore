
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { AIInsights } from './components/AIInsights';
import { LoginScreen } from './components/LoginScreen';
import { StockOpname } from './components/StockOpname';
import { Transactions } from './components/Transactions';
import { Purchase } from './components/Purchase';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { InventoryItem, TransactionLog, UserProfile, PurchaseOrder, AppSettings } from './types';
import { Menu, X, Loader2 } from 'lucide-react';
import { inventoryApi, transactionApi, purchaseApi, userApi } from './services/api';
import { supabase } from './lib/supabaseClient';
import { translations, Language } from './lib/i18n';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState('dashboard');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ supabaseUrl: 'https://kgwpxqwlqnfvbzyjtkxi.supabase.co', supabaseKey: '***', enableRealtime: true });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Language State (Default English)
  const [language, setLanguage] = useState<Language>('en');

  // Check active session on startup
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
           const profile = await userApi.getByEmail(session.user.email);
           if (profile && profile.status === 'ACTIVE') {
               setCurrentUser(profile);
           } else {
             await supabase.auth.signOut();
           }
        }
      } catch (error) {
        console.error("Session check failed", error);
      } finally {
        setIsAuthChecking(false);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session) {
            setCurrentUser(null);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Initial Data from Supabase
  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [fetchedItems, fetchedTx, fetchedPo, fetchedUsers] = await Promise.all([
        inventoryApi.fetchAll(),
        transactionApi.fetchAll(),
        purchaseApi.fetchAll(),
        userApi.fetchAll()
      ]);
      
      setItems(fetchedItems);
      setTransactions(fetchedTx);
      setPurchaseOrders(fetchedPo);
      setUsers(fetchedUsers);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [view]);

  const handleLogout = async () => {
      setIsLoadingData(true);
      await supabase.auth.signOut();
      setCurrentUser(null);
      setIsLoadingData(false);
  };

  if (isAuthChecking) {
      return (
          <div className="h-dvh w-screen flex flex-col items-center justify-center bg-black text-white gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
              <p className="font-mono text-sm tracking-widest animate-pulse">ESTABLISHING UPLINK...</p>
          </div>
      );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={(user) => setCurrentUser(user)} users={users} />;
  }

  const t = translations[language];

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-transparent text-slate-200 animate-in fade-in duration-1000">
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-40 md:hidden animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)}></div>
      )}
      
      <div className={`fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-50 bg-black md:bg-transparent w-72`}>
        <Sidebar currentView={view} setView={setView} currentUser={currentUser} onLogout={handleLogout} lang={language} t={t} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative md:perspective-[1000px]">
        
        <div className="md:hidden glass-panel border-b border-white/10 p-4 flex items-center justify-between z-30 relative">
           <div className="font-bold text-white font-[Space_Grotesk] tracking-wide text-glow text-xl">eSTORE</div>
           <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-300 hover:bg-white/10 rounded-lg transition-colors">
             {mobileMenuOpen ? <X /> : <Menu />}
           </button>
        </div>

        {isLoadingData && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-white font-mono text-sm">Synchronizing Database...</p>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 relative z-10 scroll-smooth custom-scrollbar">
          <div className="max-w-[1600px] mx-auto pb-24">
            {view === 'dashboard' && <Dashboard items={items} transactions={transactions} lang={language} t={t} />}
            {view === 'inventory' && (
                <Inventory 
                    items={items} setItems={setItems} 
                    userRole={currentUser.role} currentUser={currentUser} 
                    lang={language} t={t}
                />
            )}
            {view === 'purchase' && <Purchase items={items} setItems={setItems} purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} setTransactions={setTransactions} userRole={currentUser.role} />}
            {view === 'opname' && <StockOpname items={items} setItems={setItems} userRole={currentUser.role} />}
            {view === 'users' && <UserManagement users={users} setUsers={setUsers} currentUser={currentUser} />}
            {view === 'intelligence' && <AIInsights items={items} userRole={currentUser.role} />}
            {view === 'transactions' && <Transactions transactions={transactions} setTransactions={setTransactions} items={items} setItems={setItems} userRole={currentUser.role} />}
            {view === 'settings' && (
                <Settings 
                    settings={settings} setSettings={setSettings} 
                    userRole={currentUser.role} 
                    language={language} setLanguage={setLanguage}
                />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
