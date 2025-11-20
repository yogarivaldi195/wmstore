import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, UserRole, AuditEntry, UserProfile, PurchaseOrder } from '../types';
import { Search, Plus, Filter, Trash2, Pencil, Lock, History, CheckSquare, Square, AlertTriangle, ChevronDown, Scale, Briefcase, ShoppingCart, Loader2, ChevronLeft, ChevronRight, Columns, Eye, EyeOff, Tag, MapPin } from 'lucide-react';
import { inventoryApi, purchaseApi } from '../services/api';
import { Language } from '../lib/i18n';
import { InventoryModal } from './InventoryModal';

interface InventoryProps {
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  userRole: UserRole;
  currentUser: UserProfile;
  lang: Language;
  t: any;
}

export const Inventory: React.FC<InventoryProps> = ({ items, setItems, userRole, currentUser, lang, t }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [closingRowId, setClosingRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isProcessingPR, setIsProcessingPR] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
      materialInfo: true,
      identification: true,
      location: true,
      status: true,
      valuation: true
  });
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);

  const canEdit = userRole === 'ADMIN' || userRole === 'STAFF';

  // Memoized Filter Logic
  const criticalItems = useMemo(() => items.filter(i => i.quantity < i.minStock), [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (showLowStockOnly && item.quantity >= item.minStock) return false;
      if (!searchTerm) return true;
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(t => t.trim() !== '');
      const itemText = `${item.name} ${item.materialNo} ${item.sloc} ${item.wbs || ''} ${item.category}`.toLowerCase();
      return searchTerms.every(term => itemText.includes(term));
    });
  }, [items, showLowStockOnly, searchTerm]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = useMemo(() => filteredItems.slice(indexOfFirstItem, indexOfLastItem), [filteredItems, indexOfFirstItem, indexOfLastItem]);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showLowStockOnly, itemsPerPage]);

  const handleAutoProcure = async () => {
    if (criticalItems.length === 0) return;
    if (!window.confirm(`Create Purchase Orders for ${criticalItems.length} items?`)) return;

    setIsProcessingPR(true);
    try {
        for (const item of criticalItems) {
            const targetStock = item.maxStock && item.maxStock > 0 ? item.maxStock : item.minStock * 3;
            const orderQty = Math.max(1, targetStock - item.quantity);

            const newPO: PurchaseOrder = {
                id: '',
                itemId: item.id,
                itemName: item.name,
                quantity: orderQty,
                orderDate: new Date().toISOString().split('T')[0],
                status: 'ORDERED',
                supplier: 'Auto-Restock',
                totalCost: item.price * orderQty
            };
            await purchaseApi.create(newPO);
        }
        alert("Purchase Orders created successfully!");
    } catch (error) {
        console.error("Auto PR failed", error);
        alert("Failed to create some orders.");
    } finally {
        setIsProcessingPR(false);
    }
  };

  const toggleRowExpansion = (id: string) => {
    if (expandedRowId === id) {
      setClosingRowId(id);
      setTimeout(() => {
        setExpandedRowId(null);
        setClosingRowId(null);
      }, 300);
    } else {
      setExpandedRowId(id);
      setClosingRowId(null);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} items? This cannot be undone.`)) {
      setIsSaving(true);
      for (const id of selectedIds) {
          await inventoryApi.delete(id);
      }
      setItems(items.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      setIsSaving(false);
    }
  };

  const handleSaveItem = async (formData: any) => {
    setIsSaving(true);
    try {
      if (editingItem) {
        const changes: string[] = [];
        if (editingItem.name !== formData.name) changes.push(`Name`);
        if (editingItem.quantity !== formData.quantity) changes.push(`Qty`);
        
        const newAuditEntry: AuditEntry = {
            date: new Date().toLocaleString(),
            user: currentUser.name,
            action: 'UPDATE',
            details: changes.length > 0 ? changes.join(', ') : 'Update'
        };

        const itemToUpdate: InventoryItem = {
           ...editingItem,
           ...formData,
           lastUpdated: new Date().toISOString(),
           history: [newAuditEntry, ...editingItem.history]
        };

        await inventoryApi.update(itemToUpdate);
        setItems(items.map(item => item.id === editingItem.id ? itemToUpdate : item));
      } else {
        const compositeId = `${formData.materialNo}:::${formData.sloc}`;
        const newItem: InventoryItem = {
          id: compositeId,
          ...formData,
          lastUpdated: new Date().toISOString(),
          history: [{
              date: new Date().toLocaleString(),
              user: currentUser.name,
              action: 'CREATED',
              details: 'Initial Creation'
          }]
        };
        
        const createdItem = await inventoryApi.create(newItem);
        if (createdItem) {
            setItems([createdItem, ...items]);
        }
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
    }).format(amount);
  };

  // Helper: Hitung Price Per Unit
  const calculateUnitPrice = (totalPrice: number, qty: number) => {
      if (qty <= 0) return 0;
      return totalPrice / qty;
  };

  // --- SHARED DETAIL VIEW COMPONENT (For Table & Mobile Card) ---
  const renderDetailContent = (item: InventoryItem) => (
    <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 border-t border-white/5 bg-indigo-950/5 inner-shadow text-sm">
        
        {/* Detail Column 1: Procurement */}
        <div className="space-y-3">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Procurement Data
            </h4>
            <div className="grid grid-cols-2 gap-3 p-3 md:p-4 rounded-xl bg-black/20 border border-white/5">
                <div>
                    <p className="text-slate-500 text-[10px] uppercase">PR Status</p>
                    <p className="text-white font-mono text-xs md:text-sm">{item.prStatus || 'N/A'}</p>
                </div>
                <div>
                    <p className="text-slate-500 text-[10px] uppercase">PR Number</p>
                    <p className="text-white font-mono text-xs md:text-sm">{item.prNumber || '-'}</p>
                </div>
                <div className="col-span-2">
                    <p className="text-slate-500 text-[10px] uppercase">WBS Element</p>
                    <p className="text-white font-mono text-xs md:text-sm">{item.wbs || 'Not Assigned'}</p>
                </div>
            </div>
        </div>

        {/* Detail Column 2: Inventory Params */}
        <div className="space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Scale className="w-4 h-4" /> Stock Parameters
            </h4>
            <div className="grid grid-cols-2 gap-3 p-3 md:p-4 rounded-xl bg-black/20 border border-white/5">
                <div>
                    <p className="text-slate-500 text-[10px] uppercase">Min Stock</p>
                    <p className="text-rose-400 font-mono font-bold text-xs md:text-sm">{item.minStock}</p>
                </div>
                <div>
                    <p className="text-slate-500 text-[10px] uppercase">Max Stock</p>
                    <p className="text-emerald-400 font-mono font-bold text-xs md:text-sm">{item.maxStock || '-'}</p>
                </div>
                <div>
                    <p className="text-slate-500 text-[10px] uppercase">Unit Cost (Avg)</p>
                    <p className="text-white font-mono text-xs md:text-sm">{formatCurrency(calculateUnitPrice(item.price, item.quantity))}</p>
                </div>
                <div>
                    <p className="text-slate-500 text-[10px] uppercase">Class</p>
                    <p className="text-white font-mono text-xs md:text-sm">{item.category}</p>
                </div>
            </div>
        </div>

        {/* Detail Column 3: Audit Trail */}
        <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" /> Recent Activity
            </h4>
            <div className="p-3 md:p-4 rounded-xl bg-black/20 border border-white/5 h-[140px] overflow-y-auto custom-scrollbar">
                <ul className="space-y-3">
                    {item.history.slice(0, 5).map((log, i) => (
                        <li key={i} className="text-xs border-l-2 border-indigo-500/30 pl-3">
                            <div className="flex justify-between">
                                <span className="text-indigo-300 font-bold">{log.action}</span>
                                <span className="text-slate-600">{log.date.split(',')[0]}</span>
                            </div>
                            <p className="text-slate-400 mt-0.5 truncate">{log.details}</p>
                            <p className="text-slate-600 text-[10px] mt-0.5">by {log.user}</p>
                        </li>
                    ))}
                    {item.history.length === 0 && <li className="text-slate-600 italic">No history recorded</li>}
                </ul>
            </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 min-h-[80vh] relative" onClick={() => setIsColumnMenuOpen(false)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 md:perspective-[1000px]">
        <div className="card-3d origin-left">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight font-[Space_Grotesk] text-glow">eSTORE <span className="text-indigo-500">Stock</span></h2>
          <p className="text-slate-400 mt-2 font-mono text-sm">{t.stockMaster}</p>
        </div>
        
        {canEdit && (
          <div className="flex gap-2 w-full sm:w-auto">
             {selectedIds.size > 0 && (
               <button 
                 onClick={handleBulkDelete}
                 className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg"
               >
                 <Trash2 className="w-5 h-5" />
                 <span className="hidden md:inline">{selectedIds.size} Selected</span>
               </button>
             )}
             <button 
               onClick={openAddModal}
               className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)]"
             >
               <Plus className="w-5 h-5" />
               <span>{t.addMaterial}</span>
             </button>
          </div>
        )}
      </div>

      {/* REORDER ALERT BANNER */}
      {criticalItems.length > 0 && (
        <div className="animate-in slide-in-from-top-4 duration-500 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 animate-pulse">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">{t.reorderAlert}</h3>
                    <p className="text-amber-200/80 text-sm">
                        <span className="font-bold text-amber-400">{criticalItems.length}</span> {t.itemsNeedRestock}
                    </p>
                </div>
            </div>
            
            {canEdit && (
                <button 
                    onClick={handleAutoProcure}
                    disabled={isProcessingPR}
                    className="w-full md:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                    {isProcessingPR ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    {isProcessingPR ? t.creatingPR : t.oneClickPR}
                </button>
            )}
        </div>
      )}

      {/* Controls Bar: Search, Filter, Columns */}
      <div className="glass-panel p-3 rounded-2xl flex flex-col md:flex-row gap-4 items-center relative z-20 shadow-2xl">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder={t.smartSearch} 
            className="w-full pl-12 pr-4 py-3 md:py-4 bg-black/20 border border-white/5 rounded-xl text-white focus:ring-0 placeholder:text-slate-600 font-mono text-sm transition-all focus:bg-black/40"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            {/* Column Toggle Button (Desktop Only) */}
            <div className="relative hidden md:block">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsColumnMenuOpen(!isColumnMenuOpen); }}
                    className={`flex items-center gap-2 px-4 py-3 md:py-4 rounded-xl transition-all border ${isColumnMenuOpen ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                >
                    <Columns className="w-4 h-4" />
                    <span className="font-bold text-sm">Columns</span>
                </button>

                {isColumnMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        <div className="text-xs font-bold text-slate-500 uppercase px-3 py-2">Toggle Columns</div>
                        {Object.entries(visibleColumns).map(([key, isVisible]) => (
                            <button
                                key={key}
                                onClick={() => setVisibleColumns(prev => ({ ...prev, [key]: !isVisible }))}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors"
                            >
                                <span className="text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                {isVisible ? <Eye className="w-4 h-4 text-indigo-400" /> : <EyeOff className="w-4 h-4 text-slate-600" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button 
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`flex items-center gap-2 px-6 py-3 md:py-4 rounded-xl transition-all justify-center border flex-1 md:flex-none ${showLowStockOnly ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'}`}
            >
            {showLowStockOnly ? <AlertTriangle className="w-4 h-4 animate-pulse" /> : <Filter className="w-4 h-4" />}
            <span className="font-bold text-sm">{t.lowStock}</span>
            </button>
        </div>
      </div>

      {/* =================== MOBILE VIEW (CARD LIST) =================== */}
      <div className="md:hidden space-y-4">
        {currentItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isExpanded = expandedRowId === item.id;
            const isLowStock = item.quantity < item.minStock;
            
            // Hitung Unit Price
            const unitPrice = calculateUnitPrice(item.price, item.quantity);

            return (
                <div key={item.id} className={`glass-panel rounded-2xl overflow-hidden border transition-all ${isExpanded ? 'border-indigo-500/50 shadow-lg' : 'border-white/5'}`}>
                    {/* Main Card Content */}
                    <div className="p-4" onClick={() => toggleRowExpansion(item.id)}>
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <button onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }} className="p-1 -ml-2">
                                    {isSelected ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5 text-slate-600" />}
                                </button>
                                <div>
                                    <h3 className="text-white font-bold text-lg leading-tight">{item.name}</h3>
                                    <span className="text-xs text-slate-500 font-mono">{item.materialNo}</span>
                                </div>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${isLowStock ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                                {isLowStock ? 'Low Stock' : 'In Stock'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                             <div className="bg-white/5 rounded-lg p-2">
                                 <p className="text-[10px] text-slate-500 uppercase">Quantity</p>
                                 <p className={`text-lg font-mono font-bold ${isLowStock ? 'text-rose-400' : 'text-emerald-400'}`}>{item.quantity} <span className="text-xs text-slate-500">{item.uom}</span></p>
                             </div>
                             <div className="bg-white/5 rounded-lg p-2">
                                 <p className="text-[10px] text-slate-500 uppercase">Total Valuation</p>
                                 <div className="flex flex-col">
                                    <p className="text-white font-mono font-bold text-sm">{formatCurrency(item.price)}</p>
                                    <p className="text-[10px] text-indigo-300 font-mono">@ {formatCurrency(unitPrice)}</p>
                                 </div>
                             </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {item.category}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.sloc}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {canEdit && (
                                    <button onClick={(e) => openEditModal(e, item)} className="p-2 bg-white/5 rounded-lg text-indigo-400 hover:bg-indigo-500/20">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                    </div>
                    
                    {/* Expanded Details (Mobile) */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        {renderDetailContent(item)}
                    </div>
                </div>
            )
        })}
        {currentItems.length === 0 && (
            <div className="text-center py-12 text-slate-500">No items found.</div>
        )}
      </div>

      {/* =================== DESKTOP VIEW (TABLE) =================== */}
      <div className="hidden md:block glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px] border-collapse">
            <thead className="bg-black/40 text-xs uppercase tracking-widest text-indigo-300 font-bold font-[Space_Grotesk]">
              <tr>
                <th className="px-4 py-6 w-12 text-center">
                    <button onClick={toggleSelectAll} className="hover:text-white transition-colors">
                       {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? 
                         <CheckSquare className="w-5 h-5 text-indigo-500" /> : 
                         <Square className="w-5 h-5 text-slate-600" />
                       }
                    </button>
                </th>
                {visibleColumns.materialInfo && <th className="px-4 py-6">{t.matInfo}</th>}
                {visibleColumns.identification && <th className="px-6 py-6">{t.ident}</th>}
                {visibleColumns.location && <th className="px-6 py-6">{t.location}</th>}
                {visibleColumns.status && <th className="px-6 py-6">{t.status}</th>}
                {visibleColumns.valuation && <th className="px-6 py-6">{t.valuation}</th>}
                <th className="px-6 py-6 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isExpanded = expandedRowId === item.id;
                const isLowStock = item.quantity < item.minStock;
                const isClosing = closingRowId === item.id;
                
                // Hitung Unit Price
                const unitPrice = calculateUnitPrice(item.price, item.quantity);

                const colSpan = 2 + 
                    (visibleColumns.materialInfo ? 1 : 0) +
                    (visibleColumns.identification ? 1 : 0) +
                    (visibleColumns.location ? 1 : 0) +
                    (visibleColumns.status ? 1 : 0) +
                    (visibleColumns.valuation ? 1 : 0);

                return (
                  <React.Fragment key={item.id}>
                    <tr 
                      onClick={() => toggleRowExpansion(item.id)}
                      className={`group transition-all duration-300 cursor-pointer ${isSelected ? 'bg-indigo-900/20' : 'hover:bg-white/[0.02]'} ${isExpanded ? 'bg-white/[0.04]' : ''}`}
                    >
                      <td className="px-4 py-5 text-center">
                          <button onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}>
                             {isSelected ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5 text-slate-700" />}
                          </button>
                      </td>
                      
                      {visibleColumns.materialInfo && (
                          <td className="px-4 py-5">
                              <p className="font-bold text-white text-lg group-hover:text-indigo-300 transition-colors">{item.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-slate-400 border border-white/5">{item.category}</span>
                                {item.isConsumable && <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">Consumable</span>}
                              </div>
                          </td>
                      )}

                      {visibleColumns.identification && (
                          <td className="px-6 py-5">
                              <div className="flex flex-col">
                                  <span className="text-slate-300 font-mono text-xs">MAT: {item.materialNo}</span>
                                  {item.wbs && <span className="text-slate-500 font-mono text-[10px]">WBS: {item.wbs}</span>}
                              </div>
                          </td>
                      )}

                      {visibleColumns.location && (
                          <td className="px-6 py-5">
                            <div className="text-xs">
                                <div className="text-white font-bold">{item.sloc}</div>
                                <div className="text-slate-500 font-mono">{item.rackNo || 'No Rack'}</div>
                            </div>
                          </td>
                      )}

                      {visibleColumns.status && (
                          <td className={`px-6 py-5 ${isLowStock ? 'bg-rose-900/10' : ''}`}>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold text-lg font-mono ${isLowStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {item.quantity}
                                </span>
                                <span className="text-xs text-slate-600">{item.uom}</span>
                            </div>
                          </td>
                      )}

                      {visibleColumns.valuation && (
                          <td className="px-6 py-5 text-white font-mono">
                            <div className="flex flex-col items-start">
                                <span className="font-bold">{formatCurrency(item.price)}</span>
                                <span className="text-xs text-indigo-300/70 mt-1">@ {formatCurrency(unitPrice)}</span>
                            </div>
                          </td>
                      )}

                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2 items-center">
                            <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            {canEdit ? (
                            <>
                                <button onClick={(e) => openEditModal(e, item)} className="p-2 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 rounded-lg"><Pencil className="w-4 h-4" /></button>
                            </>
                            ) : <Lock className="w-4 h-4 text-slate-600 ml-auto" />}
                        </div>
                      </td>
                    </tr>
                    
                    {(isExpanded || isClosing) && (
                      <tr className="bg-black/20">
                        <td colSpan={colSpan} className="p-0 border-0">
                          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded && !isClosing ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {renderDetailContent(item)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {currentItems.length === 0 && (
                 <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No material found matching your criteria.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-center p-4 border-t border-white/5 bg-black/40 gap-4 rounded-b-3xl glass-panel mt-0">
           <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Rows per page:</span>
              <select 
                 value={itemsPerPage}
                 onChange={(e) => setItemsPerPage(Number(e.target.value))}
                 className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white outline-none focus:border-indigo-500"
              >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
              </select>
              <span className="ml-2 hidden md:inline">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredItems.length)} of {filteredItems.length}
              </span>
           </div>

           <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                 <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                        if (currentPage > 3) pageNum = currentPage - 2 + i;
                        if (pageNum > totalPages) pageNum = i + 1 + (totalPages - 5); 
                    }
                    
                    if (pageNum > 0 && pageNum <= totalPages) {
                        return (
                            <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                            >
                                {pageNum}
                            </button>
                        )
                    }
                    return null;
                 })}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                 <ChevronRight className="w-4 h-4" />
              </button>
           </div>
      </div>
      
      <InventoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
        isSaving={isSaving}
        t={t}
        lang={lang}
      />
    </div>
  );
};