import React, { useState, useMemo } from 'react';
import { TransactionLog, UserRole, InventoryItem, MaterialOutRecord } from '../types';
import { ArrowUpRight, ArrowDownLeft, Search, Send, X, Loader2, FileText, Hash, CreditCard, User, ChevronDown, ChevronUp, Box, Calendar, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { transactionApi, inventoryApi } from '../services/api';

interface TransactionsProps {
  transactions: TransactionLog[];
  setTransactions: React.Dispatch<React.SetStateAction<TransactionLog[]>>;
  items?: InventoryItem[];
  setItems?: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  userRole: UserRole;
}

// Interface helper untuk struktur Grouping
interface OutboundGroup {
    issueNumber: string;
    date: string;
    receiver: string;
    wbs: string;
    glAccount: string;
    items: TransactionLog[];
    totalQty: number;
    itemCount: number;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, setTransactions, items, setItems, userRole }) => {
  const [activeTab, setActiveTab] = useState<'IN' | 'OUT'>('OUT');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Expand/Collapse State for Groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Form State
  const [formData, setFormData] = useState<Partial<MaterialOutRecord>>({
      issueNumber: '', wbs: '', glAccount: '', glNumber: '', goodReceipt: '', remarks: '',
      date: new Date().toISOString().split('T')[0]
  });
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [outQty, setOutQty] = useState(1);

  // --- 1. FILTERING & GROUPING LOGIC ---
  
  const filteredRawTransactions = useMemo(() => {
      return transactions
        .filter(t => t.type === activeTab)
        .filter(t => 
          t.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          t.materialNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.issueNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.remark?.toLowerCase().includes(searchTerm.toLowerCase())
        );
  }, [transactions, activeTab, searchTerm]);

  // Logic Grouping khusus OUTBOUND
  const groupedOutbound = useMemo(() => {
      if (activeTab !== 'OUT') return [];

      const groups: Record<string, OutboundGroup> = {};

      filteredRawTransactions.forEach(tx => {
          // Gunakan Issue Number sebagai kunci grouping. Jika kosong, masukkan ke grup 'NO-ISSUE' atau handle terpisah
          const key = tx.issueNumber || 'MISC-ISSUE';

          if (!groups[key]) {
              groups[key] = {
                  issueNumber: key,
                  date: tx.date,
                  receiver: tx.receiver || '-',
                  wbs: tx.wbs || '-',
                  glAccount: tx.glAccount || '-',
                  items: [],
                  totalQty: 0,
                  itemCount: 0
              };
          }
          groups[key].items.push(tx);
          groups[key].totalQty += tx.quantity;
          groups[key].itemCount += 1;
      });

      // Sortir berdasarkan tanggal terbaru (ambil tanggal dari item pertama di grup)
      return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredRawTransactions, activeTab]);

  // --- 2. PAGINATION LOGIC ---

  // Tentukan data mana yang akan dipaginate (Grouped untuk OUT, Flat untuk IN)
  const dataToPaginate = activeTab === 'OUT' ? groupedOutbound : filteredRawTransactions;
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = dataToPaginate.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(dataToPaginate.length / itemsPerPage);

  // Reset halaman saat tab/search berubah
  useMemo(() => {
      setCurrentPage(1);
  }, [activeTab, searchTerm]);

  // --- 3. HANDLERS ---

  const toggleGroupExpansion = (issueNumber: string) => {
      const newSet = new Set(expandedGroups);
      if (newSet.has(issueNumber)) newSet.delete(issueNumber);
      else newSet.add(issueNumber);
      setExpandedGroups(newSet);
  };

  const handleCreateOutbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items || !selectedMaterialId) return;

    const selectedItem = items.find(i => i.id === selectedMaterialId);
    if (!selectedItem) return alert("Invalid material");
    if (outQty > selectedItem.quantity) return alert(`Insufficient stock! Available: ${selectedItem.quantity}`);

    setIsSaving(true);
    const payload: MaterialOutRecord = {
        id: 0,
        materialNo: selectedItem.materialNo,
        materialDesc: selectedItem.name,
        quantity: outQty,
        uom: selectedItem.uom,
        date: formData.date!,
        sloc: selectedItem.sloc,
        goodReceipt: formData.goodReceipt || 'Unknown',
        remarks: formData.remarks || '',
        createdAt: new Date().toISOString(),
        issueNumber: formData.issueNumber || `ISS-${Date.now()}`,
        wbs: formData.wbs || '',
        glNumber: formData.glNumber || '',
        glAccount: formData.glAccount || '',
        keterangan: formData.remarks || ''
    };

    const success = await transactionApi.createOutbound(payload);

    if (success) {
        const newLog: TransactionLog = {
            id: `NEW-${Date.now()}`,
            materialNo: payload.materialNo,
            itemName: payload.materialDesc,
            sku: payload.materialNo,
            type: 'OUT',
            quantity: payload.quantity,
            date: payload.date,
            status: 'COMPLETED',
            issueNumber: payload.issueNumber,
            wbs: payload.wbs,
            glAccount: payload.glAccount,
            receiver: payload.goodReceipt,
            remark: payload.remarks
        };
        setTransactions([newLog, ...transactions]);

        if (setItems) {
            setItems(items.map(i => i.id === selectedMaterialId ? { ...i, quantity: i.quantity - outQty } : i));
        }
        setIsOutboundModalOpen(false);
        setFormData(prev => ({ ...prev, remarks: '' })); // Keep Issue No for rapid entry
        setSelectedMaterialId('');
        setOutQty(1);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 min-h-[80vh]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">Material Transactions</h2>
            <p className="text-[var(--text-secondary)] text-sm font-mono">Logistics Flow Control</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
           <button onClick={() => setIsOutboundModalOpen(true)} className="flex-1 md:flex-none px-6 py-3 bg-rose-600 hover:bg-rose-500 text-[var(--text-primary)] rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-105">
               <Send className="w-4 h-4" /> New Outbound
           </button>
           <div className="bg-white/5 p-1 rounded-xl flex">
               <button onClick={() => setActiveTab('OUT')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'OUT' ? 'bg-rose-600 text-[var(--text-primary)] shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Outbound</button>
               <button onClick={() => setActiveTab('IN')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'IN' ? 'bg-emerald-600 text-[var(--text-primary)] shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Inbound</button>
           </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex gap-4 items-center shadow-md">
         <Search className="w-5 h-5 text-[var(--text-secondary)] ml-2" />
         <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder={activeTab === 'OUT' ? "Search Issue No, Receiver, WBS..." : "Search Inbound..."}
            className="bg-transparent border-none outline-none text-[var(--text-primary)] w-full font-mono text-sm placeholder:text-[var(--text-tertiary)]" 
         />
      </div>

      {/* === LIST VIEW (OUTBOUND GROUPED) === */}
      {activeTab === 'OUT' && (
          <div className="space-y-4">
              {/* Desktop Table Header (Hidden on Mobile) */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider bg-[var(--bg-overlay)] rounded-xl border border-[var(--border-secondary)]">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-3">Issue Number</div>
                  <div className="col-span-2">Receiver</div>
                  <div className="col-span-2">Project / WBS</div>
                  <div className="col-span-2 text-center">Total Items</div>
                  <div className="col-span-1 text-right">Action</div>
              </div>

              {/* Groups List */}
              {currentData.map((group: any) => {
                  // Type assertion for clarity
                  const g = group as OutboundGroup;
                  const isExpanded = expandedGroups.has(g.issueNumber);

                  return (
                    <div key={g.issueNumber} className={`glass-panel rounded-2xl overflow-hidden border transition-all duration-300 ${isExpanded ? 'border-rose-500/30 shadow-[0_0_30px_rgba(225,29,72,0.1)]' : 'border-[var(--border-secondary)]'}`}>
                        
                        {/* Group Header (Clickable) */}
                        <div 
                            onClick={() => toggleGroupExpansion(g.issueNumber)}
                            className="p-4 md:p-5 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            {/* Mobile Layout */}
                            <div className="md:hidden">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
                                            <FileText className="w-4 h-4" />
                                            <span>{g.issueNumber}</span>
                                        </div>
                                        <span className="text-xs text-[var(--text-tertiary)] font-mono flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {g.date}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded text-[10px] font-bold">
                                            {g.itemCount} Items
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-primary)]">
                                    <div className="bg-[var(--bg-overlay)] p-2 rounded">
                                        <span className="block text-[10px] text-[var(--text-tertiary)] uppercase">Receiver</span>
                                        {g.receiver}
                                    </div>
                                    <div className="bg-[var(--bg-overlay)] p-2 rounded">
                                        <span className="block text-[10px] text-[var(--text-tertiary)] uppercase">Project</span>
                                        {g.wbs}
                                    </div>
                                </div>
                                <div className="flex justify-center mt-3">
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-tertiary)]" />}
                                </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-2 text-[var(--text-primary)] font-mono text-sm">{g.date}</div>
                                <div className="col-span-3 font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <div className="p-1.5 bg-rose-500/10 rounded text-rose-400"><FileText className="w-4 h-4" /></div>
                                    {g.issueNumber}
                                </div>
                                <div className="col-span-2 text-sm text-[var(--text-primary)]">{g.receiver}</div>
                                <div className="col-span-2">
                                    <span className="px-2 py-1 rounded bg-white/5 text-xs font-mono text-[var(--text-secondary)] border border-[var(--border-secondary)]">{g.wbs}</span>
                                </div>
                                <div className="col-span-2 text-center">
                                    <span className="text-[var(--text-primary)] font-bold">{g.itemCount}</span> <span className="text-[var(--text-tertiary)] text-xs">items</span>
                                </div>
                                <div className="col-span-1 text-right">
                                    <button className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-rose-500 text-[var(--text-primary)]' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'}`}>
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Details (Items inside the Issue) */}
                        {isExpanded && (
                            <div className="bg-[var(--bg-overlay)] border-t border-[var(--border-secondary)] p-0 md:p-4 animate-in slide-in-from-top-2">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/5 text-[10px] uppercase text-[var(--text-tertiary)] font-bold">
                                            <tr>
                                                <th className="px-4 py-3 pl-6">Material No</th>
                                                <th className="px-4 py-3">Description</th>
                                                <th className="px-4 py-3 text-center">Qty</th>
                                                <th className="px-4 py-3">GL Account</th>
                                                <th className="px-4 py-3">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {g.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-white/5">
                                                    <td className="px-4 py-3 pl-6 font-mono text-rose-300">{item.materialNo}</td>
                                                    <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{item.itemName}</td>
                                                    <td className="px-4 py-3 text-center font-mono font-bold text-[var(--text-primary)]">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-xs font-mono text-[var(--text-secondary)]">{item.glAccount}</td>
                                                    <td className="px-4 py-3 text-xs text-[var(--text-tertiary)] italic">{item.remark || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                  );
              })}

              {currentData.length === 0 && (
                 <div className="text-center py-12 text-[var(--text-tertiary)] glass-panel rounded-2xl border border-[var(--border-secondary)]">
                     <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     No outbound transactions found.
                 </div>
              )}
          </div>
      )}

      {/* === LIST VIEW (INBOUND FLAT) === */}
      {activeTab === 'IN' && (
          <div className="glass-panel rounded-3xl overflow-hidden border border-[var(--border-secondary)]">
             <table className="w-full text-left text-sm">
                <thead className="bg-[var(--bg-overlay)] text-xs uppercase text-[var(--text-secondary)] font-bold">
                    <tr>
                        <th className="px-6 py-5">Date</th>
                        <th className="px-6 py-5">Material</th>
                        <th className="px-6 py-5 text-center">Qty</th>
                        <th className="px-6 py-5">Remarks</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {currentData.map((t: any) => (
                        <tr key={t.id} className="hover:bg-white/5">
                            <td className="px-6 py-4 font-mono text-xs text-[var(--text-secondary)]">{t.date}</td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-[var(--text-primary)]">{t.itemName}</div>
                                <div className="text-xs text-emerald-400 font-mono">{t.materialNo}</div>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-emerald-400">+{t.quantity}</td>
                            <td className="px-6 py-4 text-xs text-[var(--text-tertiary)]">{t.remark}</td>
                        </tr>
                    ))}
                    {currentData.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-8 text-[var(--text-tertiary)]">No inbound data.</td></tr>
                    )}
                </tbody>
             </table>
          </div>
      )}

      {/* PAGINATION CONTROLS */}
      <div className="flex justify-between items-center bg-[var(--bg-overlay)] p-4 rounded-2xl border border-[var(--border-secondary)]">
         <div className="text-xs text-[var(--text-secondary)]">
            Page <span className="text-[var(--text-primary)] font-bold">{currentPage}</span> of {totalPages || 1}
         </div>
         <div className="flex gap-2">
            <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
         </div>
      </div>
      
      {/* Outbound Modal Form */}
      {isOutboundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm" onClick={() => setIsOutboundModalOpen(false)}></div>
            <div className="relative w-full max-w-2xl glass-panel bg-[#0a0a0a] rounded-3xl p-6 md:p-8 border border-rose-500/20 shadow-[0_0_50px_rgba(225,29,72,0.2)] animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                <div className="flex justify-between items-center mb-6 border-b border-[var(--border-secondary)] pb-4 sticky top-0 bg-[#0a0a0a] z-10">
                    <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Send className="w-5 h-5 text-rose-500" /> New Material Issue
                    </h3>
                    <button onClick={() => setIsOutboundModalOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X /></button>
                </div>
                
                <form onSubmit={handleCreateOutbound} className="space-y-5">
                    
                    {/* Material Selection */}
                    <div className="bg-white/5 p-4 rounded-xl border border-[var(--border-secondary)]">
                        <label className="text-xs font-bold text-rose-400 uppercase mb-2 block">Material Selection</label>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <select required value={selectedMaterialId} onChange={(e) => setSelectedMaterialId(e.target.value)} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-rose-500 appearance-none">
                                    <option value="">Select Material...</option>
                                    {items?.map(i => <option key={i.id} value={i.id}>{i.name} ({i.materialNo}) | Qty: {i.quantity}</option>)}
                                </select>
                            </div>
                            <div className="w-full md:w-32">
                                <input type="number" min="1" required value={outQty} onChange={e => setOutQty(parseInt(e.target.value))} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-center font-mono font-bold focus:border-rose-500" placeholder="Qty" />
                            </div>
                        </div>
                    </div>

                    {/* Project & Accounting Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-tertiary)] uppercase mb-2">
                                <FileText className="w-3 h-3" /> Issue Number
                            </label>
                            <input type="text" required value={formData.issueNumber} onChange={e => setFormData({...formData, issueNumber: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-rose-500 font-mono" placeholder="ISS-2024-001" />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-tertiary)] uppercase mb-2">
                                <Hash className="w-3 h-3" /> WBS Element
                            </label>
                            <input type="text" value={formData.wbs} onChange={e => setFormData({...formData, wbs: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-rose-500 font-mono" placeholder="P-001-X" />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-tertiary)] uppercase mb-2">
                                <CreditCard className="w-3 h-3" /> GL Account
                            </label>
                            <input type="text" value={formData.glAccount} onChange={e => setFormData({...formData, glAccount: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-rose-500" placeholder="Cost Center" />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-tertiary)] uppercase mb-2">
                                <User className="w-3 h-3" /> Receiver / User
                            </label>
                            <input type="text" required value={formData.goodReceipt} onChange={e => setFormData({...formData, goodReceipt: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-rose-500" placeholder="Name / Dept" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase mb-2 block">Remarks</label>
                        <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-rose-500 h-20 resize-none" placeholder="Additional notes..."></textarea>
                    </div>
                    
                    <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-[#0a0a0a] pb-2">
                         <button type="button" onClick={() => setIsOutboundModalOpen(false)} className="px-6 py-3 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 font-bold">Cancel</button>
                         <button type="submit" disabled={isSaving} className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-[var(--text-primary)] font-bold rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50">
                             {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                             Confirm Issue
                         </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};