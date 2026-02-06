
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

// START OF CHANGE
interface CategoryMember {
  id: string;
  name: string;
  grade: string;
  section: string;
  isAuto: boolean;
}
// END OF CHANGE

// Moved outside to prevent Hook mismatch error 310
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
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
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

/* Moved FilterSection outside to prevent re-renders losing focus */
const FilterSection = ({
  values, setValues, tempNames, setTempNames, appliedNames, setAppliedNames, nameInput, setNameInput, onExportExcel, onExportTxt, onExportWA, suggestions
}: any) => (
  <div className="bg-slate-50 p-4 md:p-6 rounded-[2rem] border-2 border-slate-100 space-y-4 md:space-y-6 shadow-sm mb-6 animate-in slide-in-from-top-4 duration-300 font-arabic">
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-full md:min-w-[300px] space-y-2">
        <label className="text-xs font-black text-slate-500 mr-2">فلترة بالأسماء (متعدد)</label>
        <div className="flex flex-wrap md:flex-nowrap gap-2">
          <div className="relative flex-1 min-w-full md:min-w-0">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border-2 focus-within:border-blue-400 transition-all shadow-sm">
              <Search size={16} className="text-slate-400" />
              <input type="text" className="text-xs font-black outline-none bg-transparent w-full" placeholder="اكتب الاسم..." value={nameInput} onChange={e => setNameInput(e.target.value)} />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-xl shadow-2xl mt-2 max-h-48 overflow-y-auto">
                {suggestions.map((s: any) => (
                  <button key={s.id} onClick={() => { setTempNames([...tempNames, s.name]); setNameInput(''); }} className="w-full text-right p-3 text-xs font-bold hover:bg-blue-50 border-b last:border-none flex justify-between items-center transition-colors">
                    <span>{s.name}</span> <span className="text-[10px] text-slate-300">{s.grade}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setAppliedNames(tempNames)} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-md active:scale-95">موافق</button>
            <button onClick={() => { setTempNames([]); setAppliedNames([]); }} className="flex-1 md:flex-none bg-white border-2 text-slate-400 px-4 py-2 rounded-xl font-black text-xs hover:bg-slate-50 transition-all">تصفير</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {tempNames.map((name: string) => (
            <span key={name} className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black border border-blue-200">
              {name} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setTempNames(tempNames.filter((n: string) => n !== name))} />
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-2 w-full md:w-auto">
        <label className="text-xs font-black text-slate-500 mr-2">نطاق التاريخ</label>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border-2 shadow-sm w-full">
          <Calendar size={16} className="text-slate-400" />
          <input type="date" className="text-[10px] font-black outline-none bg-transparent flex-1" value={values.start} onChange={e => setValues({ ...values, start: e.target.value })} />
          <span className="text-slate-200">|</span>
          <input type="date" className="text-[10px] font-black outline-none bg-transparent flex-1" value={values.end} onChange={e => setValues({ ...values, end: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <button title="استيراد" className="flex-1 md:flex-none p-3 bg-white border-2 text-blue-600 rounded-xl shadow-sm hover:bg-blue-50 transition-all flex justify-center"><Upload size={18} /></button>
        <button title="تصدير TXT" onClick={onExportTxt} className="flex-1 md:flex-none p-3 bg-white border-2 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition-all flex justify-center"><FileText size={18} /></button>
        <button title="تصدير Excel" onClick={onExportExcel} className="flex-1 md:flex-none p-3 bg-white border-2 text-green-700 rounded-xl shadow-sm hover:bg-green-50 transition-all flex justify-center"><FileSpreadsheet size={18} /></button>
        <button title="واتساب" onClick={onExportWA} className="flex-1 md:flex-none p-3 bg-green-600 text-white rounded-xl shadow-xl hover:bg-green-700 transition-all active:scale-95 flex justify-center"><MessageCircle size={18} /></button>
      </div>
    </div>
  </div>
);

// START OF CHANGE - Requirement: Navigate Function from App
interface SpecialReportsPageProps {
  initialSubTab?: string;
  onSubTabOpen?: (subId: string) => void;
  onNavigate?: (viewId: string) => void;
}

const SpecialReportsPage: React.FC<SpecialReportsPageProps> = ({ initialSubTab, onSubTabOpen, onNavigate }) => {
  // END OF CHANGE
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
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'absent_excused' | 'absent_unexcused'>>({});
  const [presenceDate, setPresenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedForWA, setSelectedForWA] = useState<string[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const gradeOptions = ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const sectionOptions = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];

  const [filterValues, setFilterValues] = useState({ semester: '', start: today, end: today, grade: '', section: '' });
  const [tempNames, setTempNames] = useState<string[]>([]);
  const [appliedNames, setAppliedNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null); // New state for row highlighting
  // New States for Archive and Auto-Save feature
  const [absenceArchiveOpen, setAbsenceArchiveOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<'الأول' | 'الثاني'>('الأول');
  const [contactMethodMap, setContactMethodMap] = useState<Record<string, 'هاتف' | 'رسالة' | 'واتساب' | 'أخرى'>>({});

  // START OF CHANGE - New states for "Open Previous Record" functionality
  const [showPreviousAbsence, setShowPreviousAbsence] = useState(false);
  const [showPreviousLateness, setShowPreviousLateness] = useState(false);
  const [showPreviousViolation, setShowPreviousViolation] = useState(false);
  const [previousRecordSearch, setPreviousRecordSearch] = useState('');
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<any[]>([]);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<StudentReport | null>(null);
  // END OF CHANGE

  const students = data.studentReports || [];

  // FIXED TypeError: ensures field conversion to string before .trim()
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
  const [absentEntries, setAbsentEntries] = useState<{ name: string, subject: string, studentData?: StudentReport }[]>([{ name: '', subject: '' }]);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);

  const absenceFormInitial = { date: today, semester: 'الأول', status: 'expected', reason: '', commStatus: 'لم يتم التواصل', commType: 'هاتف', replier: 'الأب', result: 'لم يتم الرد', notes: '', prevAbsenceCount: 0 };
  const [absenceForm, setAbsenceForm] = useState<Partial<AbsenceLog>>(absenceFormInitial as any);

  const [latenessForm, setLatenessForm] = useState<Partial<LatenessLog>>({
    date: today, semester: 'الأول', status: 'recurring', reason: '', action: 'تنبيه 1', pledge: '', notes: '', prevLatenessCount: 0
  });

  const [violationForm, setViolationForm] = useState<Partial<StudentViolationLog>>({
    date: today, semester: 'الأول', behaviorViolations: [], dutiesViolations: [], achievementViolations: [], status: 'rare', action: 'تنبيه 1', pledge: '', notes: ''
  });

  const [exitForm, setExitForm] = useState<Partial<ExitLog>>({
    date: today, semester: 'الفصلين', status: 'نادر الخروج', customStatusItems: [], action: 'تنبيه 1', pledge: '', notes: '', prevExitCount: 0
  });

  const [damageForm, setDamageForm] = useState<Partial<DamageLog>>({
    date: today, semester: 'الفصلين', description: '', participants: '', followUpStatus: 'قيد المتابعة', statusTags: [], action: 'تنبيه', pledge: '', notes: '', prevDamageCount: 0
  });

  const [visitForm, setVisitForm] = useState<Partial<ParentVisitLog>>({
    date: today, semester: 'الفصلين', type: 'visit', status: 'نادر الزيارة', customStatusItems: [], visitorName: '', reason: '', recommendations: '', actions: '', followUpStatus: [], notes: '', prevVisitCount: 0
  });

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

  const shareWhatsAppRich = (title: string, tableData: any[], columns: { label: string, key: string }[]) => {
    let msg = `*📋 تقرير: ${title}*\n`;
    msg += `*التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n`;
    msg += `----------------------------------\n\n`;
    tableData.forEach((row, idx) => {
      msg += `*🔹 البند (${idx + 1}):*\n`;
      columns.forEach(col => {
        let val = Array.isArray(row[col.key]) ? row[col.key].join('، ') : row[col.key];
        let symbol = '▪️';
        if (col.key === 'studentName' || col.key === 'name') symbol = '👤';
        if (col.key === 'grade') symbol = '📍';
        if (col.key === 'date') symbol = '📅';
        if (col.key === 'status') symbol = '🏷️';
        if (col.key === 'action') symbol = '🛡️';
        msg += `${symbol} *${col.label}:* ${val || '---'}\n`;
      });
      msg += `\n`;
    });
    msg += `----------------------------------\n`;
    const profile = data.profile;
    if (profile.schoolName || profile.branch) {
      msg += `🏫 *${profile.schoolName || ''}${profile.branch ? `، فرع ${profile.branch}` : ''}*\n`;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
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

    const updateAbsentEntry = (idx: number, field: string, value: string | StudentReport) => {
      const updated = [...absentEntries];
      (updated[idx] as Record<string, any>)[field] = value;
      if (field === 'name' && typeof value === 'string' && value.length > 2) {
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

    const updateExamLog = (id: string, field: string, value: string) => {
      const updated = (data.examLogs || []).map(log => log.id === id ? { ...log, [field]: value } : log);
      updateData({ examLogs: updated });
    };

    const updateSubjectData = (id: string, subject: string, field: string, value: string) => {
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
        Object.entries(log.subjectsData).forEach(([subj, data]) => {
          if (data.status === 'not_tested') {
            msg += `📚 *${subj}:* (❌ غائب) ${data.class ? `[${data.class}]` : ''}\n`;
          } else if (data.grade || data.class) {
            msg += `📚 *${subj}:* (✅ تم) | 💯 الدرجة: ${data.grade || '---'} | 📍 الصف: ${data.class || '---'}\n`;
          }
        });
        msg += `\n`;
      });

      msg += `----------------------------------\n`;
      const profile = data.profile;
      if (profile.schoolName || profile.branch) {
        msg += `🏫 *${profile.schoolName || ''}${profile.branch ? `، فرع ${profile.branch}` : ''}*\n`;
      }

      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleExportExcel = () => {
      const flatData = filteredLogs.map(log => {
        const row: Record<string, string> = { 'اسم الطالب': log.studentName, 'التاريخ': log.date, 'الفصل': log.semester };
        Object.entries(log.subjectsData).forEach(([subj, d]) => {
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
            <button onClick={handleAddExamRow} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"><Plus size={18} /> إضافة غائب</button>
            <button onClick={() => setActiveSubTab(null)} className="flex items-center gap-2 bg-slate-800 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-md">
              <FileSearch size={18} /> التقارير الخاصة
            </button>
            <button onClick={() => setActiveSubTab(null)} className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all shadow-sm"><X size={20} /></button>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <h2 className="text-3xl font-black text-[#7030A0] flex items-center gap-3">كشف غياب {activeSubTab} <FileText size={32} /></h2>
            <div className="mt-2 text-slate-500 font-bold">سجل متابعة غياب الطلاب في قاعة الاختبار</div>
          </div>
        </div>

        {isAddAbsentModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 font-arabic">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-blue-600 flex flex-col max-h-[85vh]">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center shadow-lg">
                <h3 className="text-2xl font-black flex items-center gap-3"><Plus size={28} /> إضافة أسماء الغائبين</h3>
                <button onClick={() => setIsAddAbsentModalOpen(false)} className="hover:bg-blue-700 p-2 rounded-full transition-colors"><X size={24} /></button>
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
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setAbsentEntries([...absentEntries, { name: '', subject: '' }])}
                  className="w-full p-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
                >
                  <Plus size={20} /> إضافة حقل لاسم جديد
                </button>
              </div>
              <div className="p-6 bg-slate-50 border-t flex gap-4">
                <button
                  onClick={submitAddAbsentees}
                  className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <CheckCircle size={24} /> تأكيد وإضافة للجدول
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
              <select className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-black" value={examFilters.semester} onChange={e => setExamFilters({ ...examFilters, semester: e.target.value })}>
                <option value="">الكل</option><option value="الأول">الأول</option><option value="الثاني">الثاني</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 mr-2">نطاق التاريخ</label>
              <div className="flex gap-2 items-center bg-slate-50 p-1 rounded-xl border">
                <input type="date" className="bg-transparent text-[10px] w-full font-bold outline-none" value={examFilters.dateStart} onChange={e => setExamFilters({ ...examFilters, dateStart: e.target.value })} />
                <span className="text-slate-300">|</span>
                <input type="date" className="bg-transparent text-[10px] w-full font-bold outline-none" value={examFilters.dateEnd} onChange={e => setExamFilters({ ...examFilters, dateEnd: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 mr-2">اسم الطالب</label>
              <input className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold" placeholder="بحث..." value={examFilters.studentName} onChange={e => setExamFilters({ ...examFilters, studentName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 mr-2">المادة</label>
              <select className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-black" value={examFilters.subject} onChange={e => setExamFilters({ ...examFilters, subject: e.target.value })}>
                <option value="">الكل</option>{currentSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 mr-2">الحالة</label>
              <select className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-black" value={examFilters.status} onChange={e => setExamFilters({ ...examFilters, status: e.target.value })}>
                <option value="">الكل</option><option value="tested">تم الاختبار</option><option value="not_tested">لم يختبر</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button title="واتساب" onClick={handleExportWA} className="p-3 bg-green-600 text-white rounded-xl shadow-md hover:bg-green-700 active:scale-95 transition-all flex-1 flex justify-center"><Share2 size={20} /></button>
              <button title="إكسل" onClick={handleExportExcel} className="p-3 bg-green-700 text-white rounded-xl shadow-md hover:bg-green-800 active:scale-95 transition-all flex-1 flex justify-center"><FileSpreadsheet size={20} /></button>
              <button title="مسح الفلاتر" onClick={() => setExamFilters({ semester: '', dateStart: '', dateEnd: '', studentName: '', grade: '', section: '', subject: '', score: '', status: '' })} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"><RefreshCw size={20} /></button>
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
                      <button onClick={() => updateData({ examLogs: data.examLogs?.filter(l => l.id !== log.id) })} className="text-red-300 hover:text-red-600 p-2 rounded-xl transition-all hover:bg-red-50"><Trash2 size={18} /></button>
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
    const suggestions = (searchQuery.trim() && searchQuery !== absenceForm.studentName) ? students.filter(s => s.name.includes(searchQuery)) : [];
    const nameSugg = nameInput.trim() ? students.filter(s => s.name.includes(nameInput) && !tempNames.includes(s.name)) : [];

    const handleWhatsAppAttendance = (mode: 'all' | 'present' | 'absent' | 'selected') => {
      let list = filteredPresence;
      if (mode === 'present') {
        list = list.filter(s => (attendanceMap[s.id] || 'present') === 'present');
      } else if (mode === 'absent') {
        list = list.filter(s => {
          const status = attendanceMap[s.id] || 'present';
          return status === 'absent_excused' || status === 'absent_unexcused';
        });
      } else if (mode === 'selected') {
        list = list.filter(s => selectedForWA.includes(s.id));
      }

      let msg = `*📋 حضور وغياب يوم: ${getDayName(presenceDate)}*\n`;
      msg += `*بتاريخ:* ${presenceDate}\n`;
      msg += `*للصف:* ${presenceGrade || 'الكل'} *والشعبة:* ${presenceSection || 'الكل'}\n`;
      msg += `----------------------------------\n\n`;

      list.forEach((s, idx) => {
        const status = attendanceMap[s.id] || 'present';
        const statusIcon = status === 'present' ? '✅' : status === 'absent_excused' ? '🟠' : '❌';
        const statusText = status === 'present' ? 'حاضر' : status === 'absent_excused' ? 'غائب بعذر' : 'غائب بدون عذر';
        msg += `*${idx + 1}* 👤 *الاسم:* ${s.name}\n`;
        msg += `📍 *الصف:* ${s.grade} / ${s.section}\n`;
        msg += `🏷️ *الحالة:* ${statusIcon} ${statusText}\n`;
        msg += `📞 *ولي الأمر:* ${s.guardianPhones[0] || '---'}\n\n`;
      });

      if (list.length === 0) {
        alert('لا يوجد طلاب لإرسالهم في هذه الفئة.');
        return;
      }

      msg += `----------------------------------\n`;
      const profile = data.profile;
      if (profile.schoolName || profile.branch) {
        msg += `🏫 *${profile.schoolName || ''}${profile.branch ? `، فرع ${profile.branch}` : ''}*\n`;
      }

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
      setAbsenceForm({ ...absenceFormInitial } as any);
      setSearchQuery('');
      alert('تم حفظ البيانات بنجاح');
    };

    const cols = [
      { label: 'اسم الطالب', key: 'studentName' }, { label: 'الصف / الشعبة', key: 'grade' }, { label: 'عدد الغياب', key: 'prevAbsenceCount' },
      { label: 'التاريخ', key: 'date' }, { label: 'السبب', key: 'reason' }, { label: 'حالة التواصل', key: 'commStatus' },
      { label: 'المجيب', key: 'replier' }, { label: 'ملاحظات', key: 'notes' }
    ];

    // START OF CHANGE - Requirement Logic for Smart Lists
    const isNextDay = (d1: string, d2: string) => {
      const date1 = new Date(d1);
      const date2 = new Date(d2);
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 1;
    };

    const getAbsenceStreak = (studentId: string) => {
      const logs = [...(data.absenceLogs || [])].filter(l => l.studentId === studentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      let streak = 0;
      for (let i = 0; i < logs.length - 1; i++) {
        if (isNextDay(logs[i].date, logs[i + 1].date)) streak++;
        else break;
      }
      return streak + (logs.length > 0 ? 1 : 0);
    };

    const getSmartList = (statusId: string): CategoryMember[] => {
      const logs = data.absenceLogs || [];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const manual = data.absenceManualAdditions?.[statusId] || [];
      const exclusions = data.absenceExclusions?.[statusId] || [];

      let autoIds: string[] = [];
      if (statusId === 'expected') {
        autoIds = Array.from(new Set(logs.filter(l => l.date === yesterday).map(l => l.studentId)));
      } else if (statusId === 'recurring') {
        autoIds = Array.from(new Set(logs.filter(l => {
          return logs.some(l2 => l2.studentId === l.studentId && isNextDay(l2.date, l.date));
        }).map(l => l.studentId)));
      } else if (statusId === 'most') {
        const counts: Record<string, number> = {};
        logs.forEach(l => counts[l.studentId] = (counts[l.studentId] || 0) + 1);
        autoIds = Object.keys(counts).filter(id => counts[id] >= 15);
      } else if (statusId === 'disconnected') {
        autoIds = Array.from(new Set(students.map(s => s.id).filter(id => getAbsenceStreak(id) >= 20)));
      } else if (statusId === 'week1') {
        autoIds = Array.from(new Set(students.map(s => s.id).filter(id => getAbsenceStreak(id) >= 5)));
      } else if (statusId === 'week2') {
        autoIds = Array.from(new Set(students.map(s => s.id).filter(id => getAbsenceStreak(id) >= 10)));
      }

      const allIds = Array.from(new Set([...autoIds, ...manual])).filter(id => !exclusions.includes(id));

      return allIds.map(id => {
        const s = students.find(x => x.id === id);
        return {
          id,
          name: s?.name || 'طالب غير معروف',
          grade: s?.grade || '---',
          section: s?.section || '---',
          isAuto: autoIds.includes(id)
        };
      });
    };

    const toggleExclusion = (statusId: string, studentId: string) => {
      const exclusions = data.absenceExclusions || {};
      const current = exclusions[statusId] || [];
      const updated = current.includes(studentId) ? current.filter(id => id !== studentId) : [...current, studentId];

      // Update student notes sync
      const statusLabel = statusOptions.find(o => o.id === statusId)?.label || '';
      const isRemoving = !current.includes(studentId); // removing from auto list via exclusion
      const updatedStudents = students.map(s => {
        if (s.id === studentId) {
          return { ...s, otherNotesText: isRemoving ? '' : statusLabel };
        }
        return s;
      });

      updateData({
        absenceExclusions: { ...exclusions, [statusId]: updated },
        studentReports: updatedStudents
      });
    };

    const addManual = (statusId: string, studentId: string) => {
      const manual = data.absenceManualAdditions || {};
      const current = manual[statusId] || [];
      if (!current.includes(studentId)) {
        const statusLabel = statusOptions.find(o => o.id === statusId)?.label || '';
        const updatedStudents = students.map(s => {
          if (s.id === studentId) return { ...s, otherNotesText: statusLabel };
          return s;
        });
        updateData({
          absenceManualAdditions: { ...manual, [statusId]: [...current, studentId] },
          studentReports: updatedStudents
        });
      }
    };
    // END OF CHANGE

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.absenceLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button onClick={() => { setShowTable(!showTable); setShowPresenceTracker(false); }} className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${!showTable && !showPresenceTracker ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              <Plus size={18} /> رصد غياب جديد
            </button>
            <button onClick={() => { setShowTable(true); setShowPresenceTracker(false); }} className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${showTable && !showPresenceTracker ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              <LayoutList size={18} /> جدول السجلات
            </button>
            <button onClick={() => { setShowPresenceTracker(true); setShowTable(false); }} className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${showPresenceTracker ? 'bg-green-600 text-white shadow-md' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
              <Filter size={18} /> تحضير الطلاب (فلتر)
            </button>
            {!showTable && !showPresenceTracker && (
              <button onClick={() => setShowFrequentNames(true)} className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2">
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button onClick={() => setActiveSubTab(null)} className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><X size={18} /></button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
              تقرير الغياب اليومي <Clock className="text-blue-600" size={24} />
            </h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" className="text-[10px] md:text-xs font-black bg-transparent outline-none" value={absenceForm.date} onChange={e => setAbsenceForm({ ...absenceForm, date: e.target.value })} />
              <span className="text-[10px] font-bold text-slate-400">{getDayName(absenceForm.date || today)}</span>
            </div>
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
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 mr-2">تاريخ التحضير</label>
                  <input type="date" className="p-2.5 bg-white border-2 rounded-xl text-xs font-black outline-none" value={presenceDate} onChange={e => setPresenceDate(e.target.value)} />
                </div>
              </div>

              {/* START OF CHANGE - New Controls for Auto-Save and Archive */}
              <div className="flex flex-wrap gap-4 items-center justify-between border-t border-slate-200 pt-4 mt-2">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">الفصل الدراسي</label>
                    <select
                      className="p-2.5 bg-white border-2 rounded-xl text-xs font-black outline-none w-32"
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value as any)}
                    >
                      <option value="الأول">الأول</option>
                      <option value="الثاني">الثاني</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      // Bulk Save Logic
                      const absentees = filteredPresence.filter(s => {
                        const status = attendanceMap[s.id];
                        return status === 'absent_excused' || status === 'absent_unexcused';
                      });

                      if (absentees.length === 0) return alert('لا يوجد طلاب غائبين للحفظ (بعذر أو بدون عذر).');

                      const newLogs = absentees.map(s => {
                        const status = attendanceMap[s.id];
                        const contactMethod = contactMethodMap[s.id];
                        const prevCount = (data.absenceLogs || []).filter(l => l.studentId === s.id).length;

                        return {
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                          studentId: s.id,
                          studentName: s.name,
                          grade: s.grade,
                          section: s.section,
                          day: getDayName(presenceDate),
                          date: presenceDate,
                          semester: selectedSemester,
                          prevAbsenceCount: prevCount,
                          status: status === 'absent_excused' ? 'expected' : 'recurring',
                          reason: status === 'absent_excused' ? 'غائب بعذر' : 'غائب بدون عذر',
                          commType: contactMethod === 'رسالة' ? 'رسالة sms' : contactMethod === 'هاتف' ? 'هاتف' : 'أخرى',
                          commStatus: contactMethod ? 'تم التواصل' : 'قيد المتابعة',
                          replier: 'غيرهم',
                          notes: '',
                          result: 'لم يتم الرد'
                        } as AbsenceLog;
                      });

                      updateData({ absenceLogs: [...newLogs, ...(data.absenceLogs || [])] });
                      alert(`تم حفظ ${newLogs.length} سجل غياب بنجاح وتمت الأرشفة.`);

                      // Reset
                      setAttendanceMap({});
                      setContactMethodMap({});
                      setPresenceGrade('');
                      setPresenceSection('');
                    }}
                    className="flex items-center gap-2 bg-[#7030A0] text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-[#5a2480] shadow-md transition-all active:scale-95"
                  >
                    <Save size={18} /> حفظ الغياب المفتوح
                  </button>
                </div>
                <button
                  onClick={() => setAbsenceArchiveOpen(true)}
                  className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-black shadow-md transition-all active:scale-95"
                >
                  <Archive size={18} /> أرشيف الغياب
                </button>
              </div>
              {/* END OF CHANGE */}
            </div>

            {/* New Archive Modal */}
            {absenceArchiveOpen && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-arabic">
                <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-slate-800 flex flex-col max-h-[90vh]">
                  <div className="p-6 bg-slate-800 text-white flex justify-between items-center shadow-lg">
                    <h3 className="text-2xl font-black flex items-center gap-3"><Archive size={28} /> أرشيف الغياب المرصود</h3>
                    <button onClick={() => setAbsenceArchiveOpen(false)} className="hover:bg-slate-700 p-2 rounded-full transition-colors"><X size={24} /></button>
                  </div>
                  <div className="p-6 bg-slate-50 border-b flex gap-4 overflow-x-auto">
                    {/* Simple Filters for Archive */}
                    <input type="date" className="p-3 rounded-xl border font-bold text-xs" onChange={(e) => setFilterValues({ ...filterValues, start: e.target.value })} />
                    <input type="text" placeholder="بحث بالاسم..." className="p-3 rounded-xl border font-bold text-xs w-64" onChange={(e) => setSearchQuery(e.target.value)} />
                    <button
                      onClick={() => {
                        // Export WA Logic for Archive
                        const filteredArchive = (data.absenceLogs || []).filter(l => (!searchQuery || l.studentName.includes(searchQuery)));
                        shareWhatsAppRich('أرشيف الغياب', filteredArchive, cols);
                      }}
                      className="bg-green-600 text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-green-700"
                    >
                      <MessageCircle size={18} /> إرسال واتساب
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 bg-white">
                    <table className="w-full text-center border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 z-10">
                        <tr>
                          <th className="p-4 border-b">م</th>
                          <th className="p-4 border-b text-right">الاسم</th>
                          <th className="p-4 border-b">الصف</th>
                          <th className="p-4 border-b">التاريخ</th>
                          <th className="p-4 border-b">السبب</th>
                          <th className="p-4 border-b">الحالة</th>
                          <th className="p-4 border-b">التواصل</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.absenceLogs || [])
                          .filter(l => (!searchQuery || l.studentName.includes(searchQuery)))
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((log, idx) => (
                            <tr
                              key={log.id}
                              className="hover:bg-slate-50 transition-colors cursor-pointer border-b last:border-none focus:bg-sky-100 active:bg-sky-100"
                              tabIndex={0} // Make focusable for simple highlight
                              onClick={(e) => e.currentTarget.focus()} // Quick self-focus highlight
                            >
                              <td className="p-4 font-black text-slate-400">{idx + 1}</td>
                              <td className="p-4 text-right font-black">{log.studentName}</td>
                              <td className="p-4 text-xs font-bold text-slate-500">{log.grade} / {log.section}</td>
                              <td className="p-4 text-xs font-bold text-blue-600">{log.date}</td>
                              <td className="p-4 font-bold text-red-500">{log.reason}</td>
                              <td className="p-4 text-xs">{log.status}</td>
                              <td className="p-4 text-xs">{log.commType} - {log.commStatus}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center py-4 space-y-2">
              <h3 className="text-2xl font-black text-slate-800">حضور وغياب يوم: <span className="text-blue-600">{getDayName(presenceDate)}</span> بتاريخ <span className="text-blue-600">{presenceDate}</span></h3>
              <p className="text-slate-500 font-bold">تفاصيل الجدول حسب الفلتر للصف: <span className="text-slate-800">{presenceGrade || '---'}</span> والشعبة <span className="text-slate-800">{presenceSection || '---'}</span></p>
            </div>

            <div className="overflow-x-auto rounded-[2.5rem] border-[3px] border-blue-100 shadow-xl bg-white">
              <table className="w-full text-center border-collapse min-w-[1000px]">
                <thead className="bg-[#FFD966] text-slate-800 font-black border-b-2 border-blue-100">
                  <tr>
                    <th className="p-4 border-e border-blue-50 w-12">م</th>
                    <th className="p-4 border-e border-blue-50 w-12"><CheckSquare size={16} /></th>
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
                    <tr><td colSpan={8} className="p-20 text-slate-300 italic text-lg font-bold">لا يوجد طلاب مطابقين للفلتر المختار حالياً. تأكد من صحة الفلتر أو وجود طلاب في "تقارير الطلاب".</td></tr>
                  ) : filteredPresence.map((s, idx) => {
                    const status = attendanceMap[s.id] || 'present';
                    const isSelected = selectedForWA.includes(s.id);
                    // Highlight logic: checking against a new local state for clicked row would be ideal, 
                    // but simpler to use just active focus or a persistent state if required.
                    // User asked for "light blue highlight on click".
                    // Utilizing a data-attribute or just relying on the :focus-within or a simple state.
                    // Let's assume we use a state `highlightedRowId` defined in the component.

                    const isHighlighted = highlightedRowId === s.id;

                    return (
                      <tr
                        key={s.id}
                        id={`student-row-${s.id}`}
                        onClick={() => setHighlightedRowId(s.id)}
                        className={`transition-all duration-500 h-14 cursor-pointer ${isHighlighted ? 'bg-sky-100 ring-4 ring-sky-200 ring-inset shadow-inner z-10 relative' : 'hover:bg-slate-50/50'}`}
                      >
                        <td className="p-2 border-e border-slate-50 font-black text-blue-600">{idx + 1}</td>
                        <td className="p-2 border-e border-slate-50">
                          <input type="checkbox" checked={isSelected} onChange={() => setSelectedForWA(prev => isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id])} className="w-5 h-5 rounded cursor-pointer" />
                        </td>
                        <td className="p-2 border-e border-slate-50 text-right font-black text-slate-700">{s.name}</td>
                        <td className="p-2 border-e border-slate-50 font-bold text-slate-500">{s.grade}</td>
                        <td className="p-2 border-e border-slate-50 font-bold text-slate-500">{s.section}</td>
                        <td className="p-2 border-e border-slate-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // prevent row click
                              setAttendanceMap(prev => {
                                const current = prev[s.id] || 'present';
                                let next = 'present';
                                if (current === 'present') next = 'absent_excused';
                                else if (current === 'absent_excused') next = 'absent_unexcused';
                                else next = 'present';
                                return { ...prev, [s.id]: next as any };
                              });
                            }}
                            className={`px-6 py-2 rounded-full text-xs font-black transition-all shadow-sm border ${status === 'present' ? 'bg-green-100 text-green-700 border-green-200' :
                              status === 'absent_excused' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                'bg-red-100 text-red-700 border-red-200'
                              }`}
                          >
                            {status === 'present' ? 'حاضر' : status === 'absent_excused' ? 'غائب بعذر' : 'غائب بدون عذر'}
                          </button>
                        </td>
                        <td className="p-2 border-e border-slate-50 font-bold text-slate-600">{s.guardianPhones[0] || '---'}</td>
                        <td className="p-2">
                          <div className="flex justify-center gap-2">
                            <a
                              href={`sms:${s.guardianPhones[0]}?body=${encodeURIComponent(`السلام عليكم، نبلغكم بغياب ${s.name} لهذا اليوم، مدارس الرائد.`)}`}
                              onClick={() => setContactMethodMap(prev => ({ ...prev, [s.id]: 'رسالة' }))}
                              className={`p-2 rounded-xl transition-all ${contactMethodMap[s.id] === 'رسالة' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                            >
                              <MessageSquare size={18} />
                            </a>
                            <a
                              href={`tel:${s.guardianPhones[0]}`}
                              onClick={() => setContactMethodMap(prev => ({ ...prev, [s.id]: 'هاتف' }))}
                              className={`p-2 rounded-xl transition-all ${contactMethodMap[s.id] === 'هاتف' ? 'bg-green-600 text-white shadow-md' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            >
                              <PhoneCall size={18} />
                            </a>
                            <button
                              onClick={() => {
                                const statusEmoji = status === 'present' ? '✅' : status === 'absent_excused' ? '🟠' : '❌';
                                const statusText = status === 'present' ? 'حاضر' : status === 'absent_excused' ? 'غائب بعذر' : 'غائب بدون عذر';
                                let msg = `*📋 تنبيه غياب/حضور*\\n\\n`;
                                msg += `👤 *الطالب:* ${s.name}\\n`;
                                msg += `📍 *الصف:* ${s.grade} / ${s.section}\\n`;
                                msg += `🏷️ *الحالة:* ${statusEmoji} ${statusText}\\n`;
                                msg += `📅 *التاريخ:* ${presenceDate} (${getDayName(presenceDate)})\\n`;
                                msg += `━━━━━━━━━━━━━━━━\\n`;
                                const profile = data.profile;
                                if (profile.schoolName || profile.branch) {
                                  msg += `🏫 *${profile.schoolName || ''}${profile.branch ? `، فرع ${profile.branch}` : ''}*\\n`;
                                }
                                window.open(`https://wa.me/${s.guardianPhones[0]}?text=${encodeURIComponent(msg)}`, '_blank');
                                setContactMethodMap(prev => ({ ...prev, [s.id]: 'واتساب' }));
                              }}
                              className={`p-2 rounded-xl transition-all ${contactMethodMap[s.id] === 'واتساب' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                            >
                              <MessageCircle size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex flex-wrap gap-3 items-center justify-center">
              <span className="font-black text-slate-400 ml-4">تصدير التحضير للواتساب:</span>
              <button onClick={() => handleWhatsAppAttendance('all')} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-blue-700 shadow-md">جميع الطلاب</button>
              <button onClick={() => handleWhatsAppAttendance('present')} className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-green-700 shadow-md">الحاضرين فقط</button>
              <button onClick={() => handleWhatsAppAttendance('absent')} className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-red-700 shadow-md">الغائبين فقط</button>
              <button onClick={() => handleWhatsAppAttendance('selected')} className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-black shadow-md">الأسماء المحددة</button>
              <div className="flex gap-2 mr-6 border-r pr-6">
                <button onClick={() => { }} title="استيراد" className="p-3 bg-white border-2 text-blue-600 rounded-xl shadow-sm hover:bg-blue-50 transition-all"><Upload size={18} /></button>
                <button onClick={() => exportTxtFiltered('التحضير_اليومي', filteredPresence.map(s => ({ ...s, status: attendanceMap[s.id] === 'absent' ? 'غائب' : 'حاضر' })), [{ label: 'الاسم', key: 'name' }, { label: 'الحالة', key: 'status' }])} title="تصدير TXT" className="p-3 bg-white border-2 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition-all"><FileText size={18} /></button>
                <button onClick={() => exportExcelFiltered('التحضير_اليومي', filteredPresence.map(s => ({ ...s, status: attendanceMap[s.id] === 'absent' ? 'غائب' : 'حاضر' })), [{ label: 'الاسم', key: 'name' }, { label: 'الحالة', key: 'status' }])} title="تصدير إكسل" className="p-3 bg-white border-2 text-green-700 rounded-xl shadow-sm hover:bg-green-50 transition-all"><FileSpreadsheet size={18} /></button>
              </div>
            </div>
          </div>
        ) : !showTable ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-6">
              {/* START OF CHANGE - Enhanced Status Buttons with Popover List */}
              <div className="flex flex-wrap gap-1.5 md:gap-2 justify-end">
                {statusOptions.map(opt => (
                  <div key={opt.id} className="relative group">
                    <button
                      onClick={() => {
                        setAbsenceForm({ ...absenceForm, status: opt.id as any });
                        // Toggle name selection mode or just set it
                      }}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black transition-all border ${absenceForm.status === opt.id ? 'bg-red-600 text-white border-red-600 shadow-lg scale-105' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
                    >
                      {opt.label} ({getSmartList(opt.id).length})
                    </button>

                    {/* Popover List for each status */}
                    <div className="hidden group-hover:block fixed inset-x-8 top-[20%] z-[500] w-auto max-h-[60vh] overflow-y-auto bg-white border-4 border-slate-800 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] p-4 animate-in zoom-in-95 duration-200 md:absolute md:inset-auto md:top-full md:left-0 md:z-[110] md:mt-2 md:w-72 md:border-2 md:shadow-2xl md:rounded-2xl">
                      <div className="flex justify-between items-center mb-2 border-b pb-1">
                        <h4 className="text-[10px] font-black text-blue-600">قائمة: {opt.label}</h4>
                        <button
                          onClick={() => {
                            const list = getSmartList(opt.id);
                            if (list.length === 0) return;
                            let msg = `*📋 قائمة ${opt.label}*\n\n`;
                            list.forEach((m, i) => {
                              msg += `${i + 1}. 👤 *${m.name}* (${m.grade}-${m.section})\n`;
                            });
                            msg += `\n📅 التاريخ: ${today}\n`;
                            const profile = data.profile;
                            if (profile.schoolName || profile.branch) {
                              msg += `🏫 *${profile.schoolName || ''}${profile.branch ? `، فرع ${profile.branch}` : ''}*\n`;
                            }
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="إرسال القائمة بالكامل للواتساب"
                        >
                          <MessageCircle size={14} />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                        {getSmartList(opt.id).map(m => (
                          <div key={m.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group/item border-b border-slate-50 last:border-none">
                            <button
                              onClick={() => {
                                // Navigation and Highlighting
                                localStorage.setItem('highlight_student_name', m.name);
                                onNavigate?.('studentReports');
                              }}
                              className="text-[10px] font-bold text-slate-700 hover:text-blue-600 truncate flex-1 text-right"
                              title="انتقل إلى شؤون الطلاب"
                            >
                              {m.name}
                            </button>
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] text-slate-400 bg-slate-100 px-1 rounded">{m.grade}-{m.section}</span>
                              <button
                                onClick={() => {
                                  let msg = `*📋 تنبيه: ${opt.label}*\n\n`;
                                  msg += `👤 *الطالب:* ${m.name}\n`;
                                  msg += `📍 *الصف:* ${m.grade}-${m.section}\n`;
                                  msg += `📅 التاريخ: ${today}\n`;
                                  const profile = data.profile;
                                  if (profile.schoolName || profile.branch) {
                                    msg += `🏫 *${profile.schoolName || ''}${profile.branch ? `، فرع ${profile.branch}` : ''}*\n`;
                                  }
                                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="p-1 text-emerald-500 hover:text-emerald-700 rounded transition-colors"
                                title="إرسال للواتساب"
                              >
                                <MessageCircle size={12} />
                              </button>
                              <button
                                onClick={() => toggleExclusion(opt.id, m.id)}
                                className="p-1 text-red-400 hover:text-red-600 rounded transition-colors"
                                title="حذف من القائمة"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t flex flex-col gap-2">
                        <label className="text-[8px] font-black text-slate-400">إضافة طالب يدوياً:</label>
                        <div className="flex gap-1">
                          <select
                            className="flex-1 text-[9px] p-1 border rounded"
                            onChange={(e) => addManual(opt.id, e.target.value)}
                            value=""
                          >
                            <option value="">اختر...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* END OF CHANGE */}
              <div className="relative">
                <label className="text-xs font-black text-slate-400 mb-2 block mr-2">اسم الطالب</label>
                <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-blue-500 shadow-sm transition-all">
                  <Search className="text-slate-400" size={20} />
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
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-[#FFF2CC]/30 p-4 md:p-5 rounded-3xl border-2 border-[#FFF2CC] text-center shadow-sm">
                  <label className="text-[9px] md:text-[10px] font-black text-orange-600 mb-1 block">غياب سابق</label>
                  <span className="text-2xl md:text-3xl font-black text-slate-800">{absenceForm.prevAbsenceCount || 0}</span>
                </div>
                <div className="bg-blue-50 p-4 md:p-5 rounded-3xl border-2 border-blue-100 relative shadow-sm text-center">
                  <label className="text-[9px] md:text-[10px] font-black text-blue-600 mb-1 block">الفصل</label>
                  <select className="bg-white border text-[10px] md:text-xs font-black p-1 md:p-2 rounded-lg outline-none cursor-pointer w-full text-center" value={absenceForm.semester} onChange={e => setAbsenceForm({ ...absenceForm, semester: e.target.value as any })}>
                    <option value="الأول">الأول</option><option value="الثاني">الثاني</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 mr-2 block">سبب الغياب</label>
                <div className="flex flex-wrap gap-2 justify-end">
                  {reasons.map(r => (
                    <button key={r} onClick={() => setAbsenceForm({ ...absenceForm, reason: r })} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${absenceForm.reason === r ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>{r}</button>
                  ))}
                  <input className="px-4 py-2 rounded-xl text-[10px] font-black border outline-none bg-slate-50 w-full focus:ring-2 ring-blue-100" placeholder="سبب آخر..." value={absenceForm.reason} onChange={e => setAbsenceForm({ ...absenceForm, reason: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">نوع التواصل</label>
                  <select className="w-full p-3 md:p-4 bg-white border-2 rounded-2xl font-black text-xs md:text-sm outline-none focus:border-blue-500 shadow-sm appearance-none" value={absenceForm.commType} onChange={e => setAbsenceForm({ ...absenceForm, commType: e.target.value as any })}>
                    {["هاتف", "واتساب", "رسالة", "أخرى"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">حالة التواصل</label>
                  <select className="w-full p-3 md:p-4 bg-white border-2 rounded-2xl font-black text-xs md:text-sm outline-none focus:border-blue-500 shadow-sm appearance-none" value={absenceForm.commStatus} onChange={e => setAbsenceForm({ ...absenceForm, commStatus: e.target.value as any })}>
                    {["تم التواصل", "لم يتم التواصل", "قيد المتابعة"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">نتيجة التواصل</label>
                  <select className="w-full p-3 md:p-4 bg-white border-2 rounded-2xl font-black text-xs md:text-sm outline-none focus:border-blue-500 shadow-sm appearance-none" value={absenceForm.result} onChange={e => setAbsenceForm({ ...absenceForm, result: e.target.value as any })}>
                    {["تم الرد", "لم يتم الرد", "الرقم مغلق", "سيحضر غداً"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">صفة المجيب</label>
                  <select className="w-full p-3 md:p-4 bg-white border-2 rounded-2xl font-black text-xs md:text-sm outline-none focus:border-blue-500 shadow-sm appearance-none" value={absenceForm.replier} onChange={e => setAbsenceForm({ ...absenceForm, replier: e.target.value as any })}>
                    {["الأب", "الأم", "الأخ", "الأخت", "العم", "الخال", "غيرهم"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">ملاحظات أخرى...</label>
                <textarea className="w-full p-3 md:p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 min-h-[100px] md:min-h-[120px] focus:border-blue-400 shadow-inner" placeholder="ملاحظات إضافية..." value={absenceForm.notes} onChange={e => setAbsenceForm({ ...absenceForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-4">
                <button onClick={saveLog} className="flex-1 bg-blue-600 text-white p-5 md:p-6 rounded-[2rem] font-black text-lg md:text-xl hover:bg-blue-700 shadow-2xl flex items-center justify-center gap-4 active:scale-[0.98] transition-all mt-4">
                  <Save size={24} /> حفظ بيانات الغياب
                </button>
                <button
                  onClick={() => setShowPreviousAbsence(true)}
                  className="bg-slate-800 text-white px-8 md:px-10 rounded-[2rem] font-black text-lg hover:bg-black shadow-2xl transition-all mt-4"
                >
                  فتح غياب سابق
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <FilterSection suggestions={nameSugg} values={filterValues} setValues={setFilterValues} tempNames={tempNames} setTempNames={setTempNames} appliedNames={appliedNames} setAppliedNames={setAppliedNames} nameInput={nameInput} setNameInput={setNameInput} onExportExcel={() => exportExcelFiltered('غياب_الطلاب', filtered, cols)} onExportTxt={() => exportTxtFiltered('غياب_الطلاب', filtered, cols)} onExportWA={() => shareWhatsAppRich('سجل غياب الطلاب المفلتر', filtered, cols)} />
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

  const renderLatenessModule = () => {
    const suggestions = (searchQuery.trim() && searchQuery !== latenessForm.studentName) ? students.filter(s => s.name.includes(searchQuery)) : [];
    const nameSugg = nameInput.trim() ? students.filter(s => s.name.includes(nameInput) && !tempNames.includes(s.name)) : [];
    const filtered = (data.studentLatenessLogs || []).filter(l => {
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName)) return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester) return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section) return false;
      return true;
    });

    const reasons = ["مرض", "انشغال", "نوم", "لم يمر له الباص", "بلا عذر"];
    const statusOptions = [
      { id: 'recurring', label: 'تأخر متكرر', color: 'bg-orange-500' },
      { id: 'frequent', label: 'كثير التأخر', color: 'bg-slate-100' },
      { id: 'permanent', label: 'دائم التأخر', color: 'bg-slate-100' }
    ];

    const handleSelectStudent = (s: StudentReport) => {
      setLatenessForm({
        ...latenessForm,
        studentId: s.id,
        studentName: s.name,
        grade: s.grade,
        section: s.section,
        prevLatenessCount: (data.studentLatenessLogs || []).filter(l => l.studentId === s.id).length
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (!latenessForm.studentId) return alert('يرجى اختيار طالب أولاً');
      const newLog: LatenessLog = {
        ...latenessForm as LatenessLog,
        id: Date.now().toString(),
        day: getDayName(latenessForm.date || today)
      };
      updateData({ studentLatenessLogs: [newLog, ...(data.studentLatenessLogs || [])] });
      setLatenessForm({ ...latenessForm, studentName: '', studentId: '', reason: '', pledge: '', notes: '' });
      setSearchQuery('');
      alert('تم حفظ البيانات بنجاح');
    };

    const cols = [
      { label: 'اسم الطالب', key: 'studentName' }, { label: 'التاريخ', key: 'date' }, { label: 'السبب', key: 'reason' },
      { label: 'الإجراء', key: 'action' }, { label: 'البصمة', key: 'pledge' }
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.studentLatenessLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button onClick={() => setShowTable(!showTable)} className="bg-blue-50 text-blue-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-blue-100 transition-all flex items-center gap-2 shadow-sm">
              {showTable ? <Plus size={18} /> : <History size={18} />}
              {showTable ? 'رصد جديد' : 'جدول السجلات'}
            </button>
            {!showTable && (
              <button onClick={() => setShowFrequentNames(true)} className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2">
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button onClick={() => setActiveSubTab(null)} className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><X size={18} /></button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
              تقرير التأخر اليومي <Clock className="text-orange-500" size={24} />
            </h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" className="text-[10px] md:text-xs font-black bg-transparent outline-none" value={latenessForm.date} onChange={e => setLatenessForm({ ...latenessForm, date: e.target.value })} />
              <span className="text-[10px] font-bold text-slate-400">{getDayName(latenessForm.date || today)}</span>
            </div>
          </div>
        </div>

        {!showTable ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-1.5 md:gap-2 justify-end">
                {statusOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setLatenessForm({ ...latenessForm, status: opt.id as any })}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black transition-all border ${latenessForm.status === opt.id ? 'bg-orange-500 text-white border-orange-500 shadow-lg scale-105' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <label className="text-xs font-black text-slate-400 mb-2 block mr-2">اسم الطالب</label>
                <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-orange-500 shadow-sm transition-all">
                  <UserCircle className="text-slate-400" size={20} />
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
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-[#FFF2CC]/30 p-4 md:p-5 rounded-3xl border-2 border-[#FFF2CC] text-center shadow-sm">
                  <label className="text-[9px] md:text-[10px] font-black text-orange-600 mb-1 block">تأخر سابق</label>
                  <span className="text-2xl md:text-3xl font-black text-slate-800">{latenessForm.prevLatenessCount || 0}</span>
                </div>
                <div className="bg-blue-50 p-4 md:p-5 rounded-3xl border-2 border-blue-100 relative shadow-sm text-center">
                  <label className="text-[9px] md:text-[10px] font-black text-blue-600 mb-1 block">الفصل</label>
                  <select className="bg-white border text-[10px] md:text-xs font-black p-1 md:p-2 rounded-lg outline-none cursor-pointer w-full text-center" value={latenessForm.semester} onChange={e => setLatenessForm({ ...latenessForm, semester: e.target.value as any })}>
                    <option value="الأول">الأول</option><option value="الثاني">الثاني</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 mr-2 block">سبب التأخر</label>
                <div className="flex flex-wrap gap-2 justify-end">
                  {reasons.map(r => (
                    <button key={r} onClick={() => setLatenessForm({ ...latenessForm, reason: r })} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${latenessForm.reason === r ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>{r}</button>
                  ))}
                  <input className="px-4 py-2 rounded-xl text-[10px] font-black border outline-none bg-slate-50 w-full focus:ring-2 ring-blue-100" placeholder="سبب آخر..." value={latenessForm.reason} onChange={e => setLatenessForm({ ...latenessForm, reason: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">الإجراء المتخذ</label>
                <select className="w-full p-4 md:p-5 bg-white border-2 rounded-2xl md:rounded-3xl font-black text-base md:text-lg outline-none focus:border-orange-500 shadow-sm appearance-none" value={latenessForm.action} onChange={e => setLatenessForm({ ...latenessForm, action: e.target.value })}>
                  {["تنبيه 1", "تنبيه 2", "تعهد خطي", "اتصال بولي الأمر", "استدعاء ولي الأمر"].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="p-6 md:p-8 bg-[#0f172a] text-white rounded-[2.5rem] shadow-2xl space-y-4 border-4 border-slate-800 relative group overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full group-hover:scale-150 transition-all duration-700"></div>
                <h4 className="flex items-center gap-2 font-black text-base md:text-lg"><Fingerprint className="text-orange-500" /> بصمة الطالب (تعهد)</h4>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 leading-relaxed">أتعهد بعدم تكرار التأخر وفي حالة التكرار فللإدارة الحق في اتخاذ اللازم.</p>
                <button onClick={() => setLatenessForm({ ...latenessForm, pledge: 'تم التوقيع' })} className={`w-full p-3 md:p-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg text-xs md:text-base ${latenessForm.pledge ? 'bg-green-600 border-none' : 'bg-white text-slate-800 hover:scale-[1.02] active:scale-95'}`}>
                  {latenessForm.pledge ? <CheckCircle size={20} /> : <Zap size={18} className="text-orange-500" />}
                  {latenessForm.pledge || 'توقيع البصمة'}
                </button>
              </div>
              <button onClick={saveLog} className="flex-1 bg-[#1e293b] text-white p-5 md:p-6 rounded-[2rem] font-black text-lg md:text-xl hover:bg-black shadow-2xl flex items-center justify-center gap-4 active:scale-[0.98] transition-all mt-4">حفظ البيانات</button>
              <button
                onClick={() => setShowPreviousLateness(true)}
                className="bg-orange-600 text-white px-8 md:px-10 rounded-[2rem] font-black text-lg hover:bg-orange-700 shadow-2xl transition-all mt-4"
              >
                فتح تأخر سابق
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <FilterSection suggestions={nameSugg} values={filterValues} setValues={setFilterValues} tempNames={tempNames} setTempNames={setTempNames} appliedNames={appliedNames} setAppliedNames={setAppliedNames} nameInput={nameInput} setNameInput={setNameInput} onExportExcel={() => exportExcelFiltered('تأخر_الطلاب', filtered, cols)} onExportTxt={() => exportTxtFiltered('تأخر_الطلاب', filtered, cols)} onExportWA={() => shareWhatsAppRich('سجل تأخر الطلاب المفلتر', filtered, cols)} />
            <div className="overflow-x-auto rounded-[1.5rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1000px]">
                <thead className="bg-[#FFD966] text-slate-800 font-black">
                  <tr>{cols.map(c => <th key={c.key} className="p-3 md:p-5 border-e border-slate-200">{c.label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">
                  {filtered.length === 0 ? (<tr><td colSpan={5} className="p-20 text-slate-300 italic text-base md:text-lg font-bold">لا توجد سجلات تأخر.</td></tr>) : filtered.map(l => (
                    <tr key={l.id} className="hover:bg-orange-50/20 transition-colors h-10 md:h-12">
                      <td className="p-2 md:p-4 border-e border-slate-100 font-black">{l.studentName}</td>
                      <td className="p-2 md:p-4 border-e border-slate-100 text-[10px] text-slate-400">{l.date}</td>
                      <td className="p-2 md:p-4 border-e border-slate-100">{l.reason}</td>
                      <td className="p-2 md:p-4 border-e border-slate-100 text-red-600">{l.action}</td>
                      <td className="p-2 md:p-4 text-[10px] text-green-600 border-slate-100">{l.pledge || '---'}</td>
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

  const renderViolationModule = () => {
    const suggestions = (searchQuery.trim() && searchQuery !== violationForm.studentName) ? students.filter(s => s.name.includes(searchQuery)) : [];
    const nameSugg = nameInput.trim() ? students.filter(s => s.name.includes(nameInput) && !tempNames.includes(s.name)) : [];
    const filtered = (data.studentViolationLogs || []).filter(l => {
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName)) return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester) return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section) return false;
      return true;
    });

    const categories = [
      { id: 'behavior', label: 'قسم السلوك', color: 'border-red-500', iconColor: 'text-red-500', items: ["تأخر عن الطابور", "تأخر عن حصة", "كثير الكلام", "كثير الشغب", "عدواني", "تطاول على معلم"] },
      { id: 'duties', label: 'الواجبات والدفاتر', color: 'border-blue-500', iconColor: 'text-blue-500', items: ["تقصير في الواجبات", "تقصير في الدفاتر", "تقصير في الكتب", "عدم الكتابة بالحصة", "عدم حل التكليف"] },
      { id: 'achievement', label: 'التحصيل العلمي', color: 'border-green-500', iconColor: 'text-green-500', items: ["عدم حفظ الدرس", "عدم المشاركة", "كثير النوم", "كثير الشرود", "امتناع عن اختبار"] }
    ];

    const toggleViolation = (cat: string, item: string) => {
      const field = cat === 'behavior' ? 'behaviorViolations' : cat === 'duties' ? 'dutiesViolations' : 'achievementViolations';
      const current = (violationForm as any)[field] || [];
      const updated = current.includes(item) ? current.filter((i: string) => i !== item) : [...current, item];
      setViolationForm({ ...violationForm, [field]: updated });
    };

    const handleSelectStudent = (s: StudentReport) => {
      setViolationForm({ ...violationForm, studentId: s.id, studentName: s.name, grade: s.grade, section: s.section });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (!violationForm.studentId) return alert('يرجى اختيار طالب أولاً');
      const total = (violationForm.behaviorViolations?.length || 0) + (violationForm.dutiesViolations?.length || 0) + (violationForm.achievementViolations?.length || 0);
      const newLog: StudentViolationLog = { ...violationForm as StudentViolationLog, id: Date.now().toString(), totalViolations: total };
      updateData({ studentViolationLogs: [newLog, ...(data.studentViolationLogs || [])] });
      setViolationForm({ ...violationForm, studentName: '', studentId: '', behaviorViolations: [], dutiesViolations: [], achievementViolations: [], notes: '', pledge: '' });
      setSearchQuery('');
      alert('تم تسجيل المخالفة بنجاح');
    };

    const cols = [
      { label: 'اسم الطالب', key: 'studentName' }, { label: 'الصف / الشعبة', key: 'grade' }, { label: 'إجمالي المخالفات', key: 'totalViolations' },
      { label: 'تاريخ الرصد', key: 'date' }, { label: 'الحالة', key: 'status' }, { label: 'الإجراء', key: 'action' }
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.studentViolationLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button onClick={() => setShowTable(!showTable)} className="bg-blue-50 text-blue-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-blue-100 transition-all flex items-center gap-2">
              {showTable ? <Plus size={18} /> : <ShieldAlert size={18} />}
              {showTable ? 'رصد جديد' : 'جدول المخالفات'}
            </button>
            {!showTable && (
              <button onClick={() => setShowFrequentNames(true)} className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2">
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button onClick={() => setActiveSubTab(null)} className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><X size={18} /></button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-red-600 flex items-center gap-3">سجل المخالفات الطلابية <AlertCircle size={24} /></h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" className="text-[10px] md:text-xs font-black bg-transparent outline-none" value={violationForm.date} onChange={e => setViolationForm({ ...violationForm, date: e.target.value })} />
              <span className="text-[10px] font-bold text-slate-400">{getDayName(violationForm.date || today)}</span>
            </div>
          </div>
        </div>

        {!showTable ? (
          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 bg-slate-50/50 p-4 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="relative md:col-span-1">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 mb-1 block mr-2">اسم الطالب</label>
                <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-blue-500 shadow-sm transition-all">
                  <input type="text" className="bg-transparent w-full outline-none font-black text-sm md:text-base" placeholder="ابحث عن الاسم..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-40 overflow-y-auto">
                    {suggestions.map(s => (
                      <button key={s.id} onClick={() => handleSelectStudent(s)} className="w-full text-right p-3 hover:bg-blue-50 font-black border-b last:border-none flex justify-between items-center text-[10px] md:text-[11px] transition-colors">
                        <span>{s.name}</span><span className="text-[8px] md:text-[9px] bg-slate-100 px-2 py-1 rounded-lg">{s.grade}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:col-span-1">
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">الفصل</label>
                  <select className="w-full p-3 md:p-4 bg-white border-2 rounded-2xl font-black text-[10px] md:text-xs outline-none focus:border-blue-500 appearance-none shadow-sm cursor-pointer" value={violationForm.semester} onChange={e => setViolationForm({ ...violationForm, semester: e.target.value as any })}>
                    <option value="الأول">الأول</option><option value="الثاني">الثاني</option>
                  </select>
                </div>
                <div className="flex items-end justify-center bg-white border-2 rounded-2xl p-2 h-[52px] md:h-[60px] shadow-sm">
                  <div className="text-center w-full">
                    <label className="text-[8px] block text-red-400">إجمالي السوابق</label>
                    <span className="font-black text-red-600 text-xs md:text-sm">{(data.studentViolationLogs || []).filter(l => l.studentId === violationForm.studentId).length}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:col-span-1">
                <div className="bg-white p-2 rounded-2xl border text-center shadow-sm flex flex-col justify-center"><label className="text-[8px] block text-slate-400">الصف</label><span className="font-black text-[10px] md:text-xs">{violationForm.grade || '---'}</span></div>
                <div className="bg-white p-2 rounded-2xl border text-center shadow-sm flex flex-col justify-center"><label className="text-[8px] block text-slate-400">الشعبة</label><span className="font-black text-[10px] md:text-xs">{violationForm.section || '---'}</span></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center">
              {[{ id: 'blacklist', label: 'القائمة السوداء' }, { id: 'high', label: 'كثير المخالفة' }, { id: 'medium', label: 'متوسط' }, { id: 'rare', label: 'نادر' }].map(opt => (
                <button key={opt.id} onClick={() => setViolationForm({ ...violationForm, status: opt.id as any })} className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-2xl font-black text-[10px] md:text-xs border-2 transition-all ${violationForm.status === opt.id ? 'bg-red-600 border-red-600 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>{opt.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white p-4 md:p-6 rounded-[2rem] border-2 shadow-sm space-y-3 md:space-y-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between border-r-4 pr-3 py-1 mb-2" style={{ borderColor: cat.color.split('-')[1] }}>
                    <h3 className="font-black text-xs md:text-sm text-slate-800">{cat.label}</h3>
                    <button
                      onClick={() => setCustomViolation({ cat: cat.id, item: '' })}
                      className={`p-1 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all ${cat.iconColor}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 md:space-y-2">
                    {[...cat.items, ...(data.customViolationElements?.[cat.id as keyof typeof data.customViolationElements] || [])].map(item => (
                      <button key={item} onClick={() => toggleViolation(cat.id, item)} className={`text-right p-2 md:p-3 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${((violationForm as any)[cat.id === 'behavior' ? 'behaviorViolations' : cat.id === 'duties' ? 'dutiesViolations' : 'achievementViolations'] || []).includes(item) ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-50 hover:bg-slate-100'}`}>{item}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 border-t pt-8 md:pt-10">
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">الإجراء المتخذ</label>
                  <select className="w-full p-4 md:p-5 bg-white border-2 rounded-2xl md:rounded-3xl font-black text-base md:text-lg outline-none focus:border-red-500 shadow-sm appearance-none cursor-pointer" value={violationForm.action} onChange={e => setViolationForm({ ...violationForm, action: e.target.value })}>
                    {["تنبيه 1", "تنبيه 2", "تعهد خطي", "استدعاء ولي الأمر", "فصل مؤقت"].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">ملاحظات إضافية...</label>
                  <textarea className="w-full p-4 border-2 rounded-2xl outline-none font-black text-[10px] md:text-xs bg-slate-50 min-h-[80px] md:min-h-[100px] focus:border-red-400 shadow-inner" placeholder="..." value={violationForm.notes} onChange={e => setViolationForm({ ...violationForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="p-6 md:p-10 bg-red-600 text-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl space-y-4 md:space-y-6 relative group overflow-hidden border-4 border-red-700">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full group-hover:scale-150 transition-all duration-1000"></div>
                <h4 className="flex items-center gap-3 font-black text-xl md:text-2xl"><Fingerprint size={32} /> بصمة الطالب (تعهد)</h4>
                <p className="text-[10px] md:text-xs font-bold leading-relaxed opacity-90">أتعهد بعدم تكرار المخالفة وفي حالة التكرار فللإدارة الحق في اتخاذ اللازم.</p>
                <button onClick={() => setViolationForm({ ...violationForm, pledge: 'تم التبصيم بنجاح' })} className={`w-full p-4 md:p-5 rounded-2xl font-black text-base md:text-xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${violationForm.pledge ? 'bg-green-500 border-none' : 'bg-white/10 border-2 border-white/20 backdrop-blur-md hover:bg-white/20'}`}>
                  {violationForm.pledge ? <CheckCircle size={24} /> : <Zap size={22} />}
                  {violationForm.pledge || 'اعتماد التبصيم'}
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={saveLog} className="flex-1 bg-red-600 text-white p-5 md:p-7 rounded-[2rem] md:rounded-[2.5rem] font-black text-xl md:text-2xl hover:bg-red-700 shadow-2xl active:scale-[0.98] transition-all">حفظ السجل</button>
              <button
                onClick={() => setShowPreviousViolation(true)}
                className="bg-slate-800 text-white px-8 md:px-10 rounded-[2rem] font-black text-lg hover:bg-black shadow-2xl transition-all mt-4"
              >
                فتح مخالفة سابقة
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <FilterSection suggestions={nameSugg} values={filterValues} setValues={setFilterValues} tempNames={tempNames} setTempNames={setTempNames} appliedNames={appliedNames} setAppliedNames={setAppliedNames} nameInput={nameInput} setNameInput={setNameInput} onExportExcel={() => exportExcelFiltered('مخالفات_الطلاب', filtered, cols)} onExportTxt={() => exportTxtFiltered('مخالفات_الطلاب', filtered, cols)} onExportWA={() => shareWhatsAppRich('سجل مخالفات الطلاب المفلتر', filtered, cols)} />
            <div className="overflow-x-auto rounded-[1.5rem] md:rounded-[3rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1000px]">
                <thead className="bg-[#FFD966] text-slate-800 font-black sticky top-0">
                  <tr>{cols.map(c => <th key={c.key} className="p-4 md:p-6 border-e border-slate-200">{c.label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">
                  {filtered.length === 0 ? (<tr><td colSpan={6} className="p-20 text-slate-300 italic text-base md:text-lg font-bold">لا توجد مخالفات مسجلة.</td></tr>) : filtered.map(l => (
                    <tr key={l.id} className="hover:bg-red-50/20 transition-colors h-12 md:h-14">
                      <td className="p-3 md:p-5 border-e border-slate-100 font-black">{l.studentName}</td>
                      <td className="p-3 md:p-5 border-e border-slate-100 font-bold">{l.grade} / {l.section}</td>
                      <td className="p-3 md:p-5 border-e border-slate-100 text-red-600 font-black text-lg">{l.totalViolations}</td>
                      <td className="p-3 md:p-5 border-e border-slate-100 text-[10px] text-slate-400">{l.date}</td>
                      <td className="p-3 md:p-5 border-e border-slate-100"><span className="px-3 py-1 bg-slate-100 rounded-lg text-[8px] md:text-[10px] font-black uppercase">{l.status}</span></td>
                      <td className="p-3 md:p-5 text-red-700 font-black border-slate-100">{l.action}</td>
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

  const renderExitModule = () => {
    const suggestions = (searchQuery.trim() && searchQuery !== exitForm.studentName) ? students.filter(s => s.name.includes(searchQuery)) : [];
    const nameSugg = nameInput.trim() ? students.filter(s => s.name.includes(nameInput) && !tempNames.includes(s.name)) : [];
    const filtered = (data.exitLogs || []).filter(l => {
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName)) return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester) return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section) return false;
      return true;
    });

    const handleSelectStudent = (s: StudentReport) => {
      setExitForm({
        ...exitForm,
        studentId: s.id,
        studentName: s.name,
        grade: s.grade,
        section: s.section,
        prevExitCount: (data.exitLogs || []).filter(l => l.studentId === s.id).length
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (!exitForm.studentId) return alert('يرجى اختيار طالب أولاً');
      const newLog: ExitLog = { ...exitForm as ExitLog, id: Date.now().toString(), day: getDayName(exitForm.date || today) };
      updateData({ exitLogs: [newLog, ...(data.exitLogs || [])] });
      setExitForm({ ...exitForm, studentName: '', studentId: '', notes: '', status: 'نادر الخروج', action: 'تنبيه 1' });
      setSearchQuery('');
      alert('تم حفظ بيانات الخروج');
    };

    const cols = [
      { label: 'اسم الطالب', key: 'studentName' }, { label: 'الصف', key: 'grade' }, { label: 'الشعبة', key: 'section' },
      { label: 'عدد مرات الخروج', key: 'prevExitCount' }, { label: 'التاريخ', key: 'date' }, { label: 'حالة الخروج', key: 'status' },
      { label: 'نوع الإجراء', key: 'action' }, { label: 'ملاحظات أخرى', key: 'notes' }
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.exitLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button onClick={() => setShowTable(!showTable)} className="bg-blue-50 text-blue-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-blue-100 transition-all flex items-center gap-2 shadow-sm">
              {showTable ? <Plus size={18} /> : <LayoutList size={18} />}
              {showTable ? 'رصد خروج جديد' : 'جدول الخروج'}
            </button>
            {!showTable && (
              <button onClick={() => setShowFrequentNames(true)} className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2">
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button onClick={() => setActiveSubTab(null)} className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><X size={18} /></button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-blue-600 flex items-center gap-3">خروج طالب أثناء الدراسة <UserPlus size={24} /></h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" className="text-[10px] md:text-xs font-black bg-transparent outline-none" value={exitForm.date} onChange={e => setExitForm({ ...exitForm, date: e.target.value })} />
              <span className="text-[10px] font-bold text-slate-400">{getDayName(exitForm.date || today)}</span>
            </div>
          </div>
        </div>

        {!showTable ? (
          <div className="space-y-6">
            <div className="relative">
              <label className="text-xs font-black text-slate-400 mb-2 block mr-2">ابحث عن الطالب</label>
              <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-blue-500 shadow-sm transition-all">
                <Search size={20} className="text-slate-400" /><input type="text" className="bg-transparent w-full outline-none font-black text-base md:text-lg" placeholder="اكتب الاسم هنا..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-64 overflow-y-auto">
                  {suggestions.map(s => (
                    <button key={s.id} onClick={() => handleSelectStudent(s)} className="w-full text-right p-3 md:p-4 hover:bg-blue-50 font-black border-b last:border-none flex justify-between items-center transition-colors"><span className="text-xs md:text-sm">{s.name}</span> <span className="text-[9px] md:text-[10px] bg-slate-100 px-2 py-1 rounded-lg">{s.grade} - {s.section}</span></button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center"><label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">الصف</label><span className="font-black text-base md:text-lg text-slate-700">{exitForm.grade || '---'}</span></div>
              <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center"><label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">الشعبة</label><span className="font-black text-base md:text-lg text-slate-700">{exitForm.section || '---'}</span></div>
              <div className="bg-blue-600 text-white p-3 md:p-4 rounded-2xl shadow-lg text-center"><label className="text-[9px] md:text-[10px] block opacity-80 mb-1">مرات الخروج</label><span className="font-black text-xl md:text-2xl">{exitForm.prevExitCount ?? 0}</span></div>
              <div className="bg-white p-2 rounded-2xl border-2 shadow-sm flex flex-col justify-center text-center">
                <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">الفصل</label>
                <select className="bg-transparent font-black text-[10px] md:text-xs outline-none" value={exitForm.semester} onChange={e => setExitForm({ ...exitForm, semester: e.target.value as any })}>
                  <option value="الأول">الأول</option><option value="الثاني">الثاني</option><option value="الفصلين">الفصلين</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 mr-2">حالة الخروج</label><input className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-blue-400" value={exitForm.status} onChange={e => setExitForm({ ...exitForm, status: e.target.value })} placeholder="مثال: نادر الخروج" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 mr-2">الإجراء المتخذ</label><input className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-blue-400" value={exitForm.action} onChange={e => setExitForm({ ...exitForm, action: e.target.value })} placeholder="تنبيه 1" /></div>
            </div>
            <button onClick={saveLog} className="w-full bg-[#0f172a] text-white p-5 md:p-6 rounded-3xl font-black text-lg md:text-xl hover:bg-black shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all mt-4"><Save size={24} /> حفظ بيانات الخروج</button>
          </div>
        ) : (
          <div className="space-y-8">
            <FilterSection suggestions={nameSugg} values={filterValues} setValues={setFilterValues} tempNames={tempNames} setTempNames={setTempNames} appliedNames={appliedNames} setAppliedNames={setAppliedNames} nameInput={nameInput} setNameInput={setNameInput} onExportExcel={() => exportExcelFiltered('خروج_الطلاب', filtered, cols)} onExportTxt={() => exportTxtFiltered('خروج_الطلاب', filtered, cols)} onExportWA={() => shareWhatsAppRich('سجل خروج الطلاب المفلتر', filtered, cols)} />
            <div className="overflow-x-auto rounded-[1.5rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1000px]"><thead className="bg-[#FFD966] text-slate-800 font-black"><tr>{cols.map(c => <th key={c.key} className="p-3 md:p-5 border-e border-blue-200">{c.label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">{filtered.length === 0 ? <tr><td colSpan={cols.length} className="p-20 text-slate-300 italic text-base md:text-lg font-bold">لا توجد بيانات خروج.</td></tr> : filtered.map(l => <tr key={l.id} className="hover:bg-blue-50/30 transition-colors h-10 md:h-12"><td className="p-3 md:p-5 border-e border-slate-50 font-black">{l.studentName}</td><td className="p-3 md:p-5 border-e border-slate-50 font-bold">{l.grade}</td><td className="p-3 md:p-5 border-e border-slate-50">{l.section}</td><td className="p-3 md:p-5 border-e border-slate-50 text-blue-600 text-lg">{l.prevExitCount + 1}</td><td className="p-3 md:p-5 border-e border-slate-50 text-slate-400 text-[10px]">{l.date}</td><td className="p-3 md:p-5 border-e border-slate-50">{l.status}</td><td className="p-3 md:p-5 border-e border-slate-50">{l.action}</td><td className="p-3 md:p-5 text-slate-400 text-[10px]">{l.notes}</td></tr>)}</tbody></table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDamageModule = () => {
    const suggestions = (searchQuery.trim() && searchQuery !== damageForm.studentName) ? students.filter(s => s.name.includes(searchQuery)) : [];
    const nameSugg = nameInput.trim() ? students.filter(s => s.name.includes(nameInput) && !tempNames.includes(s.name)) : [];
    const filtered = (data.damageLogs || []).filter(l => {
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName)) return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester) return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section) return false;
      return true;
    });

    const handleSelectStudent = (s: StudentReport) => {
      setDamageForm({
        ...damageForm,
        studentId: s.id,
        studentName: s.name,
        grade: s.grade,
        section: s.section,
        prevDamageCount: (data.damageLogs || []).filter(l => l.studentId === s.id).length
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (!damageForm.studentId) return alert('يرجى اختيار طالب أولاً');
      const newLog: DamageLog = { ...damageForm as DamageLog, id: Date.now().toString(), day: getDayName(damageForm.date || today) };
      updateData({ damageLogs: [newLog, ...(data.damageLogs || [])] });
      setDamageForm({ ...damageForm, studentName: '', studentId: '', notes: '', description: '', participants: '', followUpStatus: 'قيد المتابعة', action: 'تنبيه' });
      setSearchQuery('');
      alert('تم حفظ بيانات الإتلاف');
    };

    const cols = [
      { label: 'اسم الطالب', key: 'studentName' }, { label: 'الصف', key: 'grade' }, { label: 'الشعبة', key: 'section' },
      { label: 'عدد الإتلافات', key: 'prevDamageCount' }, { label: 'التاريخ', key: 'date' }, { label: 'بيان الإتلاف', key: 'description' },
      { label: 'المشاركين', key: 'participants' }, { label: 'الإجراء', key: 'action' }, { label: 'حالة المتابعة', key: 'followUpStatus' }, { label: 'ملاحظات أخرى', key: 'notes' }
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.damageLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button onClick={() => setShowTable(!showTable)} className="bg-red-50 text-red-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-red-100 transition-all flex items-center gap-2 shadow-sm">
              {showTable ? <Plus size={18} /> : <LayoutList size={18} />}
              {showTable ? 'رصد إتلاف جديد' : 'جدول الإتلاف'}
            </button>
            {!showTable && (
              <button onClick={() => setShowFrequentNames(true)} className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2">
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button onClick={() => setActiveSubTab(null)} className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><X size={18} /></button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-red-600 flex items-center gap-3">سجل الإتلاف المدرسي <Hammer size={24} /></h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" className="text-[10px] md:text-xs font-black bg-transparent outline-none" value={damageForm.date} onChange={e => setDamageForm({ ...damageForm, date: e.target.value })} />
              <span className="text-[10px] font-bold text-slate-400">{getDayName(damageForm.date || today)}</span>
            </div>
          </div>
        </div>

        {!showTable ? (
          <div className="space-y-6">
            <div className="relative">
              <label className="text-xs font-black text-slate-400 mb-2 block mr-2">ابحث عن الطالب</label>
              <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-red-500 shadow-sm transition-all">
                <Search size={20} className="text-slate-400" /><input type="text" className="bg-transparent w-full outline-none font-black text-base md:text-lg" placeholder="اكتب الاسم هنا..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-64 overflow-y-auto">
                  {suggestions.map(s => (
                    <button key={s.id} onClick={() => handleSelectStudent(s)} className="w-full text-right p-3 md:p-4 hover:bg-red-50 font-black border-b last:border-none flex justify-between items-center transition-colors"><span className="text-xs md:text-sm">{s.name}</span> <span className="text-[9px] md:text-[10px] bg-slate-100 px-2 py-1 rounded-lg">{s.grade} - {s.section}</span></button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center"><label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">الصف</label><span className="font-black text-base md:text-lg text-slate-700">{damageForm.grade || '---'}</span></div>
              <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center"><label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">الشعبة</label><span className="font-black text-base md:text-lg text-slate-700">{damageForm.section || '---'}</span></div>
              <div className="bg-red-600 text-white p-3 md:p-4 rounded-2xl shadow-lg text-center"><label className="text-[9px] md:text-[10px] block opacity-80 mb-1">مرات الإتلاف</label><span className="font-black text-xl md:text-2xl">{damageForm.prevDamageCount ?? 0}</span></div>
              <div className="bg-white p-2 rounded-2xl border-2 shadow-sm flex flex-col justify-center text-center">
                <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">الفصل</label>
                <select className="bg-transparent font-black text-[10px] md:text-xs outline-none" value={damageForm.semester} onChange={e => setDamageForm({ ...damageForm, semester: e.target.value as any })}>
                  <option value="الأول">الأول</option><option value="الثاني">الثاني</option><option value="الفصلين">الفصلين</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 mr-2">بيان الإتلاف</label><input className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-red-400" value={damageForm.description} onChange={e => setDamageForm({ ...damageForm, description: e.target.value })} placeholder="ماذا تم إتلافه؟" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 mr-2">المشاركين معه في الإتلاف</label><input className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-red-400" value={damageForm.participants} onChange={e => setDamageForm({ ...damageForm, participants: e.target.value })} placeholder="أسماء المشاركين إن وجدوا..." /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 mr-2">الإجراء المتخذ</label><input className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-red-400" value={damageForm.action} onChange={e => setDamageForm({ ...damageForm, action: e.target.value })} placeholder="تنبيه" /></div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 mr-2">حالة المتابعة</label>
                <select className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-red-400" value={damageForm.followUpStatus} onChange={e => setDamageForm({ ...damageForm, followUpStatus: e.target.value })}>
                  <option value="قيد المتابعة">قيد المتابعة</option>
                  <option value="تم الإصلاح">تم الإصلاح</option>
                  <option value="تم شراء البديل">تم شراء البديل</option>
                  <option value="لم يتم الإصلاح">لم يتم الإصلاح</option>
                  <option value="لم يتم شراء البديل">لم يتم شراء البديل</option>
                </select>
              </div>
            </div>
            <button onClick={saveLog} className="w-full bg-[#0f172a] text-white p-5 md:p-6 rounded-3xl font-black text-lg md:text-xl hover:bg-black shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all mt-4"><Save size={24} /> حفظ بيانات الإتلاف</button>
          </div>
        ) : (
          <div className="space-y-8">
            <FilterSection suggestions={nameSugg} values={filterValues} setValues={setFilterValues} tempNames={tempNames} setTempNames={setTempNames} appliedNames={appliedNames} setAppliedNames={setAppliedNames} nameInput={nameInput} setNameInput={setNameInput} onExportExcel={() => exportExcelFiltered('إتلاف_المدرسة', filtered, cols)} onExportTxt={() => exportTxtFiltered('إتلاف_المدرسة', filtered, cols)} onExportWA={() => shareWhatsAppRich('سجل إتلاف المدرسة المفلتر', filtered, cols)} />
            <div className="overflow-x-auto rounded-[1.5rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1000px]"><thead className="bg-[#FFD966] text-slate-800 font-black"><tr>{cols.map(c => <th key={c.key} className="p-3 md:p-5 border-e border-red-200">{c.label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">{filtered.length === 0 ? <tr><td colSpan={cols.length} className="p-20 text-slate-300 italic text-base md:text-lg font-bold">لا توجد بيانات إتلاف.</td></tr> : filtered.map(l => <tr key={l.id} className="hover:bg-red-50/30 transition-colors h-10 md:h-12">
                  <td className="p-3 md:p-5 border-e border-slate-50 font-black">{l.studentName}</td>
                  <td className="p-3 md:p-5 border-e border-slate-50 font-bold">{l.grade}</td>
                  <td className="p-3 md:p-5 border-e border-slate-50">{l.section}</td>
                  <td className="p-3 md:p-5 border-e border-slate-50 text-red-600 text-lg">{l.prevDamageCount + 1}</td>
                  <td className="p-3 md:p-5 border-e border-slate-400 text-[10px]">{l.date}</td>
                  <td className="p-3 md:p-5 border-e border-slate-50 text-[11px]">{l.description}</td>
                  <td className="p-3 md:p-5 border-e border-slate-50 text-[10px] text-slate-500 italic">{l.participants || '---'}</td>
                  <td className="p-3 md:p-5 border-e border-slate-50 text-red-700">{l.action}</td>
                  <td className="p-3 md:p-5 border-e border-slate-50">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${l.followUpStatus?.includes('تم') ? 'bg-green-100 text-green-700' :
                      l.followUpStatus?.includes('قيد') ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {l.followUpStatus || 'قيد المتابعة'}
                    </span>
                  </td>
                  <td className="p-3 md:p-5 text-slate-400 text-[10px]">{l.notes}</td>
                </tr>)}</tbody></table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderParentVisitModule = () => {
    const suggestions = (searchQuery.trim() && searchQuery !== visitForm.studentName) ? students.filter(s => s.name.includes(searchQuery)) : [];
    const nameSugg = nameInput.trim() ? students.filter(s => s.name.includes(nameInput) && !tempNames.includes(s.name)) : [];
    const filtered = (data.parentVisitLogs || []).filter(l => {
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName)) return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester) return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section) return false;
      return true;
    });

    const handleSelectStudent = (s: StudentReport) => {
      setVisitForm({
        ...visitForm,
        studentId: s.id,
        studentName: s.name,
        grade: s.grade,
        section: s.section,
        prevVisitCount: (data.parentVisitLogs || []).filter(l => l.studentId === s.id).length
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (!visitForm.studentId) return alert('يرجى اختيار طالب أولاً');
      const newLog: ParentVisitLog = {
        ...visitForm as ParentVisitLog,
        id: Date.now().toString(),
        day: getDayName(visitForm.date || today)
      };
      updateData({ parentVisitLogs: [newLog, ...(data.parentVisitLogs || [])] });
      setVisitForm({ ...visitForm, studentName: '', studentId: '', visitorName: '', reason: '', actions: '', notes: '' });
      setSearchQuery('');
      alert('تم حفظ سجل التواصل/الزيارة');
    };

    const cols = [
      { label: 'اسم الطالب', key: 'studentName' }, { label: 'اسم الزائر', key: 'visitorName' }, { label: 'الصف', key: 'grade' },
      { label: 'الشعبة', key: 'section' }, { label: 'التاريخ', key: 'date' }, { label: 'نوع التواصل', key: 'type' },
      { label: 'السبب', key: 'reason' }, { label: 'الإجراءات', key: 'actions' }, { label: 'ملاحظات', key: 'notes' }
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.parentVisitLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button onClick={() => setShowTable(!showTable)} className="bg-indigo-50 text-indigo-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm">
              {showTable ? <Plus size={18} /> : <LayoutList size={18} />}
              {showTable ? 'رصد جديد' : 'جدول السجلات'}
            </button>
            {!showTable && (
              <button onClick={() => setShowFrequentNames(true)} className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2">
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button onClick={() => setActiveSubTab(null)} className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><X size={18} /></button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-indigo-600 flex items-center gap-3">سجل زيارات أولياء الأمور <UserPlus size={24} /></h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" className="text-[10px] md:text-xs font-black bg-transparent outline-none" value={visitForm.date} onChange={e => setVisitForm({ ...visitForm, date: e.target.value })} />
              <span className="text-[10px] font-bold text-slate-400">{getDayName(visitForm.date || today)}</span>
            </div>
          </div>
        </div>

        {!showTable ? (
          <div className="space-y-6 md:space-y-10">
            <div className="flex gap-4 p-2 bg-slate-100 rounded-3xl w-fit mx-auto shadow-inner border border-white">
              <button onClick={() => setVisitForm({ ...visitForm, type: 'visit' })} className={`flex items-center gap-2 px-6 md:px-8 py-2 md:py-3 rounded-2xl font-black text-[10px] md:text-sm transition-all ${visitForm.type === 'visit' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white'}`}>
                <Users size={16} /> زيارة ولي أمر
              </button>
              <button onClick={() => setVisitForm({ ...visitForm, type: 'communication' })} className={`flex items-center gap-2 px-6 md:px-8 py-2 md:py-3 rounded-2xl font-black text-[10px] md:text-sm transition-all ${visitForm.type === 'communication' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white'}`}>
                <Phone size={16} /> التواصل بولي الأمر
              </button>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <label className="text-xs font-black text-slate-400 mb-2 block mr-2">ابحث عن الطالب</label>
                <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-indigo-500 shadow-sm transition-all">
                  <Search size={20} className="text-slate-400" /><input type="text" className="bg-transparent w-full outline-none font-black text-base md:text-lg" placeholder="اكتب اسم الطالب هنا..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-64 overflow-y-auto">
                    {suggestions.map(s => (
                      <button key={s.id} onClick={() => handleSelectStudent(s)} className="w-full text-right p-3 md:p-4 hover:bg-indigo-50 font-black border-b last:border-none flex justify-between items-center transition-colors"><span className="text-xs md:text-sm">{s.name}</span> <span className="text-[9px] md:text-[10px] bg-slate-100 px-2 py-1 rounded-lg">{s.grade} - {s.section}</span></button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center"><label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">الصف</label><span className="font-black text-base md:text-lg text-slate-700">{visitForm.grade || '---'}</span></div>
                <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center"><label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">الشعبة</label><span className="font-black text-base md:text-lg text-slate-700">{visitForm.section || '---'}</span></div>
                <div className="bg-blue-600 text-white p-3 md:p-4 rounded-2xl shadow-lg text-center"><label className="text-[9px] md:text-[10px] block opacity-80 mb-1">مرات التواصل</label><span className="font-black text-xl md:text-2xl">{visitForm.prevVisitCount ?? 0}</span></div>
                <div className="bg-white p-2 rounded-2xl border-2 shadow-sm flex flex-col justify-center text-center">
                  <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">الفصل</label>
                  <select className="bg-transparent font-black text-[10px] md:text-xs outline-none" value={visitForm.semester} onChange={e => setVisitForm({ ...visitForm, semester: e.target.value as any })}>
                    <option value="الأول">الأول</option><option value="الثاني">الثاني</option><option value="الفصلين">الفصلين</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 mr-2">السبب</label><textarea className="w-full p-3 md:p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-indigo-400 min-h-[60px] md:min-h-[80px]" value={visitForm.reason} onChange={e => setVisitForm({ ...visitForm, reason: e.target.value })} placeholder="..." /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 mr-2">اسم الزائر/المتواصل</label><textarea className="w-full p-3 md:p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-indigo-400 min-h-[60px] md:min-h-[80px]" value={visitForm.visitorName} onChange={e => setVisitForm({ ...visitForm, visitorName: e.target.value })} placeholder="..." /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 mr-2">ملاحظات</label><textarea className="w-full p-3 md:p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-indigo-400 min-h-[60px] md:min-h-[80px]" value={visitForm.notes} onChange={e => setVisitForm({ ...visitForm, notes: e.target.value })} placeholder="..." /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 mr-2">الإجراءات</label><textarea className="w-full p-3 md:p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-indigo-400 min-h-[60px] md:min-h-[80px]" value={visitForm.actions} onChange={e => setVisitForm({ ...visitForm, actions: e.target.value })} placeholder="..." /></div>
              </div>

              <button onClick={saveLog} className="w-full bg-[#0f172a] text-white p-5 md:p-7 rounded-[2rem] md:rounded-[2.5rem] font-black text-xl md:text-2xl hover:bg-black shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] mt-4"><Save size={32} /> حفظ السجل</button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <FilterSection suggestions={nameSugg} values={filterValues} setValues={setFilterValues} tempNames={tempNames} setTempNames={setTempNames} appliedNames={appliedNames} setAppliedNames={setAppliedNames} nameInput={nameInput} setNameInput={setNameInput} onExportExcel={() => exportExcelFiltered('زيارات_أولياء_الأمور', filtered, cols)} onExportTxt={() => exportTxtFiltered('زيارات_أولياء_الأمور', filtered, cols)} onExportWA={() => shareWhatsAppRich('سجل زيارات وتواصل أولياء الأمور المفلتر', filtered, cols)} />
            <div className="overflow-x-auto rounded-[1.5rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1200px]"><thead className="bg-[#FFD966] text-slate-800 font-black"><tr>{cols.map(c => <th key={c.key} className="p-3 md:p-5 border-e border-indigo-200">{c.label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">{filtered.length === 0 ? <tr><td colSpan={cols.length} className="p-20 text-slate-300 italic text-base md:text-lg font-bold">لا توجد سجلات.</td></tr> : filtered.map(l => <tr key={l.id} className="hover:bg-indigo-50/30 transition-colors h-10 md:h-12"><td className="p-3 md:p-5 border-e border-slate-50 font-black">{l.studentName}</td><td className="p-3 md:p-5 border-e border-slate-50 font-bold">{l.visitorName}</td><td className="p-3 md:p-5 border-e border-slate-50 font-bold">{l.grade}</td><td className="p-3 md:p-5 border-e border-slate-50 font-bold">{l.section}</td><td className="p-3 md:p-5 border-e border-slate-400 text-[10px]">{l.date}</td><td className="p-3 md:p-5 border-e border-slate-50 font-black">{l.type === 'visit' ? 'زيارة' : 'تواصل'}</td><td className="p-3 md:p-5 border-e border-slate-50 text-[10px]">{l.reason}</td><td className="p-3 md:p-5 border-e border-slate-50 text-[10px]">{l.actions}</td><td className="p-3 md:p-5 text-slate-400 text-[10px]">{l.notes}</td></tr>)}</tbody></table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const PreviousRecordModal = ({
    isOpen,
    onClose,
    title,
    type,
    studentId,
    studentName,
    onSelect
  }: {
    isOpen: boolean,
    onClose: () => void,
    title: string,
    type: 'absence' | 'lateness' | 'violation',
    studentId?: string,
    studentName?: string,
    onSelect: (record: any) => void
  }) => {
    if (!isOpen) return null;

    const filteredRecords = (
      type === 'absence' ? data.absenceLogs :
        type === 'lateness' ? data.studentLatenessLogs :
          data.studentViolationLogs
    ) || [];

    const studentRecords = studentId
      ? filteredRecords.filter((r: any) => r.studentId === studentId)
      : filteredRecords;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-xl md:text-2xl font-black flex items-center gap-3">
                <History className="text-orange-500" /> {title}
              </h3>
              {studentName && <p className="text-orange-400 font-bold text-sm mt-1">للطالب: {studentName}</p>}
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 text-right">
            {studentRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                <Search size={64} className="opacity-20" />
                <p className="font-black text-lg text-right">لا توجد سجلات سابقة متاحة.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {[...studentRecords].reverse().map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onSelect(r);
                      onClose();
                    }}
                    className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border-2 border-slate-50 bg-slate-50 hover:border-orange-500 hover:bg-orange-50/30 transition-all text-right group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-base md:text-lg">{r.date}</span>
                        <span className="px-2 py-0.5 rounded-lg bg-white border text-[10px] font-black text-slate-400">{r.semester}</span>
                      </div>
                      <p className="text-slate-500 font-bold text-xs md:text-sm line-clamp-1 text-right">{r.reason || r.action || (r.behaviorViolations && r.behaviorViolations.join('، ')) || 'بدون تفاصيل'}</p>
                    </div>
                    <div className="mt-3 md:mt-0 flex items-center gap-4">
                      <div className="text-left hidden md:block">
                        <p className="text-[10px] font-black text-slate-400">انقر للتعديل أو العرض</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-300 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t flex justify-end shrink-0">
            <button onClick={onClose} className="px-8 py-3 rounded-xl bg-white border-2 font-black text-slate-600 hover:bg-slate-100 transition-all">إغلاق النافذة</button>
          </div>
        </div>
      </div>
    );
  };

  const [customViolation, setCustomViolation] = useState<{ cat: string, item: string }>({ cat: '', item: '' });

  const addCustomViolation = (cat: string) => {
    if (!customViolation.item.trim()) return;
    const current = data.customViolationElements || {};
    const catItems = current[cat as keyof typeof current] || [];
    if (catItems.includes(customViolation.item.trim())) return alert('هذا العنصر موجود بالفعل');

    updateData({
      customViolationElements: {
        ...current,
        [cat]: [...catItems, customViolation.item.trim()]
      }
    });

    // Also toggle it in the form automatically
    const field = cat === 'behavior' ? 'behaviorViolations' : cat === 'duties' ? 'dutiesViolations' : 'achievementViolations';
    const currentSelected = (violationForm as any)[field] || [];
    setViolationForm({ ...violationForm, [field]: [...currentSelected, customViolation.item.trim()] });

    setCustomViolation({ cat: '', item: '' });
  };

  const renderSubModuleContent = () => {
    switch (activeSubTab) {
      case 'الغياب اليومي': return renderAbsenceModule();
      case 'التأخر': return renderLatenessModule();
      case 'المخالفات الطلابية': return renderViolationModule();
      case 'خروج طالب أثناء الدراسة': return renderExitModule();
      case 'سجل الإتلاف المدرسي': return renderDamageModule();
      case 'سجل زيارة أولياء الأمور والتواصل بهم': return renderParentVisitModule();
      case 'الاختبار الشهري':
      case 'الاختبار الفصلي': return renderExamModule();
      default:
        return (
          <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border shadow-2xl relative overflow-hidden font-arabic text-right">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl md:text-2xl font-black text-slate-800">{activeSubTab}</h3>
              <button onClick={() => setActiveSubTab(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X /></button>
            </div>
            <div className="space-y-4">
              <p className="text-slate-500 font-bold text-sm md:text-base">هذا السجل ({activeSubTab}) قيد التطوير البرمجي ليكون متكاملاً مع باقي أقسام البرنامج.</p>
              <div className="bg-slate-50 p-10 md:p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Database size={64} />
                <span className="font-black text-base md:text-lg text-center">قاعدة بيانات قيد التجهيز</span>
              </div>
            </div>
          </div>
        );
    }
  };

  const renderCurrentModule = () => {
    return (
      <>
        {renderSubModuleContent()}

        <PreviousRecordModal
          isOpen={showPreviousAbsence}
          onClose={() => setShowPreviousAbsence(false)}
          title="سجل غياب سابق"
          type="absence"
          studentId={absenceForm.studentId}
          studentName={absenceForm.studentName}
          onSelect={(r) => setAbsenceForm({ ...r })}
        />

        <PreviousRecordModal
          isOpen={showPreviousLateness}
          onClose={() => setShowPreviousLateness(false)}
          title="سجل تأخر سابق"
          type="lateness"
          studentId={latenessForm.studentId}
          studentName={latenessForm.studentName}
          onSelect={(r) => setLatenessForm({ ...r })}
        />

        <PreviousRecordModal
          isOpen={showPreviousViolation}
          onClose={() => setShowPreviousViolation(false)}
          title="سجل مخالفة سابقة"
          type="violation"
          studentId={violationForm.studentId}
          studentName={violationForm.studentName}
          onSelect={(r) => setViolationForm({ ...r })}
        />

        {customViolation.cat && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-8 space-y-6">
              <h3 className="text-xl font-black text-slate-800">إضافة مخالفة مخصصة</h3>
              <input
                autoFocus
                className="w-full p-4 border-2 rounded-2xl outline-none font-black text-lg focus:border-red-500 shadow-inner bg-slate-50"
                placeholder="اكتب المخالفة هنا..."
                value={customViolation.item}
                onChange={e => setCustomViolation({ ...customViolation, item: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addCustomViolation(customViolation.cat)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => addCustomViolation(customViolation.cat)}
                  className="flex-1 bg-red-600 text-white p-4 rounded-xl font-black shadow-lg hover:bg-red-700 transition-all active:scale-95"
                >
                  إضافة
                </button>
                <button
                  onClick={() => setCustomViolation({ cat: '', item: '' })}
                  className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-black hover:bg-slate-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const handleSubTabClick = (item: string) => {
    setActiveSubTab(item);
    setShowTable(false);
    setShowPresenceTracker(false); // Ensure tracker is off when switching
    onSubTabOpen?.(item);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 font-arabic pb-20 text-right">
      {!activeSubTab ? (
        <>
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                <Sparkles className="text-blue-600 animate-pulse" />
                التقارير الخاصة والمتقدمة
              </h2>
              <p className="text-slate-500 font-bold mt-1 text-sm md:text-base">إدارة شاملة لجميع السجلات الإدارية والتربوية</p>
            </div>
          </header>
          <div className="flex flex-wrap gap-2 md:gap-4 justify-center md:justify-start">
            {Object.entries(structure).map(([key, cat]) => (
              <button key={key} onClick={() => setActiveTab(key as MainTab)} className={`flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-black text-sm md:text-lg transition-all shadow-sm ${activeTab === key ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-white text-slate-600 border border-slate-100 hover:bg-blue-50'}`}>
                {React.cloneElement(cat.icon as React.ReactElement<any>, { size: 20 })} {cat.title}
              </button>
            ))}
          </div>
          <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {structure[activeTab].items.map((item, idx) => (
                <button key={idx} onClick={() => handleSubTabClick(item)} className="group flex items-center justify-between p-4 md:p-6 rounded-[1.2rem] md:rounded-[1.5rem] bg-slate-50 border-2 border-slate-50 hover:border-blue-500 hover:bg-white transition-all text-right shadow-sm hover:shadow-xl">
                  <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                    <div className="w-8 md:w-10 h-8 md:h-10 rounded-xl bg-white flex-shrink-0 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      <FileText size={16} />
                    </div>
                    <span className="font-black text-slate-700 group-hover:text-blue-600 transition-colors text-[10px] md:text-xs truncate">{item}</span>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" size={18} />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : renderCurrentModule()}
    </div>
  );
};

export default SpecialReportsPage;
