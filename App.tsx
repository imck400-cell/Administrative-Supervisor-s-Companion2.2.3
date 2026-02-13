
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobalProvider, useGlobal } from './context/GlobalState';
import Layout from './components/Layout';
import Dashboard from './app/Dashboard';
import SubstitutionPage from './app/SubstitutionPage';
import { DailyReportsPage, ViolationsPage, StudentsReportsPage } from './app/ReportsPage';
import StaffFollowUpPage from './app/StaffFollowUpPage';
import SpecialReportsPage from './app/SpecialReportsPage';
import ProfilePage from './app/ProfilePage';
import DataManagementModal from './components/DataManagementModal';
import BottomNav from './components/BottomNav';
import PullUpMenu from './components/PullUpMenu';
import {
  Lock, LayoutDashboard, ClipboardCheck, ClipboardList, UserX, UserPlus,
  Users, Sparkles, UserCircle, Database, Settings,
  FileSearch, ArrowUp, ArrowDown, Clock, ShieldAlert,
  Hammer, FileText, Calendar, Star, AlertCircle, Zap, X, ChevronLeft
} from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useGlobal();
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(pass)) setError(true);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 font-arabic">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md space-y-8 border-4 border-blue-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl shadow-lg shadow-blue-200 mb-6 transform rotate-3">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight"> رفيق المشرف الإداري </h2>
          <p className="text-blue-500 font-bold mt-2 text-sm">رفيقك في كتابة تقارير الإشراف الإداري</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 mr-2">كلمة المرور</label>
            <input
              type="password"
              className={`w-full p-5 bg-slate-50 border-2 rounded-[1.5rem] focus:ring-4 focus:ring-blue-100 transition-all text-center text-xl font-bold tracking-widest ${error ? 'border-red-500' : 'border-slate-100 focus:border-blue-500'}`}
              value={pass}
              onChange={(e) => { setPass(e.target.value); setError(false); }}
              placeholder="•••"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center font-bold animate-bounce">كلمة المرور غير صحيحة!</p>}
          <button className="w-full bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all transform hover:scale-[1.02] active:scale-95">
            دخول النظام
          </button>
        </form>
        <div className="text-center text-slate-400 text-xs font-bold border-t pt-6">
          بإشراف المستشار إبراهيم دخان
        </div>
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const { isAuthenticated, lang } = useGlobal();
  const [view, setView] = useState('dashboard');
  const [viewHistory, setViewHistory] = useState<string[]>(['dashboard']);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(false);

  const navItems = useMemo(() => [
    { id: 'dashboard', label: lang === 'ar' ? 'الرئيسية' : 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'daily', label: lang === 'ar' ? 'متابعة المعلمين' : 'Teachers Log', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'staffFollowUp', label: lang === 'ar' ? 'متابعة الموظفين والعاملين' : 'Staff Follow-up', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'substitute', label: lang === 'ar' ? 'جدول التغطية' : 'Coverage Log', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'violations', label: lang === 'ar' ? 'التعهدات' : 'Violations', icon: <UserX className="w-4 h-4" /> },
    { id: 'studentReports', label: lang === 'ar' ? 'تقارير الطلاب' : 'Student Reports', icon: <Users className="w-4 h-4" /> },
    { id: 'specialReports', label: lang === 'ar' ? 'تقارير خاصة' : 'Special Reports', icon: <FileSearch className="w-4 h-4" /> },
  ], [lang]);

  const [recentActionIds, setRecentActionIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('recent_nav_ids_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const trackAction = (viewId: string) => {
    if (viewId === 'dashboard') return;

    setRecentActionIds(prev => {
      const filtered = prev.filter(id => id !== viewId);
      const updated = [viewId, ...filtered].slice(0, 12);
      localStorage.setItem('recent_nav_ids_v2', JSON.stringify(updated));
      return updated;
    });
  };

  const recentActions = useMemo(() => {
    return recentActionIds
      .map(id => {
        if (id.includes(':')) {
          const [mainId, subLabel] = id.split(':');
          const mainItem = navItems.find(item => item.id === mainId);
          if (!mainItem) return null;

          let subIcon = <FileText className="w-4 h-4" />;
          if (subLabel.includes('الغياب')) subIcon = <Clock className="w-4 h-4" />;
          if (subLabel.includes('التأخر')) subIcon = <Clock className="w-4 h-4 text-orange-500" />;
          if (subLabel.includes('خروج')) subIcon = <UserPlus className="w-4 h-4" />;
          if (subLabel.includes('المخالفات')) subIcon = <ShieldAlert className="w-4 h-4 text-red-500" />;
          if (subLabel.includes('إتلاف')) subIcon = <Hammer className="w-4 h-4" />;
          if (subLabel.includes('زيارة')) subIcon = <UserPlus className="w-4 h-4 text-indigo-600" />;
          if (subLabel.includes('الخطة')) subIcon = <Calendar className="w-4 h-4 text-blue-500" />;
          if (subLabel.includes('إبداع')) subIcon = <Star className="w-4 h-4 text-yellow-500" />;
          if (subLabel.includes('اختبار')) subIcon = <FileSearch className="w-4 h-4 text-purple-500" />;

          return { id, label: subLabel, icon: subIcon };
        }
        return navItems.find(item => item.id === id);
      })
      .filter((item): item is { id: string; label: string; icon: React.ReactElement } => !!item);
  }, [recentActionIds, navItems]);

  const handleSetView = (v: string) => {
    setView(v);
    setViewHistory(prev => [...prev, v]);
    trackAction(v);
    setIsActionMenuOpen(false);
  };

  const handleGoBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop(); // remove current
      const prevView = newHistory[newHistory.length - 1];
      setView(prevView);
      setViewHistory(newHistory);
      setIsActionMenuOpen(false);
    } else {
      handleSetView('dashboard');
    }
  };

  if (!isAuthenticated) return <LoginPage />;

  const renderView = () => {
    const [mainView, subView] = view.split(':');
    switch (mainView) {
      case 'dashboard': return <Dashboard setView={handleSetView} recentActions={recentActions} />;
      case 'substitute': return <SubstitutionPage />;
      case 'daily': return <DailyReportsPage />;
      case 'staffFollowUp': return <StaffFollowUpPage />;
      case 'violations': return <ViolationsPage />;
      case 'studentReports': return <StudentsReportsPage />;
      // START OF CHANGE
      case 'specialReports': return <SpecialReportsPage initialSubTab={subView} onSubTabOpen={(subId) => trackAction(`specialReports:${subId}`)} onNavigate={handleSetView} />;
      // END OF CHANGE
      case 'profile': return <ProfilePage />;
      default: return <Dashboard setView={handleSetView} recentActions={recentActions} />;
    }
  };

  const handleActionTrigger = (actionId: string) => {
    // Dispatch a custom event for the active page to handle
    window.dispatchEvent(new CustomEvent('page-action', { detail: { actionId } }));

    // Close menu if it's not a persistent toggle action
    if (!['writer', 'date', 'metrics'].includes(actionId)) {
      setIsActionMenuOpen(false);
    }
  };

  return (
    <Layout onNavigate={handleSetView} onOpenSettings={() => setIsDataModalOpen(true)}>
      {view === 'dashboard' && (
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight"> رفيق المشرف الإداري </h2>
            <p className="text-blue-500 text-sm font-bold"> رفيقك في كتابة تقارير الإشراف الإداري </p>
          </div>

          <button
            onClick={() => setIsDataModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-[1.2rem] text-slate-600 font-black text-sm hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm"
          >
            <Database className="w-5 h-5 text-blue-600" />
            <span>إدارة ونقل البيانات</span>
          </button>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="flex overflow-x-auto scrollbar-none gap-2 mb-8 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-white no-scrollbar pb-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSetView(item.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all whitespace-nowrap ${view.startsWith(item.id)
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 scale-105'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {renderView()}
      </div>

      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
      />

      <PullUpMenu
        isOpen={isActionMenuOpen}
        onClose={() => setIsActionMenuOpen(false)}
        view={view}
        onAction={handleActionTrigger}
      />

      {/* Quick Access Modal */}
      <AnimatePresence>
        {isQuickAccessOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickAccessOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[150]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed inset-x-4 top-20 bottom-24 bg-white rounded-[3rem] z-[160] shadow-2xl p-8 flex flex-col gap-6 md:max-w-2xl md:mx-auto"
            >
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">الوصول السريع</h3>
                    <p className="text-slate-400 text-xs font-bold">اختصاراتك المفضلة وسجل النشاط</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQuickAccessOpen(false)}
                  className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
                {recentActions.length > 0 && (
                  <section>
                    <h4 className="text-sm font-black text-slate-400 mb-4 px-2 uppercase tracking-widest">آخر العمليات</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {recentActions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => {
                            handleSetView(action.id);
                            setIsQuickAccessOpen(false);
                          }}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-all group border border-transparent hover:border-blue-100"
                        >
                          <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-400 group-hover:text-blue-600 shadow-sm transition-colors">
                            {action.icon}
                          </div>
                          <span className="font-bold flex-1 text-right">{action.label}</span>
                          <ChevronLeft size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h4 className="text-sm font-black text-slate-400 mb-4 px-2 uppercase tracking-widest">الأقسام الرئيسية</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleSetView(item.id);
                          setIsQuickAccessOpen(false);
                        }}
                        className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 transition-all group border border-transparent hover:border-emerald-100"
                      >
                        <div className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-slate-400 group-hover:text-emerald-600 shadow-sm transition-colors">
                          {React.cloneElement(item.icon as React.ReactElement<any>, { size: 24 })}
                        </div>
                        <span className="text-xs font-black">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav
        onBack={handleGoBack}
        onHome={() => handleSetView('dashboard')}
        onQuickAccess={() => setIsQuickAccessOpen(true)}
        onToggleMenu={() => setIsActionMenuOpen(!isActionMenuOpen)}
        activeView={view}
      />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <GlobalProvider>
      <MainApp />
    </GlobalProvider>
  );
};

export default App;
