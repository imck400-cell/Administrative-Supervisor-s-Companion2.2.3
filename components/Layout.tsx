
import React, { useState } from 'react';
import { useGlobal } from '../context/GlobalState';
import { 
  Menu, X, Home, Users, ClipboardList, BookOpen, 
  Settings, LogOut, MessageCircle, FileText, UserPlus, FileSearch, Briefcase, AlertCircle, UserX, BarChart
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onOpenSettings: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, onOpenSettings }) => {
  const { lang, setLang, logout, data, currentUser } = useGlobal();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const issuesModalPerm = currentUser?.permissions?.issuesModal;
  const canUseIssuesButton = currentUser?.role === 'admin' || 
     currentUser?.permissions?.all === true ||
     issuesModalPerm === undefined || 
     (Array.isArray(issuesModalPerm) && issuesModalPerm.includes('useIssuesButton'));

  const managedIds = currentUser?.permissions?.managedUserIds || [];
  const isManager = currentUser?.permissions?.userManagement === true || managedIds.length > 0;
  const isGeneralSupervisor = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
  const hasCaseStudyPerm = currentUser?.permissions?.caseStudyModal === true;
  const canUseCaseStudy = hasCaseStudyPerm || isGeneralSupervisor || isManager;
  
  const trainingPerm = currentUser?.permissions?.trainingCourses;
  const canUseTrainingCourses = isGeneralSupervisor || trainingPerm === true || trainingPerm === undefined || (Array.isArray(trainingPerm) && trainingPerm.length > 0);

  const studentAffairsPerm = currentUser?.permissions?.studentAffairs;
  const canUseStudentAffairs = isGeneralSupervisor || studentAffairsPerm === true || (Array.isArray(studentAffairsPerm) && studentAffairsPerm.length > 0);
  
  const canUseComprehensiveIndicators = isGeneralSupervisor || (Array.isArray(currentUser?.permissions?.comprehensiveIndicators) && currentUser!.permissions!.comprehensiveIndicators.includes('showButton'));

  const menuItems = [
    { icon: <Home size={20} />, label: 'لوحة التحكم', path: 'dashboard' },
    { icon: <BookOpen size={20} />, label: 'متابعة المعلمين', path: 'daily' },
    { icon: <Briefcase size={20} />, label: 'متابعة الموظفين والعاملين', path: 'adminReports' },
    ...(canUseStudentAffairs ? [{ icon: <UserX size={20} />, label: 'التعهدات', path: 'violations' }] : []),
    { icon: <Users size={20} />, label: 'شؤون الطلاب', path: 'studentReports' },
    { icon: <FileSearch size={20} />, label: 'التقارير الخاصة', path: 'specialReports' },
    ...(canUseComprehensiveIndicators ? [{ icon: <BarChart size={20} />, label: 'مؤشرات الأداء الشاملة', path: 'comprehensiveIndicatorsModal' }] : []),
    ...(canUseCaseStudy ? [{ icon: <ClipboardList size={20} />, label: 'دراسة حالة طالب', path: 'caseStudyModal' }] : []),
    ...(canUseTrainingCourses ? [{ icon: <BookOpen size={20} />, label: 'الدورات التدريبية', path: 'trainingCoursesModal' }] : []),
    ...(canUseIssuesButton ? [{ icon: <AlertCircle size={20} />, label: 'المشكلات والحلول', path: 'issuesModal' }] : []),
    { icon: <UserPlus size={20} />, label: 'جدول التغطية', path: 'substitute' },
    { icon: <FileText size={20} />, label: 'ملف المدرسة', path: 'profile' },
  ];

  const handleMenuClick = (item: any) => {
    if (item.action) {
      item.action();
    } else {
      onNavigate(item.path);
    }
    setIsSidebarOpen(false);
  };

  return (
    <div className={`min-h-screen flex flex-col font-arabic`}>
      <header className="bg-white border-b h-16 flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm relative">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden sm:block">
          <h1 className="text-xl font-black text-blue-600 whitespace-nowrap"> رفيقك في كتابة التقارير الإدارية </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-4 py-1.5 border rounded-full text-sm font-semibold bg-white shadow-sm"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
          <button onClick={logout} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        <aside className={`fixed sm:sticky top-16 z-40 h-[calc(100vh-4rem)] bg-white border-e transition-all duration-300 shadow-xl sm:shadow-none ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <button 
                key={item.path}
                onClick={() => handleMenuClick(item)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all text-sm font-bold text-right"
              >
                <div className="text-blue-500">{item.icon}</div>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 bg-slate-50 overflow-auto">
          {children}
        </main>
      </div>

      <footer className="bg-white border-t py-4 px-6 text-center text-slate-600 font-semibold text-xs sm:text-sm">
        إعداد المستشار الإداري والتربوي إبراهيم دخان
      </footer>
    </div>
  );
};

export default Layout;
