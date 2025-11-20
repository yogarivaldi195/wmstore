import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { Users, Search, Plus, Shield, Trash2, Edit, CheckCircle2, XCircle, Mail, UserCog, Lock, Loader2 } from 'lucide-react';
import { userApi } from '../services/api';

interface UserManagementProps {
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  currentUser: UserProfile;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'USER' as UserRole,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    password: '' 
  });

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (user?: UserProfile) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        password: ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'USER',
        status: 'ACTIVE',
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    if (editingUser) {
      const updatedUser = {
        ...editingUser,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status
      };
      const success = await userApi.update(updatedUser);
      if(success) {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
      }
    } else {
      const newUser: UserProfile = {
        id: '',
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        lastActive: 'Never'
      };
      const createdUser = await userApi.create(newUser);
      if(createdUser) {
          setUsers([...users, createdUser]);
      }
    }
    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this user? Access will be revoked immediately.")) {
      const success = await userApi.delete(id);
      if(success) {
          setUsers(prev => prev.filter(u => u.id !== id));
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 min-h-[80vh]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="card-3d origin-left">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight font-[Space_Grotesk] text-glow">
            User <span className="text-indigo-400">Access</span>
          </h2>
          <p className="text-slate-400 mt-2 font-mono text-sm">Role-Based Access Control (RBAC)</p>
        </div>
        
        <button 
          onClick={() => handleOpenModal()}
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center gap-2 hover:-translate-y-1 transition-all"
        >
          <Plus className="w-5 h-5" />
          ADD USER
        </button>
      </div>

      {/* Stats / Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center justify-between relative z-20">
         <div className="flex gap-6 text-sm w-full md:w-auto justify-start">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-slate-300"><span className="font-bold text-white">{users.filter(u => u.status === 'ACTIVE').length}</span> Active</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-slate-300"><span className="font-bold text-white">{users.filter(u => u.role === 'ADMIN').length}</span> Admins</span>
            </div>
         </div>

         <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-indigo-500 outline-none transition-all text-sm"
            />
         </div>
      </div>

      {/* Users Grid/Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-black/40 text-xs uppercase tracking-widest text-slate-400 font-bold font-[Space_Grotesk]">
              <tr>
                <th className="px-8 py-6">User Identity</th>
                <th className="px-6 py-6">Role & Access</th>
                <th className="px-6 py-6">Status</th>
                <th className="px-6 py-6">Last Active</th>
                <th className="px-6 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-white/[0.02] transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white border border-white/10 shadow-lg
                          ${user.role === 'ADMIN' ? 'bg-gradient-to-br from-amber-600 to-orange-700' : 
                            user.role === 'STAFF' ? 'bg-gradient-to-br from-indigo-600 to-blue-700' : 
                            'bg-gradient-to-br from-slate-700 to-slate-800'}`}
                       >
                          {user.name.substring(0,2).toUpperCase()}
                       </div>
                       <div>
                          <p className="font-bold text-white group-hover:text-indigo-300 transition-colors">{user.name}</p>
                          <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                             <Mail className="w-3 h-3" /> {user.email}
                          </p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider flex w-fit items-center gap-1
                        ${user.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          user.role === 'STAFF' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}
                     >
                        <Shield className="w-3 h-3" /> {user.role}
                     </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                        {user.status === 'ACTIVE' ? (
                            <>
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-emerald-400 text-xs font-bold">Active</span>
                            </>
                        ) : (
                            <>
                                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                                <span className="text-rose-400 text-xs font-bold">Inactive</span>
                            </>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-slate-400 font-mono text-xs">
                     {user.lastActive || 'Never'}
                  </td>
                  <td className="px-6 py-5 text-right">
                     <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => handleOpenModal(user)}
                            className="p-2 hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-400 rounded-lg transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-2 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 perspective-[2000px]">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md glass-panel bg-[#0a0a0a] rounded-3xl p-6 md:p-8 border border-indigo-500/20 shadow-[0_0_60px_rgba(99,102,241,0.15)] animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                   <UserCog className="w-8 h-8" />
                </div>
                <div>
                   <h3 className="text-2xl font-bold text-white font-[Space_Grotesk]">
                       {editingUser ? 'Edit User' : 'Add User'}
                   </h3>
                   <p className="text-slate-400 text-xs font-mono">Manage system access credentials</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
                
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                    <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                        placeholder="John Doe"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                    <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                        placeholder="john@estore.com"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Role</label>
                        <select 
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none appearance-none"
                        >
                            <option value="USER">USER</option>
                            <option value="STAFF">STAFF</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Status</label>
                        <select 
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none appearance-none"
                        >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                        </select>
                    </div>
                </div>

                {!editingUser && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Temporary Password</label>
                        <div className="relative">
                             <input 
                                type="password" 
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                                placeholder="••••••••"
                            />
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        </div>
                    </div>
                )}

                <div className="pt-6 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white font-bold transition-colors">Cancel</button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Save User
                    </button>
                </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};