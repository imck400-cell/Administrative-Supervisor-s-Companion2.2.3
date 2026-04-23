import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Save, Printer, Star, Edit, ChevronLeft } from 'lucide-react';
import { useGlobal } from '../context/GlobalState';

interface CourseEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultSchema = [
  {
    id: 'general_info',
    title: 'أولاً: المعلومات العامة',
    icon: 'User',
    theme: 'blue',
    fields: [
      { id: 'trainee_name', type: 'text', label: 'اسم المتدرب' },
      { id: 'job_title', type: 'text', label: 'المسمى الوظيفي' },
      { id: 'impactful_program', type: 'text', label: 'اسم البرنامج التدريبي الأكثر تأثيراً' }
    ]
  },
  {
    id: 'scientific_content',
    title: 'ثانياً: تقييم المحتوى العلمي والبرامج',
    description: '(مقياس من 1 إلى 5)',
    icon: 'BookOpen',
    theme: 'emerald',
    fields: [
      { id: 'goals_clarity', type: 'rating', label: 'مدى وضوح أهداف البرامج التدريبية الأربعة.' },
      { id: 'related_tasks', type: 'rating', label: 'ارتباط محتوى الدورة بالمهام الإدارية الواقعية في المدرسة.' },
      { id: 'theory_practice_balance', type: 'rating', label: 'التوازن بين الجانب النظري والتطبيقي خلال الأيام الثمانية.' },
      { id: 'time_adequacy', type: 'rating', label: 'كفاية الوقت المخصص لكل برنامج (من الثامنة والثلث حتى الواحدة ظهراً).' }
    ]
  },
  {
    id: 'trainers_performance',
    title: 'ثالثاً: تقييم الأداء التدريبي',
    icon: 'Star',
    theme: 'amber',
    fields: [
      { id: 'communication_skills', type: 'rating', label: 'قدرة المدربين على إيصال المعلومات بأسلوب سلس.' },
      { id: 'interaction', type: 'rating', label: 'مدى تفاعل المدربين مع استفسارات المشاركين (الـ 23 متدرباً).' },
      { id: 'tools_usage', type: 'rating', label: 'استخدام الوسائل التعليمية والتقنيات الحديثة في العرض.' }
    ]
  },
  {
    id: 'equipments_services',
    title: 'رابعاً: التجهيزات والخدمات',
    icon: 'Coffee',
    theme: 'purple',
    fields: [
      { id: 'training_env', type: 'rating', label: 'بيئة التدريب: ملاءمة القاعة من حيث (الإضاءة، التهوية، التجهيزات التقنية).' },
      { id: 'breaks_quality', type: 'rating', label: 'الفترات الاستراحة: كفاية وقت الاستراحة وجودة الضيافة المقدمة.' },
      { id: 'gifts_impact', type: 'rating', label: 'الهدايا والتحفيز: أثر الهدايا والمواد العينية في تعزيز روح المشاركة.' },
      { id: 'general_org', type: 'rating', label: 'التنظيم العام: دور مسؤول الدورة في تذليل الصعوبات وإدارة الجدول الزمني.' }
    ]
  },
  {
    id: 'impact_results',
    title: 'خامساً: قياس الأثر والنتائج',
    icon: 'Activity',
    theme: 'rose',
    fields: [
      { id: 'acquired_skill', type: 'textarea', label: 'ما هي أهم مهارة اكتسبتها وتخطط لتطبيقها في عملك الإداري للعام القادم؟' },
      { id: 'performance_improvement', type: 'select', label: 'هل تشعر أن هذه الدورة ستساهم في تحسين مستوى الأداء العام لمدارس الرائد؟', options: ['نعم', 'إلى حد ما', 'لا'] },
      { id: 'general_satisfaction', type: 'star_rating', label: 'مدى رضاك العام عن الدورة كحزمة متكاملة.' }
    ]
  },
  {
    id: 'open_questions',
    title: 'سادساً: أسئلة مفتوحة',
    description: '(للتطوير المستقبلي)',
    icon: 'MessageSquare',
    theme: 'indigo',
    fields: [
      { id: 'distinctive_points', type: 'textarea', label: 'ما هي النقاط التي تميزت بها هذه الدورة عن غيرها؟' },
      { id: 'improvement_suggestions', type: 'textarea', label: 'ما هي المقترحات التي تراها مناسبة لتحسين "أوقات الاستراحة" أو "التجهيزات" في الدورات القادمة؟' },
      { id: 'future_topics', type: 'textarea', label: 'هل هناك مواضيع إدارية معينة تقترح إدراجها في برامج تدريبية مستقبلية؟' }
    ]
  }
];

export const CourseEvaluationModal: React.FC<CourseEvaluationModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useGlobal();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [schema, setSchema] = useState(() => {
    try {
      const saved = localStorage.getItem('courseEvaluationSchema');
      return saved ? JSON.parse(saved) : defaultSchema;
    } catch {
      return defaultSchema;
    }
  });
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('courseEvaluationSchema', JSON.stringify(schema));
  }, [schema]);

  // Check if user has permission to edit schema
  const trainingPerm = currentUser?.permissions?.trainingCourses;
  const isGeneralSupervisor = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
  const canEditSchema = isGeneralSupervisor || (Array.isArray(trainingPerm) && trainingPerm.includes('editSchema'));

  useEffect(() => {
    if (isOpen) {
      setFormData({});
      setIsSubmitted(false);
      setIsEditMode(false);
    }
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = () => {
    // In a real app, send to database here
    setIsSubmitted(true);
  };

  const handleFieldChange = (id: string, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Schema Editing Handlers
  const handleUpdateSectionTitle = (sIdx: number, newTitle: string) => {
    const newSchema = [...schema];
    newSchema[sIdx].title = newTitle;
    setSchema(newSchema);
  };

  const handleUpdateFieldLabel = (sIdx: number, fIdx: number, newLabel: string) => {
    const newSchema = [...schema];
    newSchema[sIdx].fields[fIdx].label = newLabel;
    setSchema(newSchema);
  };

  const handleRemoveField = (sIdx: number, fIdx: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المعيار/السؤال؟')) return;
    const newSchema = [...schema];
    newSchema[sIdx].fields.splice(fIdx, 1);
    setSchema(newSchema);
  };

  const handleAddField = (sIdx: number) => {
    const newSchema = [...schema];
    const type = window.prompt("نوع الحقل (text, textarea, rating, select, star_rating):", "rating");
    if (!type) return;
    const label = window.prompt("نص السؤال:");
    if (!label) return;
    
    const newField: any = {
      id: `custom_${Date.now()}`,
      type,
      label
    };
    if (type === 'select') {
      newField.options = ['نعم', 'إلى حد ما', 'لا'];
    }
    newSchema[sIdx].fields.push(newField);
    setSchema(newSchema);
  };

  const handleRemoveSection = (sIdx: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه البطاقة بالكامل؟')) return;
    const newSchema = [...schema];
    newSchema.splice(sIdx, 1);
    setSchema(newSchema);
  };

  const handleAddSection = () => {
    const title = window.prompt("عنوان البطاقة الجديدة:");
    if (!title) return;
    const newSchema = [...schema];
    newSchema.push({
      id: `custom_section_${Date.now()}`,
      title,
      icon: 'Star',
      theme: 'blue',
      fields: []
    });
    setSchema(newSchema);
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
            className={`relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col my-auto PrintSection ${isSubmitted ? 'h-auto' : ''}`}
          >
            {isSubmitted ? (
               <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
                 <motion.div 
                   initial={{ scale: 0 }} 
                   animate={{ scale: 1 }} 
                   className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4"
                 >
                   <Check size={48} strokeWidth={3} />
                 </motion.div>
                 <h2 className="text-3xl font-black text-slate-800">
                   شكراً لك، {formData['trainee_name'] || 'أستاذي الكريم'}!
                 </h2>
                 <p className="text-xl text-slate-600">تم حفظ تقييمك بنجاح، نقدر وقتك ومساهمتك في التطوير.</p>
                 <div className="flex gap-4 mt-8 pt-8 border-t border-slate-100 w-full justify-center">
                   <button 
                     onClick={() => setIsSubmitted(false)}
                     className="px-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                   >
                     العودة للتعديل
                   </button>
                   <button 
                     onClick={onClose}
                     className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                   >
                     حفظ وإغلاق
                   </button>
                 </div>
               </div>
            ) : (
              <>
                <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 p-6 flex items-center justify-between z-10 rounded-t-3xl hide-on-print">
                  <div className="flex items-center gap-4">
                     <button
                       onClick={onClose}
                       className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                     >
                       <X size={24} />
                     </button>
                     <h2 className="text-2xl font-black text-slate-800">تقييم الدورة التدريبية</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {canEditSchema && (
                      <button 
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-4 py-2 flex items-center gap-2 rounded-xl font-bold transition-all ${isEditMode ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <Edit size={18} /> {isEditMode ? 'إلغاء التعديل' : 'تعديل المعايير'}
                      </button>
                    )}
                    <button 
                      onClick={handlePrint}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 flex items-center gap-2"
                      title="طباعة النموذج"
                    >
                      <Printer size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto space-y-8 bg-slate-50">
                   {schema.map((section, sIdx) => (
                     <div key={section.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 print-break-inside-avoid">
                        <div className="flex items-start justify-between mb-6">
                           <div className="flex-1">
                             {isEditMode ? (
                               <input 
                                 type="text" 
                                 value={section.title} 
                                 onChange={(e) => handleUpdateSectionTitle(sIdx, e.target.value)}
                                 className="w-full text-xl font-black text-slate-800 bg-slate-50 border-2 border-indigo-100 rounded-lg px-3 py-1 outline-none mb-1"
                               />
                             ) : (
                               <h3 className="text-xl font-black text-slate-800">{section.title}</h3>
                             )}
                             {section.description && <span className="text-sm font-bold text-slate-400 block mt-1">{section.description}</span>}
                           </div>
                           {isEditMode && (
                             <button onClick={() => handleRemoveSection(sIdx)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg mr-2 transition-colors">
                               <X size={20} />
                             </button>
                           )}
                        </div>

                        <div className="space-y-6">
                          {section.fields.map((field, fIdx) => (
                            <div key={field.id} className="space-y-3 relative group/field">
                              {isEditMode && (
                                <button onClick={() => handleRemoveField(sIdx, fIdx)} className="absolute left-[-16px] top-0 text-red-500 opacity-0 group-hover/field:opacity-100 transition-opacity">
                                  <X size={16} />
                                </button>
                              )}
                              {isEditMode ? (
                                <input 
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => handleUpdateFieldLabel(sIdx, fIdx, e.target.value)}
                                  className="w-full block text-slate-700 font-bold bg-slate-50 border-2 border-indigo-100 rounded-lg px-3 py-1 outline-none"
                                />
                              ) : (
                                <label className="block text-slate-700 font-bold">{field.label}</label>
                              )}
                              
                              {field.type === 'text' && (
                                <input 
                                  type="text" 
                                  value={formData[field.id] || ''}
                                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                                />
                              )}

                              {field.type === 'textarea' && (
                                <textarea 
                                  value={formData[field.id] || ''}
                                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all min-h-[100px]"
                                />
                              )}

                              {field.type === 'rating' && (
                                <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                                  {[1, 2, 3, 4, 5].map(num => (
                                    <button
                                      key={num}
                                      onClick={() => handleFieldChange(field.id, num)}
                                      className={`w-12 h-12 md:w-14 md:h-14 rounded-full font-black text-lg flex items-center justify-center transition-all ${
                                        formData[field.id] === num 
                                          ? `bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110` 
                                          : `bg-slate-100 text-slate-500 hover:bg-slate-200`
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {field.type === 'select' && (
                                <div className="flex gap-3 flex-wrap">
                                  {field.options?.map(opt => (
                                    <button
                                      key={opt}
                                      onClick={() => handleFieldChange(field.id, opt)}
                                      className={`px-6 py-3 rounded-xl font-bold transition-all ${
                                        formData[field.id] === opt
                                          ? `bg-blue-600 text-white shadow-md`
                                          : `bg-slate-100 text-slate-600 hover:bg-slate-200`
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {field.type === 'star_rating' && (
                                <div className="flex items-center gap-2">
                                  {[1, 2, 3, 4, 5].map(num => (
                                    <button
                                      key={num}
                                      onClick={() => handleFieldChange(field.id, num)}
                                      className="p-2 transition-transform hover:scale-110"
                                    >
                                      <Star 
                                        size={36} 
                                        className={formData[field.id] >= num ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'} 
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}

                            </div>
                          ))}
                          
                          {isEditMode && (
                             <button
                               onClick={() => handleAddField(sIdx)}
                               className="mt-4 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors w-full border-2 border-dashed border-indigo-200"
                             >
                               + إضافة معيار / سؤال جديد
                             </button>
                          )}
                        </div>
                     </div>
                   ))}

                   {isEditMode && (
                     <button
                       onClick={handleAddSection}
                       className="w-full py-6 text-lg font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-3xl transition-colors border-4 border-dashed border-indigo-200"
                     >
                       + إضافة بطاقة جديدة
                     </button>
                   )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex justify-center hide-on-print rounded-b-3xl">
                  <button 
                    onClick={handleSubmit}
                    className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all hover:-translate-y-1"
                  >
                    <Save size={24} />
                    إرسال وحفظ التقييم
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default CourseEvaluationModal;
