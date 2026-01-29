
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
import DynamicTable from '../components/DynamicTable';
import * as XLSX from 'xlsx';

type MainTab = 'supervisor' | 'staff' | 'students' | 'tests';
type SubTab = string;

// Helper functions for exporting filtered data used across modules
const exportExcelFiltered = (title: string, list: any[], columns: { label: string, key: string }[]) => {
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

const exportTxtFiltered = (title: string, list: any[], columns: { label: string, key: string }[]) => {
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

const FrequentNamesPicker = ({ logs, onSelectQuery, isOpen, onClose }: { logs: any[], onSelectQuery: (name: string) => void, isOpen: boolean, onClose: () => void }) => {
  const frequentList = useMemo(() => {
    const uniqueMap = new Map();
    [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(log => {
      if (!uniqueMap.has(log.studentName)) {
        uniqueMap.set(log.studentName, log);
      }
    });
    return Array.from(uniqueMap.values());
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-arabic">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800">الأسماء المتكررة (الأحدث أولاً)</h3>
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

// Component to handle filtering in special reports view
const FilterSection = ({ 
  suggestions, 
  values, 
  setValues, 
  tempNames, 
  setTempNames, 
  appliedNames, 
  setAppliedNames, 
  nameInput, 
  setNameInput, 
  onExportExcel, 
  onExportTxt, 
  onExportWA 
}: any) => {
  return (
    <div className="bg-slate-50 p-4 md:p-6 rounded-[2rem] border space-y-4 animate-in slide-in-from-top-4 duration-300">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[280px] space-y-2">
          <label className="text-[10px] font-black text-slate-400 mr-2">تصفية حسب الأسماء</label>
          <div className="flex gap-2 relative">
            <div className="flex-1 relative">
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border rounded-xl outline-none focus:ring-2 ring-blue-100 font-bold text-xs" 
                placeholder="ابحث عن اسم..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[100] bg-white border rounded-xl shadow-xl mt-1 overflow-hidden">
                  {suggestions.map((s: any) => (
                    <button 
                      key={s.id || s.name}
                      onClick={() => { setTempNames([...tempNames, s.name]); setNameInput(''); }}
                      className="w-full text-right p-3 text-[10px] font-bold hover:bg-blue-50 border-b last:border-none"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => setAppliedNames(tempNames)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-blue-700"
            >
              تطبيق
            </button>
            <button 
              onClick={() => { setTempNames([]); setAppliedNames([]); }}
              className="bg-white border text-slate-500 px-3 py-2.5 rounded-xl font-black text-xs hover:bg-slate-50"
            >
              إعادة
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {tempNames.map((name: string) => (
              <span key={name} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[9px] font-black">
                {name} <X size={10} className="cursor-pointer" onClick={() => setTempNames(tempNames.filter((n: string) => n !== name))} />
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 mr-2">الفصل / التاريخ</label>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border">
            <select className="text-[10px] font-black outline-none bg-transparent" value={values.semester} onChange={e => setValues({...values, semester: e.target.value})}>
                <option value="">كل الفصول</option>
                <option value="الأول">الأول</option>
                <option value="الثاني">الثاني</option>
            </select>
            <span className="text-slate-200">|</span>
            <input type="date" className="text-[10px] font-black outline-none bg-transparent" value={values.start} onChange={e => setValues({...values, start: e.target.value})} />
            <span className="text-slate-200">-</span>
            <input type="date" className="text-[10px] font-black outline-none bg-transparent" value={values.end} onChange={e => setValues({...values, end: e.target.value})} />
          </div>
        </div>

        <div className="flex gap-2">
            <button onClick={onExportWA} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all border border-green-100"><Share2 size={18}/></button>
            <button onClick={onExportExcel} className="p-2.5 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-all border border-green-100"><FileSpreadsheet size={18}/></button>
            <button onClick={onExportTxt} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all border border-slate-200"><FileText size={18}/></button>
        </div>
      </div>
    </div>
  );
};

const SpecialReportsPage: React.FC<{ initialSubTab?: string, onSubTabOpen?: (id: string) => void, onNavigate?: (v: string) => void }> = ({ initialSubTab, onSubTabOpen, onNavigate }) => {
  const { lang, data, updateData } = useGlobal();
  const [activeTab, setActiveTab] = useState<MainTab>('supervisor');
  const [activeSubTab, setActiveSubTab] = useState<SubTab | null>(null);
  
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [showTable, setShowTable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFrequentNames, setShowFrequentNames] = useState(false);

  // Presence Tracker State
  const [showPresenceTracker, setShowPresenceTracker] = useState(false);
  const [presenceBranch, setPresenceBranch] = useState<string[]>([]);
  const [presenceGrade, setPresenceGrade] = useState('');
  const [presenceSection, setPresenceSection] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'excused' | 'unexcused'>>({});
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [presenceDate, setPresenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedForWA, setSelectedForWA] = useState<string[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const gradeOptions = ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const sectionOptions = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];

  const [filterValues, setFilterValues] = useState({ semester: '', start: today, end: today, grade: '', section: '' });
  const [tempNames, setTempNames] = useState<string[]>([]);
  const [appliedNames, setAppliedNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState('');

  const students = data.studentReports || [];

  const filteredPresence = useMemo(() => {
    return students.filter(s => {
      const studentGender = String(s.gender || "").trim();
      const branchMatch = !presenceBranch.length || 
                         (presenceBranch.includes('طلاب') && (studentGender === 'ذكر' || studentGender === 'Male')) || 
                         (presenceBranch.includes('طالبات') && (studentGender === 'أنثى' || studentGender === 'Female'));
      
      const gradeMatch = !presenceGrade || String(s.grade || "").trim() === presenceGrade.trim();
      const sectionMatch = !presenceSection || String(s.section || "").trim() === presenceSection.trim();
      
      return branchMatch && gradeMatch && sectionMatch;
    });
  }, [students, presenceBranch, presenceGrade, presenceSection]);

  // Exam Record Specific States
  const [examStage, setExamStage] = useState<'basic' | 'secondary'>('basic');
  const [examFilters, setExamFilters] = useState({
    semester: '',
    dateStart: '',
    dateEnd: '',
    studentName: '',
    grade: '',
    section: '',
    subject: '',
    score: '',
    status: ''
  });

  const [isAddAbsentModalOpen, setIsAddAbsentModalOpen] = useState(false);
  const [absentEntries, setAbsentEntries] = useState<{name: string, subject: string, studentData?: StudentReport}[]>([{ name: '', subject: '' }]);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);

  const absenceFormInitial = { date: today, semester: 'الأول', status: 'expected', reason: '', commStatus: 'لم يتم التواصل', commType: 'هاتف', replier: 'الأب', result: 'لم يتم الرد', notes: '', prevAbsenceCount: 0 };
  const [absenceForm, setAbsenceForm] = useState<Partial<AbsenceLog>>(absenceFormInitial as any);

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date(dateStr));
    } catch { return ''; }
  };

  const structure = {
    supervisor: { title: 'المشرف الإداري', icon: <Briefcase />, items: ['الخطة الفصلية', 'الخلاصة الشهرية', 'المهام اليومية', 'المهام المضافة', 'المهام المرحلة', 'أهم المشكلات اليومية', 'التوصيات العامة', 'احتياجات الدور', 'سجل متابعة الدفاتر والتصحيح', 'الجرد العام للعهد', 'ملاحظات عامة'] },
    staff: { title: 'الكادر التعليمي', icon: <Users />, items: ['سجل الإبداع والتميز', 'كشف الاستلام والتسليم', 'المخالفات', 'التعميمات'] },
    students: { title: 'الطلاب/ الطالبات', icon: <GraduationCap />, items: ['الغياب اليومي', 'التأخر', 'خروج طالب أثناء الدراسة', 'المخالفات الطلابية', 'سجل الإتلاف المدرسي', 'سجل الحالات الخاصة', 'سجل الحالة الصحية', 'سجل زيارة أولياء الأمور والتواصل بهم'] },
    tests: { title: 'تقارير الاختبار', icon: <FileSearch />, items: ['الاختبار الشهري', 'الاختبار الفصلي'] }
  };

  const renderExamModule = () => {
    const basicSubjects = ["القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "الإنجليزية", "الرياضيات", "العلوم", "الاجتماعيات", "الحاسوب"];
    const secondarySubjects = ["القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "الإنجليزية", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء"];
    const currentSubjects = examStage === 'basic' ? basicSubjects : secondarySubjects;

    const filteredLogs = (data.examLogs || []).filter(log => {
      if (log.type !== (activeSubTab === 'الاختبار الشهري' ? 'monthly' : 'final')) return false;
      if (examFilters.semester && log.semester !== examFilters.semester) return false;
      if (examFilters.dateStart && log.date < examFilters.dateStart) return false;
      if (examFilters.dateEnd && log.date > examFilters.dateEnd) return false;
      if (examFilters.studentName && !log.studentName.includes(examFilters.studentName)) return false;
      
      if (examFilters.subject || examFilters.status || examFilters.grade || examFilters.section) {
          return Object.entries(log.subjectsData).some(([subj, details]: [string, any]) => {
              const subjMatch = examFilters.subject ? subj === examFilters.subject : true;
              const statusMatch = examFilters.status ? details.status === examFilters.status : true;
              const gradeMatch = examFilters.grade ? details.class.includes(examFilters.grade) : true;
              const sectionMatch = examFilters.section ? details.class.includes(examFilters.section) : true;
              return subjMatch && statusMatch && gradeMatch && sectionMatch;
          });
      }
      return true;
    });

    const handleAddExamRow = () => {
      setAbsentEntries([{ name: '', subject: '' }]);
      setIsAddAbsentModalOpen(true);
    };

    const submitAddAbsentees = () => {
      const newLogs: ExamLog[] = absentEntries
        .filter(entry => entry.name.trim() !== '')
        .map(entry => {
          const s = entry.studentData;
          const subjectsData: Record<string, { class: string; grade: string; status: 'tested' | 'not_tested' }> = {};
          currentSubjects.forEach(subj => {
             subjectsData[subj] = { 
               class: entry.subject === subj ? (s ? `${s.grade} - ${s.section}` : '') : '', 
               grade: '', 
               status: entry.subject === subj ? 'not_tested' : 'tested' 
             };
          });

          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            studentId: s?.id || '',
            studentName: entry.name,
            date: today,
            semester: 'الأول',
            stage: examStage,
            type: activeSubTab === 'الاختبار الشهري' ? 'monthly' : 'final',
            subjectsData
          };
        });

      updateData({ examLogs: [...newLogs, ...(data.examLogs || [])] });
      setIsAddAbsentModalOpen(false);
    };

    const updateAbsentEntry = (idx: number, field: string, value: any) => {
      const updated = [...absentEntries];
      (updated[idx] as any)[field] = value;
      if (field === 'name' && value.length > 2) {
        setActiveSearchIdx(idx);
      } else {
        setActiveSearchIdx(null);
      }
      setAbsentEntries(updated);
    };

    const selectStudentForEntry = (idx: number, s: StudentReport) => {
      const updated = [...absentEntries];
      updated[idx].name = s.name;
      updated[idx].studentData = s;
      setAbsentEntries(updated);
      setActiveSearchIdx(null);
    };

    const updateExamLog = (id: string, field: string, value: any) => {
      const updated = (data.examLogs || []).map(log => log.id === id ? { ...log, [field]: value } : log);
      updateData({ examLogs: updated });
    };

    const updateSubjectData = (id: string, subject: string, field: string, value: any) => {
      const updated = (data.examLogs || []).map(log => {
        if (log.id === id) {
          const currentSubjectData = log.subjectsData[subject] || { class: '', grade: '', status: 'not_tested' };
          return {
            ...log,
            subjectsData: {
              ...log.subjectsData,
              [subject]: { ...currentSubjectData, [field]: value }
            }
          };
        }
        return log;
      });
      updateData({ examLogs: updated });
    };

    const handleExportWA = () => {
      let msg = `*📋 كشف غياب ${activeSubTab}*\n`;
      msg += `*المرحلة:* ${examStage === 'basic' ? 'أساسي' : 'ثانوي'}\n`;
      msg += `*التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n`;
      msg += `----------------------------------\n\n`;

      filteredLogs.forEach((log, idx) => {
        msg += `*👤 (${idx + 1}) الطالب:* ${log.studentName || '---'}\n`;
        msg += `📅 *التاريخ:* ${log.date}\n`;
        Object.entries(log.subjectsData).forEach(([subj, d]: [string, any]) => {
          if (d.status === 'not_tested') {
            msg += `📚 *${subj}:* (❌ غائب) ${d.class ? `[${d.class}]` : ''}\n`;
          } else if (d.grade || d.class) {
            msg += `📚 *${subj}:* (✅ تم) | 💯 الدرجة: ${d.grade || '---'} | 📍 الصف: ${d.class || '---'}\n`;
          }
        });
        msg += `\n`;
      });

      msg += `----------------------------------\n`;
      msg += `*إعداد المستشار الإداري والتربوي إبراهيم دخان*`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleExportExcel = () => {
        const flatData = filteredLogs.map(log => {
            const row: any = { 'اسم الطالب': log.studentName, 'التاريخ': log.date, 'الفصل': log.semester };
            Object.entries(log.subjectsData).forEach(([subj, d]: [string, any]) => {
                row[`${subj} - الصف`] = d.class;
                row[`${subj} - الدرجة`] = d.grade;
            });
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(flatData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Exam_Absentee_Record");
        XLSX.writeFile(wb, `${activeSubTab}_Report.xlsx`);
    };

    return (
      <div className="bg-[#FDF6E3] p-4 md:p-8 rounded-[3rem] border-4 border-[#7030A0] shadow-2xl animate-in fade-in duration-500 font-arabic text-right relative">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 border-b-2 border-[#7030A0]/20 pb-6">
           <div className="flex flex-wrap gap-3">
              <button onClick={() => setExamStage('basic')} className={`px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-md ${examStage === 'basic' ? 'bg-[#7030A0] text-white' : 'bg-white text-[#7030A0] border border-[#7030A0]'}`}>أساسي</button>
              <button onClick={() => setExamStage('secondary')} className={`px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-md ${examStage === 'secondary' ? 'bg-[#7030A0] text-white' : 'bg-white text-[#7030A0] border border-[#7030A0]'}`}>ثانوي</button>
              <button onClick={handleAddExamRow} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"><Plus size={18}/> إضافة غائب</button>
              <button onClick={() => setActiveSubTab(null)} className="flex items-center gap-2 bg-slate-800 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-md">
                <FileSearch size={18}/> التقارير الخاصة
              </button>
              <button onClick={() => setActiveSubTab(null)} className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all shadow-sm"><X size={20}/></button>
           </div>
           <div className="flex flex-col items-center md:items-end">
              <h2 className="text-3xl font-black text-[#7030A0] flex items-center gap-3">كشف غياب {activeSubTab} <FileText size={32}/></h2>
              <div className="mt-2 text-slate-500 font-bold">سجل متابعة غياب الطلاب في قاعة الاختبار</div>
           </div>
        </div>

        {isAddAbsentModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 font-arabic">
             <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-blue-600 flex flex-col max-h-[85vh]">
                <div className="p-6 bg-blue-600 text-white flex justify-between items-center shadow-lg">
                   <h3 className="text-2xl font-black flex items-center gap-3"><Plus size={28}/> إضافة أسماء الغائبين</h3>
                   <button onClick={() => setIsAddAbsentModalOpen(false)} className="hover:bg-blue-700 p-2 rounded-full transition-colors"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4">
                   {absentEntries.map((entry, idx) => (
                     <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 relative group">
                        <div className="flex-1 relative">
                           <label className="text-[10px] font-black text-slate-400 mr-2 block mb-1">اسم الطالب</label>
                           <input 
                              className="w-full p-3 rounded-xl border-2 outline-none focus:border-blue-500 font-black text-xs" 
                              placeholder="اكتب الاسم للبحث..." 
                              value={entry.name}
                              onChange={(e) => updateAbsentEntry(idx, 'name', e.target.value)}
                           />
                           {activeSearchIdx === idx && entry.name.length > 2 && (
                             <div className="absolute top-full left-0 right-0 z-[600] bg-white border-2 rounded-xl shadow-2xl mt-1 max-h-40 overflow-y-auto">
                               {students
                                 .filter(s => s.name.includes(entry.name))
                                 .map(s => (
                                   <button 
                                     key={s.id} 
                                     onClick={() => selectStudentForEntry(idx, s)}
                                     className="w-full text-right p-3 hover:bg-blue-50 border-b last:border-none flex justify-between items-center transition-colors"
                                   >
                                      <span className="font-bold text-xs">{s.name}</span>
                                      <span className="text-[9px] bg-slate-100 px-2 py-1 rounded-lg">{s.grade} - {s.section}</span>
                                   </button>
                                 ))
                               }
                             </div>
                           )}
                        </div>
                        <div className="flex-1">
                           <label className="text-[10px] font-black text-slate-400 mr-2 block mb-1">مادة الاختبار</label>
                           <select 
                              className="w-full p-3 rounded-xl border-2 outline-none focus:border-blue-500 font-black text-xs bg-white"
                              value={entry.subject}
                              onChange={(e) => updateAbsentEntry(idx, 'subject', e.target.value)}
                           >
                              <option value="">اختر المادة...</option>
                              {currentSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                           </select>
                        </div>
                        <button 
                          onClick={() => setAbsentEntries(absentEntries.filter((_, i) => i !== idx))} 
                          className="md:mt-6 p-3 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={20}/>
                        </button>
                     </div>
                   ))}
                   <button 
                     onClick={() => setAbsentEntries([...absentEntries, { name: '', subject: '' }])}
                     className="w-full p-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
                   >
                      <Plus size={20}/> إضافة حقل لاسم جديد
                   </button>
                </div>
                <div className="p-6 bg-slate-50 border-t flex gap-4">
                   <button 
                     onClick={submitAddAbsentees}
                     className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                   >
                      <CheckCircle size={24}/> تأكيد وإضافة للجدول
                   </button>
                   <button 
                     onClick={() => setIsAddAbsentModalOpen(false)}
                     className="px-8 bg-white border-2 text-slate-400 rounded-2xl font-black hover:bg-slate-100 transition-all"
                   >
                      إلغاء
                   </button>
                </div>
             </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-[#7030A0]/10 mb-8 shadow-sm space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 mr-2">الفصل الدراسي</label>
                <select className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-black" value={examFilters.semester} onChange={e => setExamFilters({...examFilters, semester: e.target.value})}>
                    <option value="">الكل</option><option value="الأول">الأول</option><option value="الثاني">الثاني</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 mr-2">نطاق التاريخ</label>
                <div className="flex gap-2 items-center bg-slate-50 p-1 rounded-xl border">
                    <input type="date" className="bg-transparent text-[10px] w-full font-bold outline-none" value={examFilters.dateStart} onChange={e => setExamFilters({...examFilters, dateStart: e.target.value})} />
                    <span className="text-slate-300">|</span>
                    <input type="date" className="bg-transparent text-[10px] w-full font-bold outline-none" value={examFilters.dateEnd} onChange={e => setExamFilters({...examFilters, dateEnd: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 mr-2">اسم الطالب</label>
                <input className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold" placeholder="بحث..." value={examFilters.studentName} onChange={e => setExamFilters({...examFilters, studentName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 mr-2">المادة</label>
                <select className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-black" value={examFilters.subject} onChange={e => setExamFilters({...examFilters, subject: e.target.value})}>
                    <option value="">الكل</option>{currentSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 mr-2">الحالة</label>
                <select className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-black" value={examFilters.status} onChange={e => setExamFilters({...examFilters, status: e.target.value})}>
                    <option value="">الكل</option><option value="tested">تم الاختبار</option><option value="not_tested">لم يختبر</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button title="واتساب" onClick={handleExportWA} className="p-3 bg-green-600 text-white rounded-xl shadow-md hover:bg-green-700 active:scale-95 transition-all flex-1 flex justify-center"><Share2 size={20}/></button>
                <button title="إكسل" onClick={handleExportExcel} className="p-3 bg-green-700 text-white rounded-xl shadow-md hover:bg-green-800 active:scale-95 transition-all flex-1 flex justify-center"><FileSpreadsheet size={20}/></button>
                <button title="مسح الفلاتر" onClick={() => setExamFilters({ semester:'', dateStart:'', dateEnd:'', studentName:'', grade:'', section:'', subject:'', score:'', status:'' })} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"><RefreshCw size={20}/></button>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto rounded-[2.5rem] border-[3px] border-[#7030A0] shadow-xl bg-white">
           <table className="w-full border-collapse text-center min-w-[1400px]">
              <thead>
                 <tr className="bg-[#FFD966] text-[#7030A0] font-black text-sm border-b-[2px] border-[#7030A0]">
                    <th rowSpan={2} className="p-4 border-e-2 border-[#7030A0] w-12">م</th>
                    <th rowSpan={2} className="p-4 border-e-2 border-[#7030A0] w-64 text-right">اسم الطالب الغائب</th>
                    <th rowSpan={2} className="p-4 border-e-2 border-[#7030A0] w-32">التاريخ</th>
                    {currentSubjects.map(subj => (
                        <th key={subj} colSpan={2} className="p-2 border-e-2 border-[#7030A0] font-black">{subj}</th>
                    ))}
                    <th rowSpan={2} className="p-4 w-12"></th>
                 </tr>
                 <tr className="bg-slate-50 text-[10px] font-black text-[#7030A0]">
                    {currentSubjects.map((subj, i) => (
                        <React.Fragment key={i}>
                            <th className="p-2 border-e border-[#7030A0] bg-[#FFD966]/40">الصف/الشعبة</th>
                            <th className="p-2 border-e-2 border-[#7030A0] bg-[#F4CCCC]">الدرجة</th>
                        </React.Fragment>
                    ))}
                 </tr>
              </thead>
              <tbody>
                 {filteredLogs.length === 0 ? (
                    <tr><td colSpan={currentSubjects.length * 2 + 4} className="p-20 text-slate-300 italic text-xl font-bold">لا توجد بيانات مسجلة مطابقة للبحث حالياً.</td></tr>
                 ) : (
                    filteredLogs.map((log, idx) => (
                        <tr key={log.id} className="border-b-[2px] border-[#7030A0]/10 hover:bg-[#FDF6E3] transition-colors h-14 group">
                           <td className="border-e-2 border-[#7030A0] bg-slate-50 font-black">{idx + 1}</td>
                           <td className="border-e-2 border-[#7030A0] p-1">
                                <div className="relative group/name">
                                    <input className="w-full p-2 text-right font-black outline-none bg-transparent focus:bg-white rounded-lg" value={log.studentName} onChange={e => updateExamLog(log.id, 'studentName', e.target.value)} placeholder="اكتب اسم الطالب..." />
                                </div>
                           </td>
                           <td className="border-e-2 border-[#7030A0] p-1">
                                <input type="date" className="w-full p-2 text-center text-[10px] font-bold outline-none bg-transparent" value={log.date} onChange={e => updateExamLog(log.id, 'date', e.target.value)} />
                           </td>
                           {currentSubjects.map(subj => (
                               <React.Fragment key={subj}>
                                   <td className="border-e border-[#7030A0]/20 p-1">
                                        <input className="w-full p-1 text-center text-[11px] font-bold outline-none bg-transparent focus:bg-white rounded" value={log.subjectsData[subj]?.class} onChange={e => updateSubjectData(log.id, subj, 'class', e.target.value)} placeholder="مثال: 9-أ" />
                                   </td>
                                   <td className="border-e-2 border-[#7030A0] p-1 relative">
                                        <div className="flex items-center gap-1">
                                            <input className="w-full p-1 text-center text-[11px] font-black text-red-600 outline-none bg-transparent focus:bg-white rounded" value={log.subjectsData[subj]?.grade} onChange={e => updateSubjectData(log.id, subj, 'grade', e.target.value)} placeholder="0" />
                                            <button 
                                                onClick={() => updateSubjectData(log.id, subj, 'status', log.subjectsData[subj]?.status === 'tested' ? 'not_tested' : 'tested')}
                                                className={`p-1 rounded-md transition-all ${log.subjectsData[subj]?.status === 'tested' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-300'}`}
                                            >
                                                <CheckCircle size={10} />
                                            </button>
                                        </div>
                                   </td>
                               </React.Fragment>
                           ))}
                           <td className="p-2">
                                <button onClick={() => updateData({ examLogs: data.examLogs?.filter(l => l.id !== log.id) })} className="text-red-300 hover:text-red-600 p-2 rounded-xl transition-all hover:bg-red-50"><Trash2 size={18}/></button>
                           </td>
                        </tr>
                    ))
                 )}
              </tbody>
           </table>
        </div>
        <div className="mt-8 flex justify-center gap-2">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border shadow-sm">
                <div className="w-3 h-3 rounded-full bg-[#FFD966]"></div>
                <span className="text-[10px] font-black">أصفر: بيانات الصف</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border shadow-sm">
                <div className="w-3 h-3 rounded-full bg-[#F4CCCC]"></div>
                <span className="text-[10px] font-black">وردي: درجة الطالب</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border shadow-sm">
                <div className="w-3 h-3 rounded-full bg-[#7030A0]"></div>
                <span className="text-[10px] font-black">أرجواني: إطار الجدول الرسمي</span>
            </div>
        </div>
      </div>
    );
  };

  const renderAbsenceModule = () => {
    const suggestions = searchQuery.trim() ? students.filter(s => s.name.includes(searchQuery)) : [];
    const nameSugg = nameInput.trim() ? students.filter(s => s.name.includes(nameInput) && !tempNames.includes(s.name)) : [];
    
    const handleWhatsAppAttendance = (mode: 'all' | 'present' | 'absent' | 'selected') => {
      let list = filteredPresence;
      if (mode === 'present') list = list.filter(s => (attendanceMap[s.id] || 'present') === 'present');
      if (mode === 'absent') list = list.filter(s => (attendanceMap[s.id] || 'present') !== 'present');
      if (mode === 'selected') list = list.filter(s => selectedForWA.includes(s.id));
      
      let msg = `*📋 حضور وغياب يوم: ${getDayName(presenceDate)}*\n`;
      msg += `*بتاريخ:* ${presenceDate}\n`;
      msg += `*للصف:* ${presenceGrade || 'الكل'} *والشعبة:* ${presenceSection || 'الكل'}\n`;
      msg += `----------------------------------\n\n`;
      
      list.forEach((s, idx) => {
          const status = attendanceMap[s.id] || 'present';
          const statusIcon = status === 'present' ? '✅' : status === 'excused' ? '⚠️' : '❌';
          const statusText = status === 'present' ? 'حاضر' : status === 'excused' ? 'غائب بعذر' : 'غائب بدون عذر';
          msg += `*${idx + 1}* 👤 *الاسم:* ${s.name}\n`;
          msg += `📍 *الصف:* ${s.grade} / ${s.section}\n`;
          msg += `🏷️ *الحالة:* ${statusIcon} ${statusText}\n`;
          msg += `📞 *ولي الأمر:* ${s.guardianPhones[0] || '---'}\n\n`;
      });
      
      msg += `----------------------------------\n*إعداد مدارس الرائد*`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const filtered = (data.absenceLogs || []).filter(l => {
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName)) return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester) return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section) return false;
      return true;
    });

    const statusOptions = [
      { id: 'expected', label: 'غياب متوقع', color: 'bg-red-600' },
      { id: 'recurring', label: 'غياب متكرر', color: 'bg-slate-100' },
      { id: 'week1', label: 'أكثر من أسبوع', color: 'bg-slate-100' },
      { id: 'week2', label: 'أكثر من أسبوعين', color: 'bg-slate-100' },
      { id: 'most', label: 'الأكثر غياباً', color: 'bg-slate-100' },
      { id: 'disconnected', label: 'المنقطع', color: 'bg-slate-100' }
    ];

    const reasons = ["مرض", "انشغال", "تأخر", "لم يمر له الباص", "سفر"];

    const handleSelectStudent = (s: StudentReport) => {
      setAbsenceForm({ 
        ...absenceForm, 
        studentId: s.id, 
        studentName: s.name, 
        grade: s.grade, 
        section: s.section, 
        prevAbsenceCount: (data.absenceLogs || []).filter(l => l.studentId === s.id).length 
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (!absenceForm.studentId) return alert('يرجى اختيار طالب أولاً');
      const newLog: AbsenceLog = { 
        ...absenceForm as AbsenceLog, 
        id: Date.now().toString(), 
        day: getDayName(absenceForm.date || today) 
      };
      updateData({ absenceLogs: [newLog, ...(data.absenceLogs || [])] });
      setAbsenceForm({ date: today, semester: 'الأول', status: 'expected', reason: '', commStatus: 'لم يتم التواصل', commType: 'هاتف', replier: 'الأب', result: 'لم يتم الرد', notes: '', prevAbsenceCount: 0 } as any);
      setSearchQuery('');
      alert('تم حفظ البيانات بنجاح');
    };

    const cols = [
      { label: 'اسم الطالب', key: 'studentName' }, { label: 'الصف / الشعبة', key: 'grade' }, { label: 'عدد الغياب', key: 'prevAbsenceCount' }, 
      { label: 'التاريخ', key: 'date' }, { label: 'السبب', key: 'reason' }, { label: 'حالة التواصل', key: 'commStatus' }, 
      { label: 'المجيب', key: 'replier' }, { label: 'ملاحظات', key: 'notes' }
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        <FrequentNamesPicker 
          logs={data.absenceLogs || []} 
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
           <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
              <button onClick={() => { setShowTable(!showTable); setShowPresenceTracker(false); }} className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${!showTable && !showPresenceTracker ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                <Plus size={18}/> رصد غياب جديد
              </button>
              <button onClick={() => { setShowTable(true); setShowPresenceTracker(false); }} className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${showTable && !showPresenceTracker ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                <LayoutList size={18}/> جدول السجلات
              </button>
              <button onClick={() => { setShowPresenceTracker(true); setShowTable(false); }} className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${showPresenceTracker ? 'bg-green-600 text-white shadow-md' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                <Filter size={18}/> تحضير الطلاب (فلتر)
              </button>
              <button onClick={() => setActiveSubTab(null)} className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><X size={18}/></button>
           </div>
           <div className="flex flex-col items-center md:items-end w-full md:w-auto">
              <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
                 تقرير الغياب اليومي <Clock className="text-blue-600" size={24}/>
              </h2>
           </div>
        </div>

        {showPresenceTracker ? (
          <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-6 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 mr-2">الفرع</label>
                            <div className="flex gap-1 bg-white p-1 rounded-xl border-2">
                                {['طلاب', 'طالبات'].map(b => (
                                    <button 
                                      key={b} 
                                      onClick={() => setPresenceBranch(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])} 
                                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${presenceBranch.includes(b) ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                      {b}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 mr-2">الصف</label>
                            <select className="p-2.5 bg-white border-2 rounded-xl text-xs font-black outline-none min-w-[100px]" value={presenceGrade} onChange={e => setPresenceGrade(e.target.value)}>
                                <option value="">اختر الصف...</option>
                                {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 mr-2">الشعبة</label>
                            <select className="p-2.5 bg-white border-2 rounded-xl text-xs font-black outline-none min-w-[80px]" value={presenceSection} onChange={e => setPresenceSection(e.target.value)}>
                                <option value="">الكل</option>
                                {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-[2.5rem] border-[3px] border-blue-100 shadow-xl bg-white">
                <table className="w-full text-center border-collapse min-w-[1000px]">
                    <thead className="bg-[#FFD966] text-slate-800 font-black border-b-2 border-blue-100">
                        <tr>
                            <th className="p-4 border-e border-blue-50 w-12">م</th>
                            <th className="p-4 border-e border-blue-50 text-right">اسم الطالب</th>
                            <th className="p-4 border-e border-blue-50 w-24">الصف</th>
                            <th className="p-4 border-e border-blue-50 w-24">الشعبة</th>
                            <th className="p-4 border-e border-blue-50 w-32">حالة الغياب</th>
                            <th className="p-4 border-e border-blue-50 w-48">هاتف ولي الأمر</th>
                            <th className="p-4 w-32">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredPresence.length === 0 ? (
                            <tr><td colSpan={7} className="p-20 text-slate-300 italic text-lg font-bold">لا يوجد طلاب مطابقين للفلتر المختار حالياً.</td></tr>
                        ) : filteredPresence.map((s, idx) => {
                            const status = attendanceMap[s.id] || 'present';
                            const isHighlighted = highlightedRowId === s.id;
                            const cycleStatus = () => {
                              setAttendanceMap(prev => {
                                const current = prev[s.id] || 'present';
                                let next: 'present' | 'excused' | 'unexcused' = 'present';
                                if (current === 'present') next = 'excused';
                                else if (current === 'excused') next = 'unexcused';
                                else next = 'present';
                                return { ...prev, [s.id]: next };
                              });
                            };
                            return (
                                <tr 
                                  key={s.id} 
                                  onClick={() => setHighlightedRowId(s.id)}
                                  className={`transition-colors h-14 cursor-pointer ${isHighlighted ? 'bg-[#FFF3E0]' : 'hover:bg-slate-50/50'}`}
                                >
                                    <td className="p-2 border-e border-slate-50 font-black text-blue-600">{idx + 1}</td>
                                    <td className="p-2 border-e border-slate-50 text-right font-black text-slate-700">{s.name}</td>
                                    <td className="p-2 border-e border-slate-50 font-bold text-slate-500">{s.grade}</td>
                                    <td className="p-2 border-e border-slate-50 font-bold text-slate-500">{s.section}</td>
                                    <td className="p-2 border-e border-slate-50">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); cycleStatus(); }}
                                            className={`px-6 py-2 rounded-full text-xs font-black transition-all shadow-sm border ${
                                              status === 'present' ? 'bg-green-100 text-green-700 border-green-200' : 
                                              status === 'excused' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                                              'bg-red-100 text-red-700 border-red-200'
                                            }`}
                                        >
                                            {status === 'present' ? 'حاضر' : status === 'excused' ? 'غائب بعذر' : 'غائب بدون عذر'}
                                        </button>
                                    </td>
                                    <td className="p-2 border-e border-slate-50 font-bold text-slate-600">{s.guardianPhones[0] || '---'}</td>
                                    <td className="p-2">
                                        <div className="flex justify-center gap-2">
                                            <a href={`tel:${s.guardianPhones[0]}`} className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all"><PhoneCall size={18}/></a>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex flex-wrap gap-3 items-center justify-center">
                <button onClick={() => handleWhatsAppAttendance('all')} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-blue-700 shadow-md">تصدير جميع الطلاب للواتساب</button>
            </div>
          </div>
        ) : !showTable ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-6">
               <div className="flex flex-wrap gap-1.5 md:gap-2 justify-end">
                  {statusOptions.map(opt => (
                    <button 
                      key={opt.id}
                      onClick={() => setAbsenceForm({...absenceForm, status: opt.id as any})}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black transition-all border ${absenceForm.status === opt.id ? 'bg-red-600 text-white border-red-600 shadow-lg scale-105' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
               </div>
               <div className="relative">
                  <label className="text-xs font-black text-slate-400 mb-2 block mr-2">اسم الطالب</label>
                  <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-blue-500 shadow-sm transition-all">
                    <Search className="text-slate-400" size={20}/>
                    <input type="text" className="bg-transparent w-full outline-none font-black text-base md:text-lg" placeholder="ابحث عن الاسم..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-48 overflow-y-auto">
                      {suggestions.map(s => (
                        <button key={s.id} onClick={() => handleSelectStudent(s)} className="w-full text-right p-3 md:p-4 hover:bg-blue-50 font-black border-b last:border-none flex justify-between items-center transition-colors">
                          <span className="text-xs md:text-sm">{s.name}</span>
                          <span className="text-[9px] md:text-[10px] bg-slate-100 px-2 py-1 rounded-lg">{s.grade} - {s.section}</span>
                        </button>
                      ))}
                    </div>
                  )}
               </div>
               <button onClick={saveLog} className="w-full bg-blue-600 text-white p-5 md:p-6 rounded-[2rem] font-black text-lg md:text-xl hover:bg-blue-700 shadow-2xl flex items-center justify-center gap-4 active:scale-[0.98] transition-all mt-4">
                 <Save size={24}/> حفظ بيانات الغياب
               </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <FilterSection suggestions={nameSugg} values={filterValues} setValues={setFilterValues} tempNames={tempNames} setTempNames={setTempNames} appliedNames={appliedNames} setAppliedNames={setAppliedNames} nameInput={nameInput} setNameInput={setNameInput} onExportExcel={() => exportExcelFiltered('غياب_الطلاب', filtered, cols)} onExportTxt={() => exportTxtFiltered('غياب_الطلاب', filtered, cols)} onExportWA={() => {}} />
            <div className="overflow-x-auto rounded-[1.5rem] border shadow-inner">
               <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1000px]">
                  <thead className="bg-[#FFD966] text-slate-800 font-black">
                     <tr>{cols.map(c => <th key={c.key} className="p-3 md:p-5 border-e border-slate-200">{c.label}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-bold">
                     {filtered.length === 0 ? (<tr><td colSpan={8} className="p-20 text-slate-300 italic text-base md:text-lg font-bold">لا توجد بيانات غياب مسجلة.</td></tr>) : filtered.map(l => (
                       <tr key={l.id} className="hover:bg-blue-50/20 transition-colors h-10 md:h-12">
                          <td className="p-2 md:p-4 border-e border-slate-100 font-black">{l.studentName}</td>
                          <td className="p-2 md:p-4 border-e border-slate-100">{l.grade} / {l.section}</td>
                          <td className="p-2 md:p-4 border-e border-slate-100 text-red-600 font-black text-base">{l.prevAbsenceCount + 1}</td>
                          <td className="p-2 md:p-4 border-e border-slate-100 text-[10px] text-slate-400">{l.date}</td>
                          <td className="p-2 md:p-4 border-e border-slate-100">{l.reason}</td>
                          <td className="p-2 md:p-4 border-e border-slate-100">{l.commStatus}</td>
                          <td className="p-2 md:p-4 border-e border-slate-100">{l.replier}</td>
                          <td className="p-2 md:p-4 text-[10px] text-slate-400">{l.notes}</td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 font-arabic text-right animate-in fade-in duration-500 pb-20">
      {!activeSubTab ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(structure).map(([id, cat]) => (
            <div key={id} className="bg-white rounded-[2.5rem] p-6 border-2 border-slate-50 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b pb-4 mb-2">
                 <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                    {cat.icon}
                 </div>
                 <h3 className="text-xl font-black text-slate-800">{cat.title}</h3>
              </div>
              <div className="space-y-1">
                {cat.items.map(item => (
                  <button 
                    key={item} 
                    onClick={() => {
                      setActiveSubTab(item);
                      onSubTabOpen?.(item);
                    }}
                    className="w-full text-right p-3 hover:bg-blue-50 rounded-xl font-bold text-xs text-slate-600 transition-all flex items-center justify-between group"
                  >
                    <span>{item}</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {(activeSubTab === 'الخطة الفصلية' || activeSubTab === 'الخلاصة الشهرية' || activeSubTab === 'المهام اليومية' || activeSubTab === 'أهم المشكلات اليومية' || activeSubTab === 'احتياجات الدور' || activeSubTab === 'سجل متابعة الدفاتر والتصحيح' || activeSubTab === 'سجل الإبداع والتميز' || activeSubTab === 'المخالفات' || activeSubTab === 'التعميمات') ? (
             <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl space-y-6 relative">
                <div className="flex justify-between items-center border-b pb-4">
                   <div className="flex gap-2">
                      <button onClick={() => setActiveSubTab(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><X/></button>
                   </div>
                   <h2 className="text-2xl font-black text-slate-800">{activeSubTab}</h2>
                </div>
                <DynamicTable 
                  title={activeSubTab}
                  data={(data.genericSpecialReports || []).filter(r => r.subCategory === activeSubTab)}
                  columns={[
                    { key: 'title', label: 'العنوان' },
                    { key: 'date', label: 'التاريخ' },
                    { key: 'content', label: 'المحتوى' }
                  ]}
                  onAdd={() => {
                    const newReport = {
                      id: Date.now().toString(),
                      category: Object.keys(structure).find(k => (structure as any)[k].items.includes(activeSubTab)) || 'supervisor',
                      subCategory: activeSubTab,
                      title: 'عنوان جديد',
                      content: '',
                      date: today
                    };
                    updateData({ genericSpecialReports: [...(data.genericSpecialReports || []), newReport] });
                  }}
                  onEdit={(item) => {
                    const title = prompt('العنوان:', item.title);
                    const content = prompt('المحتوى:', item.content);
                    if (title !== null && content !== null) {
                      updateData({
                        genericSpecialReports: (data.genericSpecialReports || []).map(r => r.id === item.id ? { ...r, title, content } : r)
                      });
                    }
                  }}
                  onDelete={(id) => {
                    if (confirm('حذف؟')) {
                      updateData({ genericSpecialReports: (data.genericSpecialReports || []).filter(r => r.id !== id) });
                    }
                  }}
                />
             </div>
          ) : activeSubTab === 'الغياب اليومي' ? renderAbsenceModule() : (activeSubTab === 'الاختبار الشهري' || activeSubTab === 'الاختبار الفصلي') ? renderExamModule() : (
            <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 text-slate-300 font-black text-2xl">
              قيد التطوير والبرمجة... (سيتم توفير {activeSubTab} قريباً)
              <button onClick={() => setActiveSubTab(null)} className="block mx-auto mt-6 px-10 py-3 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-black">العودة للتقارير</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpecialReportsPage;
