import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { useGlobal } from '../context/GlobalState';
import {
  Plus, Search, Trash2, Filter, ChevronDown, ChevronUp, Palette, Check, Calendar, Percent, User, Users, Target, Settings2, AlertCircle, X, ChevronRight, Zap, CheckCircle, FilePlus, FolderOpen, Save, ListOrdered, ArrowUpDown, ArrowUp, ArrowDown, SortAsc, Book, School, Type, Sparkles, FilterIcon, BarChart3, LayoutList, Upload, Download, Phone, UserCircle, Activity, Star, FileText, FileSpreadsheet, Share2, Edit, ChevronLeft, UserCheck, GraduationCap, MessageCircle, FileOutput
} from 'lucide-react';
import { TeacherFollowUp, DailyReportContainer, StudentReport, SchoolProfile } from '../types';
import DynamicTable from '../components/DynamicTable';
import * as XLSX from 'xlsx';

// Adding local types for TeacherFollowUpPage sorting and filtering
type FilterMode = 'all' | 'student' | 'percent' | 'metric' | 'grade' | 'section' | 'specific' | 'blacklist' | 'excellence' | 'date';
type SortCriteria = 'manual' | 'name' | 'subject' | 'class';
type SortDirection = 'asc' | 'desc';

// --- Teachers Follow-up Page (DailyReportsPage) ---
export const DailyReportsPage: React.FC = React.memo(() => {
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
  const [writer, setWriter] = useState<string>('');
  const [aggDateFrom, setAggDateFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [aggDateTo, setAggDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [archiveTab, setArchiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('daily');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [showSummaryReport, setShowSummaryReport] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Handle Bottom Menu Actions
  useEffect(() => {
    const handleAction = (e: any) => {
      const { actionId } = e.detail;
      switch (actionId) {
        case 'add_table': aggregateReports?.('daily'); break;
        case 'indicators': setShowIndicatorsModal(true); break;
        case 'archive': setShowArchive(true); break;
        case 'add_teacher': addNewTeacher(); break;
        case 'import': setShowImportModal(true); break;
        case 'teacher_report': setShowTeacherReport(true); break;
        case 'metrics': setShowMetricPicker(true); break;
        case 'filter': setFilterMode(prev => prev === 'all' ? 'metric' : 'all'); break;
        case 'sort': setShowSortModal(true); break;
        case 'date': {
          const btn = document.querySelector('[data-type="date-edit"]');
          if (btn instanceof HTMLElement) btn.click();
          break;
        }
      }
    };
    window.addEventListener('page-action', handleAction);
    return () => window.removeEventListener('page-action', handleAction);
  }, []);

  // Import Teachers Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileType, setSelectedFileType] = useState<'excel' | 'xml' | 'pdf' | 'txt' | null>(null);

  // Teacher Report Modal State
  const [showTeacherReport, setShowTeacherReport] = useState(false);
  const [reportTeacherId, setReportTeacherId] = useState<string>('');
  const [reportTeacherSearch, setReportTeacherSearch] = useState('');
  const [reportSelectedFields, setReportSelectedFields] = useState<string[]>([]);
  const [showWhatsAppSelect, setShowWhatsAppSelect] = useState(false);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [fillValues, setFillValues] = useState<Record<string, number>>({});

  // Utility function to convert Arabic numerals to English
  const toEnglishNum = (num: number | string): string => {
    const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const englishNums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let str = String(num);
    for (let i = 0; i < arabicNums.length; i++) {
      str = str.replace(new RegExp(arabicNums[i], 'g'), englishNums[i]);
    }
    return str;
  };


  const reports = data.dailyReports || [];
  const metricsList = data.metricsList || [];

  // Auto-create report for today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const exists = (data.dailyReports || []).find(r => r.dateStr === today);
    if (!exists) {
      const lastReport = (data.dailyReports || []).slice().reverse().find(r => r.teachersData);
      const inheritedWriter = lastReport?.writer || '';
      const inheritedTeachers = lastReport ? lastReport.teachersData.map(t => ({
        ...t,
        id: `teacher_${Date.now()}_${Math.random()}`,
        violations_score: 0,
        violations_notes: [],
        ...metricsList.reduce((acc, m) => ({ ...acc, [m.key]: 0 }), {})
      })) : [];

      const newId = Date.now().toString();
      const newReport: DailyReportContainer = {
        id: newId,
        dateStr: today,
        dayName: new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date()),
        writer: inheritedWriter,
        teachersData: inheritedTeachers as TeacherFollowUp[]
      };
      updateData({ dailyReports: [newReport, ...(data.dailyReports || [])] });
      setActiveReportId(newId);
      setWriter(inheritedWriter);
    } else {
      if (!activeReportId) {
        setActiveReportId(exists.id);
        setWriter(exists.writer || '');
      }
    }
  }, [data.dailyReports, metricsList, updateData, activeReportId]);

  const currentReport = reports.find(r => r.id === activeReportId);

  // Subjects Ordering
  const subjectOrder = ["مربية", "القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الاجتماعيات", "الحاسوب", "المكتبة", "الفنية", "المختص الاجتماعي", "الأنشطة", "غيرها"];

  const teachers = useMemo(() => {
    let list = currentReport ? [...currentReport.teachersData] : [];

    // Search Filtering
    if (searchTerm) {
      list = list.filter(t => t.teacherName.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Existing Filter Mode Logic
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
  }, [currentReport, sortConfig, filterMode, activeTeacherFilter, searchTerm]);

  const metricsConfig = useMemo(() => metricsList.map(m => ({
    key: m.key,
    label: m.label,
    color: m.color,
    max: data.maxGrades?.[m.key] || m.max || 0
  })), [metricsList, data.maxGrades]);

  const getTextColor = (hexColor?: string) => {
    if (!hexColor || !hexColor.startsWith('#')) return 'text-slate-800';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? 'text-slate-800' : 'text-white';
  };

  // Hijri date helper with month names
  const hijriMonths = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  const toHijriFriendly = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      if (dateStr.includes(' to ')) {
        const [start, end] = dateStr.split(' to ');
        return `${toHijriFriendly(start)} - ${toHijriFriendly(end)}`;
      }
      const gDate = new Date(dateStr);
      if (isNaN(gDate.getTime())) return dateStr;
      const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-uma', {
        day: 'numeric', month: 'numeric', year: 'numeric'
      }).format(gDate);
      const parts = toEnglishNum(hijri).split('/');
      const monthIdx = parseInt(parts[1]) - 1;
      return `${parts[0]}/ ${hijriMonths[monthIdx]}/ ${parts[2]}هـ`;
    } catch (e) { return dateStr; }
  };

  const getReportTitle = (report: DailyReportContainer) => {
    if (report.reportCount) {
      if (report.dayName === 'أسبوعي') return 'التقرير الأسبوعي لمتابعة أداء المعلمين';
      if (report.dayName === 'شهري') return 'التقرير الشهري لمتابعة أداء المعلمين';
      if (report.dayName === 'فصلي') return 'التقرير الفصلي لمتابعة أداء المعلمين';
      if (report.dayName === 'سنوي') return 'التقرير السنوي لمتابعة أداء المعلمين';
    }
    return `تقرير متابعة أداء المعلمين ليوم ${report.dayName}`;
  };

  const getReportDateLabel = (report: DailyReportContainer) => {
    const greg = report.dateStr.includes(' to ') ? (report.dateStr.replace(' to ', ' إلى ')) : report.dateStr;
    const hijri = toHijriFriendly(report.dateStr);
    return `التاريخ: ${hijri} الموافق: ${greg}م`;
  };

  const subjects = ["مربية", "القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الاجتماعيات", "الحاسوب", "المكتبة", "الفنية", "المختص الاجتماعي", "الأنشطة", "غيرها"];
  const grades = ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const violationTypes = ["تأخر عن طابور", "تأخر عن حصة", "خروج من الحصة", "الإفراط في العقاب", "رفض القرارات الإدارية", "عدم تسليم ما كلف به"];

  const displayedMetrics = filterMode === 'metric' && selectedMetrics.length > 0
    ? metricsConfig.filter(m => selectedMetrics.includes(m.key))
    : metricsConfig;

  const getMetricStyle = (metric: any) => {
    if (metric.color && metric.color.startsWith('#')) {
      return { backgroundColor: metric.color };
    }
    const key = metric.key;
    if (key === 'attendance' || key === 'appearance') return { backgroundColor: '#E2EFDA' };
    if (key === 'preparation') return { backgroundColor: '#ffffff' };
    if (key.startsWith('supervision')) return { backgroundColor: '#FCE4D6' };
    return { backgroundColor: '#DDEBF7' };
  };

  const handleCreateReport = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastReport = (data.dailyReports || []).find(r => r.teachersData);
    const inheritedWriter = lastReport?.writer || '';
    const inheritedTeachers = lastReport ? lastReport.teachersData.map(t => ({
      ...t,
      id: `teacher_${Date.now()}_${Math.random()}`,
      violations_score: 0,
      violations_notes: [],
      ...metricsList.reduce((acc, m) => ({ ...acc, [m.key]: 0 }), {})
    })) : [];

    const newId = Date.now().toString();
    const newReport: DailyReportContainer = {
      id: newId,
      dateStr: today,
      dayName: new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date()),
      writer: inheritedWriter,
      teachersData: inheritedTeachers as TeacherFollowUp[]
    };
    updateData({ dailyReports: [newReport, ...(data.dailyReports || [])] });
    setActiveReportId(newId);
    setWriter(inheritedWriter);
  };

  const deleteReport = (reportId: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا التقرير نهائياً؟' : 'Are you sure you want to delete this report permanently?')) return;
    const updated = (data.dailyReports || []).filter(r => r.id !== reportId);
    updateData({ dailyReports: updated });
    if (activeReportId === reportId) setActiveReportId(updated[0]?.id || null);
  };

  const aggregateReports = (type: string) => {
    const from = new Date(aggDateFrom);
    const to = new Date(aggDateTo);
    const filteredDays = (data.dailyReports || []).filter(r => {
      const d = new Date(r.dateStr);
      return d >= from && d <= to && !r.reportCount;
    });

    if (filteredDays.length === 0) {
      alert(lang === 'ar' ? 'لا توجد تقارير يومية في هذه الفترة' : 'No daily reports found in this period');
      return;
    }

    // Merge teachers
    const teacherMap: Record<string, { name: string, subject: string, class: string, scores: Record<string, number>, violations_score: number, reportCount: number }> = {};
    filteredDays.forEach(day => {
      day.teachersData.forEach(t => {
        const key = t.teacherName.trim();
        if (!teacherMap[key]) {
          teacherMap[key] = {
            name: t.teacherName,
            subject: t.subjectCode,
            class: t.className,
            scores: {},
            violations_score: 0,
            reportCount: 0
          };
          metricsList.forEach(m => teacherMap[key].scores[m.key] = 0);
        }
        teacherMap[key].reportCount++;
        metricsList.forEach(m => teacherMap[key].scores[m.key] += (Number((t as any)[m.key]) || 0));
        teacherMap[key].violations_score += (t.violations_score || 0);
      });
    });

    const aggregatedTeachers = Object.values(teacherMap).map((tm, idx) => {
      const t: any = {
        id: `agg_teacher_${idx}_${Date.now()}`,
        teacherName: tm.name,
        subjectCode: tm.subject,
        className: tm.class,
        violations_score: Math.round(tm.violations_score / tm.reportCount),
        order: idx + 1,
        gender: 'ذكر'
      };
      metricsList.forEach(m => {
        t[m.key] = Math.round(tm.scores[m.key] / tm.reportCount);
      });
      return t as TeacherFollowUp;
    });

    const newId = `agg_report_${Date.now()}`;
    const newReport: DailyReportContainer = {
      id: newId,
      dateStr: `${aggDateFrom} to ${aggDateTo}`,
      dayName: type,
      writer: writer,
      reportCount: filteredDays.length,
      teachersData: aggregatedTeachers
    };

    updateData({ dailyReports: [newReport, ...(data.dailyReports || [])] });
    setActiveReportId(newId);
    setShowSummaryReport(type);
  };

  const addNewTeacher = () => {
    if (!activeReportId) return;
    const newTeacher: any = {
      id: Date.now().toString(), teacherName: '', subjectCode: '', className: '',
      violations_notes: [], order: teachers.length + 1,
      gender: 'ذكر'
    };
    metricsList.forEach(m => {
      newTeacher[m.key] = 0;
    });

    const updatedReports = reports.map(r => r.id === activeReportId ? { ...r, teachersData: [...r.teachersData, newTeacher] } : r);
    updateData({ dailyReports: updatedReports });
  };

  const handleExcelExport = () => {
    const report = data.dailyReports?.find(r => r.id === activeReportId);
    if (!report) return;

    const profile = (data.profile || {}) as SchoolProfile;
    const title = getReportTitle(report);
    const dateLabel = getReportDateLabel(report);
    const rcCount = report.reportCount || 1;

    let content = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<style>
    table { border-collapse: collapse; width: 100%; direction: rtl; }
    th, td { border: 1px solid #000; padding: 8px; text-align: center; font-family: Arial, sans-serif; }
    .title-section { border: none; text-align: center; font-size: 18px; font-weight: bold; }
    .date-section { border: none; text-align: center; font-size: 14px; color: #333; }
    .subheader { background-color: #f1f5f9; font-weight: bold; }
    .metric-header { background-color: #f8fafc; font-weight: bold; font-size: 11px; }
    .footer-row { background-color: #f8fafc; font-weight: bold; }
</style>
</head>
<body>
<table>
    <tr><td colspan="${5 + metricsList.length + 3}" class="title-section" style="font-size: 20px;">${profile.schoolName || 'المدرسة'}</td></tr>
    <tr><td colspan="${5 + metricsList.length + 3}" class="title-section" style="font-size: 18px;">${title}</td></tr>
    <tr><td colspan="${5 + metricsList.length + 3}" class="date-section">${dateLabel}</td></tr>
    <tr><td colspan="${5 + metricsList.length + 3}" style="border: none; height: 10px;"></td></tr>
    <tr class="subheader">
        <th rowspan="2">م</th>
        <th rowspan="2" style="min-width: 150px;">اسم المعلم</th>
        <th rowspan="2">النوع</th>
        <th rowspan="2">المادة</th>
        <th rowspan="2">الصف</th>
        <th colspan="${metricsList.length}">مجالات التقييم</th>
        <th rowspan="2">المخالفات</th>
        <th rowspan="2">المجموع</th>
        <th rowspan="2">النسبة %</th>
    </tr>
    <tr class="metric-header">
        ${metricsList.map(m => `<th style="background-color: ${m.color}20;">${m.label}<br/>(${m.max * rcCount})</th>`).join('')}
    </tr>
    ${teachers.map((t, idx) => {
      const total = calculateTotal(t);
      const max = calculateMaxTotal(t);
      const percent = max > 0 ? ((total / max) * 100).toFixed(1) : '0';
      return `
    <tr>
        <td>${idx + 1}</td>
        <td style="text-align: right;">${t.teacherName}</td>
        <td>${t.gender || 'ذكر'}</td>
        <td>${t.subjectCode || ''}</td>
        <td>${t.className || ''}</td>
        ${metricsList.map(m => {
        const isUnaccredited = (t.unaccreditedMetrics || []).includes(m.key);
        return `<td style="background-color: ${m.color}10;">${isUnaccredited ? 'غ.م' : (t as any)[m.key] || 0}</td>`;
      }).join('')}
        <td style="color: red;">${t.violations_score || 0}</td>
        <td style="font-weight: bold;">${total}</td>
        <td style="font-weight: bold;">${percent}%</td>
    </tr>`;
    }).join('')}
    <tr class="footer-row">
        <td colspan="5">المجموع الكلي والنسبة العامة</td>
        ${metricsList.map(m => `<td>${getColSum(m.key)}<br/>${getColPercent(m.key, m.max)}%</td>`).join('')}
        <td>${teachers.reduce((acc, t) => acc + (t.violations_score || 0), 0)}</td>
        <td style="background-color: #f1f5f9;">${teachers.reduce((acc, t) => acc + calculateTotal(t), 0)}</td>
        <td style="background-color: #334155; color: white;">${(() => {
        const tSum = teachers.reduce((acc, t) => acc + calculateTotal(t), 0);
        const tMax = teachers.reduce((acc, t) => acc + calculateMaxTotal(t), 0);
        return tMax > 0 ? ((tSum / tMax) * 100).toFixed(1) : '0';
      })()}%</td>
    </tr>
    <tr><td colspan="${5 + metricsList.length + 3}" style="border: none; height: 20px;"></td></tr>
    <tr>
        <td colspan="${Math.floor((5 + metricsList.length + 3) / 2)}" style="border: none; text-align: right; font-weight: bold;">كاتب التقرير: ${writer || report.writer || ''}</td>
        <td colspan="${Math.ceil((5 + metricsList.length + 3) / 2)}" style="border: none; text-align: left; font-weight: bold;">مدير الفرع: ${profile.branchManager || ''}</td>
    </tr>
</table>
</body>
</html>`;

    const blob = new Blob(['\uFEFF' + content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.xls`;
    link.click();
  };

  const updateTeacher = (teacherId: string, updates: Record<string, any>) => {
    if (!activeReportId) return;
    const updatedReports = reports.map(r => {
      if (r.id === activeReportId) {
        return {
          ...r,
          teachersData: r.teachersData.map(t => t.id === teacherId ? { ...t, ...updates } : t)
        };
      }
      return r;
    });
    updateData({ dailyReports: updatedReports });
  };

  const deleteTeacher = (teacherId: string) => {
    if (!activeReportId) return;
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المعلم؟' : 'Are you sure you want to delete this teacher?')) return;
    const updatedReports = reports.map(r => {
      if (r.id === activeReportId) {
        return {
          ...r,
          teachersData: r.teachersData.filter(t => t.id !== teacherId)
        };
      }
      return r;
    });
    updateData({ dailyReports: updatedReports });
    setSelectedTeacherIds(prev => prev.filter(id => id !== teacherId));
  };

  const deleteSelectedTeachers = () => {
    if (!activeReportId || selectedTeacherIds.length === 0) return;
    if (!confirm(lang === 'ar' ? `هل أنت متأكد من حذف ${selectedTeacherIds.length} معلم؟` : `Are you sure you want to delete ${selectedTeacherIds.length} teachers?`)) return;
    const updatedReports = reports.map(r => {
      if (r.id === activeReportId) {
        return {
          ...r,
          teachersData: r.teachersData.filter(t => !selectedTeacherIds.includes(t.id))
        };
      }
      return r;
    });
    updateData({ dailyReports: updatedReports });
    setSelectedTeacherIds([]);
  };

  // Map teacher names to their profiles for quick lookup and auto-fill
  const teacherProfiles = useMemo(() => {
    const profiles: Record<string, { subject: string, class: string }> = {};

    // 1. Get from timetable (base list)
    (data.timetable || []).forEach(t => {
      if (t.teacherName) {
        const name = t.teacherName.trim();
        profiles[name] = { subject: t.subject || '', class: '' };
      }
    });

    // 2. Supplement from dailyReports (natural order: newest at end will win)
    (data.dailyReports || []).forEach(r => {
      r.teachersData.forEach(t => {
        if (t.teacherName) {
          const name = t.teacherName.trim();
          profiles[name] = {
            subject: t.subjectCode || profiles[name]?.subject || '',
            class: t.className || profiles[name]?.class || ''
          };
        }
      });
    });
    return profiles;
  }, [data.dailyReports, data.timetable]);

  const allTeacherNames = useMemo(() => Object.keys(teacherProfiles).sort(), [teacherProfiles]);

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
    const accreditedEmployees = teachers.filter(t => !(t.unaccreditedMetrics || []).includes(key));
    const accreditedCount = accreditedEmployees.length;
    if (accreditedCount === 0) return '0';
    return ((sum / (accreditedCount * max)) * 100).toFixed(1);
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

  const fieldsConfig = useMemo(() => [
    { key: 'teacherName', label: 'اسم المعلم', emoji: '👤', color: 'bg-blue-600' },
    { key: 'subjectCode', label: 'المادة', emoji: '📚', color: 'bg-indigo-600' },
    { key: 'className', label: 'الصف', emoji: '🎓', color: 'bg-purple-600' },
    { key: 'gender', label: 'النوع', emoji: '🚻', color: 'bg-pink-600' },
    ...metricsList.map(m => ({
      key: m.key,
      label: m.label,
      emoji: m.emoji || '🎯',
      color: m.color || 'bg-slate-600'
    })),
    { key: 'total', label: 'المجموع', emoji: '∑', color: 'bg-black' },
    { key: 'percent', label: 'النسبة', emoji: '📊', color: 'bg-blue-800' },
  ], [metricsList]);

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

          // Special handling for violations with detailed notes
          if (f.key === 'violations_score') {
            if (val !== undefined && val !== null && val !== '') {
              msg += `⚠️ *${f.label}:* ${val}\n`;
              // Add detailed violation notes if available
              if (teacher.violations_notes && teacher.violations_notes.length > 0) {
                msg += `━━━━━━━━━━━━━━━━\n`;
                teacher.violations_notes.forEach((note, noteIdx) => {
                  msg += `  ${noteIdx + 1}. 🚫 ${note}\n`;
                });
                msg += `━━━━━━━━━━━━━━━━\n`;
              }
            }
          } else if (val !== undefined && val !== null && val !== '') {
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

  // Import Teachers Handler
  const handleImportTeachers = async (fileType: 'excel' | 'xml' | 'pdf' | 'txt') => {
    setSelectedFileType(fileType);
    if (fileInputRef.current) {
      // Set accept attribute based on file type
      switch (fileType) {
        case 'excel':
          fileInputRef.current.accept = '.xlsx,.xls,.csv';
          break;
        case 'xml':
          fileInputRef.current.accept = '.xml';
          break;
        case 'pdf':
          fileInputRef.current.accept = '.pdf';
          break;
        case 'txt':
          fileInputRef.current.accept = '.txt';
          break;
      }
      fileInputRef.current.click();
    }
  };

  const processImportedFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeReportId) return;

    try {
      let teacherNames: string[] = [];

      if (selectedFileType === 'excel') {
        // Process Excel/CSV file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        // Extract names from first column (skip header if exists)
        teacherNames = jsonData
          .flat()
          .filter((cell: any) => typeof cell === 'string' && cell.trim().length > 0)
          .map((name: string) => name.trim());
      } else if (selectedFileType === 'xml') {
        // Process XML file
        const text = await file.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');

        // Try to find teacher names in various XML structures
        const possibleTags = ['teacher', 'name', 'teacherName', 'معلم', 'اسم', 'اسم_المعلم'];
        for (const tag of possibleTags) {
          const elements = xmlDoc.getElementsByTagName(tag);
          if (elements.length > 0) {
            for (let i = 0; i < elements.length; i++) {
              const text = elements[i].textContent?.trim();
              if (text) teacherNames.push(text);
            }
            break;
          }
        }

        // If no specific tags found, try to extract all text content
        if (teacherNames.length === 0) {
          const allText = xmlDoc.documentElement.textContent || '';
          teacherNames = allText.split(/[\n\r,;]+/).filter(s => s.trim().length > 0).map(s => s.trim());
        }
      } else if (selectedFileType === 'pdf') {
        // For PDF, we'll try to extract text (basic approach)
        // Note: Full PDF parsing requires additional libraries
        alert('لاستيراد ملفات PDF، يرجى تحويلها إلى Excel أو TXT أولاً');
        setShowImportModal(false);
        return;
      } else if (selectedFileType === 'txt') {
        // Process TXT file
        const text = await file.text();
        teacherNames = text
          .split(/[\n\r,;]+/)
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.match(/^\d+$/)); // Filter out empty lines and pure numbers
      }

      // Remove duplicates and filter valid names
      teacherNames = [...new Set(teacherNames)].filter(name =>
        name.length > 1 &&
        !name.match(/^\d+$/) &&
        !name.toLowerCase().includes('name') &&
        !name.includes('اسم المعلم') &&
        !name.includes('الاسم')
      );

      if (teacherNames.length === 0) {
        alert('لم يتم العثور على أسماء معلمين في الملف');
        setShowImportModal(false);
        return;
      }

      // Create new teachers from imported names
      const existingNames = new Set(teachers.map(t => t.teacherName.trim()));
      const newTeachers: TeacherFollowUp[] = teacherNames
        .filter(name => !existingNames.has(name))
        .map((name, idx) => {
          const t: any = {
            id: `${Date.now()}-${idx}`,
            teacherName: name,
            subjectCode: teacherProfiles[name]?.subject || '',
            className: teacherProfiles[name]?.class || '',
            violations_notes: [],
            order: teachers.length + idx + 1,
            gender: 'ذكر'
          };
          // Initialize all metrics from the list to 0
          metricsList.forEach(m => {
            t[m.key] = 0;
          });
          return t as TeacherFollowUp;
        });

      if (newTeachers.length === 0) {
        alert('جميع الأسماء موجودة بالفعل في الجدول');
        setShowImportModal(false);
        return;
      }

      // Update the report with new teachers
      const updatedReports = reports.map(r => {
        if (r.id === activeReportId) {
          return {
            ...r,
            teachersData: [...r.teachersData, ...newTeachers]
          };
        }
        return r;
      });

      updateData({ dailyReports: updatedReports });
      alert(`تم استيراد ${newTeachers.length} معلم بنجاح`);
      setShowImportModal(false);
    } catch (error) {
      console.error('Error importing file:', error);
      alert('حدث خطأ أثناء استيراد الملف');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (
    <div className="space-y-0 font-arabic">
      <div className="hidden pointer-events-none h-0 p-0 overflow-hidden">
        {/* Legacy Buttons Hidden */}
      </div>

      <div className="mb-0">
        <div className="relative group max-w-xs">
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-all">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="ابحث عن اسم المعلم..."
            className="w-full bg-white border-2 border-slate-100 rounded-full py-2 pr-10 pl-4 text-sm font-bold shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-50 outline-none transition-all placeholder:text-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="hidden pointer-events-none h-0 p-0 overflow-hidden">
        {/* Secondary Legacy Buttons Hidden */}
      </div>

      <div className="bg-white rounded-[2.5rem] border-4 border-[#911d1d] shadow-xl overflow-hidden relative transition-all">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh] scroll-smooth custom-scrollbar">
          <table className={`w-full text-center border-collapse ${filterMode === 'metric' ? '' : 'min-w-[1400px]'}`}>
            <thead>
              {currentReport && (
                <tr className="bg-white">
                  <th colSpan={20} className="p-3 border-b border-slate-200">
                    <div className="flex flex-col items-center gap-1">
                      <h2 className="text-lg font-black text-slate-800">{getReportTitle(currentReport)}</h2>
                      <div className="text-xs font-bold text-slate-500 bg-slate-50 px-4 py-1 rounded-full border border-slate-100">
                        {getReportDateLabel(currentReport)}
                      </div>
                    </div>
                  </th>
                </tr>
              )}
              <tr className="border-b border-slate-300">
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-12 sticky top-0 bg-[#FFD966] z-20">
                  <div className="flex flex-col items-center gap-1">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={teachers.length > 0 && selectedTeacherIds.length === teachers.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTeacherIds(teachers.map(t => t.id));
                        else setSelectedTeacherIds([]);
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-sans">م</span>
                      {selectedTeacherIds.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedTeachers(); }}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors animate-in zoom-in"
                          title="حذف المحددين"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </th>
                <th rowSpan={2} className="p-2 border-e border-slate-300 w-44 sticky top-0 bg-[#FFD966] z-20">اسم المعلم</th>
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
              <tr className="text-[10px] sticky top-[45px] z-10 bg-slate-50">
                {displayedMetrics.filter(m => m.key !== 'violations_score').map(m => (
                  <th key={m.key} className={`p-1 border-e border-slate-300 min-w-[70px] align-bottom transition-colors`} style={getMetricStyle(m)}>
                    <div className="flex flex-col items-center justify-center gap-0 h-full w-full">
                      <div className={`vertical-text font-bold h-14 text-[10px] ${getTextColor(m.color)}`}>{m.label}</div>

                      {/* Accreditation Toggle logic in Header */}
                      <div className="flex flex-col items-center gap-0.5 h-6 justify-center">
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
                    className={`border-b transition-colors h-10 ${highlightedRowId === t.id ? 'bg-yellow-50' : (selectedTeacherIds.includes(t.id) ? 'bg-blue-50' : 'hover:bg-slate-50')}`}
                    onClick={() => setHighlightedRowId(t.id)}
                  >
                    <td className="p-1 border-e bg-inherit">
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedTeacherIds.includes(t.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) setSelectedTeacherIds(prev => [...prev, t.id]);
                            else setSelectedTeacherIds(prev => prev.filter(id => id !== t.id));
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="font-bold text-xs font-sans">{idx + 1}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTeacher(t.id); }}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="حذف الاسم"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="p-1 border-e bg-inherit">
                      <input
                        list="teacher-names-list"
                        className="w-full text-right font-bold outline-none bg-transparent text-xs"
                        value={t.teacherName}
                        onChange={e => {
                          const newName = e.target.value;
                          const trimmed = newName.trim();
                          const updates: any = { teacherName: newName };
                          if (trimmed && teacherProfiles[trimmed]) {
                            const p = teacherProfiles[trimmed];
                            if (p.subject) updates.subjectCode = p.subject;
                            if (p.class) updates.className = p.class;
                          }
                          updateTeacher(t.id, updates);
                        }}
                        placeholder="اسم المعلم.."
                      />
                    </td>
                    {
                      !filterMode.includes('metric') && (
                        <>
                          <td className="p-1 border-e">
                            <select className="w-full bg-transparent outline-none text-[10px] text-center font-bold" value={t.gender || 'ذكر'} onChange={e => updateTeacher(t.id, { gender: e.target.value })}>
                              <option value="ذكر">ذكر</option>
                              <option value="أنثى">أنثى</option>
                            </select>
                          </td>
                          <td className="p-1 border-e">
                            <MultiSelectDropDown
                              label="المواد"
                              options={subjects}
                              selected={t.subjectCode ? t.subjectCode.split(', ') : []}
                              onChange={(vals) => updateTeacher(t.id, { subjectCode: vals.join(', ') })}
                              emoji="📚"
                            />
                          </td>
                          <td className="p-1 border-e">
                            <MultiSelectDropDown
                              label="الصفوف"
                              options={grades}
                              selected={t.className ? t.className.split(', ') : []}
                              onChange={(vals) => updateTeacher(t.id, { className: vals.join(', ') })}
                              emoji="🎓"
                            />
                          </td>
                        </>
                      )
                    }
                    {
                      displayedMetrics.filter(m => m.key !== 'violations_score').map(m => {
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
                                  updateTeacher(t.id, { [m.key]: val });
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
                      })
                    }
                    <td
                      className="p-1 border-e cursor-pointer hover:bg-red-50 transition-colors relative group"
                      onClick={() => setViolationModal({ id: t.id, notes: t.violations_notes })}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          className="w-full text-center text-red-600 font-bold outline-none bg-transparent text-xs font-sans"
                          value={t.violations_score}
                          onChange={e => updateTeacher(t.id, { violations_score: parseInt(e.target.value) || 0 })}
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
                    <td key={m.key} className="p-2 border-e transition-colors" style={getMetricStyle(m)}>
                      <div className={`flex flex-col font-black font-sans ${getTextColor(m.color)}`}>
                        <span>{getColSum(m.key)}</span>
                      </div>
                    </td>
                  ))}
                  <td className="p-2 border-e"></td>
                  <td className="p-2 border-e text-blue-700 font-sans">{teachers.reduce((acc, t) => acc + calculateTotal(t), 0)}</td>
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
                    <td key={m.key} className="p-2 border-e transition-colors" style={getMetricStyle(m)}>
                      <div className={`flex flex-col ${getTextColor(m.color)} opacity-80 font-sans`}>
                        <span className="text-[10px] font-bold">{getColPercent(m.key, m.max)}%</span>
                      </div>
                    </td>
                  ))}
                  <td className="p-2 border-e"></td>
                  <td className="p-2 border-e"></td>
                  <td className="p-2 border-e"></td>
                </tr>
                <tr className="bg-white">
                  <td colSpan={filterMode === 'metric' ? 2 : 5} className="p-3 text-right border-none">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black text-slate-400">كاتب التقرير</span>
                      <span className="text-sm font-black text-slate-800 border-b-2 border-slate-100 pb-1 min-w-[200px] inline-block">
                        {writer || currentReport?.writer || '........................'}
                      </span>
                    </div>
                  </td>
                  <td colSpan={20} className="p-3 text-left border-none">
                    <div className="flex flex-col gap-0.5 items-end">
                      <span className="text-xs font-black text-slate-400">مدير الفرع</span>
                      <span className="text-sm font-black text-slate-800 border-b-2 border-slate-100 pb-1 min-w-[200px] inline-block text-center">
                        {(data.profile as SchoolProfile)?.branchManager || '........................'}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Indicators Modal */}
      {showIndicatorsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setShowIndicatorsModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <Target className="text-orange-600" size={28} />
                <span>مؤشرات التقارير</span>
              </h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 px-1">من تاريخ</label>
                  <input
                    type="date"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 focus:border-orange-500 outline-none transition-all"
                    value={aggDateFrom}
                    onChange={(e) => setAggDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 px-1">إلى تاريخ</label>
                  <input
                    type="date"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 focus:border-orange-500 outline-none transition-all"
                    value={aggDateTo}
                    onChange={(e) => setAggDateTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'أسبوعي', label: 'تقرير أسبوعي', color: 'bg-blue-600' },
                  { id: 'شهري', label: 'تقرير شهري', color: 'bg-purple-600' },
                  { id: 'فصلي', label: 'تقرير فصلي', color: 'bg-indigo-600' },
                  { id: 'سنوي', label: 'تقرير سنوي', color: 'bg-emerald-600' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      aggregateReports(item.id);
                      setShowIndicatorsModal(false);
                    }}
                    className={`p-4 ${item.color} text-white rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2`}
                  >
                    <FileOutput size={18} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchive && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-0 w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setShowArchive(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 shadow-sm border border-transparent hover:border-slate-100"><X size={24} /></button>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <FolderOpen className="text-blue-600" size={28} />
                  <span>أرشيف التقارير</span>
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-6 p-1.5 bg-white rounded-2xl shadow-sm border border-slate-100">
                {[
                  { id: 'daily', label: 'يومية' },
                  { id: 'weekly', label: 'أسبوعية' },
                  { id: 'monthly', label: 'شهرية' },
                  { id: 'quarterly', label: 'فصلية' },
                  { id: 'yearly', label: 'سنوية' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setArchiveTab(tab.id as any)}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all text-sm ${archiveTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="البحث عن تاريخ (مثلاً: 2025-06-30)..."
                  className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 focus:border-blue-500 outline-none transition-all pr-12 shadow-sm"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                />
                <Search size={22} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar">
              {(data.dailyReports || [])
                .filter(r => {
                  const isMatch = r.dateStr.includes(archiveSearch);
                  if (archiveTab === 'daily') return isMatch && !r.reportCount;
                  return isMatch && r.dayName === (archiveTab === 'weekly' ? 'أسبوعي' : archiveTab === 'monthly' ? 'شهري' : archiveTab === 'quarterly' ? 'فصلي' : 'سنوي');
                })
                .map(r => (
                  <div
                    key={r.id}
                    className={`group w-full flex items-center gap-3 p-4 rounded-2xl transition-all border-2 ${activeReportId === r.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-50 hover:border-slate-100 shadow-sm'}`}
                  >
                    <button
                      onClick={() => { setActiveReportId(r.id); setShowArchive(false); if (r.writer) setWriter(r.writer); }}
                      className="flex-1 flex items-center justify-between text-right"
                    >
                      <div className="flex flex-col">
                        <span className={`font-black text-sm ${activeReportId === r.id ? 'text-blue-700' : 'text-slate-700'}`}>{r.dateStr}</span>
                        <span className="text-[10px] font-bold text-slate-400">{r.dayName} {r.reportCount ? `(مجمع من ${r.reportCount} يوم)` : ''}</span>
                      </div>
                      <ChevronLeft size={20} className={`transition-transform duration-300 ${activeReportId === r.id ? 'text-blue-600 transform -translate-x-2' : 'text-slate-300 group-hover:text-slate-400'}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteReport(r.id); }}
                      className="p-3 bg-red-50 text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
            </div>
            <button onClick={() => setShowArchive(false)} className="w-full mt-auto p-6 bg-slate-50 rounded-b-[2.5rem] font-black text-slate-500 hover:bg-slate-100 transition-all border-t border-slate-100">إغلاق الأرشيف</button>
          </div>
        </div>
      )}

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
                      <input type="number" className="w-12 p-1 text-center rounded border" value={t.order || 0} onChange={(e) => updateTeacher(t.id, { order: parseInt(e.target.value) })} />
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

      {/* Metric Picker Modal (Customization) */}
      {
        showMetricPicker && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 relative">
              {/* Close Button */}
              <button
                onClick={() => setShowMetricPicker(false)}
                className="absolute top-4 left-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-500 hover:text-slate-800"
              >
                <X size={20} />
              </button>

              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <button
                  onClick={() => {
                    const name = prompt(lang === 'ar' ? 'أدخل مسمى المجال الجديد:' : 'Enter new domain name:');
                    if (name) {
                      const newKey = `metric_${Date.now()}`;
                      const newList = [...metricsList, { key: newKey, label: name, emoji: '🎯', max: 10, color: '#DDEBF7' }];
                      updateData({ metricsList: newList });
                      setSelectedMetrics(prev => [...prev, newKey]);
                    }
                  }}
                  className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
                >
                  <Plus size={14} /> إضافة مجال جديد
                </button>
                <h3 className="font-bold flex-1 text-center mr-8">تخصيص مجالات التقييم</h3>
              </div>
              <p className="text-[10px] text-slate-500 text-center mb-4">يمكنك تغيير مسمى كل مجال، ترتيبه، لونه، أو حذفه</p>

              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 space-y-4 mb-4">
                {metricsConfig.map((m, mIdx) => (
                  <div key={m.key} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 group shadow-sm">
                    <div className="flex items-center gap-2">
                      {/* Reordering Controls */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          disabled={mIdx === 0}
                          onClick={() => {
                            const newList = [...metricsList];
                            [newList[mIdx - 1], newList[mIdx]] = [newList[mIdx], newList[mIdx - 1]];
                            updateData({ metricsList: newList });
                          }}
                          className={`p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-blue-600 transition-colors ${mIdx === 0 ? 'opacity-30' : ''}`}
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          disabled={mIdx === metricsConfig.length - 1}
                          onClick={() => {
                            const newList = [...metricsList];
                            [newList[mIdx], newList[mIdx + 1]] = [newList[mIdx + 1], newList[mIdx]];
                            updateData({ metricsList: newList });
                          }}
                          className={`p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-blue-600 transition-colors ${mIdx === metricsConfig.length - 1 ? 'opacity-30' : ''}`}
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>

                      <button
                        onClick={() => setSelectedMetrics(prev => prev.includes(m.key) ? prev.filter(k => k !== m.key) : [...prev, m.key])}
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedMetrics.includes(m.key) ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-300 border border-slate-200'}`}
                      >
                        <Check size={16} />
                      </button>
                      <input
                        type="text"
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-right outline-none focus:border-blue-500 transition-all font-arabic"
                        value={m.label}
                        onChange={(e) => {
                          const newList = metricsList.map(item => item.key === m.key ? { ...item, label: e.target.value } : item);
                          updateData({ metricsList: newList });
                        }}
                        placeholder="مسمى المجال.."
                      />
                      <button
                        onClick={() => {
                          if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المجال؟ سيتم حذفه من كافة السجلات.' : 'Are you sure you want to delete this domain? It will be removed from all records.')) {
                            const newList = metricsList.filter(item => item.key !== m.key);
                            updateData({ metricsList: newList });
                            setSelectedMetrics(prev => prev.filter(k => k !== m.key));
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف المجال"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 px-10">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400">الدرجة:</label>
                        <input
                          type="number"
                          className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-center outline-none focus:border-blue-500 transition-all"
                          value={m.max}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 0);
                            const newList = metricsList.map(item => item.key === m.key ? { ...item, max: val } : item);
                            updateData({ metricsList: newList });
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2 flex-1">
                        <label className="text-[10px] font-bold text-slate-400">اللون:</label>
                        <div className="flex items-center gap-2">
                          <div className={`relative w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center overflow-hidden hover:border-blue-400 transition-all bg-white`}>
                            <input
                              type="color"
                              className="absolute inset-0 opacity-0 cursor-pointer scale-[3]"
                              value={metricsList.find(i => i.key === m.key)?.color || '#ffffff'}
                              onChange={(e) => {
                                const newList = metricsList.map(item => item.key === m.key ? { ...item, color: e.target.value } : item);
                                updateData({ metricsList: newList });
                              }}
                            />
                            <Palette size={18} className="text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowMetricPicker(false)} className="w-full p-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-900 transition-all">موافق</button>
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
                      updateTeacher(violationModal.id, { violations_notes: newNotes });
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
      {
        showTeacherReport && (
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
                                  onChange={(vals) => updateTeacher(teacher.id, { subjectCode: vals.join(', ') })}
                                  emoji="📚"
                                />
                              ) : fieldKey === 'className' ? (
                                <MultiSelectDropDown
                                  label="الصفوف"
                                  options={grades}
                                  selected={teacher.className ? teacher.className.split(', ') : []}
                                  onChange={(vals) => updateTeacher(teacher.id, { className: vals.join(', ') })}
                                  emoji="🎓"
                                />
                              ) : fieldKey === 'gender' ? (
                                <select className="w-full p-2 bg-slate-50 rounded-lg font-bold text-center outline-none focus:ring-2 ring-blue-100" value={teacher.gender || 'ذكر'} onChange={e => updateTeacher(teacher.id, { gender: e.target.value })}>
                                  <option value="ذكر">ذكر</option>
                                  <option value="أنثى">أنثى</option>
                                </select>
                              ) : fieldKey === 'teacherName' ? (
                                <input
                                  type="text"
                                  className="w-full p-2 bg-slate-50 rounded-lg font-bold text-center outline-none focus:ring-2 ring-blue-100"
                                  value={teacher.teacherName}
                                  onChange={e => updateTeacher(teacher.id, { teacherName: e.target.value })}
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
                                      updateTeacher(teacher.id, { [fieldKey]: val });
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
      {/* Import Teachers Modal */}
      {
        showImportModal && (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-xl font-black text-center mb-2 flex items-center justify-center gap-2">
                <Upload size={24} className="text-orange-600" />
                استيراد أسماء المعلمين
              </h3>
              <p className="text-center text-slate-500 text-sm mb-6">اختر نوع الملف الذي تريد استيراده</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => handleImportTeachers('excel')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all group"
                >
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileSpreadsheet size={24} className="text-white" />
                  </div>
                  <span className="font-bold text-green-700">Excel / CSV</span>
                  <span className="text-[10px] text-slate-400">.xlsx, .xls, .csv</span>
                </button>

                <button
                  onClick={() => handleImportTeachers('xml')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText size={24} className="text-white" />
                  </div>
                  <span className="font-bold text-blue-700">XML</span>
                  <span className="text-[10px] text-slate-400">.xml</span>
                </button>

                <button
                  onClick={() => handleImportTeachers('pdf')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all group"
                >
                  <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText size={24} className="text-white" />
                  </div>
                  <span className="font-bold text-red-700">PDF</span>
                  <span className="text-[10px] text-slate-400">.pdf</span>
                </button>

                <button
                  onClick={() => handleImportTeachers('txt')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all group"
                >
                  <div className="w-12 h-12 bg-slate-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText size={24} className="text-white" />
                  </div>
                  <span className="font-bold text-slate-700">TXT</span>
                  <span className="text-[10px] text-slate-400">.txt</span>
                </button>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-orange-700 text-center">
                  <strong>ملاحظة:</strong> يجب أن يحتوي الملف على أسماء المعلمين فقط، كل اسم في سطر منفصل أو في عمود واحد
                </p>
              </div>

              <button
                onClick={() => setShowImportModal(false)}
                className="w-full p-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        )
      }
      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={processImportedFile}
      />
    </div >
  );
});

// --- Violations Page ---
export const ViolationsPage: React.FC = React.memo(() => {
  const { lang, data, updateData } = useGlobal();
  const [activeMode, setActiveMode] = useState<'students' | 'teachers'>('students');

  // Filtering states
  const today = new Date().toISOString().split('T')[0];
  const [filterValues, setFilterValues] = useState({ start: today, end: today });
  const [appliedNames, setAppliedNames] = useState<string[]>([]);
  const [tempNames, setTempNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);

  const studentList = data.studentReports || [];

  // Map teacher names to their profiles for quick lookup and auto-fill
  const teacherProfiles = useMemo(() => {
    const profiles: Record<string, { subject: string, class: string }> = {};

    // 1. Get from timetable (base list)
    (data.timetable || []).forEach(t => {
      if (t.teacherName) {
        const name = t.teacherName.trim();
        profiles[name] = { subject: t.subject || '', class: '' };
      }
    });

    // 2. Supplement from dailyReports (natural order: newest at end will win)
    (data.dailyReports || []).forEach(r => {
      r.teachersData.forEach(t => {
        if (t.teacherName) {
          const name = t.teacherName.trim();
          profiles[name] = {
            subject: t.subjectCode || profiles[name]?.subject || '',
            class: t.className || profiles[name]?.class || ''
          };
        }
      });
    });
    return profiles;
  }, [data.dailyReports, data.timetable]);

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
        const prevCount = (data.violations || []).filter(v => v.type === 'students' && v.studentName === student.name).length;
        const updated = data.violations.map(v => v.id === rowId ? {
          ...v,
          studentName: student.name,
          grade: student.grade,
          section: student.section,
          prevViolations: prevCount
        } : v);
        updateData({ violations: updated });
      }
    } else {
      const profile = teacherProfiles[suggestionName];
      if (profile) {
        const prevCount = (data.violations || []).filter(v => v.type === 'teachers' && v.teacherName === suggestionName).length;
        const updated = data.violations.map(v => v.id === rowId ? {
          ...v,
          teacherName: suggestionName,
          subject: profile.subject,
          class: profile.class,
          prevViolations: prevCount
        } : v);
        updateData({ violations: updated });
      }
    }
    setActiveSearchId(null);
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

  const handleWhatsAppIndividual = (row: any) => {
    let msg = `*📋 إشعار تعهد ومخالفة (${activeMode === 'students' ? 'طلاب' : 'معلمون'})*\n\n`;
    msg += `👤 *الاسم:* ${activeMode === 'students' ? row.studentName : row.teacherName}\n`;
    msg += `📍 *الصف:* ${row.grade || row.class || '---'} ${activeMode === 'students' ? `/ ${row.section || '---'}` : ''}\n`;
    if (activeMode === 'teachers') msg += `📚 *المادة:* ${row.subject || '---'}\n`;
    msg += `🔢 *عدد المخالفات:* ${row.prevViolations || 0}\n`;
    msg += `📅 *التاريخ:* ${row.date} (${row.day || '---'})\n`;
    msg += `⚠️ *بيان المخالفة:* _${row.violation || '---'}_\n`;
    msg += `🛡️ *الإجراء المتخذ:* _${row.procedure || '---'}_\n`;
    msg += `✍️ *التوقيع:* _${row.signature || '---'}_\n\n`;

    const profile = data.profile;
    if (profile.schoolName) msg += `🏫 *${profile.schoolName}*`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
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

      <div className="bg-white rounded-[2.5rem] shadow-xl border overflow-visible">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
          <table className="w-full border-collapse min-w-[800px] md:min-w-full">
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
                  <th className="p-4 border-e border-slate-300 w-16 text-green-600 bg-green-50/50"><button onClick={handleWhatsApp} title="إرسال الكل للواتساب"><MessageCircle size={18} className="mx-auto" /></button></th>
                  <th className="p-4 w-12"></th>
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
                  <th className="p-4 border-e border-slate-300 w-16 text-green-600 bg-green-50/50"><button onClick={handleWhatsApp} title="إرسال الكل للواتساب"><MessageCircle size={18} className="mx-auto" /></button></th>
                  <th className="p-4 w-12"></th>
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

                    <td className="p-2 border-e border-slate-100 relative overflow-visible">
                      <input
                        className="w-full text-right bg-transparent outline-none focus:ring-1 ring-blue-200 rounded p-1"
                        value={activeMode === 'students' ? v.studentName : v.teacherName}
                        onFocus={() => setActiveSearchId(v.id)}
                        onBlur={() => setTimeout(() => setActiveSearchId(null), 200)}
                        onChange={(e) => updateViolation(v.id, activeMode === 'students' ? 'studentName' : 'teacherName', e.target.value)}
                        placeholder="اكتب الاسم..."
                      />
                      {activeSearchId === v.id && (activeMode === 'students' ? v.studentName : v.teacherName).trim() !== '' && (
                        <div className="absolute bottom-full left-0 right-0 z-[9999] bg-white border-2 shadow-2xl rounded-xl max-h-48 overflow-y-auto block mb-1 border-blue-100" style={{ position: 'absolute', zIndex: 9999 }}>
                          {(activeMode === 'students' ? studentList.map(s => s.name) : teacherList)
                            .filter(n => n.includes(activeMode === 'students' ? v.studentName : v.teacherName))
                            .filter(n => n !== (activeMode === 'students' ? v.studentName : v.teacherName))
                            .slice(0, 8)
                            .map(suggestion => (
                              <button
                                key={suggestion}
                                onMouseDown={() => handleSelectSuggestion(v.id, suggestion)}
                                className="w-full text-right p-3 text-[11px] hover:bg-blue-50 border-b last:border-none font-black text-slate-700 hover:text-blue-700 transition-colors"
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

                    <td className="p-2 border-e border-slate-100">
                      <button onClick={() => handleWhatsAppIndividual(v)} className="text-green-500 hover:text-green-700 transition-colors p-2 hover:bg-green-50 rounded-lg" title="إرسال واتس">
                        <MessageCircle size={18} />
                      </button>
                    </td>

                    <td className="p-2">
                      <button onClick={() => deleteViolation(v.id)} className="text-red-300 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg">
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
});

// Memoized Row for performance optimization
const StudentRow = memo(({ s, optionsAr, optionsEn, lang, updateStudent, setShowNotesModal, toggleStar, isHighlighted, onRowClick, setWaSelector, isSelected, onSelect, onDelete, index, showBulkActions }: {
  s: StudentReport;
  optionsAr: any;
  optionsEn: any;
  lang: string;
  updateStudent: (id: string, field: string, value: any) => void;
  setShowNotesModal: (s: any) => void;
  toggleStar: (id: string, type: any) => void;
  isHighlighted: boolean;
  onRowClick: (id: any) => void;
  setWaSelector: (val: any) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  index: number;
  showBulkActions: boolean;
}) => {
  return (
    <tr onClick={() => onRowClick(s.id)} className={`transition-colors h-10 group cursor-pointer ${isHighlighted ? 'bg-yellow-50' : 'hover:bg-blue-50/20'}`}>
      <td className={`p-1 border-e border-slate-100 transition-colors ${isHighlighted ? 'bg-yellow-50' : 'bg-white group-hover:bg-blue-50'} w-20`}>
        <div className="flex items-center justify-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} className="p-1 text-slate-300 hover:text-red-500 transition-colors" title={lang === 'ar' ? 'حذف الطالب' : 'Delete Student'}>
            <Trash2 size={12} />
          </button>
          <span className="text-[10px] font-black text-slate-400 w-4 text-center">{index + 1}</span>
          <input
            type="checkbox"
            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); onSelect(s.id); }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </td>
      <td className={`p-1 border-e border-slate-100 transition-colors ${isHighlighted ? 'bg-yellow-50' : 'bg-white group-hover:bg-blue-50'}`}>
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
      <td className="p-1 border-e border-slate-100 bg-[#E2F0D9]/10">
        <input className={`text-[8px] w-full text-center outline-none bg-transparent ${s.absenceSummary?.includes('بدون') ? 'text-red-500 font-bold' : ''}`} value={s.absenceSummary || ''} onChange={(e) => updateStudent(s.id, 'absenceSummary', e.target.value)} placeholder="..." />
      </td>
      <td className="p-1 border-e border-slate-100 bg-[#E2F0D9]/10">
        <input className="text-[8px] w-full text-center outline-none bg-transparent" value={s.latenessSummary || ''} onChange={(e) => updateStudent(s.id, 'latenessSummary', e.target.value)} placeholder="..." />
      </td>
      <td className="p-1 border-e border-slate-100 bg-[#E2F0D9]/10">
        <input className="text-[8px] w-full text-center outline-none bg-transparent" value={s.exitSummary || ''} onChange={(e) => updateStudent(s.id, 'exitSummary', e.target.value)} placeholder="..." />
      </td>
      <td className="p-1 border-e border-slate-100 bg-[#E2F0D9]/10">
        <input className={`text-[8px] w-full text-center outline-none bg-transparent ${s.violationSummary ? 'text-red-600 font-black' : ''}`} value={s.violationSummary || ''} onChange={(e) => updateStudent(s.id, 'violationSummary', e.target.value)} placeholder="..." />
      </td>
      <td className="p-1 border-e border-slate-100 bg-[#E2F0D9]/10">
        <input className="text-[8px] w-full text-center outline-none bg-transparent" value={s.damageSummary || ''} onChange={(e) => updateStudent(s.id, 'damageSummary', e.target.value)} placeholder="..." />
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
      <td className="p-1 text-center border-e border-slate-100">
        <button onClick={(e) => { e.stopPropagation(); setShowNotesModal({ id: s.id, text: s.notes }); }} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all">
          <FileText size={14} />
        </button>
      </td>
      <td className="p-1 border-e border-slate-100">
        <div className="flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); setWaSelector({ type: 'single', student: s }); }}
            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all"
            title={lang === 'ar' ? 'إرسال واتساب' : 'Send WhatsApp'}
          >
            <MessageCircle size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
});

export const StudentsReportsPage: React.FC = React.memo(() => {
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

  // Advanced Deletion States
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showDeleteStudentsModal, setShowDeleteStudentsModal] = useState(false);
  const [deletionFilters, setDeletionFilters] = useState({ grades: [] as string[], sections: [] as string[], deleteDuplicates: false });

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
    { key: 'abs', label: 'الغياب اليومي' },
    { key: 'late', label: 'التأخر' },
    { key: 'exit', label: 'خروج طالب' },
    { key: 'viol', label: 'المخالفات الطلابية' },
    { key: 'damage', label: 'الإتلاف المدرسي' },
    { key: 'main_notes', label: 'الملاحظات الأساسية' },
    { key: 'guardian_followup', label: 'ولي الأمر المتابع (تعليم، متابعة، تعاون)' },
    { key: 'other_notes', label: 'ملاحظات أخرى' },
  ];

  // New States for Blacklist and Excellence lists
  const [showListModal, setShowListModal] = useState<'blacklist' | 'excellence' | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [tempListSelected, setTempListSelected] = useState<string[]>([]);

  useEffect(() => {
    const highlightName = localStorage.getItem('highlight_student_name');
    if (highlightName) {
      setFilterMode('student');
      setSelectedStudentNames([highlightName]);
      localStorage.removeItem('highlight_student_name');
    }
  }, []);

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
    guardianCooperation: "تعاون ولي الأمر",
    absenceSummary: "الغياب اليومي",
    latenessSummary: "التأخر",
    exitSummary: "خروج طالب",
    violationSummary: "المخالفات الطلابية",
    damageSummary: "الإتلاف المدرسي"
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
    guardianCooperation: "Guardian Cooperation",
    absenceSummary: "Absence",
    latenessSummary: "Lateness",
    exitSummary: "Exit",
    violationSummary: "Violations",
    damageSummary: "Damage"
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

  const deleteStudent = (id: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الطالب؟' : 'Are you sure you want to delete this student?')) return;
    updateData({ studentReports: studentData.filter(s => s.id !== id) });
    // Reset selection if deleted
    setSelectedStudentIds(prev => prev.filter(sid => sid !== id));
  };

  const bulkDeleteStudents = () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف الأسماء المحددة؟' : 'Are you sure you want to delete the selected names?')) return;
    updateData({ studentReports: studentData.filter(s => !selectedStudentIds.includes(s.id)) });
    setSelectedStudentIds([]);
  };

  const normalizeArabic = (text: any): string => {
    if (!text) return '';
    return String(text)
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim();
  };

  const handleAdvancedDelete = () => {
    const { grades, sections, deleteDuplicates } = deletionFilters;
    if (grades.length === 0 && sections.length === 0 && !deleteDuplicates) return;

    // Normalizing filters to ensure matching (including Arabic character normalization)
    const normalizedGrades = grades.map(g => normalizeArabic(g));
    const normalizedSections = sections.map(s => normalizeArabic(s));

    let studentsToProcess = [...studentData];
    let deletedCount = 0;

    // 1. Handle Duplicates if selected
    if (deleteDuplicates) {
      const seen = new Map<string, StudentReport>();
      const toKeep: StudentReport[] = [];
      const sortedData = [...studentsToProcess].sort((a, b) =>
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
      sortedData.forEach(s => {
        const key = `${s.name.trim()}-${normalizeArabic(s.grade)}-${normalizeArabic(s.section)}`;
        if (!seen.has(key)) {
          seen.set(key, s);
          toKeep.push(s);
        }
      });
      deletedCount += (studentsToProcess.length - toKeep.length);
      studentsToProcess = toKeep;
    }

    // 2. Handle Grades/Sections filtering
    let finalData = [...studentsToProcess];
    if (normalizedGrades.length > 0 || normalizedSections.length > 0) {
      const afterFiltering = studentsToProcess.filter(s => {
        const sGrade = normalizeArabic(s.grade);
        const sSection = normalizeArabic(s.section);

        const gradeMatch = normalizedGrades.length === 0 || normalizedGrades.includes(sGrade);
        const sectionMatch = normalizedSections.length === 0 || normalizedSections.includes(sSection);

        // Combined logic (Intersection) as per requirement: Grade AND Section must match if both are selected
        const shouldDelete = gradeMatch && sectionMatch;
        return !shouldDelete;
      });
      deletedCount += (studentsToProcess.length - afterFiltering.length);
      finalData = afterFiltering;
    }

    if (deletedCount === 0) {
      alert(lang === 'ar' ? 'لم يتم العثور على طلاب مطابقين لحذفهم' : 'No matching students found to delete');
      return;
    }

    const confirmMsg = lang === 'ar'
      ? `سيتم حذف ${deletedCount} طالب بشكل نهائي. هل أنت متأكد؟`
      : `Are you sure you want to delete ${deletedCount} students permanently?`;

    if (!confirm(confirmMsg)) return;

    updateData({ studentReports: finalData });
    setShowDeleteStudentsModal(false);
    setDeletionFilters({ grades: [], sections: [], deleteDuplicates: false });
    setSelectedStudentIds([]); // Clear selection to be safe
    alert(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
  };

  const handleDeleteDuplicates = () => {
    setShowDeleteStudentsModal(true);
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
          normalizeArabic(existing.name) === normalizeArabic(imp.name) &&
          normalizeArabic(existing.grade) === normalizeArabic(imp.grade) &&
          normalizeArabic(existing.section) === normalizeArabic(imp.section)
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
      result = result.filter(s => normalizeArabic(s.grade) === normalizeArabic(filterValue));
    } else if (filterMode === 'section' && filterValue) {
      result = result.filter(s => normalizeArabic(s.section) === normalizeArabic(filterValue));
    } else if (filterMode === 'specific' && selectedSpecifics.length > 0) {
      const normalizedSpecifics = selectedSpecifics.map(sx => normalizeArabic(sx));
      result = result.filter(s =>
        normalizedSpecifics.includes(normalizeArabic(s.healthStatus)) ||
        normalizedSpecifics.includes(normalizeArabic(s.behaviorLevel)) ||
        normalizedSpecifics.includes(normalizeArabic(s.grade)) ||
        normalizedSpecifics.includes(normalizeArabic(s.section)) ||
        s.mainNotes.some(n => normalizedSpecifics.includes(normalizeArabic(n)))
      );
    }

    // Auto-sync metrics from special reports
    return result.map(s => {
      const absences = (data.absenceLogs || []).filter(l => l.studentId === s.id);
      const lateness = (data.studentLatenessLogs || []).filter(l => l.studentId === s.id);
      const exits = (data.exitLogs || []).filter(l => l.studentId === s.id);
      const violations = (data.studentViolationLogs || []).filter(l => l.studentId === s.id);
      const damages = (data.damageLogs || []).filter(l => l.studentId === s.id);

      const calculatedAbsence = absences.length > 0 ? `بعذر: ${absences.filter(a => a.reason.includes('بعذر')).length}، بدون: ${absences.filter(a => !a.reason.includes('بعذر')).length}` : '';
      const calculatedLateness = lateness.length > 0 ? `${lateness.length}` : '';
      const calculatedExit = exits.length > 0 ? `${exits.length}` : '';
      const calculatedViolation = violations.length > 0 ? violations.map(v => [...(v.behaviorViolations || []), ...(v.dutiesViolations || []), ...(v.achievementViolations || [])].join('، ')).filter(v => v).join(' | ') : '';
      const calculatedDamage = damages.length > 0 ? damages.map(d => d.description).join(' | ') : '';

      return {
        ...s,
        absenceSummary: s.absenceSummary || calculatedAbsence,
        latenessSummary: s.latenessSummary || calculatedLateness,
        exitSummary: s.exitSummary || calculatedExit,
        violationSummary: s.violationSummary || calculatedViolation,
        damageSummary: s.damageSummary || calculatedDamage,
      };
    });
  }, [studentData, filterMode, filterValue, selectedSpecifics, selectedStudentNames, data.absenceLogs, data.studentLatenessLogs, data.exitLogs, data.studentViolationLogs, data.damageLogs]);

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
      text += `*👤 الطالب (${i + 1}):*\n`;
      const isAll = fields.includes('all');

      if (isAll || fields.includes('name')) text += `  ▫️ *الاسم:* ${s.name}\n`;
      if (isAll || fields.includes('grade')) text += `  ▫️ *الصف:* ${s.grade}\n`;
      if (isAll || fields.includes('section')) text += `  ▫️ *الشعبة:* ${s.section}\n`;
      if (isAll || fields.includes('gender')) text += `  ▫️ *النوع:* ${s.gender}\n`;
      if (isAll || fields.includes('address_work')) {
        text += `  🏠 *السكن:* ${s.address || '---'}\n`;
        text += `  💼 *العمل:* ${s.workOutside}\n`;
      }
      if (isAll || fields.includes('health')) {
        text += `  🏥 *الحالة الصحية:* ${formatWAValue(s.healthStatus)}${s.healthDetails ? ` (${s.healthDetails})` : ''}\n`;
      }
      if (isAll || fields.includes('guardian')) {
        text += `  👨‍👩‍👧 *ولي الأمر:* ${s.guardianName || '---'}\n`;
        text += `  📞 *الهواتف:* ${s.guardianPhones.join(' - ')}\n`;
      }
      if (isAll || fields.includes('academic')) {
        text += `  📚 *المستوى العلمي:*\n`;
        text += `     📖 القراءة: ${formatWAValue(s.academicReading)}\n`;
        text += `     ✍️ الكتابة: ${formatWAValue(s.academicWriting)}\n`;
        text += `     🙋 المشاركة: ${formatWAValue(s.academicParticipation)}\n`;
      }
      if (isAll || fields.includes('behavior')) {
        text += `  🎭 *المستوى السلوكي:* ${formatWAValue(s.behaviorLevel)}\n`;
      }
      if (isAll || fields.includes('abs')) {
        text += `  🕒 *الغياب اليومي:* ${s.absenceSummary ? formatWAValue(s.absenceSummary) : '---'}\n`;
      }
      if (isAll || fields.includes('late')) {
        text += `  ⏱️ *التأخر:* ${s.latenessSummary ? formatWAValue(s.latenessSummary) : '---'}\n`;
      }
      if (isAll || fields.includes('exit')) {
        text += `  🚪 *خروج أثناء الدراسة:* ${s.exitSummary ? formatWAValue(s.exitSummary) : '---'}\n`;
      }
      if (isAll || fields.includes('viol')) {
        text += `  ⚠️ *المخالفات الطلابية:* ${s.violationSummary ? formatWAValue(s.violationSummary) : '---'}\n`;
      }
      if (isAll || fields.includes('damage')) {
        text += `  🔨 *الإتلاف المدرسي:* ${s.damageSummary ? formatWAValue(s.damageSummary) : '---'}\n`;
      }
      if (isAll || fields.includes('main_notes')) {
        if (s.mainNotes.length > 0) {
          text += `  🚨 *الملاحظات الأساسية:*\n`;
          s.mainNotes.forEach(n => text += `     🔴 ${n}\n`);
        } else {
          text += `  🚨 *الملاحظات الأساسية:* ---\n`;
        }
      }
      if (isAll || fields.includes('guardian_followup')) {
        text += `  🤝 *متابعة ولي الأمر:*\n`;
        text += `     🎓 التعليم: ${s.guardianEducation}\n`;
        text += `     📈 المتابعة: ${formatWAValue(s.guardianFollowUp)}\n`;
        text += `     🤝 التعاون: ${formatWAValue(s.guardianCooperation)}\n`;
      }
      if (isAll || fields.includes('other_notes')) {
        if (s.notes) text += `  📝 *ملاحظات أخرى:* ${s.notes}\n`;
        if (s.otherNotesText) text += `  🔖 *ملاحظات برمجية:* ${s.otherNotesText}\n`;
      }
      text += `\n`;
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
            className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2.5 rounded-xl font-bold text-sm border border-red-200 hover:bg-red-100 transition-all font-black"
          >
            <Trash2 size={16} /> {lang === 'ar' ? 'حذف الطلاب' : 'Delete Students'}
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
              <tr className="border-b border-slate-300 h-12 text-center">
                <th rowSpan={2} className="px-2 border-e border-slate-300 w-20 sticky top-0 bg-[#FFD966] z-30 whitespace-nowrap">
                  <div className="flex flex-col items-center gap-1">
                    {selectedStudentIds.length > 0 && (
                      <button
                        onClick={bulkDeleteStudents}
                        className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm animate-in fade-in zoom-in duration-200"
                        title={lang === 'ar' ? 'حذف المحددة' : 'Delete Selected'}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-[10px] font-black">{lang === 'ar' ? 'م' : 'No.'}</span>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded"
                        checked={filteredData.length > 0 && selectedStudentIds.length === filteredData.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStudentIds(filteredData.map(s => s.id));
                          else setSelectedStudentIds([]);
                        }}
                      />
                    </div>
                  </div>
                </th>
                <th rowSpan={2} className="px-3 border-e border-slate-300 w-[160px] text-xs font-black sticky top-0 bg-[#FFD966] z-30">{lang === 'ar' ? 'اسم الطالب' : 'Student Name'}</th>
                <th rowSpan={2} className="px-1 border-e border-slate-300 w-20 text-xs font-black">{lang === 'ar' ? 'الصف' : 'Grade'}</th>
                <th rowSpan={2} className="px-1 border-e border-slate-300 w-16 text-xs font-black">{lang === 'ar' ? 'الشعبة' : 'Section'}</th>

                {!isOnlyMetricView && (
                  <>
                    <th rowSpan={2} className="px-1 border-e border-slate-300 w-16 text-xs font-black">{lang === 'ar' ? 'النوع' : 'Gender'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-24 text-xs font-black">{lang === 'ar' ? 'السكن / العمل' : 'Residence / Work'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-24 text-xs font-black">{lang === 'ar' ? 'الحالة الصحية' : 'Health Status'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-32 text-xs font-black">{lang === 'ar' ? 'ولي الأمر (الاسم/الهواتف)' : 'Guardian (Name/Phones)'}</th>
                    <th colSpan={3} className="px-1 border-e border-slate-300 bg-[#FFF2CC] text-xs font-black">{lang === 'ar' ? 'المستوى العلمي' : 'Academic Level'}</th>
                    <th colSpan={5} className="px-1 border-e border-slate-300 bg-[#E2F0D9] text-xs font-black">{lang === 'ar' ? 'سجل المتابعة الخاصة' : 'Special Logs'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-24 text-xs font-black">{lang === 'ar' ? 'المستوى السلوكي' : 'Behavior Level'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-44 text-xs font-black">{lang === 'ar' ? 'الملاحظات الأساسية' : 'Main Notes'}</th>
                    <th colSpan={3} className="px-1 border-e border-slate-300 bg-[#DDEBF7] text-xs font-black">{lang === 'ar' ? 'ولي الأمر المتابع' : 'Guardian Follow-up'}</th>
                    <th rowSpan={2} className="px-2 border-e border-slate-300 w-10 text-xs font-black">{lang === 'ar' ? 'ملاحظات أخرى' : 'Other Notes'}</th>
                    <th rowSpan={2} className="px-2 border-slate-300 w-16 text-xs font-black">
                      <button onClick={sendWhatsApp} className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-lg text-[9px] hover:bg-green-700 mx-auto">
                        <MessageCircle size={10} /> {lang === 'ar' ? 'إرسال واتس' : 'Send WA'}
                      </button>
                    </th>
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
                  <th className="border-e border-slate-300 bg-[#E2F0D9]/50 text-[8px]">{lang === 'ar' ? 'الغياب' : 'Absence'}</th>
                  <th className="border-e border-slate-300 bg-[#E2F0D9]/50 text-[8px]">{lang === 'ar' ? 'التأخر' : 'Lateness'}</th>
                  <th className="border-e border-slate-300 bg-[#E2F0D9]/50 text-[8px]">{lang === 'ar' ? 'الخروج' : 'Exit'}</th>
                  <th className="border-e border-slate-300 bg-[#E2F0D9]/50 text-[8px]">{lang === 'ar' ? 'المخالفات' : 'Violations'}</th>
                  <th className="border-e border-slate-300 bg-[#E2F0D9]/50 text-[8px]">{lang === 'ar' ? 'الإتلاف' : 'Damage'}</th>
                  <th className="border-e border-slate-300 bg-[#DDEBF7]/50">{lang === 'ar' ? 'تعليم' : 'Edu'}</th>
                  <th className="border-e border-slate-300 bg-[#DDEBF7]/50">{lang === 'ar' ? 'متابعة' : 'Follow'}</th>
                  <th className="border-e border-slate-300 bg-[#DDEBF7]/50">{lang === 'ar' ? 'تعاون' : 'Coop'}</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={isOnlyMetricView ? 4 + activeMetricFilter.length : 24} className="py-10 text-slate-400 italic text-sm">
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
                    setWaSelector={setWaSelector}
                    isSelected={selectedStudentIds.includes(s.id)}
                    onSelect={(id) => setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    onDelete={deleteStudent}
                    index={idx}
                    showBulkActions={selectedStudentIds.length > 0}
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
      {showDeleteStudentsModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-arabic">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200 text-right overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-black text-red-600 flex items-center gap-2">
                <Trash2 size={24} /> {lang === 'ar' ? 'خيارات حذف الطلاب' : 'Delete Students Options'}
              </h3>
              <button onClick={() => setShowDeleteStudentsModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
            </div>

            <div className="space-y-6">
              {/* Delete Duplicates Choice */}
              <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border-2 border-transparent has-[:checked]:border-red-200 has-[:checked]:bg-red-50/30">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded text-red-600"
                  checked={deletionFilters.deleteDuplicates}
                  onChange={e => setDeletionFilters({ ...deletionFilters, deleteDuplicates: e.target.checked })}
                />
                <div className="flex-1">
                  <div className="font-black text-sm">{lang === 'ar' ? 'أ / حذف التكرار' : 'A / Delete Duplicates'}</div>
                  <div className="text-[10px] text-slate-500 font-bold mt-1">
                    {lang === 'ar' ? 'يتم حذف جميع السجلات المكررة (الاسم، الصف، الشعبة) والإبقاء على الأقدم فقط' : 'Deletes all duplicate records (Name, Grade, Section), keeping only the oldest version.'}
                  </div>
                </div>
              </label>

              {/* Delete by Grade */}
              <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                <div className="font-black text-sm text-slate-600">{lang === 'ar' ? 'ب / حذف صف كامل' : 'B / Delete Full Grade'}</div>
                <div className="flex flex-wrap gap-1">
                  {optionsAr.grades.map(g => (
                    <button
                      key={g}
                      onClick={() => setDeletionFilters({
                        ...deletionFilters,
                        grades: deletionFilters.grades.includes(g) ? deletionFilters.grades.filter(x => x !== g) : [...deletionFilters.grades, g]
                      })}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black border-2 transition-all ${deletionFilters.grades.includes(g) ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-500 border-slate-100 hover:border-red-200'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete by Section */}
              <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                <div className="font-black text-sm text-slate-600">{lang === 'ar' ? 'ج / حذف شعبة كاملة' : 'C / Delete Full Section'}</div>
                <div className="flex flex-wrap gap-1">
                  {optionsAr.sections.map(s => (
                    <button
                      key={s}
                      onClick={() => setDeletionFilters({
                        ...deletionFilters,
                        sections: deletionFilters.sections.includes(s) ? deletionFilters.sections.filter(x => x !== s) : [...deletionFilters.sections, s]
                      })}
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-black border-2 transition-all ${deletionFilters.sections.includes(s) ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-500 border-slate-100 hover:border-red-200'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0 w-5 h-5" />
                <p className="text-[10px] font-bold text-amber-800 leading-relaxed">
                  {lang === 'ar'
                    ? 'في حال تحديد صف وشعبة معاً، سيتم حذف الطلاب المنتمين لهذا الصف بالشعبة المحددة فقط. يمكن اختيار أكثر من خيار في كل قسم.'
                    : 'If both a grade and a section are selected, only students in that specific combination will be deleted. Multiple choices are allowed.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleAdvancedDelete}
                disabled={!deletionFilters.deleteDuplicates && deletionFilters.grades.length === 0 && deletionFilters.sections.length === 0}
                className="flex-1 bg-red-600 text-white p-4 rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {lang === 'ar' ? 'تنفيذ الحذف' : 'Confirm Deletion'}
              </button>
              <button onClick={() => setShowDeleteStudentsModal(false)} className="px-6 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

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
});
