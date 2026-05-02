import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGlobal } from '../context/GlobalState';
import { Save, FileSpreadsheet, Plus, Combine, History, TrendingUp, ChevronLeft, Search, CheckCircle2, ChevronDown, Download, AlertCircle, X, Trash2, Star } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
  const [maxScores, setMaxScores] = useState<Record<string, number>>({ w_k: 10, w_m: 10, oral: 10, attend: 10, written: 60 });
  const [disabledCols, setDisabledCols] = useState<string[]>([]);
  
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  
  const canEditData = currentUser?.role === 'admin' || currentUser?.permissions?.all === true || 
    currentUser?.permissions?.gradeSheets === undefined || 
    (Array.isArray(currentUser?.permissions?.gradeSheets) && currentUser.permissions.gradeSheets.includes('edit_data'));
  
  // Indicators
  const [indicatorMode, setIndicatorMode] = useState<string | null>(null);


  // Columns definition per month
  const monthCols = [
    { id: 'w_k', label: 'واجب (ك)' },
    { id: 'w_m', label: 'واجب (م)' },
    { id: 'oral', label: 'شفوي' },
    { id: 'attend', label: 'مواظبة' },
    { id: 'written', label: 'تحريري' },
    { id: 'total_m', label: 'مجموع', isTotal: true }
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
    if (!indicatorMode) return students;
    
    // Calculate total score for each student to sort
    const studentsWithScore = students.map(s => {
      let total = 0;
      let hasWritten = false;
      months.forEach((m, mIdx) => {
        const tVal = parseFloat(cells[`${s.id}-m${mIdx}-total_m`] || '0') || 0;
        total += tVal;
        const wValStr = cells[`${s.id}-m${mIdx}-written`];
        if (wValStr && String(wValStr).trim() !== '') hasWritten = true;
      });
      const finalVal1 = parseFloat(cells[`${s.id}-final-term_result`] || '0') || 0;
      const finalVal2 = parseFloat(cells[`${s.id}-final-term_exam`] || '0') || 0;
      total += finalVal1 + finalVal2;

      return { ...s, totalScore: total, hasWritten };
    });

    if (indicatorMode === 'highest') {
        return studentsWithScore.sort((a, b) => b.totalScore - a.totalScore);
    }
    if (indicatorMode === 'lowest') {
        return studentsWithScore.sort((a, b) => a.totalScore - b.totalScore);
    }
    if (indicatorMode === 'average') {
        return studentsWithScore.sort((a, b) => b.totalScore - a.totalScore).slice(Math.floor(studentsWithScore.length / 4), Math.floor(studentsWithScore.length * 3 / 4));
    }
    if (indicatorMode === 'absent_written') {
        return studentsWithScore.filter(s => !s.hasWritten).sort((a, b) => b.totalScore - a.totalScore);
    }
    return students;
  }, [students, cells, months, indicatorMode]);

  // Autosave when cells change fundamentally handled by debounce or just explicit save because every keystroke is too much for firebase.
  // Actually, standard behavior: auto save periodically or on blur.
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSheets();
  }, [data.secretariatStudents]);

  const fetchSheets = async () => {
    try {
      const snap = await getDocs(collection(db, 'GradeSheets'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as GradeSheet));
      setSheets(list.filter(s => s.userId === (currentUser?.id || 'unknown') || currentUser?.role === 'admin' || false));
    } catch(e) {}
  };

  const handleColToggle = (colKey: string) => {
    if (!canEditData) return;
    setDisabledCols(prev => prev.includes(colKey) ? prev.filter(c => c !== colKey) : [...prev, colKey]);
    // Optionally trigger an immediate save so the user's action syncs right away
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
        handleSave(cells, disabledCols.includes(colKey) ? disabledCols.filter(c => c !== colKey) : [...disabledCols, colKey], maxScores);
    }, 1000);
  };

  const handleCellChange = (studentId: string, colKey: string, val: string) => {
    if (disabledCols.includes(colKey)) return;
    
    // Enforce max limits
    let finalVal = val;
    if (colKey.startsWith('m')) {
        const field = colKey.split('-')[1];
        if (field && maxScores[field] !== undefined && finalVal.trim() !== '') {
            const numVal = parseFloat(finalVal);
            if (!isNaN(numVal) && numVal > maxScores[field]) {
                finalVal = maxScores[field].toString();
            }
        }
    }
    
    const newCells = { ...cells, [`${studentId}-${colKey}`]: finalVal };
    
    // Auto-calculate "مجموع" if in a month block
    if (colKey.startsWith('m')) {
        const parts = colKey.split('-');
        if (parts.length === 2) {
            const mIdx = parts[0].substring(1);
            const field = parts[1];
            if (field !== 'total_m') {
                // sum the 5 fields
                const w_k = parseFloat(newCells[`${studentId}-m${mIdx}-w_k`] || '0') || 0;
                const w_m = parseFloat(newCells[`${studentId}-m${mIdx}-w_m`] || '0') || 0;
                const oral = parseFloat(newCells[`${studentId}-m${mIdx}-oral`] || '0') || 0;
                const attend = parseFloat(newCells[`${studentId}-m${mIdx}-attend`] || '0') || 0;
                const written = parseFloat(newCells[`${studentId}-m${mIdx}-written`] || '0') || 0;
                newCells[`${studentId}-m${mIdx}-total_m`] = (w_k + w_m + oral + attend + written).toString();
            }
        }
    }
    
    setCells(newCells);

    // Auto-save debounce
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
        handleSave(newCells);
    }, 2000);
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

  const handleSave = async (currentCells: Record<string, string> = cells, currentDisabledCols = disabledCols, currentMaxScores = maxScores) => {
    if (!selectedGrade || !selectedSection) {
      toast.error('الرجاء اختيار الصف والشعبة أولاً');
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
          const res = await addDoc(collection(db, 'GradeSheets'), payload);
          setCurrentSheetId(res.id);
      }
      fetchSheets();
    } catch(e) {
      console.error(e);
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

      {/* Performance Indicators */}
      <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex flex-wrap gap-2 items-center">
         <div className="font-bold text-blue-900 flex items-center gap-2 border-l border-blue-200 pl-4 ml-2">
             <TrendingUp size={18} /> مؤشرات الأداء:
         </div>
         <button onClick={()=>setIndicatorMode(indicatorMode === 'highest' ? null : 'highest')} className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${indicatorMode === 'highest' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-blue-100 hover:bg-blue-100'}`}>الأكثر درجة</button>
         <button onClick={()=>setIndicatorMode(indicatorMode === 'lowest' ? null : 'lowest')} className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${indicatorMode === 'lowest' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-blue-100 hover:bg-blue-100'}`}>الأقل درجة</button>
         <button onClick={()=>setIndicatorMode(indicatorMode === 'average' ? null : 'average')} className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${indicatorMode === 'average' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-blue-100 hover:bg-blue-100'}`}>المتوسط</button>
         <button onClick={()=>setIndicatorMode(indicatorMode === 'absent_written' ? null : 'absent_written')} className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${indicatorMode === 'absent_written' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-blue-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}>الغائبين عن التحريري</button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto relative min-h-[400px]">
          {selectedGrade && selectedSection ? (
             <table id="grade-sheet-table" className="w-full text-center text-sm border-collapse min-w-[1200px]">
                 <thead>
                     {/* Top Headers */}
                     <tr>
                         <th rowSpan={2} className="border border-slate-200 bg-amber-500 text-white w-12 font-black">م</th>
                         <th rowSpan={2} className="border border-slate-200 bg-amber-50 w-48 text-slate-800 font-black p-2 min-w-[150px]">اسم الطالب</th>
                         
                         {months.map((m, mIdx) => (
                             <th key={mIdx} colSpan={6} className={`border border-slate-300 font-black text-slate-800 p-2 text-lg ${mIdx===0 ? 'bg-blue-200 bg-month-0' : mIdx===1 ? 'bg-rose-200 bg-month-1' : 'bg-purple-200 bg-month-2'}`}>
                                 <input 
                                    className="bg-transparent text-center font-black w-full outline-none placeholder-slate-500" 
                                    value={m} 
                                    onChange={e => { const nm = [...months]; nm[mIdx] = e.target.value; setMonths(nm); }}
                                 />
                             </th>
                         ))}
                         
                         <th rowSpan={2} className="border border-slate-300 bg-orange-100 p-2 w-24">المحصلة الفصلية</th>
                         <th rowSpan={2} className="border border-slate-300 bg-orange-200 p-2 w-24">اختبار فصلي</th>
                     </tr>
                     {/* Sub Headers */}
                     <tr>
                         {months.map((m, mIdx) => (
                             <React.Fragment key={'sub-'+mIdx}>
                                 {monthCols.map((mc, mcIdx) => {
                                     const colKeyStr = `m${mIdx}-${mc.id}`;
                                     const isDisabled = disabledCols.includes(colKeyStr);
                                     
                                     return (
                                         <th key={`head-${mIdx}-${mc.id}`} className={`border border-slate-300 p-2 font-bold text-xs ${mc.isTotal ? 'bg-yellow-300 text-black shadow-inner shadow-yellow-500/50' : mIdx===0 ? 'bg-blue-100 bg-month-0' : mIdx===1 ? 'bg-rose-100 bg-month-1' : 'bg-purple-100 bg-month-2'}`}>
                                            <div className="flex flex-col items-center justify-center gap-1 w-full min-h-[5rem]">
                                                <div className="flex flex-col md:flex-row items-center justify-between w-full">
                                                    <span className="-rotate-90 md:rotate-0 whitespace-nowrap mb-1 md:mb-0">{mc.label}</span>
                                                    {!mc.isTotal && (
                                                        <button 
                                                            disabled={!canEditData}
                                                            onClick={(e) => { e.stopPropagation(); handleColToggle(colKeyStr); }} 
                                                            className={`p-1 rounded transition-colors ${isDisabled ? 'text-red-500 bg-red-100 hover:bg-red-200' : 'text-green-500 bg-green-100 hover:bg-green-200'} ${!canEditData && 'opacity-50 cursor-not-allowed'}`}
                                                            title={isDisabled ? 'غير معتمد' : 'معتمد'}
                                                        >
                                                            <Star size={14} fill={isDisabled ? 'currentColor' : 'none'} className={isDisabled ? 'text-[currentColor]' : ''} />
                                                        </button>
                                                    )}
                                                </div>
                                                {!mc.isTotal && (
                                                    <div className="text-[10px] sm:text-xs">
                                                        <input 
                                                            type="number" 
                                                            value={maxScores[mc.id] !== undefined ? maxScores[mc.id] : ''}
                                                            onChange={(e) => {
                                                                if(canEditData && e.target.value) {
                                                                    setMaxScores({...maxScores, [mc.id]: parseFloat(e.target.value)});
                                                                }
                                                            }}
                                                            disabled={!canEditData}
                                                            className="w-[3rem] h-6 text-center border border-slate-300 bg-white rounded outline-none appearance-none"
                                                            title={`الحد الأقصى لـ ${mc.label}`}
                                                        />
                                                    </div>
                                                )}
                                                {isDisabled && <span className="text-[10px] text-red-600 font-bold bg-white/50 px-1 rounded leading-none mt-1">غير معتمد</span>}
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
                         const isRowSelected = selectedRowId === s.id;
                         
                         return (
                             <tr key={s.id} onClick={() => setSelectedRowId(s.id)} className={`hover:bg-slate-50 ${isRowSelected ? 'bg-cyan-50' : ''}`}>
                                 <td className="border border-slate-200 p-1 font-bold bg-amber-50">{sIdx + 1}</td>
                                 <td className="border border-slate-200 p-2 font-bold text-right truncate max-w-[150px] bg-slate-50" title={s.name}>{s.name}</td>
                                 
                                 {/* Map month columns */}
                                 {months.map((m, mIdx) => (
                                     <React.Fragment key={'r-'+s.id+'-'+mIdx}>
                                         {monthCols.map((mc, mcIdx) => {
                                             const colKeyStr = `m${mIdx}-${mc.id}`;
                                             const cellKey = `${s.id}-${colKeyStr}`;
                                             const val = cells[cellKey] || '';
                                             const isEmpty = val.trim() === '';
                                             const cIndex = (mIdx * 6) + mcIdx;
                                             const isColSelected = selectedColIndex === cIndex;
                                             const isDisabled = disabledCols.includes(colKeyStr);
                                             
                                             return (
                                                 <td key={cellKey} 
                                                     onMouseEnter={() => setSelectedColIndex(cIndex)}
                                                     onClick={() => setSelectedColIndex(cIndex)}
                                                     className={`border border-slate-300 p-0 transition-colors relative
                                                     ${isColSelected ? 'bg-cyan-100' : ''}
                                                     ${mc.isTotal ? 'bg-yellow-100 font-bold' : ''} 
                                                     ${isDisabled ? 'bg-red-50 cursor-not-allowed opacity-80' : ''}
                                                     ${!mc.isTotal && isEmpty && !isDisabled ? 'bg-yellow-50/50' : ''}`}
                                                 >
                                                     <input 
                                                        type="text" 
                                                        className={`w-full h-full p-2 text-center bg-transparent outline-blue-500 font-bold max-w-[50px] md:max-w-[80px] ${isDisabled ? 'cursor-not-allowed' : ''}`} 
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
                                      const isFailing = valNum > 0 && valNum < 50; // اعتبرت درجة الرسوب أقل من 50 كأساس افتراضي
                                      const cIndex = (months.length * 6) + fcIdx;
                                      const isColSelected = selectedColIndex === cIndex;

                                      return (
                                          <td key={cellKey} 
                                              onMouseEnter={() => setSelectedColIndex(cIndex)}
                                              onClick={() => setSelectedColIndex(cIndex)}
                                              className={`border border-slate-300 bg-orange-50/50 p-0 ${isColSelected ? 'bg-cyan-100' : ''} ${isFailing ? '!bg-orange-400/30' : ''}`}
                                          >
                                              <input 
                                                type="text" 
                                                className="w-full h-full p-2 text-center bg-transparent outline-blue-500 font-bold max-w-[50px] md:max-w-[80px]" 
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
                             {months.map((m, mIdx) => (
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
