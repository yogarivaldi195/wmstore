
import React, { useState } from 'react';
import { Hexagon, Lock, User, ArrowRight, ScanLine, ShieldCheck, Fingerprint, AlertCircle, Mail, UserPlus } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabaseClient';
import { userApi } from '../services/api';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  users?: UserProfile[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // --- REGISTRATION FLOW ---
        
        // 1. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { full_name: name }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
           // 2. Create Profile in Database
           const newProfile: UserProfile = {
             id: '', // Database generates UUID
             name: name || email.split('@')[0],
             email: email,
             role: 'ADMIN', // Default role for prototype/first user
             status: 'ACTIVE',
             lastActive: new Date().toLocaleString()
           };
           
           // Check if profile already exists to avoid duplicate error
           const existingProfile = await userApi.getByEmail(email);
           
           let finalProfile: UserProfile | null = null;

           if (!existingProfile) {
              finalProfile = await userApi.create(newProfile);
           } else {
              finalProfile = existingProfile;
           }
           
           if (!finalProfile) {
             throw new Error("Account created in Auth, but failed to save Profile data.");
           }

           // Auto login
           onLogin(finalProfile);
        } else {
           // Sometimes signup requires email confirmation
           setError("Registration successful. Please check your email for confirmation if enabled, or try logging in.");
        }
      } else {
        // --- LOGIN FLOW ---

        // 1. Authenticate with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (authError) throw authError;

        if (authData.user && authData.user.email) {
          // 2. Fetch User Profile from database
          let profile = await userApi.getByEmail(authData.user.email);
          
          // 3. Self-Healing: If Auth matches but Profile missing, create it on the fly
          if (!profile) {
             console.log("User authenticated but profile missing. Creating default profile...");
             const newProfile: UserProfile = {
                 id: '',
                 name: authData.user.user_metadata.full_name || email.split('@')[0],
                 email: email,
                 role: 'USER', // Default safe role for auto-creation
                 status: 'ACTIVE',
                 lastActive: new Date().toLocaleString()
             };
             profile = await userApi.create(newProfile);
          }

          if (profile) {
             if (profile.status === 'INACTIVE') {
               throw new Error("Account is inactive. Contact administrator.");
             }
             // Update last active
             await userApi.update({...profile, lastActive: new Date().toLocaleString()});
             onLogin(profile);
          } else {
             throw new Error("System Error: Unable to load or create user profile.");
          }
        }
      }
    } catch (err: any) {
      console.error("Auth failed:", err);
      setError(err.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden md:perspective-[2000px]">
      
      {/* Dynamic Background for Login */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      {/* 3D Floating Login Core */}
      <div className="relative z-10 w-full max-w-md transform transition-all duration-500 md:hover:rotate-x-2 md:hover:rotate-y-2 md:preserve-3d group px-4">
        
        {/* Holographic Border Container */}
        <div className="glass-panel p-1 rounded-[2.5rem] backdrop-blur-xl border border-white/10 shadow-[0_0_80px_rgba(99,102,241,0.3)] relative overflow-hidden">
          
          {/* Scanning Beam Animation */}
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,1)] z-20 animate-[scan_3s_ease-in-out_infinite]"></div>
          
          <div className="bg-black/40 rounded-[2.3rem] p-8 md:p-12 relative overflow-hidden">
            
            {/* Header */}
            <div className="text-center mb-8 relative">
              <div className="relative inline-block mb-4 group-hover:scale-110 transition-transform duration-500">
                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-50"></div>
                <div className="relative bg-gradient-to-br from-indigo-600 to-violet-600 p-4 rounded-2xl shadow-lg border border-white/20">
                  <Hexagon className="w-10 h-10 text-white fill-white/20" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-1 border-2 border-black">
                   <ShieldCheck className="w-3 h-3 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight font-[Space_Grotesk] text-glow">eSTORE</h1>
              <div className="flex items-center justify-center gap-2 mt-2 opacity-60">
                <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
                <p className="text-xs font-mono tracking-[0.2em] text-indigo-300">SECURE ACCESS GATEWAY</p>
                <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
               <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400 text-xs animate-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
               </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-5 relative z-10">
              
              {isSignUp && (
                <div className="group relative animate-in slide-in-from-bottom-4 fade-in duration-300">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-mono text-sm"
                    required={isSignUp}
                  />
                </div>
              )}

              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  type="email" 
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-mono text-sm"
                  required
                />
              </div>
              
              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-mono text-sm"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className={`w-full relative overflow-hidden font-bold py-4 rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_50px_rgba(99,102,241,0.5)] hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0 ${isSignUp ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
              >
                {isLoading ? (
                   <div className="flex items-center justify-center gap-3">
                     <ScanLine className="w-5 h-5 animate-spin-slow" />
                     <span className="font-mono tracking-widest animate-pulse">PROCESSING...</span>
                   </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>{isSignUp ? 'CREATE ACCOUNT' : 'INITIALIZE SESSION'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </form>

            {/* Footer / Toggle Mode */}
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
               <button 
                 onClick={() => { setIsSignUp(!isSignUp); setError(null); setName(''); }}
                 className="text-xs text-slate-400 hover:text-white font-mono transition-colors flex items-center justify-center gap-2 w-full"
               >
                 {isSignUp ? (
                   <>Already have an account? <span className="text-indigo-400 font-bold">Login</span></>
                 ) : (
                   <>New System User? <span className="text-emerald-400 font-bold flex items-center gap-1"><UserPlus className="w-3 h-3" /> Register</span></>
                 )}
               </button>
            </div>

            <div className="mt-4 flex justify-between items-center text-[10px] text-slate-600 font-mono">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-3 h-3" />
                <span>Biometric Sync Ready</span>
              </div>
              <span>v.2.5.0</span>
            </div>

          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
