import React, { useState, useEffect } from 'react';
import { useGlobal } from '../context/GlobalState';
import { X, Wand2, Check, Shield, User, Calendar, School, Key, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserType, UserPermissions } from '../types';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
}

const permissionsList = [
  { id: 'dashboard', label: 'الرئيسية' },
  { id: 'dailyFollowUp', label: 'متابعة المعلمين' },
  { id: 'adminFollowUp', label: 'متابعة الموظفين والعاملين' },
  { id: 'studentAffairs', label: 'شؤون الطلاب' },
  { id: 'substitutions', label: 'جدول التغطية' },
  { id: 'schoolProfile', label: 'ملف المدرسة' },
  { id: 'specialCodes', label: 'الأكواد الخاصة' },
  { 
    id: 'specialReports', 
    label: 'تقارير خاصة',
    subPermissions: [
      { id: 'absenceLog', label: 'سجل الغياب' },
      { id: 'latenessLog', label: 'سجل التأخر' },
      { id: 'violationLog', label: 'سجل المخالفات' },
      { id: 'exitLog', label: 'سجل الخروج' },
      { id: 'damageLog', label: 'سجل الأضرار' },
      { id: 'parentVisitLog', label: 'سجل زيارة أولياء الأمور' },
      { id: 'examLog', label: 'سجل الاختبارات' },
      { id: 'taskReports', label: 'تقارير المهام' },
    ]
  },
];

const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, user }) => {
  const { data, updateData } = useGlobal();
  const [formData, setFormData] = useState<UserType | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ ...user });
      setSelectAll(user.permissions?.all || false);
    }
  }, [user]);

  if (!isOpen || !formData) return null;

  const generateUniqueCode = () => {
    const existingCodes = data.users.map(u => u.code);
    let newCode = '';
    let isUnique = false;
    
    while (!isUnique) {
      // Generate 4 digit non-sequential random code
      newCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Check if unique and not sequential (simple check for 1234, 4321 etc)
      const isSequential = /0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210/.test(newCode);
      
      if (!existingCodes.includes(newCode) && !isSequential) {
        isUnique = true;
      }
    }
    
    setFormData(prev => prev ? { ...prev, code: newCode } : null);
  };

  const handleTogglePermission = (key: keyof UserPermissions, subId?: string) => {
    setFormData(prev => {
      if (!prev) return null;
      const newPermissions = { ...prev.permissions };
      
      if (subId) {
        const currentSubs = Array.isArray(newPermissions[key]) ? [...(newPermissions[key] as string[])] : [];
        if (currentSubs.includes(subId)) {
          newPermissions[key] = currentSubs.filter(id => id !== subId) as any;
        } else {
          newPermissions[key] = [...currentSubs, subId] as any;
        }
      } else {
        newPermissions[key] = !newPermissions[key] as any;
      }
      
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setFormData(prev => {
      if (!prev) return null;
      const newPermissions: UserPermissions = { all: checked };
      if (checked) {
        permissionsList.forEach(p => {
          if (p.subPermissions) {
            newPermissions[p.id as keyof UserPermissions] = p.subPermissions.map(s => s.id) as any;
          } else {
            newPermissions[p.id as keyof UserPermissions] = true as any;
          }
        });
      }
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSave = () => {
    if (!formData) return;
    const existingUserIndex = data.users.findIndex(u => u.id === formData.id);
    let newUsers = [...data.users];
    
    if (existingUserIndex > -1) {
      newUsers[existingUserIndex] = formData;
    } else {
      newUsers.push(formData);
    }
    
    updateData({ users: newUsers });
    onClose();
  };

  const handleDelete = () => {
    if (!formData) return;
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      updateData({ users: data.users.filter(u => u.id !== formData.id) });
      onClose();
    }
  };

  const toggleSchool = (school: string) => {
    setFormData(prev => {
      if (!prev) return null;
      const current = prev.schools || [];
      const next = current.includes(school) 
        ? current.filter(s => s !== school)
        : [...current, school];
      return { ...prev, schools: next };
    });
  };

  const toggleYear = (year: string) => {
    setFormData(prev => {
      if (!prev) return null;
      const current = prev.academicYears || [];
      const next = current.includes(year) 
        ? current.filter(y => y !== year)
        : [...current, year];
      return { ...prev, academicYears: next };
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md font-arabic">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden border-8 border-blue-50 flex flex-col"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                <User size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-800">تعديل بيانات المستخدم</h2>
                <p className="text-slate-500 font-bold">إدارة البيانات الشخصية والصلاحيات والوصول</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-4 hover:bg-white hover:shadow-lg rounded-2xl transition-all text-slate-400 hover:text-red-500"
            >
              <X size={28} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column: Basic Info */}
            <div className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600 mb-4">
                  <Key size={20} />
                  <h3 className="font-black text-xl">البيانات الأساسية</h3>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 mr-2">اسم المستخدم</label>
                  <input 
                    type="text"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-black text-lg transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أدخل اسم المستخدم..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 mr-2">كود الدخول (4 أرقام)</label>
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      maxLength={4}
                      className="flex-1 px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-black text-2xl tracking-[0.5em] text-center transition-all"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    />
                    <button 
                      onClick={generateUniqueCode}
                      className="px-6 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                      title="إنشاء كود ذكي"
                    >
                      <Wand2 size={20} /> توليد
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 mr-2">تاريخ البدء</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 mr-2">تاريخ الانتهاء</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600 mb-4">
                  <School size={20} />
                  <h3 className="font-black text-xl">المدارس والأعوام المصرح بها</h3>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 mr-2">المدارس</label>
                  <div className="flex flex-wrap gap-2">
                    {data.availableSchools?.map((school, idx) => (
                      <button
                        key={`school-${school}-${idx}`}
                        onClick={() => toggleSchool(school)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                          formData.schools?.includes(school)
                            ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-purple-200'
                        }`}
                      >
                        {school}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 mr-2">الأعوام الدراسية</label>
                  <div className="flex flex-wrap gap-2">
                    {data.availableYears?.map((year, idx) => (
                      <button
                        key={`year-${year}-${idx}`}
                        onClick={() => toggleYear(year)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                          formData.academicYears?.includes(year)
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Permissions */}
            <div className="space-y-6 bg-slate-50/50 p-6 rounded-[2rem] border-2 border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Shield size={20} />
                  <h3 className="font-black text-xl">صلاحيات الوصول</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-sm font-black text-slate-500 group-hover:text-blue-600 transition-colors">تحديد الكل</span>
                  <div 
                    onClick={() => handleSelectAll(!selectAll)}
                    className={`w-12 h-6 rounded-full transition-all relative ${selectAll ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectAll ? 'right-7' : 'right-1'}`} />
                  </div>
                </label>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                {permissionsList.map(perm => (
                  <div key={perm.id} className="bg-white p-4 rounded-2xl border-2 border-slate-100 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-black text-slate-700">{perm.label}</span>
                      <input 
                        type="checkbox"
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500"
                        checked={!!formData.permissions?.[perm.id as keyof UserPermissions]}
                        onChange={() => handleTogglePermission(perm.id as keyof UserPermissions)}
                      />
                    </label>
                    
                    {perm.subPermissions && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                        {perm.subPermissions.map(sub => (
                          <label key={sub.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-200 text-blue-500"
                              checked={Array.isArray(formData.permissions?.[perm.id as keyof UserPermissions]) && (formData.permissions?.[perm.id as keyof UserPermissions] as string[]).includes(sub.id)}
                              onChange={() => handleTogglePermission(perm.id as keyof UserPermissions, sub.id)}
                            />
                            <span className="text-xs font-bold text-slate-500">{sub.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button 
              onClick={handleDelete}
              className="px-6 py-4 bg-white border-2 border-red-100 text-red-500 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
            >
              <Trash2 size={20} /> حذف المستخدم
            </button>
            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all"
              >
                إلغاء
              </button>
              <button 
                onClick={handleSave}
                className="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"
              >
                <Check size={20} /> حفظ البيانات
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserEditModal;
