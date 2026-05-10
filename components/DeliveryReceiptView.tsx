import React, { useState, useEffect } from 'react';
import { useGlobal } from '../context/GlobalState';
import { DeliveryReceiptReport, DeliveryReceiptItem } from '../types';
import { Calendar, Save, Archive, Filter, CheckCircle, Plus, Trash2, Briefcase, FileSpreadsheet, MessageCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportToStyledExcel } from '../src/lib/excelExport';

interface Props {
  onClose?: () => void;
}

export const DeliveryReceiptView: React.FC<Props> = ({ onClose }) => {
  const { data, updateData, currentUser } = useGlobal();
  const today = new Date().toISOString().split('T')[0];

  const existingReports = data.deliveryReceiptRecords || [];
  
  const [reportName, setReportName] = useState('كشف استلام وتسليم جديد');
  const [reportDate, setReportDate] = useState(today);

  // Filter criteria for Quick Apply
  const [applyBranch, setApplyBranch] = useState<string>('الجميع');
  const [applyGrades, setApplyGrades] = useState<string[]>([]);
  const [applySections, setApplySections] = useState<string[]>([]);
  const [applyFormCount, setApplyFormCount] = useState<string>('');
  const [applyReceiveDate, setApplyReceiveDate] = useState<string>(today);
  const [applyDeliveryDate, setApplyDeliveryDate] = useState<string>(today);
  const [applyNotes, setApplyNotes] = useState<string>('');
  const [applyStatus, setApplyStatus] = useState<'delivered' | 'in_progress' | 'not_delivered'>('in_progress');
  const [applyAction, setApplyAction] = useState<string>('تنبيه شفوي');

  const [items, setItems] = useState<DeliveryReceiptItem[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  const [showArchive, setShowArchive] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  // Filter Form State
  const [filterStartDate, setFilterStartDate] = useState(today);
  const [filterEndDate, setFilterEndDate] = useState(today);
  const [filterSelectedReports, setFilterSelectedReports] = useState<string[]>([]);
  const [filterSelectedStatus, setFilterSelectedStatus] = useState<string[]>([]);
  const [filterSelectedActions, setFilterSelectedActions] = useState<string[]>([]);
  const [filteredResults, setFilteredResults] = useState<(DeliveryReceiptItem & { _parent: DeliveryReceiptReport, uniqueId: string })[] | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const supervisorName = currentUser?.name || 'بدون اسم';
  const supervisorJob = currentUser?.jobTitle || (currentUser?.role === 'admin' ? 'مدير نظام' : 'مشرف إداري');
  const school = currentUser?.selectedSchool?.split(',')[0] || data.profile?.schoolName || '';
  const branch = currentUser?.selectedBranch || '';
  const academicYear = currentUser?.selectedYear || data.profile?.year || '1445-1446';
  const grade = currentUser?.grades && currentUser.grades.length > 0 ? currentUser.grades.join(', ') : 'الجميع';
  const section = currentUser?.sections && currentUser.sections.length > 0 ? currentUser.sections.join(', ') : 'الجميع';

  // Available Staff for Current User Scope
  const availableStaff = React.useMemo(() => {
    let staff = data.secretariatStaff || [];
    const isAdmin = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
    if (!isAdmin) {
      if (currentUser?.selectedSchool) {
        const userSchools = currentUser.selectedSchool.split(',').map(s => s.trim());
        staff = staff.filter((s:any) => userSchools.includes(String(s.school || '').trim()));
      }
      if (currentUser?.selectedBranch) {
        staff = staff.filter((s:any) => s.branch === currentUser.selectedBranch);
      }
      if (currentUser?.grades && currentUser.grades.length > 0) {
        staff = staff.filter((s:any) => !s.grade || currentUser.grades!.includes(String(s.grade).trim()));
      }
    }
    return staff;
  }, [data.secretariatStaff, currentUser]);

  const uniqueBranches = Array.from(new Set(availableStaff.map((s:any) => s.branch).filter(Boolean))) as string[];
  const uniqueGrades = Array.from(new Set(availableStaff.map((s:any) => s.grade).filter(Boolean))) as string[];
  const uniqueSections = Array.from(new Set(availableStaff.map((s:any) => s.section).filter(Boolean))) as string[];

  // Build items when creating a new report
  useEffect(() => {
    if (!activeReportId && !showArchive && !showFilter && items.length === 0) {
      const initialItems = availableStaff.map((s:any) => ({
        id: crypto.randomUUID(),
        teacherName: s.name || '',
        school: s.school || '',
        branch: s.branch || '',
        grade: s.grade || '',
        section: s.section || '',
        formCount: '',
        receiveDateStr: reportDate,
        deliveryDateStr: reportDate,
        status: null as any,
        actionTaken: null as any,
        notes: ''
      }));
      setItems(initialItems);
    }
  }, [activeReportId, showArchive, showFilter, items.length, availableStaff, reportDate]);

  const saveWork = (currentItems: DeliveryReceiptItem[] = items, hideToast: boolean = false) => {
    const newObj: DeliveryReceiptReport = {
      id: activeReportId || crypto.randomUUID(),
      userId: currentUser?.id,
      reportName,
      school,
      branch,
      academicYear,
      supervisorName,
      supervisorJob,
      grade,
      section,
      dateStr: reportDate,
      items: currentItems,
      createdAt: new Date().toISOString()
    };

    let updatedRecords = [...existingReports];
    if (activeReportId) {
      const idx = updatedRecords.findIndex(t => t.id === activeReportId);
      if (idx >= 0) updatedRecords[idx] = newObj;
      else updatedRecords.push(newObj);
    } else {
      updatedRecords.push(newObj);
      setActiveReportId(newObj.id);
    }

    updateData({ deliveryReceiptRecords: updatedRecords });
    if (!hideToast) toast.success('تم حفظ ކشف الاستلام والتسليم بنجاح');
  };

  const updateItem = (id: string, updates: Partial<DeliveryReceiptItem>) => {
    const newItems = items.map(t => t.id === id ? { ...t, ...updates } : t);
    setItems(newItems);
    setTimeout(() => saveWork(newItems, true), 500);
  };

  const applyToSelected = (field: keyof DeliveryReceiptItem, value: any, condition?: (item: DeliveryReceiptItem) => boolean) => {
    const newItems = items.map(t => {
      // Check if matches branch
      if (applyBranch !== 'الجميع' && t.branch !== applyBranch) return t;
      // Check if matches grades
      if (applyGrades.length > 0 && !applyGrades.includes(t.grade)) return t;
      // Check if matches sections
      if (applySections.length > 0 && !applySections.includes(t.section)) return t;
      
      if (condition && !condition(t)) return t;

      return { ...t, [field]: value };
    });
    setItems(newItems);
    setTimeout(() => saveWork(newItems, true), 500);
    toast.success(`تم التعميم بنجاح`);
  };

  const handleApplyFilter = () => {
    let results: (DeliveryReceiptItem & { _parent: DeliveryReceiptReport, uniqueId: string })[] = [];
    existingReports.forEach(report => {
      if (report.dateStr >= filterStartDate && report.dateStr <= filterEndDate) {
        if (filterSelectedReports.length === 0 || filterSelectedReports.includes(report.id)) {
          report.items.forEach(t => {
            const matchesStatus = filterSelectedStatus.length === 0 || filterSelectedStatus.includes(t.status as string);
            const matchesAction = filterSelectedActions.length === 0 || filterSelectedActions.includes(t.actionTaken as string);
            
            if (matchesStatus && matchesAction) {
              results.push({ ...t, _parent: report, uniqueId: `${report.id}-${t.id}` });
            }
          });
        }
      }
    });

    results.sort((a,b) => {
      if(a.dateStr !== b.dateStr) return b.dateStr.localeCompare(a.dateStr);
      return 0;
    });

    setSelectedTaskIds([]);
    setFilteredResults(results);
    setShowFilter(false);
  };

  // Excel Export
  const handleExportExcel = async () => {
    if (!filteredResults || filteredResults.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    const headers = ['م', 'المدرسة والفرع', 'اسم المعلم', 'عدد النماذج', 'تاريخ الاستلام', 'تاريخ التسليم', 'الصف والشعبة', 'حالة التنفيذ', 'الإجراء المتخذ', 'ملاحظات'];
    const exportData = filteredResults.map((t, idx) => [
      idx + 1,
      `${t.school} - ${t.branch}`,
      t.teacherName,
      t.formCount,
      t.receiveDateStr,
      t.deliveryDateStr,
      `${t.grade} - ${t.section}`,
      t.status === 'delivered' ? 'تم التسليم' : t.status === 'not_delivered' ? 'لم يتم التسليم' : t.status === 'in_progress' ? 'قيد المتابعة' : '',
      t.actionTaken || '',
      t.notes || ''
    ]);

    await exportToStyledExcel({
      title: 'تقرير كشف الاستلام والتسليم',
      filename: 'delivery_receipt_report',
      headers,
      data: exportData,
      columnWidths: [5, 20, 25, 12, 15, 15, 15, 15, 20, 30],
      profile: data.profile || {},
      onRow: (row, rowData) => {
        const val = rowData[7];
        const statCell = row.getCell(8);
        if (val === 'تم التسليم') {
           statCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; 
           statCell.font = { name: 'Arial', bold: true, color: { argb: 'FF065F46' } }; 
        } else if (val === 'لم يتم التسليم') {
           statCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; 
           statCell.font = { name: 'Arial', bold: true, color: { argb: 'FF991B1B' } }; 
        } else if (val === 'قيد المتابعة') {
           statCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; 
           statCell.font = { name: 'Arial', bold: true, color: { argb: 'FF92400E' } }; 
        }
      }
    });
  };

  const generateWhatsAppMessage = (tasksToExport: (DeliveryReceiptItem & { _parent: DeliveryReceiptReport })[]) => {
    let msg = `*📋 كشف الاستلام والتسليم*\n`;
    msg += `*التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n`;
    msg += `----------------------------------\n\n`;

    tasksToExport.forEach((t, idx) => {
      msg += `*${idx + 1}- 👤 المعلم:* ${t.teacherName}\n`;
      msg += `🏫 *المدرسة:* ${t.school} - ${t.branch}\n`;
      msg += `📚 *الصف والشعبة:* ${t.grade} - ${t.section}\n`;
      if (t.formCount) msg += `📝 *عدد النماذج:* ${t.formCount}\n`;
      if (t.receiveDateStr) msg += `📥 *تاريخ الاستلام:* ${t.receiveDateStr}\n`;
      if (t.deliveryDateStr) msg += `📤 *تاريخ التسليم:* ${t.deliveryDateStr}\n`;
      
      const statTxt = t.status === 'delivered' ? '✅ تم التسليم' : t.status === 'not_delivered' ? '❌ لم يتم التسليم' : t.status === 'in_progress' ? '⏳ قيد المتابعة' : '';
      if (statTxt) msg += `📊 *حالة التنفيذ:* ${statTxt}\n`;
      
      if (t.actionTaken) msg += `⚠️ *الإجراء المتخذ:* ${t.actionTaken}\n`;
      if (t.notes) msg += `📝 *ملاحظات:* ${t.notes}\n`;
      msg += `\n`;
    });
    
    msg += `----------------------------------\n`;
    msg += `✍️ *إعداد التقرير:* ${currentUser?.name || '...'}\n`;
    msg += `🧑‍💼 *المدير المباشر:* ${data.profile?.branchManager || '...'}\n`;

    return encodeURIComponent(msg);
  };

  const handleExportWhatsAppAll = () => {
    if (!filteredResults || filteredResults.length === 0) return;
    const itemsToSend = selectedTaskIds.length > 0 
      ? filteredResults.filter(t => selectedTaskIds.includes((t as Record<string,any>).uniqueId))
      : filteredResults;
      
    if (itemsToSend.length === 0) {
      toast.error('لم يتم تحديد صفوف للإرسال');
      return;
    }
    
    const uri = generateWhatsAppMessage(itemsToSend);
    window.open(`https://wa.me/?text=${uri}`, '_blank');
  };

  const handleToggleRowSelection = (uniqueId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(uniqueId) ? prev.filter(id => id !== uniqueId) : [...prev, uniqueId]
    );
  };

  const handleToggleAllSelection = () => {
    if (!filteredResults) return;
    if (selectedTaskIds.length === filteredResults.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredResults.map(t => (t as Record<string,any>).uniqueId));
    }
  };


  if (filteredResults) {
    return (
      <div className="space-y-6 font-arabic p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Filter className="text-blue-500" />
            مؤشرات كشف الاستلام والتسليم
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
               <FileSpreadsheet size={18} /> تصدير إكسل
            </button>
            <button onClick={handleExportWhatsAppAll} className="btn-secondary flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
               <MessageCircle size={18} /> إرسال واتساب
            </button>
            <button onClick={() => setFilteredResults(null)} className="btn-secondary bg-slate-100">عودة إلى السجل</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead>
              <tr className="bg-gradient-to-l from-blue-600 to-blue-800 text-white">
                <th className="p-4 border-b border-blue-900 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredResults.length > 0 && selectedTaskIds.length === filteredResults.length}
                    onChange={handleToggleAllSelection}
                    className="w-4 h-4 rounded text-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 border-b border-blue-900">المدرسة والفرع</th>
                <th className="p-4 border-b border-blue-900">اسم المعلم</th>
                <th className="p-4 border-b border-blue-900">عدد النماذج</th>
                <th className="p-4 border-b border-blue-900">الاستلام والتسليم</th>
                <th className="p-4 border-b border-blue-900">الصف والشعبة</th>
                <th className="p-4 border-b border-blue-900">حالة التنفيذ</th>
                <th className="p-4 border-b border-blue-900">الإجراء المتخذ</th>
                <th className="p-4 border-b border-blue-900">ملاحظات</th>
                <th className="p-4 border-b border-blue-900 text-center w-16"><MessageCircle size={16} className="mx-auto"/></th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((t, idx) => {
                const uniqueId = (t as Record<string,any>).uniqueId;
                const isSelected = selectedTaskIds.includes(uniqueId);
                return (
                  <tr 
                    key={idx} 
                    className={`border-b last:border-0 hover:bg-orange-50 cursor-pointer transition-colors ${isSelected ? 'bg-orange-100' : ''}`}
                    onClick={() => handleToggleRowSelection(uniqueId)}
                  >
                    <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                       <input 
                         type="checkbox" 
                         checked={isSelected}
                         onChange={() => handleToggleRowSelection(uniqueId)}
                         className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                       />
                    </td>
                    <td className="p-4 border-e border-slate-100">
                      <div>{t.school}</div>
                      <div className="text-sm text-slate-500">{t.branch}</div>
                    </td>
                    <td className="p-4 border-e border-slate-100 font-bold">{t.teacherName}</td>
                    <td className="p-4 border-e border-slate-100 text-center">{t.formCount}</td>
                    <td className="p-4 border-e border-slate-100">
                      <div className="text-sm"><span className="text-slate-500">استلام:</span> {t.receiveDateStr}</div>
                      <div className="text-sm"><span className="text-slate-500">تسليم:</span> {t.deliveryDateStr}</div>
                    </td>
                    <td className="p-4 border-e border-slate-100">
                      <div>{t.grade}</div>
                      <div className="text-sm text-slate-500">{t.section}</div>
                    </td>
                    <td className="p-4 border-e border-slate-100 font-bold text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs ${
                        t.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                        t.status === 'not_delivered' ? 'bg-red-100 text-red-700' :
                        t.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t.status === 'delivered' ? 'تم التسليم' : t.status === 'not_delivered' ? 'لم يتم التسليم' : t.status === 'in_progress' ? 'قيد المتابعة' : 'لم يحدد'}
                      </span>
                    </td>
                    <td className="p-4 border-e border-slate-100">{t.actionTaken}</td>
                    <td className="p-4 whitespace-normal min-w-[150px] border-e border-slate-100">{t.notes}</td>
                    <td className="p-4 text-center">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           const uri = generateWhatsAppMessage([t]);
                           window.open(`https://wa.me/?text=${uri}`, '_blank');
                         }} 
                         className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                         title="إرسال عبر واتساب"
                       >
                         <MessageCircle size={18} />
                       </button>
                    </td>
                  </tr>
                );
              })}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">لا توجد نتائج مطابقة للفلترة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (showArchive) {
    return (
      <div className="space-y-6 font-arabic p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Archive className="text-orange-500" />
            الأرشيف
          </h2>
          <button onClick={() => { setShowArchive(false); setReportDate(today); setActiveReportId(null); setItems([]); }} className="btn-secondary">عودة ومسح إدخال جديد</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {existingReports.filter(t => t.userId === currentUser?.id || currentUser?.role === 'admin').sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(report => (
            <div key={report.id} className="bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm hover:border-blue-200 transition-colors">
               <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <Calendar size={18} />
                  {report.dateStr}
                </div>
                <div className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold">
                  {report.items.length} عنصر
                </div>
              </div>
              <h3 className="font-bold text-lg text-slate-800 truncate mb-1">{report.reportName}</h3>
              <p className="text-slate-600 font-medium mb-1 truncate">{report.supervisorName}</p>
              <p className="text-sm text-slate-500 mb-4 truncate">{report.school} - {report.branch}</p>
              <button 
                onClick={() => { 
                  setReportName(report.reportName);
                  setReportDate(report.dateStr); 
                  setActiveReportId(report.id); 
                  setItems(report.items); 
                  setShowArchive(false); 
                }} 
                className="w-full btn-primary py-2 text-sm"
              >
                فتح للتعديل
              </button>
            </div>
          ))}
          {existingReports.length === 0 && (
             <div className="col-span-full text-center text-slate-500 py-8 bg-white rounded-xl border border-dashed border-slate-300">
              لا يوجد أرشيف سابق
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-arabic max-w-7xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <button onClick={() => saveWork(items)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <Save size={20} />
          حفظ العمل (تلقائي)
        </button>
        <button onClick={() => setShowArchive(true)} className="flex items-center gap-2 px-6 py-3 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl font-bold hover:bg-orange-100 transition-colors">
          <Archive size={20} />
          الأرشيف
        </button>
        <button onClick={() => setShowFilter(true)} className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 transition-colors">
          <Filter size={20} />
          مؤشرات كشف الاستلام والتسليم
        </button>
        {onClose && (
          <button onClick={onClose} className="mr-auto btn-secondary bg-slate-100">
            العودة إلى التقارير الخاصة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        
        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Briefcase size={20} className="text-blue-500"/>
                بيانات المشرف
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">اسم المدرسة</label>
                <div className="font-bold text-slate-800 text-sm">{school || '--'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">الفرع</label>
                  <div className="font-bold text-slate-800 text-sm">{branch || '--'}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">العام الدراسي</label>
                  <div className="font-bold text-slate-800 text-sm">{academicYear || '--'}</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">اسم المشرف</label>
                <div className="font-bold text-slate-800 text-sm">{supervisorName}</div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">الوظيفة</label>
                <div className="font-bold text-slate-800 text-sm">{supervisorJob}</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-4">
              <FileText size={20} />
              الكشف الحالي
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 block mb-1 font-bold">اسم الكشف الجديد</label>
                <input type="text" value={reportName} onChange={e => setReportName(e.target.value)} className="input-field bg-white" placeholder="مثال: كشف استلام تحضير الدروس" />
              </div>
              <div>
                <label className="text-sm text-slate-600 block mb-1 font-bold">تاريخ الكشف</label>
                <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="input-field bg-white" />
              </div>
              <button onClick={() => {
                setActiveReportId(null);
                setReportName('');
                setReportDate(today);
                setItems([]); // Will rebuild
              }} className="w-full btn-primary bg-blue-600 mt-2">
                بدء كشف جديد تماماً
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          
          {/* Quick Entry Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 border-b border-slate-200 p-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <CheckCircle size={20} className="text-emerald-500"/>
                  الإدخال السريع وتطبيق الفلاتر
                </h3>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-1 space-y-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1">تطبيق على فرع</label>
                    <select value={applyBranch} onChange={e => setApplyBranch(e.target.value)} className="input-field">
                      <option value="الجميع">الجميع</option>
                      {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1">تطبيق على الصف</label>
                    <div className="max-h-24 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
                      {uniqueGrades.map(g => (
                        <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={applyGrades.includes(g)} onChange={e => {
                            if (e.target.checked) setApplyGrades([...applyGrades, g]);
                            else setApplyGrades(applyGrades.filter(x => x !== g));
                          }} className="w-4 h-4 rounded text-blue-600" />
                          <span>{g}</span>
                        </label>
                      ))}
                      {uniqueGrades.length === 0 && <span className="text-xs text-slate-500">لا توجد صفوف</span>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1">تطبيق على الشعبة</label>
                     <div className="max-h-24 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
                      {uniqueSections.map(s => (
                        <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={applySections.includes(s)} onChange={e => {
                            if (e.target.checked) setApplySections([...applySections, s]);
                            else setApplySections(applySections.filter(x => x !== s));
                          }} className="w-4 h-4 rounded text-blue-600" />
                          <span>{s}</span>
                        </label>
                      ))}
                      {uniqueSections.length === 0 && <span className="text-xs text-slate-500">لا توجد شعب</span>}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-sm font-bold text-slate-700 block mb-1">عدد النماذج</label>
                      <input type="number" value={applyFormCount} onChange={e => setApplyFormCount(e.target.value)} className="input-field" placeholder="10" />
                    </div>
                    <button onClick={() => applyToSelected('formCount', applyFormCount)} className="btn-secondary h-[42px] px-3">تطبيق</button>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-sm font-bold text-slate-700 block mb-1">تاريخ الاستلام</label>
                      <input type="date" value={applyReceiveDate} onChange={e => setApplyReceiveDate(e.target.value)} className="input-field" />
                    </div>
                    <button onClick={() => applyToSelected('receiveDateStr', applyReceiveDate)} className="btn-secondary h-[42px] px-3">تطبيق</button>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-sm font-bold text-slate-700 block mb-1">تاريخ التسليم</label>
                      <input type="date" value={applyDeliveryDate} onChange={e => setApplyDeliveryDate(e.target.value)} className="input-field" />
                    </div>
                    <button onClick={() => applyToSelected('deliveryDateStr', applyDeliveryDate)} className="btn-secondary h-[42px] px-3">تطبيق</button>
                  </div>
                  <div className="flex flex-col gap-2">
                     <label className="text-sm font-bold text-slate-700 block">حالة التنفيذ</label>
                     <div className="flex items-center gap-2">
                      <select value={applyStatus} onChange={e => setApplyStatus(e.target.value as any)} className="input-field flex-1">
                        <option value="delivered">تم التسليم</option>
                        <option value="in_progress">قيد المتابعة</option>
                        <option value="not_delivered">لم يتم التسليم</option>
                      </select>
                      <button onClick={() => applyToSelected('status', applyStatus)} className="btn-secondary h-[42px] px-3">تطبيق</button>
                     </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-2">
                       <label className="text-sm font-bold text-slate-700 block">الإجراء المتخذ (لمن لم يسلم)</label>
                       <div className="flex items-center gap-2">
                        <select value={applyAction} onChange={e => setApplyAction(e.target.value)} className="input-field flex-1">
                          <option value="">بدون إجراء</option>
                          <option value="تنبيه شفوي">تنبيه شفوي</option>
                          <option value="تعهد خطي">تعهد خطي</option>
                          <option value="إنذار أخير">إنذار أخير</option>
                          <option value="خصم قسط">خصم قسط</option>
                          <option value="الرفع إلى الإدارة العليا">الرفع إلى الإدارة العليا</option>
                        </select>
                        <button onClick={() => applyToSelected('actionTaken', applyAction, (item) => item.status === 'not_delivered')} className="btn-secondary h-[42px] px-3 whitespace-nowrap text-xs">تطبيق على (لم يسلم)</button>
                       </div>
                     </div>
                     <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-700 block">ملاحظات عامة</label>
                        <div className="flex items-center gap-2">
                          <input type="text" value={applyNotes} onChange={e => setApplyNotes(e.target.value)} className="input-field flex-1" placeholder="اكتب الملاحظة..." />
                          <button onClick={() => applyToSelected('notes', applyNotes)} className="btn-secondary h-[42px] px-3">تعميم على الجميع</button>
                        </div>
                     </div>
                  </div>
                </div>

             </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
             <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="p-3 w-10 text-center font-bold">#</th>
                    <th className="p-3 font-bold min-w-[120px]">المدرسة والفرع</th>
                    <th className="p-3 font-bold min-w-[150px]">اسم المعلم</th>
                    <th className="p-3 font-bold w-24">عدد النماذج</th>
                    <th className="p-3 font-bold min-w-[120px]">تاريخ الاستلام</th>
                    <th className="p-3 font-bold min-w-[120px]">تاريخ التسليم</th>
                    <th className="p-3 font-bold min-w-[120px]">الصف والشعبة</th>
                    <th className="p-3 font-bold min-w-[140px]">حالة التنفيذ</th>
                    <th className="p-3 font-bold min-w-[140px]">الإجراء المتخذ</th>
                    <th className="p-3 font-bold min-w-[150px]">ملاحظات</th>
                    <th className="p-3 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{item.school}</div>
                        <div className="text-xs text-slate-500">{item.branch}</div>
                      </td>
                      <td className="p-3 font-bold text-blue-700">{item.teacherName}</td>
                      <td className="p-3 text-center">
                        <input type="text" value={item.formCount} onChange={e => updateItem(item.id, { formCount: e.target.value })} className="w-full text-center border border-slate-200 rounded p-1" />
                      </td>
                      <td className="p-3 text-center">
                        <input type="date" value={item.receiveDateStr} onChange={e => updateItem(item.id, { receiveDateStr: e.target.value })} className="w-full text-sm border border-slate-200 rounded p-1" />
                      </td>
                      <td className="p-3 text-center">
                        <input type="date" value={item.deliveryDateStr} onChange={e => updateItem(item.id, { deliveryDateStr: e.target.value })} className="w-full text-sm border border-slate-200 rounded p-1" />
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium">{item.grade}</div>
                        <div className="text-xs text-slate-500">{item.section}</div>
                      </td>
                      <td className="p-3">
                        <select value={item.status || ''} onChange={e => updateItem(item.id, { status: e.target.value as any })} className={`w-full text-sm border border-slate-200 rounded p-1.5 focus:ring-1 outline-none ${
                           item.status === 'delivered' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                           item.status === 'not_delivered' ? 'bg-red-50 text-red-800 border-red-200' :
                           item.status === 'in_progress' ? 'bg-amber-50 text-amber-800 border-amber-200' : ''
                        }`}>
                          <option value="" disabled>اختر...</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="in_progress">قيد المتابعة</option>
                          <option value="not_delivered">لم يتم التسليم</option>
                        </select>
                      </td>
                      <td className="p-3">
                         <select value={item.actionTaken || ''} onChange={e => updateItem(item.id, { actionTaken: e.target.value as any })} className="w-full text-sm border border-slate-200 rounded p-1.5 focus:ring-1 outline-none text-slate-700">
                          <option value="">بدون إجراء</option>
                          <option value="تنبيه شفوي">تنبيه شفوي</option>
                          <option value="تعهد خطي">تعهد خطي</option>
                          <option value="إنذار أخير">إنذار أخير</option>
                          <option value="خصم قسط">خصم قسط</option>
                          <option value="الرفع إلى الإدارة العليا">الرفع إلى الإدارة العليا</option>
                        </select>
                      </td>
                      <td className="p-3">
                         <input type="text" value={item.notes} onChange={e => updateItem(item.id, { notes: e.target.value })} className="w-full border border-slate-200 rounded p-1" placeholder="ملاحظات..." />
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => {
                          const newItems = items.filter(x => x.id !== item.id);
                          setItems(newItems);
                          saveWork(newItems, true);
                        }} className="text-red-400 hover:text-red-600 transition-colors p-1">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-500">لم يتم العثور على معلمين متاحين. قد تحتاج إلى إضافة موظفين في შؤون الموظفين.</td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>

        </div>

      </div>

      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Filter className="text-blue-500" />
                مؤشرات الاستلام والتسليم
              </h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 block mb-2 font-bold">من تاريخ</label>
                  <input type="date" className="input-field" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-2 font-bold">إلى تاريخ</label>
                  <input type="date" className="input-field" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 block mb-2 font-bold">أسماء الكشوفات المحفوظة</label>
                <div className="max-h-32 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
                   {existingReports.map(r => (
                     <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={filterSelectedReports.includes(r.id)} onChange={e => {
                          if (e.target.checked) setFilterSelectedReports([...filterSelectedReports, r.id]);
                          else setFilterSelectedReports(filterSelectedReports.filter(id => id !== r.id));
                        }} className="w-4 h-4 rounded text-blue-600" />
                        <span className="text-sm">{r.reportName} - {r.dateStr}</span>
                     </label>
                   ))}
                   {existingReports.length === 0 && <div className="text-sm text-slate-500">لا توجد كشوفات</div>}
                </div>
              </div>

              <div>
                 <label className="text-sm text-slate-600 block mb-2 font-bold">حالة التنفيذ</label>
                 <div className="flex flex-wrap gap-3">
                   <label className="flex items-center gap-2">
                     <input type="checkbox" checked={filterSelectedStatus.includes('delivered')} onChange={e => {
                       if(e.target.checked) setFilterSelectedStatus([...filterSelectedStatus, 'delivered']);
                       else setFilterSelectedStatus(filterSelectedStatus.filter(x => x !== 'delivered'));
                     }} className="w-4 h-4 rounded text-emerald-600" />
                     <span className="text-sm text-emerald-800">تم التسليم</span>
                   </label>
                   <label className="flex items-center gap-2">
                     <input type="checkbox" checked={filterSelectedStatus.includes('in_progress')} onChange={e => {
                       if(e.target.checked) setFilterSelectedStatus([...filterSelectedStatus, 'in_progress']);
                       else setFilterSelectedStatus(filterSelectedStatus.filter(x => x !== 'in_progress'));
                     }} className="w-4 h-4 rounded text-amber-600" />
                     <span className="text-sm text-amber-800">قيد المتابعة</span>
                   </label>
                   <label className="flex items-center gap-2">
                     <input type="checkbox" checked={filterSelectedStatus.includes('not_delivered')} onChange={e => {
                       if(e.target.checked) setFilterSelectedStatus([...filterSelectedStatus, 'not_delivered']);
                       else setFilterSelectedStatus(filterSelectedStatus.filter(x => x !== 'not_delivered'));
                     }} className="w-4 h-4 rounded text-red-600" />
                     <span className="text-sm text-red-800">لم يتم التسليم</span>
                   </label>
                 </div>
              </div>

               <div>
                 <label className="text-sm text-slate-600 block mb-2 font-bold">الإجراء المتخذ</label>
                 <div className="flex flex-wrap gap-3">
                   {['تنبيه شفوي', 'تعهد خطي', 'إنذار أخير', 'خصم قسط', 'الرفع إلى الإدارة العليا'].map(act => (
                      <label key={act} className="flex items-center gap-2">
                       <input type="checkbox" checked={filterSelectedActions.includes(act)} onChange={e => {
                         if(e.target.checked) setFilterSelectedActions([...filterSelectedActions, act]);
                         else setFilterSelectedActions(filterSelectedActions.filter(x => x !== act));
                       }} className="w-4 h-4 rounded text-blue-600" />
                       <span className="text-sm">{act}</span>
                     </label>
                   ))}
                 </div>
              </div>

            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={handleApplyFilter} className="flex-1 btn-primary py-3">موافق (عرض النتائج)</button>
              <button onClick={() => setShowFilter(false)} className="flex-1 btn-secondary py-3">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
