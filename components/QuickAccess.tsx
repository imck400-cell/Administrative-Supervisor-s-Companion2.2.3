import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, BookOpen, Briefcase, UserPlus, AlertCircle, Users, 
  FileSearch, FileText, BarChart, ClipboardList, Key, Database, Zap, Plus, X, Star, Link, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_ACTIONS = [
  { id: 'dashboard', label: 'الرئيسية', icon: <Home size={18} /> },
  { id: 'daily', label: 'متابعة المعلمين', icon: <BookOpen size={18} /> },
  { id: 'adminReports', label: 'متابعة الموظفين', icon: <Briefcase size={18} /> },
  { id: 'substitute', label: 'جدول التغطية', icon: <UserPlus size={18} /> },
  { id: 'violations', label: 'التعهدات', icon: <AlertCircle size={18} /> },
  { id: 'studentReports', label: 'شؤون الطلاب', icon: <Users size={18} /> },
  { id: 'specialReports', label: 'التقارير الخاصة', icon: <FileSearch size={18} /> },
  { id: 'profile', label: 'ملف المدرسة', icon: <FileText size={18} /> },
  { id: 'comprehensiveIndicatorsModal', label: 'مؤشرات الأداء', icon: <BarChart size={18} /> },
  { id: 'caseStudyModal', label: 'دراسة حالة طالب', icon: <ClipboardList size={18} /> },
  { id: 'trainingCoursesModal', label: 'الدورات التدريبية', icon: <BookOpen size={18} /> },
  { id: 'issuesModal', label: 'المشكلات والحلول', icon: <AlertCircle size={18} /> },
  { id: 'codesModal', label: 'التحكم بالصلاحيات', icon: <Key size={18} /> },
  { id: 'dataModal', label: 'إدارة البيانات', icon: <Database size={18} /> },
];

export const useQuickAccess = (userId?: string) => {
  const [pinned, setPinned] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId) return;
    try {
      const p = JSON.parse(localStorage.getItem(`quickAccess_pinned_${userId}`) || '[]');
      const r = JSON.parse(localStorage.getItem(`quickAccess_recent_${userId}`) || '[]');
      const u = JSON.parse(localStorage.getItem(`quickAccess_usage_${userId}`) || '{}');
      setPinned(Array.isArray(p) ? p : []);
      setRecent(Array.isArray(r) ? r : []);
      setUsage(typeof u === 'object' ? u : {});
    } catch (e) {
      // ignore
    }
  }, [userId]);

  const save = (p: string[], r: string[], u: Record<string, number>) => {
    if (!userId) return;
    localStorage.setItem(`quickAccess_pinned_${userId}`, JSON.stringify(p));
    localStorage.setItem(`quickAccess_recent_${userId}`, JSON.stringify(r));
    localStorage.setItem(`quickAccess_usage_${userId}`, JSON.stringify(u));
  };

  const recordUsage = (actionId: string) => {
    setRecent(prev => {
      const newList = [actionId, ...prev.filter(id => id !== actionId)].slice(0, 5); // Keep last 5
      const newUsage = { ...usage, [actionId]: (usage[actionId] || 0) + 1 };
      setUsage(newUsage);
      save(pinned, newList, newUsage);
      return newList;
    });
  };

  const togglePin = (actionId: string) => {
    setPinned(prev => {
      const newList = prev.includes(actionId) ? prev.filter(id => id !== actionId) : [...prev, actionId];
      save(newList, recent, usage);
      return newList;
    });
  };

  return { pinned, recent, usage, recordUsage, togglePin };
};

export const QuickAccess: React.FC<{
  userId?: string;
  onAction: (id: string) => void;
}> = ({ userId, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { pinned, recent, usage, togglePin } = useQuickAccess(userId);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAll(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAction = (id: string) => ALL_ACTIONS.find(a => a.id === id)!;

  // Frequently used items (top 3, not pinned, not recent)
  const popular = Object.entries(usage)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .filter(id => !pinned.includes(id) && !recent.includes(id))
    .slice(0, 3);

  const handleActionClick = (id: string) => {
    onAction(id);
    setIsOpen(false);
  };

  const ActionButton = ({ id, isPinned }: { id: string, isPinned?: boolean }) => {
    const action = getAction(id);
    if (!action) return null;
    return (
      <div className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-xl group transition-all">
        <button className="flex items-center gap-3 flex-1 text-slate-700 font-bold text-sm" onClick={() => handleActionClick(id)}>
          <div className="text-blue-500">{action.icon}</div>
          {action.label}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); togglePin(id); }}
          className={`p-1.5 rounded-lg transition-colors \${isPinned ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100 opacity-0 group-hover:opacity-100'}`}
          title={isPinned ? 'إلغاء التثبيت' : 'تثبيت في الوصول السريع'}
        >
          <Star size={16} fill={isPinned ? "currentColor" : "none"} />
        </button>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-2 border-amber-100 rounded-[1.2rem] text-amber-700 font-bold text-sm hover:bg-amber-100 hover:border-amber-300 transition-all shadow-sm"
      >
        <Zap size={18} className="fill-amber-500 text-amber-500" /> الوصول السريع
        <ChevronDown size={16} className={`transition-transform duration-200 \${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
          >
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
              {!showAll ? (
                <>
                  {pinned.length > 0 && (
                    <div className="mb-3">
                      <div className="px-3 py-1 text-xs font-black text-amber-600 mb-1 flex items-center gap-1"><Star size={12} fill="currentColor"/> المثبتة</div>
                      {pinned.map(id => <ActionButton key={id} id={id} isPinned={true} />)}
                    </div>
                  )}

                  {recent.length > 0 && (
                    <div className="mb-3">
                      <div className="px-3 py-1 text-xs font-black text-blue-400 mb-1">الأخيرة</div>
                      {recent.filter(id => !pinned.includes(id)).map(id => <ActionButton key={id} id={id} />)}
                    </div>
                  )}

                  {popular.length > 0 && (
                    <div className="mb-3">
                      <div className="px-3 py-1 text-xs font-black text-emerald-500 mb-1">الأكثر استخداماً</div>
                      {popular.map(id => <ActionButton key={id} id={id} />)}
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => setShowAll(true)}
                      className="w-full text-center py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      تخصيص القائمة (إظهار الكل)
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3 px-2">
                    <span className="font-black text-slate-800 text-sm">كافة الإجراءات المتاحة</span>
                    <button onClick={() => setShowAll(false)} className="text-slate-400 hover:text-slate-700 bg-slate-50 p-1 rounded-lg">
                      <ChevronDown size={16} className="rotate-90" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {ALL_ACTIONS.map(action => (
                      <ActionButton key={action.id} id={action.id} isPinned={pinned.includes(action.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
