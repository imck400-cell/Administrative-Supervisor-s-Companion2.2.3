import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGlobal } from '../context/GlobalState';
import { Save, FileSpreadsheet, Plus, Combine, History, TrendingUp, ChevronLeft, Search, CheckCircle2, ChevronDown, Download, AlertCircle, X, Trash2, Star, Check } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

interface GradeSheet {
  id?: string;
  schoolName: string;
  branch: string;
  teacherName: string;
  subject: string;
  grade: string;
  section: string;
  sheetName: string;
  date: string;
  months: string[]; // ['شهر الأول', 'شهر الثاني', 'شهر الثالث']
  cells: Record<string, string>; // key: `${studentId}-${colId}` -> value
  userId: string;
  timestamp: string;
  maxScores?: Record<string, number>;
  disabledCols?: string[];
}

export const GradeSheetsView = ({ onBack }: { onBack: () => void }) => {
  const { lang, data, currentUser } = useGlobal();
  const [sheets, setSheets] = useState<GradeSheet[]>([]);
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);

  const SUBJECTS = ['القرآن كريم', 'التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الكيمياء', 'الفيزياء', 'الأحياء', 'الاجتماعيات', 'الحاسوب'];
  const GRADES = ['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const SECTIONS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'];

  // Calculate available permissions
  const availableSchools = useMemo(() => {
    if (currentUser?.role === 'admin' || currentUser?.permissions?.all) {
      return Object.keys(data.profile?.schoolsAndBranches || {});
    }
    const userRecord = data.users?.find(u => u.id === currentUser?.id);
    return userRecord?.schools || [];
  }, [currentUser, data.profile?.schoolsAndBranches, data.users]);

  // Form Fields
  const [schoolName, setSchoolName] = useState(currentUser?.selectedSchool || availableSchools[0] || '');
  const [branch, setBranch] = useState(currentUser?.selectedBranch || '');
  
  const availableBranches = useMemo(() => {
    if (!schoolName) return [];
    if (currentUser?.role === 'admin' || currentUser?.permissions?.all) {
      const branchesDict = data.profile?.schoolsAndBranches || {};
      return branchesDict[schoolName] || [];
    }
    const userPerms = data.users?.find(u => u.id === currentUser?.id)?.permissions?.schoolsAndBranches;
    return userPerms?.[schoolName] || [];
  }, [schoolName, currentUser, data.users, data.profile?.schoolsAndBranches]);

  useEffect(() => {
    if (schoolName && availableBranches.length > 0 && !availableBranches.includes(branch)) {
      setBranch(availableBranches[0]);
    }
  }, [schoolName, availableBranches]);

  const availableTeachers = useMemo(() => {
    if (!schoolName || !branch) return [{ id: currentUser?.id, name: currentUser?.name }];
    const isManager = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
    if (!isManager) {
       return [{ id: currentUser?.id || 'id', name: currentUser?.name || 'مستخدم غير معروف' }];
    }
    const teachers = (data.users || []).filter(u => 
      u.schools?.includes(schoolName) && 
      (u.permissions?.schoolsAndBranches?.[schoolName]?.includes(branch) || u.role === 'admin' || u.permissions?.all)
    ).map(u => ({ id: u.id, name: u.name }));
    
    if (!teachers.find(t => t.id === currentUser?.id)) {
      teachers.push({ id: currentUser?.id || 'id', name: currentUser?.name || 'مستخدم غير معروف' });
    }
    return teachers;
  }, [schoolName, branch, data.users, currentUser]);

  const [teacherName, setTeacherName] = useState(currentUser?.name || '');
  const [subject, setSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);

  const [months, setMonths] = useState(['شهر الأول', 'شهر الثاني', 'شهر الثالث']);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [maxScores, setMaxScores] = useState<Record<string, number>>({ w_k: 10, w_m: 10, oral: 10, attend: 10, written: 60, term_result: 20 });
  const [disabledCols, setDisabledCols] = useState<string[]>([]);
  
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  
  const canEditData = currentUser?.role === 'admin' || currentUser?.permissions?.all === true || 
    currentUser?.permissions?.gradeSheets === undefined || 
    (Array.isArray(currentUser?.permissions?.gradeSheets) && currentUser.permissions.gradeSheets.includes('edit_data'));
  
  // Highlighting specific rows
  const [highlightedRows, setHighlightedRows] = useState<string[]>([]);

  // Modals for Indicators and Visible Months
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [showVisibleMonthsModal, setShowVisibleMonthsModal] = useState(false);
  const [visibleMonths, setVisibleMonths] = useState<number[]>([0, 1, 2]);

  const [indicatorConfig, setIndicatorConfig] = useState({
      months: [] as number[],
      fields: [] as string[],
      level: '' as string
  });
  
  // Columns definition per month
  const monthCols = [
    { id: 'w_k', label: 'واجب (ك)' },
    { id: 'w_m', label: 'واجب (م)' },
    { id: 'oral', label: 'شفوي' },
    { id: 'attend', label: 'مواظبة' },
    { id: 'written', label: 'تحريري' },
    { id: 'total_m', label: 'مجموع', isTotal: true },
    { id: 'ratio_m', label: 'النسبة', isTotal: true }
  ];

  const finalCols = [
    { id: 'term_result', label: 'المحصلة الفصلية' },
    { id: 'term_exam', label: 'اختبار فصلي' }
  ];

  const students = useMemo(() => {
    let filtered = (data.secretariatStudents || []) as any[];
    if (schoolName) {
      filtered = filtered.filter(s => s.school === schoolName);
    }
    if (branch) {
      filtered = filtered.filter(s => s.branch === branch);
    }
    if (selectedGrade) {
      filtered = filtered.filter(s => s.grade === selectedGrade);
    }
    if (selectedSection) {
      filtered = filtered.filter(s => s.section === selectedSection);
    }
    return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  }, [data.secretariatStudents, schoolName, branch, selectedGrade, selectedSection]);

  // Handle Indicators filter
  const displayedStudents = useMemo(() => {
    if (!indicatorConfig.level) return students;
    
    // Calculate total score for each student to sort
    const studentsWithScore = students.map(s => {
      let hasWritten = false;
      let hasAnyGrade = false;
      
      const targetMonths = indicatorConfig.months.length > 0 ? indicatorConfig.months : visibleMonths;
      const targetFields = indicatorConfig.fields.length > 0 ? indicatorConfig.fields : ['w_k', 'w_m', 'oral', 'attend', 'written'];
      
      let indicatorTotal = 0;
      let indicatorMax = 0;
      
      targetMonths.forEach(mIdx => {
          targetFields.forEach(f => {
              const val = cells[`${s.id}-m${mIdx}-${f}`];
              if (val !== undefined && val.trim() !== '') {
                  hasAnyGrade = true;
                  indicatorTotal += parseFloat(val) || 0;
              }
              if (f === 'written') {
                  if (val && val.trim() !== '') hasWritten = true;
              }
              const maxF = maxScores[f] || (f === 'written' ? 60 : 10);
              indicatorMax += maxF;
          });
      });
      
      const percentage = indicatorMax > 0 ? (indicatorTotal / indicatorMax) * 100 : 0;

      return { ...s, indicatorTotal, percentage, hasWritten, hasAnyGrade };
    });

    if (indicatorConfig.level === 'highest') {
        return studentsWithScore.sort((a, b) => b.indicatorTotal - a.indicatorTotal).slice(0, Math.max(1, Math.floor(studentsWithScore.length / 4)));
    }
    if (indicatorConfig.level === 'lowest') {
        return studentsWithScore.sort((a, b) => a.indicatorTotal - b.indicatorTotal).slice(0, Math.max(1, Math.floor(studentsWithScore.length / 4)));
    }
    if (indicatorConfig.level === 'average') {
        return studentsWithScore.sort((a, b) => b.indicatorTotal - a.indicatorTotal).slice(Math.floor(studentsWithScore.length / 4), Math.floor(studentsWithScore.length * 3 / 4));
    }
    if (indicatorConfig.level === 'absent_written') {
        return studentsWithScore.filter(s => !s.hasWritten).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    }
    if (indicatorConfig.level === 'no_grades') {
        return studentsWithScore.filter(s => !s.hasAnyGrade).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    }
    if (indicatorConfig.level === 'excellent') {
        return studentsWithScore.filter(s => s.percentage >= 90).sort((a, b) => b.indicatorTotal - a.indicatorTotal);
    }
    if (indicatorConfig.level === 'vgood') {
        return studentsWithScore.filter(s => s.percentage >= 80 && s.percentage < 90).sort((a, b) => b.indicatorTotal - a.indicatorTotal);
    }
    if (indicatorConfig.level === 'good') {
        return studentsWithScore.filter(s => s.percentage >= 65 && s.percentage < 80).sort((a, b) => b.indicatorTotal - a.indicatorTotal);
    }
    if (indicatorConfig.level === 'fair') {
        return studentsWithScore.filter(s => s.percentage >= 50 && s.percentage < 65).sort((a, b) => b.indicatorTotal - a.indicatorTotal);
    }
    if (indicatorConfig.level === 'fail') {
        return studentsWithScore.filter(s => s.percentage < 50 && s.hasAnyGrade).sort((a, b) => b.indicatorTotal - a.indicatorTotal);
    }
    
    return students;
  }, [students, cells, visibleMonths, indicatorConfig, maxScores]);

  // Autosave when cells change fundamentally handled by debounce or just explicit save because every keystroke is too much for firebase.
  // Actually, standard behavior: auto save periodically or on blur.
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'GradeSheets'), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as GradeSheet));
        setSheets(list.filter(s => s.userId === (currentUser?.id || 'unknown') || currentUser?.role === 'admin' || currentUser?.permissions?.all === true));
        
        // Update current sheet if we are viewing one
        if (currentSheetId) {
            const current = list.find(l => l.id === currentSheetId);
            if (current) {
                // To avoid disrupting typing, only update values from server if they differ significantly or if we decide to just update maxScores and disabledCols
                // Updating `cells` constantly might wipe local unsaved changes since typing is very fast.
                // We'll update maxScores and disabledCols immediately.
                setMaxScores(prev => JSON.stringify(prev) !== JSON.stringify(current.maxScores) ? (current.maxScores || prev) : prev);
                setDisabledCols(prev => JSON.stringify(prev) !== JSON.stringify(current.disabledCols) ? (current.disabledCols || []) : prev);
            }
        }
    });

    return () => unsub();
  }, [data.secretariatStudents, currentUser, currentSheetId]);

  const fetchSheets = async () => {};

  const updateStudentCalculations = (currentCells: Record<string, string>, studentId: string, currentMaxScores: Record<string, number>, currentVisibleMonths: number[] = visibleMonths) => {
    months.forEach((_, idx) => {
       const mIdx = String(idx);
       let monthTotal = 0;
       ['w_k', 'w_m', 'oral', 'attend', 'written'].forEach(mc => {
           monthTotal += parseFloat(currentCells[`${studentId}-m${mIdx}-${mc}`] || '0') || 0;
       });

       currentCells[`${studentId}-m${mIdx}-total_m`] = monthTotal.toString();
        
       const monthMaxSum = (currentMaxScores.w_k || 10) + (currentMaxScores.w_m || 10) + (currentMaxScores.oral || 10) + (currentMaxScores.attend || 10) + (currentMaxScores.written || 60);
       const ratio = monthMaxSum > 0 ? (monthTotal / monthMaxSum) * 100 : 0;
       currentCells[`${studentId}-m${mIdx}-ratio_m`] = Math.round(ratio).toString() + '%';
    });

    const monthMaxSum = (currentMaxScores.w_k || 10) + (currentMaxScores.w_m || 10) + (currentMaxScores.oral || 10) + (currentMaxScores.attend || 10) + (currentMaxScores.written || 60);
    const termTargetMax = currentMaxScores.term_result || 20;
    let sumOfMonths = 0;
    
    currentVisibleMonths.forEach((idx) => {
        sumOfMonths += parseFloat(currentCells[`${studentId}-m${idx}-total_m`] || '0') || 0;
    });
    
    const maxAllMonths = monthMaxSum * currentVisibleMonths.length;
    const termResult = maxAllMonths > 0 ? (sumOfMonths / maxAllMonths) * termTargetMax : 0;
    
    if (sumOfMonths > 0) {
        currentCells[`${studentId}-final-term_result`] = termResult.toFixed(1).replace(/\.0$/, '');
    } else if (currentCells[`${studentId}-final-term_result`]) {
        currentCells[`${studentId}-final-term_result`] = '';
    }
  };

  const triggerAutoSave = (newCells: Record<string, string>, disabled: string[], maxs: Record<string, number>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
        handleSave(newCells, disabled, maxs, true);
    }, 1500);
  };

  const [bulkFill, setBulkFill] = useState<Record<string, string>>({});

  const handleBulkFill = (colKey: string) => {
    if (!canEditData || disabledCols.includes(colKey)) return;
    const val = bulkFill[colKey];
    if (val === undefined || val === '') return;
    
    let finalVal = val;
    const field = colKey.split('-')[1];
    if (field && maxScores[field] !== undefined && finalVal.trim() !== '') {
        const numVal = parseFloat(finalVal);
        if (!isNaN(numVal) && numVal > maxScores[field]) {
            finalVal = maxScores[field].toString();
        }
    }

    const newCells = { ...cells };
    displayedStudents.forEach(s => {
        newCells[`${s.id}-${colKey}`] = finalVal;
        updateStudentCalculations(newCells, s.id, maxScores);
    });

    setCells(newCells);
    setBulkFill(prev => ({...prev, [colKey]: ''}));
    triggerAutoSave(newCells, disabledCols, maxScores);
  };

  const handleColToggle = (colKey: string) => {
    if (!canEditData) return;
    const newDisabled = disabledCols.includes(colKey) ? disabledCols.filter(c => c !== colKey) : [...disabledCols, colKey];
    setDisabledCols(newDisabled);
    // Optionally trigger an immediate save so the user's action syncs right away
    triggerAutoSave(cells, newDisabled, maxScores);
  };

  const handleCellChange = (studentId: string, colKey: string, val: string) => {
    if (disabledCols.includes(colKey)) return;
    
    // Enforce max limits
    let finalVal = val;
    if (colKey.startsWith('m') || colKey.startsWith('final')) {
        const field = colKey.split('-')[1];
        if (field && maxScores[field] !== undefined && finalVal.trim() !== '') {
            const numVal = parseFloat(finalVal);
            if (!isNaN(numVal) && numVal > maxScores[field]) {
                finalVal = maxScores[field].toString();
            }
        }
    }
    
    const newCells = { ...cells, [`${studentId}-${colKey}`]: finalVal };
    
    // Auto-calculate "مجموع", "نسبة" and "محصلة"
    if (colKey.startsWith('m') || colKey.startsWith('final')) {
        updateStudentCalculations(newCells, studentId, maxScores);
    }
    
    setCells(newCells);

    // Auto-save debounce
    triggerAutoSave(newCells, disabledCols, maxScores);
  };

  const calculateColumnTotal = (colKey: string) => {
    let tot = 0;
    displayedStudents.forEach(s => {
       tot += parseFloat(cells[`${s.id}-${colKey}`] || '0') || 0;
    });
    return tot;
  };

  const calculateColumnRatio = (colKey: string) => {
    let totalScore = calculateColumnTotal(colKey);
    let count = displayedStudents.length;
    if (count === 0) return 0;
    return (totalScore / count).toFixed(1);
  };

  const isCreatingRef = useRef(false);

  const handleSave = async (currentCells: Record<string, string> = cells, currentDisabledCols = disabledCols, currentMaxScores = maxScores, isAutoSave = false) => {
    if (!selectedGrade || !selectedSection) {
      if (!isAutoSave) toast.error('الرجاء اختيار الصف والشعبة أولاً');
      return;
    }
    
    if (isCreatingRef.current) {
        if (!isAutoSave) toast.error('جاري حفظ كشف جديد، الرجاء الانتظار...');
        return;
    }
    
    try {
      const payload: GradeSheet = {
          schoolName,
          branch,
          teacherName,
          subject,
          grade: selectedGrade,
          section: selectedSection,
          sheetName,
          date: dateStr,
          months,
          cells: currentCells,
          userId: currentUser?.id || 'unknown',
          timestamp: new Date().toISOString(),
          disabledCols: currentDisabledCols,
          maxScores: currentMaxScores
      };
      
      if (currentSheetId) {
          await updateDoc(doc(db, 'GradeSheets', currentSheetId), { ...payload });
      } else {
          isCreatingRef.current = true;
          const res = await addDoc(collection(db, 'GradeSheets'), payload);
          setCurrentSheetId(res.id);
          isCreatingRef.current = false;
      }
      if (!isAutoSave) toast.success('تم حفظ الكشف بنجاح');
    } catch(e) {
      console.error(e);
      isCreatingRef.current = false;
      if (!isAutoSave) toast.error('فشل حفظ الكشف');
    }
  };

  const handleNewSheet = () => {
      setCells({});
      setSheetName('');
      setCurrentSheetId(null);
      setDisabledCols([]);
      setMaxScores({ w_k: 10, w_m: 10, oral: 10, attend: 10, written: 60 });
  };

  const loadSheet = (sheet: GradeSheet) => {
      setSchoolName(sheet.schoolName || '');
      setBranch(sheet.branch || '');
      setTeacherName(sheet.teacherName || '');
      setSubject(sheet.subject || '');
      setSelectedGrade(sheet.grade || '');
      setTimeout(() => setSelectedSection(sheet.section || ''), 100);
      setSheetName(sheet.sheetName || '');
      setDateStr(sheet.date || '');
      setMonths(sheet.months || ['شهر الأول', 'شهر الثاني', 'شهر الثالث']);
      setCells(sheet.cells || {});
      setDisabledCols(sheet.disabledCols || []);
      setMaxScores(sheet.maxScores || { w_k: 10, w_m: 10, oral: 10, attend: 10, written: 60 });
      setCurrentSheetId(sheet.id || null);
      setShowHistoryModal(false);
  };

  const handleDeleteSheet = async (id: string, e: any) => {
      e.stopPropagation();
      if(confirm('هل أنت متأكد من حذف هذا الكشف؟')) {
          await deleteDoc(doc(db, 'GradeSheets', id));
          fetchSheets();
          if (currentSheetId === id) handleNewSheet();
      }
  };

  const exportTableToExcel = () => {
    const tableElement = document.getElementById('grade-sheet-table');
    if (!tableElement) return;
    const htmlSnippet = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; direction: rtl; font-family: Arial; }
        th, td { border: 1px solid #000; padding: 4px; text-align: center; }
        .bg-month-0 { background-color: #BFD4E4; }
        .bg-month-1 { background-color: #E6B8B7; }
        .bg-month-2 { background-color: #CCC0DA; }
        .bg-yellow { background-color: #FFFF00; }
        .bg-orange { background-color: #FCD5B4; }
      </style>
      </head>
      <body>
        <table>${tableElement.innerHTML}</table>
      </body>
      </html>
    `;
    const blob = new Blob([htmlSnippet], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `كشف_درجات_${sheetName || 'جديد'}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculateFinalTotals = () => {
       // helper for bottom summaries
       // rendered in JSX
  };

  // Combine dialog state
  const [selectedCombineSheets, setSelectedCombineSheets] = useState<string[]>([]);
  
  const handleCombine = () => {
     if (selectedCombineSheets.length < 2) {
         toast.error('الرجاء اختيار كشفين على الأقل للجمع');
         return;
     }
     
     let combinedCells: Record<string, string> = {};
     let mergeMonths: string[] = [];
     
     const sheetsToCombine = sheets.filter(s => selectedCombineSheets.includes(s.id || ''));
     
     // basic logic: copy cells over. For overlapping keys, sum them up or overwrite? 
     // The prompt says "جمع الجداول", so let's sum numerical fields if overlap, or just merge them.
     sheetsToCombine.forEach(s => {
         Object.keys(s.cells).forEach(k => {
             const existVal = parseFloat(combinedCells[k]) || 0;
             const newVal = parseFloat(s.cells[k]) || 0;
             if (!isNaN(parseFloat(s.cells[k]))) {
                 combinedCells[k] = (existVal + newVal).toString();
             } else {
                 if (s.cells[k]) combinedCells[k] = s.cells[k]; 
             }
         });
     });
     
     setCells(combinedCells);
     setSheetName('كشف إجمالي');
     setCurrentSheetId(null);
     setShowCombineModal(false);
  };

  const globalColIndexRef = useRef(0);

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 font-arabic animate-fade-in relative z-10 pb-20">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold"
      >
        <ChevronLeft size={20} />
        العودة للوحة المعلم
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">كشف درجات الطلاب</h1>
          <p className="text-slate-500 font-bold mt-2">إعداد وإدارة كشوف المتابعة والدرجات</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base">
          <button onClick={() => setShowHistoryModal(true)} className="px-3 py-2 md:px-4 md:py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap">
            <History size={18} /> الكشوفات السابقة
          </button>
          <button onClick={() => handleSave()} className="px-3 py-2 md:px-4 md:py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap">
            <Save size={18} /> حفظ الكشف
          </button>
          <button onClick={handleNewSheet} className="px-3 py-2 md:px-4 md:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap">
            <Plus size={18} /> جدول جديد
          </button>
          <button onClick={() => setShowCombineModal(true)} className="px-3 py-2 md:px-4 md:py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap">
            <Combine size={18} /> جمع الجداول
          </button>
          <button onClick={exportTableToExcel} className="px-3 py-2 md:px-4 md:py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap">
             <Download size={18} /> تصدير اكسل
          </button>
        </div>
      </div>

      {/* Attributes Form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">اسم المدرسة</label>
              <select value={schoolName} onChange={e=>setSchoolName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                  <option value="">اختيار المدرسة...</option>
                  {availableSchools.map(s => (
                      <option key={s} value={s}>{s}</option>
                  ))}
              </select>
          </div>
          <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">الفرع</label>
              <select value={branch} onChange={e=>setBranch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                  <option value="">اختيار الفرع...</option>
                  {availableBranches.map(b => (
                      <option key={b} value={b}>{b}</option>
                  ))}
              </select>
          </div>
          <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">اسم المعلم</label>
              <select value={teacherName} onChange={e=>setTeacherName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                  <option value="">اختيار المعلم...</option>
                  {availableTeachers.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
              </select>
          </div>
          <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">المادة</label>
              <select value={subject} onChange={e=>setSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                  <option value="">اختيار المادة...</option>
                  {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                  ))}
              </select>
          </div>
          <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">الصف</label>
              <select value={selectedGrade} onChange={e=>setSelectedGrade(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                  <option value="">اختيار الصف...</option>
                  {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                  ))}
              </select>
          </div>
          <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">الشعبة</label>
              <select value={selectedSection} onChange={e=>setSelectedSection(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500">
                  <option value="">اختيار الشعبة...</option>
                  {SECTIONS.map(g => (
                      <option key={g} value={g}>{g}</option>
                  ))}
              </select>
          </div>
          <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">اسم الكشف</label>
              <input type="text" value={sheetName} onChange={e=>setSheetName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">التاريخ</label>
              <input type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500" />
          </div>
      </div>

      {/* Performance Indicators and Visible Months */}
      <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex flex-wrap gap-4 items-center">
         <button 
             onClick={() => setShowIndicatorModal(true)}
             className={`flex items-center gap-2 border px-4 py-2 rounded-xl font-bold text-sm transition-colors ${indicatorConfig.level ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-100'}`}
         >
             <TrendingUp size={18} /> مؤشرات الأداء
         </button>

         <button 
             onClick={() => setShowVisibleMonthsModal(true)}
             className="flex items-center gap-2 bg-white text-slate-800 border-slate-200 border hover:bg-slate-50 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
         >
             <FileSpreadsheet size={18} /> الأشهر الظاهرة
         </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto relative min-h-[400px]">
          {selectedGrade && selectedSection ? (
             <table id="grade-sheet-table" className="w-full text-center text-sm border-collapse min-w-[1200px]">
                 <thead>
                     {/* Top Headers */}
                     <tr>
                         <th rowSpan={2} className="border border-slate-200 bg-amber-500 text-white w-12 font-black">م</th>
                         <th rowSpan={2} className="border border-slate-200 bg-amber-50 w-48 text-slate-800 font-black p-2 min-w-[150px]">اسم الطالب</th>
                         
                         {months.map((m, mIdx) => visibleMonths.includes(mIdx) && (
                             <th key={mIdx} colSpan={7} className={`border border-slate-300 font-black text-slate-800 p-2 text-lg ${mIdx===0 ? 'bg-blue-200 bg-month-0' : mIdx===1 ? 'bg-rose-200 bg-month-1' : 'bg-purple-200 bg-month-2'}`}>
                                 <input 
                                    className="bg-transparent text-center font-black w-full outline-none placeholder-slate-500" 
                                    value={m} 
                                    onChange={e => { const nm = [...months]; nm[mIdx] = e.target.value; setMonths(nm); }}
                                 />
                             </th>
                         ))}
                         
                         <th rowSpan={2} className="border border-slate-300 bg-orange-100 p-2 w-24 align-top">
                             <div className="flex flex-col items-center justify-center gap-2 h-full">
                                 <span>المحصلة الفصلية</span>
                                 <input 
                                     type="number" 
                                     value={maxScores.term_result || 20}
                                     onChange={(e) => canEditData && setMaxScores({...maxScores, term_result: parseFloat(e.target.value)})}
                                     disabled={!canEditData}
                                     className="w-12 h-6 text-center border border-slate-300 bg-white rounded outline-none text-xs text-orange-800"
                                     title="الدرجة القصوى للمحصلة"
                                 />
                             </div>
                         </th>
                         <th rowSpan={2} className="border border-slate-300 bg-orange-200 p-2 w-24">اختبار فصلي</th>
                     </tr>
                     {/* Sub Headers */}
                     <tr>
                         {months.map((m, mIdx) => visibleMonths.includes(mIdx) && (
                             <React.Fragment key={'sub-'+mIdx}>
                                 {monthCols.map((mc, mcIdx) => {
                                     const colKeyStr = `m${mIdx}-${mc.id}`;
                                     const isDisabled = disabledCols.includes(colKeyStr);
                                     
                                     return (
                                         <th key={`head-${mIdx}-${mc.id}`} className={`border border-slate-300 p-2 font-bold text-xs ${mc.isTotal ? 'bg-yellow-300 text-black shadow-inner shadow-yellow-500/50' : mIdx===0 ? 'bg-blue-100 bg-month-0' : mIdx===1 ? 'bg-rose-100 bg-month-1' : 'bg-purple-100 bg-month-2'}`}>
                                            <div className="flex flex-col items-center justify-between w-full min-h-[6rem] py-1">
                                                <div className="flex flex-col items-center gap-1 w-full flex-grow">
                                                    <span className="whitespace-normal leading-tight text-center break-words max-w-[70px] flex-grow flex items-center">{mc.label}</span>
                                                    {!mc.isTotal && (
                                                        <div className="flex flex-col items-center gap-1 mt-1 justify-center w-full">
                                                            <div className="flex items-center justify-center gap-1 w-full bg-white/50 p-1 rounded">
                                                                <button 
                                                                    disabled={!canEditData}
                                                                    onClick={(e) => { e.stopPropagation(); handleColToggle(colKeyStr); }} 
                                                                    className={`p-1 rounded transition-colors shrink-0 ${isDisabled ? 'text-red-500 bg-red-100 hover:bg-red-200' : 'text-green-500 bg-green-100 hover:bg-green-200'} ${!canEditData && 'opacity-50 cursor-not-allowed'}`}
                                                                    title={isDisabled ? 'غير معتمد' : 'معتمد'}
                                                                >
                                                                    <Star size={14} fill={isDisabled ? 'currentColor' : 'none'} className={isDisabled ? 'text-[currentColor]' : ''} />
                                                                </button>
                                                                
                                                                <input
                                                                    type="text"
                                                                    value={bulkFill[colKeyStr] !== undefined ? bulkFill[colKeyStr] : ''}
                                                                    onChange={(e) => setBulkFill({...bulkFill, [colKeyStr]: e.target.value})}
                                                                    disabled={!canEditData || isDisabled}
                                                                    placeholder="الكل"
                                                                    className={`w-8 h-6 text-center text-[10px] border border-slate-300 rounded outline-blue-500 ${isDisabled || !canEditData ? 'opacity-50 bg-slate-100' : 'bg-white'}`}
                                                                    title="أدخل الدرجة لجميع الطلاب"
                                                                />
                                                                <button
                                                                    disabled={!canEditData || isDisabled}
                                                                    onClick={(e) => { e.stopPropagation(); handleBulkFill(colKeyStr); }}
                                                                    className={`p-1 rounded text-white bg-blue-500 transition-colors ${isDisabled || !canEditData ? 'opacity-50 !bg-slate-300 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                                                                    title="تطبيق على جميع الطلاب"
                                                                >
                                                                    <Check size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {!mc.isTotal && (
                                                    <div className="text-[10px] sm:text-xs shrink-0 mt-2 flex flex-col items-center">
                                                        <span className="text-[9px] text-slate-500 mb-0.5">الحد الأقصى</span>
                                                        <input 
                                                            type="number" 
                                                            value={maxScores[mc.id] !== undefined ? maxScores[mc.id] : ''}
                                                            onChange={(e) => {
                                                                if(canEditData && e.target.value) {
                                                                    setMaxScores({...maxScores, [mc.id]: parseFloat(e.target.value)});
                                                                }
                                                            }}
                                                            disabled={!canEditData}
                                                            className="w-[3rem] h-6 text-center border border-slate-400 bg-white rounded outline-none appearance-none"
                                                            title={`الحد الأقصى لـ ${mc.label}`}
                                                        />
                                                    </div>
                                                )}
                                                {isDisabled && <span className="text-[10px] text-red-600 font-bold bg-white/50 px-1 rounded leading-none mt-1 shrink-0">غير معتمد</span>}
                                            </div>
                                         </th>
                                     );
                                 })}
                             </React.Fragment>
                         ))}
                     </tr>
                 </thead>
                 <tbody>
                     {displayedStudents.map((s, sIdx) => {
                         const isRowSelected = highlightedRows.includes(s.id);
                         const toggleRow = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (isRowSelected) {
                                setHighlightedRows(highlightedRows.filter(id => id !== s.id));
                            } else {
                                setHighlightedRows([...highlightedRows, s.id]);
                            }
                         };
                         
                         return (
                             <tr key={s.id} className={`hover:bg-slate-50 transition-all ${isRowSelected ? 'ring-2 ring-black shadow-lg relative z-20 bg-white' : ''}`}>
                                 <td className="border border-slate-200 p-1 font-bold bg-amber-50">{sIdx + 1}</td>
                                 <td className="border border-slate-200 p-2 font-bold text-right truncate max-w-[150px] bg-slate-50 cursor-pointer hover:bg-amber-100 transition-colors" title={s.name} onClick={toggleRow}>
                                     {s.name}
                                 </td>
                                 
                                 {/* Map month columns */}
                                 {months.map((m, mIdx) => visibleMonths.includes(mIdx) && (
                                     <React.Fragment key={'r-'+s.id+'-'+mIdx}>
                                         {monthCols.map((mc, mcIdx) => {
                                             const colKeyStr = `m${mIdx}-${mc.id}`;
                                             const cellKey = `${s.id}-${colKeyStr}`;
                                             const val = cells[cellKey] || '';
                                             const isEmpty = val.trim() === '';
                                             const numVal = parseFloat(val);
                                             const cIndex = (mIdx * monthCols.length) + mcIdx;
                                             const isColSelected = selectedColIndex === cIndex && !isRowSelected;
                                             const isDisabled = disabledCols.includes(colKeyStr);
                                             
                                             const maxVal = maxScores[mc.id];
                                             const isFailingField = !mc.isTotal && !isNaN(numVal) && mc.id !== 'ratio_m' && maxVal && (numVal < (maxVal / 2));
                                             
                                             return (
                                                 <td key={cellKey} 
                                                     onMouseEnter={() => setSelectedColIndex(cIndex)}
                                                     className={`border border-slate-300 p-0 transition-colors relative
                                                     ${isColSelected ? 'bg-cyan-100' : ''}
                                                     ${mc.isTotal ? 'bg-yellow-100 font-bold' : ''} 
                                                     ${isDisabled ? 'bg-red-50 cursor-not-allowed opacity-80' : ''}
                                                     ${isFailingField ? '!bg-red-400/30' : ''}
                                                     ${!mc.isTotal && isEmpty && !isDisabled && !isRowSelected ? 'bg-yellow-50/50' : ''}`}
                                                 >
                                                     <input 
                                                        type="text" 
                                                        onFocus={(e) => e.target.select()}
                                                        className={`w-full h-full p-2 text-center bg-transparent outline-blue-500 font-bold max-w-[50px] md:max-w-[80px] ${isDisabled ? 'cursor-not-allowed' : ''} ${isRowSelected ? 'text-black' : ''}`} 
                                                        value={val}
                                                        readOnly={mc.isTotal || isDisabled}
                                                        onChange={e => handleCellChange(s.id, colKeyStr, e.target.value)}
                                                     />
                                                 </td>
                                             )
                                         })}
                                     </React.Fragment>
                                 ))}

                                 {/* Final Cols */}
                                 {finalCols.map((fc, fcIdx) => {
                                      const colKeyStr = `final-${fc.id}`;
                                      const cellKey = `${s.id}-${colKeyStr}`;
                                      const val = cells[cellKey] || '';
                                      const valNum = parseFloat(val) || 0;
                                      const isTermResult = fc.id === 'term_result';
                                      
                                      const maxVal = isTermResult ? (maxScores.term_result || 20) : (maxScores.term_exam || 0);
                                      const isFailing = !isNaN(valNum) && maxVal > 0 && (valNum < (maxVal / 2));
                                      
                                      const cIndex = (months.length * monthCols.length) + fcIdx;
                                      const isColSelected = selectedColIndex === cIndex && !isRowSelected;

                                      return (
                                          <td key={cellKey} 
                                              onMouseEnter={() => setSelectedColIndex(cIndex)}
                                              className={`border border-slate-300 p-0 ${isColSelected ? 'bg-cyan-100' : 'bg-orange-50/50'} ${isFailing ? '!bg-red-400/30' : ''}`}
                                          >
                                              <input 
                                                type="text" 
                                                onFocus={(e) => !isTermResult && e.target.select()}
                                                readOnly={isTermResult}
                                                className={`w-full h-full p-2 text-center bg-transparent outline-blue-500 font-bold max-w-[50px] md:max-w-[80px] ${isRowSelected ? 'text-black' : ''}`} 
                                                value={val}
                                                onChange={e => handleCellChange(s.id, colKeyStr, e.target.value)}
                                              />
                                          </td>
                                      )
                                 })}
                             </tr>
                         )
                     })}
                     
                     {/* Totals Row */}
                     {displayedStudents.length > 0 && (
                         <tr className="bg-slate-100 font-black">
                             <td colSpan={2} className="border border-slate-300 p-2 text-left bg-slate-200">الإجمالي / النسبة</td>
                             {months.map((m, mIdx) => visibleMonths.includes(mIdx) && (
                                 <React.Fragment key={'tot-'+mIdx}>
                                     {monthCols.map((mc, mcIdx) => {
                                         const colKeyStr = `m${mIdx}-${mc.id}`;
                                         const total = calculateColumnTotal(colKeyStr);
                                         const ratio = calculateColumnRatio(colKeyStr);
                                         return (
                                             <td key={colKeyStr} className="border border-slate-300 p-1 text-xs text-center relative pointer-events-none text-slate-700">
                                                 <div className="text-blue-700 border-b border-slate-300/50 mb-1 pb-1">{Number(total) > 0 ? total : ''}</div>
                                                 <div className="text-emerald-700">{Number(ratio) > 0 ? `%${ratio}` : ''}</div>
                                             </td>
                                         )
                                     })}
                                 </React.Fragment>
                             ))}
                             {finalCols.map((fc, fcIdx) => {
                                  const colKeyStr = `final-${fc.id}`;
                                  const total = calculateColumnTotal(colKeyStr);
                                  const ratio = calculateColumnRatio(colKeyStr);
                                  return (
                                      <td key={colKeyStr} className="border border-slate-300 p-1 text-xs text-center relative pointer-events-none text-slate-700 bg-orange-100/50">
                                          <div className="text-orange-700 border-b border-orange-200 mb-1 pb-1">{Number(total) > 0 ? total : ''}</div>
                                          <div>{Number(ratio) > 0 ? `%${ratio}` : ''}</div>
                                      </td>
                                  )
                             })}
                         </tr>
                     )}
                 </tbody>
             </table>
          ) : (
              <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                  <AlertCircle size={48} className="mb-4 opacity-50" />
                  <p className="font-bold text-lg mb-2">يرجى اختيار الصف والشعبة لعرض أسماء الطلاب</p>
                  <p>سيتم جلب الأسماء مسجلة في شؤون الطلاب تلقائياً</p>
              </div>
          )}
      </div>

      {/* Signatures Section */}
      {selectedGrade && selectedSection && (
          <div className="mt-8 px-8 flex justify-between items-center font-bold text-slate-800 pb-10 max-w-[1200px] mx-auto">
              <div className="text-center w-48">
                  <p className="text-lg">معلم المادة</p>
                  <p className="mt-4 text-blue-800 text-xl border-b-2 border-dashed border-slate-300 pb-1 inline-block min-w-[200px]">{currentUser?.name || '........................'}</p>
              </div>
              <div className="text-center w-48">
                  <p className="text-lg">مدير المدرسة</p>
                  <p className="mt-4 border-b-2 border-dashed border-slate-300 pb-1 inline-block min-w-[200px] h-8 text-xl text-slate-400">........................</p>
              </div>
          </div>
      )}

      {/* Visible Months Modal */}
      {showVisibleMonthsModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col shadow-2xl relative">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                     <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                         <FileSpreadsheet className="text-blue-500" />
                         الأشهر الظاهرة
                     </h3>
                     <button onClick={() => setShowVisibleMonthsModal(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                         <X size={20} />
                     </button>
                  </div>
                  <div className="p-6 flex flex-col gap-4">
                      {months.map((m, mIdx) => (
                          <label key={mIdx} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-xl">
                              <input 
                                  type="checkbox" 
                                  checked={visibleMonths.includes(mIdx)}
                                  onChange={() => {
                                      let newVm = visibleMonths.includes(mIdx) ? visibleMonths.filter(v => v !== mIdx) : [...visibleMonths, mIdx];
                                      if (newVm.length === 0) newVm = [mIdx]; // Don't allow empty
                                      setVisibleMonths(newVm.sort());
                                      
                                      // trigger recalculation based on visible months
                                      const newCells = { ...cells };
                                      displayedStudents.forEach(s => {
                                          updateStudentCalculations(newCells, s.id, maxScores, newVm);
                                      });
                                      setCells(newCells);
                                      triggerAutoSave(newCells, disabledCols, maxScores);
                                  }}
                                  className="w-5 h-5 text-blue-600 rounded"
                              />
                              <span className="font-bold text-slate-700">{m}</span>
                          </label>
                      ))}
                      <button onClick={() => setShowVisibleMonthsModal(false)} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
                          تطبيق وإغلاق
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Indicators Modal */}
      {showIndicatorModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl w-full max-w-lg flex flex-col shadow-2xl relative my-auto">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                     <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                         <TrendingUp className="text-blue-500" />
                         مؤشرات الأداء
                     </h3>
                     <button onClick={() => setShowIndicatorModal(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                         <X size={20} />
                     </button>
                  </div>
                  <div className="p-6 flex flex-col gap-6">
                      
                      {/* Months Select */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">اختر الشهر (أو عدة أشهر)</label>
                          <div className="flex flex-wrap gap-2">
                             {months.map((m, mIdx) => (
                                 <button 
                                     key={mIdx}
                                     onClick={() => {
                                         setIndicatorConfig(prev => ({
                                             ...prev,
                                             months: prev.months.includes(mIdx) ? prev.months.filter(v => v !== mIdx) : [...prev.months, mIdx]
                                         }))
                                     }}
                                     className={`px-4 py-2 rounded-xl font-bold text-sm border transition-colors ${indicatorConfig.months.includes(mIdx) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                                 >
                                     {m}
                                 </button>
                             ))}
                          </div>
                      </div>

                      {/* Fields Select */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">اختر البنود</label>
                          <div className="flex flex-wrap gap-2">
                             {monthCols.filter(mc => !mc.isTotal && mc.id !== 'ratio_m').map(mc => (
                                 <button 
                                     key={mc.id}
                                     onClick={() => {
                                         setIndicatorConfig(prev => ({
                                             ...prev,
                                             fields: prev.fields.includes(mc.id) ? prev.fields.filter(v => v !== mc.id) : [...prev.fields, mc.id]
                                         }))
                                     }}
                                     className={`px-3 py-1.5 rounded-lg font-bold text-sm border transition-colors ${indicatorConfig.fields.includes(mc.id) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                                 >
                                     {mc.label}
                                 </button>
                             ))}
                          </div>
                      </div>

                      {/* Level Select */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">خيارات الفرز</label>
                          <select 
                            value={indicatorConfig.level} 
                            onChange={(e) => setIndicatorConfig(prev => ({...prev, level: e.target.value}))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                             <option value="">عرض الكل</option>
                             <option value="absent_written">الغائبين عن الاختبار</option>
                             <option value="no_grades">لم تضف له درجة</option>
                             <option value="highest">الأكثر درجة</option>
                             <option value="lowest">الأقل درجة</option>
                             <option value="average">المتوسط</option>
                             <option value="excellent">ممتاز (90%+)</option>
                             <option value="vgood">جيد جداً (80%+)</option>
                             <option value="good">جيد (65%+)</option>
                             <option value="fair">ضعيف (50%+)</option>
                             <option value="fail">راسب (&lt;50%)</option>
                          </select>
                      </div>

                      <button onClick={() => setShowIndicatorModal(false)} className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
                          تطبيق
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                     <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                        <History className="text-blue-500" /> الكشوفات السابقة
                     </h3>
                     <button onClick={()=>setShowHistoryModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1 space-y-2">
                      {sheets.length === 0 ? (
                          <div className="text-center p-8 text-slate-400 font-bold">لا يوجد كشوفات سابقة محفوظة</div>
                      ) : (
                          sheets.map(sh => (
                              <div key={sh.id} className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50 group cursor-pointer" onClick={() => loadSheet(sh)}>
                                  <div>
                                      <p className="font-black text-slate-800 mb-1">{sh.sheetName || 'بدون اسم'}</p>
                                      <p className="text-xs font-bold text-slate-500">{sh.date} - {sh.grade} ({sh.section})</p>
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => handleDeleteSheet(sh.id!, e)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={16}/></button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Combine Modal */}
      {showCombineModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                     <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                        <Combine className="text-blue-500" /> جمع الكشوفات
                     </h3>
                     <button onClick={()=>setShowCombineModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1 space-y-3">
                      <p className="text-sm font-bold text-slate-500 mb-4">اختر الكشوفات التي ترغب في جمع درجاتها (سيتم دمج القيم للكشوفات المختارة)</p>
                      {sheets.length === 0 ? (
                          <div className="text-center p-8 text-slate-400 font-bold">لا يوجد كشوفات محفوظة</div>
                      ) : (
                          sheets.map(sh => (
                              <label key={sh.id} className="flex items-center gap-3 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer">
                                  <input 
                                     type="checkbox" 
                                     className="w-5 h-5 accent-blue-600 rounded" 
                                     checked={selectedCombineSheets.includes(sh.id!)}
                                     onChange={e => {
                                         if(e.target.checked) setSelectedCombineSheets([...selectedCombineSheets, sh.id!]);
                                         else setSelectedCombineSheets(selectedCombineSheets.filter(id => id !== sh.id!));
                                     }}
                                  />
                                  <div>
                                      <p className="font-black text-slate-800">{sh.sheetName || 'بدون اسم'}</p>
                                      <p className="text-xs font-bold text-slate-500">{sh.date} - {sh.grade} ({sh.section})</p>
                                  </div>
                              </label>
                          ))
                      )}
                  </div>
                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                      <button onClick={()=>setShowCombineModal(false)} className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors">إلغاء</button>
                      <button onClick={handleCombine} className="px-6 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-colors">تأكيد لجمع الجداول</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
