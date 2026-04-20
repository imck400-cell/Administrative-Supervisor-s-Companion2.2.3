import React, { useState, useEffect } from 'react';
import { useGlobal } from '../context/GlobalState';
import { X, Save, Share2, FileSpreadsheet, User, BookOpen, Briefcase, Activity, ClipboardList, TrendingUp } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES = [
  { id: 'teacher', label: 'معلم المادة' },
  { id: 'supervisor', label: 'المشرف الإداري' },
  { id: 'parent', label: 'ولي الأمر' },
  { id: 'student', label: 'الطالب (تقييم ذاتي)' },
  { id: 'activity_leader', label: 'رائد النشاط' },
  { id: 'health_guide', label: 'المرشد الصحي' },
  { id: 'special_ed_teacher', label: 'معلم التربية الخاصة' },
  { id: 'social_worker', label: 'المختص الاجتماعي' }
];

const CaseStudyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useGlobal();
  const [studentName, setStudentName] = useState('');
  const [evaluatorRole, setEvaluatorRole] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  // Reset when role changes
  useEffect(() => {
    setFormData({});
  }, [evaluatorRole]);

  if (!isOpen) return null;

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getDynamicFields = () => {
    switch (evaluatorRole) {
      case 'teacher':
        return [
          { key: 'academic_understanding', label: 'الاستيعاب العلمي' },
          { key: 'homework_commitment', label: 'الالتزام بالواجبات' },
          { key: 'participation', label: 'المشاركة والتفاعل' },
          { key: 'classroom_behavior', label: 'السلوك الصفي' },
          { key: 'strengths', label: 'نقاط التميز' }
        ];
      case 'supervisor':
        return [
          { key: 'attendance', label: 'الحضور والانصراف' },
          { key: 'appearance', label: 'المظهر العام' },
          { key: 'yard_behavior', label: 'السلوك العام في الساحات' },
          { key: 'property_respect', label: 'احترام الممتلكات' },
          { key: 'admin_communication', label: 'التواصل مع الإدارة' }
        ];
      case 'parent':
        return [
          { key: 'home_environment', label: 'البيئة المنزلية' },
          { key: 'study_independence', label: 'الاستقلالية في المذاكرة' },
          { key: 'social_life', label: 'الحياة الاجتماعية' },
          { key: 'health_status', label: 'الحالة الصحية' },
          { key: 'behavioral_notes', label: 'الملاحظات السلوكية' }
        ];
      case 'student':
        return [
          { key: 'school_feelings', label: 'المشاعر تجاه المدرسة' },
          { key: 'favorite_hard_subjects', label: 'المواد المفضلة / الصعبة' },
          { key: 'peer_relations', label: 'العلاقات مع الزملاء / التنمر' },
          { key: 'preferred_learning_style', label: 'طريقة التعلم المفضلة' }
        ];
      case 'activity_leader':
        return [
          { key: 'leadership_skills', label: 'المهارات القيادية' },
          { key: 'teamwork', label: 'العمل الجماعي' },
          { key: 'talents', label: 'المواهب' }
        ];
      case 'health_guide':
        return [
          { key: 'chronic_diseases', label: 'الأمراض المزمنة' },
          { key: 'clinic_visits', label: 'زيارات العيادة' },
          { key: 'physical_growth', label: 'النمو البدني' }
        ];
      case 'special_ed_teacher':
        return [
          { key: 'developmental_skills', label: 'المهارات النمائية' },
          { key: 'academic_skills', label: 'الهارات الأكاديمية الخاصة' },
          { key: 'iep_progress', label: 'تقدم الخطة الفردية' }
        ];
      case 'social_worker':
        return [
          { key: 'initial_diagnosis', label: 'التشخيص المبدئي (نوع الحالة)' },
          { key: 'swot_analysis', label: 'مصفوفة SWOT' },
          { key: 'risk_level', label: 'مؤشر الخطورة (أخضر / أصفر / أحمر)', type: 'select', options: ['أخضر - آمن', 'أصفر - يحتاج متابعة', 'أحمر - حرج'] },
          { key: 'sociogram', label: 'العلاقات (الأصدقاء / حالة التنمر)' },
          { key: 'sessions_log', label: 'سجل الجلسات والمقاييس' },
          { key: 'interventions', label: 'التدخلات والإحالة' }
        ];
      default:
        return [];
    }
  };

  const fields = getDynamicFields();

  const handleSave = async () => {
    if (!studentName.trim() || !evaluatorRole) {
      setSaveStatus({ type: 'error', message: 'يرجى إدخال اسم الطالب واختيار صفة المقييم' });
      return;
    }

    setIsSubmitting(true);
    setSaveStatus({ type: '', message: '' });

    const payload = {
      studentName,
      evaluatorRole,
      roleName: ROLES.find(r => r.id === evaluatorRole)?.label || evaluatorRole,
      formData,
      additionalDetails,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'unknown',
      school: currentUser?.selectedSchool || ''
    };

    try {
      if (navigator.onLine) {
        // Sync directly to firebase
        await addDoc(collection(db, 'CaseStudies'), payload);
        setSaveStatus({ type: 'success', message: 'تم حفظ التقرير بنجاح (متصل)' });
      } else {
        // Fallback to local storage for manual sync/offline buffer
        const offlineData = JSON.parse(localStorage.getItem('offlineCaseStudies') || '[]');
        offlineData.push({ ...payload, id: 'local_' + Date.now() });
        localStorage.setItem('offlineCaseStudies', JSON.stringify(offlineData));
        setSaveStatus({ type: 'warning', message: 'تم حفظ التقرير محلياً لعدم توفر إنترنت، سيتم المزامنة لاحقاً.' });
      }
      
      setTimeout(() => {
        setSaveStatus({ type: '', message: '' });
        onClose();
        setStudentName('');
        setEvaluatorRole('');
        setFormData({});
        setAdditionalDetails('');
      }, 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus({ type: 'error', message: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    if (!studentName || !evaluatorRole) return;
    const wsData = [
      ['اسم الطالب', studentName],
      ['صفة المقييم', ROLES.find(r => r.id === evaluatorRole)?.label || ''],
      ['تاريخ التقرير', new Date().toLocaleDateString('ar-SA')],
      [],
      ...fields.map(f => [f.label, formData[f.key] || 'لم يتم الإدخال']),
      [],
      ['تفاصيل إضافية', additionalDetails]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Case Study");
    XLSX.writeFile(wb, `دراسة_حالة_${studentName}_${Date.now()}.xlsx`);
  };

  const handleShare = () => {
    if (!studentName || !evaluatorRole) return;
    const roleLabel = ROLES.find(r => r.id === evaluatorRole)?.label || '';
    
    let text = `*دراسة حالة - ${studentName}*\n`;
    text += `*المُقيّم:* ${roleLabel}\n`;
    text += `*التاريخ:* ${new Date().toLocaleDateString('ar-SA')}\n\n`;
    
    fields.forEach(f => {
      if (formData[f.key]) {
        text += `*${f.label}:*\n${formData[f.key]}\n\n`;
      }
    });

    if (additionalDetails) {
      text += `*تفاصيل إضافية:*\n${additionalDetails}\n`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm rtl font-arabic overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-500" />
            دراسة حالة طالب
          </h2>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {saveStatus.message && (
             <div className={`p-4 rounded-xl text-sm font-bold border ${saveStatus.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
               {saveStatus.message}
             </div>
          )}

          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">اسم الطالب (رباعياً)</label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="أدخل اسم الطالب..."
                  className="w-full bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 h-[48px] px-12 appearance-none font-medium"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">صفة المُقيِّم</label>
              <select 
                value={evaluatorRole}
                onChange={(e) => setEvaluatorRole(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 h-[48px] px-4 appearance-none font-medium"
              >
                <option value="">اختر صفة المُقيِّم...</option>
                {ROLES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`transition-all duration-300 ${evaluatorRole ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-2 pointer-events-none'}`}>
            {fields.length > 0 && (
               <div className="space-y-4">
                 {fields.map((f, i) => (
                    <div key={i} className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white shadow-sm">
                      <label className="block text-sm font-bold text-slate-700 mb-2">{f.label}</label>
                      {f.type === 'select' ? (
                        <select
                          value={formData[f.key] || ''}
                          onChange={(e) => handleInputChange(f.key, e.target.value)}
                          className="w-full bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 h-[48px] px-4 appearance-none font-medium text-sm"
                        >
                           <option value="">اختر التقييم...</option>
                           {f.options?.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <textarea
                          value={formData[f.key] || ''}
                          onChange={(e) => handleInputChange(f.key, e.target.value)}
                          placeholder={`اكتب الملاحظات حول ${f.label}...`}
                          className="w-full bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 p-4 font-medium min-h-[80px] resize-y"
                        />
                      )}
                    </div>
                 ))}
                 
                 <div className="bg-blue-50/50 backdrop-blur-md p-5 rounded-2xl border border-blue-100/50 shadow-sm mt-6">
                    <label className="block text-sm font-bold text-slate-800 mb-2">تفاصيل إضافية / إجراءات مخصصة</label>
                    <textarea 
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                      placeholder="أدخل أي تفاصيل إضافية أو تقارير أخرى هنا..."
                      className="w-full bg-white border-blue-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 p-4 font-medium min-h-[120px] resize-y"
                    />
                 </div>
               </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white/80 backdrop-blur-md p-4 sm:px-6 sm:py-4 border-t sticky bottom-0 z-10">
           <div className="flex flex-col sm:flex-row gap-3">
             <button 
               onClick={handleSave}
               disabled={isSubmitting || !studentName || !evaluatorRole}
               className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
             >
               <Save size={20} /> حفظ التقرير
             </button>
             <button 
               onClick={handleExport}
               disabled={!studentName || !evaluatorRole}
               className="flex-1 min-h-[48px] bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
             >
               <FileSpreadsheet size={20} /> تصدير إكسل
             </button>
             <button 
               onClick={handleShare}
               disabled={!studentName || !evaluatorRole}
               className="flex-1 min-h-[48px] bg-green-50 hover:bg-green-100 disabled:opacity-50 text-green-700 border border-green-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
             >
               <Share2 size={20} /> واتساب
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CaseStudyModal;
