import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, FileSpreadsheet, Plus, Trash2, Search, Calendar, User, BookOpen, Layers, School, MapPin, Archive, X, Eye } from 'lucide-react';
import { useGlobal } from '../context/GlobalState';
import { toast } from 'sonner';
import { SelfEvaluation, SelfEvaluationRow } from '../types';
import * as XLSX from 'xlsx';

export const SelfEvaluationView = ({ onBack }: { onBack: () => void }) => {
  const { lang, currentUser, updateData, data } = useGlobal();

  const isReadOnly = currentUser?.permissions?.readOnly === true;

  const [dateStr, setDateStr] = useState(new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }));
  const [subject, setSubject] = useState('');
  const [teacherName, setTeacherName] = useState(currentUser?.name || '');
  const [grades, setGrades] = useState(currentUser?.grades?.join(', ') || '');
  const [schoolName, setSchoolName] = useState(currentUser?.schools?.[0] || '');
  const [branchName, setBranchName] = useState(currentUser?.permissions?.schoolsAndBranches?.[schoolName]?.[0] || '');

  const defaultColumns = [
    { id: 'no', label: 'م' },
    { id: 'activity', label: 'الأنشطة المقامة' },
    { id: 'planned', label: 'المخطط' },
    { id: 'executed', label: 'المنفذ في الفصل الأول' },
    { id: 'total', label: 'مجموع' },
    { id: 'percentage', label: 'نسبة' },
    { id: 'note', label: 'ملاحظة' }
  ];

  const defaultRows: SelfEvaluationRow[] = [
    { id: 'h1', category: 'header', no: '', activity: 'الأنشطة التربوية', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r1', category: 'الأنشطة التربوية', no: '1', activity: 'تنوع الاستراتيجيات المستخدمة لعدد 12', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r2', category: 'الأنشطة التربوية', no: '2', activity: 'تنفيذ برنامج التقوية والتأهيل 3', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r3', category: 'الأنشطة التربوية', no: '3', activity: 'الزيارة التبادلية 1', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r4', category: 'الأنشطة التربوية', no: '4', activity: 'الأنشطة اللاصفية 3', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r5', category: 'الأنشطة التربوية', no: '5', activity: 'تسليم الامتحانات في الوقت المطلوب بعد التعديل 1', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r6', category: 'الأنشطة التربوية', no: '6', activity: 'التأخر عن الخطة الشهرية في الدروس بعدد 0', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r7', category: 'الأنشطة التربوية', no: '7', activity: 'المشاركة في الدورات واللقاءات بفاعلية 1', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'h2', category: 'header', no: '', activity: 'الأنشطة الإدارية', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r8', category: 'الأنشطة الإدارية', no: '8', activity: 'الإشراف بفاعلية في الطابور 22', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r8a', category: 'الأنشطة الإدارية', no: '', activity: 'في الراحة 8', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r8b', category: 'الأنشطة الإدارية', no: '', activity: 'نهاية الدوام 8', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r9', category: 'الأنشطة الإدارية', no: '9', activity: 'التحضير اليومي عدد الأيام 22', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r10', category: 'الأنشطة الإدارية', no: '10', activity: 'تفعيل الريادة حسب الجدول 4', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r11', category: 'الأنشطة الإدارية', no: '11', activity: 'تصحيح دفاتر الطلاب مرتين في الأسبوع 8', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r12', category: 'الأنشطة الإدارية', no: '12', activity: 'كتابة ملاحظات على دفاتر المتابعة ثلاث مرات أسبوعياً 12', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r13', category: 'الأنشطة الإدارية', no: '13', activity: 'تسليم كشوف الدرجات في الوقت المطلوب 1', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r14', category: 'الأنشطة الإدارية', no: '14', activity: 'تفعيل الإذاعة 1', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r15', category: 'الأنشطة الإدارية', no: '15', activity: 'المشاركة في الأنشطة مع مسؤول الأنشطة 2', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r16', category: 'الأنشطة الإدارية', no: '16', activity: 'عدد المخالفات 0', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'h3', category: 'header', no: '', activity: 'الوسائل والمصادر', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r17', category: 'الوسائل والمصادر', no: '17', activity: 'عدد الوسائل المستخدمة (قصاصات وكروت 4)', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r17a', category: 'الوسائل والمصادر', no: '', activity: 'لوحات جدارية 1', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r17b', category: 'الوسائل والمصادر', no: '', activity: 'نماذج من الطبيعة 2', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r17c', category: 'الوسائل والمصادر', no: '', activity: 'صوتيات ومرئيات 1', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r17d', category: 'الوسائل والمصادر', no: '', activity: 'غير ذلك ـــــــ', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r18', category: 'الوسائل والمصادر', no: '18', activity: 'عدد المصادر المستخدمة (معمل الحاسوب 1)', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r18a', category: 'الوسائل والمصادر', no: '', activity: 'معمل العلوم 1', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r18b', category: 'الوسائل والمصادر', no: '', activity: 'شاشة العرض 1', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r18c', category: 'الوسائل والمصادر', no: '', activity: 'أخرى ـــــــ', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'h4', category: 'header', no: '', activity: 'الغياب والتأخر', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r19', category: 'الغياب والتأخر', no: '19', activity: 'عدد أيام الغياب 0', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r20', category: 'الغياب والتأخر', no: '20', activity: 'عدد أيام التأخر 0', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'hf', category: 'footer', no: '', activity: 'الإجمالي', planned: '', executed: '', total: '120', percentage: '', note: '' },
  ];

  const [columns, setColumns] = useState(defaultColumns);
  const [rows, setRows] = useState<SelfEvaluationRow[]>(defaultRows);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  
  // Archiving
  const handleSave = () => {
    if (isReadOnly) {
      toast.error('للقراءة فقط');
      return;
    }
    
    const newEval: SelfEvaluation = {
      id: Date.now().toString(),
      userId: currentUser?.id,
      schoolId: schoolName,
      dateStr,
      teacherName,
      subject,
      grades,
      schoolName,
      branchName,
      rows
    };

    updateData({
      selfEvaluations: [...(data.selfEvaluations || []), newEval]
    });
    toast.success('تم أرشفة التقرير بنجاح');
  };�خر', no: '19', activity: 'عدد أيام الغياب 0', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'r20', category: 'الغياب والتأخر', no: '20', activity: 'عدد أيام التأخر 0', planned: '', executed: '', total: '', percentage: '', note: '' },
    { id: 'hf', category: 'footer', no: '', activity: 'الإجمالي', planned: '', executed: '', total: '120', percentage: '', note: '' },
  ];

  const [columns, setColumns] = useState(defaultColumns);
  const [rows, setRows] = useState<SelfEvaluationRow[]>(defaultRows);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Archiving
  const handleSave = () => {
    if (isReadOnly) {
      toast.error('للقراءة فقط');
      return;
    }
    
    const newEval: SelfEvaluation = {
      id: Date.now().toString(),
      userId: currentUser?.id,
      schoolId: schoolName,
      dateStr,
      teacherName,
      subject,
      grades,
      schoolName,
      branchName,
      rows
    };

    updateData({
      selfEvaluations: [...(data.selfEvaluations || []), newEval]
    });
    toast.success('تم أرشفة التقرير بنجاح');
  };

  const handleExportExcel = () => {
    // Basic worksheet
    const wsData = [];
    // Header
    wsData.push(['تقرير الأنشطة الفصلية']);
    wsData.push(['المدرسة', schoolName, 'الفرع', branchName, 'تاريخ التقييم', dateStr]);
    wsData.push(['المعلم', teacherName, 'المادة', subject, 'الصفوف', grades]);
    wsData.push([]);

    // Table Headers
    wsData.push(columns.map(c => c.label));
    
    // Table Rows
    rows.forEach(r => {
      wsData.push(columns.map(c => (r as any)[c.id] || ''));
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Attempting some basic colors or styling based on xlsx (most basic styles are lost in free js xlsx, but we try)
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقييم الذاتي");
    
    XLSX.writeFile(wb, `التقييم_الذاتي_${teacherName.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.xlsx`);
  };

  const handleRowChange = (index: number, key: keyof SelfEvaluationRow | string, val: string) => {
    const newRows = [...rows];
    (newRows[index] as any)[key] = val;
    setRows(newRows);
  };

  const addRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index + 1, 0, { id: Date.now().toString(), category: '', no: '', activity: '', planned: '', executed: '', total: '', percentage: '', note: '' });
    setRows(newRows);
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) return;
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const addColumn = () => {
    const newColId = 'col_' + Date.now();
    const newLabel = prompt('اسم العمود الجديد:');
    if (!newLabel) return;
    setColumns([...columns, { id: newColId, label: newLabel }]);
  };

  const deleteColumn = (colId: string) => {
    if (columns.length <= 2) return; // Keep at least some
    setColumns(columns.filter(c => c.id !== colId));
  };
  
  const autofillDown = (colId: string) => {
    // Try to find the first valid non-empty value in this column and copy it downwards to empty cells
    const newRows = [...rows];
    let fillValue = '';
    for (let i = 0; i < newRows.length; i++) {
        if (newRows[i].category === 'header' || newRows[i].category === 'footer') continue;
        const val = (newRows[i] as any)[colId];
        if (val && val.toString().trim() !== '') {
            fillValue = val.toString().trim();
            break;
        }
    }
    
    if (fillValue) {
        for (let i = 0; i < newRows.length; i++) {
            if (newRows[i].category === 'header' || newRows[i].category === 'footer') continue;
            if (!(newRows[i] as any)[colId] || (newRows[i] as any)[colId].toString().trim() === '') {
                (newRows[i] as any)[colId] = fillValue;
            }
        }
        setRows(newRows);
        toast.success(`تم التعبئة التلقائية للعمود بقيمة ${fillValue}`);
    } else {
        toast.info('لم يتم العثور على قيمة للملء');
    }
  };

  const filteredRows = rows.filter(r => 
    searchQuery === '' ? true : Object.values(r).some(v => v.toString().includes(searchQuery))
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-arabic animate-in fade-in zoom-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-slate-800">
          تقرير الأنشطة الفصلية (التقييم الذاتي)
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isReadOnly}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
          >
            <Save size={18} /> أرشيف
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition"
          >
            <FileSpreadsheet size={18} /> Excel
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
            <User className="text-blue-500" />
            <input 
              type="text" 
              value={teacherName} 
              onChange={e => setTeacherName(e.target.value)} 
              placeholder="اسم المعلم"
              className="bg-transparent border-none outline-none font-bold text-slate-700 w-full" 
            />
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
            <BookOpen className="text-indigo-500" />
            <input 
              type="text" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              placeholder="المادة"
              className="bg-transparent border-none outline-none font-bold text-slate-700 w-full" 
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
            <Layers className="text-purple-500" />
            <input 
              type="text" 
              value={grades} 
              onChange={e => setGrades(e.target.value)} 
              placeholder="الصفوف الت يدرسها"
              className="bg-transparent border-none outline-none font-bold text-slate-700 w-full" 
            />
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
            <School className="text-emerald-500" />
            <input 
              type="text" 
              value={schoolName} 
              onChange={e => setSchoolName(e.target.value)} 
              placeholder="المدرسة"
              className="bg-transparent border-none outline-none font-bold text-slate-700 w-full" 
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
            <MapPin className="text-red-500" />
            <input 
              type="text" 
              value={branchName} 
              onChange={e => setBranchName(e.target.value)} 
              placeholder="الفرع"
              className="bg-transparent border-none outline-none font-bold text-slate-700 w-full" 
            />
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
            <Calendar className="text-amber-500" />
            <input 
              type="text" 
              value={dateStr} 
              onChange={e => setDateStr(e.target.value)} 
              className="bg-transparent border-none outline-none font-bold text-slate-700 w-full" 
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث في التقرير..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-bold"
          />
        </div>
        <button onClick={addColumn} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition">
          <Plus size={16} /> إضافة عمود
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-slate-200">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#4a85c8] text-white">
            <tr>
              {columns.map(col => (
                <th key={col.id} className="p-3 font-bold border border-[#3768a3] whitespace-nowrap text-center relative group">
                  {col.label}
                  {col.id !== 'no' && col.id !== 'activity' && (
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button onClick={() => autofillDown(col.id)} title="تعبئة تلقائية لأسفل" className="bg-white/20 hover:bg-white/40 p-1 rounded">
                        <ArrowLeft size={12} className="-rotate-90" />
                      </button>
                      <button onClick={() => deleteColumn(col.id)} title="حذف العمود" className="bg-red-500/80 hover:bg-red-600 p-1 rounded text-white">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </th>
              ))}
              <th className="p-3 w-10 border border-[#3768a3]"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => {
              const isHeader = row.category === 'header';
              const isFooter = row.category === 'footer';
              
              const trClass = isHeader 
                ? "bg-[#cfe2f3] font-black border-b-2 border-slate-300"
                : isFooter 
                  ? "bg-[#d9ead3] font-black border-t-2 border-slate-300"
                  : index % 2 === 0 ? "bg-white" : "bg-slate-50";

              return (
                <tr key={index} className={`${trClass} hover:bg-blue-50/50 transition-colors`}>
                  {columns.map(col => {
                    if (isHeader && col.id !== 'activity') {
                      if (col.id === 'no') return <td key={col.id} className="border border-slate-200 px-2 py-1"></td>;
                      return <td key={col.id} className="border border-slate-200 px-2 py-1"></td>;
                    }

                    if (isHeader && col.id === 'activity') {
                      return (
                        <td key={col.id} className="border border-slate-200 px-2 py-2">
                           <input
                            type="text"
                            value={(row as any)[col.id] || ''}
                            onChange={(e) => handleRowChange(index, col.id, e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-center font-black text-blue-900"
                          />
                        </td>
                      )
                    }

                    return (
                      <td key={col.id} className="border border-slate-200 p-1">
                        <input
                          type="text"
                          value={(row as any)[col.id] || ''}
                          onChange={(e) => handleRowChange(index, col.id, e.target.value)}
                          className={`w-full bg-transparent border-none outline-none min-w-[80px] p-1 rounded ${col.id === 'activity' ? 'font-bold' : 'text-center'}`}
                        />
                      </td>
                    );
                  })}
                  <td className="border border-slate-200 p-1 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100">
                      <button onClick={() => addRow(index)} className="p-1 text-blue-500 hover:bg-blue-100 rounded">
                        <Plus size={14} />
                      </button>
                      <button onClick={() => deleteRow(index)} className="p-1 text-red-500 hover:bg-red-100 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
