
import React, { useState } from 'react';
import { useGlobal } from '../context/GlobalState';
import { 
  Menu, X, Home, Users, ClipboardList, BookOpen, 
  Settings, LogOut, MessageCircle, FileText, UserPlus, FileSearch, Briefcase
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onOpenSettings: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, onOpenSettings }) => {
  const { lang, setLang, logout, data } = useGlobal();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { icon: <Home size={20} />, label: 'لوحة التحكم', path: 'dashboard' },
    { icon: <BookOpen size={20} />, label: 'متابعة المعلمين', path: 'daily' },
    { icon: <Briefcase size={20} />, label: 'متابعة الموظفين والعاملين', path: 'adminReports' },
    { icon: <Users size={20} />, label: 'شؤون الطلاب', path: 'studentReports' },
    { icon: <FileSearch size={20} />, label: 'التقارير الخاصة', path: 'specialReports' },
    { icon: <UserPlus size={20} />, label: 'جدول التغطية', path: 'substitute' },
    { icon: <FileText size={20} />, label: 'ملف المدرسة', path: 'profile' },
  ];

  const handleMenuClick = (item: any) => {
    onNavigate(item.path);
    setIsSidebarOpen(false);
  };

  return (
    <div className={`min-h-screen flex flex-col font-arabic`}>
      <header className="bg-white border-b h-16 flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
          <h1 className="text-xl font-bold text-blue-600 hidden sm:block"> رفيق المشرف الإداري </h1>
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
            {menuItems.map((item, idx) => (
              <button 
                key={idx}
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
