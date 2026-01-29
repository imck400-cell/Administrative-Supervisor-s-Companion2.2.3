
import React, { useState, useMemo, useRef } from 'react';
import { useGlobal } from '../context/GlobalState';
import { 
  Plus, Trash2, CheckCircle, FileText, FileSpreadsheet, Share2, 
  Table as TableIcon, Users, Calendar, Filter, X, 
  Download, Upload, Search, UserCheck, LayoutDashboard,
  History, CalendarDays, Archive, FilePlus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TimetableEntry, SubstitutionEntry } from '../types';

const SubstitutionPage: React.FC = () => {
  const { lang, data, updateData } = useGlobal();
  const [activeTab, setActiveTab] = useState<'coverage' | 'timetable'>('coverage');

  // START OF CHANGE - Coverage State Management
  const [selectedCoverageDate, setSelectedCoverageDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCoverageArchive, setShowCoverageArchive] = useState(false);
  // END OF CHANGE

  // --- Common Data ---
  const daysAr = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const periodsAr = ["الصفرية", "الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة"];
  const periodsKeys = ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"];

  const teacherList = useMemo(() => {
    const names = new Set<string>();
    data.dailyReports.forEach(report => {
      report.teachersData.forEach(t => {
        if (t.teacherName) names.add(t.teacherName);
      });
    });
    (data.timetable || []).forEach(t => {
      if (t.teacherName) names.add(t.teacherName);
    });
    return Array.from(names);
  }, [data.dailyReports, data.timetable]);

  // START OF CHANGE - Filtering Logic
  const filteredSubstitutions = useMemo(() => {
    return (data.substitutions || []).filter(s => s.date === selectedCoverageDate);
  }, [data.substitutions, selectedCoverageDate]);

  const uniqueCoverageDates = useMemo(() => {
    const dates = (data.substitutions || []).map(s => s.date);
    // Fix: Cast a and b to string as they are inferred as unknown
    return Array.from(new Set(dates)).sort((a: any, b: any) => b.localeCompare(a));
  }, [data.substitutions]);
  // END OF CHANGE

  // --- Timetable Logic ---
  const [highlightRow, setHighlightRow] = useState<string | null>(null);
  const [highlightDayPeriod, setHighlightDayPeriod] = useState<string | null>(null); // e.g. "الأحد-p2"
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  const [individualFilter, setIndividualFilter] = useState({
    teacher: '',
    day: '',
    gradeSection: '',
    period: ''
  });

  const handleAddTimetableRow = () => {
    const newEntry: TimetableEntry = {
      id: Date.now().toString(),
      teacherName: '',
      subject: '',
      days: daysAr.reduce((acc, day) => ({
        ...acc,
        [day]: periodsKeys.reduce((pAcc, p) => ({ ...pAcc, [p]: '' }), {})
      }), {}),
      notes: ''
    };
    updateData({ timetable: [...(data.timetable || []), newEntry] });
  };

  const updateTimetableField = (id: string, path: string[], value: string) => {
    const newList = (data.timetable || []).map(t => {
      if (t.id === id) {
        const updated = { ...t };
        let current: any = updated;
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        return updated;
      }
      return t;
    });
    updateData({ timetable: newList });
  };

  const handleTimetableImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isMerge = confirm(lang === 'ar' ? 'اضغط "موافق" للإضافة للبيانات الحالية، أو "إلغاء" للمسح والبدء من جديد' : 'OK to merge, Cancel to replace');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const importedData = XLSX.utils.sheet_to_json(ws);
      
      const newEntries: TimetableEntry[] = importedData.map((row: any) => {
        const teacherName = row['اسم المعلم'] || '';
        const subject = row['المادة'] || '';
        const notes = row['ملاحظات'] || '';
        
        const daysMap: any = {};
        daysAr.forEach(day => {
          daysMap[day] = {};
          periodsAr.forEach((pName, pIdx) => {
            const key = `p${pIdx}`;
            daysMap[day][key] = row[`${day} - ${pName}`] || '';
          });
        });

        return {
          id: Date.now().toString() + Math.random(),
          teacherName, subject, notes, days: daysMap
        };
      });

      updateData({ timetable: isMerge ? [...(data.timetable || []), ...newEntries] : newEntries });
    };
    reader.readAsBinaryString(file);
  };

  const timetableFiltered = useMemo(() => {
    return (data.timetable || []).filter(t => true);
  }, [data.timetable]);

  const individualTimetableResult = useMemo(() => {
    if (!showIndividualModal) return [];
    return (data.timetable || []).filter(t => {
      if (individualFilter.teacher && !t.teacherName.includes(individualFilter.teacher)) return false;
      return true;
    }).map(t => ({ ...t }));
  }, [data.timetable, individualFilter, showIndividualModal]);

  const generateTimetableReport = (list: TimetableEntry[]) => {
    let text = `*📋 جدول الحصص المدرسي*\n`;
    text += `*المدرسة:* ${data.profile.schoolName || '---'}\n`;
    text += `*التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n`;
    text += `----------------------------------\n\n`;

    list.forEach((t, i) => {
      text += `*👤 (${i+1}) المعلم:* ${t.teacherName}\n`;
      text += `📚 *المادة:* ${t.subject}\n`;
      daysAr.forEach(day => {
        const dayPeriods = t.days[day];
        const active = Object.entries(dayPeriods).filter(([_, val]) => val !== '');
        if (active.length > 0) {
          text += `📅 *${day}:*\n`;
          active.forEach(([pKey, val]) => {
            const pName = periodsAr[parseInt(pKey.replace('p',''))];
            text += `   🔹 ${pName}: ${val}\n`;
          });
        }
      });
      if (t.notes) text += `📝 *ملاحظات:* ${t.notes}\n`;
      text += `----------------------------------\n`;
    });
    text += `\n*إعداد رفيق المشرف الإداري - إبراهيم دخان*`;
    return text;
  };

  // --- Coverage Logic ---
  // START OF CHANGE - Using selectedCoverageDate
  const handleAddRow = () => {
    const newEntry = {
      id: Date.now().toString(),
      absentTeacher: '',
      replacementTeacher: '',
      period: '',
      class: '',
      date: selectedCoverageDate,
      paymentStatus: 'pending',
      p1: '', p2: '', p3: '', p4: '', p5: '', p6: '', p7: '',
      signature: ''
    };
    updateData({ substitutions: [...data.substitutions, newEntry as any] });
  };
  // END OF CHANGE

  const updateEntry = (id: string, field: string, value: string) => {
    const newList = data.substitutions.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    );
    updateData({ substitutions: newList });
  };

  const getFreeTeachers = (dateStr: string, periodKey: string) => {
    const dayName = getDayName(dateStr);
    const timetable = data.timetable || [];
    return teacherList.filter(name => {
      const entry = timetable.find(t => t.teacherName === name);
      if (!entry) return true;
      return !entry.days[dayName]?.[periodKey];
    });
  };

  const handleDelete = (id: string) => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) {
      updateData({ substitutions: data.substitutions.filter(s => s.id !== id) });
    }
  };

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date(dateStr));
    } catch { return ''; }
  };

  const sendWhatsApp = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 font-arabic text-right pb-20">
      {/* Tab Switcher */}
      <div className="flex gap-4 p-2 bg-white rounded-2xl border shadow-sm w-fit mx-auto">
         <button 
           onClick={() => setActiveTab('coverage')}
           className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'coverage' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
         >
           <UserCheck size={20}/> تغطية الحصص
         </button>
         <button 
           onClick={() => setActiveTab('timetable')}
           className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'timetable' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
         >
           <TableIcon size={20}/> جدول الحصص
         </button>
      </div>

      {activeTab === 'coverage' ? (
        <div className="space-y-4 animate-in fade-in duration-500">
          {/* START OF CHANGE - Enhanced Coverage Header Controls */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border flex flex-wrap justify-between items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-800">تغطية الحصص (الاحتياط)</h2>
                <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black border border-blue-100 flex items-center gap-2">
                  <Calendar size={14} />
                  {selectedCoverageDate} | {getDayName(selectedCoverageDate)}
                </div>
              </div>
              <p className="text-slate-400 font-bold text-xs mt-1">إدارة غياب المعلمين وتكليف البدلاء اليومي</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Report Controls */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border">
                <button 
                  onClick={() => setSelectedCoverageDate(new Date().toISOString().split('T')[0])}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-50 transition-all shadow-sm"
                >
                  <FilePlus size={16} /> إضافة جدول اليوم
                </button>
                
                <div className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl">
                  <CalendarDays size={16} className="text-slate-400" />
                  <input 
                    type="date" 
                    value={selectedCoverageDate} 
                    onChange={(e) => setSelectedCoverageDate(e.target.value)}
                    className="text-xs font-black outline-none bg-transparent cursor-pointer"
                  />
                </div>

                <button 
                  onClick={() => setShowCoverageArchive(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black hover:bg-black transition-all shadow-md"
                >
                  <Archive size={16} /> تقارير التغطية السابقة
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border">
                <button onClick={() => {
                  const text = filteredSubstitutions.reduce((acc, row: any, i) => {
                    let r = `الغائب: ${row.absentTeacher || '---'}\n`;
                    [1,2,3,4,5,6,7].forEach(n => r += `ح${n}: ${row[`p${n}`] || '---'}\n`);
                    return acc + `🔹 البند ${i+1}:\n${r}\n`;
                  }, `*📋 تقرير التغطية - ${selectedCoverageDate}*\n`);
                  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `Coverage_${selectedCoverageDate}.txt`;
                  link.click();
                }} className="p-2.5 hover:bg-white text-slate-600 rounded-lg transition-all" title="TXT Export"><FileText size={18} /></button>
                <button onClick={() => {
                   const ws = XLSX.utils.json_to_sheet(filteredSubstitutions);
                   const wb = XLSX.utils.book_new();
                   XLSX.utils.book_append_sheet(wb, ws, "Coverage");
                   XLSX.writeFile(wb, `Coverage_${selectedCoverageDate}.xlsx`);
                }} className="p-2.5 hover:bg-white text-green-600 rounded-lg transition-all" title="Excel Export"><FileSpreadsheet size={18} /></button>
                <button onClick={() => {
                  let text = `*📋 جدول تغطية الحصص*\n*التاريخ:* ${selectedCoverageDate} (${getDayName(selectedCoverageDate)})\n------------------\n`;
                  filteredSubstitutions.forEach((row: any, i) => {
                    text += `*⚠️ الغائب (${i + 1}): ${row.absentTeacher || '---'}*\n`;
                    for (let n = 1; n <= 7; n++) {
                      if (row[`p${n}`]) text += `🔹 ح${n}: ${row[`p${n}`]} ✅\n`;
                    }
                    text += `------------------\n`;
                  });
                  text += `\n*رفيق المشرف الإداري - إبراهيم دخان*`;
                  sendWhatsApp(text);
                }} className="p-2.5 hover:bg-white text-green-500 rounded-lg transition-all" title="WhatsApp Share"><Share2 size={18} /></button>
              </div>

              <button 
                onClick={handleAddRow}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 active:scale-95 transition-all"
              >
                <Plus size={20} /> إضافة بند غياب
              </button>
            </div>
          </div>
          {/* END OF CHANGE */}

          <div className="bg-white rounded-[2.5rem] shadow-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-b-2 border-slate-300 h-14">
                    <th rowSpan={2} className="border-e border-slate-300 p-2 w-12 sticky right-0 bg-slate-100 z-10">م</th>
                    <th rowSpan={2} className="border-e border-slate-300 p-2 w-48 sticky right-12 bg-slate-100 z-10">المعلم الغائب</th>
                    <th className="border-e border-slate-300 p-2 w-32">الحصة</th>
                    {[1, 2, 3, 4, 5, 6, 7].map(n => <th key={n} className="border-e border-slate-300 p-2">{n}</th>)}
                    <th rowSpan={2} className="p-2 w-12"></th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b-2 border-slate-300 text-[10px]">
                    <th className="border-e border-slate-300 p-1">البديل / التوقيع</th>
                    <th colSpan={7} className="border-e border-slate-300 p-1">تغطية الحصص الدراسية (الاحتياط)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubstitutions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-20 text-slate-300 italic text-lg font-bold">لا توجد سجلات تغطية لهذا التاريخ ({selectedCoverageDate}).</td>
                    </tr>
                  ) : (
                    filteredSubstitutions.map((row: any, idx) => (
                      <React.Fragment key={row.id}>
                        <tr className="border-b border-slate-200 h-14 hover:bg-slate-50/50 transition-colors">
                          <td rowSpan={2} className="border-e border-slate-300 font-black bg-slate-50 sticky right-0 z-10">{idx + 1}</td>
                          <td rowSpan={2} className="border-e border-slate-300 p-0 bg-[#FFF2CC]/50 sticky right-12 z-10">
                            <input 
                              list={`teachers-abs-${row.id}`}
                              className="w-full p-3 bg-transparent text-center font-black outline-none border-none focus:bg-white"
                              placeholder="اسم الغائب..."
                              value={row.absentTeacher}
                              onChange={(e) => updateEntry(row.id, 'absentTeacher', e.target.value)}
                            />
                            <datalist id={`teachers-abs-${row.id}`}>
                              {teacherList.map(name => <option key={name} value={name} />)}
                            </datalist>
                          </td>
                          <td className="border-e border-slate-300 p-2 bg-slate-50 font-black text-[10px]">البديل المكلف</td>
                          {[1, 2, 3, 4, 5, 6, 7].map(num => {
                            const freeTeachers = getFreeTeachers(row.date, `p${num}`);
                            return (
                              <td key={num} className="border-e border-slate-300 p-0 bg-[#E2EFDA]/20">
                                <input 
                                  list={`free-teachers-p${num}-${row.id}`}
                                  className="w-full p-2 text-center text-xs font-bold outline-none bg-transparent focus:bg-white"
                                  value={row[`p${num}`] || ''}
                                  onChange={(e) => updateEntry(row.id, `p${num}`, e.target.value)}
                                  placeholder="---"
                                />
                                <datalist id={`free-teachers-p${num}-${row.id}`}>
                                  {freeTeachers.map(name => <option key={name} value={name} />)}
                                </datalist>
                              </td>
                            );
                          })}
                          <td rowSpan={2} className="p-2">
                            <button onClick={() => handleDelete(row.id)} className="text-red-300 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-red-50">
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                        <tr className="border-b-2 border-slate-300 h-10">
                          <td className="border-e border-slate-300 p-2 bg-slate-50 font-black text-[10px]">التوقيع البصمة</td>
                          {[1, 2, 3, 4, 5, 6, 7].map(num => (
                            <td key={`sig-${num}`} className="border-e border-slate-300 p-1 bg-white">
                              {row[`sig${num}`] === 'تمت الموافقة' ? (
                                <div className="text-green-600 font-black text-[9px] flex items-center justify-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> تم الاعتماد
                                </div>
                              ) : (
                                <button 
                                  onClick={() => updateEntry(row.id, `sig${num}`, 'تمت الموافقة')}
                                  className="text-[9px] bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 font-black text-slate-500 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                  توقيع
                                </button>
                              )}
                            </td>
                          ))}
                        </tr>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in zoom-in duration-500">
          {/* Timetable Header */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border flex flex-wrap justify-between items-center gap-6">
             <div className="flex-1">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                   <TableIcon className="text-emerald-600"/> جدول الحصص العام
                </h2>
                <p className="text-slate-400 font-bold text-xs mt-1">تخطيط النصاب الأسبوعي لكادر المدرسة</p>
             </div>
             
             <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => setShowIndividualModal(true)}
                  className="bg-slate-800 text-white px-6 py-2.5 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 hover:bg-black active:scale-95 transition-all"
                >
                  <Users size={18}/> جدول فردي
                </button>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border">
                   <label className="p-2.5 hover:bg-white text-blue-600 rounded-lg transition-all cursor-pointer" title="استيراد">
                      <Upload size={18}/>
                      <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleTimetableImport} />
                   </label>
                   <button onClick={() => {
                      const text = generateTimetableReport(timetableFiltered);
                      const blob = new Blob([text.replace(/\*/g,'')], { type: 'text/plain;charset=utf-8' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `Timetable_${Date.now()}.txt`;
                      link.click();
                   }} className="p-2.5 hover:bg-white text-slate-600 rounded-lg transition-all" title="تصدير TXT"><FileText size={18}/></button>
                   <button onClick={() => {
                      const rows: any[] = [];
                      timetableFiltered.forEach(t => {
                        const row: any = { 'اسم المعلم': t.teacherName, 'المادة': t.subject, 'ملاحظات': t.notes };
                        daysAr.forEach(day => periodsAr.forEach((pName, i) => row[`${day} - ${pName}`] = t.days[day][`p${i}`]));
                        rows.push(row);
                      });
                      const ws = XLSX.utils.json_to_sheet(rows);
                      const workbook = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(workbook, ws, "Timetable");
                      XLSX.writeFile(workbook, `Timetable_${Date.now()}.xlsx`);
                   }} className="p-2.5 hover:bg-white text-green-700 rounded-lg transition-all" title="تصدير Excel"><FileSpreadsheet size={18}/></button>
                   <button onClick={() => sendWhatsApp(generateTimetableReport(timetableFiltered))} className="p-2.5 hover:bg-white text-green-500 rounded-lg transition-all" title="إرسال للواتساب"><Share2 size={18}/></button>
                </div>

                <button 
                  onClick={handleAddTimetableRow}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <Plus size={20}/> إضافة معلم
                </button>
             </div>
          </div>

          {/* Timetable Grid */}
          <div className="bg-white rounded-[2.5rem] shadow-xl border overflow-hidden relative">
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] scroll-smooth">
              <table className="w-full border-collapse text-center table-fixed min-w-[2000px]">
                <thead className="sticky top-0 z-40 bg-white">
                  <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300 h-14">
                    <th rowSpan={2} className="w-12 border-e border-slate-300 sticky right-0 bg-slate-100 z-50">م</th>
                    <th rowSpan={2} className="w-64 border-e border-slate-300 sticky right-12 bg-slate-100 z-50">اسم المعلم</th>
                    <th rowSpan={2} className="w-40 border-e border-slate-300 sticky right-[304px] bg-slate-100 z-50">المادة</th>
                    {daysAr.map(day => (
                      <th key={day} colSpan={8} className="border-e border-slate-300 bg-slate-100 py-2">
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <Calendar size={14} className="text-emerald-600"/> {day}
                        </div>
                      </th>
                    ))}
                    <th rowSpan={2} className="w-64">ملاحظات</th>
                    <th rowSpan={2} className="w-16"></th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-500 font-black border-b-2 border-slate-300 text-[10px] h-10">
                    {daysAr.map(day => (
                      <React.Fragment key={day}>
                        {periodsAr.map((p, i) => (
                          <th 
                            key={`${day}-p${i}`} 
                            className={`border-e border-slate-200 w-24 cursor-pointer hover:bg-orange-100 transition-colors ${highlightDayPeriod === `${day}-p${i}` ? 'bg-orange-200 text-orange-800' : ''}`}
                            onClick={() => setHighlightDayPeriod(prev => prev === `${day}-p${i}` ? null : `${day}-p${i}`)}
                          >
                            {p}
                          </th>
                        ))}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.timetable.length === 0 ? (
                    <tr><td colSpan={100} className="p-32 text-slate-300 italic font-black text-xl">يرجى إضافة بيانات لجدول الحصص...</td></tr>
                  ) : data.timetable.map((row, idx) => {
                    const isRowHighlighted = highlightRow === row.id;
                    return (
                      <tr 
                        key={row.id} 
                        className={`border-b border-slate-100 h-14 group transition-all ${isRowHighlighted ? 'bg-orange-50' : 'hover:bg-slate-50/50'}`}
                        onClick={() => setHighlightRow(prev => prev === row.id ? null : row.id)}
                      >
                        <td className={`font-black text-blue-600 sticky right-0 z-30 transition-colors ${isRowHighlighted ? 'bg-orange-100 border-e-orange-200' : 'bg-white border-e-slate-100 group-hover:bg-slate-50'}`}>{idx + 1}</td>
                        <td className={`p-1 sticky right-12 z-30 transition-colors ${isRowHighlighted ? 'bg-orange-100' : 'bg-white group-hover:bg-slate-50'}`}>
                           <input 
                              list={`teacher-list-${row.id}`}
                              className="w-full p-2 bg-transparent text-right font-black outline-none border-none text-xs" 
                              value={row.teacherName} 
                              onChange={e => updateTimetableField(row.id, ['teacherName'], e.target.value)}
                              placeholder="..."
                           />
                           <datalist id={`teacher-list-${row.id}`}>{teacherList.map(n => <option key={n} value={n}/>)}</datalist>
                        </td>
                        <td className={`p-1 sticky right-[304px] z-30 transition-colors border-e border-slate-200 ${isRowHighlighted ? 'bg-orange-100' : 'bg-white group-hover:bg-slate-50'}`}>
                           <input className="w-full p-2 bg-transparent text-right font-bold outline-none border-none text-xs text-emerald-700" value={row.subject} onChange={e => updateTimetableField(row.id, ['subject'], e.target.value)} placeholder="..." />
                        </td>
                        {daysAr.map(day => (
                          <React.Fragment key={day}>
                            {periodsKeys.map(pKey => {
                              const isColHighlighted = highlightDayPeriod === `${day}-${pKey}`;
                              return (
                                <td 
                                  key={pKey} 
                                  className={`p-0 border-e border-slate-100 transition-colors ${isColHighlighted ? 'bg-orange-100' : ''}`}
                                >
                                  <input 
                                    className="w-full h-full p-2 text-center text-[11px] font-black outline-none bg-transparent focus:bg-white" 
                                    value={row.days[day][pKey] || ''} 
                                    onChange={e => updateTimetableField(row.id, ['days', day, pKey], e.target.value)}
                                    placeholder="-"
                                  />
                                </td>
                              );
                            })}
                          </React.Fragment>
                        ))}
                        <td className="p-1"><input className="w-full p-2 text-right text-[10px] outline-none bg-transparent" value={row.notes} onChange={e => updateTimetableField(row.id, ['notes'], e.target.value)} placeholder="..." /></td>
                        <td className="p-1">
                           <button onClick={(e) => { e.stopPropagation(); updateData({ timetable: data.timetable.filter(x => x.id !== row.id) }); }} className="text-red-200 hover:text-red-600 transition-colors p-2 rounded-xl"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* START OF CHANGE - Coverage Archive Modal */}
      {showCoverageArchive && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border-4 border-slate-100">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shadow-lg">
              <h3 className="text-xl font-black flex items-center gap-3"><Archive size={24}/> تقارير التغطية السابقة</h3>
              <button onClick={() => setShowCoverageArchive(false)} className="hover:bg-slate-800 p-2 rounded-full transition-all"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {uniqueCoverageDates.length === 0 ? (
                <p className="text-center text-slate-400 font-bold py-10">لا توجد تقارير سابقة حالياً</p>
              ) : (
                uniqueCoverageDates.map(date => (
                  <button 
                    key={date}
                    onClick={() => {
                      setSelectedCoverageDate(date);
                      setShowCoverageArchive(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${selectedCoverageDate === date ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200 bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${selectedCoverageDate === date ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 group-hover:text-blue-500'}`}>
                        <Calendar size={18} />
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-800 text-sm">{date}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{getDayName(date)}</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-blue-600 bg-white px-3 py-1 rounded-full shadow-sm">
                      {data.substitutions.filter(s => s.date === date).length} بنود
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-center">
              <button onClick={() => setShowCoverageArchive(false)} className="px-10 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all">إغلاق</button>
            </div>
          </div>
        </div>
      )}
      {/* END OF CHANGE */}

      {/* Individual Timetable Filter Modal */}
      {showIndividualModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-slate-100">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center shadow-lg">
                 <h3 className="text-2xl font-black flex items-center gap-3"><Users size={28}/> الفلترة والجدول الفردي</h3>
                 <button onClick={() => setShowIndividualModal(false)} className="hover:bg-slate-800 p-2 rounded-full transition-all"><X size={24}/></button>
              </div>
              
              <div className="p-8 space-y-8 overflow-y-auto">
                 {/* Filters Window */}
                 <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 mr-2">اسم المعلم</label>
                       <div className="relative">
                          <input 
                            className="w-full p-4 rounded-2xl border-2 outline-none focus:border-blue-500 font-black text-sm pr-10" 
                            placeholder="اكتب اسم المعلم..."
                            value={individualFilter.teacher}
                            onChange={e => setIndividualFilter({...individualFilter, teacher: e.target.value})}
                          />
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 mr-2">اليوم</label>
                       <select className="w-full p-4 rounded-2xl border-2 outline-none focus:border-blue-500 font-black text-sm bg-white" value={individualFilter.day} onChange={e => setIndividualFilter({...individualFilter, day: e.target.value})}>
                          <option value="">كل الأيام</option>
                          {daysAr.map(d => <option key={d} value={d}>{d}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 mr-2">الصف والشعبة</label>
                       <input className="w-full p-4 rounded-2xl border-2 outline-none focus:border-blue-500 font-black text-sm" placeholder="مثال: 9-أ" value={individualFilter.gradeSection} onChange={e => setIndividualFilter({...individualFilter, gradeSection: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 mr-2">الحصة</label>
                       <select className="w-full p-4 rounded-2xl border-2 outline-none focus:border-blue-500 font-black text-sm bg-white" value={individualFilter.period} onChange={e => setIndividualFilter({...individualFilter, period: e.target.value})}>
                          <option value="">كل الحصص</option>
                          {periodsAr.map((p, i) => <option key={i} value={`p${i}`}>{p}</option>)}
                       </select>
                    </div>
                 </div>

                 {/* Results Table */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <h4 className="font-black text-xl text-slate-800">نتائج الفلترة المخصصة</h4>
                       <div className="flex gap-2">
                          <button onClick={() => sendWhatsApp(generateTimetableReport(individualTimetableResult))} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-black text-xs hover:bg-green-100 transition-all shadow-sm"><Share2 size={16}/> إرسال المفلتر</button>
                          <button onClick={() => {}} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-100 transition-all shadow-sm"><FileSpreadsheet size={16}/> تصدير إكسل</button>
                       </div>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border-2 border-slate-100 shadow-xl bg-white">
                       <table className="w-full border-collapse text-center text-sm">
                          <thead className="bg-[#FFD966] text-slate-800 font-black border-b-2 border-slate-200">
                             <tr>
                                <th className="p-4 border-e border-slate-200">المعلم / المادة</th>
                                <th className="p-4 border-e border-slate-200">اليوم</th>
                                {periodsAr.map((p, i) => {
                                  if (individualFilter.period && individualFilter.period !== `p${i}`) return null;
                                  return <th key={i} className="p-4 border-e border-slate-200">{p}</th>;
                                })}
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-black">
                             {individualTimetableResult.length === 0 ? (
                                <tr><td colSpan={10} className="p-10 text-slate-300 italic">لا توجد نتائج مطابقة للفلتر...</td></tr>
                             ) : individualTimetableResult.map(t => {
                                return daysAr.map(day => {
                                   if (individualFilter.day && individualFilter.day !== day) return null;
                                   
                                   const dayData = t.days[day];
                                   if (individualFilter.gradeSection) {
                                      const hasGrade = Object.values(dayData).some(v => String(v).includes(individualFilter.gradeSection));
                                      if (!hasGrade) return null;
                                   }

                                   return (
                                     <tr key={`${t.id}-${day}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 border-e border-slate-100 bg-slate-50/50">
                                           <div className="text-slate-800">{t.teacherName}</div>
                                           <div className="text-[10px] text-emerald-600 font-bold">{t.subject}</div>
                                        </td>
                                        <td className="p-4 border-e border-slate-100 text-blue-600">{day}</td>
                                        {periodsKeys.map((pKey, i) => {
                                          if (individualFilter.period && individualFilter.period !== pKey) return null;
                                          
                                          const val = dayData[pKey];
                                          const isTargetGrade = individualFilter.gradeSection && String(val).includes(individualFilter.gradeSection);
                                          
                                          return (
                                            <td key={pKey} className={`p-4 border-e border-slate-100 ${isTargetGrade ? 'bg-orange-100 text-orange-800 scale-105 shadow-inner' : ''}`}>
                                               {val || '-'}
                                               {individualFilter.gradeSection && !individualFilter.teacher && val && (
                                                  <div className="text-[9px] text-slate-400 mt-1">{t.teacherName} | {t.subject}</div>
                                               )}
                                            </td>
                                          );
                                        })}
                                     </tr>
                                   );
                                });
                             })}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-slate-50 border-t flex justify-center">
                 <button onClick={() => setShowIndividualModal(false)} className="px-12 py-3 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95">تم وموافق</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SubstitutionPage;
