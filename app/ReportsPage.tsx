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
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  // Teacher Report Modal State
  const [showTeacherReport, setShowTeacherReport] = useState(false);
  const [reportTeacherId, setReportTeacherId] = useState<string>('');
  const [reportTeacherSearch, setReportTeacherSearch] = useState('');
  const [reportSelectedFields, setReportSelectedFields] = useState<string[]>([]);
  const [showWhatsAppSelect, setShowWhatsAppSelect] = useState(false);


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
        const firstA = a.subjectCode.split(', ')[0] || '';
        const firstB = b.subjectCode.split(', ')[0] || '';
        const idxA = subjectOrder.indexOf(firstA);
        const idxB = subjectOrder.indexOf(firstB);
        if (idxA !== -1 && idxB !== -1) res = idxA - idxB;
        else if (idxA !== -1) res = -1;
        else if (idxB !== -1) res = 1;
        else res = firstA.localeCompare(firstB);
      } else if (sortConfig.criteria === 'class') {
        const firstA = a.className.split(', ')[0] || '';
        const firstB = b.className.split(', ')[0] || '';
        res = firstA.localeCompare(firstB);
      } else if (sortConfig.criteria === 'manual') {
        res = (a.order || 0) - (b.order || 0);
      }
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
    { key: 'violations_score', label: 'المخالفات', max: 0 }, // Added for Report selectability
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
      radio: 0, creativity: 0, zero_period: 0, violations_score: 0, violations_notes: [], gender: 'ذكر'
    })) : [];

    const newReport: DailyReportContainer = {
      id: Date.now().toString(),
      dayName: new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date()),
      dateStr: new Date().toISOString().split('T')[0],
      teachersData: newTeachers as TeacherFollowUp[]
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
      radio: 0, creativity: 0, zero_period: 0, violations_score: 0, violations_notes: [], order: teachers.length + 1,
      gender: 'ذكر'
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
            const filled = { ...t } as TeacherFollowUp;
            metricsConfig.forEach(m => (filled as any)[m.key] = m.max);
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
    const unaccredited = t.unaccreditedMetrics || [];
    let sum = metricsConfig.reduce((acc, m) => {
      if (m.key === 'violations_score' || unaccredited.includes(m.key)) return acc;
      return acc + (Number((t as any)[m.key]) || 0);
    }, 0);
    return Math.max(0, sum - (t.violations_score || 0));
  };

  const calculateMaxTotal = (t: TeacherFollowUp) => {
    const unaccredited = t.unaccreditedMetrics || [];
    return metricsConfig.reduce((acc, m) => {
      if (m.key === 'violations_score' || unaccredited.includes(m.key)) return acc;
      return acc + m.max;
    }, 0);
  };

  const toggleAccreditation = (teacherId: string | 'bulk', metricKey: string) => {
    if (!activeReportId) return;
    const updatedReports = reports.map(r => {
      if (r.id === activeReportId) {
        let newTeachers = [...r.teachersData];
        if (teacherId === 'bulk') {
          // Check if at least one is NOT unaccredited
          const allCurrentlyUnaccredited = newTeachers.every(t => (t.unaccreditedMetrics || []).includes(metricKey));
          newTeachers = newTeachers.map(t => {
            const current = t.unaccreditedMetrics || [];
            if (allCurrentlyUnaccredited) {
              return { ...t, unaccreditedMetrics: current.filter(k => k !== metricKey) };
            } else {
              if (current.includes(metricKey)) return t;
              return { ...t, unaccreditedMetrics: [...current, metricKey] };
            }
          });
        } else {
          newTeachers = newTeachers.map(t => {
            if (t.id === teacherId) {
              const current = t.unaccreditedMetrics || [];
              const updated = current.includes(metricKey)
                ? current.filter(k => k !== metricKey)
                : [...current, metricKey];
              return { ...t, unaccreditedMetrics: updated };
            }
            return t;
          });
        }
        return { ...r, teachersData: newTeachers };
      }
      return r;
    });
    updateData({ dailyReports: updatedReports });
  };

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

  const getColSum = (key: string) => teachers.reduce((acc, t) => {
    const isUnaccredited = (t.unaccreditedMetrics || []).includes(key);
    if (isUnaccredited) return acc;
    return acc + (Number((t as any)[key]) || 0);
  }, 0);

  const getColPercent = (key: string, max: number) => {
    const sum = getColSum(key);
    const accreditedCount = teachers.filter(t => !(t.unaccreditedMetrics || []).includes(key)).length;
    return accreditedCount > 0 ? ((sum / (accreditedCount * max)) * 100).toFixed(1) : '0';
  };

  // MultiSelect Component
  const MultiSelectDropDown = ({ label, options, selected, onChange, emoji }: { label: string, options: string[], selected: string[], onChange: (vals: string[]) => void, emoji?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="relative" ref={containerRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-right bg-transparent outline-none text-[10px] font-bold flex items-center justify-between gap-1 p-1 hover:bg-slate-50 rounded min-h-[32px]"
        >
          <div className="flex flex-wrap gap-0.5 flex-1 items-center">
            {selected.length === 0 ? (
              <span className="text-slate-400">اختر..</span>
            ) : (
              selected.map(s => (
                <span key={s} className="bg-blue-100 text-blue-700 px-1 rounded text-[8px] whitespace-nowrap">{s}</span>
              ))
            )}
          </div>
          <ChevronDown size={12} className={`text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-48 bg-white border rounded-xl shadow-xl p-2 animate-in fade-in zoom-in duration-150 right-0">
            <div className="text-[10px] font-black text-slate-400 mb-2 px-1 flex items-center gap-1 border-b pb-1">
              {emoji && <span>{emoji}</span>}
              <span>{label}</span>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
              {options.map(opt => {
                const isSelected = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      const newSelected = isSelected ? selected.filter(s => s !== opt) : [...selected, opt];
                      onChange(newSelected);
                    }}
                    className={`w-full text-right p-2 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-between ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const fieldsConfig = [
    { key: 'teacherName', label: 'اسم المعلم', emoji: '👤', color: 'bg-blue-600' },
    { key: 'subjectCode', label: 'المادة', emoji: '📚', color: 'bg-indigo-600' },
    { key: 'className', label: 'الصف', emoji: '🎓', color: 'bg-purple-600' },
    { key: 'gender', label: 'النوع', emoji: '🚻', color: 'bg-pink-600' },
    { key: 'attendance', label: 'الحضور اليومي', emoji: '📅', color: 'bg-green-600' },
    { key: 'appearance', label: 'المظهر الشخصي', emoji: '👔', color: 'bg-emerald-600' },
    { key: 'preparation', label: 'اكتمال التحضير', emoji: '📝', color: 'bg-teal-600' },
    { key: 'supervision_queue', label: 'إشراف الطابور', emoji: '🚶', color: 'bg-orange-600' },
    { key: 'supervision_rest', label: 'إشراف الراحة', emoji: '☕', color: 'bg-orange-500' },
    { key: 'supervision_end', label: 'إشراف نهاية الدوام', emoji: '🔚', color: 'bg-orange-400' },
    { key: 'correction_books', label: 'تصحيح الكتب', emoji: '📖', color: 'bg-cyan-600' },
    { key: 'correction_notebooks', label: 'تصحيح الدفاتر', emoji: '📒', color: 'bg-cyan-500' },
    { key: 'correction_followup', label: 'تصحيح المتابعة', emoji: '📋', color: 'bg-cyan-400' },
    { key: 'teaching_aids', label: 'توفر وسيلة تعلمية', emoji: '💡', color: 'bg-yellow-600' },
    { key: 'extra_activities', label: 'أنشطة لا صفية', emoji: '⚽', color: 'bg-lime-600' },
    { key: 'radio', label: 'إقامة إذاعة', emoji: '🎙️', color: 'bg-red-600' },
    { key: 'zero_period', label: 'إقامة حصة صفرية', emoji: '0️⃣', color: 'bg-slate-600' },
    { key: 'violations_score', label: 'المخالفات', emoji: '⚠️', color: 'bg-red-700' },
    { key: 'total', label: 'المجموع', emoji: '∑', color: 'bg-black' },
    { key: 'percent', label: 'النسبة', emoji: '📊', color: 'bg-blue-800' },
  ];

  const handleTeacherReportSave = () => {
    // Data is already bound to main state via updateTeacher, so just close
    setShowTeacherReport(false);
  };

  const handleWhatsAppExport = (selectedForExport: string[]) => {
    const exportTeachers = reportTeacherId === 'bulk' ? teachers : teachers.filter(t => t.id === reportTeacherId);
    if (exportTeachers.length === 0) return;

    let msg = `*📋 تقرير متابعة معلمين 📋*\n\n`;
    if (exportTeachers.length === 1) msg = `*📋 تقرير متابعة معلم 📋*\n\n`;

    msg += `📅 *التاريخ:* ${currentReport?.dateStr || ''} (${currentReport?.dayName || ''})\n`;
    msg += `------------------------------\n`;

    exportTeachers.forEach((teacher, tIdx) => {
      if (exportTeachers.length > 1) {
        msg += `\n👤 *${tIdx + 1}- ${teacher.teacherName}*\n`;
      } else {
        msg += `👤 *الاسم:* ${teacher.teacherName}\n`;
      }

      fieldsConfig.forEach(f => {
        if (selectedForExport.includes(f.key) && !['teacherName'].includes(f.key)) {
          let val = teacher[f.key as keyof TeacherFollowUp];
          if (f.key === 'total') val = calculateTotal(teacher);
          if (f.key === 'percent') {
            const mTotal = calculateMaxTotal(teacher);
            val = mTotal > 0 ? ((calculateTotal(teacher) / mTotal) * 100).toFixed(1) + '%' : '0%';
          }

          if (val !== undefined && val !== null && val !== '') {
            const isUnaccredited = (teacher.unaccreditedMetrics || []).includes(f.key);
            msg += `${f.emoji} *${f.label}:* ${isUnaccredited ? '_غير معتمد_' : val}\n`;
          }
        }
      });
      msg += `------------------------------\n`;
    });

    // START OF CHANGE - Requirement: Footer with School Name and Branch
    const profile = data.profile;
    if (profile.schoolName || profile.branch) {
      msg += `\n🏫 *${profile.schoolName || ''}${profile.branch ? `، فرع ${profile.branch}` : ''}*\n`;
    }

    // END OF CHANGE

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setShowWhatsAppSelect(false);
  };


  return (
    <div className="space-y-4 font-arabic">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleCreateReport} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all text-xs sm:text-sm"><FilePlus size={16} /> إضافة جدول جديد</button>
          <button onClick={() => setShowArchive(true)} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs sm:text-sm"><FolderOpen size={16} /> فتح تقرير</button>
          <button onClick={addNewTeacher} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-bold border border-purple-200 hover:bg-purple-100 transition-all text-xs sm:text-sm"><UserCircle size={16} /> إضافة معلم</button>
          <button onClick={() => { setShowTeacherReport(true); setReportTeacherSearch(''); setReportTeacherId(''); setReportSelectedFields([]); }} className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl font-bold border border-green-200 hover:bg-green-100 transition-all text-xs sm:text-sm"><FileText size={16} /> تقرير معلم</button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setFilterMode(prev => prev === 'all' ? 'metric' : 'all')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold border transition-all text-xs sm:text-sm ${filterMode === 'metric' ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              <Filter size={16} /> {filterMode === 'metric' ? 'عرض مخصص' : 'عرض الجميع'}
            </button>
            {filterMode === 'metric' && (
              <button onClick={() => setShowMetricPicker(true)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-[10px]"><Settings2 size={10} /></button>
            )}
          </div>

          <button onClick={() => setShowSortModal(true)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-white"><ListOrdered size={18} /></button>
          {currentReport && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-xl border border-blue-100">
              <Calendar size={16} />
              <span className="text-xs font-black">{currentReport.dayName} {currentReport.dateStr}</span>
              <button className="hover:bg-blue-200 rounded p-0.5"><Edit size={12} /></button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className={`w-full text-center border-collapse ${filterMode === 'metric' ? '' : 'min-w-[1400px]'}`}>
            <thead>
              <tr className="border-b border-slate-300">
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-10 sticky right-0 bg-[#FFD966] z-20 font-sans">م</th>
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-44 sticky right-10 bg-[#FFD966] z-20">اسم المعلم</th>
                {!filterMode.includes('metric') && (
                  <>
                    <th rowSpan={2} className="p-2 border-e border-slate-300 w-20 sticky top-0 bg-[#FFD966] z-10">النوع</th>
                    <th rowSpan={2} className="p-2 border-e border-slate-300 w-28 sticky top-0 bg-[#FFD966] z-10">المادة</th>
                    <th rowSpan={2} className="p-2 border-e border-slate-300 w-24 sticky top-0 bg-[#FFD966] z-10">الصف</th>
                  </>
                )}
                <th colSpan={displayedMetrics.filter(m => m.key !== 'violations_score').length} className="p-2 border-b border-slate-300 font-black text-sm sticky top-0 bg-[#FFD966] z-10">
                  <div className="flex items-center gap-2">
                    <span>مجالات تقييم المعلمين</span>
                    <button onClick={fillAllMax} title="تعبئة الجميع بالحد الأقصى" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1 text-[10px] flex items-center gap-1">
                      <Sparkles size={10} /> مطابقة التعبئة للجميع
                    </button>
                  </div>
                </th>
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-24 sticky top-0 bg-[#C6E0B4] z-10">المخالفات</th>
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-16 sticky top-0 bg-[#C6E0B4] z-10 font-sans">المجموع</th>
                <th rowSpan={2} className="p-2 w-16 sticky top-0 bg-[#FFD966] z-10 font-sans">النسبة</th>
                <th rowSpan={2} className="p-1 w-10 sticky top-0 bg-[#FFD966] z-10">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black">واتساب</span>
                    <button
                      onClick={() => {
                        setReportTeacherId('bulk');
                        setShowWhatsAppSelect(true);
                      }}
                      className="p-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                      title="تصدير الكل للواتساب"
                    >
                      <MessageCircle size={12} />
                    </button>
                  </div>
                </th>
              </tr>
              <tr className="text-[10px] sticky top-[45px] z-10">
                {displayedMetrics.filter(m => m.key !== 'violations_score').map(m => (
                  <th key={m.key} className={`p-1 border-e border-slate-300 min-w-[70px] align-bottom ${getMetricColor(m.key)}`}>
                    <div className="flex flex-col items-center justify-end gap-1 pb-1 h-full w-full">
                      <div className="vertical-text font-bold text-slate-800 h-20 mb-auto text-[11px]">{m.label}</div>

                      {/* Accreditation Toggle logic in Header */}
                      <div className="flex flex-col items-center gap-0.5 mb-1 h-8 justify-center">
                        <button
                          onClick={() => toggleAccreditation('bulk', m.key)}
                          className={`p-0.5 rounded-full transition-all flex items-center justify-center ${teachers.every(t => (t.unaccreditedMetrics || []).includes(m.key)) ? 'text-red-500 bg-red-50' : 'text-green-500 bg-green-50'}`}
                          title={teachers.every(t => (t.unaccreditedMetrics || []).includes(m.key)) ? 'تفعيل للجميع' : 'إستبعاد الجميع'}
                        >
                          <Star size={10} className={teachers.every(t => (t.unaccreditedMetrics || []).includes(m.key)) ? 'fill-red-500' : 'fill-green-500'} />
                          {teachers.every(t => (t.unaccreditedMetrics || []).includes(m.key)) && <X size={8} />}
                        </button>
                        {teachers.every(t => (t.unaccreditedMetrics || []).includes(m.key)) && (
                          <span className="text-[7px] text-red-500 font-black leading-tight">غير معتمد</span>
                        )}
                      </div>

                      <div className="w-full px-1">
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-300 rounded text-center text-[10px] font-bold py-0.5 shadow-sm outline-none focus:ring-1 focus:ring-blue-400 font-sans"
                          value={m.max}
                          onChange={(e) => {
                            const newVal = Math.max(1, parseInt(e.target.value) || 0);
                            updateData({
                              maxGrades: {
                                ...(data.maxGrades || {}),
                                [m.key]: newVal
                              }
                            });
                          }}
                          title="تعديل الدرجة القصوى لهذا المجال"
                        />
                      </div>
                      <div className="w-full px-1">
                        <button
                          onClick={() => {
                            const input = document.getElementById(`header-input-${m.key}`) as HTMLInputElement;
                            const val = input?.value ? parseInt(input.value) : m.max;
                            fillMetricColumn(m.key, val);
                          }}
                          className="w-full bg-blue-50 text-blue-600 border border-blue-200 rounded flex items-center justify-center gap-1 text-[9px] font-bold py-0.5 hover:bg-blue-100 transition-colors"
                        >
                          <Zap size={8} className="fill-current" /> الكل
                        </button>
                      </div>
                      <div className="flex items-center gap-1 w-full px-1">
                        <button
                          onClick={() => fillMetricColumn(m.key, m.max)}
                          className="bg-green-50 text-green-600 border border-green-200 rounded p-0.5 hover:bg-green-100 flex-shrink-0"
                          title="تعبئة الدرجة الكاملة"
                        >
                          <CheckCircle size={10} />
                        </button>
                        <input
                          id={`header-input-${m.key}`}
                          className="w-full text-[9px] text-center border border-slate-300 rounded py-0.5 outline-none bg-white focus:ring-1 focus:ring-blue-200 font-sans"
                          placeholder="درجة"
                          type="number"
                          max={m.max}
                        />
                      </div>
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
                const maxTotal = calculateMaxTotal(t);
                const percent = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : '0';
                return (
                  <tr
                    key={t.id}
                    className={`border-b transition-colors h-10 ${highlightedRowId === t.id ? 'bg-orange-100' : 'hover:bg-slate-50'}`}
                    onClick={() => setHighlightedRowId(t.id)}
                  >
                    <td className="p-1 border-e sticky right-0 bg-white group-hover:bg-slate-50 font-bold text-xs font-sans">{idx + 1}</td>
                    <td className="p-1 border-e sticky right-10 bg-white group-hover:bg-slate-50">
                      <input className="w-full text-right font-bold outline-none bg-transparent text-xs" value={t.teacherName} onChange={e => updateTeacher(t.id, 'teacherName', e.target.value)} placeholder="اسم المعلم.." />
                    </td>
                    {!filterMode.includes('metric') && (
                      <>
                        <td className="p-1 border-e">
                          <select className="w-full bg-transparent outline-none text-[10px] text-center font-bold" value={t.gender || 'ذكر'} onChange={e => updateTeacher(t.id, 'gender', e.target.value)}>
                            <option value="ذكر">ذكر</option>
                            <option value="أنثى">أنثى</option>
                          </select>
                        </td>
                        <td className="p-1 border-e">
                          <MultiSelectDropDown
                            label="المواد"
                            options={subjects}
                            selected={t.subjectCode ? t.subjectCode.split(', ') : []}
                            onChange={(vals) => updateTeacher(t.id, 'subjectCode', vals.join(', '))}
                            emoji="📚"
                          />
                        </td>
                        <td className="p-1 border-e">
                          <MultiSelectDropDown
                            label="الصفوف"
                            options={grades}
                            selected={t.className ? t.className.split(', ') : []}
                            onChange={(vals) => updateTeacher(t.id, 'className', vals.join(', '))}
                            emoji="🎓"
                          />
                        </td>
                      </>
                    )}
                    {displayedMetrics.filter(m => m.key !== 'violations_score').map(m => {
                      const isUnaccredited = (t.unaccreditedMetrics || []).includes(m.key);
                      return (
                        <td key={m.key} className={`p-1 border-e relative group ${isUnaccredited ? 'bg-red-50/30' : ''}`}>
                          <div className="flex flex-col items-center gap-0.5 h-full">
                            <input
                              id={`input-${t.id}-${m.key}`}
                              type="number"
                              disabled={isUnaccredited}
                              className={`w-full text-center outline-none bg-transparent font-bold text-xs focus:bg-blue-50 focus:ring-1 focus:ring-blue-200 rounded font-sans ${isUnaccredited ? 'opacity-30 pointer-events-none' : ''} ${!isUnaccredited && (Number((t as any)[m.key]) || 0) <= m.max * 0.25 ? 'text-red-600' : 'text-slate-800'}`}
                              value={(t as any)[m.key]}
                              onChange={e => {
                                const val = Math.min(m.max, Math.max(0, parseInt(e.target.value) || 0));
                                updateTeacher(t.id, m.key as keyof TeacherFollowUp, val);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, idx, m.key)}
                              onFocus={(e) => e.target.select()}
                            />
                            {/* Toggle Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleAccreditation(t.id, m.key); }}
                              className={`transition-all flex items-center justify-center p-0.5 rounded ${isUnaccredited ? 'text-red-500 hover:scale-110' : 'text-green-500 hover:scale-110 opacity-20 group-hover:opacity-100'}`}
                              title={isUnaccredited ? 'اعتماد الدرجة' : 'استبعاد من الحساب'}
                            >
                              <Star size={10} className={isUnaccredited ? 'fill-red-500' : 'fill-green-500'} />
                              {isUnaccredited && <X size={8} className="absolute mb-4 mr-4" />}
                            </button>
                            {isUnaccredited && (
                              <div className="text-[7px] text-red-500 font-bold whitespace-nowrap">غير معتمد</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td
                      className="p-1 border-e cursor-pointer hover:bg-red-50 transition-colors relative group"
                      onClick={() => setViolationModal({ id: t.id, notes: t.violations_notes })}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          className="w-full text-center text-red-600 font-bold outline-none bg-transparent text-xs font-sans"
                          value={t.violations_score}
                          onChange={e => updateTeacher(t.id, 'violations_score', parseInt(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.target.select()}
                        />
                        {t.violations_notes.length > 0 && <div className="w-2 h-2 rounded-full bg-red-600 absolute top-1 right-1"></div>}
                        <button
                          className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-red-100 text-red-600 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViolationModal({ id: t.id, notes: t.violations_notes });
                          }}
                        >
                          <AlertCircle size={10} />
                        </button>
                      </div>
                    </td>
                    <td className="p-1 border-e font-black text-xs font-sans text-blue-700">{total}</td>
                    <td className="p-1 border-e font-black text-xs font-sans text-blue-700">{percent}%</td>
                    <td className="p-1 border-e">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportTeacherId(t.id);
                          setShowWhatsAppSelect(true);
                        }}
                        className="p-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                        title="تصدير للواتساب"
                      >
                        <MessageCircle size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {teachers.length > 0 && (
              <tfoot className="bg-slate-50 text-slate-800 font-bold text-xs sticky bottom-0 z-20 shadow-lg border-t-2 border-slate-200">
                <tr>
                  <td colSpan={filterMode === 'metric' ? 2 : 5} className="p-2 text-left px-4 border-e">المجموع الكلي</td>
                  {displayedMetrics.map(m => (
                    <td key={m.key} className="p-2 border-e text-blue-600">
                      <div className="flex flex-col">
                        <span>{getColSum(m.key)}</span>
                      </div>
                    </td>
                  ))}
                  <td className="p-2 border-e"></td>
                  <td className="p-2 border-e text-blue-700">{teachers.reduce((acc, t) => acc + calculateTotal(t), 0)}</td>
                  <td className="p-2 border-e font-sans">
                    {(() => {
                      const totalSum = teachers.reduce((acc, t) => acc + calculateTotal(t), 0);
                      const totalMax = teachers.reduce((acc, t) => acc + calculateMaxTotal(t), 0);
                      return totalMax > 0 ? ((totalSum / totalMax) * 100).toFixed(1) : '0';
                    })()}%
                  </td>
                </tr>
                <tr>
                  <td colSpan={filterMode === 'metric' ? 2 : 5} className="p-2 text-left px-4 border-e">النسبة العامة</td>
                  {displayedMetrics.map(m => (
                    <td key={m.key} className="p-2 border-e text-slate-500">
                      <div className="flex flex-col">
                        <span className="text-[10px]">{getColPercent(m.key, m.max)}%</span>
                      </div>
                    </td>
                  ))}
                  <td className="p-2 border-e"></td>
                  <td className="p-2 border-e"></td>
                  <td className="p-2 border-e"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Archive Modal */}
      {
        showArchive && (
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
              <button onClick={() => setShowArchive(false)} className="w-full mt-4 p-3 bg-slate-100 rounded-xl font-bold hover:bg-slate-200">إغلاق</button>
            </div>
          </div>
        )
      }

      {/* Sort Modal */}
      {
        showSortModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200 space-y-4">
              <h3 className="text-xl font-black text-center">ترتيب المعلمين</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSortConfig({ ...sortConfig, criteria: 'name' })} className={`p-3 rounded-xl border font-bold ${sortConfig.criteria === 'name' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-slate-50'}`}>أبجدياً</button>
                <button onClick={() => setSortConfig({ ...sortConfig, criteria: 'subject' })} className={`p-3 rounded-xl border font-bold ${sortConfig.criteria === 'subject' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-slate-50'}`}>حسب المادة</button>
                <button onClick={() => setSortConfig({ ...sortConfig, criteria: 'class' })} className={`p-3 rounded-xl border font-bold ${sortConfig.criteria === 'class' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-slate-50'}`}>حسب الصف</button>
                <button onClick={() => setSortConfig({ ...sortConfig, criteria: 'manual' })} className={`p-3 rounded-xl border font-bold ${sortConfig.criteria === 'manual' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-slate-50'}`}>يدوي</button>
              </div>
              {sortConfig.criteria === 'manual' && (
                <div className="max-h-40 overflow-y-auto border p-2 rounded-xl bg-slate-50">
                  {teachers.map(t => (
                    <div key={t.id} className="flex items-center gap-2 mb-1">
                      <input type="number" className="w-12 p-1 text-center rounded border" value={t.order || 0} onChange={(e) => updateTeacher(t.id, 'order', parseInt(e.target.value))} />
                      <span className="text-xs font-bold">{t.teacherName}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 justify-center pt-2">
                <button onClick={() => setSortConfig({ ...sortConfig, direction: 'asc' })} className={`p-2 rounded-lg border ${sortConfig.direction === 'asc' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}><ArrowUp /></button>
                <button onClick={() => setSortConfig({ ...sortConfig, direction: 'desc' })} className={`p-2 rounded-lg border ${sortConfig.direction === 'desc' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}><ArrowDown /></button>
              </div>
              <button onClick={() => setShowSortModal(false)} className="w-full p-3 bg-slate-800 text-white rounded-xl font-black">تم</button>
            </div>
          </div>
        )
      }

      {/* Metric Picker Modal */}
      {
        showMetricPicker && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
              <h3 className="font-bold text-center mb-4">اختر المعايير للعرض</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {metricsConfig.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMetrics(prev => prev.includes(m.key) ? prev.filter(k => k !== m.key) : [...prev, m.key])}
                    className={`p-2 rounded-lg text-xs font-bold border ${selectedMetrics.includes(m.key) ? 'bg-blue-500 text-white border-blue-600' : 'bg-slate-50 border-slate-200'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowMetricPicker(false)} className="w-full p-2 bg-slate-800 text-white rounded-xl font-bold">موافق</button>
            </div>
          </div>
        )
      }

      {/* Violations Modal */}
      {
        violationModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-lg font-black text-red-600 mb-4 text-center">تفاصيل المخالفات</h3>
              <div className="space-y-2 mb-4">
                {violationTypes.map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      const exists = violationModal.notes.includes(v);
                      const newNotes = exists ? violationModal.notes.filter(n => n !== v) : [...violationModal.notes, v];
                      setViolationModal({ ...violationModal, notes: newNotes });
                      updateTeacher(violationModal.id, 'violations_notes', newNotes);
                    }}
                    className={`w-full p-3 rounded-xl text-right font-bold border transition-all flex justify-between ${violationModal.notes.includes(v) ? 'bg-red-50 border-red-500 text-red-700' : 'bg-slate-50 border-slate-100'}`}
                  >
                    {v}
                    {violationModal.notes.includes(v) && <Check size={16} />}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full p-3 border rounded-xl bg-slate-50 text-right text-sm font-bold min-h-[80px]"
                placeholder="ملاحظات إضافية..."
              ></textarea>
              <button onClick={() => setViolationModal(null)} className="w-full mt-2 p-3 bg-slate-800 text-white rounded-xl font-bold">حفظ وإغلاق</button>
            </div>
          </div>
        )
      }

      {/* Teacher Report Modal */}
      {/* Teacher Report Modal */}
      {showTeacherReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col md:flex-row">
            {/* Left Panel: Search & Select */}
            <div className="md:w-1/3 bg-slate-50 p-8 border-e border-slate-100 flex flex-col overflow-hidden">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Search size={20} className="text-blue-600" />
                  <span>البحث عن معلم</span>
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو المادة.."
                    className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all pr-12 font-bold shadow-sm"
                    value={reportTeacherSearch}
                    onChange={e => setReportTeacherSearch(e.target.value)}
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {teachers.filter(t => t.teacherName.includes(reportTeacherSearch) || t.subjectCode.includes(reportTeacherSearch)).map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setReportTeacherId(t.id); setReportSelectedFields(['teacherName', 'subjectCode', 'className', 'gender', 'total', 'percent']); }}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all border-2 text-right ${reportTeacherId === t.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                      : 'bg-white border-transparent hover:border-blue-200 text-slate-700 shadow-sm'}`}
                  >
                    <div className="text-right">
                      <div className="font-black text-sm">{t.teacherName || 'معلم جديد'}</div>
                      <div className={`text-[10px] font-bold truncate ${reportTeacherId === t.id ? 'text-blue-100' : 'text-slate-400'}`}>
                        {t.subjectCode || 'بدون مادة'} - {t.className || 'بدون صف'}
                      </div>
                    </div>
                    {reportTeacherId === t.id && <Check size={18} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Panel: Data Entry & Export */}
            <div className="md:w-2/3 p-8 flex flex-col bg-white overflow-hidden">
              {reportTeacherId ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setShowTeacherReport(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                    >
                      <X size={24} />
                    </button>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <FileText className="text-blue-600" />
                      <span>تقرير متابعة معلم</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowWhatsAppSelect(true)}
                        className="p-2.5 bg-green-50 text-green-600 rounded-xl border border-green-200 hover:bg-green-100 transition-all font-bold flex items-center gap-2 text-sm shadow-sm"
                      >
                        <MessageCircle size={18} />
                        <span className="hidden sm:inline">واتساب</span>
                      </button>
                    </div>
                  </div>

                  {/* Field Selection Grid */}
                  <div className="mb-4 p-3 border-2 border-blue-50 rounded-2xl bg-slate-50/50">
                    <label className="text-xs font-black text-slate-500 mb-2 block text-center">اختر المجالات المعروضة في التقرير</label>
                    <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto p-1 custom-scrollbar">
                      {fieldsConfig.map(f => (
                        <button
                          key={f.key}
                          onClick={() => setReportSelectedFields(prev => prev.includes(f.key) ? prev.filter(k => k !== f.key) : [...prev, f.key])}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 shadow-sm border ${reportSelectedFields.includes(f.key)
                            ? `${f.color} text-white border-transparent scale-105`
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                        >
                          <span>{f.emoji}</span>
                          <span>{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Data Entry Form */}
                  <div className="space-y-2 flex-1 overflow-y-auto px-1 mb-4 custom-scrollbar">
                    {reportSelectedFields.map(fieldKey => {
                      const field = fieldsConfig.find(f => f.key === fieldKey);
                      const teacher = teachers.find(t => t.id === reportTeacherId);
                      if (!field || !teacher) return null;

                      if (fieldKey === 'total') {
                        return (
                          <div key={fieldKey} className="flex items-center gap-4 bg-slate-100 p-3 rounded-xl border border-slate-200 text-right font-sans" dir="rtl">
                            <span className="font-black text-slate-600 w-1/3 font-arabic">{field.emoji} {field.label}</span>
                            <span className="font-black text-blue-600 text-lg">{calculateTotal(teacher)} / {calculateMaxTotal(teacher)}</span>
                          </div>
                        );
                      }
                      if (fieldKey === 'percent') {
                        const score = calculateTotal(teacher);
                        const mTotal = calculateMaxTotal(teacher);
                        const percent = mTotal > 0 ? ((score / mTotal) * 100).toFixed(1) : '0';
                        return (
                          <div key={fieldKey} className="flex items-center gap-4 bg-slate-100 p-3 rounded-xl border border-slate-200 text-right font-sans" dir="rtl">
                            <span className="font-black text-slate-600 w-1/3 font-arabic">{field.emoji} {field.label}</span>
                            <span className="font-black text-blue-600 text-lg">{percent}%</span>
                          </div>
                        );
                      }

                      return (
                        <div key={fieldKey} className="flex items-center gap-4 bg-white p-2 rounded-xl border hover:border-blue-400 transition-colors shadow-sm text-right" dir="rtl">
                          <label className="font-bold text-slate-700 w-1/3 flex items-center gap-2">
                            <span className="p-1.5 bg-slate-50 rounded-lg text-sm">{field.emoji}</span>
                            <span className="text-sm">{field.label}</span>
                          </label>
                          <div className="flex-1">
                            {fieldKey === 'subjectCode' ? (
                              <MultiSelectDropDown
                                label="المواد"
                                options={subjects}
                                selected={teacher.subjectCode ? teacher.subjectCode.split(', ') : []}
                                onChange={(vals) => updateTeacher(teacher.id, 'subjectCode', vals.join(', '))}
                                emoji="📚"
                              />
                            ) : fieldKey === 'className' ? (
                              <MultiSelectDropDown
                                label="الصفوف"
                                options={grades}
                                selected={teacher.className ? teacher.className.split(', ') : []}
                                onChange={(vals) => updateTeacher(teacher.id, 'className', vals.join(', '))}
                                emoji="🎓"
                              />
                            ) : fieldKey === 'gender' ? (
                              <select className="w-full p-2 bg-slate-50 rounded-lg font-bold text-center outline-none focus:ring-2 ring-blue-100" value={teacher.gender || 'ذكر'} onChange={e => updateTeacher(teacher.id, 'gender', e.target.value)}>
                                <option value="ذكر">ذكر</option>
                                <option value="أنثى">أنثى</option>
                              </select>
                            ) : fieldKey === 'teacherName' ? (
                              <input
                                type="text"
                                className="w-full p-2 bg-slate-50 rounded-lg font-bold text-center outline-none focus:ring-2 ring-blue-100"
                                value={teacher.teacherName}
                                onChange={e => updateTeacher(teacher.id, 'teacherName', e.target.value)}
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  disabled={(teacher.unaccreditedMetrics || []).includes(fieldKey)}
                                  className={`flex-1 p-2 bg-slate-50 rounded-lg font-bold text-center outline-none focus:ring-2 ring-blue-100 font-sans ${(teacher.unaccreditedMetrics || []).includes(fieldKey) ? 'opacity-30' : ''}`}
                                  value={(teacher as any)[fieldKey]}
                                  onChange={e => {
                                    const metric = metricsConfig.find(m => m.key === fieldKey);
                                    const max = metric ? metric.max : 100;
                                    const val = Math.min(max, Math.max(0, parseInt(e.target.value) || 0));
                                    updateTeacher(teacher.id, fieldKey, val);
                                  }}
                                />
                                <button
                                  onClick={() => toggleAccreditation(teacher.id, fieldKey)}
                                  className={`p-2 rounded-lg transition-all flex items-center gap-1 ${(teacher.unaccreditedMetrics || []).includes(fieldKey) ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}
                                  title={(teacher.unaccreditedMetrics || []).includes(fieldKey) ? 'اعتماد' : 'استبعاد'}
                                >
                                  <Star size={16} className={(teacher.unaccreditedMetrics || []).includes(fieldKey) ? 'fill-red-500' : 'fill-green-500'} />
                                  {(teacher.unaccreditedMetrics || []).includes(fieldKey) && <X size={12} />}
                                </button>
                                {metricsConfig.find(m => m.key === fieldKey) && (
                                  <span className={`text-[10px] font-black font-sans ${(teacher.unaccreditedMetrics || []).includes(fieldKey) ? 'text-red-500' : 'text-slate-400'} whitespace-nowrap`}>
                                    / {metricsConfig.find(m => m.key === fieldKey)?.max}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-4 mt-auto pt-6 border-t border-slate-100">
                    <button
                      onClick={() => setShowTeacherReport(false)}
                      className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 text-lg text-right"
                    >
                      <CheckCircle size={22} />
                      حفظ وإنهاء
                    </button>
                    <button
                      onClick={() => {
                        setReportTeacherId('');
                        setReportTeacherSearch('');
                        setReportSelectedFields([]);
                        setShowTeacherReport(false);
                      }}
                      className="px-8 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl border border-slate-200 hover:bg-white transition-all text-lg"
                    >
                      إلغاء
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                    <UserCircle size={48} className="text-slate-200" />
                  </div>
                  <p className="font-bold text-lg text-center">يرجى اختيار معلم من القائمة الجانبية لإدارة تقريره</p>
                  <button onClick={() => setShowTeacherReport(false)} className="text-blue-600 font-black hover:underline">إغلاق النافذة</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )
      }
      {/* WhatsApp Selection Modal */}
      {
        showWhatsAppSelect && reportTeacherId && (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-xl font-black text-center mb-2">تحديد بيانات الواتساب</h3>
              <p className="text-center text-slate-500 text-sm mb-4">اختر الحقول التي تريد إرسالها</p>

              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-6 p-2">
                <button onClick={() => setReportSelectedFields(fieldsConfig.map(f => f.key))} className="col-span-2 p-2 bg-blue-50 text-blue-600 font-bold rounded-xl text-xs mb-2">تحديد الكل</button>
                {fieldsConfig.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setReportSelectedFields(prev => prev.includes(f.key) ? prev.filter(k => k !== f.key) : [...prev, f.key])}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all ${reportSelectedFields.includes(f.key) ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-slate-500'}`}
                  >
                    {f.label} {reportSelectedFields.includes(f.key) && '✔'}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleWhatsAppExport(reportSelectedFields)}
                  className="flex-1 p-3 bg-green-600 text-white rounded-xl font-black hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                >
                  <MessageCircle size={20} />
                  إرسال للواتساب
                </button>
                <button onClick={() => setShowWhatsAppSelect(false)} className="px-6 p-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200">إلغاء</button>
              </div>
            </div>
          </div>
        )
      }
    </div >
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

  // Map teacher names to their profiles for quick lookup and auto-fill
  const teacherProfiles = useMemo(() => {
    const profiles: Record<string, { subject: string, class: string }> = {};
    // Reverse iterate to get the most recent data if duplicates exist
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

  const subjects = ["القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الاجتماعيات", "الحاسوب", "المكتبة", "الفنية", "المختص الاجتماعي", "الأنشطة", "غيرها"];
  const grades = ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const sections = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];

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

  const handleSelectSuggestion = (rowId: string, suggestionName: string) => {
    if (activeMode === 'students') {
      const student = studentList.find(s => s.name === suggestionName);
      if (student) {
        const updated = data.violations.map(v => v.id === rowId ? {
          ...v,
          studentName: student.name,
          grade: student.grade,
          section: student.section
        } : v);
        updateData({ violations: updated });
      }
    } else {
      const profile = teacherProfiles[suggestionName];
      if (profile) {
        const updated = data.violations.map(v => v.id === rowId ? {
          ...v,
          teacherName: suggestionName,
          subject: profile.subject,
          class: profile.class
        } : v);
        updateData({ violations: updated });
      }
    }
  };

  const deleteViolation = (id: string) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      updateData({ violations: data.violations.filter(v => v.id !== id) });
    }
  };

  const handleSignature = (id: string) => {
    const text = "تم الاطلاع على المخالفة والإجراء، وألتزم بعدم تكرار المخالفة المذكورة، وفي حال تم التكرار فللمدرسة الحق في اتخاذ كافة الإجراءات اللازمة";
    updateViolation(id, 'signature', text);
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

  const generateRichReport = () => {
    let msg = `*📋 سجل التعهدات والمخالفات (${activeMode === 'students' ? 'طلاب' : 'معلمون'})*\n`;
    msg += `*التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n`;
    msg += `----------------------------------\n\n`;

    filteredData.forEach((row, i) => {
      msg += `*🔹 البند (${i + 1}):*\n`;
      msg += `👤 *الاسم:* ${activeMode === 'students' ? row.studentName : row.teacherName}\n`;
      msg += `📍 *الصف:* ${row.grade || row.class || '---'} ${activeMode === 'students' ? `/ ${row.section || '---'}` : ''}\n`;
      if (activeMode === 'teachers') msg += `📚 *المادة:* ${row.subject || '---'}\n`;
      msg += `🔢 *عدد المخالفات:* ${row.prevViolations || 0}\n`;
      msg += `📅 *التاريخ:* ${row.date} (${row.day || '---'})\n`;
      msg += `⚠️ *بيان المخالفة:* _${row.violation || '---'}_\n`;
      msg += `🛡️ *الإجراء المتخذ:* _${row.procedure || '---'}_\n`;
      msg += `✍️ *التوقيع:* _${row.signature || '---'}_\n`;
      msg += `\n`;
    });

    msg += `----------------------------------\n`;
    const profile = data.profile;
    if (profile.schoolName || profile.branch) {
      msg += `🏫 *${profile.schoolName || ''}${profile.branch ? `، فرع ${profile.branch}` : ''}*\n`;
    }

    return msg;
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData.map(v => ({
      'الاسم': activeMode === 'students' ? v.studentName : v.teacherName,
      'الصف': v.grade || v.class,
      'الشعبة': v.section || '',
      'المادة': v.subject || '',
      'التاريخ': v.date,
      'المخالفة': v.violation,
      'الإجراء': v.procedure,
      'التوقيع': v.signature
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Violations");
    XLSX.writeFile(workbook, `Violations_${activeMode}.xlsx`);
  };

  const exportTxt = () => {
    const text = generateRichReport().replace(/\*/g, '').replace(/_/g, '');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Violations_${activeMode}.txt`;
    link.click();
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(generateRichReport())}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 font-arabic text-right animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveMode('students')}
            className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-md ${activeMode === 'students' ? 'bg-blue-600 text-white scale-105' : 'bg-slate-50 text-slate-500 hover:bg-blue-50'}`}
          >
            <GraduationCap size={20} /> تعهدات الطلاب
          </button>
          <button
            onClick={() => setActiveMode('teachers')}
            className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-md ${activeMode === 'teachers' ? 'bg-emerald-600 text-white scale-105' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50'}`}
          >
            <UserCheck size={20} /> تعهدات المعلمين
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border">
            <button title="استيراد" className="p-2.5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><Upload size={18} /></button>
            <button onClick={exportTxt} title="تصدير TXT" className="p-2.5 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition-all"><FileText size={18} /></button>
            <button onClick={exportExcel} title="تصدير Excel" className="p-2.5 bg-white text-green-700 rounded-xl hover:bg-green-50 transition-all"><FileSpreadsheet size={18} /></button>
            <button onClick={handleWhatsApp} title="واتساب" className="p-2.5 bg-white text-green-500 rounded-xl hover:bg-green-50 transition-all"><MessageCircle size={18} /></button>
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`p-3 rounded-2xl border font-black transition-all ${showFilter ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter size={20} />
          </button>
          <button onClick={handleAddRow} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg active:scale-95 transition-all">
            <Plus size={20} /> إضافة تعهد
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="bg-slate-50 p-6 rounded-[2rem] border space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[300px] space-y-2">
              <label className="text-xs font-black text-slate-400">تصفية حسب الأسماء</label>
              <div className="flex gap-2 relative">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    className="w-full p-3 bg-white border rounded-xl outline-none focus:ring-2 ring-blue-100 font-bold text-xs"
                    placeholder="ابحث عن اسم..."
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                  />
                  {nameSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-xl shadow-xl mt-1 overflow-hidden">
                      {nameSuggestions.map(name => (
                        <button
                          key={name}
                          onClick={() => { setTempNames([...tempNames, name]); setNameInput(''); }}
                          className="w-full text-right p-3 text-xs font-bold hover:bg-blue-50 border-b last:border-none"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setAppliedNames(tempNames)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-xs hover:bg-blue-700"
                >
                  موافق
                </button>
                <button
                  onClick={() => { setTempNames([]); setAppliedNames([]); }}
                  className="bg-white border text-slate-500 px-4 py-3 rounded-xl font-black text-xs hover:bg-slate-50"
                >
                  إعادة ضبط
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {tempNames.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-black">
                    {name} <X size={10} className="cursor-pointer" onClick={() => setTempNames(tempNames.filter(n => n !== name))} />
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400">الفترة الزمنية</label>
              <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border">
                <Calendar size={14} className="text-slate-400" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400">من:</span>
                  <input type="date" className="text-xs font-bold outline-none" value={filterValues.start} onChange={e => setFilterValues({ ...filterValues, start: e.target.value })} />
                </div>
                <span className="mx-2 text-slate-300">|</span>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400">إلى:</span>
                  <input type="date" className="text-xs font-bold outline-none" value={filterValues.end} onChange={e => setFilterValues({ ...filterValues, end: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm border-collapse min-w-[1200px]">
            <thead className="bg-[#FFD966] text-slate-800 font-black">
              {activeMode === 'teachers' ? (
                <tr>
                  <th className="p-4 border-e border-slate-300 w-12">م</th>
                  <th className="p-4 border-e border-slate-300 w-64">اسم المعلم</th>
                  <th className="p-4 border-e border-slate-300 w-32">مادة</th>
                  <th className="p-4 border-e border-slate-300 w-32">الصف</th>
                  <th className="p-4 border-e border-slate-300 w-24">عدد التعهدات</th>
                  <th className="p-4 border-e border-slate-300">بيان المخالفة</th>
                  <th className="p-4 border-e border-slate-300 w-32">اليوم</th>
                  <th className="p-4 border-e border-slate-300 w-40">التاريخ</th>
                  <th className="p-4 border-e border-slate-300">الإجراء</th>
                  <th className="p-4 border-e border-slate-300 w-64">التوقيع</th>
                  <th className="p-4"></th>
                </tr>
              ) : (
                <tr>
                  <th className="p-4 border-e border-slate-300 w-12">م</th>
                  <th className="p-4 border-e border-slate-300 w-64">اسم الطالب</th>
                  <th className="p-4 border-e border-slate-300 w-32">الصف</th>
                  <th className="p-4 border-e border-slate-300 w-24">الشعبة</th>
                  <th className="p-4 border-e border-slate-300 w-24">عدد المخالفات</th>
                  <th className="p-4 border-e border-slate-300 w-40">التاريخ</th>
                  <th className="p-4 border-e border-slate-300">بيان المخالفة</th>
                  <th className="p-4 border-e border-slate-300">الإجراء المتخذ</th>
                  <th className="p-4 border-e border-slate-300 w-64">التوقيع</th>
                  <th className="p-4"></th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-16 text-slate-400 italic font-bold">لا توجد تعهدات مسجلة لهذه الفئة حالياً.</td>
                </tr>
              ) : (
                filteredData.map((v, idx) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors font-bold group">
                    <td className="p-4 border-e border-slate-100 bg-slate-50/50">{idx + 1}</td>

                    <td className="p-2 border-e border-slate-100 relative">
                      <input
                        className="w-full text-right bg-transparent outline-none focus:ring-1 ring-blue-200 rounded p-1"
                        value={activeMode === 'students' ? v.studentName : v.teacherName}
                        onChange={(e) => updateViolation(v.id, activeMode === 'students' ? 'studentName' : 'teacherName', e.target.value)}
                        placeholder="اكتب الاسم..."
                      />
                      {((activeMode === 'students' ? v.studentName : v.teacherName).length > 2) && (
                        <div className="absolute top-full left-0 right-0 z-[100] bg-white border shadow-xl rounded-lg max-h-32 overflow-y-auto hidden group-focus-within:block">
                          {(activeMode === 'students' ? studentList.map(s => s.name) : teacherList)
                            .filter(n => n.includes(activeMode === 'students' ? v.studentName : v.teacherName))
                            .map(suggestion => (
                              <button
                                key={suggestion}
                                onMouseDown={() => handleSelectSuggestion(v.id, suggestion)}
                                className="w-full text-right p-2 text-[10px] hover:bg-blue-50 border-b last:border-none"
                              >
                                {suggestion}
                              </button>
                            ))}
                        </div>
                      )}
                    </td>

                    {activeMode === 'teachers' ? (
                      <>
                        <td className="p-2 border-e border-slate-100">
                          <select className="w-full bg-transparent outline-none text-center" value={v.subject} onChange={(e) => updateViolation(v.id, 'subject', e.target.value)}>
                            <option value="">اختر...</option>
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="p-2 border-e border-slate-100">
                          <select className="w-full bg-transparent outline-none text-center" value={v.class} onChange={(e) => updateViolation(v.id, 'class', e.target.value)}>
                            <option value="">اختر...</option>
                            {grades.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 border-e border-slate-100">
                          <select className="w-full bg-transparent outline-none text-center" value={v.grade} onChange={(e) => updateViolation(v.id, 'grade', e.target.value)}>
                            <option value="">اختر...</option>
                            {grades.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </td>
                        <td className="p-2 border-e border-slate-100">
                          <select className="w-full bg-transparent outline-none text-center" value={v.section} onChange={(e) => updateViolation(v.id, 'section', e.target.value)}>
                            <option value="">اختر...</option>
                            {sections.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </>
                    )}

                    <td className="p-2 border-e border-slate-100">
                      <input type="number" className="w-16 text-center bg-transparent outline-none text-red-600 font-black" value={v.prevViolations} onChange={(e) => updateViolation(v.id, 'prevViolations', parseInt(e.target.value) || 0)} />
                    </td>

                    {activeMode === 'teachers' ? (
                      <>
                        <td className="p-2 border-e border-slate-100">
                          <div className="flex flex-col gap-1">
                            <select className="w-full bg-transparent outline-none text-[10px]" value={v.violation} onChange={(e) => updateViolation(v.id, 'violation', e.target.value)}>
                              <option value="">اختر أو اكتب...</option>
                              {violationOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <input className="w-full text-right p-1 bg-slate-50 text-[10px] rounded border-none outline-none" placeholder="اكتب هنا..." value={v.violation} onChange={(e) => updateViolation(v.id, 'violation', e.target.value)} />
                          </div>
                        </td>
                        <td className="p-2 border-e border-slate-100 text-[10px]">{v.day}</td>
                      </>
                    ) : null}

                    <td className="p-2 border-e border-slate-100">
                      <input type="date" className="w-full text-center bg-transparent outline-none text-[10px]" value={v.date} onChange={(e) => {
                        const newDay = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date(e.target.value));
                        updateViolation(v.id, 'date', e.target.value);
                        updateViolation(v.id, 'day', newDay);
                      }} />
                    </td>

                    {activeMode === 'students' ? (
                      <td className="p-2 border-e border-slate-100">
                        <input className="w-full text-right bg-transparent outline-none text-[11px]" value={v.violation} onChange={(e) => updateViolation(v.id, 'violation', e.target.value)} placeholder="..." />
                      </td>
                    ) : null}

                    <td className="p-2 border-e border-slate-100">
                      <input className="w-full text-right bg-transparent outline-none text-[11px]" value={v.procedure} onChange={(e) => updateViolation(v.id, 'procedure', e.target.value)} placeholder="الإجراء..." />
                    </td>

                    <td className="p-2 border-e border-slate-100">
                      <div className="flex flex-col gap-1">
                        {v.signature ? (
                          <div className="p-2 bg-green-50 text-green-700 text-[9px] font-bold rounded leading-relaxed border border-green-100">
                            {v.signature}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSignature(v.id)}
                            className="bg-slate-900 text-white px-4 py-1 rounded-lg text-[9px] font-black hover:bg-black transition-all"
                          >
                            توقيع البصمة
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-2">
                      <button onClick={() => deleteViolation(v.id)} className="text-red-300 hover:text-red-600 transition-colors">
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

// Memoized Row for performance optimization
const StudentRow = memo(({ s, optionsAr, optionsEn, lang, updateStudent, setShowNotesModal, toggleStar, isHighlighted, onRowClick }: {
  s: StudentReport;
  optionsAr: any;
  optionsEn: any;
  lang: string;
  updateStudent: (id: string, field: string, value: any) => void;
  setShowNotesModal: (s: any) => void;
  toggleStar: (id: string, type: any) => void;
  isHighlighted: boolean;
  onRowClick: (id: any) => void;
}) => {
  return (
    <tr onClick={() => onRowClick(s.id)} className={`transition-colors h-10 group cursor-pointer ${isHighlighted ? 'bg-cyan-50' : 'hover:bg-blue-50/20'}`}>
      <td className={`p-1 border-e border-slate-100 sticky right-0 z-10 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${isHighlighted ? 'bg-cyan-50' : 'bg-white group-hover:bg-blue-50'}`}>
        <div className="flex items-center gap-1 h-full">
          <button onClick={() => toggleStar(s.id, 'isExcellent')} title={lang === 'ar' ? 'إضافة للتميز' : 'Add to Excellence'}>
            <Star className={`w-3.5 h-3.5 ${s.isExcellent ? 'fill-green-500 text-green-500' : 'text-slate-300'}`} />
          </button>
          <button onClick={() => toggleStar(s.id, 'isBlacklisted')} title={lang === 'ar' ? 'إضافة للقائمة السوداء' : 'Add to Blacklist'}>
            <Star className={`w-3.5 h-3.5 ${s.isBlacklisted ? 'fill-slate-900 text-slate-900' : 'text-slate-300'}`} />
          </button>
          <input className="flex-1 bg-transparent border-none outline-none font-bold text-[10px] text-right" value={s.name} onChange={(e) => updateStudent(s.id, 'name', e.target.value)} />
        </div>
      </td>
      <td className="p-1 border-e border-slate-100">
        <select className="bg-transparent font-bold text-[9px] outline-none w-full appearance-none text-center" value={s.grade} onChange={(e) => updateStudent(s.id, 'grade', e.target.value)}>
          {optionsAr.grades.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.grades[optionsAr.grades.indexOf(o)]}</option>)}
        </select>
      </td>
      <td className="p-1 border-e border-slate-100">
        <select className="bg-transparent font-bold text-[9px] outline-none w-full appearance-none text-center" value={s.section} onChange={(e) => updateStudent(s.id, 'section', e.target.value)}>
          {optionsAr.sections.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.sections[optionsAr.sections.indexOf(o)]}</option>)}
        </select>
      </td>
      <td className="p-1 border-e border-slate-100">
        <select className="bg-transparent font-bold text-[9px] outline-none w-full appearance-none text-center" value={s.gender} onChange={(e) => updateStudent(s.id, 'gender', e.target.value)}>
          {optionsAr.gender.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.gender[optionsAr.gender.indexOf(o)]}</option>)}
        </select>
      </td>
      <td className="p-1 border-e border-slate-100">
        <div className="flex flex-col gap-0.5">
          <input className="w-full text-[9px] text-right bg-transparent outline-none" value={s.address} onChange={(e) => updateStudent(s.id, 'address', e.target.value)} placeholder="..." />
          <select className="text-[8px] bg-slate-50/50 appearance-none text-center" value={s.workOutside} onChange={(e) => updateStudent(s.id, 'workOutside', e.target.value)}>
            {optionsAr.workOutside.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.workOutside[optionsAr.workOutside.indexOf(o)]}</option>)}
          </select>
        </div>
      </td>
      <td className="p-1 border-e border-slate-100">
        <div className="flex flex-col gap-0.5">
          <select className={`text-[9px] font-bold appearance-none text-center outline-none bg-transparent ${s.healthStatus === 'مريض' ? 'text-red-600' : ''}`} value={s.healthStatus} onChange={(e) => updateStudent(s.id, 'healthStatus', e.target.value)}>
            {optionsAr.health.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.health[optionsAr.health.indexOf(o)]}</option>)}
          </select>
          {s.healthStatus === 'مريض' && <input className="text-[8px] text-center border-b outline-none text-red-500" value={s.healthDetails} onChange={(e) => updateStudent(s.id, 'healthDetails', e.target.value)} />}
        </div>
      </td>
      <td className="p-1 border-e border-slate-100">
        <div className="flex flex-col gap-0.5">
          <input className="text-[9px] font-bold text-right outline-none bg-transparent" value={s.guardianName} onChange={(e) => updateStudent(s.id, 'guardianName', e.target.value)} />
          {s.guardianPhones.map((p: any, i: any) => (
            <div key={i} className="flex gap-0.5 items-center">
              <input className="text-[8px] w-full text-center bg-slate-50/50 outline-none" value={p} onChange={(e) => {
                const newP = [...s.guardianPhones]; newP[i] = e.target.value; updateStudent(s.id, 'guardianPhones', newP);
              }} />
            </div>
          ))}
        </div>
      </td>
      <td className="p-1 border-e border-slate-100 bg-[#FFF2CC]/5">
        <select className={`text-[9px] w-full appearance-none text-center outline-none bg-transparent ${s.academicReading.includes('ضعيف') ? 'text-red-600 font-black' : ''}`} value={s.academicReading} onChange={(e) => updateStudent(s.id, 'academicReading', e.target.value)}>
          {optionsAr.level.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.level[optionsAr.level.indexOf(o)]}</option>)}
        </select>
      </td>
      <td className="p-1 border-e border-slate-100 bg-[#FFF2CC]/5">
        <select className={`text-[9px] w-full appearance-none text-center outline-none bg-transparent ${s.academicWriting.includes('ضعيف') ? 'text-red-600 font-black' : ''}`} value={s.academicWriting} onChange={(e) => updateStudent(s.id, 'academicWriting', e.target.value)}>
          {optionsAr.level.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.level[optionsAr.level.indexOf(o)]}</option>)}
        </select>
      </td>
      <td className="p-1 border-e border-slate-100 bg-[#FFF2CC]/5">
        <select className={`text-[9px] w-full appearance-none text-center outline-none bg-transparent ${s.academicParticipation.includes('ضعيف') ? 'text-red-600 font-black' : ''}`} value={s.academicParticipation} onChange={(e) => updateStudent(s.id, 'academicParticipation', e.target.value)}>
          {optionsAr.level.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.level[optionsAr.level.indexOf(o)]}</option>)}
        </select>
      </td>
      <td className="p-1 border-e border-slate-100">
        <select className={`text-[9px] font-bold w-full appearance-none text-center outline-none bg-transparent ${s.behaviorLevel.includes('ضعيف') ? 'text-red-600' : ''}`} value={s.behaviorLevel} onChange={(e) => updateStudent(s.id, 'behaviorLevel', e.target.value)}>
          {optionsAr.behavior.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.behavior[optionsAr.behavior.indexOf(o)]}</option>)}
        </select>
      </td>
      <td className="p-1 border-e border-slate-100">
        <div className="flex flex-wrap gap-0.5 justify-center max-w-[180px]">
          {optionsAr.mainNotes.map((n: any, nIdx: any) => (
            <button key={n} onClick={() => {
              const newN = s.mainNotes.includes(n) ? s.mainNotes.filter((x: any) => x !== n) : [...s.mainNotes, n];
              updateStudent(s.id, 'mainNotes', newN);
            }} className={`text-[7px] px-1 py-0.5 rounded border leading-none ${s.mainNotes.includes(n) ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
              {lang === 'ar' ? n : optionsEn.mainNotes[nIdx]}
            </button>
          ))}
          <input className="text-[8px] border-b w-full mt-0.5 text-center outline-none" value={s.otherNotesText} onChange={(e) => updateStudent(s.id, 'otherNotesText', e.target.value)} />
        </div>
      </td>
      <td className="p-1 border-e border-slate-100 bg-[#DDEBF7]/5">
        <select className="text-[8px] w-full appearance-none text-center outline-none bg-transparent" value={s.guardianEducation} onChange={(e) => updateStudent(s.id, 'guardianEducation', e.target.value)}>
          {optionsAr.eduStatus.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.eduStatus[optionsAr.eduStatus.indexOf(o)]}</option>)}
        </select>
      </td>
      <td className="p-1 border-e border-slate-100 bg-[#DDEBF7]/5">
        <select className={`text-[8px] w-full appearance-none text-center outline-none bg-transparent ${s.guardianFollowUp === 'ضعيفة' ? 'text-red-600 font-bold' : ''}`} value={s.guardianFollowUp} onChange={(e) => updateStudent(s.id, 'guardianFollowUp', e.target.value)}>
          {optionsAr.followUp.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.followUp[optionsAr.followUp.indexOf(o)]}</option>)}
        </select>
      </td>
      <td className="p-1 border-e border-slate-100 bg-[#DDEBF7]/5">
        <select className={`text-[8px] w-full appearance-none text-center outline-none bg-transparent ${s.guardianCooperation === 'عدواني' || s.guardianCooperation === 'ضعيفة' ? 'text-red-600 font-bold' : ''}`} value={s.guardianCooperation} onChange={(e) => updateStudent(s.id, 'guardianCooperation', e.target.value)}>
          {optionsAr.cooperation.map((o: any) => <option key={o} value={o}>{lang === 'ar' ? o : optionsEn.cooperation[optionsAr.cooperation.indexOf(o)]}</option>)}
        </select>
      </td>
      <td className="p-1">
        <button onClick={() => setShowNotesModal({ id: s.id, text: s.notes })} className="p-1.5 bg-slate-100 hover:bg-blue-100 rounded-lg transition-all">
          {s.notes ? <CheckCircle size={14} className="text-green-500" /> : <Settings2 size={14} className="text-slate-400" />}
        </button>
      </td>
    </tr>
  );
});

export const StudentsReportsPage: React.FC = () => {
  const { data, updateData, lang } = useGlobal();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterValue, setFilterValue] = useState('');
  const [selectedStudentNames, setSelectedStudentNames] = useState<string[]>([]);
  const [studentInput, setStudentInput] = useState('');
  const [activeMetricFilter, setActiveMetricFilter] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState<{ id: string, text: string } | null>(null);
  const [metricFilterMode, setMetricFilterMode] = useState(false);
  const [showSpecificFilterModal, setShowSpecificFilterModal] = useState(false);

  const [selectedSpecifics, setSelectedSpecifics] = useState<string[]>([]);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);

  // Requirement: Detail Modal Features
  const [showIndividualReportModal, setShowIndividualReportModal] = useState(false);
  const [detailModalSearch, setDetailModalSearch] = useState('');
  const [currentDetailStudent, setCurrentDetailStudent] = useState<StudentReport | null>(null);
  const [activeDetailFields, setActiveDetailFields] = useState<string[]>(['name', 'grade', 'section', 'gender', 'healthStatus', 'guardianInfo', 'academic', 'behaviorLevel', 'mainNotes', 'guardianFollowUp', 'notes']);

  // Requirement: WhatsApp Selection Implementation
  const [waSelector, setWaSelector] = useState<{ type: 'bulk' | 'single', student?: StudentReport } | null>(null);
  const [waSelectedFields, setWaSelectedFields] = useState<string[]>(['all']);

  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<StudentReport[]>([]);

  const waFieldOptions = [
    { key: 'all', label: 'جميع البيانات' },
    { key: 'name', label: 'اسم الطالب' },
    { key: 'grade', label: 'الصف' },
    { key: 'section', label: 'الشعبة' },
    { key: 'gender', label: 'النوع' },
    { key: 'address_work', label: 'السكن/ العمل' },
    { key: 'health', label: 'الحالة الصحية' },
    { key: 'guardian', label: 'ولي الأمر (الاسم، الهاتف)' },
    { key: 'academic', label: 'المستوى العلمي (قراءة، كتابة، مشاركة)' },
    { key: 'behavior', label: 'المستوى السلوكي' },
    { key: 'main_notes', label: 'الملاحظات الأساسية' },
    { key: 'guardian_followup', label: 'ولي الأمر المتابع (تعليم، متابعة، تعاون)' },
    { key: 'other_notes', label: 'ملاحظات أخرى' },
  ];

  // New States for Blacklist and Excellence lists
  const [showListModal, setShowListModal] = useState<'blacklist' | 'excellence' | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [tempListSelected, setTempListSelected] = useState<string[]>([]);

  const studentData = data.studentReports || [];

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

  const optionsEn = {
    gender: ["Male", "Female"],
    workOutside: ["Doesn't Work", "Works"],
    health: ["Excellent", "Ill"],
    level: ["Excellent", "Average", "Good", "Weak", "Very Weak"],
    behavior: ["Excellent", "Average", "Good", "Very Good", "Acceptable", "Weak", "Very Weak"],
    mainNotes: ["Excellent", "Talkative", "Riotous", "Aggressive", "Teacher Assault", "Physical Assault", "Verbal Assault", "Stealing", "Property Damage", "School Damage"],
    eduStatus: ["Educated", "Weak", "Illiterate"],
    followUp: ["Excellent", "Average", "Weak"],
    cooperation: ["Excellent", "Average", "Weak", "Complaining", "Critical", "Aggressive"],
    grades: ["Pre-K", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"],
    sections: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
  };

  const options = lang === 'ar' ? optionsAr : optionsEn;

  const metricLabels: Record<string, string> = lang === 'ar' ? {
    gender: "النوع",
    grade: "الصف",
    section: "الشعبة",
    workOutside: "العمل خارج المدرسة",
    healthStatus: "الحالة الصحية",
    academicReading: "القراءة",
    academicWriting: "الكتابة",
    behaviorLevel: "المستوى السلوكي",
    guardianEducation: "تعليم ولي الأمر",
    guardianFollowUp: "متابعة ولي الأمر",
    guardianCooperation: "تعاون ولي الأمر"
  } : {
    gender: "Gender",
    grade: "Grade",
    section: "Section",
    workOutside: "Work Outside",
    healthStatus: "Health Status",
    academicReading: "Reading",
    academicWriting: "Writing",
    behaviorLevel: "Behavior Level",
    guardianEducation: "Guardian Education",
    guardianFollowUp: "Guardian Follow-up",
    guardianCooperation: "Guardian Cooperation"
  };

  const detailFieldConfigs = [
    { key: 'name', label: 'اسم الطالب', color: 'border-blue-500' },
    { key: 'grade', label: 'الصف', color: 'border-indigo-500' },
    { key: 'section', label: 'الشعبة', color: 'border-purple-500' },
    { key: 'gender', label: 'النوع', color: 'border-pink-500' },
    { key: 'address', label: 'السكن/ العمل', color: 'border-orange-500' },
    { key: 'healthStatus', label: 'الحالة الصحية', color: 'border-red-500' },
    { key: 'guardianInfo', label: 'ولي الأمر', color: 'border-emerald-500' },
    { key: 'academic', label: 'المستوى العلمي', color: 'border-yellow-500' },
    { key: 'behaviorLevel', label: 'المستوى السلوكي', color: 'border-teal-500' },
    { key: 'mainNotes', label: 'الملاحظات الأساسية', color: 'border-rose-500' },
    { key: 'guardianFollowUp', label: 'ولي الأمر المتابع', color: 'border-cyan-500' },
    { key: 'notes', label: 'ملاحظات أخرى', color: 'border-slate-500' },
  ];

  const updateStudent = (id: string, field: string, value: any) => {
    const updated = studentData.map(s => s.id === id ? { ...s, [field]: value } : s);
    updateData({ studentReports: updated });
  };

  const addStudent = () => {
    const newStudent: StudentReport = {
      id: Date.now().toString(),
      name: '',
      gender: options.gender[0],
      grade: options.grades[0],
      section: options.sections[0],
      address: '',
      workOutside: options.workOutside[0],
      healthStatus: options.health[0],
      healthDetails: '',
      guardianName: '',
      guardianPhones: [''],
      academicReading: options.level[0],
      academicWriting: options.level[0],
      academicParticipation: options.level[0],
      behaviorLevel: options.behavior[0],
      mainNotes: [],
      otherNotesText: '',
      guardianEducation: options.eduStatus[0],
      guardianFollowUp: options.followUp[0],
      guardianCooperation: options.cooperation[0],
      notes: '',
      createdAt: new Date().toISOString()
    };
    updateData({ studentReports: [...studentData, newStudent] });
  };

  const handleDeleteDuplicates = () => {
    if (!confirm(lang === 'ar' ? 'سيتم حذف جميع السجلات المكررة (الاسم، الصف، الشعبة) والإبقاء على الأقدم فقط. هل أنت متأكد؟' : 'All duplicate records (Name, Grade, Section) will be deleted, keeping only the oldest. Are you sure?')) return;

    const seen = new Map<string, StudentReport>();
    const toKeep: StudentReport[] = [];

    const sortedData = [...studentData].sort((a, b) =>
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );

    sortedData.forEach(s => {
      const key = `${s.name.trim()}-${s.grade}-${s.section}`;
      if (!seen.has(key)) {
        seen.set(key, s);
        toKeep.push(s);
      }
    });

    if (toKeep.length === studentData.length) {
      alert(lang === 'ar' ? 'لا يوجد تكرار لحذفه' : 'No duplicates found to delete');
      return;
    }

    updateData({ studentReports: toKeep });
    alert(lang === 'ar' ? `تم حذف ${studentData.length - toKeep.length} سجل مكرر` : `Deleted ${studentData.length - toKeep.length} duplicate records`);
  };

  const bulkAutoFill = () => {
    if (!confirm(lang === 'ar' ? 'سيتم تعبئة الخيار الأول لجميع الحقول في كافة الطلاب. استمرار؟' : 'Auto-fill first option for all students?')) return;
    const updated = studentData.map(s => ({
      ...s,
      healthStatus: optionsAr.health[0],
      guardianFollowUp: optionsAr.followUp[0],
      guardianEducation: optionsAr.eduStatus[0],
      guardianCooperation: optionsAr.cooperation[0],
      academicReading: optionsAr.level[0],
      academicWriting: optionsAr.level[0],
      academicParticipation: optionsAr.level[0],
      behaviorLevel: optionsAr.behavior[0],
      workOutside: optionsAr.workOutside[0],
    }));
    updateData({ studentReports: updated });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const dataXLSX = XLSX.utils.sheet_to_json(ws);
      const imported = dataXLSX.map((row: any) => ({
        id: Date.now().toString() + Math.random(),
        name: row['اسم الطالب'] || '',
        gender: row['النوع'] || optionsAr.gender[0],
        grade: row['الصف'] || optionsAr.grades[0],
        section: row['الشعبة'] || optionsAr.sections[0],
        address: row['عنوان السكن'] || '',
        workOutside: row['العمل'] || optionsAr.workOutside[0],
        healthStatus: row['الحالة الصحية'] || optionsAr.health[0],
        guardianName: row['ولي الأمر'] || '',
        guardianPhones: [row['الهاتف'] || ''],
        academicReading: optionsAr.level[0], academicWriting: optionsAr.level[0], academicParticipation: optionsAr.level[0],
        behaviorLevel: optionsAr.behavior[0], mainNotes: [], otherNotesText: '', guardianEducation: optionsAr.eduStatus[0],
        guardianFollowUp: optionsAr.followUp[0], guardianCooperation: optionsAr.cooperation[0], notes: '', createdAt: new Date().toISOString()
      }));

      // Check for duplicates
      const duplicates = (imported as any[]).filter(imp =>
        studentData.some(existing =>
          existing.name.trim() === imp.name.trim() &&
          existing.grade === imp.grade &&
          existing.section === imp.section
        )
      );

      if (duplicates.length > 0) {
        setPendingImportData(imported as any);
        setShowImportConfirmModal(true);
      } else {
        updateData({ studentReports: [...studentData, ...imported as any] });
        alert(lang === 'ar' ? 'تم استيراد البيانات بنجاح' : 'Data imported successfully');
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  const filteredData = useMemo(() => {
    let result = [...studentData];
    if (filterMode === 'blacklist' || filterMode === 'excellence') {
      if (selectedStudentNames.length === 0) return [];
      result = result.filter(s => selectedStudentNames.includes(s.name));
    } else if (filterMode === 'student') {
      if (selectedStudentNames.length === 0) return [];
      result = result.filter(s => selectedStudentNames.some(name => s.name.toLowerCase().includes(name.toLowerCase())));
    } else if (filterMode === 'grade' && filterValue) {
      result = result.filter(s => s.grade === filterValue);
    } else if (filterMode === 'section' && filterValue) {
      result = result.filter(s => s.section === filterValue);
    } else if (filterMode === 'specific' && selectedSpecifics.length > 0) {
      result = result.filter(s =>
        selectedSpecifics.includes(s.healthStatus) ||
        selectedSpecifics.includes(s.behaviorLevel) ||
        selectedSpecifics.includes(s.grade) ||
        selectedSpecifics.includes(s.section) ||
        s.mainNotes.some(n => selectedSpecifics.includes(n))
      );
    }
    return result;
  }, [studentData, filterMode, filterValue, selectedSpecifics, selectedStudentNames]);

  const suggestions = useMemo(() => {
    if (!studentInput.trim()) return [];
    return studentData
      .filter(s => s.name.toLowerCase().includes(studentInput.toLowerCase()))
      .map(s => s.name)
      .filter((name, idx, self) => self.indexOf(name) === idx && !selectedStudentNames.includes(name));
  }, [studentInput, studentData, selectedStudentNames]);

  const listItemsToDisplay = useMemo(() => {
    if (!showListModal) return [];
    const isBlacklist = showListModal === 'blacklist';
    return studentData
      .filter(s => isBlacklist ? s.isBlacklisted : s.isExcellent)
      .filter(s => s.name.toLowerCase().includes(listSearch.toLowerCase()));
  }, [showListModal, studentData, listSearch]);

  const isOnlyMetricView = filterMode === 'metric' && activeMetricFilter.length > 0;

  const addStudentToFilter = (name?: string) => {
    const targetName = name || studentInput.trim();
    if (targetName && !selectedStudentNames.includes(targetName)) {
      setSelectedStudentNames(prev => [...prev, targetName]);
      setStudentInput('');
    }
  };

  const handleListApply = () => {
    if (tempListSelected.length > 0) {
      setSelectedStudentNames(tempListSelected);
      setFilterMode(showListModal === 'blacklist' ? 'blacklist' : 'excellence');
    }
    setShowListModal(null);
    setTempListSelected([]);
    setListSearch('');
  };

  const toggleStar = (id: string, type: 'isBlacklisted' | 'isExcellent') => {
    const student = studentData.find(s => s.id === id);
    if (student) {
      updateStudent(id, type, !student[type]);
    }
  };

  // START OF CHANGE - Surgical modification for WhatsApp Rich Formatting and Logic
  const formatWAValue = (val: string) => {
    const isWeak = val.includes('ضعيف') || val.includes('مريض') || val.includes('عدواني') || val.includes('مخالفة') || val.includes('مقبول');
    return isWeak ? `🔴 *${val}*` : `🔹 ${val}`;
  };

  const constructWAMessage = (studentsList: StudentReport[], fields: string[]) => {
    let text = `*📋 تقرير شؤون الطلاب*\n`;
    text += `*المدرسة:* ${data.profile.schoolName || '---'}\n`;
    text += `*التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n`;
    text += `----------------------------------\n\n`;

    studentsList.forEach((s, i) => {
      text += `*🔹 الطالب (${i + 1}):*\n`;
      const isAll = fields.includes('all');

      if (isAll || fields.includes('name')) text += `👤 *الاسم:* ${s.name}\n`;
      if (isAll || fields.includes('grade')) text += `📍 *الصف:* ${s.grade}\n`;
      if (isAll || fields.includes('section')) text += `🏁 *الشعبة:* ${s.section}\n`;
      if (isAll || fields.includes('gender')) text += `🚻 *النوع:* ${s.gender}\n`;
      if (isAll || fields.includes('address_work')) {
        text += `🏠 *السكن:* ${s.address || '---'}\n`;
        text += `💼 *العمل:* ${s.workOutside}\n`;
      }
      if (isAll || fields.includes('health')) {
        text += `🏥 *الحالة الصحية:* ${formatWAValue(s.healthStatus)}${s.healthDetails ? ` (${s.healthDetails})` : ''}\n`;
      }
      if (isAll || fields.includes('guardian')) {
        text += `👨‍👩‍👧 *ولي الأمر:* ${s.guardianName || '---'}\n`;
        text += `📞 *الهواتف:* ${s.guardianPhones.join(' - ')}\n`;
      }
      if (isAll || fields.includes('academic')) {
        text += `📚 *المستوى العلمي:*\n`;
        text += `   📖 قراءة: ${formatWAValue(s.academicReading)}\n`;
        text += `   ✍️ الكتابة: ${formatWAValue(s.academicWriting)}\n`;
        text += `   🙋 المشاركة: ${formatWAValue(s.academicParticipation)}\n`;
      }
      if (isAll || fields.includes('behavior')) {
        text += `🎭 *المستوى السلوكي:* ${formatWAValue(s.behaviorLevel)}\n`;
      }
      if (isAll || fields.includes('main_notes')) {
        if (s.mainNotes.length > 0) {
          text += `⚠️ *الملاحظات الأساسية:*\n`;
          s.mainNotes.forEach(n => text += `   🔴 ${n}\n`);
        } else {
          text += `⚠️ *الملاحظات الأساسية:* ---\n`;
        }
      }
      if (isAll || fields.includes('guardian_followup')) {
        text += `🤝 *متابعة ولي الأمر:*\n`;
        text += `   🎓 التعليم: ${s.guardianEducation}\n`;
        text += `   📈 المتابعة: ${formatWAValue(s.guardianFollowUp)}\n`;
        text += `   🤝 التعاون: ${formatWAValue(s.guardianCooperation)}\n`;
      }
      if (isAll || fields.includes('other_notes')) {
        if (s.notes) text += `📝 *ملاحظات أخرى:* ${s.notes}\n`;
        if (s.otherNotesText) text += `🔖 *ملاحظات برمجية:* ${s.otherNotesText}\n`;
      }
      text += `----------------------------------\n`;
    });

    const profile = data.profile;
    if (profile.schoolName || profile.branch) {
      text += `🏫 *${profile.schoolName || ''}${profile.branch ? `، فرع ${profile.branch}` : ''}*\n`;
    }

    return text;
  };

  const finalSendWhatsApp = () => {
    if (!waSelector) return;
    const studentsList = waSelector.type === 'single' ? [waSelector.student!] : filteredData;
    const fields = waSelectedFields;

    const text = constructWAMessage(studentsList, fields);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setWaSelector(null);
  };
  // END OF CHANGE

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData.map(s => ({
      'اسم الطالب': s.name,
      'الصف': s.grade,
      'الشعبة': s.section,
      'النوع': s.gender,
      'العنوان': s.address,
      'العمل': s.workOutside,
      'الحالة الصحية': s.healthStatus,
      'تفاصيل الصحة': s.healthDetails,
      'ولي الأمر': s.guardianName,
      'الهواتف': s.guardianPhones.join(', '),
      'القراءة': s.academicReading,
      'الكتابة': s.academicWriting,
      'المشاركة': s.academicParticipation,
      'السلوك': s.behaviorLevel,
      'الملاحظات': s.mainNotes.join(', '),
      'تعليم الولي': s.guardianEducation,
      'متابعة الولي': s.guardianFollowUp,
      'تعاون الولي': s.guardianCooperation,
      'ملاحظات أخرى': s.notes
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, `Students_Report_${new Date().getTime()}.xlsx`);
  };

  const exportToTxt = () => {
    const text = constructWAMessage(filteredData, ['all']).replace(/\*/g, '');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Students_Report_${new Date().getTime()}.txt`;
    link.click();
  };

  const sendWhatsApp = () => {
    setWaSelector({ type: 'bulk' });
  };

  // Requirement: Detail Modal Activation & Optimization
  const handleDetailStudentSearch = (val: string) => {
    setDetailModalSearch(val);
    const found = studentData.find(s => s.name === val);
    if (found) {
      setCurrentDetailStudent({ ...found });
    } else {
      setCurrentDetailStudent(null);
    }
  };

  const toggleDetailField = (key: string) => {
    setActiveDetailFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const saveDetailStudent = () => {
    if (currentDetailStudent) {
      const updated = studentData.map(s => s.id === currentDetailStudent.id ? currentDetailStudent : s);
      updateData({ studentReports: updated });
      setShowIndividualReportModal(false);
      setCurrentDetailStudent(null);
      setDetailModalSearch('');
      alert('تم تحديث بيانات الطالب بنجاح');
    }
  };

  const sendDetailWhatsApp = () => {
    if (currentDetailStudent) {
      setWaSelector({ type: 'single', student: currentDetailStudent });
    }
  };

  return (
    <div className="space-y-4 font-arabic animate-in fade-in duration-150">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={addStudent} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-blue-700 shadow-md transform active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> {lang === 'ar' ? 'إضافة طالب' : 'Add Student'}
          </button>

          <button
            onClick={() => setShowIndividualReportModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-emerald-700 shadow-md transform active:scale-95 transition-all"
          >
            <FileText className="w-4 h-4" /> {lang === 'ar' ? 'تقرير طالب' : 'Student Report'}
          </button>

          <label className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2.5 rounded-xl font-bold text-sm border border-green-200 cursor-pointer hover:bg-green-100 transition-all">
            <Upload className="w-4 h-4" /> {lang === 'ar' ? 'استيراد ملف' : 'Import File'}
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
          </label>

          <button
            onClick={handleDeleteDuplicates}
            className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2.5 rounded-xl font-bold text-sm border border-red-200 hover:bg-red-100 transition-all"
          >
            <Trash2 size={16} /> {lang === 'ar' ? 'حذف التكرار' : 'Delete Duplicates'}
          </button>

          <button onClick={bulkAutoFill} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2.5 rounded-xl font-bold text-sm border border-purple-200 hover:bg-purple-100 transition-all">
            <Sparkles className="w-4 h-4" /> {lang === 'ar' ? 'التعبئة التلقائية' : 'Auto Fill'}
          </button>
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button onClick={exportToTxt} className="p-2.5 hover:bg-white text-slate-600 rounded-lg transition-all" title="TXT">
              <FileText className="w-4 h-4" />
            </button>
            <button onClick={exportToExcel} className="p-2.5 hover:bg-white text-green-600 rounded-lg transition-all" title="Excel">
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button onClick={sendWhatsApp} className="p-2.5 hover:bg-white text-green-500 rounded-lg transition-all" title="WhatsApp">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-right">
          <button onClick={() => setShowListModal('excellence')} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl font-black text-sm hover:bg-green-700 transition-all shadow-sm">
            <Star className="w-4 h-4 fill-white" /> {lang === 'ar' ? 'قائمة التميز' : 'Excellence List'}
          </button>
          <button onClick={() => setShowListModal('blacklist')} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl font-black text-sm hover:bg-slate-900 transition-all shadow-sm">
            <AlertCircle className="w-4 h-4" /> {lang === 'ar' ? 'القائمة السوداء' : 'Blacklist'}
          </button>

          <div className="relative">
            <button onClick={() => setShowFilterModal(!showFilterModal)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm ${showFilterModal ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <Filter className="w-4 h-4" /> {lang === 'ar' ? 'فلترة متقدمة' : 'Advanced Filter'}
            </button>
            {showFilterModal && (
              <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-[85vw] sm:w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-[100] animate-in fade-in zoom-in duration-200 space-y-4 text-right">
                <button onClick={() => { setFilterMode('all'); setSelectedStudentNames([]); }} className="w-full text-right p-3 rounded-xl font-bold text-sm hover:bg-slate-50 flex items-center justify-between">{lang === 'ar' ? 'الجميع' : 'All'} {filterMode === 'all' && <Check className="w-4 h-4" />}</button>

                <div className="border rounded-xl p-2 bg-slate-50">
                  <button onClick={() => setFilterMode('student')} className="w-full text-right p-2 rounded-lg font-bold text-sm hover:bg-white flex items-center justify-between">{lang === 'ar' ? 'حسب الطالب' : 'By Student'} {filterMode === 'student' && <Check className="w-4 h-4" />}</button>
                  {filterMode === 'student' && (
                    <div className="mt-2 space-y-2 relative">
                      <div className="flex gap-1">
                        <input
                          type="text"
                          className="flex-1 text-[10px] p-2 rounded border outline-none"
                          placeholder={lang === 'ar' ? 'اسم الطالب...' : 'Name...'}
                          value={studentInput}
                          onChange={(e) => setStudentInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addStudentToFilter()}
                        />
                        <button onClick={() => addStudentToFilter()} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"><Plus size={14} /></button>
                      </div>
                      {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                          {suggestions.map((name, idx) => (
                            <button
                              key={idx}
                              onClick={() => addStudentToFilter(name)}
                              className="w-full text-right p-2 text-[10px] font-bold hover:bg-blue-50 border-b border-slate-50 last:border-none"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {selectedStudentNames.map(name => (
                          <span key={name} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[9px] flex items-center gap-1">
                            {name} <X size={10} className="cursor-pointer" onClick={() => setSelectedStudentNames(prev => prev.filter(n => n !== name))} />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => setMetricFilterMode(true)} className="w-full text-right p-3 rounded-xl font-bold text-sm hover:bg-slate-50 flex items-center justify-between">{lang === 'ar' ? 'حسب المعيار' : 'By Metric'} {isOnlyMetricView && <Check className="w-4 h-4" />}</button>
                <button onClick={() => setShowSpecificFilterModal(true)} className="w-full text-right p-3 rounded-xl font-bold text-sm hover:bg-slate-50 flex items-center justify-between">{lang === 'ar' ? 'حسب صفة معينة' : 'By Feature'} {filterMode === 'specific' && <Check className="w-4 h-4" />}</button>

                <div className="pt-2 border-t">
                  <button
                    onClick={() => setShowFilterModal(false)}
                    className="w-full bg-blue-600 text-white p-2.5 rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-md active:scale-95"
                  >
                    {lang === 'ar' ? 'تطبيق' : 'Apply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto scroll-smooth max-h-[75vh]">
          <table className={`w-full text-center border-collapse table-auto ${isOnlyMetricView ? 'min-w-[700px]' : 'min-w-[1600px]'}`}>
            <thead className="bg-[#FFD966] text-slate-800 sticky top-0 z-20">
              <tr className="border-b border-slate-300 h-12">
                <th rowSpan={2} className="px-3 border-e border-slate-300 w-[160px] text-xs font-black sticky right-0 bg-[#FFD966] z-30">{lang === 'ar' ? 'اسم الطالب' : 'Student Name'}</th>
                <th rowSpan={2} className="px-1 border-e border-slate-300 w-20 text-xs font-black">{lang === 'ar' ? 'الصف' : 'Grade'}</th>
                <th rowSpan={2} className="px-1 border-e border-slate-300 w-16 text-xs font-black">{lang === 'ar' ? 'الشعبة' : 'Section'}</th>

                {!isOnlyMetricView && (
                  <>
                    <th rowSpan={2} className="px-1 border-e border-slate-300 w-16 text-xs font-black">{lang === 'ar' ? 'النوع' : 'Gender'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-24 text-xs font-black">{lang === 'ar' ? 'السكن / العمل' : 'Residence / Work'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-24 text-xs font-black">{lang === 'ar' ? 'الحالة الصحية' : 'Health Status'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-32 text-xs font-black">{lang === 'ar' ? 'ولي الأمر (الاسم/الهواتف)' : 'Guardian (Name/Phones)'}</th>
                    <th colSpan={3} className="px-1 border-e border-slate-300 bg-[#FFF2CC] text-xs font-black">{lang === 'ar' ? 'المستوى العلمي' : 'Academic Level'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-24 text-xs font-black">{lang === 'ar' ? 'المستوى السلوكي' : 'Behavior Level'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-44 text-xs font-black">{lang === 'ar' ? 'الملاحظات الأساسية' : 'Main Notes'}</th>
                    <th colSpan={3} className="px-1 border-e border-slate-300 bg-[#DDEBF7] text-xs font-black">{lang === 'ar' ? 'ولي الأمر المتابع' : 'Guardian Follow-up'}</th>
                    <th rowSpan={2} className="px-2 w-10 text-xs font-black">{lang === 'ar' ? 'ملاحظات أخرى' : 'Other Notes'}</th>
                  </>
                )}

                {isOnlyMetricView && activeMetricFilter.map(mKey => (
                  <th key={mKey} className="px-4 border-e border-slate-300 text-xs font-black">{metricLabels[mKey]}</th>
                ))}
              </tr>

              {!isOnlyMetricView && (
                <tr className="bg-[#F2F2F2] text-[9px] h-8">
                  <th className="border-e border-slate-300 bg-[#FFF2CC]/50">{lang === 'ar' ? 'قراءة' : 'Read'}</th>
                  <th className="border-e border-slate-300 bg-[#FFF2CC]/50">{lang === 'ar' ? 'كتابة' : 'Write'}</th>
                  <th className="border-e border-slate-300 bg-[#FFF2CC]/50">{lang === 'ar' ? 'مشاركة' : 'Part'}</th>
                  <th className="border-e border-slate-300 bg-[#DDEBF7]/50">{lang === 'ar' ? 'تعليم' : 'Edu'}</th>
                  <th className="border-e border-slate-300 bg-[#DDEBF7]/50">{lang === 'ar' ? 'متابعة' : 'Follow'}</th>
                  <th className="border-e border-slate-300 bg-[#DDEBF7]/50">{lang === 'ar' ? 'تعاون' : 'Coop'}</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={isOnlyMetricView ? 3 + activeMetricFilter.length : 15} className="py-10 text-slate-400 italic text-sm">
                    {(filterMode === 'student' || filterMode === 'blacklist' || filterMode === 'excellence') && selectedStudentNames.length === 0
                      ? (lang === 'ar' ? 'يرجى اختيار أسماء الطلاب من القائمة للعرض' : 'Please select student names to display')
                      : (lang === 'ar' ? 'لا توجد بيانات تطابق هذا البحث' : 'No data matching this search')}
                  </td>
                </tr>
              ) : (
                filteredData.map((s, idx) => (
                  <StudentRow
                    key={s.id}
                    s={s}
                    optionsAr={optionsAr}
                    optionsEn={optionsEn}
                    lang={lang}
                    updateStudent={updateStudent}
                    setShowNotesModal={setShowNotesModal}
                    toggleStar={toggleStar}
                    isHighlighted={highlightedRow === s.id}
                    onRowClick={setHighlightedRow}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showListModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-right">
            <h3 className={`font-black ${showListModal === 'blacklist' ? 'text-slate-800' : 'text-green-600'}`}>
              {showListModal === 'blacklist' ? (lang === 'ar' ? 'القائمة السوداء' : 'Blacklist') : (lang === 'ar' ? 'قائمة التميز' : 'Excellence List')}
            </h3>
            <div className="relative">
              <input
                className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-right text-sm font-bold outline-none pr-10"
                placeholder={lang === 'ar' ? 'بحث عن اسم...' : 'Search for name...'}
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-xl p-2 text-right">
              {listItemsToDisplay.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic text-xs">{lang === 'ar' ? 'لا توجد أسماء مضافة' : 'No names added'}</div>
              ) : (
                listItemsToDisplay.map(s => (
                  <label key={s.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600"
                      checked={tempListSelected.includes(s.name)}
                      onChange={(e) => {
                        if (e.target.checked) setTempListSelected([...tempListSelected, s.name]);
                        else setTempListSelected(tempListSelected.filter(n => n !== s.name));
                      }}
                    />
                    <span className="text-sm font-bold">{s.name}</span>
                  </label>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleListApply} className="flex-1 bg-blue-600 text-white p-3 rounded-2xl font-black">{lang === 'ar' ? 'موافق' : 'OK'}</button>
              <button onClick={() => { setShowListModal(null); setTempListSelected([]); }} className="p-3 bg-slate-100 rounded-2xl font-black">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}

      {metricFilterMode && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-right">
            <h3 className="font-black text-slate-800">{lang === 'ar' ? 'اختر المعايير المراد عرضها' : 'Choose Metrics to Show'}</h3>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[60vh] p-1">
              {Object.keys(metricLabels).map(m => (
                <button key={m} onClick={() => setActiveMetricFilter(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} className={`p-2 rounded-xl text-xs font-bold border-2 transition-all ${activeMetricFilter.includes(m) ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}>
                  {metricLabels[m]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setFilterMode('metric'); setMetricFilterMode(false); }} className="flex-1 bg-blue-600 text-white p-3 rounded-2xl font-black">{lang === 'ar' ? 'تطبيق' : 'Apply'}</button>
              <button onClick={() => setMetricFilterMode(false)} className="bg-slate-100 text-slate-500 p-3 rounded-2xl font-black">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}

      {showSpecificFilterModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in duration-200 text-right">
            <div className="flex justify-between border-b pb-2 mb-4">
              <h3 className="font-black">{lang === 'ar' ? 'فلترة حسب صفة معينة' : 'Filter by Specific Feature'}</h3>
              <button onClick={() => setShowSpecificFilterModal(false)} className="hover:bg-slate-100 p-1 rounded-full transition-colors"><X /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-right">
              {Object.entries(optionsAr).map(([key, vals]) => {
                const label = key === 'gender' ? (lang === 'ar' ? 'النوع' : 'Gender') :
                  key === 'workOutside' ? (lang === 'ar' ? 'العمل' : 'Work') :
                    key === 'health' ? (lang === 'ar' ? 'الصحة' : 'Health') :
                      key === 'level' ? (lang === 'ar' ? 'المستوى' : 'Level') :
                        key === 'behavior' ? (lang === 'ar' ? 'السلوك' : 'Behavior') :
                          key === 'mainNotes' ? (lang === 'ar' ? 'الملاحظات' : 'Notes') :
                            key === 'eduStatus' ? (lang === 'ar' ? 'التعليم' : 'Education') :
                              key === 'followUp' ? (lang === 'ar' ? 'المتابعة' : 'Follow-up') :
                                key === 'cooperation' ? (lang === 'ar' ? 'التعاون' : 'Cooperation') :
                                  key === 'grades' ? (lang === 'ar' ? 'الصفوف' : 'Grades') :
                                    key === 'sections' ? (lang === 'ar' ? 'الشعب' : 'Sections') : key;

                return (
                  <div key={key} className="space-y-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase">{label}</h4>
                    <div className="flex flex-wrap gap-1">
                      {vals.map((v: string, vIdx: number) => (
                        <button key={v} onClick={() => {
                          setFilterMode('specific');
                          setSelectedSpecifics(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
                        }} className={`text-right px-2 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${selectedSpecifics.includes(v) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}>
                          {lang === 'ar' ? v : (optionsEn as any)[key]?.[vIdx] || v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-6 sticky bottom-0 bg-white pt-2 border-t">
              <button onClick={() => setShowSpecificFilterModal(false)} className="flex-1 bg-slate-900 text-white p-4 rounded-2xl font-black shadow-xl">{lang === 'ar' ? 'تطبيق الفلتر' : 'Apply Filter'}</button>
              <button onClick={() => setSelectedSpecifics([])} className="bg-slate-100 text-slate-500 p-4 rounded-2xl font-black">{lang === 'ar' ? 'إعادة ضبط' : 'Reset'}</button>
              <button onClick={() => setShowSpecificFilterModal(false)} className="bg-red-50 text-red-500 p-4 rounded-2xl font-black">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}

      {showNotesModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-right">
            <h3 className="font-black text-slate-800">{lang === 'ar' ? 'ملاحظات إضافية' : 'Extra Notes'}</h3>
            <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none h-48 text-right" value={showNotesModal.text} onChange={(e) => setShowNotesModal({ ...showNotesModal, text: e.target.value })} placeholder="..." />
            <div className="flex gap-2">
              <button onClick={() => { updateStudent(showNotesModal.id, 'notes', showNotesModal.text); setShowNotesModal(null); }} className="flex-1 bg-blue-600 text-white p-3 rounded-2xl font-black">{lang === 'ar' ? 'موافق' : 'OK'}</button>
              <button onClick={() => setShowNotesModal(null)} className="p-3 bg-slate-100 rounded-2xl font-black">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement: Detail Modal Implementation & Optimization */}
      {showIndividualReportModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 font-arabic">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-emerald-50 animate-in zoom-in-95 duration-300 text-right">
            {/* Modal Header */}
            <div className="p-6 bg-emerald-600 text-white flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-3">
                <FileText size={28} />
                <h3 className="text-xl font-black">تقرير طالب مخصص</h3>
              </div>
              <button onClick={() => setShowIndividualReportModal(false)} className="p-2 hover:bg-emerald-700 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
              {/* Search Field */}
              <div className="relative">
                <label className="block text-xs font-black text-slate-500 mb-2 mr-2 uppercase tracking-widest">البحث عن الطالب</label>
                <div className="flex items-center gap-3 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus-within:border-emerald-500 focus-within:bg-white shadow-inner transition-all">
                  <Search size={20} className="text-slate-400" />
                  <input
                    type="text"
                    className="flex-1 bg-transparent border-none outline-none font-bold text-lg text-right"
                    placeholder="ابدأ بكتابة اسم الطالب..."
                    value={detailModalSearch}
                    onChange={(e) => handleDetailStudentSearch(e.target.value)}
                  />
                </div>
                {detailModalSearch.length > 1 && !currentDetailStudent && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                    {studentData
                      .filter(s => s.name.toLowerCase().includes(detailModalSearch.toLowerCase()))
                      .map(s => (
                        <button key={s.id} onClick={() => handleDetailStudentSearch(s.name)} className="w-full text-right p-4 font-bold border-b last:border-none hover:bg-emerald-50 transition-colors flex items-center justify-between">
                          <span>{s.name}</span>
                          <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">{s.grade}-{s.section}</span>
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Field Toggles Container - "Colored Frames" as requested */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-emerald-100 shadow-inner">
                <h4 className="text-[10px] font-black text-emerald-700 mb-4 mr-2 uppercase tracking-widest">اختر المعايير المراد تعبئتها</h4>
                <div className="flex flex-wrap gap-2">
                  {detailFieldConfigs.map(f => (
                    <button
                      key={f.key}
                      onClick={() => toggleDetailField(f.key)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 shadow-sm border-2 ${activeDetailFields.includes(f.key) ? `bg-emerald-600 text-white border-emerald-700 scale-105 shadow-md` : `bg-white text-slate-500 ${f.color} hover:border-emerald-300`}`}
                    >
                      {activeDetailFields.includes(f.key) ? <Check size={12} /> : <Plus size={12} />}
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Vertical Form */}
              {currentDetailStudent && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  {activeDetailFields.includes('name') && (
                    <div className="p-4 bg-white border-2 border-blue-100 rounded-2xl shadow-sm space-y-2">
                      <label className="text-[10px] font-black text-blue-600 mr-2">اسم الطالب</label>
                      <input className="w-full p-3 bg-slate-50 rounded-xl font-bold border-none focus:ring-2 ring-blue-100 outline-none text-right" value={currentDetailStudent.name} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, name: e.target.value })} />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                    {activeDetailFields.includes('grade') && (
                      <div className="p-4 bg-white border-2 border-indigo-100 rounded-2xl shadow-sm space-y-2">
                        <label className="text-[10px] font-black text-indigo-600 mr-2">الصف</label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-right" value={currentDetailStudent.grade} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, grade: e.target.value })}>
                          {optionsAr.grades.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    {activeDetailFields.includes('section') && (
                      <div className="p-4 bg-white border-2 border-purple-100 rounded-2xl shadow-sm space-y-2">
                        <label className="text-[10px] font-black text-purple-600 mr-2">الشعبة</label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-right" value={currentDetailStudent.section} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, section: e.target.value })}>
                          {optionsAr.sections.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {activeDetailFields.includes('gender') && (
                    <div className="p-4 bg-white border-2 border-pink-100 rounded-2xl shadow-sm space-y-2 text-right">
                      <label className="text-[10px] font-black text-pink-600 mr-2">النوع</label>
                      <div className="flex gap-4">
                        {optionsAr.gender.map(g => (
                          <button key={g} onClick={() => setCurrentDetailStudent({ ...currentDetailStudent, gender: g })} className={`flex-1 py-3 rounded-xl font-black text-xs border-2 transition-all ${currentDetailStudent.gender === g ? 'bg-pink-600 text-white border-pink-600 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeDetailFields.includes('address') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                      <div className="p-4 bg-white border-2 border-orange-100 rounded-2xl shadow-sm space-y-2">
                        <label className="text-[10px] font-black text-orange-600 mr-2">العنوان السكني</label>
                        <input className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-right" value={currentDetailStudent.address} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, address: e.target.value })} placeholder="..." />
                      </div>
                      <div className="p-4 bg-white border-2 border-orange-100 rounded-2xl shadow-sm space-y-2">
                        <label className="text-[10px] font-black text-orange-600 mr-2">حالة العمل</label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-right" value={currentDetailStudent.workOutside} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, workOutside: e.target.value })}>
                          {optionsAr.workOutside.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {activeDetailFields.includes('healthStatus') && (
                    <div className="p-6 bg-white border-2 border-red-100 rounded-[2rem] shadow-sm space-y-4 text-right">
                      <label className="text-[10px] font-black text-red-600 mr-2">المسح الصحي</label>
                      <div className="flex gap-4">
                        {optionsAr.health.map(h => (
                          <button key={h} onClick={() => setCurrentDetailStudent({ ...currentDetailStudent, healthStatus: h })} className={`flex-1 py-3 rounded-xl font-black text-xs border-2 transition-all ${currentDetailStudent.healthStatus === h ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{h}</button>
                        ))}
                      </div>
                      {currentDetailStudent.healthStatus === 'مريض' && (
                        <textarea className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-none focus:ring-2 ring-red-100 min-h-[80px] text-right" placeholder="تفاصيل الحالة الصحية..." value={currentDetailStudent.healthDetails} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, healthDetails: e.target.value })} />
                      )}
                    </div>
                  )}

                  {activeDetailFields.includes('guardianInfo') && (
                    <div className="p-6 bg-white border-2 border-emerald-100 rounded-[2rem] shadow-sm space-y-4 text-right">
                      <label className="text-[10px] font-black text-emerald-600 mr-2">بيانات التواصل مع ولي الأمر</label>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 mr-1">اسم ولي الأمر:</span>
                          <input className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-right" value={currentDetailStudent.guardianName} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, guardianName: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-slate-400 mr-1">أرقام الهواتف:</span>
                          {currentDetailStudent.guardianPhones.map((p, pIdx) => (
                            <div key={pIdx} className="flex gap-2 animate-in slide-in-from-right-2">
                              <input className="flex-1 p-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 ring-emerald-100 text-right" value={p} onChange={e => {
                                const newPhones = [...currentDetailStudent.guardianPhones];
                                newPhones[pIdx] = e.target.value;
                                setCurrentDetailStudent({ ...currentDetailStudent, guardianPhones: newPhones });
                              }} />
                              <button onClick={() => setCurrentDetailStudent({ ...currentDetailStudent, guardianPhones: currentDetailStudent.guardianPhones.filter((_, i) => i !== pIdx) })} className="p-3 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                          ))}
                          <button onClick={() => setCurrentDetailStudent({ ...currentDetailStudent, guardianPhones: [...currentDetailStudent.guardianPhones, ''] })} className="w-full p-2 border-2 border-dashed border-emerald-100 rounded-xl text-emerald-600 font-black text-[10px] hover:bg-emerald-50 transition-all">+ إضافة هاتف آخر</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailFields.includes('academic') && (
                    <div className="p-6 bg-white border-2 border-yellow-200 rounded-[2rem] shadow-sm space-y-4 text-right">
                      <label className="text-[10px] font-black text-yellow-600 mr-2">التقييم العلمي والأكاديمي</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['academicReading', 'academicWriting', 'academicParticipation'].map(field => (
                          <div key={field} className="space-y-2">
                            <span className="text-[9px] font-bold text-slate-400 block text-center">{field === 'academicReading' ? 'القراءة' : field === 'academicWriting' ? 'الكتابة' : 'المشاركة'}</span>
                            <select className={`w-full p-3 rounded-xl font-black text-xs outline-none border-2 appearance-none text-center ${currentDetailStudent[field as keyof StudentReport]?.toString().includes('ضعيف') ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-700'}`} value={currentDetailStudent[field as keyof StudentReport] as string} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, [field]: e.target.value })}>
                              {optionsAr.level.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeDetailFields.includes('behaviorLevel') && (
                    <div className="p-6 bg-white border-2 border-teal-100 rounded-[2rem] shadow-sm space-y-4 text-right">
                      <label className="text-[10px] font-black text-teal-600 mr-2">المستوى السلوكي العام</label>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {optionsAr.behavior.map(b => (
                          <button
                            key={b}
                            onClick={() => setCurrentDetailStudent({ ...currentDetailStudent, behaviorLevel: b })}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${currentDetailStudent.behaviorLevel === b ? ((b.includes('ضعيف') || b.includes('مقبول')) ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-teal-600 text-white border-teal-600 shadow-md') : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-teal-200'}`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeDetailFields.includes('mainNotes') && (
                    <div className="p-6 bg-white border-2 border-rose-100 rounded-[2rem] shadow-sm space-y-4 text-right">
                      <label className="text-[10px] font-black text-rose-600 mr-2">الملاحظات السلوكية الأساسية</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {optionsAr.mainNotes.map(n => (
                          <button
                            key={n}
                            onClick={() => {
                              const updated = currentDetailStudent.mainNotes.includes(n) ? currentDetailStudent.mainNotes.filter(x => x !== n) : [...currentDetailStudent.mainNotes, n];
                              setCurrentDetailStudent({ ...currentDetailStudent, mainNotes: updated });
                            }}
                            className={`text-right p-3 rounded-xl text-[10px] font-bold border-2 transition-all flex items-center justify-between ${currentDetailStudent.mainNotes.includes(n) ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'bg-slate-50 border-slate-50 text-slate-500 hover:bg-white hover:border-rose-200'}`}
                          >
                            {n}
                            {currentDetailStudent.mainNotes.includes(n) ? <Check size={14} /> : <Plus size={14} className="opacity-30" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeDetailFields.includes('guardianFollowUp') && (
                    <div className="p-6 bg-white border-2 border-cyan-100 rounded-[2rem] shadow-sm space-y-4 text-right">
                      <label className="text-[10px] font-black text-cyan-600 mr-2">تقييم متابعة ولي الأمر</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 block text-center">تعليم ولي الأمر</span>
                          <select className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none text-center text-xs" value={currentDetailStudent.guardianEducation} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, guardianEducation: e.target.value })}>
                            {optionsAr.eduStatus.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 block text-center">مستوى المتابعة</span>
                          <select className={`w-full p-3 rounded-xl font-black text-xs outline-none border-2 text-center ${currentDetailStudent.guardianFollowUp === 'ضعيفة' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-100'}`} value={currentDetailStudent.guardianFollowUp} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, guardianFollowUp: e.target.value })}>
                            {optionsAr.followUp.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 block text-center">درجة التعاون</span>
                          <select className={`w-full p-3 rounded-xl font-black text-xs outline-none border-2 text-center ${currentDetailStudent.guardianCooperation === 'عدواني' || currentDetailStudent.guardianCooperation === 'ضعيفة' ? 'bg-red-600 border-red-700 text-white' : 'bg-slate-50 border-slate-100'}`} value={currentDetailStudent.guardianCooperation} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, guardianCooperation: e.target.value })}>
                            {optionsAr.cooperation.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailFields.includes('notes') && (
                    <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-4 text-right">
                      <label className="text-[10px] font-black text-slate-600 mr-2">الملاحظات الختامية</label>
                      <div className="space-y-4">
                        <textarea className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none h-24 text-sm text-right" placeholder="ملاحظات أخرى..." value={currentDetailStudent.notes} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, notes: e.target.value })} />
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 mr-1 uppercase">ملاحظات برمجية (تلقائية):</span>
                          <input className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border-none italic text-blue-600 text-right" value={currentDetailStudent.otherNotesText} onChange={e => setCurrentDetailStudent({ ...currentDetailStudent, otherNotesText: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!currentDetailStudent && detailModalSearch.length > 0 && (
                <div className="flex flex-col items-center justify-center p-20 text-slate-300 gap-4">
                  <Users size={64} className="opacity-20" />
                  <p className="font-bold">يرجى اختيار طالب من القائمة للبدء</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-4">
              <button
                onClick={saveDetailStudent}
                disabled={!currentDetailStudent}
                className="flex-1 bg-emerald-600 text-white p-5 rounded-2xl font-black text-xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] flex items-center justify-center gap-4 disabled:opacity-30"
              >
                <CheckCircle size={28} /> موافق واعتماد البيانات
              </button>

              <button
                onClick={sendDetailWhatsApp}
                disabled={!currentDetailStudent}
                className="p-5 bg-white border-4 border-green-500 text-green-600 rounded-2xl hover:bg-green-500 hover:text-white transition-all shadow-lg flex items-center justify-center gap-3 active:scale-90 disabled:opacity-30"
                title="إرسال التقرير للواتساب"
              >
                <MessageCircle size={28} />
                <span className="font-black text-lg text-right">واتساب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* START OF CHANGE - Surgical Addition for WhatsApp Selector Modal */}
      {waSelector && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-arabic">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 border-4 border-green-50 text-right overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-green-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black flex items-center gap-3"><Share2 size={24} /> تخصيص بيانات الإرسال للواتساب</h3>
              <button onClick={() => setWaSelector(null)} className="p-2 hover:bg-green-700 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-100 mb-6">
                <p className="text-sm font-bold text-green-800 leading-relaxed">
                  سيتم الإرسال لـ <span className="font-black">({waSelector.type === 'single' ? 'طالب واحد' : `${filteredData.length} طالب`})</span>.
                  يرجى اختيار الحقول المراد تضمينها في الرسالة. سيتم تنسيق الرسالة برموز بصرية وتلوين للمشكلات.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {waFieldOptions.map(opt => {
                  const isSelected = waSelectedFields.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      onClick={() => {
                        if (opt.key === 'all') {
                          setWaSelectedFields(['all']);
                        } else {
                          const withoutAll = waSelectedFields.filter(f => f !== 'all');
                          if (isSelected) {
                            const updated = withoutAll.filter(f => f !== opt.key);
                            setWaSelectedFields(updated.length === 0 ? ['all'] : updated);
                          } else {
                            setWaSelectedFields([...withoutAll, opt.key]);
                          }
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 text-right font-bold transition-all flex items-center justify-between ${isSelected ? 'bg-green-600 text-white border-green-700 shadow-md scale-102' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-green-300'}`}
                    >
                      <span className="text-xs">{opt.label}</span>
                      {isSelected && <CheckCircle size={18} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-4">
              <button
                onClick={finalSendWhatsApp}
                className="flex-1 bg-green-600 text-white p-5 rounded-2xl font-black text-xl hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-[0.98] flex items-center justify-center gap-4"
              >
                <MessageCircle size={28} /> إرسال إلى واتساب
              </button>
              <button
                onClick={() => setWaSelector(null)}
                className="px-8 bg-white border-2 text-slate-400 rounded-2xl font-black hover:bg-slate-100 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      {/* END OF CHANGE */}

      {showImportConfirmModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 font-arabic">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl border-4 border-blue-50 animate-in zoom-in-95 duration-300 text-right">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800">بيانات مكررة مكتشفة</h3>
              <p className="text-slate-500 font-medium mt-2">لقد تم العثور على طلاب موجودين مسبقاً في الملف المرفوع. كيف تود المتابعة؟</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  updateData({ studentReports: [...studentData, ...pendingImportData] });
                  setShowImportConfirmModal(false);
                  setPendingImportData([]);
                  alert(lang === 'ar' ? 'تم استيراد كافة البيانات بنجاح' : 'All data imported successfully');
                }}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border-2 border-slate-100 hover:border-blue-200 rounded-2xl transition-all group"
              >
                <ChevronLeft className="text-slate-300 group-hover:text-blue-500" size={20} />
                <div className="text-right">
                  <div className="font-black text-slate-800">استيراد الكل</div>
                  <div className="text-[10px] text-slate-500">إضافة كافة البيانات بما فيها المكرر</div>
                </div>
              </button>

              <button
                onClick={() => {
                  const filtered = pendingImportData.filter(imp =>
                    !studentData.some(existing =>
                      existing.name.trim() === imp.name.trim() &&
                      existing.grade === imp.grade &&
                      existing.section === imp.section
                    )
                  );
                  updateData({ studentReports: [...studentData, ...filtered] });
                  setShowImportConfirmModal(false);
                  setPendingImportData([]);
                  alert(lang === 'ar' ? `تم استيراد ${filtered.length} سجل جديد وتجاهل المكرر` : `Imported ${filtered.length} new records and skipped duplicates`);
                }}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 border-2 border-slate-100 hover:border-emerald-200 rounded-2xl transition-all group"
              >
                <ChevronLeft className="text-slate-300 group-hover:text-emerald-500" size={20} />
                <div className="text-right">
                  <div className="font-black text-slate-800">استيراد غير المكرر فقط</div>
                  <div className="text-[10px] text-slate-500">تجاهل الطلاب الموجودين مسبقاً</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowImportConfirmModal(false);
                  setPendingImportData([]);
                }}
                className="w-full p-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                إلغاء العملية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
