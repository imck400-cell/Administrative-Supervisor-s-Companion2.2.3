import React, { useState, useEffect } from 'react';
import { useGlobal } from '../context/GlobalState';
import { X, Wand2, Check, Shield, User, Calendar, School, Key, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserType, UserPermissions } from '../types';
import ConfirmDialog from './ConfirmDialog';

const gradesOptions = ['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const sectionsOptions = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'];

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
}

const commonSubPermissions = [
  { id: 'view', label: 'ظهور الزر' },
  { id: 'disable', label: 'عدم تفعيل الزر' }
];

const permissionsList = [
  { id: 'dashboard', label: 'الرئيسية', subPermissions: [...commonSubPermissions] },
  { id: 'dailyFollowUp', label: 'متابعة المعلمين', subPermissions: [...commonSubPermissions] },
  { id: 'adminFollowUp', label: 'متابعة الموظفين والعاملين', subPermissions: [...commonSubPermissions] },
  { id: 'studentAffairs', label: 'شؤون الطلاب', subPermissions: [...commonSubPermissions] },
  { id: 'substitutions', label: 'جدول التغطية', subPermissions: [...commonSubPermissions] },
  { id: 'schoolProfile', label: 'ملف المدرسة', subPermissions: [...commonSubPermissions] },
  { 
    id: 'secretariat', 
    label: 'السكرتارية',
    subPermissions: [
      { id: 'showButton', label: 'ظهور الزر' },
      { id: 'disable', label: 'عدم التفعيل' }
    ]
  },
  { 
    id: 'specialCodes', 
    label: 'التحكم بالصلاحيات',
    subPermissions: [
      { id: 'showButton', label: 'ظهور الزر' },
      { id: 'hideButton', label: 'عدم ظهور الزر' }
    ]
  },
  { id: 'userManagement', label: 'التحكم بالمستخدمين', subPermissions: [...commonSubPermissions] },
  { id: 'readOnly', label: 'عدم السماح بتغيير البيانات' },
  { 
    id: 'issuesModal', 
    label: 'المشكلات والحلول',
    subPermissions: [
      ...commonSubPermissions,
      { id: 'useIssuesButton', label: 'استخدام الزر' },
      { id: 'viewAllIssues', label: 'إظهار المشكلات والحلول' },
    ]
  },
  { 
    id: 'trainingCourses', 
    label: 'الدورات التدريبية',
    subPermissions: [
      ...commonSubPermissions,
      { id: 'editSchema', label: 'صلاحيات تعديل المعايير والإضافة والحذف' },
      { id: 'viewIndicators', label: 'مؤشرات الدروات التدريبية' },
    ]
  },
  { id: 'caseStudyModal', label: 'دراسة حالة', subPermissions: [...commonSubPermissions] },
  { 
    id: 'comprehensiveIndicators', 
    label: 'المؤشرات الشاملة',
    subPermissions: [
      ...commonSubPermissions,
      { id: 'showButton', label: 'ظهور الزر' },
      { id: 'managePermissions', label: 'الصلاحيات' },
    ]
  },
  { 
    id: 'specialReports', 
    label: 'تقارير خاصة',
    subPermissions: [
      ...commonSubPermissions,
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
  const { data, updateData, currentUser } = useGlobal();
  const isReadOnly = currentUser?.permissions?.readOnly === true || (Array.isArray(currentUser?.permissions?.userManagement) && currentUser.permissions.userManagement.includes('disable'));
  const [formData, setFormData] = useState<UserType | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

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
        // Child toggled
        const currentSubs = Array.isArray(newPermissions[key]) ? [...(newPermissions[key] as string[])] : [];
        if (currentSubs.includes(subId)) {
          // Uncheck child
          newPermissions[key] = currentSubs.filter(id => id !== subId) as any;
          // Uncheck parent
          newPermissions.all = false;
        } else {
          // Check child
          let nextSubs = [...currentSubs, subId];
          
          if (key === 'specialCodes') {
            if (subId === 'showButton') nextSubs = nextSubs.filter(id => id !== 'hideButton');
            if (subId === 'hideButton') nextSubs = nextSubs.filter(id => id !== 'showButton');
          }
          newPermissions[key] = nextSubs as any;
          
          // Check if all children of this parent are now checked
          const parent = permissionsList.find(p => p.id === key);
          if (parent && parent.subPermissions) {
            const allChecked = parent.subPermissions.every(s => (newPermissions[key] as string[]).includes(s.id));
            if (allChecked) {
              // We could auto-check parent here if we wanted, but the user didn't explicitly ask for it.
              // However, the user said "عند الضغط على علامة صح لأي معيار ... يتم وضع علامة صح على جميع ما تحته".
              // This implies the parent is a boolean or a container.
            }
          }
        }
      } else {
        // Parent toggled
        const isChecking = !newPermissions[key];
        newPermissions[key] = isChecking as any;
        
        // If parent has children, toggle them all
        const parent = permissionsList.find(p => p.id === key);
        if (parent && parent.subPermissions) {
          if (isChecking) {
            newPermissions[key] = parent.subPermissions.map(s => s.id) as any;
          } else {
            newPermissions[key] = [] as any;
          }
        }

        if (!isChecking) {
          newPermissions.all = false;
        }
      }
      
      // Update selectAll state based on whether everything is checked
      const isAllChecked = permissionsList.every(p => {
        const val = newPermissions[p.id as keyof UserPermissions];
        if (p.subPermissions) {
          return Array.isArray(val) && val.length === p.subPermissions.length;
        }
        return !!val;
      });
      setSelectAll(isAllChecked);
      newPermissions.all = isAllChecked;
      
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setFormData(prev => {
      if (!prev) return null;
      const newPermissions: UserPermissions = { all: checked };
      permissionsList.forEach(p => {
        if (checked) {
          if (p.subPermissions) {
            newPermissions[p.id as keyof UserPermissions] = p.subPermissions.map(s => s.id) as any;
          } else {
            newPermissions[p.id as keyof UserPermissions] = true as any;
          }
        } else {
          if (p.subPermissions) {
            newPermissions[p.id as keyof UserPermissions] = [] as any;
          } else {
            newPermissions[p.id as keyof UserPermissions] = false as any;
          }
        }
      });
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSave = () => {
    if (isReadOnly) return;
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
    if (isReadOnly) return;
    if (!formData) return;
    setConfirmDialog({
      isOpen: true,
      title: 'حذف المستخدم',
      message: 'هل أنت متأكد من حذف هذا المستخدم؟',
      type: 'danger',
      onConfirm: () => {
        updateData({ users: data.users.filter(u => u.id !== formData.id) });
        onClose();
      }
    });
  };

  const toggleSchool = (school: string) => {
    setFormData(prev => {
      if (!prev) return null;
      const current = prev.schools || [];
      const next = current.includes(school) 
        ? current.filter(s => s !== school)
        : [...current, school];
        
      // Clean up branches if school is removed
      let nextPermissions = { ...prev.permissions };
      if (!next.includes(school) && nextPermissions.schoolsAndBranches) {
        const newBranches = { ...nextPermissions.schoolsAndBranches };
        delete newBranches[school];
        nextPermissions.schoolsAndBranches = newBranches;
      }
        
      return { ...prev, schools: next, permissions: nextPermissions };
    });
  };

  const toggleBranch = (school: string, branch: string) => {
    setFormData(prev => {
      if (!prev) return null;
      const currentPermissions = prev.permissions || {};
      const schoolsAndBranches = { ...(currentPermissions.schoolsAndBranches || {}) };
      const currentBranches = schoolsAndBranches[school] || [];
      
      if (currentBranches.includes(branch)) {
        schoolsAndBranches[school] = currentBranches.filter(b => b !== branch);
      } else {
        schoolsAndBranches[school] = [...currentBranches, branch];
      }
      
      return {
        ...prev,
        permissions: {
          ...currentPermissions,
          schoolsAndBranches
        }
      };
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
                  <label className="text-sm font-black text-slate-500 mr-2">الوظيفة</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-black text-lg transition-all appearance-none cursor-pointer"
                    value={formData.jobTitle || ''}
                    onChange={(e) => {
                      const jobTitle = e.target.value;
                      let newPerms: UserPermissions = { ...formData.permissions };
                      let newGrades = formData.grades;
                      let newSections = formData.sections;
                      
                      // Clear defaults when selecting a preset
                      if (jobTitle) {
                        newPerms = {};
                        newPerms.managedUserIds = formData.permissions?.managedUserIds;
                        newPerms.schoolsAndBranches = formData.permissions?.schoolsAndBranches;

                        if (['مدير عام المدارس', 'مدير الفرع', 'السكرتارية'].includes(jobTitle)) {
                          newPerms.dashboard = ['view'];
                          newPerms.dailyFollowUp = ['view'];
                          newPerms.adminFollowUp = ['view'];
                          newPerms.studentAffairs = ['view'];
                          newPerms.substitutions = ['view'];
                          newPerms.schoolProfile = ['view'];
                          newPerms.secretariat = ['showButton'];
                          newPerms.userManagement = ['view'];
                          newPerms.readOnly = true;
                          newPerms.issuesModal = ['view', 'useIssuesButton', 'viewAllIssues'];
                          newPerms.trainingCourses = ['view', 'editSchema', 'viewIndicators'];
                          newPerms.caseStudyModal = ['view'];
                          newPerms.comprehensiveIndicators = ['view', 'showButton', 'managePermissions'];
                          newPerms.specialReports = ['view'];
                          
                          newGrades = [...gradesOptions];
                          newSections = [...sectionsOptions];
                        } else if (jobTitle === 'مشرف الدور') {
                          newPerms.dashboard = ['view'];
                          newPerms.dailyFollowUp = ['view'];
                          newPerms.studentAffairs = ['view'];
                          newPerms.substitutions = ['view'];
                          newPerms.schoolProfile = ['view'];
                          newPerms.issuesModal = ['view', 'useIssuesButton', 'viewAllIssues'];
                          newPerms.trainingCourses = ['view'];
                          newPerms.specialReports = ['view', 'absenceLog', 'latenessLog', 'violationLog', 'exitLog', 'damageLog', 'parentVisitLog', 'examLog', 'taskReports'];
                        } else if (jobTitle === 'المختص الاجتماعي') {
                          newPerms.issuesModal = ['view', 'useIssuesButton', 'viewAllIssues'];
                          newPerms.trainingCourses = ['view', 'editSchema', 'viewIndicators'];
                          newPerms.caseStudyModal = ['view'];
                        }
                        
                        // Update selectAll
                        newPerms.all = false;
                      }

                      setFormData({ ...formData, jobTitle, permissions: newPerms, grades: newGrades, sections: newSections });
                    }}
                  >
                    <option value="" disabled>اختر الوظيفة...</option>
                    <option value="مدير عام المدارس">مدير عام المدارس</option>
                    <option value="مدير الفرع">مدير الفرع</option>
                    <option value="السكرتارية">السكرتارية</option>
                    <option value="مشرف الدور">مشرف الدور</option>
                    <option value="المختص الاجتماعي">المختص الاجتماعي</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 mr-2">الصف</label>
                  <div className="relative group">
                    <div className="min-h-[58px] px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-black text-lg transition-all cursor-pointer flex flex-wrap gap-2 items-center">
                      {formData.grades?.length === gradesOptions.length ? 'الجميع' : formData.grades?.join('، ') || 'اختر...'}
                    </div>
                    <div className="absolute top-full right-0 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl hidden group-hover:block z-50 p-2">
                      <label className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer text-sm font-bold border-b rounded-xl transition-colors">
                        <input type="checkbox" checked={formData.grades?.length === gradesOptions.length} onChange={(e) => setFormData({ ...formData, grades: e.target.checked ? [...gradesOptions] : [] })} className="rounded border-slate-300 text-blue-500 w-4 h-4 cursor-pointer" />
                        الجميع
                      </label>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {gradesOptions.map(gr => (
                          <label key={gr} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer text-sm font-bold rounded-xl transition-colors">
                            <input type="checkbox" checked={formData.grades?.includes(gr) || false} onChange={() => { const newArr = formData.grades?.includes(gr) ? formData.grades.filter(x => x !== gr) : [...(formData.grades || []), gr]; setFormData({ ...formData, grades: newArr }); }} className="rounded border-slate-300 text-blue-500 w-4 h-4 cursor-pointer" />
                            {gr}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 mr-2">الشعب</label>
                  <div className="relative group">
                    <div className="min-h-[58px] px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-black text-lg transition-all cursor-pointer flex flex-wrap gap-2 items-center">
                      {formData.sections?.length === sectionsOptions.length ? 'الجميع' : formData.sections?.join('، ') || 'اختر...'}
                    </div>
                     <div className="absolute top-full right-0 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl hidden group-hover:block z-50 p-2">
                      <label className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer text-sm font-bold border-b rounded-xl transition-colors">
                        <input type="checkbox" checked={formData.sections?.length === sectionsOptions.length} onChange={(e) => setFormData({ ...formData, sections: e.target.checked ? [...sectionsOptions] : [] })} className="rounded border-slate-300 text-blue-500 w-4 h-4 cursor-pointer" />
                        الجميع
                      </label>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {sectionsOptions.map(sec => (
                          <label key={sec} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer text-sm font-bold rounded-xl transition-colors">
                            <input type="checkbox" checked={formData.sections?.includes(sec) || false} onChange={() => { const newArr = formData.sections?.includes(sec) ? formData.sections.filter(x => x !== sec) : [...(formData.sections || []), sec]; setFormData({ ...formData, sections: newArr }); }} className="rounded border-slate-300 text-blue-500 w-4 h-4 cursor-pointer" />
                            {sec}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
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
                
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-500 mr-2">المدارس والفروع</label>
                  <div className="flex flex-col gap-3">
                    {data.availableSchools?.map((school, idx) => {
                      const isSchoolSelected = formData.schools?.includes(school);
                      const schoolBranches = data.schoolBranches?.[school] || [];
                      const isBranchesEmpty = schoolBranches.length === 0;
                      
                      return (
                        <div key={`school-branch-${school}-${idx}`} className={`p-4 rounded-2xl border-2 transition-all ${isSchoolSelected ? 'bg-purple-50/50 border-purple-200' : 'bg-white border-slate-100 hover:border-purple-100'}`}>
                          <button
                            onClick={() => toggleSchool(school)}
                            className={`w-full flex items-center justify-between text-right px-4 py-2 rounded-xl font-bold transition-all ${
                              isSchoolSelected
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-100'
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <span>{school}</span>
                            {isSchoolSelected && <Check size={18} />}
                          </button>
                          
                          {/* Branches mapping if school is selected */}
                          {isSchoolSelected && !isBranchesEmpty && (
                            <div className="mt-3 flex flex-wrap gap-2 px-2">
                              {schoolBranches.map(branch => {
                                const isBranchSelected = formData.permissions?.schoolsAndBranches?.[school]?.includes(branch);
                                return (
                                  <button
                                    key={`branch-${branch}`}
                                    onClick={() => toggleBranch(school, branch)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                      isBranchSelected
                                        ? 'bg-purple-100 border-purple-300 text-purple-700 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-purple-200 hover:bg-purple-50'
                                    }`}
                                  >
                                    {branch}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                        checked={perm.subPermissions 
                          ? (Array.isArray(formData.permissions?.[perm.id as keyof UserPermissions]) && (formData.permissions?.[perm.id as keyof UserPermissions] as string[]).length === perm.subPermissions.length)
                          : !!formData.permissions?.[perm.id as keyof UserPermissions]
                        }
                        onChange={() => handleTogglePermission(perm.id as keyof UserPermissions)}
                      />
                    </label>
                    
                    {perm.id === 'userManagement' && !!formData.permissions?.userManagement && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <label className="text-xs font-black text-blue-600 block mb-2">تحديد المستخدمين المسموح إدارتهم:</label>
                        <div className="space-y-3 pl-2">
                          {(formData.schools || []).map(school => {
                            const validBranches = formData.permissions?.schoolsAndBranches?.[school] || [];
                            
                            // Let's find all users in this school
                            const usersInSchool = data.users.filter(u => u.schools.includes(school) && u.id !== formData.id && !(u.role === 'admin' || u.permissions?.all === true));
                            
                            if (usersInSchool.length === 0) return null;

                            const branchesToDisplay = validBranches.length > 0 ? validBranches : ['بدون فرع مخصص'];
                            
                            const isSchoolFullyManaged = usersInSchool.every(u => (formData.permissions?.managedUserIds || []).includes(u.id));

                            const toggleAllInSchool = () => {
                              setFormData(prev => {
                                if (!prev) return null;
                                const currentManaged = prev.permissions?.managedUserIds || [];
                                const schoolUserIds = usersInSchool.map(u => u.id);
                                let next: string[];
                                if (isSchoolFullyManaged) {
                                  next = currentManaged.filter(id => !schoolUserIds.includes(id));
                                } else {
                                  next = Array.from(new Set([...currentManaged, ...schoolUserIds]));
                                }
                                return { ...prev, permissions: { ...prev.permissions, managedUserIds: next } };
                              });
                            };

                            return (
                              <div key={`manage-${school}`} className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                <div className="flex items-center justify-between mb-2 p-1">
                                  <span className="font-bold text-sm text-slate-700 flex items-center gap-1"><School size={14}/> {school}</span>
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-blue-600 rounded" 
                                    checked={isSchoolFullyManaged}
                                    onChange={toggleAllInSchool}
                                  />
                                </div>
                                <div className="space-y-2 pr-3 border-r-2 border-slate-200">
                                  {branchesToDisplay.map(branch => {
                                    const usersInBranch = usersInSchool.filter(u => {
                                      const uBranches = u.permissions?.schoolsAndBranches?.[school] || [];
                                      if (branch === 'بدون فرع مخصص') return uBranches.length === 0;
                                      return uBranches.includes(branch);
                                    });

                                    if (usersInBranch.length === 0) return null;
                                    
                                    const isBranchFullyManaged = usersInBranch.every(u => (formData.permissions?.managedUserIds || []).includes(u.id));
                                    
                                    const toggleAllInBranch = () => {
                                      setFormData(prev => {
                                        if (!prev) return null;
                                        const currentManaged = prev.permissions?.managedUserIds || [];
                                        const branchUserIds = usersInBranch.map(u => u.id);
                                        let next: string[];
                                        if (isBranchFullyManaged) {
                                          next = currentManaged.filter(id => !branchUserIds.includes(id));
                                        } else {
                                          next = Array.from(new Set([...currentManaged, ...branchUserIds]));
                                        }
                                        return { ...prev, permissions: { ...prev.permissions, managedUserIds: next } };
                                      });
                                    };

                                    return (
                                      <div key={`manage-${school}-${branch}`} className="space-y-1">
                                        <div className="flex items-center justify-between bg-blue-50/50 p-1 rounded-lg">
                                          <span className="text-xs font-bold text-blue-700">{branch}</span>
                                          <input 
                                            type="checkbox" 
                                            className="w-3.5 h-3.5 text-blue-500 rounded"
                                            checked={isBranchFullyManaged}
                                            onChange={toggleAllInBranch}
                                          />
                                        </div>
                                        <div className="pr-2 space-y-1">
                                          {usersInBranch.map(u => (
                                            <label key={`manage-${u.id}`} className="flex items-center justify-between cursor-pointer hover:bg-white p-1 rounded transition-colors group">
                                              <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">{u.name}</span>
                                              <input 
                                                type="checkbox" 
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600"
                                                checked={(formData.permissions?.managedUserIds || []).includes(u.id)}
                                                onChange={() => {
                                                  setFormData(prev => {
                                                    if (!prev) return null;
                                                    const currentManaged = prev.permissions?.managedUserIds || [];
                                                    const next = currentManaged.includes(u.id)
                                                      ? currentManaged.filter(id => id !== u.id)
                                                      : [...currentManaged, u.id];
                                                    return { ...prev, permissions: { ...prev.permissions, managedUserIds: next } };
                                                  });
                                                }}
                                              />
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {perm.id === 'comprehensiveIndicators' && Array.isArray(formData.permissions?.comprehensiveIndicators) && formData.permissions.comprehensiveIndicators.includes('managePermissions') && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <label className="text-xs font-black text-indigo-600 block mb-2">تحديد صلاحيات المؤشرات الشاملة (المستخدمين ضمن المدارس/الفروع):</label>
                        <div className="space-y-3 pl-2">
                          {(formData.schools || []).map(school => {
                            const validBranches = formData.permissions?.schoolsAndBranches?.[school] || [];
                            const usersInSchool = data.users.filter(u => u.schools.includes(school) && u.id !== formData.id && !(u.role === 'admin' || u.permissions?.all === true));
                            
                            if (usersInSchool.length === 0) return null;

                            const branchesToDisplay = validBranches.length > 0 ? validBranches : ['بدون فرع مخصص'];
                            const isSchoolFullyManaged = usersInSchool.every(u => (formData.permissions?.comprehensiveIndicatorsUsers || []).includes(u.id));

                            const toggleAllInSchool = () => {
                              setFormData(prev => {
                                if (!prev) return null;
                                const currentManaged = prev.permissions?.comprehensiveIndicatorsUsers || [];
                                const schoolUserIds = usersInSchool.map(u => u.id);
                                let next: string[];
                                if (isSchoolFullyManaged) {
                                  next = currentManaged.filter(id => !schoolUserIds.includes(id));
                                } else {
                                  next = Array.from(new Set([...currentManaged, ...schoolUserIds]));
                                }
                                return { ...prev, permissions: { ...prev.permissions, comprehensiveIndicatorsUsers: next } };
                              });
                            };

                            return (
                              <div key={`ci-${school}`} className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                                <div className="flex items-center justify-between mb-2 p-1">
                                  <span className="font-bold text-sm text-indigo-800 flex items-center gap-1"><School size={14}/> {school}</span>
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-indigo-600 rounded" 
                                    checked={isSchoolFullyManaged}
                                    onChange={toggleAllInSchool}
                                  />
                                </div>
                                <div className="space-y-2 pr-3 border-r-2 border-indigo-200">
                                  {branchesToDisplay.map(branch => {
                                    const usersInBranch = usersInSchool.filter(u => {
                                      const uBranches = u.permissions?.schoolsAndBranches?.[school] || [];
                                      if (branch === 'بدون فرع مخصص') return uBranches.length === 0;
                                      return uBranches.includes(branch);
                                    });

                                    if (usersInBranch.length === 0) return null;
                                    
                                    const isBranchFullyManaged = usersInBranch.every(u => (formData.permissions?.comprehensiveIndicatorsUsers || []).includes(u.id));
                                    
                                    const toggleAllInBranch = () => {
                                      setFormData(prev => {
                                        if (!prev) return null;
                                        const currentManaged = prev.permissions?.comprehensiveIndicatorsUsers || [];
                                        const branchUserIds = usersInBranch.map(u => u.id);
                                        let next: string[];
                                        if (isBranchFullyManaged) {
                                          next = currentManaged.filter(id => !branchUserIds.includes(id));
                                        } else {
                                          next = Array.from(new Set([...currentManaged, ...branchUserIds]));
                                        }
                                        return { ...prev, permissions: { ...prev.permissions, comprehensiveIndicatorsUsers: next } };
                                      });
                                    };

                                    return (
                                      <div key={`ci-${school}-${branch}`} className="space-y-1">
                                        <div className="flex items-center justify-between bg-white p-1 rounded-lg">
                                          <span className="text-xs font-bold text-indigo-700">{branch}</span>
                                          <input 
                                            type="checkbox" 
                                            className="w-3.5 h-3.5 text-indigo-500 rounded"
                                            checked={isBranchFullyManaged}
                                            onChange={toggleAllInBranch}
                                          />
                                        </div>
                                        <div className="pr-2 space-y-1">
                                          {usersInBranch.map(u => (
                                            <label key={`ci-${u.id}`} className="flex items-center justify-between cursor-pointer hover:bg-white p-1 rounded transition-colors group">
                                              <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600">{u.name}</span>
                                              <input 
                                                type="checkbox" 
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600"
                                                checked={(formData.permissions?.comprehensiveIndicatorsUsers || []).includes(u.id)}
                                                onChange={() => {
                                                  setFormData(prev => {
                                                    if (!prev) return null;
                                                    const currentManaged = prev.permissions?.comprehensiveIndicatorsUsers || [];
                                                    const next = currentManaged.includes(u.id)
                                                      ? currentManaged.filter(id => id !== u.id)
                                                      : [...currentManaged, u.id];
                                                    return { ...prev, permissions: { ...prev.permissions, comprehensiveIndicatorsUsers: next } };
                                                  });
                                                }}
                                              />
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
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
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          }}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    </AnimatePresence>
  );
};

export default UserEditModal;
