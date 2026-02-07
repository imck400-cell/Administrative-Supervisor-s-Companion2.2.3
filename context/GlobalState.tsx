
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, AppData, TaskItem, TaskReport } from '../types';

interface GlobalContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  isAuthenticated: boolean;
  login: (pass: string) => boolean;
  logout: () => void;
}

const defaultMaxGrades = {
  attendance: 5,
  appearance: 5,
  preparation: 10,
  supervision_queue: 5,
  supervision_rest: 5,
  supervision_end: 5,
  correction_notebooks: 10,
  correction_books: 10,
  correction_followup: 10,
  teaching_aids: 10,
  extra_activities: 10,
  radio: 5,
  creativity: 5,
  zero_period: 5
};

export const defaultTaskTemplates: TaskItem[] = [
  // Daily Tasks
  { id: 'd1', category: 'daily', text: 'توثيق المهام اليومية في الأدوات' },
  { id: 'd2', category: 'daily', text: 'الرفع باحتياجات الدور ورقياً' },
  { id: 'd3', category: 'daily', text: 'التواصل بولي امر الطالب الغائب' },
  { id: 'd4', category: 'daily', text: 'حصر الأعمال الابداعية للمعلمين' },
  { id: 'd5', category: 'daily', text: 'متابعة الإشراف على الطابور' },
  { id: 'd6', category: 'daily', text: 'متابعة الإشراف على الراحة' },
  { id: 'd7', category: 'daily', text: 'متابعة الإشراف نهاية الدوام' },
  { id: 'd8', category: 'daily', text: 'متابعة خروج الطلاب من المدرسة' },
  { id: 'd9', category: 'daily', text: 'متابعة إذاعة الفصول اليومية' },
  { id: 'd10', category: 'daily', text: 'الاطلاع على دفاتر التحضير' },
  { id: 'd11', category: 'daily', text: 'متابعة جدول الحصص' },
  { id: 'd12', category: 'daily', text: 'تغطية الفصول بالمعلمين' },
  { id: 'd13', category: 'daily', text: 'متابعة المخالفات الطلابية' },
  { id: 'd14', category: 'daily', text: 'متابعة مخالفات الكادر' },
  { id: 'd15', category: 'daily', text: 'جلسات فردية لحل المشكلات' },
  { id: 'd16', category: 'daily', text: 'متابعة نظافة الدور' },
  { id: 'd17', category: 'daily', text: 'حل مشاكل أولياء الأمور' },
  { id: 'd18', category: 'daily', text: 'توثيق الأنشطة في الدور' },
  { id: 'd19', category: 'daily', text: 'إنزال الأنشطة في المجموعات' },
  { id: 'd20', category: 'daily', text: 'متابعة نظافة الدور وتهيئته' },
  { id: 'd21', category: 'daily', text: 'التوثيق في سجل مخالفات الطلاب' },
  { id: 'd22', category: 'daily', text: 'التوثيق في سجل تعهدات الطلاب' },
  { id: 'd23', category: 'daily', text: 'توثيق الطلاب المصرح لهم بالخروج' },
  { id: 'd24', category: 'daily', text: 'متابعة المتأخرين عن الحصة الأولى' },
  // Weekly Tasks
  { id: 'w1', category: 'weekly', text: 'تسليم التقرير الأسبوعي' },
  { id: 'w2', category: 'weekly', text: 'استقبال أولياء الأمور' },
  { id: 'w3', category: 'weekly', text: 'الزيارة الصفية للطلاب' },
  { id: 'w4', category: 'weekly', text: 'متابعة دفتر الحصة والواجب والمتابعة' },
  { id: 'w5', category: 'weekly', text: 'التواصل بولي امر الطالب المتميز' },
  { id: 'w6', category: 'weekly', text: 'التواصل بولي امر الطالب الضعيف' },
  { id: 'w7', category: 'weekly', text: 'متابعة تفعيل الريادة' },
  { id: 'w8', category: 'weekly', text: 'تفعيل لوحة الشرف والتميز' },
  { id: 'w9', category: 'weekly', text: 'رفع كشف المتفاعلين في الإشراف' },
  { id: 'w10', category: 'weekly', text: 'نزول ميداني لمتابعة البوفية' },
  { id: 'w11', category: 'weekly', text: 'تحفيز الطلاب المتميزين' },
  { id: 'w12', category: 'weekly', text: 'الرفع بكشف غياب الطلاب المتجاوز' },
  { id: 'w13', category: 'weekly', text: 'حصر الطلاب كثيري المشاكل' },
  { id: 'w14', category: 'weekly', text: 'تدوين الزيارات والرفع بأهمها' },
  { id: 'w15', category: 'weekly', text: 'تعليق أنشطة الدور على الجدار' },
  { id: 'w16', category: 'weekly', text: 'متابعة الزي والشعر والأظافر' },
  { id: 'w17', category: 'weekly', text: 'متابعة توظيف المساحات الجدارية' },
  // Monthly Tasks
  { id: 'm1', category: 'monthly', text: 'اعداد الخلاصة الشهرية' },
  { id: 'm2', category: 'monthly', text: 'تحفيز المعلمين المبدعين' },
  { id: 'm3', category: 'monthly', text: 'جمع كشوفات الدرجات' },
  { id: 'm4', category: 'monthly', text: 'متابعة استلام الاختبارات من المعلمين' },
  { id: 'm5', category: 'monthly', text: 'تسليم مقررات الاختبارات للسكرتيرة' },
  { id: 'm6', category: 'monthly', text: 'متابعة استلام سجلات الدرجات' },
  { id: 'm7', category: 'monthly', text: 'متابعة تسليم سجلات الدرجات' },
  { id: 'm8', category: 'monthly', text: 'تسليم جدول الاختبارات للطلاب' },
  { id: 'm9', category: 'monthly', text: 'توزيع أسماء الطلاب على اللجان' },
  { id: 'm10', category: 'monthly', text: 'استلام أدبيات الكنترول كاملة' },
  { id: 'm11', category: 'monthly', text: 'متابعة تسليم أرقام الجلوس' },
  { id: 'm12', category: 'monthly', text: 'متابعة سير الاختبارات الشهرية' },
  { id: 'm13', category: 'monthly', text: 'متابعة المعلمين لتسليم أوراق الاختبارات مصححة' },
  { id: 'm14', category: 'monthly', text: 'حصر المتأخرين عن الاختبارات' },
  { id: 'm15', category: 'monthly', text: 'إعداد جدول اختبار الغائبين' },
  { id: 'm16', category: 'monthly', text: 'تسليم السكرتير كشوف الدرجات' },
  { id: 'm17', category: 'monthly', text: 'تسليم السكرتير كشوف غياب الطلاب' },
  { id: 'm18', category: 'monthly', text: 'مراجعة رصد الدرجات بعد السكرتير' },
  { id: 'm19', category: 'monthly', text: 'متابعة تسليم أوراق الاختبارات طلاب' },
  { id: 'm20', category: 'monthly', text: 'رفع استمارة التغطية' },
  { id: 'm21', category: 'monthly', text: 'حصر الطلاب الضعاف و المتفوقين' },
  { id: 'm22', category: 'monthly', text: 'حصر الحالات الخاصة' },
];

const defaultData: AppData = {
  profile: {
    ministry: '',
    district: '',
    schoolName: '',
    branch: '',
    year: '2024-2025',
    semester: '',
    branchManager: '',
    generalManager: '',
    customFields: []
  },
  substitutions: [],
  timetable: [],
  dailyReports: [],
  violations: [],
  parentVisits: [],
  teacherFollowUps: [],
  maxGrades: defaultMaxGrades,
  studentReports: [],
  absenceLogs: [],
  studentLatenessLogs: [],
  studentViolationLogs: [],
  exitLogs: [],
  damageLogs: [],
  parentVisitLogs: [],
  examLogs: [],
  genericSpecialReports: [],
  customViolationElements: {
    behavior: [],
    duties: [],
    achievement: []
  },
  taskTemplates: defaultTaskTemplates,
  taskReports: []
};

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('ar');
  const [data, setData] = useState<AppData>(defaultData);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('rafiquk_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setData({ ...defaultData, ...parsed });
    }
    const auth = sessionStorage.getItem('rafiquk_auth');
    if (auth === 'true') setIsAuthenticated(true);
    const savedLang = localStorage.getItem('rafiquk_lang') as Language;
    if (savedLang) setLang(savedLang);
  }, []);

  const updateData = (newData: Partial<AppData>) => {
    const updated = { ...data, ...newData };
    setData(updated);
    localStorage.setItem('rafiquk_data', JSON.stringify(updated));
  };

  const login = (pass: string) => {
    if (pass === '123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('rafiquk_auth', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('rafiquk_auth');
  };

  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('rafiquk_lang', l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  return (
    <GlobalContext.Provider value={{ lang, setLang: handleSetLang, data, updateData, isAuthenticated, login, logout }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error('useGlobal must be used within GlobalProvider');
  return context;
};
