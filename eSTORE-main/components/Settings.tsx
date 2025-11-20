
import React, { useState } from 'react';
import { AppSettings, UserRole } from '../types';
import { Settings as SettingsIcon, Database, Save, Shield, CheckCircle2, CloudCog, Globe } from 'lucide-react';
import { Language } from '../lib/i18n';

interface SettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  userRole: UserRole;
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, setSettings, userRole, language, setLanguage }) => {
  const [formState, setFormState] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(formState);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (userRole !== 'ADMIN') {
      return (
        <div className="h-[80vh] flex items-center justify-center">
          <div className="glass-panel p-12 rounded-3xl text-center border border-rose-500/20">
             <Shield className="w-12 h-12 text-rose-500 mx-auto mb-4" />
             <h2 className="text-2xl font-bold text-white">Access Restricted</h2>
             <p className="text-slate-400 mt-2">System configuration is available to Administrators only.</p>
          </div>
        </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-4xl mx-auto min-h-[80vh]">
       
       <div className="flex items-center gap-4">
          <div className="p-4 bg-slate-800 rounded-2xl border border-white/10 shadow-lg">
              <SettingsIcon className="w-8 h-8 text-slate-200" />
          </div>
          <div>
              <h2 className="text-3xl font-bold text-white font-[Space_Grotesk] tracking-tight">System Configuration</h2>
              <p className="text-slate-400 font-mono text-sm">Database Connection & Global Preferences</p>
          </div>
       </div>

       <div className="glass-panel p-8 md:p-10 rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.2)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none"></div>
          
          <form onSubmit={handleSave} className="relative z-10 space-y-8">
              
              {/* Language Section */}
              <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 pb-4 border-b border-white/5">
                      <Globe className="w-5 h-5 text-blue-400" />
                      Localization / Language
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['en', 'id', 'jp'].map((lang) => (
                          <div 
                            key={lang}
                            onClick={() => setLanguage(lang as Language)}
                            className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center gap-3 ${language === lang ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-black/30 border-white/10 hover:bg-white/5'}`}
                          >
                              <div className={`w-4 h-4 rounded-full border ${language === lang ? 'border-4 border-blue-400 bg-white' : 'border-slate-500'}`}></div>
                              <span className="text-white font-bold uppercase">{lang === 'en' ? 'English (US)' : lang === 'id' ? 'Bahasa Indonesia' : '日本語 (Japan)'}</span>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 pb-4 border-b border-white/5">
                      <Database className="w-5 h-5 text-emerald-400" />
                      Supabase Integration
                  </h3>
                  <div className="grid grid-cols-1 gap-6">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Project URL</label>
                          <input 
                             type="text"
                             value={formState.supabaseUrl}
                             onChange={(e) => setFormState({...formState, supabaseUrl: e.target.value})}
                             placeholder="https://your-project.supabase.co"
                             className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-emerald-500 outline-none font-mono text-sm"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Anon / Public Key</label>
                          <input 
                             type="password"
                             value={formState.supabaseKey}
                             onChange={(e) => setFormState({...formState, supabaseKey: e.target.value})}
                             placeholder="eyAh..."
                             className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-emerald-500 outline-none font-mono text-sm"
                          />
                      </div>
                  </div>
              </div>

              <div className="space-y-6 pt-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 pb-4 border-b border-white/5">
                      <CloudCog className="w-5 h-5 text-indigo-400" />
                      Sync Preferences
                  </h3>
                  <div className="flex items-center justify-between bg-white/5 p-5 rounded-xl border border-white/5">
                      <div>
                          <p className="text-white font-bold">Enable Real-time Sync</p>
                          <p className="text-xs text-slate-500 mt-1">Automatically push changes to the database immediately.</p>
                      </div>
                      <button 
                          type="button"
                          onClick={() => setFormState({...formState, enableRealtime: !formState.enableRealtime})}
                          className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${formState.enableRealtime ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${formState.enableRealtime ? 'left-7' : 'left-1'}`}></div>
                      </button>
                  </div>
              </div>

              <div className="pt-8 flex items-center gap-4 border-t border-white/10">
                  <button 
                      type="submit"
                      className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-[1.02] transition-all flex items-center gap-2"
                  >
                      {isSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                      {isSaved ? 'Settings Saved' : 'Save Configuration'}
                  </button>
                  {isSaved && (
                      <span className="text-emerald-400 text-sm font-bold animate-in fade-in slide-in-from-left-4">Changes applied successfully.</span>
                  )}
              </div>
          </form>
       </div>
    </div>
  );
};
