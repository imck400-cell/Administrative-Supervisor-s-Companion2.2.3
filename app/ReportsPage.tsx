import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { useGlobal } from '../context/GlobalState';
import { 
  Plus, Search, Trash2, Filter, ChevronDown, Check, Calendar, Percent, User, Users, Target, Settings2, AlertCircle, X, ChevronRight, Zap, CheckCircle, FilePlus, FolderOpen, Save, ListOrdered, ArrowUpDown, ArrowUp, ArrowDown, SortAsc, Book, School, Type, Sparkles, FilterIcon, BarChart3, LayoutList, Upload, Download, Phone, UserCircle, Activity, Star, FileText, FileSpreadsheet, Share2, Edit, ChevronLeft, UserCheck, GraduationCap, MessageCircle
} from 'lucide-react';
import { TeacherFollowUp, DailyReportContainer, StudentReport, ExamLog } from '../types';
import DynamicTable from '../components/DynamicTable';
import * as XLSX from 'xlsx';

// Types for sorting and filtering
type FilterMode = 'all' | 'student' | 'percent' | 'metric' | 'grade' | 'section' | 'specific' | 'blacklist' | 'excellence' | 'date';
type SortCriteria = 'manual' | 'name' | 'subject' | 'class';
type SortDirection = 'asc' | 'desc';

// --- 1. Teachers Follow-up Page (DailyReportsPage) ---
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
  
  const [activeTeacherRowId, setActiveTeacherRowId] = useState<string | null>(null);
  const [showTeacherWaSelector, setShowTeacherWaSelector] = useState<{ type: 'bulk' | 'single', teacher?: TeacherFollowUp } | null>(null);
  const [teacherWaSelectedFields, setTeacherWaSelectedFields] = useState<string[]>(['all']);

  const reports = data.dailyReports || [];
  
  useEffect(() => {
    if (!activeReportId && reports.length > 0) {
      setActiveReportId(reports[reports.length - 1].id);
    }
  }, [reports, activeReportId]);

  const currentReport = reports.find(r => r.id === activeReportId);
  const subjectOrder = ["القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الاجتماعيات", "الحاسوب", "المكتبة", "الفنية", "المختص الاجتماعي", "الأنشطة", "غيرها"];
  
  const teachers = useMemo(() => {
    let list = currentReport ? [...currentReport.teachersData] : [];
    if (filterMode === 'student' && activeTeacherFilter) {
      list = list.filter(t => t.teacherName.includes(activeTeacherFilter));
    }
    list.sort((a, b) => {
      let res = 0;
      if (sortConfig.criteria === 'name') res = a.teacherName.localeCompare(b.teacherName);
      else if (sortConfig.criteria === 'subject') {
        const idxA = subjectOrder.indexOf(a.subjectCode), idxB = subjectOrder.indexOf(b.subjectCode);
        res = (idxA !== -1 && idxB !== -1) ? idxA - idxB : a.subjectCode.localeCompare(b.subjectCode);
      } else if (sortConfig.criteria === 'class') res = a.className.localeCompare(b.className);
      else if (sortConfig.criteria === 'manual') res = (a.order || 0) - (b.order || 0);
      return sortConfig.direction === 'asc' ? res : -res;
    });
    return list;
  }, [currentReport, sortConfig, filterMode, activeTeacherFilter]);

  const metricsConfig = [
    { key: 'attendance', label: 'الحضور اليومي', max: data.maxGrades.attendance || 5 },
    { key: 'appearance', label: 'المظهر الشخصي', max: data.maxGrades.appearance || 5 },
    { key: 'preparation', label: 'اكتمال التحضير', max: data.maxGrades.preparation || 10 },
    { key: 'supervision_queue', label: 'إشراف الطابور', max: data.maxGrades.supervision_queue || 5 },
    { key: 'supervision_rest', label: 'إشراف الراحة', max: data.maxGrades.supervision_rest || 5 },
    { key: 'supervision_end', label: 'إشراف نهاية الدوام', max: data.maxGrades.supervision_end || 5 },
    { key: 'correction_books', label: 'تصحيح الكتب', max: data.maxGrades.correction_books || 10 },
    { key: 'correction_notebooks', label: 'تصحيح الدفاتر', max: data.maxGrades.correction_notebooks || 10 },
    { key: 'correction_followup', label: 'تصحيح المتابعة', max: data.maxGrades.correction_followup || 10 },
    { key: 'teaching_aids', label: 'توفر وسيلة تعلمية', max: data.maxGrades.teaching_aids || 10 },
    { key: 'extra_activities', label: 'أنشطة لا صفية', max: data.maxGrades.extra_activities || 10 },
    { key: 'radio', label: 'إقامة إذاعة', max: data.maxGrades.radio || 5 },
    { key: 'creativity', label: 'إبداع', max: data.maxGrades.creativity || 5 },
    { key: 'zero_period', label: 'إقامة حصة صفرية', max: data.maxGrades.zero_period || 5 },
  ];

  const subjects = ["القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الاجتماعيات", "الحاسوب", "المكتبة", "الفنية", "المختص الاجتماعي", "الأنشطة", "غيرها"];
  const grades = ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const genderOptions = ["ذكر", "أنثى"];
  const violationTypes = ["تأخر عن طابور", "تأخر عن حصة", "خروج من الحصة", "الإفراط في العقاب", "رفض القرارات الإدارية", "عدم تسليم ما كلف به"];

  const displayedMetrics = filterMode === 'metric' && selectedMetrics.length > 0 ? metricsConfig.filter(m => selectedMetrics.includes(m.key)) : metricsConfig;
  const getMetricColor = (key: string) => {
    if (key === 'attendance' || key === 'appearance') return 'bg-[#E2EFDA]';
    if (key === 'preparation') return 'bg-white';
    if (key.startsWith('supervision')) return 'bg-[#FCE4D6]';
    return 'bg-[#DDEBF7]';
  };

  const updateTeacher = (teacherId: string, field: string, value: any) => {
    if (!activeReportId) return;
    const updatedReports = reports.map(r => r.id === activeReportId ? { ...r, teachersData: r.teachersData.map(t => t.id === teacherId ? { ...t, [field]: value } : t) } : r);
    updateData({ dailyReports: updatedReports });
    setActiveTeacherRowId(teacherId);
  };

  const calculateTotal = (t: TeacherFollowUp) => {
    let sum = metricsConfig.reduce((acc, m) => acc + (Number((t as any)[m.key]) || 0), 0);
    return Math.max(0, sum - (t.violations_score || 0));
  };
  const totalMaxScore = metricsConfig.reduce((acc, m) => acc + m.max, 0);

  return (
    <div className="space-y-4 font-arabic">
      {/* Teacher Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => {}} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all text-xs sm:text-sm"><FilePlus size={16}/> إضافة جدول جديد</button>
          <button onClick={() => setShowArchive(true)} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs sm:text-sm"><FolderOpen size={16}/> فتح تقرير</button>
          <button onClick={() => {}} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-bold border border-purple-200 hover:bg-purple-100 transition-all text-xs sm:text-sm"><UserCircle size={16}/> إضافة معلم</button>
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 ml-2">
            <button className="p-2 hover:bg-white text-slate-600 rounded-lg transition-all" title="تصدير TXT"><FileText size={16}/></button>
            <button className="p-2 hover:bg-white text-green-600 rounded-lg transition-all" title="تصدير Excel"><FileSpreadsheet size={16}/></button>
            <button className="p-2 hover:bg-white text-green-500 rounded-lg transition-all" title="إرسال واتساب"><MessageCircle size={16}/></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilterMode(prev => prev === 'all' ? 'metric' : 'all')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold border transition-all text-xs sm:text-sm ${filterMode === 'metric' ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}><Filter size={16}/> {filterMode === 'metric' ? 'عرض مخصص' : 'عرض الجميع'}</button>
          <button onClick={() => setShowSortModal(true)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-white"><ListOrdered size={18}/></button>
          {currentReport && <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-xl border border-blue-100 font-bold text-xs"><Calendar size={14}/> {currentReport.dateStr}</div>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden relative max-h-[70vh] flex flex-col">
        <div className="overflow-auto scroll-smooth h-full">
          <table className={`w-full text-center border-collapse ${filterMode === 'metric' ? '' : 'min-w-[1500px]'}`}>
            <thead className="sticky top-0 z-30 shadow-sm bg-[#FFD966]">
              <tr className="border-b border-slate-300">
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-10 sticky right-0 bg-[#FFD966] z-40">م</th>
                <th rowSpan={2} className={`p-2 border-e border-slate-300 sticky right-10 bg-[#FFD966] z-40 ${filterMode === 'metric' ? 'w-40' : 'w-48'}`}>اسم المعلم</th>
                {!filterMode.includes('metric') && (
                    <><th rowSpan={2} className="p-2 border-e border-slate-300 w-28 bg-[#FFD966]">المادة</th><th rowSpan={2} className="p-2 border-e border-slate-300 w-24 bg-[#FFD966]">الصف</th><th rowSpan={2} className="p-2 border-e border-slate-300 w-24 bg-[#FFD966]">النوع</th></>
                )}
                <th colSpan={displayedMetrics.length} className="p-2 border-b border-slate-300 font-black text-sm bg-[#FFD966]">مجالات تقييم المعلمين</th>
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-24 bg-[#C6E0B4]">المخالفات</th>
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-20 bg-[#C6E0B4]">المجموع</th>
                <th rowSpan={2} className="p-2 w-20 bg-[#FFD966]">النسبة</th>
              </tr>
              <tr className="text-[10px]">
                {displayedMetrics.map(m => <th key={m.key} className={`p-1 border-e border-slate-300 min-w-[70px] ${getMetricColor(m.key)}`}>{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, idx) => {
                const isHighlighted = activeTeacherRowId === t.id;
                return (
                  <tr key={t.id} onClick={() => setActiveTeacherRowId(t.id)} className={`border-b transition-colors h-10 cursor-pointer ${isHighlighted ? 'bg-orange-100' : 'hover:bg-slate-50'}`}>
                    <td className={`p-1 border-e sticky right-0 z-10 font-bold text-xs ${isHighlighted ? 'bg-orange-100' : 'bg-white'}`}>{idx + 1}</td>
                    <td className={`p-1 border-e sticky right-10 z-10 ${isHighlighted ? 'bg-orange-100' : 'bg-white'}`}><input className="w-full text-right font-bold outline-none bg-transparent text-xs" value={t.teacherName} onChange={e => updateTeacher(t.id, 'teacherName', e.target.value)} onClick={(e) => e.stopPropagation()} /></td>
                    {!filterMode.includes('metric') && (
                        <><td className="p-1 border-e"><select className="w-full bg-transparent outline-none text-[10px]" value={t.subjectCode} onChange={e => updateTeacher(t.id, 'subjectCode', e.target.value)} onClick={(e) => e.stopPropagation()}><option value="">اختر..</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                          <td className="p-1 border-e"><select className="w-full bg-transparent outline-none text-[10px]" value={t.className} onChange={e => updateTeacher(t.id, 'className', e.target.value)} onClick={(e) => e.stopPropagation()}><option value="">اختر..</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}</select></td>
                          <td className="p-1 border-e"><select className="w-full bg-transparent outline-none text-[10px]" value={t.gender} onChange={e => updateTeacher(t.id, 'gender', e.target.value)} onClick={(e) => e.stopPropagation()}>{genderOptions.map(g => <option key={g} value={g}>{g}</option>)}</select></td></>
                    )}
                    {displayedMetrics.map(m => (
                      <td key={m.key} className="p-1 border-e"><input type="number" className="w-full text-center outline-none bg-transparent font-bold text-xs" value={(t as any)[m.key]} onChange={e => { const val = Math.min(m.max, Math.max(0, parseInt(e.target.value) || 0)); updateTeacher(t.id, m.key, val); }} onClick={(e) => e.stopPropagation()}/></td>
                    ))}
                    <td className="p-1 border-e cursor-pointer relative group" onClick={(e) => { e.stopPropagation(); setViolationModal({ id: t.id, notes: t.violations_notes }); setActiveTeacherRowId(t.id); }}>
                      <div className="flex items-center justify-center relative h-full w-full">
                        <AlertCircle size={10} className="absolute top-1 right-1 text-red-400 group-hover:text-red-600 opacity-60" />
                        <span className="text-red-600 font-bold text-xs">{t.violations_score}</span>
                      </div>
                    </td>
                    <td className="p-1 border-e font-black text-blue-600 text-xs">{calculateTotal(t)}</td>
                    <td className="p-1 font-black text-slate-800 text-xs">{totalMaxScore > 0 ? ((calculateTotal(t)/totalMaxScore)*100).toFixed(1) : 0}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showArchive && <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-6 w-full max-w-md">...</div></div>}
    </div>
  );
};

// --- 2. Students Reports Page (StudentsReportsPage) ---
const StudentRow = memo(({ s, optionsAr, optionsEn, lang, updateStudent, setShowNotesModal, toggleStar, activeRowId, setActiveRowId }: any) => {
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
          <input className="flex-1 bg-transparent border-none outline-none font-black text-xs text-right pr-2" value={s.name} onChange={(e) => updateStudent(s.id, 'name', e.target.value)} onClick={(e) => e.stopPropagation()} />
        </div>
      </td>
      <td className="p-1 border-e border-slate-300"><select className="bg-transparent font-bold text-xs outline-none w-full text-center" value={s.grade} onChange={(e) => updateStudent(s.id, 'grade', e.target.value)} onClick={(e) => e.stopPropagation()}>{optionsAr.grades.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300"><select className="bg-transparent font-bold text-xs outline-none w-full text-center" value={s.section} onChange={(e) => updateStudent(s.id, 'section', e.target.value)} onClick={(e) => e.stopPropagation()}>{optionsAr.sections.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300"><select className="bg-transparent font-bold text-xs outline-none w-full text-center" value={s.gender} onChange={(e) => updateStudent(s.id, 'gender', e.target.value)} onClick={(e) => e.stopPropagation()}>{optionsAr.gender.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300"><div className="flex flex-col gap-0.5"><input className="w-full text-[10px] text-right bg-transparent outline-none px-1" value={s.address} onChange={(e) => updateStudent(s.id, 'address', e.target.value)} onClick={(e) => e.stopPropagation()} /><select className="text-[9px] bg-slate-50/50 text-center" value={s.workOutside} onChange={(e) => updateStudent(s.id, 'workOutside', e.target.value)} onClick={(e) => e.stopPropagation()}>{optionsAr.workOutside.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></div></td>
      <td className="p-1 border-e border-slate-300"><select className={`text-xs font-bold text-center outline-none bg-transparent w-full ${s.healthStatus === 'مريض' ? 'text-red-600' : ''}`} value={s.healthStatus} onChange={(e) => updateStudent(s.id, 'healthStatus', e.target.value)} onClick={(e) => e.stopPropagation()}>{optionsAr.health.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300"><div className="flex flex-col gap-0.5"><input className="text-[10px] font-black text-right outline-none bg-transparent" value={s.guardianName} onChange={(e) => updateStudent(s.id, 'guardianName', e.target.value)} onClick={(e) => e.stopPropagation()} /><input className="text-[9px] w-full text-center bg-slate-50/50 outline-none" value={s.guardianPhones[0]} onChange={(e) => { const newP = [...s.guardianPhones]; newP[0] = e.target.value; updateStudent(s.id, 'guardianPhones', newP); }} onClick={(e) => e.stopPropagation()} /></div></td>
      <td className="p-1 border-e border-slate-300 bg-[#FFF2CC]/10"><select className="text-[10px] w-full text-center outline-none bg-transparent" value={s.academicReading} onChange={(e) => updateStudent(s.id, 'academicReading', e.target.value)} onClick={(e) => e.stopPropagation()}>{optionsAr.level.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300 bg-[#FFF2CC]/10"><select className="text-[10px] w-full text-center outline-none bg-transparent" value={s.academicWriting} onChange={(e) => updateStudent(s.id, 'academicWriting', e.target.value)} onClick={(e) => e.stopPropagation()}>{optionsAr.level.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300"><select className="text-xs font-bold w-full text-center outline-none bg-transparent" value={s.behaviorLevel} onChange={(e) => updateStudent(s.id, 'behaviorLevel', e.target.value)} onClick={(e) => e.stopPropagation()}>{optionsAr.behavior.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1 border-e border-slate-300"><div className="flex flex-wrap gap-0.5 justify-center">{s.mainNotes.map((n: any) => <span key={n} className="text-[8px] px-1 bg-red-50 text-red-600 rounded border border-red-100">{n}</span>)}</div></td>
      <td className="p-1 border-e border-slate-300 bg-[#DDEBF7]/10"><select className="text-[9px] w-full text-center outline-none bg-transparent" value={s.guardianFollowUp} onChange={(e) => updateStudent(s.id, 'guardianFollowUp', e.target.value)} onClick={(e) => e.stopPropagation()}>{optionsAr.followUp.map((o: any) => <option key={o} value={o}>{o}</option>)}</select></td>
      <td className="p-1"><button onClick={(e) => { e.stopPropagation(); setShowNotesModal({id: s.id, text: s.notes}); }} className="p-1.5 hover:bg-blue-100 rounded-lg transition-all">{s.notes ? <CheckCircle size={14} className="text-green-500" /> : <Edit size={14} className="text-slate-300" />}</button></td>
    </tr>
  );
});

export const StudentsReportsPage: React.FC = () => {
  const { data, updateData, lang } = useGlobal();
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState<{id: string, text: string} | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  
  const studentData = data.studentReports || [];
  const updateStudent = (id: string, field: string, value: any) => { const updated = studentData.map(s => s.id === id ? { ...s, [field]: value } : s); updateData({ studentReports: updated }); };
  const toggleStar = (id: string, field: 'isExcellent' | 'isBlacklisted') => { const student = studentData.find(s => s.id === id); if (student) updateStudent(id, field, !student[field]); };
  
  const optionsAr = { 
    gender: ["ذكر", "أنثى"], 
    workOutside: ["لا يعمل", "يعمل"], 
    health: ["ممتاز", "مريض"], 
    level: ["ممتاز", "متوسط", "جيد", "ضعيف", "ضعيف جداً"], 
    behavior: ["ممتاز", "متوسط", "جيد", "جيد جدا", "مقبول", "ضعيف", "ضعيف جدا"], 
    mainNotes: ["ممتاز", "كثير الكلام", "كثير الشغب", "عدواني", "تطاول على معلم", "اعتداء على طالب جسدياً", "اعتداء على طالب لفظيا", "أخذ أدوات الغير دون أذنهم", "إتلاف ممتلكات طالب", "إتلاف ممتلكات المدرسة"], 
    eduStatus: ["متعلم", "ضعيف", "أمي"], 
    followUp: ["ممتازة", "متوسطة", "ضعيفة"], 
    cooperation: ["ممتازة", "متوسطة", "ضعيفة", "متذمر", "كثير النقد", "عدواني"], 
    grades: ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], 
    sections: ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"] 
  };

  const filteredData = useMemo(() => {
    if (filterMode === 'blacklist') return studentData.filter(s => s.isBlacklisted);
    if (filterMode === 'excellence') return studentData.filter(s => s.isExcellent);
    return studentData;
  }, [studentData, filterMode]);

  return (
    <div className="space-y-6 font-arabic animate-in fade-in duration-500">
       {/* UI MATCHING SCREENSHOT */}
       <div className="bg-[#F8FAFC] p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                  <button onClick={() => {}} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 shadow-lg hover:bg-blue-700 active:scale-95 transition-all"><Plus size={18}/> إضافة طالب</button>
                  <button onClick={() => {}} className="bg-[#006E4E] text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 shadow-lg hover:opacity-90 active:scale-95 transition-all"><FileText size={18}/> تقرير طالب</button>
                  <button onClick={() => {}} className="bg-[#E6FFFA] text-[#2C7A7B] border-2 border-[#B2F5EA] px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-[#B2F5EA] active:scale-95 transition-all"><Upload size={18}/> استيراد ملف</button>
                  <button onClick={() => {}} className="bg-[#FAF5FF] text-[#6B46C1] border-2 border-[#E9D8FD] px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-[#E9D8FD] active:scale-95 transition-all"><Sparkles size={18}/> التعبئة التلقائية</button>
              </div>
              <div className="flex items-center gap-2 bg-white border rounded-[2rem] p-1.5 shadow-sm">
                  <button className="p-2.5 text-green-500 hover:bg-green-50 rounded-full transition-all"><Share2 size={20}/></button>
                  <button className="p-2.5 text-green-700 hover:bg-green-50 rounded-full transition-all"><FileSpreadsheet size={20}/></button>
                  <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-full transition-all"><FileText size={20}/></button>
              </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={() => setFilterMode('excellence')} className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 transition-all ${filterMode === 'excellence' ? 'bg-[#22C55E] text-white shadow-lg scale-105' : 'bg-[#E7F9EE] text-[#166534] border border-[#BBF7D0]'}`}><Star size={18} fill={filterMode === 'excellence' ? 'currentColor' : 'none'}/> قائمة التميز</button>
              <button onClick={() => setFilterMode('blacklist')} className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 transition-all ${filterMode === 'blacklist' ? 'bg-[#1E293B] text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}><AlertCircle size={18}/> القائمة السوداء</button>
              <button onClick={() => setFilterMode('all')} className="bg-[#F1F5F9] text-slate-600 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-slate-200 transition-all"><Filter size={18}/> فلترة متقدمة</button>
          </div>
       </div>

       {/* TABLE MATCHING SCREENSHOT HEADERS */}
       <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden relative max-h-[70vh] flex flex-col">
        <div className="overflow-auto scroll-smooth h-full">
          <table className="w-full text-center border-collapse table-auto min-w-[1700px]">
            <thead className="bg-[#FFD966] text-slate-800 sticky top-0 z-20 shadow-md">
              <tr className="border-b border-slate-400 h-14">
                <th rowSpan={2} className="px-4 border-e border-slate-400 w-[200px] text-sm font-black sticky right-0 bg-[#FFD966] z-40">اسم الطالب</th>
                <th rowSpan={2} className="px-1 border-e border-slate-400 w-24 text-xs font-black">الصف</th>
                <th rowSpan={2} className="px-1 border-e border-slate-400 w-20 text-xs font-black">الشعبة</th>
                <th rowSpan={2} className="px-1 border-e border-slate-400 w-20 text-xs font-black">النوع</th>
                <th rowSpan={2} className="px-2 border-e border-slate-400 w-32 text-xs font-black">السكن / العمل</th>
                <th rowSpan={2} className="px-2 border-e border-slate-400 w-28 text-xs font-black">الحالة الصحية</th>
                <th rowSpan={2} className="px-2 border-e border-slate-400 w-44 text-xs font-black">ولي الأمر (الاسم/الهواتف)</th>
                <th colSpan={2} className="px-1 border-e border-slate-400 bg-[#FFF2CC]/50 text-[10px] font-black">المستوى العلمي</th>
                <th rowSpan={2} className="px-2 border-e border-slate-400 w-28 text-[10px] font-black">المستوى السلوكي</th>
                <th rowSpan={2} className="px-2 border-e border-slate-400 w-48 text-[10px] font-black">الملاحظات الأساسية</th>
                <th rowSpan={2} className="px-1 border-e border-slate-400 bg-[#DDEBF7]/50 text-[10px] font-black w-32">ولي الأمر المتابع</th>
                <th rowSpan={2} className="px-2 w-14 text-[10px] font-black">ملاحظات</th>
              </tr>
              <tr className="bg-[#F8F9FA] text-[9px] h-8">
                <th className="border-e border-slate-300 font-bold">قراءة</th>
                <th className="border-e border-slate-400 font-bold">كتابة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((s) => (
                <StudentRow key={s.id} s={s} optionsAr={optionsAr} optionsEn={{}} lang={lang} updateStudent={updateStudent} setShowNotesModal={setShowNotesModal} toggleStar={toggleStar} activeRowId={activeRowId} setActiveRowId={setActiveRowId} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- 3. Violations Page (Undertakings) ---
export const ViolationsPage: React.FC = () => {
  const { data, updateData } = useGlobal();
  const [activeMode, setActiveMode] = useState<'students' | 'teachers'>('students');
  const today = new Date().toISOString().split('T')[0];
  const [filterValues, setFilterValues] = useState({ start: today, end: today });
  
  const filteredData = useMemo(() => {
    return (data.violations || []).filter(v => v.type === activeMode);
  }, [data.violations, activeMode]);

  return (
    <div className="space-y-6 font-arabic text-right pb-20">
      <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex gap-4">
          <button onClick={() => setActiveMode('students')} className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-md ${activeMode === 'students' ? 'bg-blue-600 text-white scale-105' : 'bg-slate-50 text-slate-500 hover:bg-blue-50'}`}><GraduationCap size={20} /> تعهدات الطلاب</button>
          <button onClick={() => setActiveMode('teachers')} className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-md ${activeMode === 'teachers' ? 'bg-emerald-600 text-white scale-105' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50'}`}><UserCheck size={20} /> تعهدات المعلمين</button>
        </div>
        <button onClick={() => {}} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg active:scale-95 transition-all"><Plus size={20}/> إضافة تعهد</button>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm border-collapse min-w-[1200px]">
            <thead className="bg-[#FFD966] text-slate-800 font-black">
              <tr><th className="p-4 border-e border-slate-300 w-12">م</th><th className="p-4 border-e border-slate-300 w-64">الاسم</th><th className="p-4 border-e border-slate-300">المخالفة</th><th className="p-4 border-e border-slate-300 w-40">التاريخ</th><th className="p-4">إجراءات</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? <tr><td colSpan={5} className="p-16 text-slate-400 italic font-bold">لا توجد تعهدات مسجلة.</td></tr> : filteredData.map((v, idx) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors font-bold group"><td className="p-4 border-e border-slate-100 bg-slate-50/50">{idx + 1}</td><td className="p-2 border-e border-slate-100">{activeMode === 'students' ? v.studentName : v.teacherName}</td><td className="p-2 border-e border-slate-100">{v.violation}</td><td className="p-2 border-e border-slate-100">{v.date}</td><td className="p-2"><button onClick={() => updateData({ violations: data.violations.filter(x => x.id !== v.id) })} className="text-red-300 hover:text-red-600 transition-colors"><Trash2 size={16} /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
