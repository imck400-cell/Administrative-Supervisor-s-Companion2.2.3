import React from 'react';
import { useGlobal } from '../context/GlobalState';
import { 
  Building, CheckCircle2, ShieldCheck, Cog, 
  MessageCircle, Mail, ArrowRight, HeartHandshake,
  Bot, Clock, Users, FileSignature, CheckCircle
} from 'lucide-react';

interface AboutProgramPageProps {
  onBack: () => void;
}

const AboutProgramPage: React.FC<AboutProgramPageProps> = ({ onBack }) => {
  const { data } = useGlobal();
  const profile = data?.profile || {};

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12" dir="rtl">
      
      {/* Header / Back */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-2xl transition-all"
          >
            <ArrowRight size={24} />
          </button>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">التعريف بالبرنامج</h2>
        </div>
      </div>

      {/* القسم الأول: الهوية والرسالة */}
      <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
        
        {profile.logoImg ? (
          <img src={profile.logoImg} alt="شعار البرنامج" className="w-32 h-32 object-contain mb-8 animate-in zoom-in" />
        ) : (
          <div className="w-32 h-32 bg-blue-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-lg mb-8">
            <Bot size={64} className="text-blue-600" />
          </div>
        )}
        
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
          رفيقك في كتابة التقارير
        </h1>
        <p className="text-xl md:text-2xl font-bold text-slate-500 max-w-2xl leading-relaxed">
          الحل التقني الشامل للإدارة المدرسية الحديثة.. وبديلك الأمثل للأدبيات الورقية
        </p>
      </div>

      {/* القسم الثاني: الميزات الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 xl:col-span-1 border-b-4 border-b-blue-400 hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <FileSignature size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">إدارة شاملة وسريعة</h3>
          <p className="text-slate-500 font-bold leading-relaxed">إدارة شاملة وسريعة لجميع التقارير الإدارية بشكل رقمي.</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 xl:col-span-1 border-b-4 border-b-emerald-400 hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">أتمتة شؤون الطلاب</h3>
          <p className="text-slate-500 font-bold leading-relaxed">أتمتة شؤون الطلاب وتسهيل متابعتهم اليومية باحترافية.</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 xl:col-span-1 border-b-4 border-b-purple-400 hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">متابعة دقيقة للمعلمين</h3>
          <p className="text-slate-500 font-bold leading-relaxed">أدوات دقيقة وعملية لمتابعة وتقييم أداء المعلمين بشكل دوري.</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 xl:col-span-1 border-b-4 border-b-amber-400 hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
            <Clock size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">توفير الوقت والجهد</h3>
          <p className="text-slate-500 font-bold leading-relaxed">توفير الوقت والجهد، وخلق بيئة عمل لا ورقية ومتطورة.</p>
        </div>
      </div>

      {/* القسم الثالث: رسالة الموثوقية */}
      <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900 pointer-events-none -z-10" />
        <HeartHandshake className="w-20 h-20 text-amber-400 mx-auto mb-8 opacity-90" />
        <p className="text-xl md:text-2xl text-slate-300 font-bold leading-loose max-w-4xl mx-auto">
          "هذا البرنامج ليس مجرد أداة تقنية، بل هو ثمرة خبرة ميدانية واستشارية في المجال التربوي والإداري <span className="text-white">تتجاوز عشرين عاماً</span>، وتمت استشارة كبار الخبراء والمستشارين في هذا المجال، فالبرنامج صُمم خصيصاً <span className="text-emerald-400">ليفهم احتياجات القائد والمشرف والمعلم ويلبيها بدقة واحترافية</span>."
        </p>
      </div>

      {/* القسم الرابع: قنوات التواصل والدعم */}
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 text-center">
        <h3 className="text-2xl font-black text-slate-800 mb-8">هل لديك استفسار؟ نحن هنا لمساعدتك واكتشاف المزيد</h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <a
            href="https://wa.me/967780804012"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-10 py-5 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-[2rem] font-black text-xl transition-all shadow-lg shadow-[#25D366]/30 flex items-center justify-center gap-3 active:scale-95"
          >
            <MessageCircle size={28} />
            تواصل معنا مباشرة
          </a>
          <a
            href="mailto:imck232@gmail.com"
            className="w-full sm:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-95"
          >
            <Mail size={28} />
            راسلنا للاستفسار
          </a>
        </div>
      </div>

      {/* القسم الخامس: التذييل */}
      <div className="text-center pt-8 pb-4">
        <div className="inline-flex flex-col items-center justify-center gap-2">
          <span className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-full text-sm font-black border border-slate-300">
            الإصدار 2.2.3
          </span>
          <p className="text-slate-500 font-bold mt-2">
            جميع الحقوق محفوظة © [1447 هـ / 2026 م]
          </p>
        </div>
      </div>

    </div>
  );
};

export default AboutProgramPage;
