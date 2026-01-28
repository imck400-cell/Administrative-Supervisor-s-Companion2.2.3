
import React, { useState } from 'react';
import { useGlobal } from '../context/GlobalState';
import { 
  Menu, X, Home, Users, ClipboardList, BookOpen, 
  Settings, LogOut, MessageCircle, FileText, UserPlus, AlertTriangle, FileSearch
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onOpenSettings: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, onOpenSettings }) => {
  const { lang, setLang, logout, data } = useGlobal();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const t = {
    ar: {
      dashboard: 'لوحة التحكم',
      profile: 'ملف المدرسة',
      daily: 'شؤون المعلمين',
      substitute: 'جدول التغطية',
      students: 'شؤون الطلاب',
      specialReports: 'التقارير الخاصة',
      settings: 'الإعدادات',
      logout: 'تسجيل الخروج',
      footer: 'إعداد المستشار الإداري والتربوي إبراهيم دخان'
    },
    en: {
      dashboard: 'Dashboard',
      profile: 'School Profile',
      daily: 'Teachers Affairs',
      substitute: 'Coverage Schedule',
      students: 'Students Affairs',
      specialReports: 'Special Reports',
      settings: 'Settings',
      logout: 'Logout',
      footer: 'Prepared by Admin Consultant Ibrahim Dukhan'
    }
  }[lang];

  const menuItems = [
    { icon: <Home className="w-5 h-5" />, label: t.dashboard, path: 'dashboard' },
    { icon: <FileText className="w-5 h-5" />, label: t.profile, path: 'profile' },
    { icon: <UserPlus className="w-5 h-5" />, label: t.substitute, path: 'substitute' },
    { icon: <Users className="w-5 h-5" />, label: t.students, path: 'studentReports' },
    { icon: <FileSearch className="w-5 h-5" />, label: t.specialReports, path: 'specialReports' },
    { icon: <BookOpen className="w-5 h-5" />, label: t.daily, path: 'daily' },
    { icon: <Settings className="w-5 h-5" />, label: t.settings, path: 'settings' },
  ];

  const handleMenuClick = (item: any) => {
    if (item.path === 'settings') {
      onOpenSettings();
    } else {
      onNavigate(item.path);
    }
    setIsSidebarOpen(false);
  };

  return (
    <div className={`min-h-screen flex flex-col ${lang === 'ar' ? 'font-arabic' : ''}`}>
      {/* Header */}
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
            className="px-4 py-1.5 border rounded-full text-sm font-semibold hover:bg-slate-50 transition-all bg-white shadow-sm"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
          <button onClick={logout} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-40 sm:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
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

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 bg-slate-50 overflow-auto">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t py-4 px-6 flex items-center justify-center gap-4 text-center">
        <span className="text-slate-600 font-semibold text-xs sm:text-sm">{t.footer}</span>
        <a 
          href="https://wa.me/967780804012" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-transform hover:scale-110 shadow-lg"
        >
          <MessageCircle className="w-4 h-4 sm:w-5 h-5" />
        </a>
      </footer>
    </div>
  );
};

export default Layout;