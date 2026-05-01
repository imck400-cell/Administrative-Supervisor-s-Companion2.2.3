import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Search, X, Check, FileSpreadsheet, Download, Table, Send } from 'lucide-react';
import { useGlobal } from '../context/GlobalState';
import { toast } from 'sonner';
import { StudentEvaluation } from '../types';
import * as XLSX from 'xlsx-js-style';

const RATING_SCALES = [
  { label: 'ممتاز', color: 'bg-green-100 text-green-800 border-green-300' },
  { label: 'جيد جداً', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { label: 'جيد', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { label: 'ضعيف', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { label: 'ضعيف جداً', color: 'bg-red-100 text-red-800 border-red-300' }
];

const CRITERIA = [
  { id: 'comprehension', label: 'الاستيعاب العلمي' },
  { id: 'homework', label: 'الالتزام بالواجب' },
  { id: 'participation', label: 'المشاركة والتفاعل' },
  { id: 'behavior', label: 'السلوك الصفي' },
  { id: 'excellence', label: 'نقاط التميز' }
];

const MultiSelectDropdown = ({ value, options, onChange, placeholder, colorClass }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedValues = value ? value.split('،').map((v: string) => v.trim()).filter(Boolean) : [];

  const toggleOption = (opt: string) => {
    let newVals;
    if (selectedValues.includes(opt)) {
      newVals = selectedValues.filter((v: string) => v !== opt);
    } else {
      newVals = [...selectedValues, opt];
    }
    onChange(newVals.join('، '));
  };

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-2 border-2 border-slate-200 rounded-xl cursor-pointer bg-white ${colorClass || ''}`}
      >
        <div className="text-sm font-bold text-slate-700 truncate px-2">
          {selectedValues.length > 0 ? selectedValues.join('، ') : <span className="text-slate-400 font-normal">{placeholder}</span>}
        </div>
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
            {options.map((opt: string) => (
              <label key={opt} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer border-b last:border-0 text-sm font-bold text-slate-700">
                <input 
                  type="checkbox" 
                  checked={selectedValues.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                {opt}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const StudentEvaluationView = ({ onBack }: { onBack: () => void }) => {
  const { lang, data, currentUser, updateData } = useGlobal();
  const [view, setView] = useState<'form' | 'table'>('form');

  const schoolName = Object.keys(currentUser?.permissions?.schoolsAndBranches || {})[0] || '';
  const isReadOnly = currentUser?.permissions?.readOnly === true;

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('الأول');
  
  const [teacherName, setTeacherName] = useState(currentUser?.name || '');
  const [evaluatorRole, setEvaluatorRole] = useState('معلم المادة');
  const [subjects, setSubjects] = useState('');
  const [grades, setGrades] = useState('');
  
  const [evalData, setEvalData] = useState({
    comprehension: { rating: '', details: '' },
    homework: { rating: '', details: '' },
    participation: { rating: '', details: '' },
    behavior: { rating: '', details: '' },
    excellence: { rating: '', details: '' },
    customAction: { text: '' }
  });

  const students = useMemo(() => {
    return (data.secretariatStudents || []).filter(s => 
      s.schoolId === schoolName || s.schoolName === schoolName || !s.schoolId
    );
  }, [data.secretariatStudents, schoolName]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return students.filter(s => s.name?.includes(searchQuery) && !selectedStudents.find(selected => selected.id === s.id));
  }, [students, searchQuery, selectedStudents]);

  const handleSelectStudent = (s: any) => {
    setSelectedStudents([...selectedStudents, s]);
    setSearchQuery('');
  };

  const handleRemoveStudent = (id: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== id));
  };

  const updateCriteria = (criterion: string, field: 'rating' | 'details' | 'text', value: string) => {
    setEvalData(prev => ({
      ...prev,
      [criterion]: {
        ...(prev as any)[criterion],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    if (isReadOnly) {
      toast.error('للقراءة فقط');
      return;
    }
    if (selectedStudents.length === 0) {
      toast.error('يرجى اختيار طالب واحد على الأقل');
      return;
    }

    const newEvals: StudentEvaluation[] = selectedStudents.map(student => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: currentUser?.id,
      schoolId: schoolName,
      dateStr: new Date().toLocaleDateString('en-GB'),
      semester: selectedSemester,
      teacherName: teacherName,
      evaluatorRole: evaluatorRole,
      subjects: subjects,
      grades: grades,
      studentId: student.id,
      studentName: student.name,
      grade: student.grade || '',
      section: student.section || '',
      criteria: evalData
    }));

    const existingEvals = data.studentEvaluations || [];
    updateData({ studentEvaluations: [...existingEvals, ...newEvals] });
    
    toast.success('تم الحفظ بنجاح');
    setSelectedStudents([]);
    setEvalData({
      comprehension: { rating: '', details: '' },
      homework: { rating: '', details: '' },
      participation: { rating: '', details: '' },
      behavior: { rating: '', details: '' },
      excellence: { rating: '', details: '' },
      customAction: { text: '' }
    });
  };

  if (view === 'table') {
    return <StudentEvaluationTable onBack={() => setView('form')} data={data} schoolName={schoolName} currentUser={currentUser} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 font-arabic animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div className="bg-amber-100 p-3 rounded-xl">
            <Check className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">تقييم الطلاب</h2>
            <p className="text-sm font-bold text-slate-500 mt-1">تقييم الأداء والمشاركة والسلوكيات</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('table')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
          >
            <Table size={18} /> جدول التقييم
          </button>
          <button
            onClick={handleSave}
            disabled={isReadOnly}
            className={`flex items-center gap-2 px-4 py-2 ${isReadOnly ? 'bg-slate-400 cursor-not-allowed opacity-50' : 'bg-amber-500 hover:bg-amber-600'} text-white rounded-xl font-bold transition shadow-sm`}
          >
            <Save size={18} /> حفظ التقييم
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="border border-slate-200 rounded-3xl p-5 shadow-sm bg-white space-y-4">
            <h3 className="font-bold text-lg text-slate-800 border-b pb-2">بيانات المعلم</h3>
            
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">اسم المعلم</label>
                <input 
                  type="text" 
                  value={teacherName} 
                  onChange={e => setTeacherName(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">صفة المعلم المقيم</label>
                <input 
                  type="text" 
                  value={evaluatorRole} 
                  onChange={e => setEvaluatorRole(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">المادة</label>
                <MultiSelectDropdown 
                  value={subjects}
                  onChange={setSubjects}
                  placeholder="اختر المادة..."
                  options={['مربية', 'القرآن كريم', 'التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الكيمياء', 'الفيزياء', 'الأحياء', 'الاجتماعيات', 'الحاسوب']}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">الصف</label>
                <MultiSelectDropdown 
                  value={grades}
                  onChange={setGrades}
                  placeholder="اختر الصف..."
                  options={['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']}
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-3xl p-5 shadow-sm bg-white space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-lg text-slate-800">اختيار الطلاب</h3>
              <select 
                value={selectedSemester} 
                onChange={e => setSelectedSemester(e.target.value)}
                className="px-2 py-1 bg-slate-100 rounded-lg text-sm font-bold text-slate-700 outline-none"
              >
                <option value="الأول">الفصل الأول</option>
                <option value="الثاني">الفصل الثاني</option>
              </select>
            </div>
          
          <div className="relative">
            <Search className="absolute right-3 top-2.5 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم الطالب..."
              className="w-full pl-3 pr-10 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow outline-none"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl max-h-48 overflow-y-auto">
                {searchResults.map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => handleSelectStudent(s)}
                    className="p-3 hover:bg-amber-50 cursor-pointer border-b last:border-0 font-bold text-slate-700"
                  >
                    {s.name} <span className="text-xs text-slate-400 font-normal">({s.grade} - {s.section})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4 max-h-[400px] overflow-y-auto content-start p-2 border-2 border-dashed border-slate-200 rounded-2xl min-h-[100px]">
            {selectedStudents.length === 0 && <p className="text-slate-400 text-sm text-center w-full mt-4">لم يتم اختيار طلاب...</p>}
            {selectedStudents.map(s => (
              <div key={s.id} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="font-bold text-sm text-slate-700">{s.name}</span>
                <button onClick={() => handleRemoveStudent(s.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-0.5 transition">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          {CRITERIA.map(c => (
            <div key={c.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-3">{c.label}</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {RATING_SCALES.map(scale => (
                  <button
                    key={scale.label}
                    onClick={() => updateCriteria(c.id, 'rating', scale.label)}
                    className={`px-4 py-1.5 rounded-lg border font-bold text-sm transition-all
                      ${(evalData as any)[c.id].rating === scale.label ? scale.color + ' ring-2 ring-offset-1 ring-slate-400 scale-105 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {scale.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="تفاصيل أخرى..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition"
                value={(evalData as any)[c.id].details}
                onChange={e => updateCriteria(c.id, 'details', e.target.value)}
              />
            </div>
          ))}

          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-3">تفاصيل إضافية وإجراءات مخصصة</h4>
            <textarea
              placeholder="اكتب هنا..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition min-h-[100px]"
              value={evalData.customAction.text}
              onChange={e => updateCriteria('customAction', 'text', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentEvaluationTable = ({ onBack, data, schoolName, currentUser }: any) => {
  const [semesterFilter, setSemesterFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  const evals = useMemo(() => {
    return (data.studentEvaluations || []).filter((e: StudentEvaluation) => {
      // Filter logic
      if (e.userId !== currentUser?.id && currentUser?.role !== 'admin') return false; // Usually teachers see only their evals, but maybe admins see all? Wait, Teacher Portal is user-specific. Let's filter by userId if not admin.
      if (e.schoolId !== schoolName) return false;
      
      if (semesterFilter && e.semester !== semesterFilter) return false;
      if (nameFilter && !e.studentName.includes(nameFilter)) return false;
      if (gradeFilter && e.grade !== gradeFilter) return false;
      if (sectionFilter && e.section !== sectionFilter) return false;
      
      if (dateFrom || dateTo) {
         // Custom date filter logic - assume dd/mm/yyyy from react/date
         const parseDate = (dStr: string) => {
            const parts = dStr.split('/');
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
         };
         try {
           const eDate = parseDate(e.dateStr);
           if (dateFrom && eDate < new Date(dateFrom)) return false;
           if (dateTo && eDate > new Date(dateTo)) return false;
         } catch(err) {}
      }

      return true;
    });
  }, [data.studentEvaluations, currentUser, schoolName, semesterFilter, dateFrom, dateTo, nameFilter, gradeFilter, sectionFilter]);

  const uniqueGrades = useMemo(() => [...new Set(evals.map((e: any) => e.grade).filter(Boolean))] as string[], [evals]);
  const uniqueSections = useMemo(() => [...new Set(evals.map((e: any) => e.section).filter(Boolean))] as string[], [evals]);

  const handleExportText = () => {
    let content = `جدول تقييم الطلاب\n`;
    content += `الفصل الدراسي: ${semesterFilter || 'الكل'} | التاريخ: ${dateFrom || 'البداية'} - ${dateTo || 'النهاية'}\n\n`;
    evals.forEach((e: any) => {
      content += `الطالب: ${e.studentName} | الصف: ${e.grade} | الشعبة: ${e.section} | التاريخ: ${e.dateStr}\n`;
      CRITERIA.forEach(c => {
         content += `- ${c.label}: ${e.criteria?.[c.id]?.rating || 'بدون تقييم'} (${e.criteria?.[c.id]?.details || 'لا يوجد تفاصيل'})\n`;
      });
      content += `- تفاصيل إضافية: ${e.criteria?.customAction?.text || 'لا يوجد'}\n`;
      content += `------------------------\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقييم_الطلاب.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const wsData: any[][] = [];
    wsData.push(['جدول تقييم الطلاب']);
    wsData.push(['التاريخ', e => e.dateStr, 'الطالب', 'الصف', 'الشعبة', ...CRITERIA.map(c => c.label), 'تفاصيل إضافية', 'التاريخ']); // Wait, simple headers first.
    
    // Proper headers
    let headers = ['تاريخ التقييم', 'اسم الطالب', 'الصف', 'الشعبة', ...CRITERIA.map(c => c.label), 'تفاصيل إضافية وإجراءات'];
    wsData[1] = headers;

    evals.forEach((e: any) => {
      const row = [
        e.dateStr,
        e.studentName,
        e.grade,
        e.section,
        ...CRITERIA.map(c => `${e.criteria?.[c.id]?.rating || ''} - ${e.criteria?.[c.id]?.details || ''}`),
        e.criteria?.customAction?.text || ''
      ];
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!dir'] = 'rtl';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقييمات");
    XLSX.writeFile(wb, `تقييم_الطلاب.xlsx`);
  };

  const handleImportText = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic stub format for now
    toast.error('لم يتم توفير بنية الاستيراد بدقة، يرجى التوضيح إذا لزم الأمر.');
  };

  const handleSendWhatsApp = () => {
    let msg = `🔵 *جدول تقييم الطلاب* 🔵\n\n`;
    if (semesterFilter || dateFrom || dateTo) {
      msg += `📁 الفلتر:\n`;
      if (semesterFilter) msg += `- الفصل الدراسي: ${semesterFilter}\n`;
      if (dateFrom || dateTo) msg += `- الفترة: ${dateFrom || '...'} إلى ${dateTo || '...'}\n`;
      msg += `\n`;
    }

    evals.forEach((e: any, index: number) => {
      msg += `👤 *اسم الطالب:* ${e.studentName}\n`;
      msg += `🏫 *الصف والشعبة:* ${e.grade} - ${e.section}\n`;
      msg += `📅 *تاريخ التقييم:* ${e.dateStr}\n\n`;
      msg += `🟡 *-- تفاصيل التقييم --* 🟡\n`;
      
      CRITERIA.forEach(c => {
         const criteriaData = e.criteria?.[c.id];
         if (!criteriaData) return;
         const rating = criteriaData.rating || 'لم يقيم';
         let ratingEmoji = '✅';
         if (rating.includes('ضعيف جداً')) ratingEmoji = '❌ 🔴';
         else if (rating.includes('ضعيف')) ratingEmoji = '⚠️ 🟠';
         else if (rating.includes('جيد جداً')) ratingEmoji = '🌟 🟢';
         else if (rating.includes('ممتاز')) ratingEmoji = '🏆 🟢';
         else if (rating.includes('جيد')) ratingEmoji = '☑️ 🟡';
         
         const details = criteriaData.details ? `\n   ↳ 📝 _${criteriaData.details}_` : '';
         msg += `${ratingEmoji} *${c.label}:* ${rating}${details}\n`;
      });
      if (e.criteria?.customAction?.text) {
         msg += `\n📌 *تفاصيل إضافية وإجراءات مخصصة:*\n_${e.criteria.customAction.text}_\n`;
      }
      
      if (index < evals.length - 1) {
         msg += `\n➖➖➖➖➖➖➖➖➖➖\n\n`;
      }
    });

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-arabic animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800">جدول تقييم الطلاب</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept=".txt" onChange={handleImportText} className="hidden" id="importTxt" />
          <label htmlFor="importTxt" className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer transition">
            <Download size={16} /> استيراد txt
          </label>
          <button onClick={handleExportText} className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition">
            <FileSpreadsheet size={16} /> تصدير txt
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition">
            <FileSpreadsheet size={16} /> تصدير Excel
          </button>
          <button onClick={handleSendWhatsApp} className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition">
            <Send size={16} /> واتساب
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500">الفصل الدراسي</label>
          <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} className="border-2 border-slate-200 rounded-xl p-2 outline-none">
            <option value="">الكل</option>
            <option value="الأول">الأول</option>
            <option value="الثاني">الثاني</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500">من تاريخ</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border-2 border-slate-200 rounded-xl p-2 outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500">إلى تاريخ</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border-2 border-slate-200 rounded-xl p-2 outline-none" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-slate-500">بحث بالاسم</label>
          <input type="text" value={nameFilter} onChange={e => setNameFilter(e.target.value)} placeholder="اسم الطالب..." className="border-2 border-slate-200 rounded-xl p-2 outline-none w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500">الصف</label>
          <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="border-2 border-slate-200 rounded-xl p-2 outline-none">
            <option value="">الكل</option>
            {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500">الشعبة</label>
          <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="border-2 border-slate-200 rounded-xl p-2 outline-none">
            <option value="">الكل</option>
            {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-slate-200">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#4a85c8] text-white">
            <tr>
              <th className="p-3 font-bold border underline border-[#3768a3]">التاريخ</th>
              <th className="p-3 font-bold border underline border-[#3768a3]">اسم الطالب</th>
              <th className="p-3 font-bold border underline border-[#3768a3]">الصف والشعبة</th>
              {CRITERIA.map(c => <th key={c.id} className="p-3 font-bold border underline border-[#3768a3]">{c.label}</th>)}
              <th className="p-3 font-bold border underline border-[#3768a3]">تفاصيل إضافية</th>
            </tr>
          </thead>
          <tbody>
            {evals.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-4 text-center text-slate-500 font-bold">لا توجد بيانات مطابقة للفلتر...</td>
              </tr>
            ) : (
              evals.map((e: any, idx: number) => (
                <tr key={e.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                  <td className="p-3 border border-slate-200">{e.dateStr}</td>
                  <td className="p-3 border border-slate-200 font-bold">{e.studentName}</td>
                  <td className="p-3 border border-slate-200">{e.grade} - {e.section}</td>
                  {CRITERIA.map(c => {
                    const criteriaData = e.criteria?.[c.id];
                    let textClass = '';
                    if (criteriaData?.rating.includes('ضعيف')) textClass = 'text-red-600 font-bold';
                    else if (criteriaData?.rating.includes('ممتاز')) textClass = 'text-green-600 font-bold';

                    return (
                      <td key={c.id} className="p-3 border border-slate-200">
                        <div className={textClass}>{criteriaData?.rating || '-'}</div>
                        {criteriaData?.details && <div className="text-xs text-slate-500 mt-1">{criteriaData.details}</div>}
                      </td>
                    );
                  })}
                  <td className="p-3 border border-slate-200 text-xs text-slate-600">{e.criteria?.customAction?.text || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
