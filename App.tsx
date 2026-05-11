import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { GlobalProvider, useGlobal } from './context/GlobalState';
import Layout from './components/Layout';
import Dashboard from './app/Dashboard';
import DataManagementModal from './components/DataManagementModal';
import AccessCodesModal from './components/AccessCodesModal';
import IssuesAndSolutionsModal from './components/IssuesAndSolutionsModal';
import CaseStudyModal from './components/CaseStudyModal';
import TrainingCoursesModal from './components/TrainingCoursesModal';
import ComprehensiveIndicatorsModal from './components/ComprehensiveIndicatorsModal';
import { QuickAccess, useQuickAccess } from './components/QuickAccess';
import { SecretariatView } from './components/SecretariatView';
import SkeletonLoader from './components/SkeletonLoader';

const SubstitutionPage = React.lazy(() => import('./app/SubstitutionPage'));
const StaffFollowUpPage = React.lazy(() => import('./app/StaffFollowUpPage'));
const SpecialReportsPage = React.lazy(() => import('./app/SpecialReportsPage'));
const ProfilePage = React.lazy(() => import('./app/ProfilePage'));
const DailyReportsPage = React.lazy(() => import('./app/ReportsPage').then(module => ({ default: module.DailyReportsPage })));
const ViolationsPage = React.lazy(() => import('./app/ReportsPage').then(module => ({ default: module.ViolationsPage })));
const StudentsReportsPage = React.lazy(() => import('./app/ReportsPage').then(module => ({ default: module.StudentsReportsPage })));
const TeacherPortalPage = React.lazy(() => import('./app/TeacherPortalPage').then(module => ({ default: module.TeacherPortalPage })));
const IntroPage = React.lazy(() => import('./app/IntroPage'));
const AboutProgramPage = React.lazy(() => import('./app/AboutProgramPage'));

import {
  Lock, LayoutDashboard, ClipboardCheck, ClipboardList, UserX, UserPlus,
  Users, Database, FileSearch, Briefcase, BookOpen,
  School, Calendar, AlertTriangle, AlertCircle, Phone, MessageCircle, Key, LogOut, User as UserIcon, X, Check,
  ChevronDown, ChevronUp, Sparkles, BarChart
} from 'lucide-react';
import GlobalScrollArrows from './components/GlobalScrollArrows';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { User, UserPermissions } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';

const AdvancedLoginPage: React.FC = () => {
  const { login, completeLogin, data } = useGlobal();
  const [step, setStep] = useState<'login' | 'expired'>('login');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [error, setError] = useState('');
  const [showMultiSchool, setShowMultiSchool] = useState(false);

  const { data: globalData, updateData } = useGlobal();
  useEffect(() => {
    if (localStorage.getItem('users_injected_geel_v3')) return;
    if (globalData && globalData.users && globalData.users.length > 0) {
      let changed = false;
      let newUsers = [...globalData.users];
      
      const payloadNames = ["قيس الجبري","عبدالرحمن مجلي","ميثاق الشليلي","علي الحماطي","حياة الورد","ابتسام الخواص","ليان الاغبري","أفراح الحيمي","رجاء الهجيني","أسماء الحميري","علي القرون","عبدالفتاح مجبور","عارف الرعيني","الخضر المهل","سماح الظاهري","مشرف دور 1","محمد النشم","حنان العفيف","أفراح سباية","نبيلة دهاق","ابتسام العكاد","أفراح الخولاني","الهام العزي","هند الفراص","مشرفة أول","عايشة الرجوي","وفاء الشيباني","رقية السماوي","ياسمين الرميش","بلال يفوز","بشرى الطلحي"];
      const payloadCodes = {"قيس الجبري":"6150","عبدالرحمن مجلي":"6471","ميثاق الشليلي":"4392","علي الحماطي":"2454","حياة الورد":"3235","ابتسام الخواص":"4808","ليان الاغبري":"3720","أفراح الحيمي":"9399","رجاء الهجيني":"4488","أسماء الحميري":"9060","علي القرون":"9215","عبدالفتاح مجبور":"4275","عارف الرعيني":"7018","الخضر المهل":"2770","سماح الظاهري":"3472","مشرف دور 1":"6315","محمد النشم":"3891","حنان العفيف":"8779","أفراح سباية":"5509","نبيلة دهاق":"8049","ابتسام العكاد":"8437","أفراح الخولاني":"7879","الهام العزي":"3493","هند الفراص":"6469","مشرفة أول":"2887","عايشة الرجوي":"5902","وفاء الشيباني":"2660","رقية السماوي":"3835","ياسمين الرميش":"1118","بلال يفوز":"3723","بشرى الطلحي":"8639"};
      const newPerms = {"dashboard":["view","allowEdits"],"dailyFollowUp":["view","allowEdits"],"adminFollowUp":["view","allowEdits"],"studentAffairs":["view","allowEdits"],"substitutions":["view","allowEdits"],"schoolProfile":["view","allowEdits"],"issuesModal":["view","allowEdits","viewAllIssues","useIssuesButton"],"trainingCourses":["view","allowEdits","editSchema","viewIndicators"],"caseStudyModal":["view","allowEdits"],"specialReports":["view","allowEdits","absenceLog","latenessLog","violationLog","exitLog","damageLog","parentVisitLog","examLog","taskReports"],"teacherPortal":["view","allowEdits","editEvaluationTemplate"],"secretariat":[],"userManagement":[],"specialCodes":[],"comprehensiveIndicators":[],"gradeSheets":[],"readOnly":false,"all":false};

      for (let i = 0; i < newUsers.length; i++) {
        const u = newUsers[i];
        if (payloadNames.includes(u.name)) {
          console.log("Fixing user: " + u.name);
          changed = true;
          u.code = payloadCodes[u.name];
          
          let schoolsAndBranchesTemp = {};
          if (u.permissions && u.permissions.schoolsAndBranches) {
            schoolsAndBranchesTemp = u.permissions.schoolsAndBranches;
          }
          
          u.permissions = {
             schoolsAndBranches: schoolsAndBranchesTemp,
             ...newPerms
          };
          u.role = 'user'; 

          if (!u.schools || u.schools.length === 0) {
            u.schools = ['مدارس جيل الرسالة الحديثة'];
          } else if (!u.schools.includes('مدارس جيل الرسالة الحديثة')) {
            u.schools.push('مدارس جيل الرسالة الحديثة');
          }

          if (!u.academicYears || u.academicYears.length === 0) {
            u.academicYears = ['2024-2025'];
          } else if (!u.academicYears.includes('2024-2025')) {
            u.academicYears.push('2024-2025');
          }
        }
      }
      
      if (changed) {
        console.log("Updating users in global state to fix permissions and codes.");
        updateData({ users: newUsers }, ["مدارس جيل الرسالة الحديثة"]);
        localStorage.setItem('users_injected_geel_v3', 'true');
      } else {
        localStorage.setItem('users_injected_geel_v3', 'true');
      }
    }
  }, [globalData, updateData]);


 


  // Auto-fill school and year when username matches a user
  useEffect(() => {
    if (username.trim()) {
      const normalizedInput = username.trim().toLowerCase();
      const user = data.users.find(u =>
        u.name.trim().toLowerCase() === normalizedInput ||
        u.id.trim().toLowerCase() === normalizedInput
      );

      if (user) {
        if (user.schools && user.schools.length > 0) {
          setSelectedSchools([user.schools[0]]);
        }
        if (user.academicYears && user.academicYears.length > 0) {
          setAcademicYear(user.academicYears[0]);
        } else if (!academicYear) {
          setAcademicYear('2024-2025'); // Default fallback
        }
      }
    }
  }, [username, data.users]);

  const selectedUser = useMemo(() => {
    const normalizedInput = username.trim().toLowerCase();
    return data.users.find(u =>
      u.name.trim().toLowerCase() === normalizedInput ||
      u.id.trim().toLowerCase() === normalizedInput
    ) || null;
  }, [username, data.users]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !code || selectedSchools.length === 0 || !academicYear) {
      setError('يرجى إكمال جميع الحقول');
      return;
    }

    const user = login(username, code);
    if (user) {
      // Check expiry
      const expiry = new Date(user.expiryDate);
      const now = new Date();
      if (now > expiry) {
        setStep('expired');
        return;
      }

      completeLogin(user, selectedSchools.join(','), academicYear);
    } else {
      setError('كود الدخول غير صحيح لهذا المستخدم');
      setTimeout(() => setError(''), 3000);
    }
  };

  const toggleSchool = (school: string) => {
    setSelectedSchools(prev => 
      prev.includes(school) ? prev.filter(s => s !== school) : [...prev, school]
    );
  };

  const selectAllSchools = () => {
    if (selectedUser) {
      setSelectedSchools(selectedUser.schools);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'login':
        return (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl shadow-lg shadow-blue-200 mb-6 transform rotate-3">
                <Lock className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">تسجيل الدخول</h2>
              <p className="text-blue-500 font-bold mt-2 text-sm">أدخل بياناتك للمتابعة</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* 1. Username */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 mr-4">اسم المستخدم</label>
                <div className="relative">
                  <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none transition-all"
                    value={username || ''}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="اسم المستخدم"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* 2. Code */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 mr-4">رقم الكود</label>
                <div className="relative">
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="password"
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-center text-xl font-bold transition-all outline-none"
                    value={code || ''}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="كود الدخول"
                  />
                </div>
              </div>

              {/* 3. School Name */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 mr-4">اسم المدرسة</label>
                <div className="relative">
                  <School className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <div 
                    onClick={() => selectedUser && (selectedUser.role === 'admin' || selectedUser.permissions.all) && setShowMultiSchool(!showMultiSchool)}
                    className={`w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none transition-all cursor-pointer flex items-center justify-between ${!selectedUser ? 'opacity-50' : ''}`}
                  >
                    <span className="truncate">
                      {selectedSchools.length === 0 ? 'اختر المدرسة' : 
                       selectedSchools.length === 1 ? selectedSchools[0] : 
                       `${selectedSchools.length} مدارس مختارة`}
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {showMultiSchool && selectedUser && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden mt-2 p-4 space-y-2 shadow-inner"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-400">اختر المدارس المتاحة لك:</span>
                        <button 
                          type="button"
                          onClick={selectAllSchools}
                          className="text-xs font-black text-blue-600 hover:underline"
                        >
                          تحديد الكل
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {selectedUser.schools.map(school => (
                          <label key={school} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                            <input 
                              type="checkbox"
                              checked={selectedSchools.includes(school)}
                              onChange={() => toggleSchool(school)}
                              className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-slate-700">{school}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 4. Academic Year */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 mr-4">العام الدراسي</label>
                <div className="relative">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    list="login-years"
                    className={`w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none transition-all ${selectedUser ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                    value={academicYear || ''}
                    onChange={(e) => !selectedUser && setAcademicYear(e.target.value)}
                    readOnly={!!selectedUser}
                    placeholder="العام الدراسي"
                  />
                  <datalist id="login-years">
                    {(data.availableYears || []).map(y => (
                      <option key={y} value={y} />
                    ))}
                  </datalist>
                </div>
              </div>

              {error && <p className="text-red-500 text-center font-bold text-sm">{error}</p>}

              <button className="w-full bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all hover:-translate-y-1 active:translate-y-0 mt-4">
                دخول النظام
              </button>
            </form>
          </motion.div>
        );
      case 'expired':
        return (
          <motion.div
            key="expired"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 text-center"
          >
            <div className="relative inline-block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-full blur-2xl opacity-20"
              />
              <div className="relative inline-flex items-center justify-center w-24 h-24 bg-white border-4 border-orange-50 text-orange-500 rounded-full shadow-2xl mb-2">
                <AlertTriangle className="w-12 h-12" />
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">انتهت صلاحية الاشتراك</h2>
              <div className="mt-4 p-6 bg-orange-50 rounded-3xl border-2 border-orange-100">
                <p className="text-orange-700 font-bold leading-relaxed">
                  عذراً، لقد انتهت مدة الصلاحية الخاصة بك.
                  <br />
                  لتمديدها يرجى التواصل مع فريق التوافق.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <a
                href="tel:967780804012"
                className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:shadow-xl transition-all group"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Phone size={24} />
                </div>
                <span className="font-black text-slate-700">اتصال هاتف</span>
              </a>
              <a
                href="https://wa.me/967780804012"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-green-500 hover:shadow-xl transition-all group"
              >
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-all">
                  <MessageCircle size={24} />
                </div>
                <span className="font-black text-slate-700">واتساب</span>
              </a>
            </div>

            <button
              onClick={() => setStep('login')}
              className="px-8 py-3 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all"
            >
              رجوع
            </button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 font-arabic overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -100, 0],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            y: [0, 100, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"
        />
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-md relative z-10 border-8 border-slate-50/50">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const { isAuthenticated, currentUser, userFilter, setUserFilter, data, logout, dateRange, setDateRange, globalDataFilters, setGlobalDataFilters } = useGlobal();
  const [view, setView] = useState('intro');

  React.useEffect(() => {
    if (!isAuthenticated) {
      setView('intro');
    }
  }, [isAuthenticated]);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isCodesModalOpen, setIsCodesModalOpen] = useState(false);
  const [isUserFilterModalOpen, setIsUserFilterModalOpen] = useState(false);
  const [isAppIssuesModalOpen, setIsAppIssuesModalOpen] = useState(false);
  const [isCaseStudyModalOpen, setIsCaseStudyModalOpen] = useState(false);
  const [isTrainingCoursesModalOpen, setIsTrainingCoursesModalOpen] = useState(false);
  const [isComprehensiveIndicatorsOpen, setIsComprehensiveIndicatorsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [specialCodesPassword, setSpecialCodesPassword] = useState('');

  const { recordUsage } = useQuickAccess(currentUser?.id);

  const isAdminOrFull = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;

  const handleOpenCodesModal = () => {
    setIsPasswordModalOpen(true);
  };

  // Helper to handle navigation so both Layout and Quick Access buttons trigger the modal
  const handleNavigation = (v: string) => {
    if (v) recordUsage(v);
    
    if (v === 'issuesModal') {
      setIsAppIssuesModalOpen(true);
    } else if (v === 'caseStudyModal') {
      setIsCaseStudyModalOpen(true);
    } else if (v === 'trainingCoursesModal') {
      setIsTrainingCoursesModalOpen(true);
    } else if (v === 'comprehensiveIndicatorsModal') {
      setIsComprehensiveIndicatorsOpen(true);
    } else if (v === 'codesModal') {
      handleOpenCodesModal();
    } else if (v === 'dataModal') {
      setIsDataModalOpen(true);
    } else {
      setView(v);
    }
  };

  const filteredUsersForModal = useMemo(() => {
    const userSchools = currentUser?.selectedSchool.split(',').map(s => s.trim()) || [];
    const managedIds = currentUser?.permissions?.managedUserIds || [];
    
    // Check if the user is a manager or admin
    const isManager = currentUser?.permissions?.userManagement === true || managedIds.length > 0;

    return data.users.filter(u => {
      // 1. If explicit list exists, honor it exclusively (+ self)
      if (managedIds.length > 0) {
        if (u.id === currentUser?.id) return true;
        return managedIds.includes(u.id);
      }

      // If we reach here, no managedIds list exists.

      // 2. Hide admins/full-perm from non-admins
      const isTargetAdmin = u.role === 'admin' || u.permissions?.all === true;
      if (!isAdminOrFull && isTargetAdmin) return false;

      // 3. Fallback for super-admins or non-restricted managers
      if (isAdminOrFull) return true;

      if (isManager) {
        // If they have manager permission but no specific list, they see the whole school/branch
        return u.schools.some(s => {
          if (!userSchools.includes(s)) return false;
          
          // Branch verification
          const managerBranches = currentUser?.permissions?.schoolsAndBranches?.[s] || [];
          if (managerBranches.length > 0) {
            const targetBranches = u.permissions?.schoolsAndBranches?.[s] || [];
            if (targetBranches.length === 0) return false; // Target has no branch but manager has specific branches
            return managerBranches.some(b => targetBranches.includes(b));
          }
          return true;
        });
      }

      return u.id === currentUser?.id;
    });
  }, [data.users, currentUser, isAdminOrFull]);

  // Build a label that clearly describes the current filter state
  const filterLabel = React.useMemo(() => {
    let label = 'خيارات التصفية';
    if (globalDataFilters) {
      const allEmpty = !globalDataFilters.schools.length && !globalDataFilters.branches.length && !globalDataFilters.grades.length && !globalDataFilters.sections.length;
      if (allEmpty) label = 'تصفية كل المستخدمين';
      else {
        const parts = [];
        if (globalDataFilters.schools.length) parts.push(`المعاهد: ${globalDataFilters.schools.length}`);
        if (globalDataFilters.branches.length) parts.push(`الفروع: ${globalDataFilters.branches.length}`);
        if (globalDataFilters.grades.length) parts.push(`الصفوف: ${globalDataFilters.grades.length}`);
        if (globalDataFilters.sections.length) parts.push(`الشعب: ${globalDataFilters.sections.length}`);
        label = parts.length > 0 ? parts.join(' - ') : label;
      }
    }

    const { from, to } = dateRange;
    if (from || to) {
      const dateLabel = from && to ? `${from} ← ${to}` : from ? `من ${from}` : `إلى ${to}`;
      return `${label} | ${dateLabel}`;
    }
    return label;
  }, [globalDataFilters, dateRange]);

  const hasActiveFilter = dateRange.from !== '' || dateRange.to !== '' || (globalDataFilters && (globalDataFilters.schools.length > 0 || globalDataFilters.branches.length > 0 || globalDataFilters.grades.length > 0 || globalDataFilters.sections.length > 0));

  const schoolsToDisplay = useMemo(() => {
    if (isAdminOrFull) return data.availableSchools || [];
    return currentUser?.selectedSchool.split(',').map(s => s.trim()) || [];
  }, [data.availableSchools, currentUser, isAdminOrFull]);

  if (!isAuthenticated) return <AdvancedLoginPage />;

  const renderView = () => {
    let Content;
    if (view.startsWith('specialReports-')) {
      const subTab = view.split('-')[1];
      Content = <SpecialReportsPage initialSubTab={subTab} onNavigate={handleNavigation} />;
    } else {
      switch (view) {
        case 'intro': Content = <IntroPage onEnter={() => setView('dashboard')} onAbout={() => setView('about')} />; break;
        case 'about': Content = <AboutProgramPage onBack={() => setView('intro')} />; break;
        case 'dashboard': Content = <Dashboard setView={handleNavigation} />; break;
        case 'substitute': Content = <SubstitutionPage />; break;
        case 'daily': Content = <DailyReportsPage />; break;
        case 'adminReports': Content = <StaffFollowUpPage />; break;
        case 'violations': Content = <ViolationsPage />; break;
        case 'studentReports': Content = <StudentsReportsPage />; break;
        case 'teacherPortal': Content = <TeacherPortalPage />; break;
        case 'specialReports': Content = <SpecialReportsPage onNavigate={handleNavigation} />; break;
        case 'profile': Content = <ProfilePage />; break;
        case 'secretariat': Content = <SecretariatView />; break;
        default: Content = <Dashboard setView={handleNavigation} />; break;
      }
    }

    return (
      <Suspense fallback={<SkeletonLoader />}>
        {Content}
      </Suspense>
    );
  };

  const managedIds = currentUser?.permissions?.managedUserIds || [];
  const isManager = currentUser?.permissions?.userManagement === true || managedIds.length > 0;
  const isGeneralSupervisor = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;

  const checkPerm = (permValue: boolean | string[] | undefined, legacySubPerm?: string): boolean => {
    if (isGeneralSupervisor) return true;
    if (permValue === undefined) return false;
    if (permValue === true) return true;
    if (permValue === false) return false;
    if (Array.isArray(permValue)) {
      if (permValue.length === 0) return false;
      if (permValue.includes('view') || permValue.includes('showButton')) return true;
      if (legacySubPerm && permValue.includes(legacySubPerm)) return true;
      return false;
    }
    return false;
  };

  const canUseCaseStudy = isGeneralSupervisor || isManager || checkPerm(currentUser?.permissions?.caseStudyModal);
  const canUseComprehensiveIndicators = checkPerm(currentUser?.permissions?.comprehensiveIndicators, 'showButton');

  return (
    <Layout onNavigate={handleNavigation} onOpenSettings={() => setIsDataModalOpen(true)}>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <UserIcon size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800"> مرحباً، {currentUser?.name} </h2>
            <p className="text-blue-500 text-sm font-bold"> {currentUser?.selectedSchool} - {data.profile.year} </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <QuickAccess userId={currentUser?.id} onAction={handleNavigation} />
          <button
            onClick={logout}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 border-2 border-red-100 rounded-[1.2rem] text-red-600 font-black text-sm hover:bg-red-600 hover:text-white transition-all shadow-sm"
          >
            <LogOut size={18} /> تسجيل الخروج
          </button>

          {view !== 'intro' && (
            <>
              {/* User + Date Filter Button */}
              {(currentUser?.role === 'admin' || currentUser?.permissions?.all || currentUser?.permissions?.userManagement) && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsUserFilterModalOpen(true)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-[1.2rem] font-black text-sm shadow-sm transition-all border-2 ${
                      hasActiveFilter
                        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                        : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:shadow-md'
                    }`}
                  >
                    <Users size={18} className={hasActiveFilter ? 'text-white' : 'text-blue-600'} />
                    <span className="max-w-[180px] truncate">{filterLabel}</span>
                  </button>
                  {hasActiveFilter && (
                    <button
                      onClick={() => {
                        setUserFilter('all');
                        setDateRange({ from: '', to: '' });
                      }}
                      title="مسح الفلترة"
                      className="p-2 bg-red-50 border-2 border-red-100 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}

              {canUseComprehensiveIndicators && (
                <button
                  onClick={() => setIsComprehensiveIndicatorsOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-emerald-100 rounded-[1.2rem] text-emerald-700 font-black text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:shadow-md transition-all whitespace-nowrap"
                >
                  <BarChart className="text-emerald-600" size={18} /> مؤشرات الأداء الشاملة
                </button>
              )}

              {(isAdminOrFull || (Array.isArray(currentUser?.permissions?.specialCodes) && currentUser.permissions.specialCodes.includes('showButton'))) && (
                <button
                  onClick={handleOpenCodesModal}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-[1.2rem] text-slate-600 font-black text-sm hover:border-blue-200 hover:shadow-md transition-all whitespace-nowrap"
                >
                  <Key className="text-blue-600" size={18} /> التحكم بالصلاحيات
                </button>
              )}

              {(currentUser?.role === 'admin' || currentUser?.permissions?.all) && (
                <button
                  onClick={() => setIsDataModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-[1.2rem] text-slate-600 font-black text-sm hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <Database className="text-blue-600" size={18} /> إدارة البيانات
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {renderView()}
      </div>

      <DataManagementModal isOpen={isDataModalOpen} onClose={() => setIsDataModalOpen(false)} />
      <AccessCodesModal 
        isOpen={isCodesModalOpen} 
        onClose={() => {
          setIsCodesModalOpen(false);
          setSpecialCodesPassword(''); // Reset on close
        }} 
        enteredPassword={specialCodesPassword}
      />

      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Key size={24} />
                  إدخال الرقم السري
                </h2>
                <button 
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setSpecialCodesPassword('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-slate-600 font-bold text-sm text-center">
                  الرجاء إدخال الرقم السري للوصول إلى إدارة الصلاحيات
                </p>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-xl font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  value={specialCodesPassword}
                  onChange={(e) => setSpecialCodesPassword(e.target.value)}
                  placeholder="الرقم السري"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (specialCodesPassword === '2#3#2*4*a') {
                        setIsPasswordModalOpen(false);
                        setIsCodesModalOpen(true);
                      } else {
                        // could show error toast here
                        alert('الرقم السري غير صحيح');
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (specialCodesPassword === '2#3#2*4*a') {
                      setIsPasswordModalOpen(false);
                      setIsCodesModalOpen(true);
                    } else {
                      alert('الرقم السري غير صحيح');
                    }
                  }}
                  className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-colors"
                >
                  دخول
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GlobalDataFilterModal
        isOpen={isUserFilterModalOpen}
        onClose={() => setIsUserFilterModalOpen(false)}
        schools={schoolsToDisplay}
        globalDataFilters={globalDataFilters}
        dateRange={dateRange}
        data={data}
        onApply={(filters, range) => {
          setDateRange(range);
          setGlobalDataFilters(filters);
        }}
      />

      <IssuesAndSolutionsModal 
        isOpen={isAppIssuesModalOpen}
        onClose={() => setIsAppIssuesModalOpen(false)}
      />
      <CaseStudyModal
        isOpen={isCaseStudyModalOpen}
        onClose={() => setIsCaseStudyModalOpen(false)}
      />
      <TrainingCoursesModal
        isOpen={isTrainingCoursesModalOpen}
        onClose={() => setIsTrainingCoursesModalOpen(false)}
      />
      <ComprehensiveIndicatorsModal
        isOpen={isComprehensiveIndicatorsOpen}
        onClose={() => setIsComprehensiveIndicatorsOpen(false)}
      />
    </Layout>
  );
};


const GlobalDataFilterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  schools: string[];
  globalDataFilters: { schools: string[], branches: string[], grades: string[], sections: string[] };
  dateRange: { from: string; to: string };
  onApply: (filters: { schools: string[], branches: string[], grades: string[], sections: string[] }, range: { from: string; to: string }) => void;
  data: any;
}> = ({ isOpen, onClose, schools, globalDataFilters, dateRange, onApply, data }) => {
  const [tempFilters, setTempFilters] = React.useState(globalDataFilters);
  const [tempRange, setTempRange] = React.useState(dateRange);

  React.useEffect(() => {
    if (isOpen) {
      setTempFilters(globalDataFilters);
      setTempRange(dateRange);
    }
  }, [isOpen, globalDataFilters, dateRange]);

  if (!isOpen) return null;

  const validGrades = ['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const validSections = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'];
  
  // Extract all unique branches 
  const availableBranches = new Set<string>();
  if (data?.secretariatStudents) {
    data.secretariatStudents.forEach((s: any) => { if (s.branch) availableBranches.add(String(s.branch).trim()); });
  }
  if (data?.secretariatStaff) {
    data.secretariatStaff.forEach((s: any) => { if (s.branch) availableBranches.add(String(s.branch).trim()); });
  }
  const branchList = Array.from(availableBranches);
  if (branchList.length === 0) branchList.push('بدون فرع مخصص');

  const toggleArrayItem = (key: keyof typeof tempFilters, val: string) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter(v => v !== val) : [...prev[key], val]
    }));
  };

  const selectAll = () => {
    setTempFilters({ schools: [...schools], branches: [...branchList], grades: [...validGrades], sections: [...validSections] });
  };
  const selectNone = () => {
    setTempFilters({ schools: [], branches: [], grades: [], sections: [] });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden border-4 border-blue-50 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800">تصفية البيانات (شؤون الطلاب ومعلمين)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          <div className="bg-blue-50/50 p-5 rounded-3xl border-2 border-blue-100/50 space-y-4">
            <h3 className="font-black text-blue-800 flex items-center gap-2"><Calendar size={18} /> الفترة الزمنية</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 pr-2">من تاريخ</label>
                <input type="date" value={tempRange.from} onChange={(e) => setTempRange(prev => ({ ...prev, from: e.target.value }))} className="w-full p-3 bg-white border-2 border-blue-100 rounded-xl text-sm font-bold text-slate-700 focus:border-blue-400" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 pr-2">إلى تاريخ</label>
                <input type="date" value={tempRange.to} onChange={(e) => setTempRange(prev => ({ ...prev, to: e.target.value }))} className="w-full p-3 bg-white border-2 border-blue-100 rounded-xl text-sm font-bold text-slate-700 focus:border-blue-400" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={selectAll} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all">تحديد الكل</button>
            <button onClick={selectNone} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-200 transition-all">إلغاء التحديد</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-black text-sm text-slate-700 border-b pb-2">المدارس</h4>
              <div className="flex flex-wrap gap-2">
                {schools.map((s: string) => (
                  <button key={s} onClick={() => toggleArrayItem('schools', s)} className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (tempFilters.schools.includes(s) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-sm text-slate-700 border-b pb-2">الفروع</h4>
              <div className="flex flex-wrap gap-2">
                {branchList.map(b => (
                  <button key={b} onClick={() => toggleArrayItem('branches', b)} className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (tempFilters.branches.includes(b) ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-sm text-slate-700 border-b pb-2">الصفوف</h4>
              <div className="flex flex-wrap gap-2">
                {validGrades.map(g => (
                  <button key={g} onClick={() => toggleArrayItem('grades', g)} className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (tempFilters.grades.includes(g) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-sm text-slate-700 border-b pb-2">الشعب</h4>
              <div className="flex flex-wrap gap-2">
                {validSections.map(s => (
                  <button key={s} onClick={() => toggleArrayItem('sections', s)} className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (tempFilters.sections.includes(s) ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all">إلغاء</button>
          <button onClick={() => { onApply(tempFilters, tempRange); onClose(); }} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">تطبيق التصفية</button>
        </div>
      </motion.div>
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <GlobalProvider>
      <Toaster position="top-center" richColors />
      <MainApp />
      <GlobalScrollArrows />
    </GlobalProvider>
  </ErrorBoundary>
);
export default App;