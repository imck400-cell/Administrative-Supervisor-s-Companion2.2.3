
import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { useGlobal } from '../context/GlobalState';
import { 
  Plus, Search, Trash2, Filter, ChevronDown, Check, Calendar, Percent, User, Users, Target, Settings2, AlertCircle, X, ChevronRight, Zap, CheckCircle, FilePlus, FolderOpen, Save, ListOrdered, ArrowUpDown, ArrowUp, ArrowDown, SortAsc, Book, School, Type, Sparkles, FilterIcon, BarChart3, LayoutList, Upload, Download, Phone, UserCircle, Activity, Star, FileText, FileSpreadsheet, Share2, Edit, ChevronLeft, UserCheck, GraduationCap, MessageCircle
} from 'lucide-react';
import { TeacherFollowUp, DailyReportContainer, StudentReport } from '../types';
import DynamicTable from '../components/DynamicTable';
import * as XLSX from 'xlsx';

// Adding local types for TeacherFollowUpPage sorting and filtering
type FilterMode = 'all' | 'student' | 'percent' | 'metric' | 'grade' | 'section' | 'specific' | 'blacklist' | 'excellence' | 'date';
type SortCriteria = 'manual' | 'name' | 'subject' | 'class';
type SortDirection = 'asc' | 'desc';

// --- Teachers Follow-up Page (DailyReportsPage) ---
export const DailyReportsPage: React.FC = () => {
  const { lang, data, updateData } = useGlobal();
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [showMetricPicker, setShowMetricPicker] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ criteria: SortCriteria, direction: SortDirection }>({ criteria: 'manual', direction: 'asc' });
  const [violationModal, setViolationModal] = useState<{ id: string, notes: string[] } | null>(null);
  const [activeTeacherFilter, setActiveTeacherFilter] = useState<string>('');

  const reports = data.dailyReports || [];
  
  // Set active report on load if not set
  useEffect(() => {
    if (!activeReportId && reports.length > 0) {
      setActiveReportId(reports[reports.length - 1].id);
    }
  }, [reports, activeReportId]);

  const currentReport = reports.find(r => r.id === activeReportId);
  
  // Subjects Ordering
  const subjectOrder = ["القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الاجتماعيات", "الحاسوب", "المكتبة", "الفنية", "المختص الاجتماعي", "الأنشطة", "غيرها"];
  
  const teachers = useMemo(() => {
    let list = currentReport ? [...currentReport.teachersData] : [];
    
    // Filtering
    if (filterMode === 'student' && activeTeacherFilter) {
      list = list.filter(t => t.teacherName.includes(activeTeacherFilter));
    }

    // Sorting
    list.sort((a, b) => {
      let res = 0;
      if (sortConfig.criteria === 'name') {
        res = a.teacherName.localeCompare(b.teacherName);
      } else if (sortConfig.criteria === 'subject') {
        const idxA = subjectOrder.indexOf(a.subjectCode);
        const idxB = subjectOrder.indexOf(b.subjectCode);
        if (idxA !== -1 && idxB !== -1) res = idxA - idxB;
        else if (idxA !== -1) res = -1;
        else if (idxB !== -1) res = 1;
        else res = a.subjectCode.localeCompare(b.subjectCode);
      } else if (sortConfig.criteria === 'class') {
        res = a.className.localeCompare(b.className);
      } else if (sortConfig.criteria === 'manual') {
        res = (a.order || 0) - (b.order || 0);
      }
      return sortConfig.direction === 'asc' ? res : -res;
    });

    return list;
  }, [currentReport, sortConfig, filterMode, activeTeacherFilter]);

  const metricsConfig = [
    { key: 'attendance', label: 'الحضور', max: data.maxGrades.attendance || 5 },
    { key: 'appearance', label: 'المظهر', max: data.maxGrades.appearance || 5 },
    { key: 'preparation', label: 'التحضير', max: data.maxGrades.preparation || 10 },
    { key: 'supervision_queue', label: 'طابور', max: data.maxGrades.supervision_queue || 5 },
    { key: 'supervision_rest', label: 'راحة', max: data.maxGrades.supervision_rest || 5 },
    { key: 'supervision_end', label: 'نهاية', max: data.maxGrades.supervision_end || 5 },
    { key: 'correction_books', label: 'كتب', max: data.maxGrades.correction_books || 10 },
    { key: 'correction_notebooks', label: 'دفاتر', max: data.maxGrades.correction_notebooks || 10 },
    { key: 'correction_followup', label: 'متابعة تصحيح', max: data.maxGrades.correction_followup || 10 },
    { key: 'teaching_aids', label: 'وسائل تعليمية', max: data.maxGrades.teaching_aids || 10 },
    { key: 'extra_activities', label: 'أنشطة لا صفية', max: data.maxGrades.extra_activities || 10 },
    { key: 'radio', label: 'إذاعة', max: data.maxGrades.radio || 5 },
    { key: 'creativity', label: 'إبداع', max: data.maxGrades.creativity || 5 },
    { key: 'zero_period', label: 'حصة صفرية', max: data.maxGrades.zero_period || 5 },
  ];

  const subjects = ["القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الاجتماعيات", "الحاسوب", "المكتبة", "الفنية", "المختص الاجتماعي", "الأنشطة", "غيرها"];
  const grades = ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const violationTypes = ["تأخر عن طابور", "تأخر عن حصة", "خروج من الحصة", "الإفراط في العقاب", "رفض القرارات الإدارية", "عدم تسليم ما كلف به"];

  const displayedMetrics = filterMode === 'metric' && selectedMetrics.length > 0 
    ? metricsConfig.filter(m => selectedMetrics.includes(m.key))
    : metricsConfig;

  const getMetricColor = (key: string) => {
    if (key === 'attendance' || key === 'appearance') return 'bg-[#E2EFDA]';
    if (key === 'preparation') return 'bg-white';
    if (key.startsWith('supervision')) return 'bg-[#FCE4D6]';
    return 'bg-[#DDEBF7]';
  };

  const handleCreateReport = () => {
    const lastReport = reports[reports.length - 1];
    const newTeachers = lastReport ? lastReport.teachersData.map(t => ({ 
      ...t, 
      attendance: 0, appearance: 0, preparation: 0, supervision_queue: 0, supervision_rest: 0, supervision_end: 0, 
      correction_books: 0, correction_notebooks: 0, correction_followup: 0, teaching_aids: 0, extra_activities: 0, 
      radio: 0, creativity: 0, zero_period: 0, violations_score: 0, violations_notes: [] 
    })) : [];
    
    const newReport: DailyReportContainer = {
      id: Date.now().toString(),
      dayName: new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date()),
      dateStr: new Date().toISOString().split('T')[0],
      teachersData: newTeachers as any
    };
    updateData({ dailyReports: [...reports, newReport] });
    setActiveReportId(newReport.id);
  };

  const addNewTeacher = () => {
    if (!activeReportId) return;
    const newTeacher: TeacherFollowUp = {
        id: Date.now().toString(), teacherName: '', subjectCode: '', className: '',
        attendance: 0, appearance: 0, preparation: 0, supervision_queue: 0, supervision_rest: 0, supervision_end: 0,
        correction_books: 0, correction_notebooks: 0, correction_followup: 0, teaching_aids: 0, extra_activities: 0,
        radio: 0, creativity: 0, zero_period: 0, violations_score: 0, violations_notes: [], order: teachers.length + 1
    };
    
    const updatedReports = reports.map(r => r.id === activeReportId ? { ...r, teachersData: [...r.teachersData, newTeacher] } : r);
    updateData({ dailyReports: updatedReports });
  };

  const updateTeacher = (teacherId: string, field: string, value: any) => {
    if (!activeReportId) return;
    const updatedReports = reports.map(r => {
      if (r.id === activeReportId) {
        return {
          ...r,
          teachersData: r.teachersData.map(t => t.id === teacherId ? { ...t, [field]: value } : t)
        };
      }
      return r;
    });
    updateData({ dailyReports: updatedReports });
  };

  const fillAllMax = () => {
    if (!activeReportId) return;
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من تعبئة جميع الدرجات بالحد الأقصى؟' : 'Fill all max?')) return;
    const updatedReports = reports.map(r => {
      if (r.id === activeReportId) {
        return {
          ...r,
          teachersData: r.teachersData.map(t => {
            const filled: any = { ...t };
            metricsConfig.forEach(m => filled[m.key] = m.max);
            return filled;
          })
        };
      }
      return r;
    });
    updateData({ dailyReports: updatedReports });
  };

  const fillMetricColumn = (metricKey: string, val?: number) => {
    if (!activeReportId) return;
    const max = metricsConfig.find(m => m.key === metricKey)?.max || 0;
    const valueToFill = val !== undefined ? val : max;
    
    const updatedReports = reports.map(r => {
        if (r.id === activeReportId) {
            return {
                ...r,
                teachersData: r.teachersData.map(t => ({ ...t, [metricKey]: valueToFill }))
            };
        }
        return r;
    });
    updateData({ dailyReports: updatedReports });
  };

  const calculateTotal = (t: TeacherFollowUp) => {
    let sum = metricsConfig.reduce((acc, m) => acc + (Number((t as any)[m.key]) || 0), 0);
    return Math.max(0, sum - (t.violations_score || 0));
  };

  const totalMaxScore = metricsConfig.reduce((acc, m) => acc + m.max, 0);

  const handleKeyDown = (e: React.KeyboardEvent, teacherIdx: number, metricKey: string) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const nextTeacher = teachers[teacherIdx + 1];
        if (nextTeacher) {
            const nextInput = document.getElementById(`input-${nextTeacher.id}-${metricKey}`);
            if (nextInput) nextInput.focus();
        }
    }
  };

  const getColSum = (key: string) => teachers.reduce((acc, t) => acc + (Number((t as any)[key]) || 0), 0);
  const getColPercent = (key: string, max: number) => {
    const sum = getColSum(key);
    return teachers.length ? ((sum / (teachers.length * max)) * 100).toFixed(1) : '0';
  };

  return (
    <div className="space-y-4 font-arabic">
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border shadow-sm">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
          <button onClick={handleCreateReport} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all text-xs active:scale-95"><FilePlus size={16}/> جديد</button>
          <button onClick={() => setShowArchive(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs active:scale-95"><FolderOpen size={16}/> فتح</button>
          <button onClick={addNewTeacher} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-purple-50 text-purple-700 px-4 py-2.5 rounded-xl font-bold border border-purple-200 hover:bg-purple-100 transition-all text-xs active:scale-95"><UserCircle size={16}/> معلم</button>
        </div>
        
        <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
          <div className="relative">
            <button onClick={() => setFilterMode(prev => prev === 'all' ? 'metric' : 'all')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold border transition-all text-xs ${filterMode === 'metric' ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <Filter size={16}/> {filterMode === 'metric' ? 'مخصص' : 'الكل'}
            </button>
            {filterMode === 'metric' && (
                <button onClick={() => setShowMetricPicker(true)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-[10px]"><Settings2 size={10}/></button>
            )}
          </div>
          
          <button onClick={() => setShowSortModal(true)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-white active:scale-90"><ListOrdered size={18}/></button>
          {currentReport && (
             <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-xl border border-blue-100">
                <Calendar size={16}/>
                <span className="text-[10px] font-black">{currentReport.dateStr}</span>
             </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className={`w-full text-center border-collapse ${filterMode === 'metric' ? '' : 'min-w-[1400px]'}`}>
            <thead>
              <tr className="border-b border-slate-300">
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-10 sticky right-0 bg-[#FFD966] z-20">م</th>
                <th rowSpan={2} className={`p-2 border-e border-slate-300 sticky right-10 bg-[#FFD966] z-20 ${filterMode === 'metric' ? 'w-40' : 'w-48'}`}>اسم المعلم</th>
                {!filterMode.includes('metric') && (
                    <>
                        <th rowSpan={2} className="p-2 border-e border-slate-300 w-28 bg-[#FFD966]">المادة</th>
                        <th rowSpan={2} className="p-2 border-e border-slate-300 w-24 bg-[#FFD966]">الصف</th>
                    </>
                )}
                <th colSpan={displayedMetrics.length} className="p-2 border-b border-slate-300 font-black text-sm bg-[#FFD966]">
                    <div className="flex items-center justify-center gap-2">
                        <span>التقييم</span>
                        <button onClick={fillAllMax} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1 text-[9px] flex items-center gap-1 active:scale-95 transition-all">
                           <Sparkles size={10} /> تعبئة الكل
                        </button>
                    </div>
                </th>
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-24 bg-[#C6E0B4]">المخالفات</th>
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-20 bg-[#C6E0B4]">المجموع</th>
                <th rowSpan={2} className="p-2 w-20 bg-[#FFD966]">النسبة</th>
              </tr>
              <tr className="text-[10px]">
                {displayedMetrics.map(m => (
                  <th key={m.key} className={`p-1 border-e border-slate-300 min-w-[70px] align-bottom ${getMetricColor(m.key)}`}>
                    <div className="flex flex-col items-center justify-end gap-1 pb-1 h-full w-full">
                        <div className="vertical-text font-bold text-slate-800 h-20 mb-auto text-[11px]">{m.label}</div>
                        <div className="bg-white border border-slate-300 rounded text-center text-[10px] font-bold py-0.5 shadow-sm w-full">{m.max}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                  <tr><td colSpan={20} className="p-8 text-slate-400">لا توجد بيانات.. أضف معلمين أو أنشئ جدولاً جديداً</td></tr>
              ) : teachers.map((t, idx) => {
                const total = calculateTotal(t);
                const percent = totalMaxScore > 0 ? ((total / totalMaxScore) * 100).toFixed(1) : '0';
                return (
                  <tr key={t.id} className="border-b hover:bg-slate-50 transition-colors h-10">
                    <td className="p-1 border-e sticky right-0 bg-white group-hover:bg-slate-50 font-bold text-xs">{idx + 1}</td>
                    <td className="p-1 border-e sticky right-10 bg-white group-hover:bg-slate-50">
                        <input className="w-full text-right font-bold outline-none bg-transparent text-xs" value={t.teacherName} onChange={e => updateTeacher(t.id, 'teacherName', e.target.value)} placeholder="اسم المعلم.." />
                    </td>
                    {!filterMode.includes('metric') && (
                        <>
                            <td className="p-1 border-e">
                            <select className="w-full bg-transparent outline-none text-[10px] text-center" value={t.subjectCode} onChange={e => updateTeacher(t.id, 'subjectCode', e.target.value)}>
                                <option value="">اختر..</option>
                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            </td>
                            <td className="p-1 border-e">
                            <select className="w-full bg-transparent outline-none text-[10px] text-center" value={t.className} onChange={e => updateTeacher(t.id, 'className', e.target.value)}>
                                <option value="">اختر..</option>
                                {grades.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            </td>
                        </>
                    )}
                    {displayedMetrics.map(m => (
                      <td key={m.key} className="p-1 border-e">
                        <input 
                            id={`input-${t.id}-${m.key}`}
                            type="number" 
                            className="w-full text-center outline-none bg-transparent font-bold text-xs focus:bg-blue-50 focus:ring-1 focus:ring-blue-200 rounded" 
                            value={(t as any)[m.key]} 
                            onChange={e => {
                                const val = Math.min(m.max, Math.max(0, parseInt(e.target.value) || 0));
                                updateTeacher(t.id, m.key, val);
                            }} 
                            onKeyDown={(e) => handleKeyDown(e, idx, m.key)}
                            onFocus={(e) => e.target.select()}
                        />
                      </td>
                    ))}
                    <td 
                        className="p-1 border-e cursor-pointer hover:bg-red-50 transition-colors relative group"
                        onClick={() => setViolationModal({ id: t.id, notes: t.violations_notes })}
                    >
                      <div className="flex items-center justify-center gap-1">
                          <input 
                             type="number" 
                             className="w-full text-center text-red-600 font-bold outline-none bg-transparent text-xs" 
                             value={t.violations_score} 
                             onChange={e => updateTeacher(t.id, 'violations_score', parseInt(e.target.value) || 0)} 
                             onClick={(e) => e.stopPropagation()}
                             onFocus={(e) => e.target.select()}
                          />
                          {t.violations_notes.length > 0 && <div className="w-2 h-2 rounded-full bg-red-600 absolute top-1 right-1"></div>}
                      </div>
                    </td>
                    <td className="p-1 border-e font-black text-blue-600 text-xs">{total}</td>
                    <td className="p-1 font-black text-slate-800 text-xs">{percent}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archive Modal */}
      {showArchive && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-black mb-4 text-right">أرشيف التقارير</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {reports.map(r => (
                <button key={r.id} onClick={() => { setActiveReportId(r.id); setShowArchive(false); }} className={`w-full flex justify-between p-4 rounded-xl font-bold border transition-all ${activeReportId === r.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 hover:bg-slate-100 border-slate-100'}`}>
                  <span>{r.dateStr}</span>
                  <span>{r.dayName}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowArchive(false)} className="w-full mt-4 p-3 bg-slate-100 rounded-xl font-bold hover:bg-slate-200 active:scale-95">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ViolationsPage: React.FC = () => {
  const { lang, data, updateData } = useGlobal();
  const [activeMode, setActiveMode] = useState<'students' | 'teachers'>('students');
  
  // Filtering states
  const today = new Date().toISOString().split('T')[0];
  const [filterValues, setFilterValues] = useState({ start: today, end: today });
  const [appliedNames, setAppliedNames] = useState<string[]>([]);
  const [tempNames, setTempNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const studentList = data.studentReports || [];
  
  const teacherProfiles = useMemo(() => {
    const profiles: Record<string, { subject: string; class: string }> = {};
    [...data.dailyReports].reverse().forEach(r => {
      r.teachersData.forEach(t => {
        if (t.teacherName && !profiles[t.teacherName]) {
          profiles[t.teacherName] = { subject: t.subjectCode, class: t.className };
        }
      });
    });
    return profiles;
  }, [data.dailyReports]);

  const teacherList = useMemo(() => Object.keys(teacherProfiles), [teacherProfiles]);

  const violationOptions = [
    "تأخر عن الدوام", "تأخر عن الحصة", "عقاب بدني عنيف", "استخدام العصا بطريقة غير تربوية", 
    "تأخير تسليم ما كلف به", "عدم تصحيح", "رفض التغطية", "رفض الاجتماع", "رفض الإشراف", 
    "رفض الإذاعة", "رفض التكليف", "غيرها"
  ];

  const handleAddRow = () => {
    const newViolation = {
      id: Date.now().toString(),
      type: activeMode,
      studentName: '',
      teacherName: '',
      class: '',
      grade: '',
      section: '',
      subject: '',
      date: new Date().toISOString().split('T')[0],
      day: new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date()),
      violation: '',
      prevViolations: 0,
      procedure: '',
      signature: ''
    };
    updateData({ violations: [...data.violations, newViolation] });
  };

  const updateViolation = (id: string, field: string, value: any) => {
    const updated = data.violations.map(v => v.id === id ? { ...v, [field]: value } : v);
    updateData({ violations: updated });
  };

  const filteredData = useMemo(() => {
    return data.violations.filter(v => {
      if (v.type !== activeMode) return false;
      if (appliedNames.length > 0) {
        const name = activeMode === 'students' ? v.studentName : v.teacherName;
        if (!appliedNames.includes(name)) return false;
      }
      if (v.date < filterValues.start || v.date > filterValues.end) return false;
      return true;
    });
  }, [data.violations, activeMode, appliedNames, filterValues]);

  const nameSuggestions = useMemo(() => {
    if (!nameInput.trim()) return [];
    const source = activeMode === 'students' ? studentList.map(s => s.name) : teacherList;
    return source.filter(n => n.includes(nameInput) && !tempNames.includes(n)).slice(0, 5);
  }, [nameInput, activeMode, studentList, teacherList, tempNames]);

  return (
    <div className="space-y-6 font-arabic text-right animate-in fade-in duration-500 pb-20 px-1 sm:px-0">
      <div className="bg-white p-4 sm:p-6 rounded-3xl sm:rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
        <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
          <button 
            onClick={() => setActiveMode('students')} 
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 rounded-2xl font-black text-[10px] sm:text-sm transition-all shadow-md active:scale-95 ${activeMode === 'students' ? 'bg-blue-600 text-white scale-105' : 'bg-slate-50 text-slate-500 hover:bg-blue-50'}`}
          >
            <GraduationCap size={18} /> طلاب
          </button>
          <button 
            onClick={() => setActiveMode('teachers')} 
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 rounded-2xl font-black text-[10px] sm:text-sm transition-all shadow-md active:scale-95 ${activeMode === 'teachers' ? 'bg-emerald-600 text-white scale-105' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50'}`}
          >
            <UserCheck size={18} /> معلمون
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
           <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border">
              <button onClick={() => {}} className="p-2.5 bg-white text-green-700 rounded-xl hover:bg-green-50 active:scale-90"><FileSpreadsheet size={18}/></button>
              <button onClick={() => {}} className="p-2.5 bg-white text-green-500 rounded-xl hover:bg-green-50 active:scale-90"><MessageCircle size={18}/></button>
           </div>
           <button 
             onClick={() => setShowFilter(!showFilter)}
             className={`p-3 rounded-2xl border font-black active:scale-90 ${showFilter ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
           >
             <Filter size={20} />
           </button>
           <button onClick={handleAddRow} className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg active:scale-95 transition-all">
             <Plus size={20}/> إضافة
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm border-collapse min-w-[800px]">
            <thead className="bg-[#FFD966] text-slate-800 font-black">
              <tr>
                <th className="p-4 border-e border-slate-300 w-12">م</th>
                <th className="p-4 border-e border-slate-300 w-64 text-right">الاسم</th>
                <th className="p-4 border-e border-slate-300">المخالفة</th>
                <th className="p-4 border-e border-slate-300 w-32 text-center">التاريخ</th>
                <th className="p-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-slate-400 italic font-bold">لا توجد تعهدات مسجلة.</td>
                </tr>
              ) : (
                filteredData.map((v, idx) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors font-bold group h-12">
                    <td className="p-2 border-e border-slate-100 bg-slate-50/50">{idx + 1}</td>
                    <td className="p-2 border-e border-slate-100 text-right text-xs sm:text-sm">{activeMode === 'students' ? v.studentName : v.teacherName}</td>
                    <td className="p-2 border-e border-slate-100 text-xs sm:text-sm">{v.violation}</td>
                    <td className="p-2 border-e border-slate-100 text-[10px] sm:text-xs">{v.date}</td>
                    <td className="p-2">
                      <button onClick={() => updateData({ violations: data.violations.filter(x => x.id !== v.id) })} className="text-red-300 hover:text-red-600 active:scale-90">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StudentRow = memo(({ s, optionsAr, lang, updateStudent, setShowNotesModal, toggleStar, activeRowId, setActiveRowId }: any) => {
  const isHighlighted = activeRowId === s.id;
  return (
    <tr 
      onClick={() => setActiveRowId(activeRowId === s.id ? null : s.id)}
      className={`transition-colors h-12 group cursor-pointer ${isHighlighted ? 'bg-orange-100' : 'hover:bg-blue-50/20'}`}
    >
      <td className={`p-1 border-e border-slate-300 sticky right-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${isHighlighted ? 'bg-orange-100' : 'bg-white'}`}>
        <div className="flex items-center gap-1 h-full pr-2">
          <button onClick={(e) => { e.stopPropagation(); toggleStar(s.id, 'isExcellent'); }}><Star className={`w-4 h-4 ${s.isExcellent ? 'fill-green-500 text-green-500' : 'text-slate-200'}`} /></button>
          <button onClick={(e) => { e.stopPropagation(); toggleStar(s.id, 'isBlacklisted'); }}><Star className={`w-4 h-4 ${s.isBlacklisted ? 'fill-slate-900 text-slate-900' : 'text-slate-200'}`} /></button>
          <input className="flex-1 bg-transparent border-none outline-none font-black text-xs text-right pr-2" value={s.name} onChange={(e) => updateStudent(s.id, 'name', e.target.value)} onClick={(e) => e.stopPropagation()} onFocus={() => setActiveRowId(s.id)} />
        </div>
      </td>
      <td className="p-1 border-e border-slate-300"><input className="w-full text-center bg-transparent border-none outline-none text-xs font-bold" value={s.grade} onChange={(e) => updateStudent(s.id, 'grade', e.target.value)} onClick={(e) => e.stopPropagation()} onFocus={() => setActiveRowId(s.id)} /></td>
      <td className="p-1 border-e border-slate-300"><input className="w-full text-center bg-transparent border-none outline-none text-xs font-bold" value={s.section} onChange={(e) => updateStudent(s.id, 'section', e.target.value)} onClick={(e) => e.stopPropagation()} onFocus={() => setActiveRowId(s.id)} /></td>
      <td className="p-1 border-e border-slate-300"><select className="bg-transparent font-bold text-xs outline-none w-full text-center" value={s.gender} onChange={(e) => updateStudent(s.id, 'gender', e.target.value)} onClick={(e) => e.stopPropagation()} onFocus={() => setActiveRowId(s.id)}>{optionsAr.gender.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300 font-bold text-[10px] text-slate-700">{s.address}</td>
      <td className="p-1 border-e border-slate-300"><select className={`text-xs font-bold text-center outline-none bg-transparent w-full ${s.healthStatus === 'مريض' ? 'text-red-600' : ''}`} value={s.healthStatus} onChange={(e) => updateStudent(s.id, 'healthStatus', e.target.value)} onClick={(e) => e.stopPropagation()} onFocus={() => setActiveRowId(s.id)}>{optionsAr.health.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300 text-[10px] font-black text-slate-700">{s.guardianName}</td>
      <td className="p-1 border-e border-slate-300 bg-[#FFF2CC]/10"><select className="text-[10px] w-full text-center outline-none bg-transparent" value={s.academicReading} onChange={(e) => updateStudent(s.id, 'academicReading', e.target.value)} onClick={(e) => e.stopPropagation()} onFocus={() => setActiveRowId(s.id)}>{optionsAr.level.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300 bg-[#FFF2CC]/10"><select className="text-[10px] w-full text-center outline-none bg-transparent" value={s.academicWriting} onChange={(e) => updateStudent(s.id, 'academicWriting', e.target.value)} onClick={(e) => e.stopPropagation()} onFocus={() => setActiveRowId(s.id)}>{optionsAr.level.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300"><select className="text-xs font-bold w-full text-center outline-none bg-transparent" value={s.behaviorLevel} onChange={(e) => updateStudent(s.id, 'behaviorLevel', e.target.value)} onClick={(e) => e.stopPropagation()} onFocus={() => setActiveRowId(s.id)}>{optionsAr.behavior.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300"><div className="flex flex-wrap gap-0.5 justify-center">{s.mainNotes.map((n: any) => <span key={n} className="text-[8px] px-1 bg-red-50 text-red-600 rounded border border-red-100">{n}</span>)}</div></td>
      <td className="p-1 border-e border-slate-300 bg-[#DDEBF7]/10"><select className="text-[9px] w-full text-center outline-none bg-transparent" value={s.guardianFollowUp} onChange={(e) => updateStudent(s.id, 'guardianFollowUp', e.target.value)} onClick={(e) => e.stopPropagation()} onFocus={() => setActiveRowId(s.id)}>{optionsAr.followUp.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1"><button onClick={(e) => { e.stopPropagation(); setShowNotesModal({id: s.id, text: s.notes}); }} className="p-1.5 hover:bg-blue-100 rounded-lg transition-all active:scale-90">{s.notes ? <CheckCircle size={14} className="text-green-500" /> : <Edit size={14} className="text-slate-300" />}</button></td>
    </tr>
  );
});

export const StudentsReportsPage: React.FC = () => {
  const { data, updateData, lang } = useGlobal();
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState<{id: string; text: string} | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  
  const studentData = data.studentReports || [];
  const updateStudent = (id: string, field: string, value: any) => { const updated = studentData.map(s => s.id === id ? { ...s, [field]: value } : s); updateData({ studentReports: updated }); };
  const toggleStar = (id: string, field: 'isExcellent' | 'isBlacklisted') => { const student = studentData.find(s => s.id === id); if (student) updateStudent(id, field, !student[field]); };
  
  const optionsAr = { 
    gender: ["ذكر", "أنثى"], workOutside: ["لا يعمل", "يعمل"], health: ["ممتاز", "مريض"], level: ["ممتاز", "متوسط", "جيد", "ضعيف", "ضعيف جداً"], behavior: ["ممتاز", "متوسط", "جيد", "جيد جدا", "مقبول", "ضعيف", "ضعيف جدا"], 
    mainNotes: ["ممتاز", "كثير الكلام", "كثير الشغب", "عدواني", "تطاول على معلم", "اعتداء على طالب جسدياً", "اعتداء على طالب لفظيا", "أخذ أدوات الغير دون أذنهم", "إتلاف ممتلكات طالب", "إتلاف ممتلكات المدرسة"], 
    eduStatus: ["متعلم", "ضعيف", "أمي"], followUp: ["ممتازة", "متوسطة", "ضعيفة"], cooperation: ["ممتازة", "متوسطة", "ضعيفة", "متذمر", "كثير النقد", "عدواني"], grades: ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], sections: ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"] 
  };

  const filteredData = useMemo(() => {
    if (filterMode === 'blacklist') return studentData.filter(s => s.isBlacklisted);
    if (filterMode === 'excellence') return studentData.filter(s => s.isExcellent);
    return studentData;
  }, [studentData, filterMode]);

  return (
    <div className="space-y-6 font-arabic animate-in fade-in duration-500">
       <div className="bg-[#F8FAFC] p-4 sm:p-6 rounded-3xl sm:rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                  <button onClick={() => {}} className="flex-1 sm:flex-none bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={18}/> طالب</button>
                  <button onClick={() => {}} className="flex-1 sm:flex-none bg-[#006E4E] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><FileText size={18}/> تقرير</button>
                  <button onClick={() => {}} className="flex-1 sm:flex-none bg-[#FAF5FF] text-[#6B46C1] border-2 border-[#E9D8FD] px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black text-[10px] sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"><Sparkles size={18}/> تلقائي</button>
              </div>
              <div className="flex items-center gap-2 bg-white border rounded-full p-1.5 shadow-sm w-full sm:w-auto justify-center">
                  <button className="p-2.5 text-green-500 hover:bg-green-50 rounded-full active:scale-90"><Share2 size={20}/></button>
                  <button className="p-2.5 text-green-700 hover:bg-green-50 rounded-full active:scale-90"><FileSpreadsheet size={20}/></button>
              </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 pt-2 justify-center sm:justify-start border-t border-slate-200 sm:border-0 pt-4 sm:pt-0">
              <button onClick={() => setFilterMode('excellence')} className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black text-[10px] sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${filterMode === 'excellence' ? 'bg-[#22C55E] text-white shadow-lg scale-105' : 'bg-[#E7F9EE] text-[#166534] border border-[#BBF7D0]'}`}><Star size={16} fill={filterMode === 'excellence' ? 'currentColor' : 'none'}/> تميز</button>
              <button onClick={() => setFilterMode('blacklist')} className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black text-[10px] sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${filterMode === 'blacklist' ? 'bg-[#1E293B] text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}><AlertCircle size={16}/> سوداء</button>
              <button onClick={() => setFilterMode('all')} className="bg-[#F1F5F9] text-slate-600 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black text-[10px] sm:text-sm flex items-center gap-2 active:scale-95 transition-all"><Filter size={16}/> الكل</button>
          </div>
       </div>

       <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden relative max-h-[70vh] flex flex-col">
        <div className="overflow-x-auto scroll-smooth h-full">
          <table className="w-full text-center border-collapse table-auto min-w-[1500px] sm:min-w-[1700px]">
            <thead className="bg-[#FFD966] text-slate-800 sticky top-0 z-20 shadow-md">
              <tr className="border-b border-slate-400 h-14">
                <th rowSpan={2} className="px-4 border-e border-slate-400 w-[200px] text-sm font-black sticky right-0 bg-[#FFD966] z-40">اسم الطالب</th>
                <th rowSpan={2} className="px-1 border-e border-slate-400 w-24 text-xs font-black sticky top-0 bg-[#FFD966]">الصف</th>
                <th rowSpan={2} className="px-1 border-e border-slate-400 w-20 text-xs font-black sticky top-0 bg-[#FFD966]">الشعبة</th>
                <th rowSpan={2} className="px-1 border-e border-slate-400 w-20 text-xs font-black sticky top-0 bg-[#FFD966]">النوع</th>
                <th rowSpan={2} className="px-2 border-e border-slate-400 w-32 text-xs font-black sticky top-0 bg-[#FFD966]">السكن / العمل</th>
                <th rowSpan={2} className="px-2 border-e border-slate-400 w-28 text-xs font-black sticky top-0 bg-[#FFD966]">الحالة الصحية</th>
                <th rowSpan={2} className="px-2 border-e border-slate-400 w-44 text-xs font-black sticky top-0 bg-[#FFD966]">ولي الأمر</th>
                <th colSpan={2} className="px-1 border-e border-slate-400 bg-[#FFF2CC]/50 text-[10px] font-black sticky top-0">المستوى العلمي</th>
                <th rowSpan={2} className="px-2 border-e border-slate-400 w-28 text-[10px] font-black sticky top-0 bg-[#FFD966]">المستوى السلوكي</th>
                <th rowSpan={2} className="px-2 border-e border-slate-400 w-48 text-[10px] font-black sticky top-0 bg-[#FFD966]">الملاحظات الأساسية</th>
                <th rowSpan={2} className="px-1 border-e border-slate-400 bg-[#DDEBF7]/50 text-[10px] font-black w-32 sticky top-0">ولي الأمر المتابع</th>
                <th rowSpan={2} className="px-2 w-14 text-[10px] font-black sticky top-0 bg-[#FFD966]">ملاحظات</th>
              </tr>
              <tr className="bg-[#F8F9FA] text-[9px] h-8">
                <th className="border-e border-slate-300 font-bold sticky top-14 bg-[#FFF2CC]/50">قراءة</th>
                <th className="border-e border-slate-400 font-bold sticky top-14 bg-[#FFF2CC]/50">كتابة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredData.map((s) => (
                <StudentRow key={s.id} s={s} optionsAr={optionsAr} lang={lang} updateStudent={updateStudent} setShowNotesModal={setShowNotesModal} toggleStar={toggleStar} activeRowId={activeRowId} setActiveRowId={setActiveRowId} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};