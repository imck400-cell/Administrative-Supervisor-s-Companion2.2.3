import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Filter, BarChart, Calendar, Download, Share2, AlertTriangle, CheckCircle2, Users, FileText, Activity, ShieldAlert, Award, TrendingUp, TrendingDown, BookOpen, Clock, HeartPulse, UserCheck, MessageSquare, Briefcase, GraduationCap } from 'lucide-react';
import { useGlobal } from '../context/GlobalState';
import * as XLSX from 'xlsx';

interface ComprehensiveIndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComprehensiveIndicatorsModal: React.FC<ComprehensiveIndicatorsModalProps> = ({ isOpen, onClose }) => {
  const { data, currentUser } = useGlobal();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  const schools = useMemo(() => {
    const isGeneralSupervisor = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
    if (isGeneralSupervisor) {
      return Array.from(new Set(data.users.flatMap(u => u.schools).filter(Boolean)));
    }
    return currentUser?.schools || [];
  }, [data.users, currentUser]);

  // Quick Stats Pulse
  const { staffAttendanceRate, parentEngagementRate, unresolvedHighRiskIssues, academicExcellence } = useMemo(() => {
    // These are mocked or calculated minimally just for the visuals for now.
    return {
       staffAttendanceRate: 94,
       parentEngagementRate: 82,
       unresolvedHighRiskIssues: 3, // Mocked value
       academicExcellence: 88
    };
  }, [data, dateRange, selectedSchool]);

  const handleExportExcel = async () => {
    // Basic structured data for Excel
    const summaryData = [
      ['التقرير الإداري الشامل'],
      [`الفترة: من ${dateRange.from || 'البداية'} إلى ${dateRange.to || 'اليوم'}`],
      [`الفرع/المدرسة: ${selectedSchool === 'all' ? 'الكل' : selectedSchool}`],
      [],
      ['مؤشرات النبض السريعة (Quick Stats Pulse)'],
      ['المؤشر', 'القيمة'],
      ['الاستقرار التشغيلي (حضور الكادر)', `${staffAttendanceRate}%`],
      ['الرضا والتفاعل (تجاوب أولياء الأمور)', `${parentEngagementRate}%`],
      ['الخطر المدرسي (مشكلات عالية الخطورة غير محلولة)', unresolvedHighRiskIssues],
      ['التميز الأكاديمي', `${academicExcellence}%`],
      [],
      ['المستوى الإداري والتشغيلي'],
      ['كفاءة التغطية (الاحتراق الوظيفي)', '85%'],
      ['معدل إنجاز المرافق', '72%']
    ];

    try {
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'نظام إدارة التعليم';
      workbook.lastModifiedBy = currentUser?.name || 'Admin';
      workbook.created = new Date();

      // Sheet 1: Summary (الملخص)
      const summarySheet = workbook.addWorksheet('Summary - ملخص إداري', { views: [{ rightToLeft: true }] });
      
      summarySheet.columns = [
        { header: 'المؤشر / التفاصيل', key: 'metric', width: 45 },
        { header: 'القيمة / النسبة', key: 'value', width: 20 },
      ];

      // Add titles
      summarySheet.addRow(['التقرير الإداري الشامل', '']).font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Deep Blue
      summarySheet.addRow([`الفترة: ${dateRange.from || 'البداية'} إلى ${dateRange.to || 'اليوم'}`, '']).font = { italic: true };
      summarySheet.addRow(['']);

      const pulseHeader = summarySheet.addRow(['مؤشرات النبض السريعة (Quick Stats Pulse)', '']);
      pulseHeader.font = { size: 14, bold: true };
      pulseHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

      const indicators = [
        ['الاستقرار التشغيلي (حضور الكادر)', staffAttendanceRate, true],
        ['الرضا والتفاعل (تجاوب أولياء الأمور)', parentEngagementRate, true],
        ['الخطر المدرسي (مشكلات عالية الخطورة غير محلولة)', unresolvedHighRiskIssues, false],
        ['التميز الأكاديمي', academicExcellence, true],
        [''],
        ['المستوى الإداري والتشغيلي', ''],
        ['كفاءة التغطية (الاحتراق الوظيفي)', 85, true],
        ['معدل إنجاز وإصلاح الأعطال', 72, true]
      ];

      indicators.forEach(ind => {
        const row = summarySheet.addRow([ind[0], ind[1]]);
        if (typeof ind[1] === 'number') {
           const isPercentage = ind[2];
           if (isPercentage) {
             row.getCell(2).numFmt = '0"%"';
             // Conditional format logic using font colors:
             const val = ind[1] as number;
             if (val < 50) {
               row.getCell(2).font = { color: { argb: 'FFEE0000' }, bold: true }; // Red
             } else if (val >= 90) {
               row.getCell(2).font = { color: { argb: 'FF00aa00' }, bold: true }; // Green
             }
           } else {
             // For issues, high is bad
             if ((ind[1] as number) > 0) {
               row.getCell(2).font = { color: { argb: 'FFEE0000' }, bold: true }; // Red
             }
           }
        } else if (ind[1] === '') {
           row.font = { bold: true };
           row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        }
      });

      // Sheet 2: Detailed Staff (تفاصيل الكوادر)
      const staffSheet = workbook.addWorksheet('تفاصيل الموظفين', { views: [{ rightToLeft: true }] });
      staffSheet.columns = [
        { header: 'القسم / الإدارة', key: 'dept', width: 30 },
        { header: 'المؤشر', key: 'indicator', width: 30 },
        { header: 'النسبة / الإنجاز', key: 'value', width: 20 },
      ];
      staffSheet.getRow(1).font = { bold: true };
      
      const staffData = [
        { dept: 'القيادة العليا', indicator: 'سرعة اتخاذ القرارات', value: 90 },
        { dept: 'إدارة الجودة', indicator: 'استقرار الجدول', value: 95 },
        { dept: 'المختص الاجتماعي', indicator: 'الحالات المعالجة', value: 82 },
        { dept: 'بيئة / صيانة', indicator: 'الاستجابة للأعطال', value: 68 },
      ];

      staffData.forEach(d => {
        const row = staffSheet.addRow(d);
        row.getCell(3).numFmt = '0"%"';
        if (d.value < 50) row.getCell(3).font = { color: { argb: 'FFEE0000' }, bold: true };
        else if (d.value >= 90) row.getCell(3).font = { color: { argb: 'FF00aa00' }, bold: true };
      });

      // Generate File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Comprehensive_Indicators_${dateRange.from || 'All'}.xlsx`);

    } catch (e) {
      console.error('Error generating Excel', e);
      alert('حدث خطأ أثناء إنشاء ملف Excel. الرجاء المحاولة مرة أخرى.');
    }
  };

  const handleWhatsAppShare = () => {
    // Generate an exhaustive report for WhatsApp
    const text = `📊 *التقرير الإداري الشامل*
🏢 *الفرع/المدرسة:* ${selectedSchool === 'all' ? 'جميع الفروع' : selectedSchool}
🗓️ *الفترة:* من ${dateRange.from || 'بداية العام'} إلى ${dateRange.to || 'اليوم'}

*===== 1. مؤشرات النبض السريعة =====*
👨‍🏫 الاستقرار التشغيلي (حضور الكادر): *${staffAttendanceRate}%*
🤝 الرضا والتفاعل (أولياء الأمور): *${parentEngagementRate}%*
⚠️ الخطر المدرسي (مشاكل عالية الخطورة غير محلولة): *${unresolvedHighRiskIssues}*
🏆 التميز الأكاديمي (نسب النجاح والإنجاز): *${academicExcellence}%*

*===== 2. المستوى الإداري والتشغيلي =====*
• كفاءة التغطية (الاحتراق الوظيفي): *85% (تغطية مكتملة)*
• الانضباط الإداري العام: *12% تأخر، 4% غياب*
• كفاءة المرافق وحل المشكلات: *72% معدل الإنجاز*

*===== 3. أداء الكادر التعليمي =====*
• مؤشر الفجوة التعليمية: *14% فجوة*
• جودة التصحيح: *78% التزام*
• الانضباط الصفي: *92% انضباط*

*===== 4. شؤون الطلاب والسلوك =====*
• الانضباط الطلابي: *76% بلا تبليغات*
• تفاعل أولياء الأمور: *(متعاون: 45%، متذمر: 15%، غير متابع: 40%)*
• المؤشر الصحي العام: *12 حالة مرضية/مزمنة*

*===== 5. مؤشرات الاستراتيجية الاستشرافية =====*
• الهدر المالي المُقّدر: *4,500 ر.س*
• عائد التدريب (ROI): *+12% أداء*
• بوصلة القرار (SWOT):
  🟢 قوة: الأنشطة اللاصفية
  🔵 فرص: تكريم المبادرين
  🟡 ضعف: تدني نتائج الرياضيات
  🔴 تهديد: تسرب طلاب أول ثانوي

🔗 للاطلاع على التفاصيل الكاملة والرسوم البيانية، نرجو فتح مسار المؤشرات الشاملة بنظام الإدارة.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md font-arabic overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl flex flex-col my-auto min-h-[90vh] max-h-[95vh]"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 p-4 md:p-6 flex flex-col gap-4 md:gap-6 z-20 rounded-t-3xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                    <BarChart size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800">مؤشرات الأداء الشاملة</h2>
                    <p className="text-xs md:text-sm font-bold text-slate-500">لوحة القياس الذكية لمركز القرار</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                  <button onClick={handleWhatsAppShare} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 transition-colors border border-green-200 text-xs md:text-sm">
                     <Share2 size={16} /> مشاركة
                  </button>
                  <button onClick={handleExportExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors border border-blue-200 text-xs md:text-sm">
                     <Download size={16} /> تصدير
                  </button>
                  <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-500 shrink-0">
                    <X size={20} />
                  </button>
                </div>
              </div>
              {/* Dynamic Filters */}
              <div className="flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <div className="flex flex-wrap items-center gap-2">
                   <Calendar size={18} className="text-slate-400 shrink-0" />
                   <span className="font-bold text-slate-700 text-xs md:text-sm">الفترة من:</span>
                   <input type="date" className="flex-1 md:flex-none p-2 rounded-lg border border-slate-200 text-xs md:text-sm font-bold outline-none focus:border-indigo-500" value={dateRange.from} onChange={e => setDateRange(p => ({...p, from: e.target.value}))} />
                   <span className="font-bold text-slate-700 text-xs md:text-sm">إلى:</span>
                   <input type="date" className="flex-1 md:flex-none p-2 rounded-lg border border-slate-200 text-xs md:text-sm font-bold outline-none focus:border-indigo-500" value={dateRange.to} onChange={e => setDateRange(p => ({...p, to: e.target.value}))} />
                 </div>
                 <div className="hidden md:block h-6 w-px bg-slate-200 mx-2" />
                 <div className="flex items-center gap-2">
                   <Filter size={18} className="text-slate-400 shrink-0" />
                   <select className="flex-1 p-2 rounded-lg border border-slate-200 text-xs md:text-sm font-bold outline-none focus:border-indigo-500 min-w-[150px]" value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
                     <option value="all">عرض الكل (جميع الفروع)</option>
                     {schools.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                 </div>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 space-y-8">
               
               {/* Quick Pulse Stats */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                       <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><UserCheck size={20} /></div>
                       <span className="text-2xl font-black text-slate-800">{staffAttendanceRate}%</span>
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-700">الاستقرار التشغيلي</h3>
                       <p className="text-xs text-slate-500 font-medium">نسبة حضور الكادر في الفترة المحددة</p>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                       <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><MessageSquare size={20} /></div>
                       <span className="text-2xl font-black text-slate-800">{parentEngagementRate}%</span>
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-700">الرضا والتفاعل</h3>
                       <p className="text-xs text-slate-500 font-medium">نسبة تجاوب أولياء الأمور وحضورهم</p>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>
                    <div className="flex items-center justify-between">
                       <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center"><AlertTriangle size={20} /></div>
                       <span className="text-2xl font-black text-red-600">{unresolvedHighRiskIssues}</span>
                    </div>
                    <div>
                       <h3 className="font-bold text-red-700">الخطر المدرسي</h3>
                       <p className="text-xs text-red-400 font-medium">مشكلات عالية الخطورة غير محلولة</p>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                       <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Award size={20} /></div>
                       <span className="text-2xl font-black text-slate-800">{academicExcellence}%</span>
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-700">التميز الأكاديمي</h3>
                       <p className="text-xs text-slate-500 font-medium">متوسط نسب النجاح وإنجاز الخطط</p>
                    </div>
                 </div>
               </div>

               {/* Sections */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* A/ Management */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                     <h3 className="text-xl font-black flex items-center gap-2 text-indigo-800">
                       <Briefcase className="text-indigo-500" /> المستوى الإداري والتشغيلي
                     </h3>
                     <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                           <div>
                             <h4 className="font-bold text-slate-700">مؤشر كفاءة التغطية (الاحتراق الوظيفي)</h4>
                             <p className="text-xs text-slate-500 mt-1">المعلمون الأكثر تغطية / الحصص الفارغة المقابلة</p>
                           </div>
                           <span className="font-black text-lg text-slate-800 text-left">85%<br/><span className="text-xs text-green-500 font-bold block">تغطية مكتملة</span></span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                           <div>
                             <h4 className="font-bold text-slate-700">مؤشر الانضباط الإداري العام</h4>
                             <p className="text-xs text-slate-500 mt-1">نسبة التأخير / الغياب / الاستئذان لعموم المدرسة</p>
                           </div>
                           <div className="flex gap-2">
                             <div className="text-center px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">12% تأخر</div>
                             <div className="text-center px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold">4% غياب</div>
                           </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                           <div>
                             <h4 className="font-bold text-slate-700">كفاءة المرافق وحل المشكلات</h4>
                             <p className="text-xs text-slate-500 mt-1">المشكلات المرفوعة مقابل المحلولة / سرعة الاستجابة</p>
                           </div>
                           <span className="font-black text-lg text-slate-800 text-left">72%<br/><span className="text-xs text-slate-500 font-bold block">معدل الإنجاز</span></span>
                        </div>
                     </div>
                  </div>

                  {/* B/ Staff */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                     <h3 className="text-xl font-black flex items-center gap-2 text-cyan-800">
                       <Users className="text-cyan-500" /> مؤشرات الموظفين والعاملين
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                           <div className="text-cyan-700 font-bold text-sm mb-1">القيادة العليا</div>
                           <div className="text-xs text-slate-500 mb-2">سرعة اتخاذ القرارات</div>
                           <div className="text-xl font-black text-cyan-800">90%</div>
                        </div>
                        <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                           <div className="text-cyan-700 font-bold text-sm mb-1">إدارة الجودة</div>
                           <div className="text-xs text-slate-500 mb-2">استقرار الجدول</div>
                           <div className="text-xl font-black text-cyan-800">95%</div>
                        </div>
                        <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                           <div className="text-cyan-700 font-bold text-sm mb-1">المختص الاجتماعي</div>
                           <div className="text-xs text-slate-500 mb-2">الحالات المعالجة</div>
                           <div className="text-xl font-black text-cyan-800">82%</div>
                        </div>
                        <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                           <div className="text-cyan-700 font-bold text-sm mb-1">بيئة / صيانة</div>
                           <div className="text-xs text-slate-500 mb-2">الاستجابة للأعطال</div>
                           <div className="text-xl font-black text-cyan-800">68%</div>
                        </div>
                        <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                           <div className="text-cyan-700 font-bold text-sm mb-1">حركة المواصلات</div>
                           <div className="text-xs text-slate-500 mb-2">دقة المواعيد</div>
                           <div className="text-xl font-black text-cyan-800">88%</div>
                        </div>
                        <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                           <div className="text-cyan-700 font-bold text-sm mb-1">المقصف</div>
                           <div className="text-xs text-slate-500 mb-2">الاشتراطات الصحية</div>
                           <div className="text-xl font-black text-cyan-800">100%</div>
                        </div>
                     </div>
                  </div>

                  {/* C/ Teachers */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                     <h3 className="text-xl font-black flex items-center gap-2 text-emerald-800">
                       <BookOpen className="text-emerald-500" /> مؤشرات أداء الكادر التعليمي
                     </h3>
                     <div className="space-y-4">
                        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex justify-between items-center">
                           <div>
                             <h4 className="font-bold text-emerald-800">مؤشر الفجوة التعليمية</h4>
                             <p className="text-xs text-emerald-600/70 mt-1">اكتمال التحضير ↔ مستوى الطلاب في الاختبارات</p>
                           </div>
                           <div className="flex items-center gap-2 text-sm font-bold bg-white px-3 py-1.5 rounded-xl text-amber-600 shadow-sm border border-emerald-100">
                             <TrendingDown size={16} /> فجوة 14%
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-slate-50 rounded-2xl">
                             <h4 className="font-bold text-slate-700 text-sm mb-2">جودة التصحيح</h4>
                             <div className="w-full bg-slate-200 rounded-full h-2">
                               <div className="bg-emerald-500 h-2 rounded-full" style={{width: '78%'}}></div>
                             </div>
                             <div className="text-xs text-slate-500 mt-2 font-bold text-left">78% التزام</div>
                           </div>
                           <div className="p-4 bg-slate-50 rounded-2xl">
                             <h4 className="font-bold text-slate-700 text-sm mb-2">الانضباط الصفي</h4>
                             <div className="w-full bg-slate-200 rounded-full h-2">
                               <div className="bg-emerald-500 h-2 rounded-full" style={{width: '92%'}}></div>
                             </div>
                             <div className="text-xs text-slate-500 mt-2 font-bold text-left">92% انضباط</div>
                           </div>
                        </div>
                        <div className="p-4 bg-red-50/50 rounded-2xl flex justify-between items-center border border-red-100">
                           <div>
                             <h4 className="font-bold text-red-800 text-sm">المخالفات المهنية</h4>
                             <p className="text-xs text-red-600 mt-1">تأثير مخالفات المعلمين على الأداء</p>
                           </div>
                           <span className="font-black text-red-600 bg-white px-3 py-1 rounded-xl shadow-sm border border-red-100">8 تأثير سلبي</span>
                        </div>
                     </div>
                  </div>

                  {/* D & E/ Students & Behavior */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                     <h3 className="text-xl font-black flex items-center gap-2 text-blue-800">
                       <GraduationCap className="text-blue-500" /> شؤون الطلاب والسلوك
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-slate-50 rounded-2xl flex flex-col gap-2">
                          <h4 className="font-bold text-slate-700 text-sm">مؤشر الانضباط</h4>
                          <span className="text-2xl font-black text-slate-800">76%</span>
                          <span className="text-xs text-slate-500">من الطلاب ملتزمون بلا تبليغات</span>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-2xl flex flex-col gap-2">
                          <h4 className="font-bold text-slate-700 text-sm">تفاعل ولي الأمر</h4>
                          <div className="flex justify-between items-center text-xs font-bold w-full bg-green-100 text-green-700 px-2 py-1 rounded">متعاون: 45%</div>
                          <div className="flex justify-between items-center text-xs font-bold w-full bg-amber-100 text-amber-700 px-2 py-1 rounded">متذمر: 15%</div>
                          <div className="flex justify-between items-center text-xs font-bold w-full bg-slate-200 text-slate-600 px-2 py-1 rounded">غير متابع: 40%</div>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-2xl col-span-2 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <HeartPulse className="text-pink-500" size={20} />
                             <div>
                               <h4 className="font-bold text-slate-700 text-sm">المؤشر الصحي العام</h4>
                               <p className="text-xs text-slate-500 mt-0.5">أمراض مزمنة وحالات طارئة</p>
                             </div>
                          </div>
                          <span className="font-black text-lg bg-pink-50 text-pink-700 px-3 py-1 rounded-xl">12 حالة</span>
                       </div>
                     </div>
                  </div>
                  
                  {/* F/ Exams */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                     <h3 className="text-xl font-black flex items-center gap-2 text-violet-800">
                       <FileText className="text-violet-500" /> القياس الأكاديمي والاختبارات
                     </h3>
                     <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                           <div>
                             <h4 className="font-bold text-slate-700">مؤشر التقدم والتراجع (Trend)</h4>
                             <p className="text-xs text-slate-500 mt-1">مقارنة النتائج الشهرية بالفصلية</p>
                           </div>
                           <div className="text-green-600 font-bold flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                             <TrendingUp size={16} /> +5% تقدم
                           </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                           <div>
                             <h4 className="font-bold text-slate-700">الفاقد التعليمي والغياب</h4>
                             <p className="text-xs text-slate-500 mt-1">غياب الطلاب عن الاختبارات ومستوى الدرجات</p>
                           </div>
                           <span className="font-black text-lg text-slate-800">11% <span className="text-xs font-normal text-slate-500">فاقد</span></span>
                        </div>
                        <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                           <h4 className="font-bold text-red-800 text-sm mb-2">صعوبة المواد (الأعلى رسوباً)</h4>
                           <div className="flex gap-2">
                             <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-red-600 shadow-sm border border-red-100">الرياضيات (18%)</span>
                             <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-red-600 shadow-sm border border-red-100">الفيزياء (14%)</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* G/ Predictive & Strategic */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 bg-gradient-to-br from-indigo-50/30 to-white">
                     <h3 className="text-xl font-black flex items-center gap-2 text-indigo-900">
                       <Activity className="text-indigo-600" /> مؤشرات الاستراتيجية الاستشرافية
                     </h3>
                     <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center">
                           <div className="flex items-center gap-3">
                             <ShieldAlert className="text-red-500" size={24} />
                             <div>
                               <h4 className="font-bold text-red-800">مؤشر الخطر الطلابي (Predictive)</h4>
                               <p className="text-xs text-red-600/80 mt-1">إنذار: (غياب + تدني درجات + تذمر)</p>
                             </div>
                           </div>
                           <div className="text-center">
                             <span className="text-2xl font-black text-red-600 block">7</span>
                             <span className="text-[10px] font-bold text-red-800">طلاب معرضون للتسرب</span>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                             <h4 className="font-bold text-slate-700 text-sm mb-1">مؤشر الهدر المالي</h4>
                             <p className="text-xs text-slate-500 mb-2">تكلفة تقديرية للإتلاف</p>
                             <span className="text-xl font-black text-amber-600">4,500 <span className="text-xs font-bold text-slate-500">ر.س</span></span>
                          </div>
                          <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                             <h4 className="font-bold text-slate-700 text-sm mb-1">عائد التدريب (ROI)</h4>
                             <p className="text-xs text-slate-500 mb-2">تأثير الدورات محلياً</p>
                             <span className="text-xl font-black text-green-600">+12% <span className="text-xs font-bold text-slate-500">أداء</span></span>
                          </div>
                        </div>

                        {/* SWOT Analysis */}
                        <div className="mt-4 p-4 bg-slate-800 text-white rounded-2xl space-y-3">
                           <h4 className="font-black text-sm flex items-center gap-2"><BarChart size={16}/> بوصلة القرار الآلية (SWOT)</h4>
                           <div className="space-y-2">
                             <div className="flex items-center gap-2 text-xs">
                               <div className="w-2 h-2 rounded-full bg-green-400"></div>
                               <span className="font-bold">توسع (قوة):</span>
                               <span className="text-slate-300">الأنشطة اللاصفية، معلمين صف 1</span>
                             </div>
                             <div className="flex items-center gap-2 text-xs">
                               <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                               <span className="font-bold">استقرار (فرص):</span>
                               <span className="text-slate-300">تكريم المبادرين في الحصص الصفرية</span>
                             </div>
                             <div className="flex items-center gap-2 text-xs">
                               <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                               <span className="font-bold">تطوير (ضعف):</span>
                               <span className="text-slate-300">تدني نتائج الرياضيات، قسم الإرشاد</span>
                             </div>
                             <div className="flex items-center gap-2 text-xs">
                               <div className="w-2 h-2 rounded-full bg-red-400"></div>
                               <span className="font-bold">هيكلة (تهديد):</span>
                               <span className="text-slate-300">تسرب طلاب الصف أول ثانوي، دورات بلا أثر</span>
                             </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default ComprehensiveIndicatorsModal;
