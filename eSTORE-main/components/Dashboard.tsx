import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { InventoryItem, TransactionLog } from '../types';
import { TrendingUp, AlertCircle, DollarSign, Package, Activity, Cpu, Zap, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, Hourglass, TrendingDown, Wallet } from 'lucide-react';
import { Language } from '../lib/i18n';

interface DashboardProps {
  items: InventoryItem[];
  transactions: TransactionLog[];
  lang: Language;
  t: any;
}

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#84cc16'];

export const Dashboard: React.FC<DashboardProps> = ({ items, transactions, lang, t }) => {
  
  // --- 1. Kalkulasi Statistik Lanjutan (Advanced Statistics) ---
  const stats = useMemo(() => {
    // REVISI: Total Stock dihitung dari banyaknya material_no (Unique Items/SKUs)
    // Menggunakan Set untuk memastikan material_no yang sama tidak dihitung ganda (jika ada duplikasi data mentah)
    const uniqueMaterialCount = new Set(items.map(item => item.materialNo)).size;
    
    // Kita simpan total fisik hanya untuk info tambahan jika perlu
    const totalPhysicalQty = items.reduce((acc, item) => acc + item.quantity, 0);

    const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    
    const lowStockItems = items.filter(item => item.quantity < item.minStock);
    const lowStockCount = lowStockItems.length;
    const healthyStockCount = items.length - lowStockCount;
    const stockHealth = items.length > 0 ? Math.round((healthyStockCount / items.length) * 100) : 100;
    
    // Estimasi biaya restock
    const restockCostEstimates = lowStockItems.reduce((acc, item) => {
        const needed = Math.max(0, (item.maxStock || item.minStock * 2) - item.quantity);
        return acc + (needed * item.price);
    }, 0);

    return { 
        uniqueMaterialCount, // Digunakan untuk display Total Stock utama
        totalPhysicalQty, 
        totalValue, 
        lowStockCount, 
        stockHealth, 
        restockCostEstimates 
    };
  }, [items]);

  // --- 2. Top Movers & Analisis Pergerakan ---
  const topMovers = useMemo(() => {
    const movementMap: Record<string, { name: string, count: number, type: string }> = {};
    
    transactions.forEach(tx => {
        if (!movementMap[tx.itemId]) {
            movementMap[tx.itemId] = { name: tx.itemName, count: 0, type: tx.sku };
        }
        movementMap[tx.itemId].count += tx.quantity;
    });

    return Object.values(movementMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
  }, [transactions]);

  // --- 3. Analisis Stok Mati (Slow Moving) ---
  const slowMovingItems = useMemo(() => {
      const activeItemIds = new Set(
          transactions
            .filter(t => t.type === 'OUT')
            .map(t => t.itemId)
      );
      
      return items
          .filter(i => i.quantity > 0 && !activeItemIds.has(i.id))
          .slice(0, 5);
  }, [items, transactions]);

  // --- 4. Forecasting: Prediksi Kehabisan Stok ---
  const riskItems = useMemo(() => {
      const usageMap: Record<string, number> = {};
      transactions
        .filter(t => t.type === 'OUT')
        .forEach(t => {
            usageMap[t.itemId] = (usageMap[t.itemId] || 0) + t.quantity;
        });
      
      const estimatedDaysRange = 30; 

      const predictions = items
          .map(item => {
              const totalUsage = usageMap[item.id] || 0;
              const avgDailyUsage = totalUsage / estimatedDaysRange;
              
              if (avgDailyUsage <= 0 || item.quantity === 0) return null;

              const daysLeft = Math.floor(item.quantity / avgDailyUsage);
              return { ...item, daysLeft, avgDailyUsage };
          })
          .filter(Boolean)
          .filter((i: any) => i.daysLeft < 14)
          .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
          .slice(0, 4);
          
      return predictions as (InventoryItem & { daysLeft: number, avgDailyUsage: number })[];
  }, [items, transactions]);
  
  // --- 5. Analisis Aliran (Flow Analytics) ---
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
    });

    return last7Days.map(dateObj => {
        const dateStr = dateObj.toISOString().split('T')[0];
        const dayTrans = transactions.filter(t => t.date.startsWith(dateStr));
        const inbound = dayTrans.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.quantity, 0);
        const outbound = dayTrans.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.quantity, 0);
        const dayName = dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short' });

        return { name: dayName, fullDate: dateStr, inbound, outbound };
    });
  }, [transactions, lang]);

  // --- 6. Valuasi Aset per Kategori ---
  const categoryValueData = useMemo(() => {
      const catMap: Record<string, number> = {};
      items.forEach(i => {
          catMap[i.category] = (catMap[i.category] || 0) + (i.quantity * i.price);
      });
      return Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }));
  }, [items]);

  // --- 7. Pie Data ---
  const pieData = useMemo(() => {
    const categoryDataMap: {[key: string]: number} = {};
    items.forEach(item => {
        categoryDataMap[item.category] = (categoryDataMap[item.category] || 0) + item.quantity;
    });
    return Object.keys(categoryDataMap).map(key => ({
        name: key,
        value: categoryDataMap[key]
    }));
  }, [items]);

  // REVISI: Format Currency dipaksa ke IDR (Rp)
  const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('id-ID', { 
          style: 'currency', 
          currency: 'IDR', 
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
      }).format(val);
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0a0a0a]/95 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-xl z-50">
          <p className="text-slate-400 text-xs mb-2 font-mono uppercase tracking-wider">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}></div>
              <p className="text-sm font-bold text-white">
                {entry.name === 'inbound' ? 'Masuk' : entry.name === 'outbound' ? 'Keluar' : entry.name}: 
                <span className="font-mono text-indigo-300 ml-2">
                    {/* Cek jika nilai berhubungan dengan uang, gunakan formatCurrency */}
                    {entry.dataKey === 'value' && entry.payload.name && typeof entry.payload.name === 'string' && items.some(i => i.category === entry.payload.name) // Deteksi kasar untuk bar chart value
                        ? formatCurrency(entry.value)
                        : entry.value.toLocaleString()
                    }
                </span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight font-[Space_Grotesk] text-glow">
            eSTORE <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{t.commandCenter}</span>
          </h2>
          <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Live Warehouse Data
            </span>
            <span>•</span>
            <span className="font-mono">{new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
           <div className="glass-panel flex-1 md:flex-none px-5 py-3 rounded-2xl flex items-center gap-3 border-indigo-500/20">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Cpu className="w-5 h-5" /></div>
              <div className="text-xs">
                <p className="text-slate-400 font-bold uppercase">Total SKUs</p>
                <p className="text-emerald-400 font-mono font-bold">{stats.uniqueMaterialCount} Items</p>
              </div>
           </div>
        </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:perspective-[1000px]">
        {/* Total Stock Value */}
        <div className="card-3d glass-panel p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="w-24 h-24 text-indigo-400" />
            </div>
            <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.assetValue}</p>
                {/* Menggunakan formatCurrency (Rp) */}
                <h3 className="text-2xl xl:text-3xl font-bold text-white mt-2 font-[Space_Grotesk] truncate">{formatCurrency(stats.totalValue)}</h3>
                <div className="mt-4 flex items-center gap-2">
                    <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2 py-1 rounded-lg border border-indigo-500/20 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Real-time Valuation
                    </span>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        </div>

        {/* Stock Health */}
        <div className="card-3d glass-panel p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="w-24 h-24 text-emerald-400" />
            </div>
            <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Inventory Health</p>
                <h3 className="text-2xl xl:text-3xl font-bold text-white mt-2 font-[Space_Grotesk]">{stats.stockHealth}%</h3>
                <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${stats.stockHealth > 80 ? 'bg-emerald-500' : stats.stockHealth > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{width: `${stats.stockHealth}%`}}></div>
                </div>
                <p className="text-slate-500 text-xs mt-2">{stats.lowStockCount} items below minimum</p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        </div>

        {/* Total Items (REVISI: Menggunakan uniqueMaterialCount) */}
        <div className="card-3d glass-panel p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Package className="w-24 h-24 text-blue-400" />
            </div>
            <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.totalStock}</p>
                {/* Angka dihitung dari banyaknya material_no */}
                <h3 className="text-2xl xl:text-3xl font-bold text-white mt-2 font-[Space_Grotesk]">{stats.uniqueMaterialCount.toLocaleString()}</h3>
                <p className="text-slate-500 text-xs mt-4">Unique Materials / SKUs</p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
        </div>

        {/* Restock Cost Estimate */}
        <div className="card-3d glass-panel p-6 rounded-3xl relative overflow-hidden group bg-rose-900/10 border-rose-500/20">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertCircle className="w-24 h-24 text-rose-400" />
            </div>
            <div className="relative z-10">
                <p className="text-rose-300 text-xs font-bold uppercase tracking-widest">Est. Restock Cost</p>
                {/* Menggunakan formatCurrency (Rp) */}
                <h3 className="text-2xl xl:text-3xl font-bold text-white mt-2 font-[Space_Grotesk]">{formatCurrency(stats.restockCostEstimates)}</h3>
                <p className="text-rose-300/70 text-xs mt-4">To restore min levels</p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-500"></div>
        </div>
      </div>

      {/* MAIN DASHBOARD CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (Charts & Flows) */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Flow Analytics Chart */}
            <div className="glass-panel p-6 rounded-3xl relative overflow-hidden border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-400" /> {t.flowAnalytics}
                        </h3>
                        <p className="text-xs text-slate-500">Volume In/Out (Last 7 Days)</p>
                    </div>
                    <div className="flex gap-3 text-xs font-bold">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Inbound</div>
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Outbound</div>
                    </div>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                        <Tooltip content={<CustomTooltip />} cursor={{stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1}} />
                        <Area type="monotone" dataKey="inbound" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                        <Area type="monotone" dataKey="outbound" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Warehouse Intelligence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Stockout Prediction */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                        <Hourglass className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-white">Risk Forecast</h3>
                    </div>
                    <div className="space-y-3">
                        {riskItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold text-white truncate max-w-[120px]">{item.name}</p>
                                    <p className="text-[10px] text-slate-400">Usage: {item.avgDailyUsage.toFixed(1)} / day</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-amber-400 font-mono">{item.daysLeft} Days</p>
                                    <p className="text-[10px] text-amber-200/70 uppercase">Remaining</p>
                                </div>
                            </div>
                        ))}
                        {riskItems.length === 0 && (
                            <div className="text-center py-6 text-slate-500 text-xs">
                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                                No immediate stockout risks detected based on current usage.
                            </div>
                        )}
                    </div>
                </div>

                {/* Slow Moving Items */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingDown className="w-5 h-5 text-slate-400" />
                        <h3 className="text-lg font-bold text-white">Slow Moving</h3>
                    </div>
                    <div className="space-y-3">
                        {slowMovingItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold text-slate-300 truncate max-w-[150px]">{item.name}</p>
                                    <p className="text-[10px] text-slate-500">SLOC: {item.sloc}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white font-mono">{item.quantity}</p>
                                    <p className="text-[10px] text-slate-500">Idle Units</p>
                                </div>
                            </div>
                        ))}
                        {slowMovingItems.length === 0 && (
                             <div className="text-center py-6 text-slate-500 text-xs">
                                All items are moving actively.
                             </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Asset Value by Category (Financial Bar Chart) */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative">
                <div className="flex items-center gap-2 mb-6">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <div>
                        <h3 className="text-lg font-bold text-white">Capital Distribution</h3>
                        <p className="text-xs text-slate-500">Asset Value by Category</p>
                    </div>
                </div>
                <div className="h-[200px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryValueData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} tick={{fill: '#64748b', fontSize: 10}} />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '12px'}}
                                formatter={(value: number) => [formatCurrency(value), 'Value']}
                            />
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40}>
                                {categoryValueData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN (Quick Stats & Movers) */}
        <div className="space-y-6">
            
            {/* Composition Pie Chart */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[60px] rounded-full"></div>
                <h3 className="text-lg font-bold text-white mb-2">{t.composition}</h3>
                <p className="text-xs text-slate-500 mb-6">Quantity Distribution</p>
                <div className="h-[220px] relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={4}>
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                            ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-slate-400 text-[10px] font-mono ml-1">{value}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Movers (Fast Moving Items) */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                     <Zap className="w-5 h-5 text-yellow-400" /> Top Movers
                 </h3>
                 <div className="space-y-4">
                     {topMovers.map((item, idx) => (
                         <div key={idx} className="flex items-center gap-3">
                             <span className="text-xs font-bold text-slate-600 w-4">0{idx+1}</span>
                             <div className="flex-1">
                                 <div className="flex justify-between mb-1">
                                     <span className="text-xs text-white font-bold truncate max-w-[120px]">{item.name}</span>
                                     <span className="text-xs text-yellow-400 font-mono">{item.count} units</span>
                                 </div>
                                 <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                     <div className="bg-yellow-500 h-full rounded-full" style={{width: `${(item.count / (topMovers[0]?.count || 1)) * 100}%`}}></div>
                                 </div>
                             </div>
                         </div>
                     ))}
                     {topMovers.length === 0 && <p className="text-slate-500 text-xs text-center">No transaction data available.</p>}
                 </div>
            </div>

            {/* Warehouse Status Summary */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
                <h3 className="text-lg font-bold text-white mb-4">Warehouse Status</h3>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm text-white font-bold">Operational</p>
                        {/* REVISI: Menampilkan jumlah item unik, bukan total fisik jika itu yang diinginkan di sini juga, tapi biasanya Operational tracking items count is fine */}
                        <p className="text-xs text-slate-400">Tracking {stats.uniqueMaterialCount} active materials</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/30 p-2 rounded-lg text-center">
                         <p className="text-[10px] text-slate-500 uppercase">Inbound (7d)</p>
                         <p className="text-emerald-400 font-mono font-bold text-sm">
                            {chartData.reduce((acc, d) => acc + d.inbound, 0)}
                         </p>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg text-center">
                         <p className="text-[10px] text-slate-500 uppercase">Outbound (7d)</p>
                         <p className="text-blue-400 font-mono font-bold text-sm">
                            {chartData.reduce((acc, d) => acc + d.outbound, 0)}
                         </p>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
