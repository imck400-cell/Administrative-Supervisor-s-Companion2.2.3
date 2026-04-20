import React, { useState, useMemo, useEffect } from 'react';
import { X, Save, AlertCircle, List, PlusCircle, Trash2, Calendar, User, Clock } from 'lucide-react';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useGlobal } from '../context/GlobalState';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const issuesDictionary = {
  "شؤون الطلاب (السلوك والانضباط)": {
    problems: [
      "كثرة الغياب والتأخر الصباحي / الفوضى",
      "مخالفة الزي المدرسي والمظهر العام",
      "سلوكيات سلبية (تنمر، عدوانية، سرقة، إتلاف ممتلكات)",
      "استخدام الهواتف المحمولة / ضعف الانضباط الصفي",
      "ضعف الدافعية واللامبالاة / إهمال الواجبات",
      "تدني المستوى التعليمي / صعوبات تعلم"
    ],
    solutions: [
      "استدعاء ولي الأمر وتوقيع تعهد أو عقد سلوكي",
      "إحالة الطالب للموجه الطلابي لإعداد خطة تعديل سلوك",
      "تفعيل لوحة التعزيز الإيجابي والإذاعة المدرسية",
      "مصادرة الهاتف وإلزام الطالب بلائحة الانضباط",
      "إعداد خطة علاجية أكاديمية بالتنسيق مع المعلم",
      "دمج الطالب في لجان الأنشطة لتحفيزه"
    ]
  },
  "الكادر التعليمي والإداري": {
    problems: [
      "كثرة غياب وتأخر المعلمات / تأخر التحضير",
      "ضعف الإدارة الصفية",
      "مقاومة التغيير والتطوير",
      "ضعف المهارات التقنية (الشاشات، الذكاء الاصطناعي)",
      "تداخل المهام / ضغط العمل ونهاية الشهر",
      "مشاكل العلاقات المهنية / ضعف التواصل مع الأهالي"
    ],
    solutions: [
      "عقد ورش عمل تدريبية داخلية",
      "عقد جلسات توجيه فردية (Coaching)",
      "إعادة صياغة التوصيف الوظيفي بوضوح",
      "تقنين الاجتماعات الإدارية لتقليل الضغط",
      "إصدار تعميم بضوابط بيئة العمل",
      "أتمتة التكليفات عبر النظام لتوفير الوقت"
    ]
  },
  "أولياء الأمور والبيئة الأسرية": {
    problems: [
      "ضعف المتابعة وعدم التجاوب / أمية الأهل",
      "التأخر في استلام الطلاب نهاية الدوام",
      "التعامل غير اللائق مع الإدارة",
      "مشاكل أسرية تؤثر على الطالب (عنف، إهمال)"
    ],
    solutions: [
      "إرسال إشعارات مسجلة وموثقة عبر النظام",
      "جدولة لقاءات دورية مفتوحة (مجالس أمهات/آباء)",
      "تكليف الموجه الطلابي بمتابعة الحالات الخاصة",
      "وضع آلية مالية مرنة لرسوم المدرسة",
      "إحالة حالات العنف للجهات المختصة"
    ]
  },
  "الشؤون التقنية والمادية": {
    problems: [
      "تعطل الأجهزة الأساسية (طابعات، شاشات، توصيلات)",
      "حاجة المبنى للصيانة",
      "الكثافة العددية العالية في الفصول",
      "نقص الوسائل التعليمية وموارد الأنشطة",
      "غياب مساحة مخصصة للإشراف التربوي"
    ],
    solutions: [
      "رفع تذكرة صيانة عاجلة للجهة المختصة",
      "توفير أجهزة بديلة (Standby)",
      "إعادة توزيع الطلاب لتقليل الكثافة",
      "تخصيص صندوق مصغر لوسائل المرحلة الثانوية",
      "جدولة استخدام غرف بديلة مؤقتاً"
    ]
  },
  "الشؤون التخصصية (الإرشاد والدمج)": {
    problems: [
      "عدم واقعية الخطة التشغيلية للمدرسة",
      "تحديات دمج الطلاب ذوي الاحتياجات الخاصة",
      "الحاجة لتدخل مختص نفسي للحالات المعقدة",
      "ضعف تفعيل المكتبة المدرسية",
      "غياب معايير موضوعية للجوائز التنافسية"
    ],
    solutions: [
      "تكييف الخطة لتتلاءم مع الموارد الفعلية",
      "إعداد استمارات متابعة دقيقة لذوي الاحتياجات",
      "التنسيق مع أخصائي نفسي زائر أو مركز متخصص",
      "إدراج حصص مكتبة أسبوعية إلزامية",
      "اعتماد لائحة معايير تقييم واضحة"
    ]
  }
};

const IssuesAndSolutionsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, data } = useGlobal();
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
  
  const [category, setCategory] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const [issuesRecord, setIssuesRecord] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const categories = Object.keys(issuesDictionary);
  const currentProblems = category ? issuesDictionary[category as keyof typeof issuesDictionary].problems : [];
  const currentSolutions = category ? issuesDictionary[category as keyof typeof issuesDictionary].solutions : [];

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      // For simplicity, just get all from this school, then filter in JS
      // Because we may need complex filtering for managed users
      const q = query(
        collection(db, 'issuesAndSolutions_log'), 
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filter by school in JS to avoid index errors
      const schoolDocs = docs.filter((d: any) => d.school === currentUser?.selectedSchool);
      
      const isAdmin = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
      const issuesPermRaw = currentUser?.permissions?.issuesModal;
      const canViewAll = Array.isArray(issuesPermRaw) && issuesPermRaw.includes('viewAllIssues');
      const managedIds = currentUser?.permissions?.managedUserIds || [];

      let filteredDocs = schoolDocs;
      if (!isAdmin && !canViewAll) {
        filteredDocs = schoolDocs.filter((d: any) => 
          d.userId === currentUser?.id || managedIds.includes(d.userId)
        );
      }
      
      setIssuesRecord(filteredDocs);
    } catch (err) {
      console.error('Error fetching issues: ', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'view') {
      fetchIssues();
    }
  }, [isOpen, activeTab, currentUser]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقرير؟')) return;
    try {
      await deleteDoc(doc(db, 'issuesAndSolutions_log', id));
      setIssuesRecord(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting document: ', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !problem || !solution) {
      setError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'issuesAndSolutions_log'), {
        category,
        problem_selected: problem,
        solution_selected: solution,
        additional_details: additionalDetails || '',
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'unknown_user',
        userName: currentUser?.name || 'مستخدم غير معروف',
        school: currentUser?.selectedSchool || '',
      });

      setSuccessMessage('تم حفظ التقرير بنجاح!');
      setTimeout(() => {
        setSuccessMessage('');
        setCategory('');
        setProblem('');
        setSolution('');
        setAdditionalDetails('');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error saving document: ', err);
      setError('حدث خطأ أثناء حفظ التقرير. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm rtl font-arabic overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b flex flex-col sm:flex-row sm:justify-between items-center sticky top-0 z-10 gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-blue-500" />
            المشكلات والحلول
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('create')}
              className={`flex-1 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <PlusCircle size={18} /> إضافة جديد
            </button>
            <button 
              onClick={() => setActiveTab('view')}
              className={`flex-1 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'view' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List size={18} /> سجل التقارير
            </button>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-xl transition-colors h-[48px] w-[48px] flex items-center justify-center hidden sm:flex"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'create' ? (
            successMessage ? (
              <div className="bg-emerald-50 text-emerald-600 p-6 rounded-2xl text-center border border-emerald-100 mb-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Save size={32} />
                </div>
                <p className="font-bold text-lg">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold border border-red-100">
                    {error}
                  </div>
                )}

              {/* Category Card */}
              <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-2">الفئة الرئيسية</label>
                <select 
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setProblem('');
                    setSolution('');
                  }}
                  className="w-full bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 h-[48px] px-4 appearance-none font-medium"
                >
                  <option value="">اختر الفئة الرئيسية...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Problem Card */}
              <div className={`transition-all duration-300 ${category ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-2 pointer-events-none'}`}>
                <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white shadow-sm">
                  <label className="block text-sm font-bold text-slate-700 mb-2">المشكلة</label>
                  <select 
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 h-[48px] px-4 appearance-none font-medium text-sm sm:text-base"
                    disabled={!category}
                  >
                    <option value="">اختر المشكلة...</option>
                    {currentProblems.map((prob, idx) => (
                      <option key={idx} value={prob}>{prob}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Solution Card */}
              <div className={`transition-all duration-300 ${category ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-2 pointer-events-none'}`}>
                <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white shadow-sm">
                  <label className="block text-sm font-bold text-slate-700 mb-2">الحل المقترح</label>
                  <select 
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 h-[48px] px-4 appearance-none font-medium text-sm sm:text-base"
                    disabled={!category}
                  >
                    <option value="">اختر الحل المقترح...</option>
                    {currentSolutions.map((sol, idx) => (
                      <option key={idx} value={sol}>{sol}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Additional Details Card */}
              <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-2">تفاصيل إضافية / إجراءات مخصصة</label>
                <textarea 
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  placeholder="أدخل أي تفاصيل إضافية هنا..."
                  className="w-full bg-slate-50 border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 p-4 font-medium min-h-[120px] resize-y"
                />
              </div>

            </form>
            )
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : issuesRecord.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-medium">لا توجد تقارير مسجلة حالياً</div>
              ) : (
                issuesRecord.map((record, idx) => (
                  <div key={idx} className="bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 rounded-r-3xl"></div>
                    <div className="flex justify-between items-start gap-4 mr-2">
                       <div className="space-y-1">
                          <span className="bg-blue-100 text-blue-700 text-xs font-black px-3 py-1 rounded-full">{record.category}</span>
                          <h3 className="font-bold text-slate-800 text-lg">{record.problem_selected}</h3>
                       </div>
                       {(currentUser?.role === 'admin' || record.userId === currentUser?.id) && (
                         <button onClick={() => handleDelete(record.id)} className="text-slate-400 hover:text-red-500 transition-colors bg-red-50/0 hover:bg-red-50 p-2 rounded-xl">
                           <Trash2 size={18} />
                         </button>
                       )}
                    </div>
                    
                    <div className="mr-2 bg-emerald-50 text-emerald-700 p-3 rounded-2xl border border-emerald-100">
                      <p className="text-sm font-bold flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> 
                         الحل: {record.solution_selected}
                      </p>
                    </div>

                    {record.additional_details && (
                       <p className="mr-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl whitespace-pre-wrap leading-relaxed border border-slate-100">
                         {record.additional_details}
                       </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium mr-2 mt-2 pt-3 border-t border-slate-100">
                       <div className="flex items-center gap-1.5">
                         <User size={14} className="text-slate-400" />
                         <span>{record.userName}</span>
                       </div>
                       <div className="flex items-center gap-1.5">
                         <Clock size={14} className="text-slate-400" />
                         <span dir="ltr">{new Date(record.timestamp).toLocaleString('ar-AE')}</span>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'create' && !successMessage && (
          <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-t sticky bottom-0">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full h-[48px] flex items-center justify-center gap-2 rounded-xl text-white font-bold text-lg transition-all ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} />
                  حفظ التقرير
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssuesAndSolutionsModal;
