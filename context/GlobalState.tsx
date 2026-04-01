
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, AppData, TaskItem, TaskReport, AuthUser, User } from '../types';
import { db, auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface GlobalContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  userFilter: string;
  setUserFilter: (userId: string) => void;
  login: (username: string, code: string) => User | null;
  completeLogin: (user: User, school: string, year: string) => void;
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

const defaultMetricLabels = {
  attendance: 'الحضور اليومي',
  appearance: 'المظهر الشخصي',
  preparation: 'اكتمال التحضير',
  supervision_queue: 'إشراف الطابور',
  supervision_rest: 'إشراف الراحة',
  supervision_end: 'إشراف نهاية الدوام',
  correction_notebooks: 'تصحيح الدفاتر',
  correction_books: 'تصحيح الكتب',
  correction_followup: 'تصحيح المتابعة',
  teaching_aids: 'توفر وسيلة تعلمية',
  extra_activities: 'أنشطة لا صفية',
  radio: 'إقامة إذاعة',
  creativity: 'إبداع',
  zero_period: 'إقامة حصة صفرية',
  violations_score: 'المخالفات'
};

const initialMetricsList = [
  { key: 'attendance', label: 'الحضور اليومي', emoji: '📅', color: 'bg-green-600', max: 5 },
  { key: 'appearance', label: 'المظهر الشخصي', emoji: '👔', color: 'bg-emerald-600', max: 5 },
  { key: 'preparation', label: 'اكتمال التحضير', emoji: '📝', color: 'bg-teal-600', max: 10 },
  { key: 'supervision_queue', label: 'إشراف الطابور', emoji: '🚶', color: 'bg-orange-600', max: 5 },
  { key: 'supervision_rest', label: 'إشراف الراحة', emoji: '☕', color: 'bg-orange-500', max: 5 },
  { key: 'supervision_end', label: 'إشراف نهاية الدوام', emoji: '🔚', color: 'bg-orange-400', max: 5 },
  { key: 'correction_books', label: 'تصحيح الكتب', emoji: '📖', color: 'bg-cyan-600', max: 10 },
  { key: 'correction_notebooks', label: 'تصحيح الدفاتر', emoji: '📒', color: 'bg-cyan-500', max: 10 },
  { key: 'correction_followup', label: 'تصحيح المتابعة', emoji: '📋', color: 'bg-cyan-400', max: 10 },
  { key: 'teaching_aids', label: 'توفر وسيلة تعلمية', emoji: '💡', color: 'bg-yellow-600', max: 10 },
  { key: 'extra_activities', label: 'أنشطة لا صفية', emoji: '⚽', color: 'bg-lime-600', max: 10 },
  { key: 'radio', label: 'إقامة إذاعة', emoji: '🎙️', color: 'bg-red-600', max: 5 },
  { key: 'creativity', label: 'إبداع', emoji: '✨', color: 'bg-amber-600', max: 5 },
  { key: 'zero_period', label: 'إقامة حصة صفرية', emoji: '0️⃣', color: 'bg-slate-600', max: 5 },
  { key: 'violations_score', label: 'المخالفات', emoji: '⚠️', color: 'bg-red-700', max: 0 },
];

const standardAdminMetrics = [
  { key: 'appearance', label: 'المظهر الشخصي', emoji: '👔', color: '#E2EFDA', max: 4 },
  { key: 'discipline', label: 'الانضباط في الوقت', emoji: '⏱️', color: '#FCE4D6', max: 4 },
  { key: 'quality', label: 'جودة العمل', emoji: '💎', color: '#DDEBF7', max: 4 },
  { key: 'communication', label: 'التواصل الفعال', emoji: '🗣️', color: '#FFF2CC', max: 4 },
  { key: 'problem_solving', label: 'حسن احتواء المشكلات', emoji: '🧩', color: '#E1F5FE', max: 4 },
  { key: 'quality_plan', label: 'السير وفق خطة المدرسة للجودة', emoji: '📊', color: '#F3E5F5', max: 4 },
];

const specializedAdminMetrics: Record<string, any[]> = {
  'متابعة أداء المقصف': [
    { key: 'appearance', label: 'المظهر الشخصي', emoji: '👔', color: '#E2EFDA', max: 4 },
    { key: 'hygiene_personal', label: 'النظافة الشخصية', emoji: '🧼', color: '#FCE4D6', max: 4 },
    { key: 'hygiene_general', label: 'النظافة العامة', emoji: '🧹', color: '#DDEBF7', max: 4 },
    { key: 'quality', label: 'جودة العمل', emoji: '💎', color: '#FFF2CC', max: 4 },
    { key: 'provision', label: 'توفير الطلبات', emoji: '📦', color: '#E1F5FE', max: 4 },
    { key: 'speed', label: 'سرعة الإنجاز', emoji: '⚡', color: '#F3E5F5', max: 4 },
    { key: 'quality_plan', label: 'السير وفق خطة المدرسة للجودة', emoji: '📊', color: '#E8F5E9', max: 4 },
  ],
  'متابعة المشرف الأكاديمي': [
    { key: 'appearance', label: 'المظهر الشخصي', emoji: '👔', color: '#E2EFDA', max: 4 },
    { key: 'early_attendance', label: 'الحضور أول الوقت', emoji: '⏱️', color: '#FCE4D6', max: 4 },
    { key: 'quality', label: 'جودة العمل', emoji: '💎', color: '#DDEBF7', max: 4 },
    { key: 'reports_completion', label: 'اكتمال التقارير', emoji: '📋', color: '#FFF2CC', max: 4 },
    { key: 'quality_plan', label: 'السير وفق خطة المدرسة للجودة', emoji: '📊', color: '#E1F5FE', max: 4 },
  ],
  'متابعة أخرى': [
    { key: 'appearance', label: 'المظهر الشخصي', emoji: '👔', color: '#E2EFDA', max: 4 },
    { key: 'early_attendance', label: 'الحضور أول الوقت', emoji: '⏱️', color: '#FCE4D6', max: 4 },
    { key: 'quality', label: 'جودة العمل', emoji: '💎', color: '#DDEBF7', max: 4 },
    { key: 'communication', label: 'التواصل الفعال', emoji: '🗣️', color: '#FFF2CC', max: 4 },
    { key: 'problem_solving', label: 'حسن احتواء المشكلات', emoji: '🧩', color: '#E1F5FE', max: 4 },
    { key: 'quality_plan', label: 'السير وفق خطة المدرسة للجودة', emoji: '📊', color: '#F3E5F5', max: 4 },
  ]
};

const adminFollowUpTypes = [
  'متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس',
  'متابعة المدير العام',
  'متابعة مدير الفرع',
  'متابعة إدارة الجودة',
  'متابعة وكيل المدرسة',
  'متابعة الإشراف التربوي',
  'متابعة الإشراف الإداري',
  'متابعة المشرف الأكاديمي',
  'متابعة المختص الاجتماعي',
  'متابعة مسؤول المعمل',
  'متابعة مسؤول الأنشطة',
  'متابعة مسؤول الرياضة',
  'متابعة الفنية',
  'متابعة مهندس البيئة',
  'متابعة الحراسة',
  'متابعة حركة المواصلات',
  'متابعة أداء المقصف',
  'متابعة أخرى'
];

// Ensure admin metrics always have max: 4
const ensureAdminMetricsMax = (metrics: any[]): any[] => {
  return metrics.map(m => ({ ...m, max: 4 }));
};

const initialAdminMetricsList: Record<string, any[]> = {};
adminFollowUpTypes.forEach(type => {
  if (specializedAdminMetrics[type]) {
    initialAdminMetricsList[type] = ensureAdminMetricsMax(specializedAdminMetrics[type]);
  } else {
    initialAdminMetricsList[type] = ensureAdminMetricsMax(standardAdminMetrics);
  }
});

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
  users: [
    { id: 'u1', name: 'المشرف العام', code: 'admin123', schools: ['مدرسة الرواد', 'مدرسة النخبة'], academicYears: ['2024-2025'], expiryDate: '2027-01-01', role: 'admin', permissions: { all: true } },
    { id: 'u2', name: 'مشرف الدور الأول', code: 'user123', schools: ['مدرسة الرواد'], academicYears: ['2024-2025'], expiryDate: '2026-12-31', role: 'user', permissions: { dashboard: true, dailyFollowUp: true } },
    { id: 'u3', name: 'مشرف الدور الثاني', code: 'user456', schools: ['مدرسة النخبة'], academicYears: ['2024-2025'], expiryDate: '2025-01-01', role: 'user', permissions: { dashboard: true, dailyFollowUp: true } }, // Expired for testing
  ],
  availableSchools: ['مدرسة الرواد', 'مدرسة النخبة'],
  availableYears: ['2024-2025', '2025-2026'],
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
  taskReports: [],
  metricLabels: defaultMetricLabels,
  metricsList: initialMetricsList,
  adminReports: [],
  adminMetricsList: initialAdminMetricsList,
  adminFollowUpTypes: adminFollowUpTypes
};

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('ar');
  const [data, setData] = useState<AppData>(defaultData);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    const savedData = localStorage.getItem('rafiquk_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setData({ ...defaultData, ...parsed });
    }
    const authFlag = sessionStorage.getItem('rafiquk_auth');
    const savedUser = sessionStorage.getItem('rafiquk_user');
    if (authFlag === 'true' && savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(savedUser));
    }
    const savedLang = localStorage.getItem('rafiquk_lang') as Language;
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const school = currentUser.selectedSchool.trim();
    const unsubscribes: (() => void)[] = [];
    let isMounted = true;

    signInAnonymously(auth).then(async ({ user }) => {
      if (!isMounted) return;

      try {
        await setDoc(doc(db, 'users', user.uid), {
          customUserId: currentUser.id,
          role: currentUser.role,
          school: school
        });
        
        // Small delay to ensure rules engine sees the new document
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        return; 
      }

      if (!isMounted) return;

      const dataBuffer: Record<string, Record<string, any[]>> = {};
      const arrayKeys = ['substitutions', 'timetable', 'dailyReports', 'violations', 'parentVisits', 'teacherFollowUps', 'studentReports', 'absenceLogs', 'studentLatenessLogs', 'studentViolationLogs', 'exitLogs', 'damageLogs', 'parentVisitLogs', 'examLogs', 'genericSpecialReports', 'taskReports', 'adminReports'];
      arrayKeys.forEach(k => dataBuffer[k] = {});

      const sharedKeys = ['profile', 'taskTemplates', 'customViolationElements', 'absenceManualAdditions', 'absenceExclusions', 'users'];

      sharedKeys.forEach(key => {
        const q = doc(db, 'schools', school, 'shared', key);
        const unsub = onSnapshot(q, (snapshot) => {
          if (snapshot.exists()) {
            setData(prev => ({ ...prev, [key]: snapshot.data().data }));
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `schools/${school}/shared/${key}`);
        });
        unsubscribes.push(unsub);
      });

      const targetUsers = currentUser.role === 'admin' 
        ? data.users.filter(u => u.schools.includes(school)).map(u => u.id)
        : [currentUser.id];

      targetUsers.forEach(uid => {
        arrayKeys.forEach(key => {
          const q = doc(db, 'schools', school, 'users', uid, 'data', key);
          const unsub = onSnapshot(q, (snapshot) => {
            const items = snapshot.exists() ? snapshot.data().items : [];
            dataBuffer[key][uid] = items;
            
            const mergedArray = Object.values(dataBuffer[key]).flat();
            // Deduplicate by ID to prevent duplicate keys in lists
            const uniqueMergedArray = Array.from(new Map(mergedArray.map(item => [item.id, item])).values());
            
            setData(prev => {
              const updated = { ...prev, [key]: uniqueMergedArray };
              localStorage.setItem('rafiquk_data', JSON.stringify(updated));
              return updated;
            });
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `schools/${school}/users/${uid}/data/${key}`);
          });
          unsubscribes.push(unsub);
        });
      });
    }).catch(err => {
      console.error("Auth Error:", err);
      if (err.code === 'auth/admin-restricted-operation') {
        console.warn("Firebase Anonymous Auth is not enabled. Data will not sync to the cloud. Please enable it in the Firebase Console -> Authentication -> Sign-in method.");
      }
    });

    return () => {
      isMounted = false;
      unsubscribes.forEach(u => u());
    };
  }, [isAuthenticated, currentUser?.id, currentUser?.selectedSchool]);

  const updateData = (newData: Partial<AppData>) => {
    const updated = { ...data, ...newData };
    setData(updated);
    localStorage.setItem('rafiquk_data', JSON.stringify(updated));

    if (isAuthenticated && currentUser) {
      const school = currentUser.selectedSchool;
      const sharedKeys = ['profile', 'taskTemplates', 'customViolationElements', 'absenceManualAdditions', 'absenceExclusions', 'users'];

      for (const key of Object.keys(newData) as Array<keyof AppData>) {
        if (sharedKeys.includes(key)) {
          if (currentUser.role === 'admin') {
            setDoc(doc(db, 'schools', school, 'shared', key), { data: newData[key] })
              .catch(err => handleFirestoreError(err, OperationType.WRITE, `schools/${school}/shared/${key}`));
          }
          continue;
        }

        const newArray = newData[key] as any[];
        const oldArray = data[key] as any[];
        
        if (!Array.isArray(newArray)) continue;

        const userIds = new Set<string>();
        newArray.forEach(item => {
          if (!item.userId) item.userId = currentUser.id;
          userIds.add(item.userId);
        });
        oldArray?.forEach(item => {
          if (item.userId) userIds.add(item.userId);
        });

        if (userIds.size === 0) {
          userIds.add(currentUser.id);
        }

        for (const uid of userIds) {
          if (currentUser.role !== 'admin' && uid !== currentUser.id) continue;

          const userItems = newArray.filter(item => item.userId === uid);
          setDoc(doc(db, 'schools', school, 'users', uid, 'data', key), { items: userItems })
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `schools/${school}/users/${uid}/data/${key}`));
        }
      }
    }
  };

  const login = (username: string, code: string) => {
    const user = data.users.find(u => u.name === username && u.code === code);
    return user || null;
  };

  const completeLogin = (user: User, school: string, year: string) => {
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      selectedSchool: school,
      selectedYear: year,
      role: user.role,
      permissions: user.permissions
    };
    setIsAuthenticated(true);
    setCurrentUser(authUser);
    sessionStorage.setItem('rafiquk_auth', 'true');
    sessionStorage.setItem('rafiquk_user', JSON.stringify(authUser));
    
    // Update profile with selected school and year
    updateData({ profile: { ...data.profile, schoolName: school, year: year } });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    sessionStorage.removeItem('rafiquk_auth');
    sessionStorage.removeItem('rafiquk_user');
  };

  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('rafiquk_lang', l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  return (
    <GlobalContext.Provider value={{ 
      lang, 
      setLang: handleSetLang, 
      data, 
      updateData, 
      isAuthenticated, 
      currentUser,
      userFilter,
      setUserFilter,
      login, 
      completeLogin,
      logout 
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error('useGlobal must be used within GlobalProvider');
  return context;
};
