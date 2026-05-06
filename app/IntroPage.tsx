import React from 'react';
import { motion } from 'framer-motion';
import { useGlobal } from '../context/GlobalState';
import { PlayCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface IntroPageProps {
  onEnter: () => void;
}

const IntroPage: React.FC<IntroPageProps> = ({ onEnter }) => {
  const { currentUser } = useGlobal();

  return (
    <div className="flex flex-col items-center justify-between min-h-[70vh] w-full p-4 relative font-arabic" dir="rtl">
      
      {/* The main content area with the image */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl relative z-10 my-8">
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="w-full relative flex items-center justify-center"
        >
          {/* Fallback container if image fails to load */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center -z-10 bg-slate-50/80 rounded-[2rem] border-2 border-dashed border-slate-300 min-h-[40vh]">
             <p className="font-bold text-lg mb-2">جاري تحميل الصورة...</p>
             <p className="text-sm">يتم الآن جلب الصورة من الرابط الخاص بك.</p>
          </div>
          <img 
            src="https://drive.google.com/uc?export=view&id=1JiOCva_cp4sb7nEQufr5NpQGXMyc7nnc" 
            alt="ترحيب البرنامج" 
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-[65vh] lg:max-h-[75vh] object-contain rounded-[2rem] shadow-2xl border-4 border-white z-10 block transition-all"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </motion.div>
      </div>

      {/* The bottom buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-center gap-6 mt-auto pb-8 z-20"
      >
        <button
          onClick={onEnter}
          className="w-full sm:w-auto px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3"
        >
          <PlayCircle size={32} />
          الدخول إلى البرنامج
        </button>

        <button
          onClick={() => {
            toast.info('التعريف بالبرنامج', {
              description: 'هذه الخاصية قيد التنفيذ حالياً'
            });
            alert('قيد التنفيذ');
          }}
          className="w-full sm:w-auto px-8 py-5 bg-white border-2 border-slate-200 text-slate-700 rounded-[2rem] font-black text-xl hover:border-slate-300 hover:bg-slate-50 shadow-md transition-all flex items-center justify-center gap-3"
        >
          <Info size={28} className="text-slate-500" />
          التعريف بالبرنامج
        </button>
      </motion.div>
    </div>
  );
};

export default IntroPage;
