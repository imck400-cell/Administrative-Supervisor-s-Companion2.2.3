import React, { useState, useEffect } from 'react';
import { useGlobal } from '../context/GlobalState';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, PenTool, BarChart3, ClipboardList, 
  ChevronDown, ArrowRight, FileText, BookOpen, UserCircle, ListChecks
} from 'lucide-react';
import { ShortEvaluationForm } from './ShortEvaluationForm';

export default function EducationalSupervisionPage() {
  const { data, currentUser } = useGlobal();
  
  const [activeTab, setActiveTab] = useState<string>(''); // '', 'teachers', 'tools', 'reports', 'summary'
  const [activeDropdown, setActiveDropdown] = useState<string>('');

  // Form State for Teachers Management
  const isSuperAdmin = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
  const availableSchools = isSuperAdmin 
    ? data.availableSchools || [] 
    : (currentUser?.schools || []);

  const [selectedSchool, setSelectedSchool] = useState<string>(
    currentUser?.selectedSchool?.split(',').map(s => s.trim()).filter(s => s !== "all")[0] || availableSchools[0] || ''
  );
  
  const allBranchesForSchool = (data.schoolBranches?.[selectedSchool] || []) as string[];
  const schoolBranches = isSuperAdmin 
    ? allBranchesForSchool
    : (currentUser?.permissions?.schoolsAndBranches?.[selectedSchool] || []);

  const [selectedBranch, setSelectedBranch] = useState<string>('');
  
  const [semester, setSemester] = useState<string>('الفصل الأول');
  
  const [showTeachersList, setShowTeachersList] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [activeTeacherView, setActiveTeacherView] = useState<string>(''); // 'new_visit' or 'archive'

  useEffect(() => {
    if (selectedSchool && schoolBranches.length > 0 && !schoolBranches.includes(selectedBranch)) {
      setSelectedBranch(schoolBranches[0]);
    } else if (schoolBranches.length === 0) {
      setSelectedBranch('');
    }
  }, [selectedSchool, schoolBranches, selectedBranch]);

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdown('');
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const teachersList = data.users.filter(u => {
    const jobTitles = u.jobTitle ? u.jobTitle.split(',').map(j => j.trim()) : [];
    if (!jobTitles.includes('معلم مادة') && !jobTitles.includes('مربية')) return false;
    if (!u.schools.includes(selectedSchool) && !u.schools.includes('all')) return false;
    if (selectedBranch && u.customSchoolProfiles?.[selectedSchool]?.branch && u.customSchoolProfiles[selectedSchool].branch !== selectedBranch) {
        return false;
    }
    return true;
  });

  const selectedTeacher = teachersList.find(t => t.id === selectedTeacherId);

  const mainButtons = [
    { id: 'teachers', label: 'إدارة المعلمين والتقارير', icon: <Users size={24} />, color: 'from-blue-600 to-blue-500' },
    { 
      id: 'tools', 
      label: 'الأدوات الإشرافية', 
      icon: <PenTool size={24} />, 
      color: 'from-violet-600 to-violet-500',
      dropdownItems: ['الزيارات التبادلية', 'كشوفات الاستلام والتسليم']
    },
    { 
      id: 'reports', 
      label: 'التقارير ومؤشرات الأداء', 
      icon: <BarChart3 size={24} />, 
      color: 'from-emerald-600 to-emerald-500',
      dropdownItems: ['التقارير الختامية', 'تقرير الزيارات التبادلية', 'تقرير كشوفات الاستلام والتسليم']
    },
    { id: 'summary', label: 'خلاصة الزيارات', icon: <ClipboardList size={24} />, color: 'from-amber-500 to-amber-400' },
  ];

  const handleDropdownClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (activeDropdown === id) {
      setActiveDropdown('');
    } else {
      setActiveDropdown(id);
    }
  };

  const renderTeachersManagement = () => {
    if (selectedTeacherId && activeTeacherView) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => {
              setActiveTeacherView('');
              setSelectedTeacherId('');
            }}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold"
          >
            <ArrowRight size={20} /> العودة لقائمة المعلمين
          </button>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <UserCircle size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedTeacher?.name}</h3>
                <p className="text-sm font-semibold text-slate-500">{selectedTeacher?.jobTitle} - {selectedSchool}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTeacherView('new_visit_short')}
                className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTeacherView === 'new_visit_short' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <PenTool size={20} /> تقييم مختصر
              </button>
              <button 
                onClick={() => setActiveTeacherView('new_visit_ext')}
                className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTeacherView === 'new_visit_ext' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText size={20} /> تقييم موسع
              </button>
              <button 
                onClick={() => setActiveTeacherView('new_visit_sub')}
                className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTeacherView === 'new_visit_sub' 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen size={20} /> تقييم مادة
              </button>
              <button 
                onClick={() => setActiveTeacherView('archive')}
                className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTeacherView === 'archive' 
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ListChecks size={20} /> أرشيف
              </button>
            </div>

            <div className="mt-8 bg-slate-50 rounded-xl">
              {activeTeacherView === 'new_visit_short' && (
                <ShortEvaluationForm 
                  teacher={selectedTeacher} 
                  school={selectedSchool} 
                  branch={selectedBranch} 
                  semester={semester} 
                  academicYear={currentUser?.selectedYear || data.availableYears?.[0] || '2024-2025'} 
                />
              )}
              {activeTeacherView === 'archive' && <div className="p-10 text-center font-bold text-slate-400">أرشيف زيارات المعلم (قيد التطوير)</div>}
              {activeTeacherView === 'new_visit_ext' && <div className="p-10 text-center font-bold text-slate-400">نماذج التقييم الموسع (قيد التطوير)</div>}
              {activeTeacherView === 'new_visit_sub' && <div className="p-10 text-center font-bold text-slate-400">نماذج تقييم المادة (قيد التطوير)</div>}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
         <button 
            onClick={() => setActiveTab('')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold"
          >
            <ArrowRight size={20} /> العودة للقائمة الرئيسية
          </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <Users className="text-blue-600" /> إدارة المعلمين والتقارير
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المدرسة</label>
              <select 
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors font-semibold"
              >
                {availableSchools.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {schoolBranches.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">الفرع</label>
                <select 
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors font-semibold"
                >
                  <option value="">كل الفروع</option>
                  {schoolBranches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">اسم المشرف التربوي</label>
              <input 
                type="text"
                readOnly
                value={currentUser?.name || ''}
                className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-4 py-3 outline-none font-semibold cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الفصل الدراسي</label>
              <select 
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors font-semibold"
              >
                <option value="الفصل الأول">الفصل الأول</option>
                <option value="الفصل الثاني">الفصل الثاني</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <div className="relative">
              <button
                onClick={() => setShowTeachersList(!showTeachersList)}
                className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 p-4 rounded-xl flex items-center justify-between font-bold transition-colors"
              >
                <span className="flex items-center gap-2"><BookOpen size={20}/> قائمة المعلمين</span>
                <ChevronDown size={20} className={`transform transition-transform ${showTeachersList ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showTeachersList && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 w-full mt-2 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden max-h-[300px] overflow-y-auto"
                  >
                    {teachersList.length > 0 ? (
                      <div className="p-2 space-y-1">
                        {teachersList.map(teacher => (
                          <button
                            key={teacher.id}
                            onClick={() => {
                              setSelectedTeacherId(teacher.id);
                              setActiveTeacherView('new_visit');
                              setShowTeachersList(false);
                            }}
                            className="w-full text-right px-4 py-3 hover:bg-slate-50 rounded-lg transition-colors font-semibold text-slate-700 flex items-center justify-between group"
                          >
                            <span>{teacher.name}</span>
                            <span className="text-xs text-slate-400 group-hover:text-blue-500 bg-slate-100 px-2 py-1 rounded-md">{teacher.jobTitle}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 font-semibold">
                        لا يوجد معلمين مطابقين للخيارات المحددة
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="font-arabic pb-20 fade-in min-h-[70vh]">
      {!activeTab ? (
        <div className="max-w-4xl mx-auto mt-10">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-100/50">
              <BookOpen size={40} />
            </div>
            <h1 className="text-4xl font-black text-slate-800">الإشراف التربوي</h1>
            <p className="text-slate-500 mt-2 font-semibold">أدوات إشرافية متكاملة لتقييم ومتابعة الكادر التعليمي</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {mainButtons.map((btn) => (
              <div key={btn.id} className="relative">
                <button
                  onClick={(e) => {
                    if (btn.dropdownItems) {
                      handleDropdownClick(e, btn.id);
                    } else {
                      setActiveTab(btn.id);
                      setActiveDropdown('');
                    }
                  }}
                  className={`w-full group bg-gradient-to-br ${btn.color} p-6 border-b-4 border-black/20 rounded-2xl text-white shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center gap-4 min-h-[160px]`}
                >
                  <div className="bg-white/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                    {btn.icon}
                  </div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {btn.label}
                    {btn.dropdownItems && <ChevronDown size={18} className={`transition-transform duration-300 ${activeDropdown === btn.id ? 'rotate-180' : ''}`} />}
                  </h3>
                </button>

                <AnimatePresence>
                  {btn.dropdownItems && activeDropdown === btn.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-20 w-full mt-3 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden"
                    >
                      {btn.dropdownItems.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown('');
                            // Placeholder for future implementation
                          }}
                          className="w-full text-right px-6 py-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 font-bold text-slate-700 transition-colors flex items-center justify-between group"
                        >
                          {item}
                          <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'teachers' ? (
        renderTeachersManagement()
      ) : (
        <div className="animate-in fade-in flex flex-col items-center justify-center h-[50vh] text-center">
            <button 
                onClick={() => setActiveTab('')}
                className="mb-8 flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors font-bold"
            >
                <ArrowRight size={20} /> العودة للقائمة الرئيسية
            </button>
            <div className="p-8 bg-amber-50 text-amber-700 rounded-2xl font-bold text-xl border border-amber-200">
                هذه الصفحة قيد التطوير حالياً
            </div>
        </div>
      )}
    </div>
  );
}
