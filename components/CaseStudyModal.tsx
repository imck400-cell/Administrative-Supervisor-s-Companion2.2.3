import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGlobal } from '../context/GlobalState';
import { X, Save, Share2, FileSpreadsheet, User, ClipboardList, Search, Calendar, ChevronDown, ChevronUp, Trash2, CheckCircle2, ChevronLeft, ChevronRight, TrendingUp, Briefcase } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import { StudentReport } from '../types';

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

const RATINGS = [
  { id: 'ممتاز', color: 'bg-emerald-500', text: 'text-emerald-700' },
  { id: 'جيد جدا', color: 'bg-blue-500', text: 'text-blue-700' },
  { id: 'جيد', color: 'bg-teal-500', text: 'text-teal-700' },
  { id: 'ضعيف', color: 'bg-orange-500', text: 'text-orange-700' },
  { id: 'ضعيف جدا', color: 'bg-red-500', text: 'text-red-700' }
];

const normalizeArabic = (text: string) => {
  return text.replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
};

const getSubjectsForGrade = (grade: string) => {
  if (!grade) return [];
  const g = normalizeArabic(grade);
  if (['تمهيدي', 'اول', 'ثاني', 'ثالث', 'اوله', 'ثانيه', 'ثالثه'].some(x => g.includes(x) && !g.includes('ثانوي'))) {
    return ['القرآن الكريم', 'رأي المربية', 'اللغة الإنجليزية', 'الحاسوب', 'المهارات الحياتية'];
  }
  if (['رابع', 'خامس', 'سادس', 'سابع', 'ثامن', 'تاسع'].some(x => g.includes(x))) {
    return ['القرآن الكريم', 'التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الاجتماعيات', 'الحاسوب', 'المهارات الحياتية'];
  }
  if (['الاول الثانوي', 'اول ثانوي', 'أول ثانوي'].some(x => g.includes(x))) {
    return ['القرآن الكريم', 'التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'الكيمياء', 'الفيزياء', 'الأحياء', 'الاجتماعيات', 'الحاسوب', 'المهارات الحياتية'];
  }
  if (['ثاني ثانوي', 'ثالث ثانوي', 'الثاني الثانوي', 'الثالث الثانوي'].some(x => g.includes(x))) {
    return ['القرآن الكريم', 'التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'الكيمياء', 'الفيزياء', 'الأحياء', 'الحاسوب', 'المهارات الحياتية'];
  }
  return ['القرآن الكريم', 'التربية الإسلامية', 'اللغة العربية', 'الرياضيات', 'العلوم'];
};

const CaseStudyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, data, isAuthenticated } = useGlobal();
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');

  // Create Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentReport | null>(null);
  const [evaluatorRole, setEvaluatorRole] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [formData, setFormData] = useState<Record<string, { rating: string, text: string }>>({});
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  // View Log State
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStudentsQuery, setFilterStudentsQuery] = useState('');
  const [selectedFilterStudents, setSelectedFilterStudents] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab === 'view' && isOpen) {
      fetchLogs();
    }
  }, [activeTab, isOpen]);

  // Reset when role changes
  useEffect(() => {
    setFormData({});
    setSelectedSubject('');
  }, [evaluatorRole]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const term = normalizeArabic(searchQuery);
    return data.studentReports.filter(s => normalizeArabic(s.name).includes(term)).slice(0, 5);
  }, [searchQuery, data.studentReports]);

  const filteredFilterStudents = useMemo(() => {
    if (!filterStudentsQuery.trim()) return [];
    const term = normalizeArabic(filterStudentsQuery);
    return data.studentReports.filter(s => normalizeArabic(s.name).includes(term)).slice(0, 5);
  }, [filterStudentsQuery, data.studentReports]);

  // View Log Filtering
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (filterDateFrom) result = result.filter(l => l.timestamp.split('T')[0] >= filterDateFrom);
    if (filterDateTo) result = result.filter(l => l.timestamp.split('T')[0] <= filterDateTo);
    if (selectedFilterStudents.length > 0) {
      result = result.filter(l => selectedFilterStudents.includes(l.studentName));
    }
    return result;
  }, [logs, filterDateFrom, filterDateTo, selectedFilterStudents]);

  if (!isOpen) return null;

  const handleStudentSelect = (student: StudentReport) => {
    setSelectedStudent(student);
    setSearchQuery(student.name);
    setShowSuggestions(false);
  };

  const handleFormDataChange = (key: string, fieldType: 'rating' | 'text', value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [fieldType]: value
      }
    }));
  };

  const getDynamicFields = () => {
    switch (evaluatorRole) {
      case 'teacher':
        return [
          { key: 'academic_understanding', label: 'الاستيعاب العلمي' },
          { key: 'homework_commitment', label: 'الالتزام بالواجبات' },
          { key: 'participation', label: 'المشاركة والتفاعل' },
          { key: 'classroom_behavior', label: 'السلوك الصفي' },
          { key: 'strengths', label: 'نقاط التميز', noRating: true }
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
          { key: 'talents', label: 'المواهب', noRating: true }
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
          { key: 'academic_skills', label: 'المهارات الأكاديمية الخاصة' },
          { key: 'iep_progress', label: 'تقدم الخطة الفردية' }
        ];
      case 'social_worker':
        return [
          { key: 'initial_diagnosis', label: 'التشخيص المبدئي (نوع الحالة)' },
          { key: 'swot_analysis', label: 'مصفوفة SWOT', noRating: true },
          { key: 'risk_level', label: 'مؤشر الخطورة', type: 'select', options: ['أخضر - آمن', 'أصفر - يحتاج متابعة', 'أحمر - حرج'] },
          { key: 'sociogram', label: 'العلاقات (الأصدقاء / حالة التنمر)' },
          { key: 'sessions_log', label: 'سجل الجلسات والمقاييس', noRating: true },
          { key: 'interventions', label: 'التدخلات والإحالة', noRating: true }
        ];
      default:
        return [];
    }
  };

  const fields = getDynamicFields();

  const handleSave = async () => {
    if (!selectedStudent || !evaluatorRole) {
      setSaveStatus({ type: 'error', message: 'يرجى اختيار الطالب وصفة المقيم' });
      return;
    }

    if (evaluatorRole === 'teacher' && !selectedSubject) {
      setSaveStatus({ type: 'error', message: 'يرجى اختيار مادة التقييم' });
      return;
    }

    setIsSubmitting(true);
    setSaveStatus({ type: '', message: '' });

    const flatFormData: Record<string, string> = {};
    fields.forEach(f => {
      const fieldData = formData[f.key];
      if (fieldData) {
        if (fieldData.rating) flatFormData[f.key + '_rating'] = fieldData.rating;
        if (fieldData.text) flatFormData[f.key + '_text'] = fieldData.text;
      }
    });

    const payload = {
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      studentGrade: selectedStudent.grade,
      studentSection: selectedStudent.section,
      studentGender: selectedStudent.gender,
      studentAddress: selectedStudent.address,
      studentWork: selectedStudent.workOutside,
      guardianName: selectedStudent.guardianName,
      guardianPhone: selectedStudent.guardianPhones?.[0] || '',
      evaluatorRole,
      roleName: ROLES.find(r => r.id === evaluatorRole)?.label || evaluatorRole,
      subject: selectedSubject,
      formData: flatFormData,
      additionalDetails,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'مستخدم غير معروف',
      school: currentUser?.selectedSchool || ''
    };

    try {
      if (navigator.onLine && isAuthenticated) {
        await addDoc(collection(db, 'CaseStudies'), payload);
        setSaveStatus({ type: 'success', message: 'تم حفظ التقرير بنجاح' });
      } else {
        const offlineData = JSON.parse(localStorage.getItem('offlineCaseStudies') || '[]');
        offlineData.push({ ...payload, id: 'local_' + Date.now() });
        localStorage.setItem('offlineCaseStudies', JSON.stringify(offlineData));
        setSaveStatus({ type: 'warning', message: 'تم حفظ التقرير محلياً لعدم توفر إنترنت، سيتم المزامنة لاحقاً.' });
      }
      
      setTimeout(() => {
        setSaveStatus({ type: '', message: '' });
        setSearchQuery('');
        setSelectedStudent(null);
        setEvaluatorRole('');
        setSelectedSubject('');
        setFormData({});
        setAdditionalDetails('');
      }, 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus({ type: 'error', message: 'حدث خطأ. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      if (navigator.onLine && isAuthenticated) {
        let q = query(collection(db, 'CaseStudies'), orderBy('timestamp', 'desc'));
        
        // Client-side filtering to avoid complex composite index requirements
        const snapshot = await getDocs(q);
        let fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        
        // Filter by school for normal users
        const isGenSuper = currentUser?.role === 'admin' || currentUser?.permissions?.all;
        if (!isGenSuper) {
           const userSchools = (currentUser?.selectedSchool || '').split(',').map(s => s.trim());
           fetchedLogs = fetchedLogs.filter(log => userSchools.includes(log.school));
        }

        setLogs(fetchedLogs);
      } else {
        const offlineData = JSON.parse(localStorage.getItem('offlineCaseStudies') || '[]');
        setLogs(offlineData);
      }
    } catch (err) {
      console.error("Error fetching case studies", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (docId.startsWith('local_')) {
      const offlineData = JSON.parse(localStorage.getItem('offlineCaseStudies') || '[]');
      const newData = offlineData.filter((i: any) => i.id !== docId);
      localStorage.setItem('offlineCaseStudies', JSON.stringify(newData));
      setLogs(newData);
      return;
    }

    if (!navigator.onLine) {
        alert('لا يمكن الحذف في وضع عدم الاتصال');
        return;
    }

    if (!window.confirm('هل أنت متأكد من حذف هذه الدراسة؟')) return;

    try {
      await deleteDoc(doc(db, 'CaseStudies', docId));
      setLogs(prev => prev.filter(l => l.id !== docId));
    } catch (e) {
      console.error(e);
      alert('فشل الحذف');
    }
  };

  const generateWhatsAppText = (log: any) => {
    let text = `*دراسة حالة مفصلة - ${log.studentName}*\n`;
    text += `*الصف:* ${log.studentGrade || '-'} | *الشعبة:* ${log.studentSection || '-'}\n`;
    text += `*نوع التقرير:* ${log.roleName} ${log.subject ? `(${log.subject})` : ''}\n`;
    text += `*التاريخ:* ${new Date(log.timestamp).toLocaleDateString('ar-SA')}\n`;
    text += `*مُدخل التقرير:* ${log.userName}\n\n`;

    const getFieldsForRole = () => {
      // Mock evaluatorRole change to get matching fields
      const originalEvaluator = evaluatorRole;
      return ROLES.map(r=>r.id); // Hack: To iterate flatFormData we can just output everything keys
    };

    const flat = log.formData || {};
    
    // Instead of reconstructing dynamic fields, iterate collected data
    Object.keys(flat).forEach(key => {
        if(key.endsWith('_text')) {
           const mainKey = key.replace('_text', '');
           const rating = flat[mainKey + '_rating'];
           const val = flat[key];
           
           // Lookup label (approximation, we don't have the original fields array easily here without role state sync)
           // But we can format nicely
           text += `*البند:* ${val}\n`; // Detailed labels missing in generic iteration, but we can reconstruct it.
           if (rating) text += `*التقييم:* ${rating}\n`;
           text += `\n`;
        }
    });

    if (log.additionalDetails) {
      text += `*ملاحظات إضافية:*\n${log.additionalDetails}\n`;
    }
    
    return encodeURIComponent(text);
  };

  const handleExport = (exportData: any[]) => {
    if (!exportData.length) return;
    const wsData = exportData.map(log => {
        const flat = log.formData || {};
        return {
           'تاريخ الإدخال': new Date(log.timestamp).toLocaleDateString('ar-SA'),
           'اسم الطالب': log.studentName,
           'الصف': log.studentGrade,
           'الشعبة': log.studentSection,
           'صفة المُقييم': log.roleName,
           'المادة': log.subject || 'N/A',
           'التقييمات': JSON.stringify(flat),
           'تفاصيل إضافية': log.additionalDetails,
           'المدخل': log.userName,
           'المدرسة': log.school
        };
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cases");
    XLSX.writeFile(wb, `سجل_دراسات_الحالة_${Date.now()}.xlsx`);
  };

  const handleShareAll = (exportData: any[]) => {
    if (!exportData.length) return;
    
    let text = `*سجل دراسات الحالة المُجمع*\n`;
    text += `*التاريخ:* ${new Date().toLocaleDateString('ar-SA')}\n\n`;
    
    exportData.forEach((log, index) => {
       text += `*[${index + 1}] الطالب:* ${log.studentName} | ${log.studentGrade} / ${log.studentSection}\n`;
       text += `*نوع التقرير:* ${log.roleName} ${log.subject ? `(${log.subject})` : ''}\n`;
       text += `*تاريخ الدراسة:* ${new Date(log.timestamp).toLocaleDateString('ar-SA')}\n`;
       
       const flat = log.formData || {};
       let hasData = false;
       Object.keys(flat).forEach(key => {
           if(key.endsWith('_text')) {
              hasData = true;
           }
       });
       
       if (hasData || log.additionalDetails) {
         text += `يوجد تفاصيل تقييمية وملاحظات مسجلة للحالة.\n`;
       }
       
       text += `\n`;
    });

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm rtl font-arabic overflow-hidden">
      <div className="bg-slate-50 w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50 flex flex-col h-[95vh] sm:h-[90vh]">
        
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md px-6 py-5 border-b border-slate-100 flex justify-between items-center z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
               <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">نظام دراسة الحالة الشامل</h2>
              <p className="text-blue-600 text-xs sm:text-sm font-bold">توثيق ومتابعة تفصيلية للطلاب</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-2xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center shadow-sm"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-100 flex p-2 gap-2 z-10 shadow-sm">
           <button 
             onClick={() => setActiveTab('create')}
             className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-blue-50'}`}
           >
             <TrendingUp size={18} /> إنشاء دراسة تقييمية
           </button>
           <button 
             onClick={() => setActiveTab('view')}
             className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'view' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-blue-50'}`}
           >
             <Briefcase size={18} /> جدول دراسة الحالات
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          
          {activeTab === 'create' && (
            <div className="space-y-6 max-w-4xl mx-auto pb-20">
              {saveStatus.message && (
                 <div className={`p-4 rounded-2xl text-sm font-bold border shadow-sm ${saveStatus.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                   {saveStatus.message}
                 </div>
              )}

              {/* Student Search & Info Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="relative" ref={searchRef}>
                  <label className="block text-sm font-black text-slate-700 mb-2">اسم الطالب</label>
                  <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                        if(selectedStudent && e.target.value !== selectedStudent.name) setSelectedStudent(null);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="ابحث عن اسم الطالب من السجل..."
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 focus:border-blue-500 focus:bg-white h-[56px] px-12 appearance-none font-bold transition-all"
                    />
                  </div>
                  
                  {showSuggestions && filteredStudents.length > 0 && !selectedStudent && (
                    <div className="absolute top-full mt-2 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                      {filteredStudents.map(student => (
                        <div 
                          key={student.id} 
                          onClick={() => handleStudentSelect(student)}
                          className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-slate-800">{student.name}</p>
                            <p className="text-xs text-slate-500">{student.grade} - الشعبة {student.section}</p>
                          </div>
                          <ChevronLeft className="text-slate-400" size={16} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedStudent && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                      <div><span className="text-[10px] text-slate-400 font-bold block mb-1">الصف</span><p className="text-sm font-black text-slate-700">{selectedStudent.grade}</p></div>
                      <div><span className="text-[10px] text-slate-400 font-bold block mb-1">الشعبة</span><p className="text-sm font-black text-slate-700">{selectedStudent.section}</p></div>
                      <div><span className="text-[10px] text-slate-400 font-bold block mb-1">النوع</span><p className="text-sm font-black text-slate-700">{selectedStudent.gender}</p></div>
                      <div><span className="text-[10px] text-slate-400 font-bold block mb-1">السكن</span><p className="text-sm font-black text-slate-700">{selectedStudent.address || '-'}</p></div>
                      <div><span className="text-[10px] text-slate-400 font-bold block mb-1">العمل</span><p className="text-sm font-black text-slate-700">{selectedStudent.workOutside || '-'}</p></div>
                      <div className="col-span-2"><span className="text-[10px] text-slate-400 font-bold block mb-1">ولي الأمر</span><p className="text-sm font-black text-slate-700">{selectedStudent.guardianName || '-'}</p></div>
                      <div><span className="text-[10px] text-slate-400 font-bold block mb-1">هاتف والي الأمر</span><p className="text-sm font-black text-slate-700 dir-ltr text-right">{selectedStudent.guardianPhones?.[0] || '-'}</p></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div className={`transition-all duration-300 ${selectedStudent ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <label className="block text-sm font-black text-slate-700 mb-2">صفة المُقيِّم المستهدف</label>
                  <select 
                    value={evaluatorRole}
                    onChange={(e) => setEvaluatorRole(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 focus:border-blue-500 h-[56px] px-4 font-bold transition-all cursor-pointer"
                  >
                    <option value="">اختر صفة المُقيِّم للبدء...</option>
                    {ROLES.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>

                  {evaluatorRole === 'teacher' && selectedStudent && (
                    <div className="mt-4 animate-in fade-in">
                       <label className="block text-sm font-black text-slate-700 mb-2">المادة الدراسية</label>
                       <select 
                          value={selectedSubject}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-indigo-800 focus:border-indigo-500 h-[56px] px-4 font-bold transition-all cursor-pointer"
                        >
                          <option value="">اختر المادة...</option>
                          {getSubjectsForGrade(selectedStudent.grade).map((sub, i) => (
                            <option key={i} value={sub}>{sub}</option>
                          ))}
                        </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Assessment Fields */}
              <div className={`transition-all duration-300 ${evaluatorRole ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4 pointer-events-none hidden'}`}>
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">1</span>
                     <h3 className="text-lg font-black text-slate-800">المعايير المخصصة والتقييم</h3>
                  </div>

                  {fields.map((f, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                      <label className="block text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                        {f.label}
                      </label>
                      
                      {f.type === 'select' ? (
                        <select
                          value={formData[f.key]?.text || ''}
                          onChange={(e) => handleFormDataChange(f.key, 'text', e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 focus:border-blue-500 h-[56px] px-4 font-bold"
                        >
                           <option value="">اختر...</option>
                           {f.options?.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <div className="space-y-4">
                          {!f.noRating && (
                            <div className="flex flex-wrap gap-2">
                              {RATINGS.map(rating => {
                                const isSelected = formData[f.key]?.rating === rating.id;
                                return (
                                  <button
                                    key={rating.id}
                                    onClick={() => handleFormDataChange(f.key, 'rating', rating.id)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all ${isSelected ? rating.color + ' text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                  >
                                    {rating.id}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <textarea
                            value={formData[f.key]?.text || ''}
                            onChange={(e) => handleFormDataChange(f.key, 'text', e.target.value)}
                            placeholder={`أدخل تفاصيل وملاحظات ${f.label} مع الشرح...`}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 focus:border-blue-500 p-4 font-medium min-h-[100px] resize-y"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 shadow-sm mt-8">
                     <label className="block text-base font-black text-indigo-900 mb-3 flex items-center gap-2">
                       <CheckCircle2 size={20} className="text-indigo-500" />
                       تفاصيل إضافية / إجراءات مخصصة
                     </label>
                     <textarea 
                       value={additionalDetails}
                       onChange={(e) => setAdditionalDetails(e.target.value)}
                       placeholder="سجل أي ملاحظات واسعة، الإجراءات التي تم اتخاذها، أو التوصيات المستقبلية..."
                       className="w-full bg-white border-2 border-indigo-100 rounded-2xl text-slate-800 focus:border-indigo-400 p-4 font-medium min-h-[140px] resize-y shadow-inner"
                     />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'view' && (
             <div className="max-w-7xl mx-auto space-y-6">
               {/* Filters */}
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                   <div>
                     <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">من تاريخ</label>
                     <input type="date" value={filterDateFrom} onChange={e=>setFilterDateFrom(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 font-bold focus:border-blue-500" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">إلى تاريخ</label>
                     <input type="date" value={filterDateTo} onChange={e=>setFilterDateTo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 font-bold focus:border-blue-500" />
                   </div>
                   <div className="relative">
                     <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">تصفية بأسماء الطلاب</label>
                     <input 
                       type="text" 
                       value={filterStudentsQuery} 
                       onChange={e=>setFilterStudentsQuery(e.target.value)} 
                       placeholder="اكتب لإضافة أسماء..."
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 font-bold focus:border-blue-500"
                     />
                     {filteredFilterStudents.length > 0 && filterStudentsQuery && (
                       <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                         {filteredFilterStudents.map(s => (
                           <div 
                             key={s.id} 
                             onClick={() => {
                               if(!selectedFilterStudents.includes(s.name)) {
                                 setSelectedFilterStudents([...selectedFilterStudents, s.name]);
                               }
                               setFilterStudentsQuery('');
                             }}
                             className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 font-bold text-sm"
                           >
                             {s.name}
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 </div>
                 {/* Selected student chips */}
                 {selectedFilterStudents.length > 0 && (
                   <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                     {selectedFilterStudents.map(s => (
                       <span key={s} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                         {s}
                         <X size={14} className="cursor-pointer hover:text-blue-900" onClick={() => setSelectedFilterStudents(prev => prev.filter(x => x !== s))} />
                       </span>
                     ))}
                   </div>
                 )}
                 {/* Toolbar Actions */}
                 <div className="flex flex-wrap gap-3 pt-6 mt-4 border-t border-slate-100 justify-end">
                   <button onClick={() => handleExport(filteredLogs)} className="px-6 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-100">
                     <FileSpreadsheet size={18} />تصدير المخرجات Excel
                   </button>
                   <button onClick={() => handleShareAll(filteredLogs)} className="px-6 py-2.5 bg-green-50 text-green-700 rounded-xl font-bold flex items-center gap-2 hover:bg-green-100">
                     <Share2 size={18} />إرسال واتساب للجميع
                   </button>
                 </div>
               </div>

               {/* The Table View */}
               {isLoadingLogs ? (
                 <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                   <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                   <p className="font-bold animate-pulse">جاري جلب سجل دراسات الحالة...</p>
                 </div>
               ) : (
                 <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                   <div className="overflow-x-auto min-h-[400px]">
                     <table className="w-full text-right text-sm">
                       <thead className="bg-slate-50 text-slate-500 font-bold">
                         <tr>
                           <th className="p-4 rounded-tr-3xl">الطالب</th>
                           <th className="p-4">الصف</th>
                           <th className="p-4">صفة المقييم</th>
                           <th className="p-4">التاريخ</th>
                           <th className="p-4">المدخل</th>
                           <th className="p-4 text-center rounded-tl-3xl">إجراءات</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {filteredLogs.length === 0 ? (
                           <tr>
                             <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                               لا توجد دراسات حالة مسجلة تطابق بحثك.
                             </td>
                           </tr>
                         ) : filteredLogs.map((log) => {
                           const isExpanded = expandedRows[log.id];
                           return (
                             <React.Fragment key={log.id}>
                               {/* Row 1: Summary */}
                               <tr className={`hover:bg-blue-50/50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                                 <td className="p-4 font-black text-slate-800">
                                   <button 
                                      onClick={() => setExpandedRows(prev => ({...prev, [log.id]: !prev[log.id]}))}
                                      className="flex items-center gap-2 hover:text-blue-600 outline-none"
                                   >
                                      <div className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                      </div>
                                      {log.studentName}
                                   </button>
                                 </td>
                                 <td className="p-4 font-bold text-slate-600">{log.studentGrade} / {log.studentSection}</td>
                                 <td className="p-4 font-bold text-blue-700">{log.roleName} {log.subject ? `(${log.subject})` : ''}</td>
                                 <td className="p-4 font-bold text-slate-500">{new Date(log.timestamp).toLocaleDateString('ar-SA')}</td>
                                 <td className="p-4 text-xs font-bold text-slate-400">{log.userName}</td>
                                 <td className="p-4 flex items-center justify-center gap-2">
                                   <button 
                                     onClick={() => window.open(`https://wa.me/?text=${generateWhatsAppText(log)}`, '_blank')}
                                     className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-colors"
                                     title="إرسال واتساب"
                                   >
                                      <Share2 size={16} />
                                   </button>
                                   {(currentUser?.role === 'admin' || currentUser?.id === log.userId) && (
                                     <button 
                                       onClick={() => handleDelete(log.id)}
                                       className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                                       title="حذف السجل"
                                     >
                                        <Trash2 size={16} />
                                     </button>
                                   )}
                                 </td>
                               </tr>
                               {/* Row 2: Comprehensive Details (Expanded) */}
                               {isExpanded && (
                                 <tr className="bg-slate-50/80 border-t-0 shadow-inner">
                                   <td colSpan={6} className="p-6">
                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                       {Object.keys(log.formData || {}).filter(k=>k.endsWith('_text')).map(textKey => {
                                          const mainKey = textKey.replace('_text', '');
                                          const rating = log.formData[`${mainKey}_rating`];
                                          const text = log.formData[textKey];
                                          return (
                                            <div key={mainKey} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                                              {rating && (
                                                <span className={`self-start text-[10px] font-black px-2 py-1 rounded-lg ${RATINGS.find(r=>r.id===rating)?.text || 'bg-slate-100 text-slate-600'}`}>
                                                  {rating}
                                                </span>
                                              )}
                                              <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>
                                            </div>
                                          );
                                       })}
                                       {log.additionalDetails && (
                                         <div className="col-span-full bg-blue-50/50 p-4 rounded-2xl border border-blue-200 shadow-sm">
                                            <h4 className="text-xs font-black text-blue-800 mb-2">إجراءات مخصصة وتفاصيل</h4>
                                            <p className="text-sm font-bold text-slate-700 whitespace-pre-wrap">{log.additionalDetails}</p>
                                         </div>
                                       )}
                                       {/* Also display basic static fields saved under student info */}
                                       <div className="col-span-full border-t border-slate-300/50 pt-4 mt-2">
                                          <div className="flex gap-4 text-xs font-bold text-slate-500">
                                             <span><b className="text-slate-800">ولي الأمر:</b> {log.guardianName}</span>
                                             <span><b className="text-slate-800">هاتف:</b> {log.guardianPhone}</span>
                                             <span><b className="text-slate-800">السكن:</b> {log.studentAddress}</span>
                                             <span><b className="text-slate-800">العمل:</b> {log.studentWork}</span>
                                          </div>
                                       </div>
                                     </div>
                                   </td>
                                 </tr>
                               )}
                             </React.Fragment>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}
             </div>
          )}
        </div>

        {/* Action Buttons (Only for Create Tab) */}
        {activeTab === 'create' && (
          <div className="bg-white/80 backdrop-blur-md p-4 sm:px-6 sm:py-5 border-t border-slate-100 z-20 sticky bottom-0">
             <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3">
               <button 
                 onClick={handleSave}
                 disabled={isSubmitting || !selectedStudent || !evaluatorRole}
                 className="flex-1 min-h-[56px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-lg rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
               >
                 <Save size={24} /> حفظ تقييم الحالة
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseStudyModal;
