
import React, { useState, useMemo, useEffect } from 'react';
import { useGlobal } from '../context/GlobalState';
import { 
  Briefcase, Users, FileText, GraduationCap, 
  ChevronRight, Calendar, Plus, Save, Share2, 
  Trash2, FileSpreadsheet, Download, Search, 
  CheckCircle, AlertCircle, Phone, MessageSquare, 
  UserCircle, Star, Filter, Clock, ShieldAlert, X,
  FileSearch, Archive, CheckSquare, PencilLine, Zap,
  Sparkles, Database, FileUp, FileDown, MessageCircle,
  Activity, Fingerprint, History, RefreshCw, Upload, LayoutList,
  Hammer, UserPlus, Edit, ArrowUpDown, PhoneCall, Mail
} from 'lucide-react';
import { AbsenceLog, LatenessLog, StudentViolationLog, StudentReport, ExitLog, DamageLog, ParentVisitLog, ExamLog } from '../types';
import * as XLSX from 'xlsx';

type MainTab = 'supervisor' | 'staff' | 'students' | 'tests';
type SubTab = string;

const exportExcelFiltered = (title: string, list: any[], columns: { label: string; key: string }[]) => {
  const worksheet = XLSX.utils.json_to_sheet(list.map(row => {
    const formatted: any = {};
    columns.forEach(col => {
      formatted[col.label] = Array.isArray(row[col.key]) ? row[col.key].join('، ') : row[col.key];
    });
    return formatted;
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `${title}_${new Date().getTime()}.xlsx`);
};

const exportTxtFiltered = (title: string, list: any[], columns: { label: string; key: string }[]) => {
  let text = `*📋 تقرير: ${title}*\n`;
  text += `*التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n`;
  text += `----------------------------------\n\n`;

  list.forEach((row, idx) => {
    text += `*🔹 البند (${idx + 1}):*\n`;
    columns.forEach(col => {
      const val = Array.isArray(row[col.key]) ? row[col.key].join('، ') : row[col.key];
      text += `▪️ *${col.label}:* ${val || '---'}\n`;
    });
    text += `\n`;
  });

  const blob = new Blob([text.replace(/\*/g, '')], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${title}_${new Date().getTime()}.txt`;
  link.click();
};

interface CategoryMember {
  id: string;
  name: string;
  grade: string;
  section: string;
  isAuto: boolean;
}

const FrequentNamesPicker = ({ logs, onSelectQuery, isOpen, onClose }: { logs: any[]; onSelectQuery: (name: string) => void; isOpen: boolean; onClose: () => void }) => {
  const frequentList = useMemo(() => {
    const uniqueMap = new Map();
    [...logs].sort((a, b) => b.date.localeCompare(a.date)).forEach(log => {
      if (!uniqueMap.has(log.studentName)) {
        uniqueMap.set(log.studentName, log);
      }
    });
    return Array.from(uniqueMap.values());
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-arabic">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-right">
        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800">الأسماء المتكررة</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400"/></button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {frequentList.length === 0 ? (
            <p className="text-center p-8 text-slate-400 italic">لا توجد بيانات سابقة</p>
          ) : (
            frequentList.map((item, idx) => (
              <button 
                key={idx} 
                onClick={() => { onSelectQuery(item.studentName); onClose(); }}
                className="w-full text-right p-3 hover:bg-blue-50 rounded-xl font-bold flex justify-between items-center transition-colors border-b border-slate-50 last:border-none"
              >
                <span className="text-xs text-slate-400">{item.date}</span>
                <span className="text-slate-700">{item.studentName}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const SpecialReportsPage: React.FC<{ initialSubTab?: string; onSubTabOpen?: (id: string) => void; onNavigate?: (v: string) => void }> = ({ initialSubTab, onSubTabOpen, onNavigate }) => {
  const { lang, data, updateData } = useGlobal();
  const [activeTab, setActiveTab] = useState<MainTab>('supervisor');
  const [activeSubTab, setActiveSubTab] = useState<SubTab | null>(null);
  
  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFrequentNames, setShowFrequentNames] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const structure = {
    supervisor: { title: 'المشرف الإداري', icon: <Briefcase />, items: ['الخطة الفصلية', 'الخلاصة الشهرية', 'المهام اليومية', 'المهام المضافة', 'المهام المرحلة', 'أهم المشكلات اليومية', 'التوصيات العامة', 'احتياجات الدور', 'سجل متابعة الدفاتر والتصحيح', 'الجرد العام للعهد', 'ملاحظات عامة'] },
    staff: { title: 'الكادر التعليمي', icon: <Users />, items: ['سجل الإبداع والتميز', 'كشف الاستلام والتسليم', 'المخالفات', 'التعميمات'] },
    students: { title: 'الطلاب/ الطالبات', icon: <GraduationCap />, items: ['الغياب اليومي', 'التأخر', 'خروج طالب أثناء الدراسة', 'المخالفات الطلابية', 'سجل الإتلاف المدرسي', 'سجل الحالات الخاصة', 'سجل الحالة الصحية', 'سجل زيارة أولياء الأمور والتواصل بهم'] },
    tests: { title: 'تقارير الاختبار', icon: <FileSearch />, items: ['الاختبار الشهري', 'الاختبار الفصلي'] }
  };

  const renderContent = () => {
    if (!activeSubTab) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {structure[activeTab].items.map((item, idx) => (
             <button 
               key={idx} 
               onClick={() => { setActiveSubTab(item); onSubTabOpen?.(item); }}
               className="bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-xl hover:border-blue-300 transition-all flex flex-col items-center gap-4 group text-center"
             >
                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all text-blue-600">
                   {structure[activeTab].icon}
                </div>
                <span className="font-black text-slate-700 group-hover:text-blue-600 transition-colors text-lg">{item}</span>
                <ChevronRight className="text-slate-200 group-hover:text-blue-400 transition-all" />
             </button>
           ))}
        </div>
      );
    }

    return (
      <div className="bg-white p-20 rounded-[3rem] border shadow-sm flex flex-col items-center gap-6 text-center">
        <div className="p-6 bg-orange-50 text-orange-500 rounded-full animate-bounce"><AlertCircle size={48}/></div>
        <h3 className="text-2xl font-black text-slate-800">جاري التطوير...</h3>
        <p className="text-slate-400 font-bold">هذه الوحدة ({activeSubTab}) ستكون متاحة في التحديث القادم</p>
        <button onClick={() => setActiveSubTab(null)} className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black">العودة للتقارير</button>
      </div>
    );
  };

  return (
    <div className="space-y-8 font-arabic text-right pb-20">
      <header className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">التقارير الخاصة <FileSearch className="text-blue-600"/></h2>
          <p className="text-slate-400 font-bold mt-1 text-sm">نظام تقارير ذكي وشامل للمؤسسة</p>
        </div>
        <div className="flex gap-2 bg-slate-50 p-2 rounded-3xl border">
          {(Object.keys(structure) as MainTab[]).map((tab) => (
            <button 
              key={tab} 
              onClick={() => { setActiveTab(tab); setActiveSubTab(null); }}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-sm transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-blue-600'}`}
            >
              {React.cloneElement(structure[tab].icon as React.ReactElement<any>, { size: 20 })}
              {structure[tab].title}
            </button>
          ))}
        </div>
      </header>
      {renderContent()}
    </div>
  );
};

export default SpecialReportsPage;
