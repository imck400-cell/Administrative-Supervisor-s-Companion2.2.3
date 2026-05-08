
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, AppData, TaskItem, TaskReport, AuthUser, User } from '../types';
import { db, auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { toast } from 'sonner';

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

const StorageHelper = {
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      console.warn(`LocalStorage quota exceeded or error for key ${key}:`, e);
      // If we hit quota, clear non-essential chunks if possible, or just skip caching.
      // This ensures the React state wrapper does not crash.
    }
  }
};

interface GlobalContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  data: AppData;
  updateData: (newData: Partial<AppData>, overrideSchools?: string[]) => void;
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  userFilter: string;
  setUserFilter: (userId: string) => void;
  dashboardFilter: { view: string, filterValue: string } | null;
  setDashboardFilter: (filter: { view: string, filterValue: string } | null) => void;
  globalDataFilters: { schools: string[], branches: string[], grades: string[], sections: string[] };
  setGlobalDataFilters: (filters: { schools: string[], branches: string[], grades: string[], sections: string[] }) => void;
  dateRange: { from: string; to: string };
  setDateRange: (range: { from: string; to: string }) => void;
  login: (username: string, code: string) => User | null;
  completeLogin: (user: User, school: string, year: string) => void;
  logout: () => void;
  effectiveUserIds: string[];
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
  'متابعة المالية',
  'متابعة وكيل المدرسة',
  'متابعة الإشراف التربوي',
  'متابعة الإشراف الإداري',
  'متابعة المشرف الأكاديمي',
  'متابعة المختص الاجتماعي',
  'متابعة مسؤول المعمل',
  'متابعة مسؤول معمل العلوم',
  'متابعة السكرتارية',
  'متابعة مسؤول الأنشطة',
  'متابعة مسؤول المخازن',
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
  schoolBranches: {},
  trainingEvaluations: [],
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
  const [dashboardFilter, setDashboardFilter] = useState<{ view: string, filterValue: string } | null>(null);
  const [globalDataFilters, setGlobalDataFilters] = useState<{ schools: string[], branches: string[], grades: string[], sections: string[] }>({
    schools: [], branches: [], grades: [], sections: []
  });
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Compute the effective set of user IDs that should be visible.
  // This is ALWAYS a concrete list — never null — so filtering is always applied.
  const effectiveUserIds = React.useMemo(() => {
    if (!isAuthenticated || !currentUser) return [];

    // If a specific list is chosen, use it directly.
    if (userFilter !== 'all') {
      return userFilter.split(',').filter(id => id.length > 0);
    }

    // userFilter === 'all': derive the allowed set from school membership.
    const selectedSchools = currentUser.selectedSchool.split(',').map(s => s.trim());
    const isAdminOrFull = currentUser.role === 'admin' || currentUser.permissions?.all === true;
    const managedIds = currentUser.permissions?.managedUserIds || [];
    const isManager = currentUser.permissions?.userManagement === true || managedIds.length > 0;

    if (managedIds.length > 0) {
      // Priority: If user has an explicit managed list, they ONLY see that list (+ themselves)
      return data.users.filter(u => {
        if (u.id === currentUser.id) return true; // Always see self
        
        // Hide admins/full-perms from people who aren't super-admins
        const isTargetAdmin = u.role === 'admin' || u.permissions?.all === true;
        if (!isAdminOrFull && isTargetAdmin) return false;

        return managedIds.includes(u.id);
      }).map(u => u.id);
    }

    if (isAdminOrFull) {
      // Admin sees all users in the selected school(s)
      const allSchools = selectedSchools.includes('all')
        ? (data.availableSchools || [])
        : selectedSchools;
      return data.users
        .filter(u => u.schools.some(s => allSchools.includes(s)))
        .map(u => u.id);
    } else if (isManager) {
      // Generic manager without explicit list: sees fellow school members
      return data.users
        .filter(u => {
           if (u.id === currentUser.id) return true;
           const isTargetAdmin = u.role === 'admin' || u.permissions?.all === true;
           if (!isAdminOrFull && isTargetAdmin) return false;
           
           return u.schools.some(s => {
             if (!selectedSchools.includes(s)) return false;
             
             // Branch check
             const managerBranches = currentUser.permissions?.schoolsAndBranches?.[s] || [];
             if (managerBranches.length > 0) {
               const targetBranches = u.permissions?.schoolsAndBranches?.[s] || [];
               if (targetBranches.length === 0) return false; // If target has no branch
               return managerBranches.some(b => targetBranches.includes(b));
             }
             return true;
           });
        })
        .map(u => u.id);
    } else {
      // Regular users ONLY see themselves
      return [currentUser.id];
    }
  }, [isAuthenticated, currentUser, userFilter, data.users, data.availableSchools]);

  const filteredData = React.useMemo(() => {
    const { from, to } = dateRange;

    const filterByDate = (item: any) => {
      // Try multiple date fields used across the app
      const rawDate =
        item.date ||
        item.dateStr ||
        (item.createdAt ? item.createdAt.substring(0, 10) : null);

      if (rawDate && typeof rawDate === 'string') {
        // Strip range suffixes like "2024-01-01 إلى 2024-01-07"
        const actualDate = rawDate.split(' ')[0];
        if (from && actualDate < from) return false;
        if (to && actualDate > to) return false;
      }
      return true;
    };

    const filterByUser = (item: any, key?: string) => {
      // Always filter: if item has no userId, keep it (shared data)
      if (!item.userId) return true;

      const isAdminOrFull = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;

      // Special logic for Daily/Periodical reports
      if (key === 'dailyReports') {
        const periodType = item.periodType || 'daily';
        if (periodType !== 'daily' && !isAdminOrFull) {
          // Aggregated reports (weekly, monthly, etc.) are strictly private to the user
          return item.userId === currentUser?.id;
        }
      }

      return effectiveUserIds.length === 0 || effectiveUserIds.includes(item.userId);
    };

    const newData = { ...data };

    // Activity arrays — filter by both user and date
    const activityKeys = [
      'substitutions', 'dailyReports', 'violations', 'parentVisits',
      'absenceLogs', 'studentLatenessLogs', 'studentViolationLogs',
      'exitLogs', 'damageLogs', 'parentVisitLogs', 'examLogs',
      'genericSpecialReports', 'taskReports', 'adminReports'
    ];

    // Entity arrays — filter by user only (date is irrelevant for profile cards)
    const entityKeys = ['studentReports', 'timetable', 'teacherFollowUps'];

    activityKeys.forEach(key => {
      const k = key as keyof AppData;
      if (Array.isArray(newData[k])) {
        (newData as any)[k] = (newData[k] as any[]).filter(
          (item: any) => filterByUser(item, key) && filterByDate(item)
        );
      }
    });

    entityKeys.forEach(key => {
      const k = key as keyof AppData;
      if (Array.isArray(newData[k])) {
        (newData as any)[k] = (newData[k] as any[]).filter(item => filterByUser(item, key));
      }
    });

    return newData;
  }, [data, effectiveUserIds, dateRange]);

  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.role !== 'admin') {
      // Non-admins default to seeing only themselves; keep userFilter as 'all'
      // so the effectiveUserIds logic (which already scopes by school) applies.
      // No override needed — the effectiveUserIds memo handles it.
    }
  }, [isAuthenticated, currentUser]);

  // Sync currentUser permissions from Firestore whenever data.users changes
  // This ensures permission changes take effect immediately without re-login
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const latestUser = data.users.find(u => u.id === currentUser.id);
    if (!latestUser) return;

    // Only update if permissions or role actually changed
    const rolesMatch = latestUser.role === currentUser.role;
    const permsMatch = JSON.stringify(latestUser.permissions) === JSON.stringify(currentUser.permissions);
    if (rolesMatch && permsMatch) return;

    const updatedAuthUser: AuthUser = {
      ...currentUser,
      role: latestUser.role,
      permissions: latestUser.permissions,
    };
    setCurrentUser(updatedAuthUser);
    sessionStorage.setItem('rafiquk_user', JSON.stringify(updatedAuthUser));
  }, [data.users]);

  const activeListeners = React.useRef<Set<string>>(new Set());

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
      setData(prev => ({ ...prev, ...parsed }));
    }
    const authFlag = sessionStorage.getItem('rafiquk_auth');
    const savedUser = sessionStorage.getItem('rafiquk_user');
    if (authFlag === 'true' && savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(savedUser));
    }
    const savedLang = localStorage.getItem('rafiquk_lang') as Language;
    if (savedLang) setLang(savedLang);

    // Initial sync for login data
    const schoolsToSync = [...new Set([...(data.availableSchools || []), ...(defaultData.availableSchools || [])])];
    const unsubscribes: (() => void)[] = [];

    signInAnonymously(auth).then(() => {
      schoolsToSync.forEach(school => {
        // Only sync what's needed for login/initial setup here
        ['users', 'availableSchools', 'availableYears'].forEach(key => {
          const listenerId = `global-${school}-${key}`;
          if (activeListeners.current.has(listenerId)) return;
          
          activeListeners.current.add(listenerId);
          const q = doc(db, 'schools', school, 'shared', key);
          const unsub = onSnapshot(q, (snapshot) => {
            if (snapshot.exists()) {
              const remoteData = snapshot.data().data;
              setData(prev => {
                if (key === 'users') {
                  const existingUsers = prev.users || [];
                  const newUsers = Array.isArray(remoteData) ? remoteData : [];
                  const merged = [...existingUsers];
                  let changed = false;
                  newUsers.forEach(nu => {
                    const idx = merged.findIndex(u => u.id === nu.id);
                    if (idx >= 0) {
                      if (JSON.stringify(merged[idx]) !== JSON.stringify(nu)) {
                        merged[idx] = nu;
                        changed = true;
                      }
                    } else {
                      merged.push(nu);
                      changed = true;
                    }
                  });
                  return changed ? { ...prev, users: merged } : prev;
                } else {
                   const existing = prev[key] as any[] || [];
                   const incoming = Array.isArray(remoteData) ? remoteData : [];
                   const merged = [...new Set([...existing, ...incoming])];
                   if (merged.length === existing.length && merged.every((v, i) => v === existing[i])) {
                     return prev;
                   }
                   return { ...prev, [key]: merged };
                }
              });
            }
          }, (error) => {
            if (!error.message.includes('permission-denied')) {
              console.error(`Global sync error [${key}] for school [${school}]:`, error);
            }
          });
          unsubscribes.push(unsub);
        });
      });

      ['aboutSliderImages', 'aboutExternalLinks', 'aboutLogoImg'].forEach(key => {
        const listenerId = `system-introConfig-${key}`;
        if (activeListeners.current.has(listenerId)) return;
        activeListeners.current.add(listenerId);
        
        const q = doc(db, 'system', 'introConfig', 'data', key);
        const unsub = onSnapshot(q, (snapshot) => {
          if (snapshot.exists() && snapshot.data().data !== undefined) {
            const remoteData = snapshot.data().data;
            setData(prev => {
              if (JSON.stringify(prev[key as keyof AppData]) === JSON.stringify(remoteData)) return prev;
              const updated = { ...prev, [key]: remoteData };
              StorageHelper.setItem('rafiquk_data', JSON.stringify(updated));
              return updated;
            });
          }
        }, (error) => {
          console.error(`System introConfig sync error [${key}]:`, error);
        });
        unsubscribes.push(unsub);
      });
    }).catch(error => {
      console.error("Anonymous authentication failed:", error);
    });

    return () => {
      unsubscribes.forEach(u => u());
      activeListeners.current.clear();
    };
  }, []); // Run once on mount

  const dataListeners = React.useRef<Set<string>>(new Set());

  // Memoize the set of user IDs we need to listen to
  const targetUserIds = React.useMemo(() => {
    if (!isAuthenticated || !currentUser) return "";
    const selectedSchools = currentUser.selectedSchool.split(',').map(s => s.trim());
    const isAdminOrFull = currentUser.role === 'admin' || currentUser.permissions?.all === true;
    const isManager = currentUser.permissions?.userManagement === true;
    
    let ids: string[] = [];

    if (isAdminOrFull) {
      ids = data.users.filter(u => 
        selectedSchools.includes('all') || 
        u.schools.some(s => selectedSchools.includes(s))
      ).map(u => u.id);
    } else {
      if (userFilter === 'all') {
        if (isManager) {
          const explicitlyManaged = currentUser.permissions?.managedUserIds || [];
          ids = data.users.filter(u => {
            if (u.id === currentUser.id) return true;
            const isTargetAdmin = u.role === 'admin' || u.permissions?.all === true;
            if (isTargetAdmin) return false;

            return explicitlyManaged.includes(u.id);
          }).map(u => u.id);
        } else {
          // Regular users ONLY see themselves
          ids = [currentUser.id];
        }
      } else {
        ids = userFilter.split(',');
      }
    }

    // CRITICAL: Also include any users selected in the userFilter
    if (userFilter && userFilter !== 'all') {
      const filterIds = userFilter.split(',');
      filterIds.forEach(id => {
        if (!ids.includes(id)) ids.push(id);
      });
    }
    
    if (!ids.includes(currentUser.id)) ids.push(currentUser.id);
    return ids.sort().join(',');
  }, [isAuthenticated, currentUser?.id, currentUser?.selectedSchool, currentUser?.role, currentUser?.permissions, data.users, userFilter]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const school = currentUser.selectedSchool.trim();
    const unsubscribes: (() => void)[] = [];
    let isMounted = true;

    // Clear listeners so we re-listen for every new targetUserIds change
    dataListeners.current.clear();

    const startListeners = async () => {
      const { user } = await signInAnonymously(auth);
      if (!isMounted) return;

      try {
        await setDoc(doc(db, 'users', user.uid), {
          customUserId: currentUser.id,
          role: currentUser.role,
          schools: currentUser.selectedSchool.split(',').map(s => s.trim()),
          permissions: currentUser.permissions || {}
        });
        
        // Small delay to ensure rules engine sees the new document
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (err) {
        console.error("Error setting user doc:", err);
      }

      if (!isMounted) return;

      const dataBuffer: Record<string, Record<string, any[]>> = {};
      const arrayKeys = ['substitutions', 'timetable', 'dailyReports', 'violations', 'parentVisits', 'teacherFollowUps', 'studentReports', 'absenceLogs', 'studentLatenessLogs', 'studentViolationLogs', 'exitLogs', 'damageLogs', 'parentVisitLogs', 'examLogs', 'genericSpecialReports', 'taskReports', 'adminReports', 'selfEvaluations', 'studentEvaluations', 'deliveryReceiptRecords'];
      arrayKeys.forEach(k => dataBuffer[k] = {});

      // Shared keys for the selected schools
      const strictlySharedKeys = ['profile', 'users', 'availableSchools', 'availableYears', 'secretariatStudents', 'secretariatStaff', 'selfEvaluationTemplates', 'metricsList', 'adminMetricsList', 'branchMetrics', 'adminBranchMetrics', 'adminFollowUpTypes', 'adminActivitiesList', 'adminBranchActivities', 'adminIndividualReportFields'];
      const customizableKeys = ['taskTemplates', 'customViolationElements', 'absenceManualAdditions', 'absenceExclusions'];
      const selectedSchools = currentUser.selectedSchool.split(',').map(s => s.trim());
      const schoolsToListen = selectedSchools.includes('all') ? (data.availableSchools || []) : selectedSchools;

      const isAdminOrFull = currentUser.role === 'admin' || currentUser.permissions?.all === true;

      schoolsToListen.filter(Boolean).forEach(school => {
        // 1. Strictly Shared Keys
        strictlySharedKeys.forEach(key => {
          const listenerId = `auth-shared-${school}-${key}`;
          if (dataListeners.current.has(listenerId)) return;
          dataListeners.current.add(listenerId);

          const q = doc(db, 'schools', school, 'shared', key);
          const unsub = onSnapshot(q, (snapshot) => {
            if (snapshot.exists()) {
              const remoteData = snapshot.data().data;
              setData(prev => {
                if (key === 'users') {
                  const existingUsers = prev.users || [];
                  const newUsers = Array.isArray(remoteData) ? remoteData : [];
                  const merged = [...existingUsers];
                  let changed = false;
                  let updated: any;
                  newUsers.forEach(nu => {
                    const idx = merged.findIndex(u => u.id === nu.id);
                    if (idx >= 0) {
                      if (JSON.stringify(merged[idx]) !== JSON.stringify(nu)) {
                        merged[idx] = nu;
                        changed = true;
                      }
                    } else {
                      merged.push(nu);
                      changed = true;
                    }
                  });
                  if (changed) {
                    updated = { ...prev, users: merged };
                    StorageHelper.setItem('rafiquk_data', JSON.stringify(updated));
                    return updated;
                  }
                  return prev;
                } else if (key === 'availableSchools' || key === 'availableYears') {
                  const existing = prev[key] as any[] || [];
                  const incoming = Array.isArray(remoteData) ? remoteData : [];
                  const merged = [...new Set([...existing, ...incoming])];
                  if (merged.length === existing.length && merged.every((v, i) => v === existing[i])) {
                    return prev;
                  }
                  const updated = { ...prev, [key]: merged };
                  StorageHelper.setItem('rafiquk_data', JSON.stringify(updated));
                  return updated;
                } else {
                  let updated: any;
                  if (typeof remoteData === 'object' && !Array.isArray(remoteData) && remoteData !== null) {
                    if (key === 'profile') {
                      // 🔥 AGGRESSIVE SYNC: Any school with incoming data can update the profile.
                      // If the admin manages multiple schools, we let the real data populate the missing parts.
                      // First listener to inject non-empty data wins baseline. Any listener can supplement missing parts.
                      const existingProfile = prev.profile || {};
                      const incomingProfile = remoteData || {};
                      const isEmptyRemote = !remoteData || Object.keys(remoteData).length === 0;
                      
                      let mergedProfile = { ...existingProfile };

                      if (!isEmptyRemote) {
                         // Overwrite explicitly
                         if (incomingProfile.logoImg) mergedProfile.logoImg = incomingProfile.logoImg;
                         if (incomingProfile.schoolName) mergedProfile.schoolName = incomingProfile.schoolName;
                         if (incomingProfile.year) mergedProfile.year = incomingProfile.year;
                         if (incomingProfile.ministry) mergedProfile.ministry = incomingProfile.ministry;
                         if (incomingProfile.district) mergedProfile.district = incomingProfile.district;
                         if (incomingProfile.branch) mergedProfile.branch = incomingProfile.branch;
                         if (incomingProfile.schoolsAndBranches) mergedProfile.schoolsAndBranches = incomingProfile.schoolsAndBranches;
                         if (incomingProfile.branchManager) mergedProfile.branchManager = incomingProfile.branchManager;
                         if (incomingProfile.generalManager) mergedProfile.generalManager = incomingProfile.generalManager;
                         
                         // Note: Because data.profile is a single global state object, 
                         // updates from any branch will become the global profile seen by this user.
                      }

                      console.log(`✅ [Firebase Sync] Profile merged from ${school}`);
                      const deepCopy = JSON.parse(JSON.stringify(mergedProfile));
                      updated = { ...prev, [key]: deepCopy };
                    } else {
                      const existingObj = (prev[key] || {}) as any;
                      const mergedObj = { ...existingObj, ...remoteData };
                      if (JSON.stringify(existingObj) === JSON.stringify(mergedObj)) return prev;
                      updated = { ...prev, [key]: mergedObj };
                    }
                  } else if (JSON.stringify(prev[key]) === JSON.stringify(remoteData)) {
                    return prev;
                  } else {
                    updated = { ...prev, [key]: remoteData };
                  }
                  StorageHelper.setItem('rafiquk_data', JSON.stringify(updated));
                  return updated;
                }
              });
            }
          });
          unsubscribes.push(unsub);
        });

        // 2. Customizable Keys (Templates, Exclusions, etc.)
        customizableKeys.forEach(key => {
          const personalListenerId = `auth-personal-config-${school}-${currentUser.id}-${key}`;
          const sharedListenerId = `auth-shared-config-${school}-${key}`;

          // Always listen to shared as baseline
          if (!dataListeners.current.has(sharedListenerId)) {
            dataListeners.current.add(sharedListenerId);
            const sq = doc(db, 'schools', school, 'shared', key);
            const sunsub = onSnapshot(sq, (sharedSnap) => {
              // We only apply shared if the user is an admin OR they have NO personal override yet
              // A personal override is indicated by a separate listener below.
              // To avoid race conditions, we can just fetch the personal doc first or track it in a ref.
              // For simplicity, we just use the shared snap if no personal data is set. (See personal listener logic)
              if (sharedSnap.exists() && isAdminOrFull) {
                 setData(prev => {
                   let fetchedData = sharedSnap.data().data;
                   if (key === 'adminFollowUpTypes') {
                     fetchedData = Array.from(new Set([...adminFollowUpTypes, ...(fetchedData || [])]));
                   }
                   if (JSON.stringify(prev[key]) === JSON.stringify(fetchedData)) return prev;
                   return { ...prev, [key]: fetchedData };
                 });
              }
            });
            unsubscribes.push(sunsub);
          }

          // If not admin, listen to personal data
          if (!isAdminOrFull && !dataListeners.current.has(personalListenerId)) {
            dataListeners.current.add(personalListenerId);
            const pq = doc(db, 'schools', school, 'users', currentUser.id, 'data', key);
            const punsub = onSnapshot(pq, async (personalSnap) => {
               if (personalSnap.exists() && personalSnap.data().data !== undefined) {
                 // Personal override exists
                 let fetchedData = personalSnap.data().data;
                 if (key === 'adminFollowUpTypes') {
                   fetchedData = Array.from(new Set([...adminFollowUpTypes, ...(fetchedData || [])]));
                 }
                 setData(prev => ({ ...prev, [key]: fetchedData }));
               } else {
                 // Personal override does not exist => fetch once from shared baseline as initial value
                 try {
                   const { getDoc } = require('firebase/firestore');
                   const sq = doc(db, 'schools', school, 'shared', key);
                   const sharedDoc = await getDoc(sq);
                   if (sharedDoc.exists()) {
                     let x = sharedDoc.data().data;
                     if (key === 'adminFollowUpTypes') x = Array.from(new Set([...adminFollowUpTypes, ...(x||[])]));
                     setData(prev => ({ ...prev, [key]: x }));
                   }
                 } catch(e){}
               }
            });
            unsubscribes.push(punsub);
          }
        });

        const uids = targetUserIds.split(',').filter(id => id.length > 0);

        uids.forEach(uid => {
          arrayKeys.forEach(key => {
            const listenerId = `auth-user-${school}-${uid}-${key}`;
            if (dataListeners.current.has(listenerId)) return;
            dataListeners.current.add(listenerId);

            const q = doc(db, 'schools', school, 'users', uid, 'data', key);
            const unsub = onSnapshot(q, (snapshot) => {
              const items = snapshot.exists() ? snapshot.data().items : [];
              dataBuffer[key][school + '_' + uid] = items;
              
              const mergedArray = Object.values(dataBuffer[key]).flat();
              const uniqueMergedArray = Array.from(new Map(mergedArray.map(item => [item.id, item])).values());
              
              setData(prev => {
                const currentArray = prev[key] as any[];
                if (currentArray && currentArray.length === uniqueMergedArray.length && 
                    JSON.stringify(currentArray) === JSON.stringify(uniqueMergedArray)) {
                  return prev;
                }
                const updated = { ...prev, [key]: uniqueMergedArray };
                StorageHelper.setItem('rafiquk_data', JSON.stringify(updated));
                return updated;
              });
            }, (error) => {
              if (!error.message.includes('permission-denied')) {
                console.error(`Auth user sync error [${uid}] [${key}] for school [${school}]:`, error);
              }
            });
            unsubscribes.push(unsub);
          });
        });
      });
    };

    startListeners();

    return () => {
      isMounted = false;
      unsubscribes.forEach(u => u());
      dataListeners.current.clear();
    };
  }, [isAuthenticated, currentUser?.id, currentUser?.selectedSchool, targetUserIds, data.availableSchools]);


  const updateData = (newData: Partial<AppData>, overrideSchools?: string[]) => {
    if (isAuthenticated && currentUser) {
      let isBlockedByReadOnly = currentUser.permissions?.readOnly;

      if (isBlockedByReadOnly) {
        // Find if this specific update is allowed by a specific module's allowEdits
        let canBypass = false;
        const perms: any = currentUser.permissions || {};
        
        // Define mapping of data keys to their parent permission key
        const keyToModuleMap: Record<string, string> = {
          secretariatStudents: 'secretariat',
          secretariatStaff: 'secretariat',
          timetable: 'secretariat',
          dailyReports: 'dailyFollowUp',
          adminReports: 'adminFollowUp',
          studentReports: 'studentAffairs',
          violations: 'studentAffairs',
          parentVisits: 'studentAffairs',
          teacherFollowUps: 'teacherPortal',
          selfEvaluations: 'teacherPortal',
          studentEvaluations: 'teacherPortal',
          substitutions: 'substitutions',
          schoolProfile: 'schoolProfile',
          users: 'userManagement',
          taskReports: 'specialReports',
          absenceLogs: 'specialReports',
          studentLatenessLogs: 'specialReports',
          studentViolationLogs: 'specialReports',
          exitLogs: 'specialReports',
          damageLogs: 'specialReports',
          parentVisitLogs: 'specialReports',
          examLogs: 'specialReports',
          issues: 'issuesModal',
          trainingCourses: 'trainingCourses',
          caseStudies: 'caseStudyModal',
          comprehensiveIndicators: 'comprehensiveIndicators',
          taskTemplates: 'dashboard',
        };

        const tryingToUpdateKeys = Object.keys(newData);
        canBypass = tryingToUpdateKeys.every(key => {
          const modName = keyToModuleMap[key] || key;
          const modPerms = perms[modName];
          return Array.isArray(modPerms) && modPerms.includes('allowEdits');
        });

        if (canBypass) {
          isBlockedByReadOnly = false;
        }
      }

      if (isBlockedByReadOnly) {
        console.warn('ReadOnly permission: Update blocked');
        toast.error(lang === 'ar' ? 'غير مسموح بتغيير البيانات للرتب الممنوحة لك (للقراءة فقط)' : 'Data change not allowed for your role (Read-Only)');
        return;
      }
      const selectedSchools = overrideSchools && overrideSchools.length > 0 ? overrideSchools : currentUser.selectedSchool.split(',').map(s => s.trim());
      const schoolsToUpdate = selectedSchools.includes('all') ? (data.availableSchools || []) : selectedSchools;
      const strictlySharedKeys = ['profile', 'users', 'availableSchools', 'availableYears', 'secretariatStudents', 'secretariatStaff', 'selfEvaluationTemplates', 'metricsList', 'adminMetricsList', 'branchMetrics', 'adminBranchMetrics', 'adminFollowUpTypes', 'adminActivitiesList', 'adminBranchActivities', 'adminIndividualReportFields'];
      const customizableKeys = ['taskTemplates', 'customViolationElements', 'absenceManualAdditions', 'absenceExclusions'];

      // Helper to check if an item matches the current active filters (user + date).
      // Uses effectiveUserIds so 'all' still resolves to a concrete list.
      const matchesCurrentFilter = (item: any, key: string) => {
        const { from, to } = dateRange;

        // User filter: item belongs to one of the currently-visible users
        if (item.userId && effectiveUserIds.length > 0 && !effectiveUserIds.includes(item.userId)) {
          return false;
        }

        // Date filter: only for activity arrays
        const entityKeys = ['studentReports', 'timetable', 'teacherFollowUps'];
        if (!entityKeys.includes(key)) {
          const rawDate =
            item.date ||
            item.dateStr ||
            (item.createdAt ? item.createdAt.substring(0, 10) : null);
          if (rawDate && typeof rawDate === 'string') {
            const actualDate = rawDate.split(' ')[0];
            if (from && actualDate < from) return false;
            if (to && actualDate > to) return false;
          }
        }
        return true;
      };

      const rawData = data;
      const pendingChanges: Partial<AppData> = {};

      for (const key of Object.keys(newData) as Array<keyof AppData>) {
        if (strictlySharedKeys.includes(key)) {
          const isAdminOrFull = currentUser.role === 'admin' || currentUser.permissions?.all === true;
          const isManager = currentUser.permissions?.userManagement === true || (Array.isArray(currentUser.permissions?.userManagement) && currentUser.permissions.userManagement.length > 0);
          
          const isSecretariatRole = ['مدير عام المدارس', 'مدير الفرع', 'السكرتارية'].includes(currentUser.jobTitle || '');
          const isSecretariatDisabled = Array.isArray(currentUser.permissions?.secretariat) && currentUser.permissions.secretariat.includes('disable');
          const isSecretariatEnabled = !isSecretariatDisabled && (isSecretariatRole || (Array.isArray(currentUser.permissions?.secretariat) ? currentUser.permissions?.secretariat.includes('allowEdits') : currentUser.permissions?.secretariat === true));
          
          const canEditTemplate = Array.isArray(currentUser.permissions?.teacherPortal) ? currentUser.permissions.teacherPortal.includes('editEvaluationTemplate') : currentUser.permissions?.teacherPortal === true;

          const isGeneralSupervisor = (currentUser.role as string) === 'general_supervisor' || currentUser.permissions?.specialCodes === true || (Array.isArray(currentUser.permissions?.specialCodes) && currentUser.permissions.specialCodes.length > 0);
          const canEditDaily = isGeneralSupervisor || currentUser.permissions?.dailyFollowUp === true || (Array.isArray(currentUser.permissions?.dailyFollowUp) && !currentUser.permissions.dailyFollowUp.includes('view') && !currentUser.permissions.dailyFollowUp.includes('disable'));
          const canEditAdminFollowUp = isGeneralSupervisor || currentUser.permissions?.adminFollowUp === true || (Array.isArray(currentUser.permissions?.adminFollowUp) && !currentUser.permissions.adminFollowUp.includes('view') && !currentUser.permissions.adminFollowUp.includes('disable'));

          let canSave = false;
          if (isAdminOrFull) canSave = true;
          else if (key === 'users' && isManager) canSave = true;
          else if ((key === 'secretariatStudents' || key === 'secretariatStaff') && isSecretariatEnabled) canSave = true;
          else if ((key === 'metricsList' || key === 'branchMetrics') && (isSecretariatEnabled || canEditDaily)) canSave = true;
          else if ((key === 'adminMetricsList' || key === 'adminBranchMetrics' || key === 'adminActivitiesList' || key === 'adminBranchActivities' || key === 'adminIndividualReportFields' || key === 'adminFollowUpTypes') && (isSecretariatEnabled || canEditAdminFollowUp)) canSave = true;
          else if (key === 'selfEvaluationTemplates' && canEditTemplate) canSave = true;
          else if (key === 'profile' && isSecretariatEnabled) canSave = true;
          else if ((key === 'availableSchools' || key === 'availableYears') && isAdminOrFull) canSave = true;
          else if ((key === 'aboutSliderImages' || key === 'aboutExternalLinks' || key === 'aboutLogoImg') && isAdminOrFull) canSave = true;

          if (canSave) {
            // Priority: Send to Firestore first for strictly shared data
            schoolsToUpdate.forEach(school => {
              console.log(`📤 Pushing ${key} update to Firebase for school: ${school}`);
              setDoc(doc(db, 'schools', school, 'shared', key), { data: newData[key] })
                .catch(err => handleFirestoreError(err, OperationType.WRITE, `schools/${school}/shared/${key}`));
            });

            // For School Profile, we DO NOT update local state immediately to force Server-First flow.
            // This ensures the local user also receives the update through the listener, verifying sync.
            if (key !== 'profile') {
              pendingChanges[key] = newData[key] as any;
            }
          }
          continue;
        }

        if (key === 'aboutSliderImages' || key === 'aboutExternalLinks' || key === 'aboutLogoImg') {
          pendingChanges[key] = newData[key] as any;
          if (currentUser.role === 'admin' || currentUser.permissions?.all === true) {
            setDoc(doc(db, 'system', 'introConfig', 'data', key), { data: newData[key] })
              .catch(err => handleFirestoreError(err, OperationType.WRITE, `system/introConfig/data/${key}`));
          }
          continue;
        }

        if (customizableKeys.includes(key)) {
          pendingChanges[key] = newData[key] as any;
          const isAdminOrFull = currentUser.role === 'admin' || currentUser.permissions?.all === true;
          
          schoolsToUpdate.forEach(school => {
            if (isAdminOrFull) {
              setDoc(doc(db, 'schools', school, 'shared', key), { data: newData[key] })
                .catch(err => handleFirestoreError(err, OperationType.WRITE, `schools/${school}/shared/${key}`));
            } else {
              setDoc(doc(db, 'schools', school, 'users', currentUser.id, 'data', key), { data: newData[key] })
                .catch(err => handleFirestoreError(err, OperationType.WRITE, `schools/${school}/users/${currentUser.id}/data/${key}`));
            }
          });
          continue;
        }

        const newArray = newData[key] as any[];
        if (!Array.isArray(newArray)) {
          pendingChanges[key] = newData[key] as any;
          continue;
        }

        const oldArray = rawData[key] as any[] || [];

        // Merge: keep items outside the current filter window, replace those inside.
        const itemsNotMatchingFilter = oldArray.filter(item => !matchesCurrentFilter(item, key));
        const finalArray = [...itemsNotMatchingFilter, ...newArray];

        pendingChanges[key] = finalArray as any;

        const userIds = new Set<string>();
        finalArray.forEach(item => {
          if (!item.userId) item.userId = currentUser.id;
          userIds.add(item.userId);
        });

        if (userIds.size === 0) {
          userIds.add(currentUser.id);
        }

        for (const uid of userIds) {
          if (currentUser.role !== 'admin' && uid !== currentUser.id) continue;

          const userItems = finalArray.filter(item => item.userId === uid);
          
          // Group by school
          const itemsBySchool: Record<string, any[]> = {};
          schoolsToUpdate.forEach(s => itemsBySchool[s] = []); // Initialize all with empty array
          
          userItems.forEach(item => {
             let sId = item.schoolId || item.schoolName || item.school || schoolsToUpdate[0];
             if (!schoolsToUpdate.includes(sId)) {
                 sId = schoolsToUpdate[0];
             }
             if (!itemsBySchool[sId]) itemsBySchool[sId] = [];
             itemsBySchool[sId].push(item);
          });

          for (const sId of Object.keys(itemsBySchool)) {
             setDoc(doc(db, 'schools', sId, 'users', uid, 'data', key), { items: itemsBySchool[sId] })
               .catch(err => handleFirestoreError(err, OperationType.WRITE, `schools/${sId}/users/${uid}/data/${key}`));
          }
        }
      }

      setData(prev => {
        const final = { ...prev, ...pendingChanges };
        StorageHelper.setItem('rafiquk_data', JSON.stringify(final));
        return final;
      });
    } else {
      // Fallback for non-authenticated or initial state
      setData(prev => {
        const final = { ...prev, ...newData };
        StorageHelper.setItem('rafiquk_data', JSON.stringify(final));
        return final;
      });
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
      data: filteredData, 
      updateData, 
      isAuthenticated, 
      currentUser,
      userFilter,
      setUserFilter,
      dashboardFilter,
      setDashboardFilter,
      globalDataFilters,
      setGlobalDataFilters,
      dateRange,
      setDateRange,
      login, 
      completeLogin,
      logout,
      effectiveUserIds
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
