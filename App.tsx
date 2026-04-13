import React, { useState, useMemo, useEffect } from 'react';
import { GlobalProvider, useGlobal } from './context/GlobalState';
import Layout from './components/Layout';
import Dashboard from './app/Dashboard';
import SubstitutionPage from './app/SubstitutionPage';
import { DailyReportsPage, ViolationsPage, StudentsReportsPage } from './app/ReportsPage';
import StaffFollowUpPage from './app/StaffFollowUpPage';
import SpecialReportsPage from './app/SpecialReportsPage';
import ProfilePage from './app/ProfilePage';
import DataManagementModal from './components/DataManagementModal';
import AccessCodesModal from './components/AccessCodesModal';
import {
  Lock, LayoutDashboard, ClipboardCheck, UserX, UserPlus,
  Users, Database, FileSearch, Briefcase,
  School, Calendar, AlertTriangle, Phone, MessageCircle, Key, LogOut, User as UserIcon, X, Check
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
  const { isAuthenticated, currentUser, userFilter, setUserFilter, data, logout } = useGlobal();
  const [view, setView] = useState('dashboard');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isCodesModalOpen, setIsCodesModalOpen] = useState(false);
  const [isUserFilterModalOpen, setIsUserFilterModalOpen] = useState(false);

  const navItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard size={18} />, permission: 'dashboard' },
      { id: 'daily', label: 'متابعة المعلمين', icon: <ClipboardCheck size={18} />, permission: 'dailyFollowUp' },
      { id: 'adminReports', label: 'متابعة الموظفين والعاملين', icon: <Briefcase size={18} />, permission: 'adminFollowUp' },
      { id: 'substitute', label: 'جدول التغطية', icon: <UserPlus size={18} />, permission: 'substitutions' },
      { id: 'violations', label: 'التعهدات', icon: <UserX size={18} />, permission: 'studentAffairs' },
      { id: 'studentReports', label: 'تقارير الطلاب', icon: <Users size={18} />, permission: 'studentAffairs' },
      { id: 'specialReports', label: 'تقارير خاصة', icon: <FileSearch size={18} />, permission: 'specialReports' },
      { id: 'profile', label: 'ملف المدرسة', icon: <School size={18} />, permission: 'schoolProfile' },
    ];

    if (currentUser?.role === 'admin' || currentUser?.permissions?.all) return items;

    return items.filter(item => {
      const p = currentUser?.permissions?.[item.permission as keyof UserPermissions];
      return p === true || (Array.isArray(p) && p.length > 0);
    });
  }, [currentUser]);

  const isAdminOrFull = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;

  const filteredUsersForModal = useMemo(() => {
    const userSchools = currentUser?.selectedSchool.split(',').map(s => s.trim()) || [];
    return data.users.filter(u => {
      // 1. Hide admins/full-perm from non-admins
      const isTargetAdmin = u.role === 'admin' || u.permissions?.all === true;
      if (!isAdminOrFull && isTargetAdmin) return false;

      // 2. Filter by school for non-admins
      if (!isAdminOrFull) {
        // Only show users who share at least one school with the current user's active schools
        return u.schools.some(s => userSchools.includes(s));
      }

      return true;
    });
  }, [data.users, currentUser, isAdminOrFull]);

  const schoolsToDisplay = useMemo(() => {
    if (isAdminOrFull) return data.availableSchools || [];
    return currentUser?.selectedSchool.split(',').map(s => s.trim()) || [];
  }, [data.availableSchools, currentUser, isAdminOrFull]);

  const canSeeSpecialCodes = isAdminOrFull;


  if (!isAuthenticated) return <AdvancedLoginPage />;

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard setView={setView} />;
      case 'substitute': return <SubstitutionPage />;
      case 'daily': return <DailyReportsPage />;
      case 'adminReports': return <StaffFollowUpPage />;
      case 'violations': return <ViolationsPage />;
      case 'studentReports': return <StudentsReportsPage />;
      case 'specialReports': return <SpecialReportsPage />;
      case 'profile': return <ProfilePage />;
      default: return <Dashboard setView={setView} />;
    }
  };

  return (
    <Layout onNavigate={setView} onOpenSettings={() => setIsDataModalOpen(true)}>
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
          <button
            onClick={logout}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 border-2 border-red-100 rounded-[1.2rem] text-red-600 font-black text-sm hover:bg-red-600 hover:text-white transition-all shadow-sm"
          >
            <LogOut size={18} /> تسجيل الخروج
          </button>
          {/* User Filter Dropdown */}
          {(currentUser?.role === 'admin' || currentUser?.permissions?.all || currentUser?.permissions?.userManagement) && (
            <div className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-[1.2rem] text-slate-600 font-black text-sm shadow-sm">
              <Users size={18} className="text-blue-600" />
              <button
                onClick={() => (currentUser?.role === 'admin' || currentUser?.permissions?.all || currentUser?.permissions?.userManagement) && setIsUserFilterModalOpen(true)}
                className={`outline-none bg-transparent cursor-pointer min-w-[100px] text-right hover:text-blue-600`}
              >
                {userFilter === 'all' ? 'كل المستخدمين' :
                  userFilter.split(',').length > 1 ? `${userFilter.split(',').length} مستخدمين` :
                    data.users.find(u => u.id === userFilter)?.name || 'مستخدم غير معروف'}
              </button>
            </div>
          )}

          {canSeeSpecialCodes && (
            <button
              onClick={() => setIsCodesModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-[1.2rem] text-slate-600 font-black text-sm hover:border-blue-200 hover:shadow-md transition-all"
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
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-white">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-xl' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {renderView()}
      </div>

      <DataManagementModal isOpen={isDataModalOpen} onClose={() => setIsDataModalOpen(false)} />
      <AccessCodesModal isOpen={isCodesModalOpen} onClose={() => setIsCodesModalOpen(false)} />

      <UserFilterModal
        isOpen={isUserFilterModalOpen}
        onClose={() => setIsUserFilterModalOpen(false)}
        users={filteredUsersForModal}
        schools={schoolsToDisplay}
        selectedIds={userFilter === 'all' ? filteredUsersForModal.map(u => u.id) : userFilter.split(',')}
        onApply={(ids) => {
          if (ids.length === filteredUsersForModal.length && filteredUsersForModal.length > 0) {
            setUserFilter('all');
          } else if (ids.length === 0) {
            setUserFilter(currentUser?.id || 'all');
          } else {
            setUserFilter(ids.join(','));
          }
        }}
      />
    </Layout>
  );
};

const UserFilterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  schools: string[];
  selectedIds: string[];
  onApply: (ids: string[]) => void;
}> = ({ isOpen, onClose, users, schools, selectedIds, onApply }) => {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (isOpen) setTempSelected(selectedIds);
  }, [isOpen, selectedIds]);

  if (!isOpen) return null;

  const toggleUser = (id: string) => {
    setTempSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSchool = (schoolName: string) => {
    const usersInSchool = users.filter(u => u.schools.includes(schoolName)).map(u => u.id);
    const allSelected = usersInSchool.length > 0 && usersInSchool.every(id => tempSelected.includes(id));

    if (allSelected) {
      setTempSelected(prev => prev.filter(id => !usersInSchool.includes(id)));
    } else {
      setTempSelected(prev => Array.from(new Set([...prev, ...usersInSchool])));
    }
  };

  const selectAll = () => setTempSelected(users.map(u => u.id));
  const selectNone = () => setTempSelected([]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border-4 border-blue-50 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800">تصفية المستخدمين</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          <div className="flex gap-2">
            <button onClick={selectAll} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-sm hover:bg-blue-100 transition-all">تحديد الكل</button>
            <button onClick={selectNone} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-100 transition-all">إلغاء التحديد</button>
          </div>

          {schools.map(school => {
            const usersInSchool = users.filter(u => u.schools.includes(school));
            if (usersInSchool.length === 0) return null;

            const allSelected = usersInSchool.every(u => tempSelected.includes(u.id));

            return (
              <div key={school} className="space-y-3">
                <div
                  onClick={() => toggleSchool(school)}
                  className="flex items-center justify-between p-4 bg-blue-50/30 border-2 border-blue-100/50 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <School className="text-blue-500" size={20} />
                    <span className="font-black text-blue-700">{school}</span>
                  </div>
                  <div className={`w-6 h-6 rounded-lg border-2 border-blue-200 flex items-center justify-center transition-all ${allSelected ? 'bg-blue-600 border-blue-600' : 'bg-white group-hover:border-blue-400'}`}>
                    {allSelected && <Check size={16} className="text-white" />}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 pr-4">
                  {usersInSchool.map(u => (
                    <label key={`${school}-${u.id}`} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                          <UserIcon size={16} />
                        </div>
                        <span className="font-bold text-slate-700">{u.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempSelected.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all">إلغاء</button>
          <button
            onClick={() => {
              onApply(tempSelected);
              onClose();
            }}
            className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
          >
            تطبيق التصفية
          </button>
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