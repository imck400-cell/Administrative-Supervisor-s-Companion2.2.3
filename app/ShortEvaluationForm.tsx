import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Printer, Download, Share2, Plus, X, Users, BookOpen, Clock, Calendar, Bookmark, BarChart3, ListChecks, ClipboardList, MinusCircle, PlusCircle } from 'lucide-react';
import { useGlobal } from '../context/GlobalState';
import { User } from '../types';

interface ScoreBlock {
  title: string;
  items: string[];
}

const criteriaBlocks: ScoreBlock[] = [
  {
    title: 'الكفايات الشخصية وسمات المعلم',
    items: ['يهتم بمظهره الشخصي.', 'يظهر ثقة بنفسه.', 'يتحدث بصوت ولغة سليمة.']
  },
  {
    title: 'الخطة الدرسية',
    items: ['يسير في المنهج وفق الخطة.', 'يقدم خطة درسية مكتملة العناصر (كمي)', 'يربط الخطة الدراسية بموضوع الدرس (نوعي)']
  },
  {
    title: 'إدارة الصف',
    items: ['يحافظ على قواعد الانضباط الصفي.', 'يدير التفاعل الصفي بنجاح', 'يساهم في إيجاد مناخ صفي ملائم.', 'يوزع زمن الحصة على خطوات الدرس (تنفيذ)']
  },
  {
    title: 'الأداء والعرض المباشر للدرس',
    items: ['يهيئ ويمهد للدرس بصورة ملائمة.', 'يظهر إلماما بالمادة العلمية.', 'يراعي الفروق الفردية بين المتعلمين.', 'يربط الدرس بالتطبيقات والبيئة المحيطة.', 'ينمي القيم والأخلاق الحميدة.', 'يفعل دور المتعلمين ويحفزهم.', 'يطرح أسئلة صفية متنوعة', 'يتابع أعمال المتعلمين أثناء الدرس.', 'يغلق الدرس بصورة مناسبة.']
  },
  {
    title: 'السبورة والوسائل والأنشطة التعليمية',
    items: ['يمارس التقييم المعزز للتعلم.', 'يستخدم السبورة بفاعلية.', 'يوظف الوسائط التعليمية بصورة مناسبة.', 'يدير النشاط الصفي بفاعلية.']
  },
  {
    title: 'تحصيل المتعلمين',
    items: ['يفعل سجل الدرجات في الحصة.', 'يقيس استيعاب المتعلمين.', 'يتابع دفاتر المتعلمين بفاعلية.', 'يفعل الواجب المنزلي والتعيينات.', 'يربط تحصيل المتعلمين بمصادر التعلم.']
  },
  {
    title: 'مهارات المادة',
    items: ['ينفذ المهارات الأساسية للمادة.']
  },
  {
    title: 'البيئة الصفية',
    items: ['مشاركة الطلاب وتفاعلهم.', 'التفاعل الإيجابي بين المعلم والطلاب.']
  }
];

const subjectBranches: Record<string, string[]> = {
  'القرآن كريم': ['حفظ وتفسير', 'تجويد', 'تلاوة'],
  'التربية الإسلامية': ['إيمان', 'حديث', 'فقه', 'سيرة'],
  'اللغة العربية': ['نحو', 'أدب', 'نصوص', 'بلاغة', 'نقد', 'قراءة'],
  'الرياضيات': ['جبر', 'هندسة', 'تفاضل', 'تكامل', 'إحصاء'],
  'العلوم': ['علوم'],
  'الكيمياء': ['كيمياء'],
  'الفيزياء': ['فيزياء'],
  'الأحياء': ['أحياء'],
  'الاجتماعيات': ['تاريخ', 'مجتمع', 'جغرافيا', 'وطنية'],
  'الحاسوب': ['حاسوب']
};

interface Props {
  teacher: User | undefined;
  school: string;
  branch: string;
  semester: string;
  academicYear: string;
  isSubjectEvaluation?: boolean;
}

export function ShortEvaluationForm({ teacher, school, branch, semester, academicYear, isSubjectEvaluation }: Props) {
  const { currentUser, data, updateData } = useGlobal();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [subSubject, setSubSubject] = useState('');
  const [visitType, setVisitType] = useState('إستطلاعية');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [lessonName, setLessonName] = useState('');

  const [scores, setScores] = useState<Record<string, number>>({});
  
  const [strategies, setStrategies] = useState('');
  const [tools, setTools] = useState('');
  const [sources, setSources] = useState('');
  const [programs, setPrograms] = useState('');

  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [employeeComment, setEmployeeComment] = useState('');

  const handleScore = (item: string, score: number) => {
    setScores(prev => ({ ...prev, [item]: score }));
  };

  const calculateTotalPercentage = () => {
    let totalItems = 0;
    let earnedPoints = 0;
    criteriaBlocks.forEach(block => {
      block.items.forEach(item => {
        totalItems++;
        if (scores[item] !== undefined) {
          earnedPoints += scores[item];
        }
      });
    });
    if (totalItems === 0) return 0;
    return Math.round((earnedPoints / (totalItems * 4)) * 100);
  };

  const percentage = calculateTotalPercentage();

  const handleGenerateFeedback = () => {
    const fours: string[] = [];
    const threes: string[] = [];
    const twos: string[] = [];
    const ones: string[] = [];
    const zeros: string[] = [];

    Object.entries(scores).forEach(([item, score]) => {
      if (score === 4) fours.push(item);
      else if (score === 3) threes.push(item);
      else if (score === 2) twos.push(item);
      else if (score === 1) ones.push(item);
      else if (score === 0) zeros.push(item);
    });

    let sText = '';
    if (fours.length > 0) {
      sText += `لقد تميزت ووصلت إلى أعلى المستويات في المعايير الآتية:\n${fours.map(i => `- ${i}`).join('\n')}\n`;
    }
    if (threes.length > 0) {
      sText += `الأداء كان قوياً ونطمح أن يرتقي إلى أعلى المستويات في المعايير الآتية:\n${threes.map(i => `- ${i}`).join('\n')}\n`;
    }
    setStrengths(sText);

    let iText = '';
    if (twos.length > 0) {
      iText += `نطمح إلى الارتقاء أكثر في المعايير الآتية:\n${twos.map(i => `- ${i}`).join('\n')}\n`;
    }
    setImprovements(iText);

    let rText = '';
    if (ones.length > 0) {
      rText += `نرجو التحسن بشكل أفضل في المعايير الآتية:\n${ones.map(i => `- ${i}`).join('\n')}\n`;
    }
    if (zeros.length > 0) {
      rText += `نرجو التحسن بشكل أفضل في المعايير الآتية:\n${zeros.map(i => `- ${i}`).join('\n')}\n`;
    }
    setRecommendations(rText);
  };

  const handleApplyEmployeeComment = () => {
    let comment = '';
    if (percentage >= 0 && percentage <= 40) {
      comment = 'تم الاطلاع على التقرير كاملاً بما في ذلك جميع الإيجابيات والملاحظات والتوصيات، وأتعهد بالمتابعة لكل ما ذكر';
    } else if (percentage >= 41 && percentage <= 80) {
      comment = 'تم الاطلاع على التقرير كاملاً بما في ذلك جميع الإيجابيات والملاحظات والتوصيات، وسأعمل على الأخذ بكافة ما تم ذكره.';
    } else if (percentage >= 81 && percentage <= 100) {
      comment = 'تم الاطلاع على التقرير كاملاً بما في ذلك جميع الإيجابيات والملاحظات والتوصيات، وسأعمل على الاستمرار في الصدارة و الأخذ بكافة ما تم ذكره.';
    }
    setEmployeeComment(comment);
  };

  const predefinedStrategies = [
    'التعلم التعاوني', 'العصف الذهني', 'الحوار والمناقشة', 'استراتيجية التساؤل',
    'الاكتشاف الموجه', 'الاستقصاء', 'حل المشكلات', 'البحث', 'التفكير الناقد', 'التفكير الإبداعي',
    'المحاكاة', 'التعلم بالخبرة', 'التعليم القائم على المواقف', 'التعليم القائم على المهام الواقعية', 'التجريب', 'المشاريع الصغيرة',
    'التعلم المقلوب (المعكوس)', 'المحاكاة الرقمية', 'التكنولوجيا', 'استراتيجية التعليم المبرمج', 'التعلم القائم على التصميم',
    'التعلم باللعب', 'التعلم بالقصص', 'البطاقات', 'الأناشيد التعليمية', 'التمثيل والدراما', 'التعلم بالصور', 'الأنشطة الحسية', 'الخرائط الذهنية', 'العرض والنموذج',
    'التعلّم القائم على التكرار', 'التعلم الذاتي', 'الملاحظة', 'المهام المصغّرة'
  ];

  const predefinedTools = [
    'السبورة', 'البطاقات التعليمية', 'الصور واللوحات', 'الرسوم البيانية', 'الخرائط الجغرافية', 'الشرائح الشفافة',
    'العينات الحقيقية', 'النماذج المجسمة', 'المجسمات',
    'التسجيلات الصوتية', 'الأفلام التعليمية', 'الفيديو التعليمي', 'الوسائط المتعددة', 'العروض التقديمية',
    'جهاز العرض الضوئي (البروجيكتور)',
    'الحاسب الآلي', 'السبورة الذكية', 'المعامل الافتراضية', 'الكتب التفاعلية',
    'الألعاب التعليمية'
  ];

  const predefinedSources = [
    'المعلم', 'الزملاء (التعلم من الأقران)', 'الخبراء والمختصون',
    'الكتب الدراسية', 'المراجع الأكاديمية', 'المجلات العلمية', 'الوثائق الرسمية',
    'قواعد البيانات', 'المكتبات الرقمية', 'المواقع الإلكترونية', 'المنصات التعليمية', 'التطبيقات التعليمية', 'الدروس المصوّرة', 'القنوات التعليمية',
    'المكتبات المدرسية', 'المتاحف', 'المراكز العلمية',
    'الرحلات التعليمية', 'الدراسات الميدانية', 'المؤتمرات والندوات', 'الدورات التدريبية'
  ];

  const toggleString = (current: string, val: string, setter: (s: string) => void) => {
    let arr = current.split('\n').map(s => s.trim()).filter(Boolean);
    if (arr.includes(val)) {
      arr = arr.filter(s => s !== val);
    } else {
      arr.push(val);
    }
    setter(arr.join('\n'));
  };

  const [addingCustomBlock, setAddingCustomBlock] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  const handleAddCustomOption = (key: 'strategies' | 'tools' | 'sources' | 'programs') => {
    if (!customInput.trim()) return;
    
    const currOptions = data.customEvaluationOptions || { strategies: [], tools: [], sources: [], programs: [] };
    const currArray = currOptions[key] || [];

    if (!currArray.includes(customInput.trim())) {
      const newArray = [...currArray, customInput.trim()];
      updateData({
        customEvaluationOptions: {
          ...currOptions,
          [key]: newArray
        }
      });
      
      if (key === 'strategies') toggleString(strategies, customInput.trim(), setStrategies);
      if (key === 'tools') toggleString(tools, customInput.trim(), setTools);
      if (key === 'sources') toggleString(sources, customInput.trim(), setSources);
      if (key === 'programs') toggleString(programs, customInput.trim(), setPrograms);
    }

    setCustomInput('');
    setAddingCustomBlock(null);
  };

  const getScoreColor = (sc: number) => {
    if (sc === 0) return 'bg-red-800 text-white border-red-800';
    if (sc === 1) return 'bg-red-400 text-white border-red-400';
    if (sc === 2) return 'bg-yellow-400 text-black border-yellow-400';
    if (sc === 3) return 'bg-blue-500 text-white border-blue-500';
    if (sc === 4) return 'bg-green-500 text-white border-green-500';
    return 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200';
  };

  const getFinalScoreFeedbackInfo = (perc: number) => {
    if (perc <= 30) return { label: 'القصور كبير', color: 'bg-red-800 text-white' };
    if (perc <= 40) return { label: 'يتطلب تحسين أكبر', color: 'bg-red-400 text-white' };
    if (perc <= 60) return { label: 'تحسن جميل', color: 'bg-yellow-200 text-yellow-900' };
    if (perc <= 74) return { label: 'تحسن كبير', color: 'bg-yellow-500 text-white' };
    if (perc <= 80) return { label: 'تحسن كبير ملحوظ', color: 'bg-blue-400 text-white' };
    if (perc <= 89) return { label: 'عملك متميز وبقي القليل لتصل إلى التميز الأكبر', color: 'bg-blue-800 text-white' };
    return { label: 'عمل ممتاز جداً، بوركت جهودكم المباركة', color: 'bg-green-400 text-green-900' };
  };

  const currentProfile = data.profiles?.[school] || data.profile;
  const finalScoreInfo = getFinalScoreFeedbackInfo(percentage);

  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheetName = isSubjectEvaluation ? 'التقييم حسب المادة' : 'التقييم المختصر';
      const sheet = workbook.addWorksheet(sheetName);

      sheet.views = [{ rightToLeft: true }];

      // Header
      sheet.mergeCells('A1:C1');
      sheet.getCell('A1').value = 'الجمهورية اليمنية\nوزارة التربية والتعليم والبحث العلمي\nمكتب التربية والتعليم بالأمانة\nمكتب التربية والتعليم بمنطقة شعوب\n' + school + '\n' + (branch ? branch : '');
      sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
      sheet.getCell('A1').font = { name: 'Arial', bold: true, size: 10 };

      // Logo (Placeholder)
      sheet.mergeCells('D1:E1');
      sheet.getCell('D1').value = 'شعار المدرسة';
      sheet.getCell('D1').alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.mergeCells('F1:H1');
      sheet.getCell('F1').value = 'Republic of Yemen\nMinistry of Education\n\n\n' + school + '\n' + (branch ? branch : '');
      sheet.getCell('F1').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      sheet.getCell('F1').font = { name: 'Arial', bold: true, size: 10 };
      
      sheet.getRow(1).height = 100;

      // Data Overview
      sheet.addRow([]);
      sheet.addRow(['اسم المعلم', teacher?.name, 'المشرف التربوي', currentUser?.name]);
      sheet.addRow(['المادة', subject, 'نوع الزيارة', visitType]);
      sheet.addRow(['الصف', grade, 'الشعبة', section]);
      sheet.addRow(['اسم الدرس', lessonName, 'التاريخ', date]);
      sheet.addRow(['الفصل الدراسي', semester, 'العام الدراسي', academicYear]);

      sheet.addRow([]);

      const headerRow = sheet.addRow(['م', 'مجال التقييم', 'العنصر', 'الدرجة (0-4)']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; // Blue-700
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      let sr = 1;
      criteriaBlocks.forEach(block => {
        block.items.forEach((item, idx) => {
          const score = scores[item] ?? '';
          const row = sheet.addRow([sr++, idx === 0 ? block.title : '', item, score]);
          
          let color = 'FFFFFFFF';
          if (score === 0) color = 'FF991B1B'; // red-800
          else if (score === 1) color = 'FFF87171'; // red-400
          else if (score === 2) color = 'FFFACC15'; // yellow-400
          else if (score === 3) color = 'FF3B82F6'; // blue-500
          else if (score === 4) color = 'FF22C55E'; // green-500

          const scoreCell = row.getCell(4);
          if (score !== '') {
            scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
            scoreCell.font = { bold: true, color: { argb: score === 2 ? 'FF000000' : 'FFFFFFFF' } };
          }
        });
      });

      sheet.addRow([]);
      const totalRow = sheet.addRow(['', 'النسبة المئوية النهائية', '', `${percentage}%`]);
      totalRow.font = { bold: true, size: 14 };

      sheet.addRow([]);
      sheet.addRow(['أهم الاستراتيجيات', strategies]);
      sheet.addRow(['أهم الوسائل', tools]);
      sheet.addRow(['أهم المصادر', sources]);
      sheet.addRow(['البرامج المنفذة', programs]);

      sheet.addRow([]);
      sheet.addRow(['الإيجابيات', strengths]);
      sheet.addRow(['الملاحظات للتحسين', improvements]);
      sheet.addRow(['التوصيات', recommendations]);
      sheet.addRow(['تعليق الموظف', employeeComment]);

      sheet.addRow([]);
      sheet.addRow(['مدون التقرير (المشرف):', currentUser?.name, 'مدير الفرع:', currentProfile?.branchManager || '']);

      sheet.columns.forEach(column => {
        column.width = 25;
      });
      sheet.getColumn(3).width = 50;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileNameStr = isSubjectEvaluation ? 'تقييم_مادة' : 'تقييم_مختصر';
      link.download = `${fileNameStr}_${teacher?.name || 'مجهول'}_${date}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء تصدير الإكسل');
    }
  };

  const handleWhatsapp = () => {
    let msg = isSubjectEvaluation ? `*التقييم حسب المادة*\n` : `*التقييم المختصر*\n`;
    msg += `🏫 المدرسة: ${school} ${branch ? '- ' + branch : ''}\n`;
    msg += `👤 المعلم: ${teacher?.name}\n`;
    msg += `📋 المادة: ${subject} | 📅 التاريخ: ${date}\n`;
    msg += `📖 الدرس: ${lessonName}\n\n`;

    msg += `*📊 عناصر التقييم:*\n`;
    criteriaBlocks.forEach(block => {
      msg += `\n*${block.title}*\n`;
      block.items.forEach(item => {
        const score = scores[item];
        let indicator = '⚪';
        if (score === 0) indicator = '🔴';
        else if (score === 1) indicator = '🟠';
        else if (score === 2) indicator = '🟡';
        else if (score === 3) indicator = '🔵';
        else if (score === 4) indicator = '🟢';
        
        msg += `${indicator} ${item} (${score ?? '-'})\n`;
      });
    });

    msg += `\n*🎯 النسبة النهائية: ${percentage}%*\n\n`;

    msg += `*💡 الإيجابيات:*\n${strengths}\n\n`;
    msg += `*⚠️ للتحسين:*\n${improvements}\n\n`;
    msg += `*📌 التوصيات:*\n${recommendations}\n`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-10 max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <ClipboardList size={28} /> {isSubjectEvaluation ? 'التقييم حسب المادة' : 'التقييم المختصر'}
          </h2>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المدرسة</label>
              <input readOnly value={school} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-500" />
            </div>
            {branch && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">الفرع</label>
                <input readOnly value={branch} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-500" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المشرف التربوي</label>
              <input readOnly value={currentUser?.name || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المعلم</label>
              <input readOnly value={teacher?.name || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الفصل الدراسي</label>
              <input readOnly value={semester} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">العام الدراسي</label>
              <input readOnly value={academicYear} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">التاريخ</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-700 focus:border-blue-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المادة</label>
              <select value={subject} onChange={e => { setSubject(e.target.value); setSubSubject(''); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-700 focus:border-blue-500">
                <option value="">اختر المادة</option>
                {['القرآن كريم', 'التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الكيمياء', 'الفيزياء', 'الأحياء', 'الاجتماعيات', 'الحاسوب'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {subject && subjectBranches[subject] && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">فرع المادة</label>
                <select value={subSubject} onChange={e => setSubSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-700 focus:border-blue-500">
                  <option value="">اختر الفرع</option>
                  {subjectBranches[subject].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">نوع الزيارة</label>
              <select value={visitType} onChange={e => setVisitType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-700 focus:border-blue-500">
                {['استطلاعية', 'تشخيصية', 'توجيهية', 'تقييمية'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الصف</label>
              <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-700 focus:border-blue-500">
                <option value="">اختر الصف</option>
                {['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الشعبة</label>
              <select value={section} onChange={e => setSection(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-700 focus:border-blue-500">
                <option value="">اختر الشعبة</option>
                {['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <label className="text-sm font-bold text-slate-700">اسم الدرس</label>
              <input type="text" value={lessonName} onChange={e => setLessonName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-semibold text-slate-700 focus:border-blue-500" placeholder="اكتب اسم الدرس هنا..." />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-6 md:p-8 space-y-8">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-2xl font-black text-slate-800 border-r-4 border-blue-600 pr-4">عناصر التقييم</h3>
        </div>

        {criteriaBlocks.map((block, i) => (
          <div key={i} className="rounded-xl border border-[#44b0a0] overflow-hidden shadow-sm mb-6">
            <div className="bg-[#44b0a0] py-3 px-4 flex items-center justify-between">
              <h4 className="text-lg font-bold text-white leading-tight">{block.title}</h4>
              <PlusCircle size={20} className="text-white bg-transparent opacity-80" />
            </div>
            <div className="bg-white flex flex-col">
              {block.items.map((item, j) => (
                <div key={j} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 ${j !== block.items.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50 transition-colors`}>
                  <div className="flex items-center justify-start gap-3 w-full md:w-auto md:flex-1">
                    <MinusCircle size={20} className="text-red-500 flex-shrink-0 stroke-[2] opacity-80" />
                    <span className="font-semibold text-slate-600 text-base text-right">{item}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {[0, 1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        onClick={() => handleScore(item, num)}
                        className={`w-10 h-10 rounded-full font-bold text-lg flex items-center justify-center transition-all ${scores[item] === num ? getScoreColor(num) : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'} ${scores[item] !== num ? 'shadow-sm' : ''}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className={`mt-8 p-6 rounded-2xl border text-center ${finalScoreInfo.color} border-slate-200`}>
          <h4 className="text-xl font-bold mb-2">النسبة المئوية النهائية</h4>
          <div className="text-5xl font-black mb-2">
            {percentage}%
          </div>
          <div className="text-xl font-bold opacity-90">
            {finalScoreInfo.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: 'strategies', title: 'أهم الاستراتيجيات المنفذة', val: strategies, set: setStrategies, base: predefinedStrategies },
          { key: 'tools', title: 'أهم الوسائل المستخدمة', val: tools, set: setTools, base: predefinedTools },
          { key: 'sources', title: 'أهم المصادر المستخدمة', val: sources, set: setSources, base: predefinedSources },
          { key: 'programs', title: 'البرامج المنفذة', val: programs, set: setPrograms, base: [] }
         ].map((block, i) => {
           const customArr = data.customEvaluationOptions?.[block.key as 'strategies'|'tools'|'sources'|'programs'] || [];
           const arr = [...block.base, ...customArr];
           
           return (
             <div key={i} className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
               <div className="flex items-center justify-between">
                 <h4 className="text-lg font-bold text-slate-800">{block.title}</h4>
                 <button 
                   onClick={() => setAddingCustomBlock(addingCustomBlock === block.key ? null : block.key)}
                   className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg transition-colors"
                 >
                   <Plus size={16} /> إضافة
                 </button>
               </div>

               {addingCustomBlock === block.key && (
                 <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-xl">
                   <input 
                     autoFocus
                     type="text" 
                     value={customInput} 
                     onChange={(e) => setCustomInput(e.target.value)}
                     className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-semibold text-sm"
                     placeholder="اكتب عنصراً جديداً..."
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.preventDefault();
                         handleAddCustomOption(block.key as 'strategies'|'tools'|'sources'|'programs');
                       }
                     }}
                   />
                   <button 
                     onClick={() => handleAddCustomOption(block.key as 'strategies'|'tools'|'sources'|'programs')}
                     className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition"
                   >
                     حفظ
                   </button>
                 </div>
               )}

               {arr.length > 0 && (
                 <div className="flex flex-wrap gap-2">
                   {arr.map(opt => {
                     const isActive = block.val.split('\n').map(s => s.trim()).includes(opt);
                     return (
                       <button
                         key={opt}
                         onClick={() => toggleString(block.val, opt, block.set)}
                         className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isActive ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} border`}
                       >
                         {opt}
                       </button>
                     );
                   })}
                 </div>
               )}
               <textarea
                 value={block.val}
                 onChange={e => block.set(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-semibold text-slate-700 focus:border-blue-500 outline-none min-h-[100px]"
                 placeholder="اكتب هنا..."
               />
             </div>
           );
         })}
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8 space-y-6">
        <button 
          onClick={handleGenerateFeedback}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <BarChart3 size={20} /> إنشاء اقتراحات التغذية الراجعة
        </button>
        
        <div className="space-y-4">
          <label className="text-lg font-bold text-slate-800 block">أهم الإيجابيات</label>
          <textarea value={strengths} onChange={e => setStrengths(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-semibold text-slate-700 focus:border-blue-500 outline-none min-h-[120px]" />
        </div>
        <div className="space-y-4">
          <label className="text-lg font-bold text-slate-800 block">أهم الملاحظات (للتحسين)</label>
          <textarea value={improvements} onChange={e => setImprovements(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-semibold text-slate-700 focus:border-blue-500 outline-none min-h-[120px]" />
        </div>
        <div className="space-y-4">
          <label className="text-lg font-bold text-slate-800 block">أهم التوصيات</label>
          <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-semibold text-slate-700 focus:border-blue-500 outline-none min-h-[120px]" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <label className="text-lg font-bold text-slate-800">تعليق الموظف</label>
          <button 
            onClick={handleApplyEmployeeComment}
            className="text-white font-bold py-2 px-4 rounded-xl transition-all shadow-md flex items-center gap-2 bg-violet-600 hover:bg-violet-700"
          >
            <ListChecks size={18} /> إدراج التعليق التلقائي
          </button>
        </div>
        <textarea 
          value={employeeComment} 
          onChange={e => setEmployeeComment(e.target.value)} 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-semibold text-slate-700 focus:border-violet-500 outline-none min-h-[100px]" 
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-xl shadow-blue-200">
          <Save size={24} /> حفظ التقرير
        </button>
        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg">
          <Printer size={20} /> طباعة
        </button>
        <button onClick={handleExportExcel} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg">
          <Download size={20} /> تصدير إكسل
        </button>
        <button onClick={handleWhatsapp} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg">
          <Share2 size={20} /> إرسال عبر واتساب
        </button>
      </div>

    </div>
  );
}
