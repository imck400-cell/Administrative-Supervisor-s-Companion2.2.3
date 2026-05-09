import React, { useState, useEffect } from 'react';
import { X, Save, Upload, School, Building2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalState';
import { toast } from 'sonner';

interface SchoolProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchoolProfileModal: React.FC<SchoolProfileModalProps> = ({ isOpen, onClose }) => {
  const { data, updateData, currentUser } = useGlobal();
  
  const [ministry, setMinistry] = useState('');
  const [district, setDistrict] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [logoImg, setLogoImg] = useState('');
  const [branchManager, setBranchManager] = useState('');
  const [generalManager, setGeneralManager] = useState('');

  const availableSchools = currentUser?.selectedSchool === 'all' 
    ? (data.availableSchools || [])
    : currentUser?.selectedSchool.split(',').map(s => s.trim()).filter(s => s !== 'all') || [];

  // Load defaults from first available selected school if exists
  useEffect(() => {
    if (isOpen) {
      const initialSchool = currentUser?.selectedSchool === 'all' 
        ? (data.availableSchools?.[0] || '') 
        : (currentUser?.selectedSchool.split(',')[0].trim() || '');
      
      if (initialSchool) {
        setSelectedSchool(initialSchool);
      } else {
        setSelectedSchool('');
        setMinistry('');
        setDistrict('');
        setBranchManager('');
        setGeneralManager('');
        setYear('');
        setLogoImg('');
        setSelectedBranch('');
      }
    }
  }, [isOpen, data.availableSchools, currentUser]);

  useEffect(() => {
    if (selectedSchool) {
      const schoolProfiles = (data.profiles?.[selectedSchool] || {}) as any;
      let profileToEdit = schoolProfiles;
      
      // If a branch is selected, edit that specific branch
      if (selectedBranch && schoolProfiles[selectedBranch]) {
        profileToEdit = schoolProfiles[selectedBranch];
      } 
      // Else if it's the new branch-based map format but no legacy properties, pick the first branch to prepopulate
      else if (schoolProfiles.ministry === undefined) {
        const firstBranchKey = Object.keys(schoolProfiles)[0];
        if (firstBranchKey && typeof schoolProfiles[firstBranchKey] === 'object') {
          profileToEdit = schoolProfiles[firstBranchKey];
        }
      }

      setMinistry(profileToEdit.ministry || '');
      setDistrict(profileToEdit.district || '');
      setBranchManager(profileToEdit.branchManager || '');
      setGeneralManager(profileToEdit.generalManager || '');
      setYear(profileToEdit.year || '');
      setLogoImg(profileToEdit.logoImg || '');
    }
  }, [selectedSchool, selectedBranch, data.profiles]);

  const userFullData = data.users?.find(u => u.id === currentUser?.id);
  const availableYears = userFullData?.academicYears?.length ? userFullData.academicYears : (data.availableYears || []);

  const [year, setYear] = useState('');

  // Combine all branches for the selected school from data.schoolBranches
  const availableBranches = selectedSchool ? (() => {
    let branches = data.schoolBranches?.[selectedSchool] || [];
    const isAdminOrFull = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
    if (!isAdminOrFull) {
      const allowed = currentUser?.permissions?.schoolsAndBranches?.[selectedSchool] || [];
      if (allowed.length > 0) {
        branches = branches.filter(b => allowed.includes(b));
      }
    }
    return branches;
  })() : [];

  const handleSchoolToggle = (school: string) => {
    setSelectedSchool(school);
    setSelectedBranch(''); // Reset branch when school changes
  };

  const handleBranchToggle = (branch: string) => {
    setSelectedBranch(branch);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 500 كيلوبايت.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setLogoImg(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAndBroadcast = () => {
    if (!selectedSchool) {
      toast.error('يرجى اختيار مدرسة لتعديل ملفها');
      return;
    }

    const currentProfile = data.profiles?.[selectedSchool] || {};
    const updatedProfile = {
      ...currentProfile,
      ministry,
      district,
      branchManager,
      generalManager,
      year,
      schoolName: selectedSchool,
    };
    
    if (selectedBranch) {
      (updatedProfile as any).branch = selectedBranch;
    } else {
      (updatedProfile as any).branch = '';
    }

    // We only set logoImg if a new one is uploaded, otherwise keep existing
    if(logoImg) {
      (updatedProfile as any).logoImg = logoImg;
    }

    // Update the profile in the new branch-based map format
    const existingSchoolProfiles = data.profiles?.[selectedSchool] || {};
    const payloadMap: any = { ...existingSchoolProfiles };
    
    // For legacy documents: if it's currently a flat Document, just migrate it.
    if (payloadMap.ministry !== undefined) {
       const legacyBranch = payloadMap.branch || 'الفرع الرئيسي';
       payloadMap[legacyBranch] = { ...existingSchoolProfiles };
       delete payloadMap.ministry;
       delete payloadMap.district;
       delete payloadMap.schoolName;
       delete payloadMap.logoImg;
       delete payloadMap.branchManager;
       delete payloadMap.generalManager;
       delete payloadMap.year;
       delete payloadMap.branch;
       delete payloadMap.lastUpdated;
    }

    if (selectedBranch) {
      payloadMap[selectedBranch] = {
         ...updatedProfile,
         branch: selectedBranch
      };
    } else {
      payloadMap['الاعدادات العامة'] = {
        ...updatedProfile,
        branch: ''
      };
    }

    updateData({ profile: payloadMap as any }, [selectedSchool]);
    toast.success('تم الحفظ بنجاح');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden border border-white flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-200/50 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                <School size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">ملف المدرسة</h2>
                <p className="text-sm text-slate-500 font-bold">البيانات الأساسية المستقلة لكل مدرسة</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-200/50 text-slate-500 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-500" />
                  اسم الوزارة
                </label>
                <input
                  type="text"
                  value={ministry}
                  onChange={e => setMinistry(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-500" />
                  اسم المنطقة التعليمية
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-4 p-5 bg-white/50 rounded-2xl border border-slate-200/50 shadow-sm">
              <label className="text-sm font-bold text-slate-700">تحديد المدرسة المراد تعديلها</label>
              <div className="flex flex-wrap gap-2">
                {availableSchools.map(sch => (
                  <button
                    key={sch}
                    onClick={() => handleSchoolToggle(sch)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      selectedSchool === sch
                        ? 'bg-gradient-to-l from-violet-600 to-indigo-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {sch}
                  </button>
                ))}
                {availableSchools.length === 0 && (
                  <span className="text-sm text-slate-400">لا يوجد مدارس ضمن صلاحياتك</span>
                )}
              </div>
            </div>

            <AnimatePresence>
              {selectedSchool && availableBranches.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 p-5 bg-white/50 rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden"
                >
                  <label className="text-sm font-bold text-slate-700 block">تحديد الفرع المراد تعديله</label>
                  <div className="flex flex-wrap gap-2">
                    {availableBranches.map(branch => (
                      <button
                        key={branch}
                        onClick={() => handleBranchToggle(branch)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          selectedBranch === branch
                            ? 'bg-gradient-to-l from-blue-600 to-cyan-600 text-white shadow-md'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {branch}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">العام الدراسي</label>
                <div className="flex gap-2">
                  <select
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium"
                    dir="rtl"
                  >
                    <option value="">اختر العام الدراسي</option>
                    {availableYears.map((y: string) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {(currentUser?.role === 'admin' || currentUser?.permissions?.all) && (
                    <button 
                      type="button"
                      title="إضافة عام دراسي جديد للنظام"
                      onClick={() => {
                        const newY = window.prompt('أدخل العام الدراسي الجديد (مثال: 1445-1446):');
                        if (newY && !data.availableYears?.includes(newY)) {
                          const updatedYears = [...(data.availableYears || []), newY];
                          updateData({ availableYears: updatedYears });
                          setYear(newY);
                          toast.success('تم إضافة العام الدراسي وتعميمه');
                        }
                      }}
                      className="px-4 py-3 bg-violet-100 text-violet-700 rounded-xl hover:bg-violet-200 transition-colors font-bold text-sm flex items-center justify-center whitespace-nowrap"
                    >
                      + 
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">مدير الفرع</label>
                <input
                  type="text"
                  value={branchManager}
                  onChange={e => setBranchManager(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">المدير العام</label>
                <input
                  type="text"
                  value={generalManager}
                  onChange={e => setGeneralManager(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-bold text-slate-700 block">شعار المدرسة</label>
               <div className="relative w-full max-w-[200px] h-32 bg-white/50 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group hover:border-violet-400 transition-colors cursor-pointer">
                 {logoImg ? (
                   <img src={logoImg} className="w-full h-full object-contain p-2" alt="شعار المدرسة" />
                 ) : (
                   <div className="text-slate-400 font-bold flex flex-col items-center">
                     <Upload size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                     <span className="text-xs">رفع الشعار</span>
                   </div>
                 )}
                 <input 
                   type="file" 
                   accept="image/*" 
                   className="absolute inset-0 opacity-0 cursor-pointer" 
                   onChange={handleImageUpload} 
                 />
               </div>
            </div>

          </div>

          <div className="px-6 py-4 border-t border-slate-200/50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSaveAndBroadcast}
              className="px-6 py-3 bg-gradient-to-l from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Save size={20} />
              حفظ التغييرات
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
