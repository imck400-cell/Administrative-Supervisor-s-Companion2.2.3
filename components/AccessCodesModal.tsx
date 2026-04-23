import React, { useState } from 'react';
import { useGlobal } from '../context/GlobalState';
import { X, Plus, Edit2, Trash2, Shield, Users, School, Calendar, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UserEditModal from './UserEditModal';
import { User } from '../types';

interface AccessCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccessCodesModal: React.FC<AccessCodesModalProps> = ({ isOpen, onClose }) => {
  const { data, updateData, currentUser, effectiveUserIds } = useGlobal();
  const isReadOnly = currentUser?.permissions?.readOnly === true;
  const [newSchool, setNewSchool] = useState('');
  const [newYear, setNewYear] = useState('');
  const [selectedSchoolForBranch, setSelectedSchoolForBranch] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleAddSchool = () => {
    if (isReadOnly) return;
    if (!newSchool.trim()) return;
    const currentSchools = data.availableSchools || [];
    if (!currentSchools.includes(newSchool.trim())) {
      updateData({ 
        availableSchools: [...currentSchools, newSchool.trim()],
        schoolBranches: {
          ...(data.schoolBranches || {}),
          [newSchool.trim()]: ['المركز الرئيسي', 'فرع الطلاب', 'فرع الطالبات']
        }
      });
    }
    setNewSchool('');
  };

  const handleAddBranch = () => {
    if (isReadOnly) return;
    if (!selectedSchoolForBranch || !newBranch.trim()) return;
    const currentBranches = data.schoolBranches?.[selectedSchoolForBranch] || [];
    if (!currentBranches.includes(newBranch.trim())) {
      updateData({
        schoolBranches: {
          ...(data.schoolBranches || {}),
          [selectedSchoolForBranch]: [...currentBranches, newBranch.trim()]
        }
      });
    }
    setNewBranch('');
  };

  const handleDeleteBranch = (school: string, branch: string) => {
    if (isReadOnly) return;
    const currentBranches = data.schoolBranches?.[school] || [];
    updateData({
      schoolBranches: {
        ...(data.schoolBranches || {}),
        [school]: currentBranches.filter(b => b !== branch)
      }
    });
  };

  const handleAddYear = () => {
    if (isReadOnly) return;
    if (!newYear.trim()) return;
    const currentYears = data.availableYears || [];
    if (!currentYears.includes(newYear.trim())) {
      updateData({ availableYears: [...currentYears, newYear.trim()] });
    }
    setNewYear('');
  };

  const handleDeleteSchool = (school: string) => {
    if (isReadOnly) return;
    const currentSchools = data.availableSchools || [];
    updateData({ availableSchools: currentSchools.filter(s => s !== school) });
  };

  const handleDeleteYear = (year: string) => {
    if (isReadOnly) return;
    const currentYears = data.availableYears || [];
    updateData({ availableYears: currentYears.filter(y => y !== year) });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const generateId = () => 'u' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

  const handleAddNewAdmin = () => {
    if (isReadOnly) return;
    const newUser: User = {
      id: generateId(),
      name: '',
      code: '',
      schools: [],
      academicYears: [],
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      role: 'admin',
      permissions: { all: true }
    };
    setEditingUser(newUser);
    setIsEditModalOpen(true);
  };

  const handleAddNewUser = () => {
    if (isReadOnly) return;
    const newUser: User = {
      id: generateId(),
      name: '',
      code: '',
      schools: [],
      academicYears: [],
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      role: 'user',
      permissions: { dashboard: true, trainingCourses: true }
    };
    setEditingUser(newUser);
    setIsEditModalOpen(true);
  };

  const isAdminOrFull = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;

  const admins = data.users.filter(u => u.role === 'admin' && (isAdminOrFull || effectiveUserIds.includes(u.id)));
  const regularUsers = data.users.filter(u => u.role === 'user' && (isAdminOrFull || effectiveUserIds.includes(u.id)));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border-4 border-blue-50 flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-2xl font-black text-slate-800">التحكم بالصلاحيات</h2>
              <p className="text-slate-500 text-sm font-bold">إدارة المدارس والمستخدمين والصلاحيات</p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-red-500"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
            {/* Section 1: Schools and Years */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <School size={20} />
                <h3 className="font-black text-lg">أولاً: إدارة المدارس والأعوام الدراسية</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 mr-2">إضافة مدرسة جديدة</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold"
                      placeholder="اسم المدرسة..."
                      value={newSchool}
                      onChange={(e) => setNewSchool(e.target.value)}
                    />
                    <button 
                      onClick={handleAddSchool}
                      className="px-4 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Plus size={18} /> إضافة
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.availableSchools?.map((s, idx) => (
                      <div key={`school-${s}-${idx}`} className="flex flex-col gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 group w-full">
                        <div className="flex items-center justify-between">
                          <span>{s}</span>
                          <button 
                            onClick={() => handleDeleteSchool(s)}
                            className="p-0.5 hover:bg-blue-200 rounded-md transition-colors text-blue-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {data.schoolBranches?.[s]?.map(b => (
                            <span key={`${s}-${b}`} className="px-2 py-0.5 bg-white text-blue-500 rounded text-[10px] border border-blue-100 flex items-center gap-1">
                              {b}
                              <button onClick={() => handleDeleteBranch(s, b)} className="hover:text-red-500"><X size={10}/></button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 mr-2">إضافة فرع למدرسة</label>
                    <div className="flex gap-2">
                      <select
                        className="w-1/3 px-2 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm"
                        value={selectedSchoolForBranch}
                        onChange={e => setSelectedSchoolForBranch(e.target.value)}
                      >
                        <option value="">تحديد مدرسة</option>
                        {data.availableSchools?.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input 
                        type="text"
                        className="flex-1 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm"
                        placeholder="اسم الفرع..."
                        value={newBranch}
                        onChange={(e) => setNewBranch(e.target.value)}
                      />
                      <button 
                        onClick={handleAddBranch}
                        className="px-3 py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center gap-1 text-sm"
                      >
                        <Plus size={16} /> اضافة فرع
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 mr-2">إضافة عام دراسي جديد</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        className="flex-1 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold"
                        placeholder="العام الدراسي (مثلاً 2024-2025)..."
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                      />
                      <button 
                        onClick={handleAddYear}
                        className="px-4 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <Plus size={18} /> إضافة
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {data.availableYears?.map((y, idx) => (
                        <div key={`year-${y}-${idx}`} className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 group">
                          <span>{y}</span>
                          <button 
                            onClick={() => handleDeleteYear(y)}
                            className="p-0.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400 hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Admins */}
            <section className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Shield size={20} />
                  <h3 className="font-black text-lg">ثانياً: المدير العام ومن له صلاحيات كاملة</h3>
                </div>
                <button 
                  onClick={handleAddNewAdmin}
                  className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> إضافة مدير
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {admins.map(user => (
                  <div key={user.id} className="p-4 bg-emerald-50/50 rounded-2xl border-2 border-emerald-100 flex items-center justify-between">
                    <div>
                      <div className="font-black text-slate-800">{user.name}</div>
                      <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                        <Key size={12} /> {user.code}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="p-2 bg-white text-slate-400 hover:text-blue-600 rounded-xl shadow-sm hover:shadow-md transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: Regular Users */}
            <section className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users size={20} />
                  <h3 className="font-black text-lg">ثالثاً: المستخدمين الآخرين</h3>
                </div>
                <button 
                  onClick={handleAddNewUser}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> إضافة مستخدم
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {regularUsers.map(user => (
                  <div key={user.id} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="font-black text-slate-800">{user.name}</div>
                      <div className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-1">
                        <Key size={12} /> {user.code}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="p-2 bg-white text-slate-400 hover:text-blue-600 rounded-xl shadow-sm hover:shadow-md transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>

      <UserEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={editingUser}
      />
    </AnimatePresence>
  );
};

export default AccessCodesModal;
