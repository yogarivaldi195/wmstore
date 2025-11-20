
import React, { useState } from 'react';
import { InventoryItem, PurchaseOrder, UserRole, TransactionLog } from '../types';
import { ShoppingCart, Plus, PackageOpen, Search, Loader2 } from 'lucide-react';
import { purchaseApi, inventoryApi, transactionApi } from '../services/api';

interface PurchaseProps {
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<TransactionLog[]>>;
  userRole: UserRole;
}

export const Purchase: React.FC<PurchaseProps> = ({ 
    items, setItems, purchaseOrders, setPurchaseOrders, setTransactions, userRole 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [poItemId, setPoItemId] = useState('');
  const [poQty, setPoQty] = useState(10);
  const [poSupplier, setPoSupplier] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find(i => i.id === poItemId);
    if (!item) return;
    
    setIsSaving(true);
    const newPO: PurchaseOrder = {
        id: '',
        itemId: item.id,
        itemName: item.name,
        quantity: poQty,
        orderDate: new Date().toISOString().split('T')[0],
        status: 'ORDERED',
        supplier: poSupplier,
        totalCost: item.price * poQty
    };

    const createdPo = await purchaseApi.create(newPO);
    if (createdPo) {
        setPurchaseOrders([createdPo, ...purchaseOrders]);
        setIsModalOpen(false);
        setPoItemId('');
    }
    setIsSaving(false);
  };

  const handleReceivePO = async (po: PurchaseOrder) => {
      if (window.confirm('Receive stock?')) {
          setIsSaving(true);
          await purchaseApi.updateStatus(po.id, 'RECEIVED');
          setPurchaseOrders(prev => prev.map(p => p.id === po.id ? {...p, status: 'RECEIVED'} : p));

          const itemToUpdate = items.find(i => i.id === po.itemId);
          if (itemToUpdate) {
              const updatedItem = {
                  ...itemToUpdate,
                  quantity: itemToUpdate.quantity + po.quantity,
                  lastUpdated: new Date().toISOString()
              };
              await inventoryApi.update(updatedItem);
              setItems(prev => prev.map(i => i.id === po.itemId ? updatedItem : i));
          }
          setIsSaving(false);
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-white">Purchase Orders</h2>
            <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2">
                <Plus className="w-5 h-5" /> New PO
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {purchaseOrders.map(po => (
                <div key={po.id} className="glass-panel p-6 rounded-3xl border border-white/5 relative">
                     <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-white">{po.itemName}</h3>
                        <span className="text-xs font-bold text-slate-400 px-2 py-1 bg-white/10 rounded">{po.status}</span>
                     </div>
                     <div className="text-sm text-slate-400 mb-4">
                        Qty: {po.quantity} | Supplier: {po.supplier} | Cost: {formatCurrency(po.totalCost)}
                     </div>
                     {po.status === 'ORDERED' && (
                         <button onClick={() => handleReceivePO(po)} disabled={isSaving} className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg">
                            {isSaving ? "Processing..." : "Receive Stock"}
                         </button>
                     )}
                </div>
            ))}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/90" onClick={() => setIsModalOpen(false)}></div>
                <div className="relative glass-panel p-8 rounded-3xl w-full max-w-lg bg-[#050505]">
                    <h3 className="text-2xl font-bold text-white mb-6">Create Purchase Order</h3>
                    <form onSubmit={handleCreatePO} className="space-y-4">
                        <select required value={poItemId} onChange={e => setPoItemId(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white">
                            <option value="">Select Item...</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.materialNo})</option>)}
                        </select>
                        <input type="number" required value={poQty} onChange={e => setPoQty(parseInt(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white" placeholder="Quantity" />
                        <input type="text" required value={poSupplier} onChange={e => setPoSupplier(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white" placeholder="Supplier" />
                        <button type="submit" disabled={isSaving} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">Create Order</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
