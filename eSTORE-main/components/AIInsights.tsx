import React, { useState } from 'react';
import { InventoryItem, AIAnalysisResult, UserRole } from '../types';
import { analyzeInventoryHealth } from '../services/geminiService';
import { Sparkles, Loader2, AlertTriangle, CheckCircle, TrendingUp, Cpu, ScanLine, Disc, Lock, ShieldAlert } from 'lucide-react';

interface AIInsightsProps {
  items: InventoryItem[];
  userRole: UserRole;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ items, userRole }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    const result = await analyzeInventoryHealth(items);
    setAnalysis(result);
    setLoading(false);
  };

  if (userRole !== 'ADMIN') {
    return (
      <div className="h-[80vh] flex items-center justify-center md:perspective-[1000px]">
        <div className="card-3d bg-black/40 border border-red-500/30 rounded-3xl p-12 text-center max-w-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(220,38,38,0.3)]">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white font-[Space_Grotesk] tracking-widest">ACCESS DENIED</h2>
          <p className="text-red-400/80 mt-4 font-mono text-sm">
            SECURITY LEVEL INSUFFICIENT.<br/>
            AI CORE INTELLIGENCE IS RESTRICTED TO ADMIN PERSONNEL.
          </p>
          <div className="mt-8 flex justify-center">
             <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 font-mono">
               ERROR_CODE: 403_FORBIDDEN
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="relative">
           <div className="absolute -left-6 -top-6 w-20 h-20 bg-purple-600/30 blur-2xl rounded-full"></div>
           <h2 className="relative z-10 text-3xl md:text-4xl font-bold text-white tracking-tight font-[Space_Grotesk] flex items-center gap-3 text-glow">
            <Sparkles className="w-8 h-8 text-purple-400 animate-spin-slow" />
            eSTORE <span className="text-purple-500">Intelligence</span>
          </h2>
          <p className="relative z-10 text-slate-400 mt-2 font-mono">Gemini Neural Core // v1.5 Pro</p>
        </div>
        
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="group relative overflow-hidden bg-slate-100 text-black px-10 py-4 rounded-full font-bold flex items-center gap-3 hover:scale-105 transition-all disabled:opacity-70 disabled:scale-100 shadow-[0_0_40px_rgba(255,255,255,0.3)] z-10 w-full md:w-auto justify-center"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Cpu className="w-5 h-5" />}
          {loading ? 'PROCESSING...' : 'INITIATE DEEP SCAN'}
        </button>
      </div>

      {!analysis && !loading && (
        <div className="glass-panel rounded-3xl p-12 md:p-32 text-center border border-white/10 relative overflow-hidden md:perspective-[1000px]">
          {/* Holographic Grid Floor */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center card-3d">
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-purple-500/30 flex items-center justify-center mb-8 animate-[spin_10s_linear_infinite]">
              <div className="w-24 h-24 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.4)] animate-pulse">
                 <ScanLine className="w-10 h-10 text-purple-300" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-wide font-[Space_Grotesk]">AWAITING DATA INPUT</h3>
            <p className="text-slate-400 max-w-md mx-auto mt-4 leading-relaxed">
              Connect to the neural network to analyze <span className="text-purple-400 font-bold">{items.length} data points</span> for optimization vectors.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="glass-panel rounded-3xl p-32 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent animate-pulse"></div>
          <div className="relative w-32 h-32 mx-auto mb-8">
             <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-t-purple-500 border-r-purple-500 border-b-transparent border-l-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(168,85,247,0.5)]"></div>
             <Disc className="absolute inset-0 m-auto w-12 h-12 text-purple-400 animate-spin-slow opacity-50" />
          </div>
          <h3 className="text-2xl font-bold text-white animate-pulse font-mono tracking-widest">ANALYZING</h3>
          <div className="flex justify-center gap-1 mt-4">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
        </div>
      )}

      {analysis && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:perspective-[1000px]">
          
          {/* Summary Card - Holographic Effect */}
          <div className="md:col-span-2 relative overflow-hidden rounded-3xl p-10 border border-indigo-500/30 bg-slate-900/60 backdrop-blur-xl card-3d group">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-500 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.6)] animate-float">
                   <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white font-[Space_Grotesk]">Executive AI Analysis</h3>
              </div>
              <div className="p-6 bg-indigo-950/30 rounded-2xl border border-indigo-500/20">
                 <p className="text-indigo-100 leading-relaxed text-lg font-light">
                  "{analysis.summary}"
                </p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          <div className="glass-panel p-8 rounded-3xl border-t-4 border-t-rose-500 hover:bg-rose-950/10 transition-colors card-3d">
             <h3 className="text-xl font-bold text-rose-400 mb-8 flex items-center gap-3">
               <AlertTriangle className="w-6 h-6" /> 
               Critical Anomalies
             </h3>
             <ul className="space-y-4">
               {analysis.warnings.map((warn, idx) => (
                 <li key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                   <span className="text-rose-500 mt-1">►</span>
                   <span className="text-rose-200/90 font-mono text-sm">{warn}</span>
                 </li>
               ))}
               {analysis.warnings.length === 0 && (
                 <li className="text-slate-500 italic flex items-center gap-2">
                   <CheckCircle className="w-4 h-4" /> System optimal. No anomalies.
                 </li>
               )}
             </ul>
          </div>

          {/* Recommendations */}
          <div className="glass-panel p-8 rounded-3xl border-t-4 border-t-emerald-500 hover:bg-emerald-950/10 transition-colors card-3d">
             <h3 className="text-xl font-bold text-emerald-400 mb-8 flex items-center gap-3">
               <TrendingUp className="w-6 h-6" /> 
               Optimization Protocols
             </h3>
             <ul className="space-y-4">
               {analysis.recommendations.map((rec, idx) => (
                 <li key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                   <span className="text-emerald-500 mt-1">►</span>
                   <span className="text-emerald-200/90 font-mono text-sm">{rec}</span>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      )}
    </div>
  );
};