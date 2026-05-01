import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, ListTodo, Star, FileSpreadsheet } from 'lucide-react';
import { useGlobal } from '../context/GlobalState';
import { toast } from 'sonner';
import { SelfEvaluationView } from './SelfEvaluationView';
import { StudentEvaluationView } from './StudentEvaluationView';

export const TeacherPortalPage = () => {
  const { lang, currentUser } = useGlobal();
  const [activeView, setActiveView] = useState<'menu' | 'selfEval' | 'studentEval'>('menu');

  const handleNotImplemented = () => {
    toast.info(lang === 'ar' ? 'هذه الخاصية قيد التطوير' : 'Feature under development');
  };

  const isReadOnly = currentUser?.permissions?.readOnly === true;

  if (activeView === 'selfEval') {
    return <SelfEvaluationView onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'studentEval') {
    return <StudentEvaluationView onBack={() => setActiveView('menu')} />;
  }

  const buttons = [
    {
      id: 'self-eval',
      label: lang === 'ar' ? 'التقييم الذاتي' : 'Self Evaluation',
      color: 'bg-blue-600 shadow-blue-200 hover:bg-blue-700',
      icon: <CheckSquare size={48} className="mb-4 opacity-80" />,
      onClick: () => setActiveView('selfEval')
    },
    {
      id: 'daily-tasks',
      label: lang === 'ar' ? 'المهام اليومية' : 'Daily Tasks',
      color: 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700',
      icon: <ListTodo size={48} className="mb-4 opacity-80" />,
      onClick: handleNotImplemented
    },
    {
      id: 'student-eval',
      label: lang === 'ar' ? 'تقييم الطلاب' : 'Student Evaluation',
      color: 'bg-amber-500 shadow-amber-200 hover:bg-amber-600',
      icon: <Star size={48} className="mb-4 opacity-80" />,
      onClick: () => setActiveView('studentEval')
    },
    {
      id: 'grades',
      label: lang === 'ar' ? 'كشف الدرجات' : 'Grades Sheet',
      color: 'bg-purple-600 shadow-purple-200 hover:bg-purple-700',
      icon: <FileSpreadsheet size={48} className="mb-4 opacity-80" />,
      onClick: handleNotImplemented
    }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 font-arabic">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800">
            {lang === 'ar' ? 'خاص بالمعلم' : 'Teacher Portal'}
          </h1>
          <p className="text-slate-500 font-bold mt-2">
            {lang === 'ar' ? 'مساحة المعلم وإدارة المهام والتقييمات' : 'Teacher workspace and quick actions'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {buttons.map((btn, index) => (
          <motion.button
            key={btn.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={btn.onClick}
            className={`${btn.color} text-white p-8 rounded-[2rem] shadow-xl flex flex-col items-center justify-center transition-all transform hover:-translate-y-2 group`}
          >
            <div className="group-hover:scale-110 transition-transform duration-300">
              {btn.icon}
            </div>
            <span className="text-2xl font-black">{btn.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
