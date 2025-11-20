import React, { useState, useEffect } from 'react';
import { InventoryItem, ItemCategory } from '../types';
import { X, Save, Loader2, Sparkles, FileText, Layers, Briefcase, Box, DollarSign, ScanLine, MapPin } from 'lucide-react';
import { suggestItemDetails } from '../services/geminiService';
import { Language } from '../lib/i18n';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: any) => Promise<void>;
  initialData: InventoryItem | null;
  isSaving: boolean;
  t: any;
  lang: Language;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ 
  isOpen, onClose, onSave, initialData, isSaving, t, lang 
}) => {
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('SPARE PART');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [materialNo, setMaterialNo] = useState('');
  const [sloc, setSloc] = useState('');
  const [rackNo, setRackNo] = useState('');
  const [uom, setUom] = useState('PCS');
  const [minStock, setMinStock] = useState(10);
  const [maxStock, setMaxStock] = useState(100);
  const [prStatus, setPrStatus] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [wbs, setWbs] = useState('');
  const [isConsumable, setIsConsumable] = useState(false);

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setCategory(initialData.category);
        setQuantity(initialData.quantity);
        setPrice(initialData.price);
        setDescription(initialData.description || '');
        setMaterialNo(initialData.materialNo);
        setSloc(initialData.sloc);
        setRackNo(initialData.rackNo || '');
        setUom(initialData.uom);
        setMinStock(initialData.minStock);
        setMaxStock(initialData.maxStock || 100);
        setPrStatus(initialData.prStatus || '');
        setPrNumber(initialData.prNumber || '');
        setWbs(initialData.wbs || '');
        setIsConsumable(initialData.isConsumable);
      } else {
        // Reset
        setName('');
        setCategory('SPARE PART');
        setQuantity(0);
        setPrice(0);
        setDescription('');
        setMaterialNo('');
        setSloc('');
        setRackNo('');
        setUom('PCS');
        setMinStock(10);
        setMaxStock(100);
        setPrStatus('');
        setPrNumber('');
        setWbs('');
        setIsConsumable(false);
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name, category, quantity, price, description, materialNo, sloc, rackNo,
      uom, minStock, maxStock, prStatus, prNumber, wbs, isConsumable
    });
  };

  const handleSmartFill = async () => {
    if (!name) return;
    setIsAISuggesting(true);
    const suggestion = await suggestItemDetails(name);
    if (suggestion) {
      const validCats = Object.values(ItemCategory) as string[];
      const upperCat = suggestion.category.toUpperCase();
      const matchedCat = validCats.find(c => c === upperCat) || 'OTHER';
      
      setCategory(matchedCat);
      setDescription(suggestion.description);
      setPrice(suggestion.suggestedPrice);
    }
    setIsAISuggesting(false);
  };

  if (!isOpen) return null;

  return (
    // UPDATED: items-center on all screens (centered modal)
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* Modal Container - Centered & Zoom Animation */}
      <div className="relative w-full md:max-w-5xl h-[95vh] md:h-auto md:max-h-[90vh] glass-panel bg-[#050505] rounded-[2rem] md:rounded-3xl border border-indigo-500/20 shadow-2xl z-50 flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header (Sticky) */}
        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-[#050505]/95 backdrop-blur-md rounded-t-[2rem] md:rounded-t-3xl z-20 shrink-0">
            <div>
                <h3 className="text-xl md:text-2xl font-bold text-white font-[Space_Grotesk]">
                  {initialData ? t.updateEntry : t.createEntry}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1 hidden md:block">
                    {initialData ? "Modify existing material parameters" : "Register new material to database"}
                </p>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-6 md:space-y-8">
            <form id="inventory-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Section 1: Identification */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                    <h4 className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Identification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Material Description</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" required 
                                    value={name} onChange={e => setName(e.target.value)} 
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-700" 
                                    placeholder="Ex: Hydraulic Pump 500W"
                                />
                                <button 
                                    type="button" 
                                    onClick={handleSmartFill} 
                                    disabled={isAISuggesting} 
                                    className="px-4 bg-indigo-600/20 text-indigo-400 rounded-xl hover:bg-indigo-600/30 disabled:opacity-50 border border-indigo-500/30"
                                >
                                    {isAISuggesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Material No (PK)</label>
                            <div className="relative">
                                <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                <input 
                                    type="text" required 
                                    disabled={!!initialData} 
                                    value={materialNo} onChange={e => setMaterialNo(e.target.value)} 
                                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white outline-none font-mono disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500" 
                                    placeholder="MAT-XXXX" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Classification & Procurement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Classification
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Operational Class</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none appearance-none focus:border-emerald-500">
                                    {Object.values(ItemCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Unit (UoM)</label>
                                <input type="text" value={uom} onChange={e => setUom(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:border-emerald-500" placeholder="PCS" />
                            </div>
                            <div className="col-span-2 mt-2">
                                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                    <div className="relative flex items-center">
                                        <input type="checkbox" checked={isConsumable} onChange={e => setIsConsumable(e.target.checked)} className="peer w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-black/50" />
                                    </div>
                                    <div>
                                        <span className="text-white font-bold text-sm block">Is Consumable?</span>
                                        <span className="text-slate-500 text-xs block">Item is consumed upon usage</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <h4 className="text-amber-400 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Project & PR
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">WBS Element</label>
                                <input type="text" value={wbs} onChange={e => setWbs(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none font-mono focus:border-amber-500" placeholder="WBS-..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">PR Number</label>
                                    <input type="text" value={prNumber} onChange={e => setPrNumber(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none font-mono focus:border-amber-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">PR Status</label>
                                    <input type="text" value={prStatus} onChange={e => setPrStatus(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:border-amber-500" placeholder="PENDING" />
                                </div>
                            </div>
                        </div>
                      </div>
                </div>

                {/* Section 3: Inventory & Storage */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                    <h4 className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                        <Box className="w-4 h-4" /> Storage & Levels
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1">
                              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">SLOC (PK)</label>
                              <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                <input type="text" required disabled={!!initialData} value={sloc} onChange={e => setSloc(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white outline-none font-mono disabled:opacity-50 focus:border-purple-500" placeholder="SLOC" />
                              </div>
                        </div>
                        <div className="md:col-span-1">
                              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Rack No</label>
                              <input type="text" value={rackNo} onChange={e => setRackNo(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none font-mono focus:border-purple-500" placeholder="A-01" />
                        </div>
                        <div className="md:col-span-2 bg-black/20 p-4 rounded-xl border border-white/5 grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Min Stock</label>
                                <input type="number" value={minStock} onChange={e => setMinStock(parseInt(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none font-mono text-sm text-center focus:border-rose-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Max Stock</label>
                                <input type="number" value={maxStock} onChange={e => setMaxStock(parseInt(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none font-mono text-sm text-center focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-emerald-400 uppercase mb-1 block">Current</label>
                                <input type="number" required value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="w-full bg-black/80 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-400 font-bold outline-none font-mono text-sm text-center" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 4: Valuation */}
                <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/10 p-6 rounded-2xl border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h4 className="text-indigo-300 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Valuation
                        </h4>
                        <p className="text-slate-500 text-xs mt-1">Set TOTAL asset value (Total Price)</p>
                    </div>
                    <div className="w-full md:w-64">
                          <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-bold">
                                 {lang === 'id' ? 'Rp' : lang === 'jp' ? '¥' : '$'}
                              </span>
                              <input 
                                type="number" required step="0.01" 
                                value={price} onChange={e => setPrice(parseFloat(e.target.value))} 
                                className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white text-right font-mono text-xl font-bold outline-none focus:border-indigo-500 shadow-inner" 
                                placeholder="0" 
                              />
                          </div>
                    </div>
                </div>
            </form>
        </div>

        {/* Footer (Sticky) */}
        <div className="p-4 md:p-6 border-t border-white/10 bg-[#050505] rounded-b-[2rem] md:rounded-b-3xl z-20 shrink-0 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4">
            <button 
                type="button" 
                onClick={onClose} 
                className="w-full md:w-auto px-6 py-3.5 rounded-xl text-slate-400 hover:bg-white/5 font-bold transition-colors text-sm"
            >
                {t.cancel}
            </button>
            <button 
                type="submit" 
                form="inventory-form"
                disabled={isSaving} 
                className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 hover:scale-[1.02]"
            >
                {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                {initialData ? t.save : t.save}
            </button>
        </div>

      </div>
    </div>
  );
};