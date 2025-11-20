
import React, { useState, useEffect } from 'react';
import { InventoryItem, UserRole, StockOpnameSession, StockOpnameItem } from '../types';
import { ClipboardList, CheckCircle2, AlertOctagon, ArrowRight, ShieldAlert, Loader2, Plus, Calendar, Search, ChevronLeft, ChevronRight, ArrowLeft, AlertTriangle, Lock, PieChart, Activity, Save, FileSpreadsheet } from 'lucide-react';
import { stockOpnameApi } from '../services/api';
import * as XLSX from 'xlsx';

interface StockOpnameProps {
  items: InventoryItem[]; // Used for fallback or types, but we mainly use API now
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  userRole: UserRole;
}

export const StockOpname: React.FC<StockOpnameProps> = ({ setItems, userRole }) => {
  const [view, setView] = useState<'LIST' | 'SESSION'>('LIST');
  const [sessions, setSessions] = useState<StockOpnameSession[]>([]);
  const [currentSession, setCurrentSession] = useState<StockOpnameSession | null>(null);
  const [sessionItems, setSessionItems] = useState<StockOpnameItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create Session State
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COUNTED' | 'UNCOUNTED'>('ALL');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // KPI State
  const [stats, setStats] = useState({
      total: 0,
      counted: 0,
      matched: 0,
      variance: 0
  });
  
  // Access Control
  const hasAccess = userRole === 'ADMIN' || userRole === 'STAFF';

  // Check if there is any active session
  const hasOpenSession = sessions.some(s => s.status === 'OPEN');

  // Load Sessions on Mount
  useEffect(() => {
    if (hasAccess) {
        loadSessions();
    }
  }, [hasAccess]);

  // Load Items when page/session changes
  useEffect(() => {
      if (currentSession && view === 'SESSION') {
          loadSessionItems();
      }
  }, [currentSession, page, pageSize, view, statusFilter]); // searchTerm handled by debounce/effect below

  // Effect to handle search
  useEffect(() => {
      if (currentSession && view === 'SESSION') {
          const timeoutId = setTimeout(() => {
             setPage(1); 
             loadSessionItems();
          }, 500);
          return () => clearTimeout(timeoutId);
      }
  }, [searchTerm]);

  const loadSessions = async () => {
      setIsLoading(true);
      const data = await stockOpnameApi.fetchSessions();
      setSessions(data);
      setIsLoading(false);
  };

  const loadSessionItems = async () => {
      if (!currentSession) return;
      setIsLoading(true);
      
      // 1. Server-side filtering & Pagination
      const { items, total } = await stockOpnameApi.fetchSessionItems(
          currentSession.id, 
          page, 
          pageSize, 
          searchTerm, 
          statusFilter
      );
      
      // 2. Fetch Accurate Stats (Server-side)
      const sessionStats = await stockOpnameApi.fetchSessionStats(currentSession.id);
      setStats(sessionStats);

      setSessionItems(items);
      setTotalItems(total);
      setIsLoading(false);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (hasOpenSession) {
          alert("Cannot create new session. An OPEN session already exists.");
          return;
      }

      setIsCreating(true);
      const session = await stockOpnameApi.createSession(newTitle, newNotes, 'Admin'); 
      if (session) {
          setSessions([session, ...sessions]);
          setNewTitle('');
          setNewNotes('');
      }
      setIsCreating(false);
  };

  const handleOpenSession = (session: StockOpnameSession) => {
      setCurrentSession(session);
      setView('SESSION');
      setPage(1);
      setStatusFilter('ALL');
      setSearchTerm('');
  };

  const handleCountChange = async (itemId: string, val: string) => {
      const num = parseFloat(val);
      if (isNaN(num)) return;

      // Optimistic Update
      setSessionItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, physicalQty: num, variance: num - item.systemQty, isCounted: true } : item
      ));

      // API Update
      await stockOpnameApi.updateCount(itemId, num);
  };

  const handleSaveDraft = () => {
      alert("Progress saved successfully. You can resume this session later.");
      setView('LIST');
  };

  const handleExportExcel = async () => {
      if (!currentSession) return;
      setIsLoading(true);
      try {
          // Fetch ALL items without pagination for export
          const allItems = await stockOpnameApi.fetchAllSessionItems(currentSession.id);
          
          if (allItems.length === 0) {
              alert("No data to export.");
              return;
          }

          // Format data for Excel
          const exportData = allItems.map(item => ({
              "Material No": item.materialNo,
              "Description": item.materialDesc,
              "Storage Loc (SLOC)": item.sloc,
              "System Qty": item.systemQty,
              "Physical Qty": item.physicalQty,
              "Variance": item.variance,
              "Status": item.isCounted ? "Counted" : "Pending",
              "Match Status": item.variance === 0 && item.isCounted ? "Match" : "Diff"
          }));

          // Create Workbook
          const worksheet = XLSX.utils.json_to_sheet(exportData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Opname Results");

          // Auto-fit columns (Basic estimation)
          const cols = Object.keys(exportData[0]).map(key => ({ wch: Math.max(key.length, 15) }));
          worksheet['!cols'] = cols;

          // Generate File
          const fileName = `Opname_Result_${currentSession.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
          XLSX.writeFile(workbook, fileName);

      } catch (error) {
          console.error("Export failed", error);
          alert("Failed to export data.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleFinalize = async () => {
      if (!currentSession) return;
      
      const message = "Are you sure you want to finalize? This will update the master inventory quantities based on counted items.";
      
      if (window.confirm(message)) {
          setIsLoading(true);
          const success = await stockOpnameApi.finalizeSession(currentSession.id, sessionItems);
          if (success) {
              setCurrentSession({ ...currentSession, status: 'COMPLETED', closedAt: new Date().toISOString() });
              alert("Session Finalized & Inventory Updated.");
              loadSessionItems();
              loadSessions(); 
              
              const refreshedInventory = await import('../services/api').then(m => m.inventoryApi.fetchAll());
              setItems(refreshedInventory);
          }
          setIsLoading(false);
      }
  };

  if (!hasAccess) {
      return (
        <div className="h-[80vh] flex items-center justify-center">
            <div className="glass-panel p-12 text-center">
                <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Access Denied</h2>
                <p className="text-[var(--text-secondary)]">Stock Opname is restricted to authorized personnel.</p>
            </div>
        </div>
      );
  }

  const progressPercentage = stats.total > 0 ? Math.round((stats.counted / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 min-h-[80vh]">
      
      {/* VIEW: LIST SESSIONS */}
      {view === 'LIST' && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)] font-[Space_Grotesk]">Stock Opname Sessions</h2>
                    <p className="text-[var(--text-secondary)] text-sm font-mono mt-2">Audit Management & Reconciliation</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create New Card */}
                <div className={`glass-panel p-6 rounded-3xl border ${hasOpenSession ? 'border-slate-700 opacity-80' : 'border-[var(--border-secondary)]'}`}>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-emerald-400" /> New Session
                    </h3>
                    
                    {hasOpenSession && (
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 items-start">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div className="text-xs text-amber-200">
                                <p className="font-bold">Session Active</p>
                                <p>Please finalize or cancel the current OPEN session before creating a new one.</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleCreateSession} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Session Title</label>
                            <input 
                                type="text" required 
                                value={newTitle} onChange={e => setNewTitle(e.target.value)}
                                placeholder="e.g., Q1 2024 Audit - Spare Parts"
                                disabled={hasOpenSession}
                                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Notes</label>
                            <textarea 
                                value={newNotes} onChange={e => setNewNotes(e.target.value)}
                                disabled={hasOpenSession}
                                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-emerald-500 h-24 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                            ></textarea>
                        </div>
                        <button disabled={isCreating || hasOpenSession} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-[var(--text-secondary)] text-[var(--text-primary)] font-bold rounded-xl transition-all flex justify-center items-center gap-2">
                            {hasOpenSession ? <Lock className="w-4 h-4" /> : (isCreating ? <Loader2 className="animate-spin" /> : "Start Session")}
                        </button>
                    </form>
                </div>

                {/* History List */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-[var(--border-secondary)] min-h-[400px]">
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-indigo-400" /> Session History
                    </h3>
                    <div className="space-y-3 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
                        {sessions.map(session => (
                            <div key={session.id} className="p-4 rounded-2xl bg-white/5 border border-[var(--border-secondary)] hover:bg-white/10 transition-colors flex justify-between items-center group">
                                <div>
                                    <h4 className="font-bold text-[var(--text-primary)] text-lg">{session.title}</h4>
                                    <div className="flex gap-4 text-xs text-[var(--text-secondary)] mt-1 font-mono">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(session.createdAt).toLocaleDateString()}</span>
                                        <span>Items: {session.totalItems}</span>
                                        <span>By: {session.creator}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${session.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {session.status}
                                    </span>
                                    <button onClick={() => handleOpenSession(session)} className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-[var(--text-primary)] transition-all">
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {sessions.length === 0 && !isLoading && <p className="text-[var(--text-tertiary)] text-center py-10">No sessions found.</p>}
                    </div>
                </div>
            </div>
          </>
      )}

      {/* VIEW: ACTIVE SESSION */}
      {view === 'SESSION' && currentSession && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              {/* Session Header & Controls */}
              <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 mb-6">
                  <button onClick={() => setView('LIST')} className="p-2 bg-white/5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1">
                      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{currentSession.title}</h2>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-mono mt-1">
                          <span className={`px-2 py-0.5 rounded ${currentSession.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{currentSession.status}</span>
                          <span>ID: {currentSession.id.substring(0,8)}...</span>
                          <span>Created: {new Date(currentSession.createdAt).toLocaleDateString()}</span>
                      </div>
                  </div>

                  <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                      <button 
                        onClick={handleExportExcel}
                        disabled={isLoading}
                        className="flex-1 xl:flex-none px-5 py-3 bg-emerald-700/80 hover:bg-emerald-600 text-[var(--text-primary)] font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                      >
                        {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileSpreadsheet className="w-5 h-5" />}
                        Export Excel
                      </button>

                      {currentSession.status === 'OPEN' && (
                          <>
                              <button 
                                onClick={handleSaveDraft}
                                className="flex-1 xl:flex-none px-5 py-3 bg-white/5 hover:bg-white/10 text-[var(--text-primary)] font-bold rounded-xl flex items-center justify-center gap-2"
                              >
                                  <Save className="w-5 h-5" /> Save Draft
                              </button>
                              <button 
                                onClick={handleFinalize}
                                className="flex-1 xl:flex-none px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-[var(--text-primary)] font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                              >
                                  <CheckCircle2 className="w-5 h-5" /> Finalize
                              </button>
                          </>
                      )}
                  </div>
              </div>

              {/* KPI Dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="glass-panel p-4 rounded-2xl border border-[var(--border-secondary)] flex flex-col">
                      <span className="text-[var(--text-secondary)] text-xs font-bold uppercase mb-1">Progress</span>
                      <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-[var(--text-primary)]">{progressPercentage}%</span>
                          <PieChart className="w-5 h-5 text-indigo-400 mb-1" />
                      </div>
                      <div className="w-full bg-white/5 h-1 mt-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                      </div>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-[var(--border-secondary)] flex flex-col">
                      <span className="text-[var(--text-secondary)] text-xs font-bold uppercase mb-1">Accuracy</span>
                      <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-emerald-400">
                             {stats.counted > 0 ? Math.round((stats.matched / stats.counted) * 100) : 100}%
                          </span>
                          <Activity className="w-5 h-5 text-emerald-400 mb-1" />
                      </div>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-[var(--border-secondary)] flex flex-col">
                      <span className="text-[var(--text-secondary)] text-xs font-bold uppercase mb-1">Items Counted</span>
                      <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-[var(--text-primary)]">{stats.counted}</span>
                          <span className="text-sm text-[var(--text-tertiary)] mb-1">/ {stats.total}</span>
                      </div>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-[var(--border-secondary)] flex flex-col">
                      <span className="text-[var(--text-secondary)] text-xs font-bold uppercase mb-1">Variance Detected</span>
                      <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-rose-400">{stats.variance}</span>
                          <AlertOctagon className="w-5 h-5 text-rose-400 mb-1" />
                      </div>
                  </div>
              </div>

              <div className="glass-panel rounded-3xl overflow-hidden border border-[var(--border-secondary)]">
                  {/* Toolbar & Filters */}
                  <div className="p-4 border-b border-[var(--border-secondary)] flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-overlay)]">
                      <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className="relative flex-1 md:flex-none">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                              <input 
                                type="text" 
                                placeholder="Search material..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500 w-full md:w-64" 
                              />
                          </div>
                          
                          <div className="flex bg-[var(--bg-overlay)] rounded-lg p-1 border border-[var(--border-secondary)]">
                              <button 
                                onClick={() => setStatusFilter('ALL')}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${statusFilter === 'ALL' ? 'bg-indigo-600 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                              >
                                  All
                              </button>
                              <button 
                                onClick={() => setStatusFilter('UNCOUNTED')}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${statusFilter === 'UNCOUNTED' ? 'bg-amber-600 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                              >
                                  Uncounted
                              </button>
                              <button 
                                onClick={() => setStatusFilter('COUNTED')}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${statusFilter === 'COUNTED' ? 'bg-emerald-600 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                              >
                                  Counted
                              </button>
                          </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] w-full md:w-auto justify-end">
                          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="hover:text-[var(--text-primary)] disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
                          <span>Page {page} of {Math.ceil(totalItems / pageSize) || 1}</span>
                          <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(totalItems / pageSize)} className="hover:text-[var(--text-primary)] disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
                      </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--bg-overlay)] text-xs uppercase text-[var(--text-secondary)] font-bold">
                            <tr>
                                <th className="px-6 py-4">Material Info</th>
                                <th className="px-6 py-4">SLOC</th>
                                <th className="px-6 py-4 text-center">System Qty</th>
                                <th className="px-6 py-4 text-center bg-indigo-900/10">Physical Count</th>
                                <th className="px-6 py-4 text-center">Variance</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sessionItems.map(item => {
                                const variance = item.physicalQty - item.systemQty;
                                const isMatched = variance === 0 && item.isCounted;
                                
                                return (
                                    <tr key={item.id} className={`hover:bg-white/5 ${item.isCounted ? 'bg-indigo-900/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[var(--text-primary)]">{item.materialDesc}</div>
                                            <div className="text-xs text-[var(--text-tertiary)] font-mono">{item.materialNo}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[var(--text-primary)]">{item.sloc}</td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-[var(--text-secondary)]">
                                            {item.systemQty}
                                        </td>
                                        <td className="px-6 py-4 text-center bg-indigo-900/5">
                                            <input 
                                                type="number" 
                                                disabled={currentSession.status !== 'OPEN'}
                                                value={item.isCounted ? item.physicalQty : ''}
                                                placeholder="-"
                                                onChange={(e) => handleCountChange(item.id, e.target.value)}
                                                className={`w-24 bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-lg py-2 text-center text-[var(--text-primary)] font-bold outline-none focus:border-indigo-500 focus:bg-[var(--bg-overlay)] ${item.isCounted ? 'border-indigo-500/50' : ''}`}
                                            />
                                        </td>
                                        <td className={`px-6 py-4 text-center font-mono font-bold ${variance === 0 ? 'text-[var(--text-tertiary)]' : variance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {item.isCounted ? (variance > 0 ? `+${variance}` : variance) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {item.isCounted ? (
                                                isMatched ? <span className="text-emerald-500 text-xs flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Match</span> 
                                                : <span className="text-rose-500 text-xs flex items-center justify-center gap-1"><AlertOctagon className="w-3 h-3" /> Diff</span>
                                            ) : (
                                                <span className="text-[var(--text-tertiary)] text-xs bg-white/5 px-2 py-1 rounded border border-[var(--border-secondary)]">Pending</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {sessionItems.length === 0 && !isLoading && (
                                <tr><td colSpan={6} className="text-center py-8 text-[var(--text-tertiary)]">No items match your filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                  </div>
                  {isLoading && <div className="p-4 text-center text-[var(--text-secondary)] flex justify-center gap-2"><Loader2 className="animate-spin" /> Loading Data...</div>}
              </div>
          </div>
      )}
    </div>
  );
};
