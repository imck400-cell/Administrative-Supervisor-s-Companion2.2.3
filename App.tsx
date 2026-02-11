import React, { useState, useMemo } from 'react';
import { GlobalProvider, useGlobal } from './context/GlobalState';
import Layout from './components/Layout';
import Dashboard from './app/Dashboard';
import SubstitutionPage from './app/SubstitutionPage';
import { DailyReportsPage, ViolationsPage, StudentsReportsPage } from './app/ReportsPage';
import StaffFollowUpPage from './app/StaffFollowUpPage';
import SpecialReportsPage from './app/SpecialReportsPage';
import ProfilePage from './app/ProfilePage';
import DataManagementModal from './components/DataManagementModal';
import {
  Lock, LayoutDashboard, ClipboardCheck, UserX, UserPlus,
  Users, Sparkles, Database, FileSearch, ArrowUp, ArrowDown, Briefcase
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
          <input
            type="password"
            className="w-full p-5 bg-slate-50 border-2 rounded-[1.5rem] text-center text-xl font-bold"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="كلمة المرور"
          />
          <button className="w-full bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-xl hover:bg-blue-700">دخول</button>
        </form>
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const { isAuthenticated, lang } = useGlobal();
  const [view, setView] = useState('dashboard');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard size={18} /> },
    { id: 'daily', label: 'متابعة المعلمين', icon: <ClipboardCheck size={18} /> },
    { id: 'adminReports', label: 'متابعة الإداريين', icon: <Briefcase size={18} /> },
    { id: 'substitute', label: 'جدول التغطية', icon: <UserPlus size={18} /> },
    { id: 'violations', label: 'التعهدات', icon: <UserX size={18} /> },
    { id: 'studentReports', label: 'تقارير الطلاب', icon: <Users size={18} /> },
    { id: 'specialReports', label: 'تقارير خاصة', icon: <FileSearch size={18} /> },
  ], []);

  if (!isAuthenticated) return <LoginPage />;

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
        <div>
          <h2 className="text-2xl font-black text-slate-800"> رفيق المشرف الإداري </h2>
          <p className="text-blue-500 text-sm font-bold"> نظام المتابعة المتطور </p>
        </div>
        <button onClick={() => setIsDataModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-[1.2rem] text-slate-600 font-black text-sm">
          <Database className="text-blue-600" size={18} /> إدارة البيانات
        </button>
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
    </Layout>
  );
};

const App: React.FC = () => <GlobalProvider><MainApp /></GlobalProvider>;
export default App;