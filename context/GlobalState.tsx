import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Language,
  AppData,
  TaskItem,
  TaskReport,
  AuthUser,
  User,
} from "../types";
import { db, auth } from "../firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  getDocFromServer,
} from "firebase/firestore";
import { toast } from "sonner";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// StorageHelper removed

interface GlobalContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  data: AppData;
  updateData: (newData: Partial<AppData>, overrideSchools?: string[]) => void;
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  userFilter: string;
  setUserFilter: (userId: string) => void;
  dashboardFilter: { view: string; filterValue: string } | null;
  setDashboardFilter: (
    filter: { view: string; filterValue: string } | null,
  ) => void;
  globalDataFilters: {
    schools: string[];
    branches: string[];
    grades: string[];
    sections: string[];
  };
  setGlobalDataFilters: (filters: {
    schools: string[];
    branches: string[];
    grades: string[];
    sections: string[];
  }) => void;
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
  zero_period: 5,
};

const defaultMetricLabels = {
  attendance: "الحضور اليومي",
  appearance: "المظهر الشخصي",
  preparation: "اكتمال التحضير",
  supervision_queue: "إشراف الطابور",
  supervision_rest: "إشراف الراحة",
  supervision_end: "إشراف نهاية الدوام",
  correction_notebooks: "تصحيح الدفاتر",
  correction_books: "تصحيح الكتب",
  correction_followup: "تصحيح المتابعة",
  teaching_aids: "توفر وسيلة تعلمية",
  extra_activities: "أنشطة لا صفية",
  radio: "إقامة إذاعة",
  creativity: "إبداع",
  zero_period: "إقامة حصة صفرية",
  violations_score: "المخالفات",
};

const initialMetricsList = [
  {
    key: "attendance",
    label: "الحضور اليومي",
    emoji: "📅",
    color: "bg-green-600",
    max: 5,
  },
  {
    key: "appearance",
    label: "المظهر الشخصي",
    emoji: "👔",
    color: "bg-emerald-600",
    max: 5,
  },
  {
    key: "preparation",
    label: "اكتمال التحضير",
    emoji: "📝",
    color: "bg-teal-600",
    max: 10,
  },
  {
    key: "supervision_queue",
    label: "إشراف الطابور",
    emoji: "🚶",
    color: "bg-orange-600",
    max: 5,
  },
  {
    key: "supervision_rest",
    label: "إشراف الراحة",
    emoji: "☕",
    color: "bg-orange-500",
    max: 5,
  },
  {
    key: "supervision_end",
    label: "إشراف نهاية الدوام",
    emoji: "🔚",
    color: "bg-orange-400",
    max: 5,
  },
  {
    key: "correction_books",
    label: "تصحيح الكتب",
    emoji: "📖",
    color: "bg-cyan-600",
    max: 10,
  },
  {
    key: "correction_notebooks",
    label: "تصحيح الدفاتر",
    emoji: "📒",
    color: "bg-cyan-500",
    max: 10,
  },
  {
    key: "correction_followup",
    label: "تصحيح المتابعة",
    emoji: "📋",
    color: "bg-cyan-400",
    max: 10,
  },
  {
    key: "teaching_aids",
    label: "توفر وسيلة تعلمية",
    emoji: "💡",
    color: "bg-yellow-600",
    max: 10,
  },
  {
    key: "extra_activities",
    label: "أنشطة لا صفية",
    emoji: "⚽",
    color: "bg-lime-600",
    max: 10,
  },
  {
    key: "radio",
    label: "إقامة إذاعة",
    emoji: "🎙️",
    color: "bg-red-600",
    max: 5,
  },
  {
    key: "creativity",
    label: "إبداع",
    emoji: "✨",
    color: "bg-amber-600",
    max: 5,
  },
  {
    key: "zero_period",
    label: "إقامة حصة صفرية",
    emoji: "0️⃣",
    color: "bg-slate-600",
    max: 5,
  },
  {
    key: "violations_score",
    label: "المخالفات",
    emoji: "⚠️",
    color: "bg-red-700",
    max: 0,
  },
];

const standardAdminMetrics = [
  {
    key: "appearance",
    label: "المظهر الشخصي",
    emoji: "👔",
    color: "#E2EFDA",
    max: 4,
  },
  {
    key: "discipline",
    label: "الانضباط في الوقت",
    emoji: "⏱️",
    color: "#FCE4D6",
    max: 4,
  },
  {
    key: "quality",
    label: "جودة العمل",
    emoji: "💎",
    color: "#DDEBF7",
    max: 4,
  },
  {
    key: "communication",
    label: "التواصل الفعال",
    emoji: "🗣️",
    color: "#FFF2CC",
    max: 4,
  },
  {
    key: "problem_solving",
    label: "حسن احتواء المشكلات",
    emoji: "🧩",
    color: "#E1F5FE",
    max: 4,
  },
  {
    key: "quality_plan",
    label: "السير وفق خطة المدرسة للجودة",
    emoji: "📊",
    color: "#F3E5F5",
    max: 4,
  },
];

const specializedAdminMetrics: Record<string, any[]> = {
  "متابعة أداء المقصف": [
    {
      key: "appearance",
      label: "المظهر الشخصي",
      emoji: "👔",
      color: "#E2EFDA",
      max: 4,
    },
    {
      key: "hygiene_personal",
      label: "النظافة الشخصية",
      emoji: "🧼",
      color: "#FCE4D6",
      max: 4,
    },
    {
      key: "hygiene_general",
      label: "النظافة العامة",
      emoji: "🧹",
      color: "#DDEBF7",
      max: 4,
    },
    {
      key: "quality",
      label: "جودة العمل",
      emoji: "💎",
      color: "#FFF2CC",
      max: 4,
    },
    {
      key: "provision",
      label: "توفير الطلبات",
      emoji: "📦",
      color: "#E1F5FE",
      max: 4,
    },
    {
      key: "speed",
      label: "سرعة الإنجاز",
      emoji: "⚡",
      color: "#F3E5F5",
      max: 4,
    },
    {
      key: "quality_plan",
      label: "السير وفق خطة المدرسة للجودة",
      emoji: "📊",
      color: "#E8F5E9",
      max: 4,
    },
  ],
  "متابعة المشرف الأكاديمي": [
    {
      key: "appearance",
      label: "المظهر الشخصي",
      emoji: "👔",
      color: "#E2EFDA",
      max: 4,
    },
    {
      key: "early_attendance",
      label: "الحضور أول الوقت",
      emoji: "⏱️",
      color: "#FCE4D6",
      max: 4,
    },
    {
      key: "quality",
      label: "جودة العمل",
      emoji: "💎",
      color: "#DDEBF7",
      max: 4,
    },
    {
      key: "reports_completion",
      label: "اكتمال التقارير",
      emoji: "📋",
      color: "#FFF2CC",
      max: 4,
    },
    {
      key: "quality_plan",
      label: "السير وفق خطة المدرسة للجودة",
      emoji: "📊",
      color: "#E1F5FE",
      max: 4,
    },
  ],
  "متابعة أخرى": [
    {
      key: "appearance",
      label: "المظهر الشخصي",
      emoji: "👔",
      color: "#E2EFDA",
      max: 4,
    },
    {
      key: "early_attendance",
      label: "الحضور أول الوقت",
      emoji: "⏱️",
      color: "#FCE4D6",
      max: 4,
    },
    {
      key: "quality",
      label: "جودة العمل",
      emoji: "💎",
      color: "#DDEBF7",
      max: 4,
    },
    {
      key: "communication",
      label: "التواصل الفعال",
      emoji: "🗣️",
      color: "#FFF2CC",
      max: 4,
    },
    {
      key: "problem_solving",
      label: "حسن احتواء المشكلات",
      emoji: "🧩",
      color: "#E1F5FE",
      max: 4,
    },
    {
      key: "quality_plan",
      label: "السير وفق خطة المدرسة للجودة",
      emoji: "📊",
      color: "#F3E5F5",
      max: 4,
    },
  ],
};

const adminFollowUpTypes = [
  "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس",
  "متابعة المدير العام",
  "متابعة مدير الفرع",
  "متابعة إدارة الجودة",
  "متابعة المالية",
  "متابعة وكيل المدرسة",
  "متابعة الإشراف التربوي",
  "متابعة الإشراف الإداري",
  "متابعة المشرف الأكاديمي",
  "متابعة المختص الاجتماعي",
  "متابعة مسؤول المعمل",
  "متابعة مسؤول معمل العلوم",
  "متابعة السكرتارية",
  "متابعة مسؤول الأنشطة",
  "متابعة مسؤول المخازن",
  "متابعة مسؤول الرياضة",
  "متابعة الفنية",
  "متابعة مهندس البيئة",
  "متابعة الحراسة",
  "متابعة حركة المواصلات",
  "متابعة أداء المقصف",
  "متابعة أخرى",
];

// Ensure admin metrics always have max: 4
const ensureAdminMetricsMax = (metrics: any[]): any[] => {
  return metrics.map((m) => ({ ...m, max: 4 }));
};

const initialAdminMetricsList: Record<string, any[]> = {};
adminFollowUpTypes.forEach((type) => {
  if (specializedAdminMetrics[type]) {
    initialAdminMetricsList[type] = ensureAdminMetricsMax(
      specializedAdminMetrics[type],
    );
  } else {
    initialAdminMetricsList[type] = ensureAdminMetricsMax(standardAdminMetrics);
  }
});

export const defaultTaskTemplates: TaskItem[] = [
  // Daily Tasks
  { id: "d1", category: "daily", text: "توثيق المهام اليومية في الأدوات" },
  { id: "d2", category: "daily", text: "الرفع باحتياجات الدور ورقياً" },
  { id: "d3", category: "daily", text: "التواصل بولي امر الطالب الغائب" },
  { id: "d4", category: "daily", text: "حصر الأعمال الابداعية للمعلمين" },
  { id: "d5", category: "daily", text: "متابعة الإشراف على الطابور" },
  { id: "d6", category: "daily", text: "متابعة الإشراف على الراحة" },
  { id: "d7", category: "daily", text: "متابعة الإشراف نهاية الدوام" },
  { id: "d8", category: "daily", text: "متابعة خروج الطلاب من المدرسة" },
  { id: "d9", category: "daily", text: "متابعة إذاعة الفصول اليومية" },
  { id: "d10", category: "daily", text: "الاطلاع على دفاتر التحضير" },
  { id: "d11", category: "daily", text: "متابعة جدول الحصص" },
  { id: "d12", category: "daily", text: "تغطية الفصول بالمعلمين" },
  { id: "d13", category: "daily", text: "متابعة المخالفات الطلابية" },
  { id: "d14", category: "daily", text: "متابعة مخالفات الكادر" },
  { id: "d15", category: "daily", text: "جلسات فردية لحل المشكلات" },
  { id: "d16", category: "daily", text: "متابعة نظافة الدور" },
  { id: "d17", category: "daily", text: "حل مشاكل أولياء الأمور" },
  { id: "d18", category: "daily", text: "توثيق الأنشطة في الدور" },
  { id: "d19", category: "daily", text: "إنزال الأنشطة في المجموعات" },
  { id: "d20", category: "daily", text: "متابعة نظافة الدور وتهيئته" },
  { id: "d21", category: "daily", text: "التوثيق في سجل مخالفات الطلاب" },
  { id: "d22", category: "daily", text: "التوثيق في سجل تعهدات الطلاب" },
  { id: "d23", category: "daily", text: "توثيق الطلاب المصرح لهم بالخروج" },
  { id: "d24", category: "daily", text: "متابعة المتأخرين عن الحصة الأولى" },
  // Weekly Tasks
  { id: "w1", category: "weekly", text: "تسليم التقرير الأسبوعي" },
  { id: "w2", category: "weekly", text: "استقبال أولياء الأمور" },
  { id: "w3", category: "weekly", text: "الزيارة الصفية للطلاب" },
  { id: "w4", category: "weekly", text: "متابعة دفتر الحصة والواجب والمتابعة" },
  { id: "w5", category: "weekly", text: "التواصل بولي امر الطالب المتميز" },
  { id: "w6", category: "weekly", text: "التواصل بولي امر الطالب الضعيف" },
  { id: "w7", category: "weekly", text: "متابعة تفعيل الريادة" },
  { id: "w8", category: "weekly", text: "تفعيل لوحة الشرف والتميز" },
  { id: "w9", category: "weekly", text: "رفع كشف المتفاعلين في الإشراف" },
  { id: "w10", category: "weekly", text: "نزول ميداني لمتابعة البوفية" },
  { id: "w11", category: "weekly", text: "تحفيز الطلاب المتميزين" },
  { id: "w12", category: "weekly", text: "الرفع بكشف غياب الطلاب المتجاوز" },
  { id: "w13", category: "weekly", text: "حصر الطلاب كثيري المشاكل" },
  { id: "w14", category: "weekly", text: "تدوين الزيارات والرفع بأهمها" },
  { id: "w15", category: "weekly", text: "تعليق أنشطة الدور على الجدار" },
  { id: "w16", category: "weekly", text: "متابعة الزي والشعر والأظافر" },
  { id: "w17", category: "weekly", text: "متابعة توظيف المساحات الجدارية" },
  // Monthly Tasks
  { id: "m1", category: "monthly", text: "اعداد الخلاصة الشهرية" },
  { id: "m2", category: "monthly", text: "تحفيز المعلمين المبدعين" },
  { id: "m3", category: "monthly", text: "جمع كشوفات الدرجات" },
  {
    id: "m4",
    category: "monthly",
    text: "متابعة استلام الاختبارات من المعلمين",
  },
  { id: "m5", category: "monthly", text: "تسليم مقررات الاختبارات للسكرتيرة" },
  { id: "m6", category: "monthly", text: "متابعة استلام سجلات الدرجات" },
  { id: "m7", category: "monthly", text: "متابعة تسليم سجلات الدرجات" },
  { id: "m8", category: "monthly", text: "تسليم جدول الاختبارات للطلاب" },
  { id: "m9", category: "monthly", text: "توزيع أسماء الطلاب على اللجان" },
  { id: "m10", category: "monthly", text: "استلام أدبيات الكنترول كاملة" },
  { id: "m11", category: "monthly", text: "متابعة تسليم أرقام الجلوس" },
  { id: "m12", category: "monthly", text: "متابعة سير الاختبارات الشهرية" },
  {
    id: "m13",
    category: "monthly",
    text: "متابعة المعلمين لتسليم أوراق الاختبارات مصححة",
  },
  { id: "m14", category: "monthly", text: "حصر المتأخرين عن الاختبارات" },
  { id: "m15", category: "monthly", text: "إعداد جدول اختبار الغائبين" },
  { id: "m16", category: "monthly", text: "تسليم السكرتير كشوف الدرجات" },
  { id: "m17", category: "monthly", text: "تسليم السكرتير كشوف غياب الطلاب" },
  { id: "m18", category: "monthly", text: "مراجعة رصد الدرجات بعد السكرتير" },
  {
    id: "m19",
    category: "monthly",
    text: "متابعة تسليم أوراق الاختبارات طلاب",
  },
  { id: "m20", category: "monthly", text: "رفع استمارة التغطية" },
  { id: "m21", category: "monthly", text: "حصر الطلاب الضعاف و المتفوقين" },
  { id: "m22", category: "monthly", text: "حصر الحالات الخاصة" },
];

const defaultData: AppData = {
  users: [
    {
      id: "u1",
      name: "المشرف العام",
      code: "admin123",
      schools: ["مدرسة الرواد", "مدرسة النخبة"],
      academicYears: ["2024-2025"],
      expiryDate: "2027-01-01",
      role: "admin",
      permissions: { all: true },
    },
    {
      id: "u2",
      name: "مشرف الدور الأول",
      code: "user123",
      schools: ["مدرسة الرواد"],
      academicYears: ["2024-2025"],
      expiryDate: "2026-12-31",
      role: "user",
      permissions: { dashboard: true, dailyFollowUp: true },
    },
    {
      id: "u3",
      name: "مشرف الدور الثاني",
      code: "user456",
      schools: ["مدرسة النخبة"],
      academicYears: ["2024-2025"],
      expiryDate: "2025-01-01",
      role: "user",
      permissions: { dashboard: true, dailyFollowUp: true },
    }, // Expired for testing
  ],
  availableSchools: ["مدرسة الرواد", "مدرسة النخبة", "مدارس جيل الرسالة الحديثة"],
  availableYears: ["2024-2025", "2025-2026"],
  schoolBranches: {},
  trainingEvaluations: [],
  profiles: {},
  profile: {
    ministry: "",
    district: "",
    schoolName: "",
    branch: "",
    year: "2024-2025",
    semester: "",
    branchManager: "",
    generalManager: "",
    customFields: [],
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
    achievement: [],
  },
  taskTemplates: defaultTaskTemplates,
  taskReports: [],
  metricLabels: defaultMetricLabels,
  metricsList: initialMetricsList,
  adminReports: [],
  adminMetricsList: initialAdminMetricsList,
  adminFollowUpTypes: adminFollowUpTypes,
};

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLang] = useState<Language>("ar");
  const [data, setData] = useState<AppData>(defaultData);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userFilter, setUserFilter] = useState("all");
  const [dashboardFilter, setDashboardFilter] = useState<{
    view: string;
    filterValue: string;
  } | null>(null);
  const [globalDataFilters, setGlobalDataFilters] = useState<{
    schools: string[];
    branches: string[];
    grades: string[];
    sections: string[];
  }>({
    schools: [],
    branches: [],
    grades: [],
    sections: [],
  });
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // 🔥 GLOBAL REAL-TIME SYNC FOR PROFILES - Handled in the main effect below to avoid conflicts
  // The logic for listening to 'profile' and populating 'data.profiles' is moved 
  // into the main strictlySharedKeys listener to ensure atomicity and consistency.

  // Compute the effective set of user IDs that should be visible.
  // This is ALWAYS a concrete list — never null — so filtering is always applied.
  const effectiveUserIds = React.useMemo(() => {
    if (!isAuthenticated || !currentUser) return [];

    // If a specific list is chosen, use it directly.
    if (userFilter !== "all") {
      return userFilter.split(",").filter((id) => id.length > 0);
    }

    // userFilter === 'all': derive the allowed set from school membership.
    const selectedSchools = currentUser.selectedSchool
      .split(",")
      .map((s) => s.trim());
    const isAdminOrFull =
      currentUser.role === "admin" || currentUser.permissions?.all === true;
    const managedIds = currentUser.permissions?.managedUserIds || [];
    const isManager =
      currentUser.permissions?.userManagement === true ||
      (Array.isArray(currentUser.permissions?.userManagement) && currentUser.permissions.userManagement.length > 0) ||
      managedIds.length > 0;

    const isSchoolWideViewer =
      isManager ||
      !!currentUser.permissions?.secretariat ||
      !!currentUser.permissions?.studentAffairs ||
      !!currentUser.permissions?.dailyFollowUp ||
      !!currentUser.permissions?.adminFollowUp ||
      !!currentUser.permissions?.specialCodes ||
      !!currentUser.permissions?.specialReports ||
      !!currentUser.permissions?.issuesModal ||
      ["مدير عام المدارس", "مدير الفرع", "السكرتارية", "مشرف الدور"].includes(
        currentUser.jobTitle || "",
      );

    if (managedIds.length > 0) {
      // Priority: If user has an explicit managed list, they ONLY see that list (+ themselves)
      return data.users
        .filter((u) => {
          if (u.id === currentUser.id) return true; // Always see self

          // Hide admins/full-perms from people who aren't super-admins
          const isTargetAdmin =
            u.role === "admin" || u.permissions?.all === true;
          if (!isAdminOrFull && isTargetAdmin) return false;

          return managedIds.includes(u.id);
        })
        .map((u) => u.id);
    }

    if (isAdminOrFull) {
      // Admin sees all users in the selected school(s)
      const allSchools = selectedSchools.includes("all")
        ? data.availableSchools || []
        : selectedSchools;
      return data.users
        .filter((u) => u.schools.some((s) => allSchools.includes(s)))
        .map((u) => u.id);
    } else {
      // Non-admin logic: see fellow members based on overlap
      return data.users
        .filter((u) => {
          if (u.id === currentUser.id) return true;
          const isTargetAdmin =
            u.role === "admin" || u.permissions?.all === true;
          if (!isAdminOrFull && isTargetAdmin) return false;

          return u.schools.some((s) => {
            if (!selectedSchools.includes(s)) return false;

            // Branch check
            const managerBranches =
              currentUser.permissions?.schoolsAndBranches?.[s] || [];
            if (managerBranches.length > 0) {
              const targetBranches =
                u.permissions?.schoolsAndBranches?.[s] || [];
              // If target has branch restrictions, they must overlap
              if (targetBranches.length > 0 && !managerBranches.some((b) => targetBranches.includes(b))) {
                return false;
              }
            }

            // If not a school-wide viewer, we must enforce grades/sections overlap if defined
            if (!isSchoolWideViewer) {
              const managerGrades = currentUser.grades || [];
              const managerSections = currentUser.sections || [];
              const targetGrades = u.grades || [];
              const targetSections = u.sections || [];

               // Only check overlap if the manager actually has specific grades/sections assigned
               // If the manager has no grades/sections assigned but isn't a schoolWideViewer, they shouldn't see anyone except themselves (which is handled above)
              if (managerGrades.length === 0 && managerSections.length === 0) {
                 return false;
              }

              if (managerGrades.length > 0 && targetGrades.length > 0) {
                if (!managerGrades.some(g => targetGrades.includes(g))) return false;
              }
              if (managerSections.length > 0 && targetSections.length > 0) {
                 if (!managerSections.some(sec => targetSections.includes(sec))) return false;
              }
            }

            return true;
          });
        })
        .map((u) => u.id);
    }
  }, [
    isAuthenticated,
    currentUser,
    userFilter,
    data.users,
    data.availableSchools?.join(",")
  ]);

  const filteredData = React.useMemo(() => {
    const { from, to } = dateRange;

    const filterByDate = (item: any) => {
      // Try multiple date fields used across the app
      const rawDate =
        item.date ||
        item.dateStr ||
        (item.createdAt ? item.createdAt.substring(0, 10) : null);

      if (rawDate && typeof rawDate === "string") {
        // Strip range suffixes like "2024-01-01 إلى 2024-01-07"
        const actualDate = rawDate.split(" ")[0];
        if (from && actualDate < from) return false;
        if (to && actualDate > to) return false;
      }
      return true;
    };

    const filterByUser = (item: any, key?: string) => {
      // Always filter: if item has no userId, keep it (shared data)
      if (!item.userId) return true;

      const isAdminOrFull =
        currentUser?.role === "admin" || currentUser?.permissions?.all === true;

      // Special logic for Daily/Periodical reports
      if (key === "dailyReports") {
        const periodType = item.periodType || "daily";
        if (periodType !== "daily" && !isAdminOrFull) {
          // Aggregated reports (weekly, monthly, etc.) are strictly private to the user
          return item.userId === currentUser?.id;
        }
      }

      return (
        effectiveUserIds.length === 0 || effectiveUserIds.includes(item.userId)
      );
    };

    const newData = { ...data };

    // Inject current active school's profile
    let activeSchool = currentUser?.selectedSchool?.split(",")[0]?.trim();
    if (activeSchool === "all") {
      activeSchool = data.availableSchools?.[0];
    }

    if (activeSchool && newData.profiles && newData.profiles[activeSchool]) {
      const schoolProfiles = newData.profiles[activeSchool];
      const currentBranch = currentUser?.selectedBranch?.trim();

      // Support new branch-based format and legacy fallback
      if (currentBranch && schoolProfiles[currentBranch]) {
        newData.profile = {
          ...newData.profile,
          ...schoolProfiles[currentBranch],
          branch: currentBranch
        };
      } else if (schoolProfiles.ministry !== undefined) {
        // Legacy: previously stored directly in profiles[school]
        newData.profile = { ...newData.profile, ...schoolProfiles };
      } else {
        // Default to the first available real branch (excluding metadata like lastUpdated)
        const firstBranchKey = Object.keys(schoolProfiles).find(k => 
          k !== "lastUpdated" && typeof schoolProfiles[k] === "object"
        );
        if (firstBranchKey) {
          newData.profile = {
            ...newData.profile,
            ...schoolProfiles[firstBranchKey],
            branch: firstBranchKey
          };
        }
      }
      
      // Override with user's custom profile for this school/branch if any
      const customProfiles = currentUser?.customSchoolProfiles?.[activeSchool];
      if (customProfiles) {
        if (currentBranch && customProfiles[currentBranch]) {
             newData.profile = { ...newData.profile, ...customProfiles[currentBranch], branch: currentBranch };
        } else if (customProfiles[""] !== undefined) { // general overlay
             newData.profile = { ...newData.profile, ...customProfiles[""], branch: "" };
        }
      }
    }

    // Activity arrays — filter by both user and date
    const activityKeys = [
      "substitutions",
      "dailyReports",
      "violations",
      "parentVisits",
      "absenceLogs",
      "studentLatenessLogs",
      "studentViolationLogs",
      "exitLogs",
      "damageLogs",
      "parentVisitLogs",
      "examLogs",
      "genericSpecialReports",
      "taskReports",
      "adminReports",
    ];

    // Entity arrays — filter by user only (date is irrelevant for profile cards)
    const entityKeys = ["studentReports", "timetable", "teacherFollowUps"];

    activityKeys.forEach((key) => {
      const k = key as keyof AppData;
      if (Array.isArray(newData[k])) {
        (newData as any)[k] = (newData[k] as any[]).filter(
          (item: any) => filterByUser(item, key) && filterByDate(item),
        );
      }
    });

    entityKeys.forEach((key) => {
      const k = key as keyof AppData;
      if (Array.isArray(newData[k])) {
        (newData as any)[k] = (newData[k] as any[]).filter((item) =>
          filterByUser(item, key),
        );
      }
    });

    return newData;
  }, [data, effectiveUserIds, dateRange, currentUser?.selectedSchool, currentUser?.selectedBranch]);

  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.role !== "admin") {
      // Non-admins default to seeing only themselves; keep userFilter as 'all'
      // so the effectiveUserIds logic (which already scopes by school) applies.
      // No override needed — the effectiveUserIds memo handles it.
    }
  }, [isAuthenticated, currentUser]);

  // Sync currentUser permissions from Firestore whenever data.users changes
  // This ensures permission changes take effect immediately without re-login
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const latestUser = data.users.find((u) => u.id === currentUser.id);
    if (!latestUser) return;

    // Only update if permissions or role actually changed
    const rolesMatch = latestUser.role === currentUser.role;
    const permsMatch =
      JSON.stringify(latestUser.permissions) ===
      JSON.stringify(currentUser.permissions);
    const customProfilesMatch =
      JSON.stringify(latestUser.customSchoolProfiles) ===
      JSON.stringify(currentUser.customSchoolProfiles);
      
    if (rolesMatch && permsMatch && customProfilesMatch) return;

    const updatedAuthUser: AuthUser = {
      ...currentUser,
      role: latestUser.role,
      permissions: latestUser.permissions,
      customSchoolProfiles: latestUser.customSchoolProfiles,
    };
    setCurrentUser(updatedAuthUser);
    
    // Update the active session document in Firebase so that the new permissions persist upon refresh
    if (auth.currentUser) {
       setDoc(doc(db, "users", auth.currentUser.uid), {
             role: latestUser.role,
             permissions: latestUser.permissions || {},
             customSchoolProfiles: latestUser.customSchoolProfiles || {}
       }, { merge: true }).catch(e => console.error("Failed to update session with new permissions", e));
    }
  }, [data.users, isAuthenticated, currentUser?.id]);

  const activeListeners = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    // Listen to Firebase Auth state instead of sessionStorage
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
       if (user) {
          try {
             console.log("Auth state changed: user signed in with uid", user.uid);
             const userDoc = await getDoc(doc(db, "users", user.uid));
             if (userDoc.exists()) {
                 const userData = userDoc.data();
                 console.log("User session document found:", userData.customUserId);
                 if (userData.isActiveSession && userData.customUserId) {
                     setIsAuthenticated(true);
                     setCurrentUser({
                         id: userData.customUserId,
                         name: userData.name,
                         jobTitle: userData.jobTitle || "",
                         grades: userData.grades || [],
                         sections: userData.sections || [],
                         selectedSchool: userData.selectedSchool || "",
                         selectedYear: userData.selectedYear || "",
                         selectedBranch: userData.selectedBranch || "",
                         role: userData.role || "user",
                         permissions: userData.permissions || {},
                         customSchoolProfiles: userData.customSchoolProfiles || {}
                     });
                 }
             } else {
                 console.log("No user session mapping found for uid:", user.uid);
             }
          } catch(e: any) {
             console.error("Failed to load user session for uid " + user.uid + ":", e.message || e);
             if (e.message && e.message.includes("Quota")) {
               toast.error("تم تجاوز حصة البيانات اليومية لـ Firebase. يرجى المحاولة غداً.");
             }
          }
       } else {
         console.log("Auth state changed: no user");
       }
    });

    // language reset check removed

    // Initial sync for login data
    if (isAuthenticated) return; // Authenticated session is handled by the main useEffect

    const schoolsToSync = [
      ...new Set([
        ...(data.availableSchools || []),
        ...(defaultData.availableSchools || []),
      ]),
    ];
    const unsubscribes: (() => void)[] = [unsubAuth];

    signInAnonymously(auth)
      .then(() => {
        schoolsToSync.forEach((school) => {
          // Only sync what's needed for login/initial setup here
          ["users", "availableSchools", "availableYears"].forEach((key) => {
            const listenerId = `global-${school}-${key}`;
            if (activeListeners.current.has(listenerId)) return;

            activeListeners.current.add(listenerId);
            const q = doc(db, "schools", school, "shared", key);
            const unsub = onSnapshot(
              q,
              { includeMetadataChanges: true },
              (snapshot) => {
                if (snapshot.exists()) {
                  const remoteData = snapshot.data().data;
                  setData((prev) => {
                    if (key === "users") {
                      const newUsers = Array.isArray(remoteData)
                        ? remoteData
                        : [];

                      const mergedUsersMap = new Map();
                      
                      // Keep users from prev that DO NOT belong to this school
                      (prev.users || []).forEach((u) => {
                         if (!(u.schools && u.schools.includes(school)) && u.role !== "admin" && !u.permissions?.all) {
                            mergedUsersMap.set(u.id, u);
                         }
                      });

                      // Add new users from remote
                      newUsers.forEach((u: AuthUser) => {
                        // Only accept users that actually claim this school in their schools array
                        if (u.schools && u.schools.includes(school)) {
                           mergedUsersMap.set(u.id, u);
                        } else if (u.role === "admin" || u.permissions?.all === true) {
                           mergedUsersMap.set(u.id, u);
                        }
                      });
                      
                      // Add defaults last if missing
                      defaultData.users.forEach((u) => {
                        if (!mergedUsersMap.has(u.id)) {
                           if (u.schools.includes(school) || u.role === "admin") {
                              mergedUsersMap.set(u.id, u);
                           }
                        }
                      });

                      const mergedUsers = Array.from(mergedUsersMap.values());

                      if (
                        JSON.stringify(prev.users) !==
                        JSON.stringify(mergedUsers)
                      ) {
                        return { ...prev, users: mergedUsers };
                      }
                      return prev;
                    } else {
                      const existing = (prev[key] as any[]) || [];
                      const incoming = Array.isArray(remoteData)
                        ? remoteData
                        : [];
                      const merged = [...new Set([...existing, ...incoming])];
                      if (
                        merged.length === existing.length &&
                        merged.every((v, i) => v === existing[i])
                      ) {
                        return prev;
                      }
                      return { ...prev, [key]: merged };
                    }
                  });
                }
              },
              (error: any) => {
                if (error.code !== "permission-denied" && !error.message.includes("permission-denied")) {
                  console.error(
                    `Global sync error [${key}] for school [${school}]:`,
                    error,
                  );
                }
              },
            );
            unsubscribes.push(unsub);
          });
        });

        ["aboutSliderImages", "aboutExternalLinks", "aboutLogoImg", "availableSchools", "availableYears"].forEach(
          (key) => {
            const listenerId = `system-introConfig-${key}`;
            if (activeListeners.current.has(listenerId)) return;
            activeListeners.current.add(listenerId);

            const q = doc(db, "system", "introConfig", "data", key);
            const unsub = onSnapshot(
              q,
              { includeMetadataChanges: true },
              (snapshot) => {
                if (snapshot.exists() && snapshot.data().data !== undefined) {
                  const remoteData = snapshot.data().data;
                  setData((prev) => {
                    if (
                      JSON.stringify(prev[key as keyof AppData]) ===
                      JSON.stringify(remoteData)
                    )
                      return prev;
                    const updated = { ...prev, [key]: remoteData };
                    
                    return updated;
                  });
                }
              },
              (error: any) => {
                if (error.code !== "permission-denied" && !error.message.includes("permission-denied")) {
                   console.error(`System introConfig sync error [${key}]:`, error);
                }
              },
            );
            unsubscribes.push(unsub);
          },
        );
      })
      .catch((error) => {
        console.error("Anonymous authentication failed:", error);
      });

    return () => {
      unsubscribes.forEach((u) => u());
      activeListeners.current.clear();
    };
  }, []); // Run once on mount

  const dataListeners = React.useRef<Set<string>>(new Set());
  const isAuthDocSetup = React.useRef(false);
  const dataBufferRef = React.useRef<Record<string, Record<string, any[]>>>({});
  // Track which buffer keys belong to the current listener cycle so we can clean stale ones
  const activeBufferKeys = React.useRef<Set<string>>(new Set());

  // Memoize the set of user IDs we need to listen to
  const targetUserIds = React.useMemo(() => {
    if (!isAuthenticated || !currentUser) return "";

    const ids = [...effectiveUserIds];

    // CRITICAL: Also include any users selected in the userFilter just in case
    if (userFilter && userFilter !== "all") {
      const filterIds = userFilter.split(",").filter((id) => id.length > 0);
      filterIds.forEach((id) => {
        if (!ids.includes(id)) ids.push(id);
      });
    }

    if (!ids.includes(currentUser.id)) ids.push(currentUser.id);
    return ids.sort().join(",");
  }, [isAuthenticated, currentUser?.id, effectiveUserIds, userFilter]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const unsubscribes: (() => void)[] = [];
    let isMounted = true;

    // Clear listener IDs so we re-listen for every new configuration change
    // But do NOT clear dataBufferRef — we preserve accumulated data across re-subscriptions
    dataListeners.current.clear();
    // Track which buffer keys we create in this cycle
    const currentCycleBufferKeys = new Set<string>();

    const startListeners = async () => {
      let uid = "";
      if (!isAuthDocSetup.current) {
        try {
          const { user } = await signInAnonymously(auth);
          uid = user.uid;

          try {
            await setDoc(
              doc(db, "users", uid),
              {
                customUserId: currentUser.id,
                role: currentUser.role || "user",
                schools: currentUser.selectedSchool
                  .split(",")
                  .map((s) => s.trim()),
                permissions: currentUser.permissions || {},
              },
              { merge: true },
            );

            isAuthDocSetup.current = true;
          } catch (err: any) {
            console.error("Error setting user doc:", err);
          }
        } catch (authErr: any) {
          console.error(
            "Authentication Error. Ensure Anonymous Auth is enabled in Firebase:",
            authErr,
          );
        }
      } else {
        const { user } = await signInAnonymously(auth);
        uid = user.uid;
      }

      if (!isMounted) return;

      const arrayKeys = [
        "substitutions",
        "timetable",
        "dailyReports",
        "violations",
        "parentVisits",
        "teacherFollowUps",
        "studentReports",
        "absenceLogs",
        "studentLatenessLogs",
        "studentViolationLogs",
        "exitLogs",
        "damageLogs",
        "parentVisitLogs",
        "examLogs",
        "genericSpecialReports",
        "taskReports",
        "adminReports",
        "adminIndividualReports",
        "selfEvaluations",
        "studentEvaluations",
        "deliveryReceiptRecords",
      ];

      const strictlySharedKeys = [
        "profile",
        "users",
        "availableSchools",
        "availableYears",
        "schoolBranches",
        "secretariatStudents",
        "secretariatStaff",
        "selfEvaluationTemplates",
        "courseEvaluationSchema_v2",
        "metricsList",
        "adminMetricsList",
        "branchMetrics",
        "adminBranchMetrics",
        "adminFollowUpTypes",
        "adminActivitiesList",
        "adminBranchActivities",
        "adminIndividualReportFields",
        "adminIndividualReports",
        "addedTasks",
        "postponedTasks",
        "issueRecommendations",
        "creativityRecords",
        "trainingEvaluations",
      ];

      const customizableKeys = [
        "taskTemplates",
        "customViolationElements",
        "absenceManualAdditions",
        "absenceExclusions",
      ];

      // Initialize all necessary buffers
      if (Object.keys(dataBufferRef.current).length === 0) {
        [...arrayKeys, ...strictlySharedKeys].forEach((k) => {
          if (!dataBufferRef.current[k]) dataBufferRef.current[k] = {};
        });
      }

      const selectedSchools = currentUser.selectedSchool
        .split(",")
        .map((s) => s.trim());
      const schoolsToListen = (
        selectedSchools.includes("all") ? data.availableSchools || [] : selectedSchools
      )
        .filter(Boolean)
        .map((s) => s.trim());

      const isAdminOrFull =
        currentUser.role === "admin" || currentUser.permissions?.all === true;

      schoolsToListen.forEach((school) => {
        // 1. Strictly Shared Keys (Profile, Users, Shared Admin Config)
        strictlySharedKeys.forEach((key) => {
          const listenerId = `auth-shared-${school}-${key}`;
          if (dataListeners.current.has(listenerId)) return;
          dataListeners.current.add(listenerId);

          const q = doc(db, "schools", school, "shared", key);
          const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            if (snapshot.exists()) {
              const remoteData = snapshot.data().data;

              // Profile is a special object that we store in 'profiles' map by school
              if (key === "profile") {
                setData((prev) => {
                  if (JSON.stringify(prev.profiles?.[school]) === JSON.stringify(remoteData))
                    return prev;
                  return {
                    ...prev,
                    profiles: {
                      ...(prev.profiles || {}),
                      [school]: remoteData,
                    }
                  };
                });
                return;
              }

              // Use buffering for all array-based shared keys (Users, Schools, Secretariat, etc.)
              if (Array.isArray(remoteData)) {
                if (!dataBufferRef.current[key]) dataBufferRef.current[key] = {};
                const bufKey = "shared_" + school;
                dataBufferRef.current[key][bufKey] = remoteData;
                currentCycleBufferKeys.add(key + "::" + bufKey);

                const allItemsFromAllDocs = Object.values(
                  dataBufferRef.current[key],
                ).flat();

                if (key === "availableSchools") {
                  const uniqueSchools = Array.from(
                    new Set([
                      ...(defaultData.availableSchools || []),
                      ...allItemsFromAllDocs.map((s) =>
                        typeof s === "string" ? s.trim() : s,
                      ),
                    ]),
                  ).filter(Boolean);
                  setData((prev) => {
                    if (
                      JSON.stringify(prev.availableSchools) ===
                      JSON.stringify(uniqueSchools)
                    )
                      return prev;
                    return { ...prev, availableSchools: uniqueSchools };
                  });
                  return;
                }

                if (key === "availableYears") {
                  const uniqueYears = Array.from(
                    new Set([
                      ...(defaultData.availableYears || []),
                      ...allItemsFromAllDocs.map((y) =>
                        typeof y === "string" ? y.trim() : y,
                      ),
                    ]),
                  ).filter(Boolean);
                  setData((prev) => {
                    if (
                      JSON.stringify(prev.availableYears) ===
                      JSON.stringify(uniqueYears)
                    )
                      return prev;
                    return { ...prev, availableYears: uniqueYears };
                  });
                  return;
                }

                // Standard ID-based deduplication for shared lists
                let mergedList = Array.from(
                  new Map(
                    allItemsFromAllDocs
                      .filter((item: any) => item && item.id)
                      .map((item: any) => [item.id, item]),
                  ).values(),
                );

                if (key === "users") {
                  const usersMap = new Map();
                  
                  // Initialize with default/constant users
                  defaultData.users.forEach((u) => usersMap.set(u.id, u));
                  
                  // Merge items from all listened sources (shared docs from different schools)
                  allItemsFromAllDocs.forEach((u: any) => {
                    if (u && u.id) {
                      const existing = usersMap.get(u.id);
                      if (existing) {
                        // Deep merge critical nested structures to prevent data loss across schools
                        const mergedCustomProfiles = {
                          ...(existing.customSchoolProfiles || {}),
                          ...(u.customSchoolProfiles || {}),
                        };
                        
                        const mergedSchoolsAndBranches = {
                          ...(existing.permissions?.schoolsAndBranches || {}),
                          ...(u.permissions?.schoolsAndBranches || {}),
                        };

                        const mergedSchools = Array.from(new Set([
                          ...(existing.schools || []),
                          ...(u.schools || [])
                        ])).filter(Boolean);

                        const mergedAcademicYears = Array.from(new Set([
                          ...(existing.academicYears || []),
                          ...(u.academicYears || [])
                        ])).filter(Boolean);

                        const mergedPermissions = {
                          ...(existing.permissions || {}),
                          ...(u.permissions || {}),
                          schoolsAndBranches: mergedSchoolsAndBranches,
                        };

                        usersMap.set(u.id, { 
                          ...existing, 
                          ...u, 
                          schools: mergedSchools,
                          academicYears: mergedAcademicYears,
                          customSchoolProfiles: mergedCustomProfiles,
                          permissions: mergedPermissions 
                        });
                      } else {
                        usersMap.set(u.id, u);
                      }
                    }
                  });
                  mergedList = Array.from(usersMap.values());
                }

                setData((prev) => {
                  if (JSON.stringify(prev[key]) === JSON.stringify(mergedList))
                    return prev;
                  return { ...prev, [key]: mergedList };
                });
              } else {
                // Non-array shared keys (e.g. schoolBranches map)
                setData((prev) => {
                  const existingValue = prev[key as keyof AppData];
                  let newValue = remoteData;
                  
                  // Merge objects to avoid overwriting data from different schools
                  if (typeof remoteData === 'object' && remoteData !== null && !Array.isArray(remoteData)) {
                    newValue = {
                      ...(typeof existingValue === 'object' && existingValue !== null ? existingValue : {}),
                      ...remoteData
                    };
                  }

                  if (JSON.stringify(existingValue) === JSON.stringify(newValue))
                    return prev;
                  return { ...prev, [key]: newValue };
                });
              }
            }
          });
          unsubscribes.push(unsub);
        });

        // 2. Customizable Keys (Templates / Config)
        customizableKeys.forEach((key) => {
          const personalListenerId = `auth-personal-config-${school}-${currentUser.id}-${key}`;
          const sharedListenerId = `auth-shared-config-${school}-${key}`;

          if (!dataListeners.current.has(sharedListenerId)) {
            dataListeners.current.add(sharedListenerId);
            const sq = doc(db, "schools", school, "shared", key);
            const sunsub = onSnapshot(sq, { includeMetadataChanges: true }, (sharedSnap) => {
              if (sharedSnap.exists() && (isAdminOrFull || !dataListeners.current.has(personalListenerId))) {
                const fetchedData = sharedSnap.data().data;
                setData((prev) => {
                  if (JSON.stringify(prev[key]) === JSON.stringify(fetchedData))
                    return prev;
                  return { ...prev, [key]: fetchedData };
                });
              }
            });
            unsubscribes.push(sunsub);
          }

          if (
            !isAdminOrFull &&
            !dataListeners.current.has(personalListenerId)
          ) {
            dataListeners.current.add(personalListenerId);
            const pq = doc(
              db,
              "schools",
              school,
              "users",
              currentUser.id,
              "data",
              key,
            );
            const punsub = onSnapshot(pq, { includeMetadataChanges: true }, (personalSnap) => {
              if (personalSnap.exists()) {
                const fetchedData = personalSnap.data().data;
                setData((prev) => {
                  if (JSON.stringify(prev[key]) === JSON.stringify(fetchedData))
                    return prev;
                  return { ...prev, [key]: fetchedData };
                });
              }
            });
            unsubscribes.push(punsub);
          }
        });

        // 3. User-Specific Data (Follow-ups, reports, logs)
        const uids = targetUserIds.split(",").filter((id) => id.length > 0);
        uids.forEach((uid) => {
          arrayKeys.forEach((key) => {
            const listenerId = `auth-user-${school}-${uid}-${key}`;
            if (dataListeners.current.has(listenerId)) return;
            dataListeners.current.add(listenerId);

            const q = doc(db, "schools", school, "users", uid, "data", key);
            const unsub = onSnapshot(
              q,
              { includeMetadataChanges: true },
              (snapshot) => {
                const items =
                  snapshot.exists() && Array.isArray(snapshot.data().items)
                    ? snapshot.data().items
                    : [];
                
                if (!dataBufferRef.current[key]) dataBufferRef.current[key] = {};
                const bufKey = school + "_" + uid;
                dataBufferRef.current[key][bufKey] = items;
                currentCycleBufferKeys.add(key + "::" + bufKey);

                const mergedArray = Object.values(
                  dataBufferRef.current[key],
                ).flat();
                const uniqueMergedArray = Array.from(
                  new Map(
                    mergedArray
                      .filter((item) => item && item.id)
                      .map((item) => [item.id, item]),
                  ).values(),
                );

                setData((prev) => {
                  if (
                    JSON.stringify(prev[key]) ===
                    JSON.stringify(uniqueMergedArray)
                  ) {
                    return prev;
                  }
                  return { ...prev, [key]: uniqueMergedArray };
                });
              },
              (error: any) => {
                if (error.code !== "permission-denied" && !error.message.includes("permission-denied")) {
                  console.error(
                    `Auth user sync error [${uid}] [${key}] school [${school}]:`,
                    error,
                  );
                }
              },
            );
            unsubscribes.push(unsub);
          });
        });
      });
    };

    startListeners();

    return () => {
      isMounted = false;
      unsubscribes.forEach((u) => u());
      dataListeners.current.clear();
      // IMPORTANT: Do NOT clear dataBufferRef entirely.
      // Only remove buffer entries that are NOT part of the current cycle,
      // so that data from active snapshots is preserved across re-subscriptions.
      // This prevents the "flash of empty data" that was causing sync issues.
      // We keep all current cycle keys and remove stale ones from previous cycles.
      const keysToKeep = currentCycleBufferKeys;
      for (const dataKey of Object.keys(dataBufferRef.current)) {
        for (const subKey of Object.keys(dataBufferRef.current[dataKey])) {
          if (!keysToKeep.has(dataKey + "::" + subKey)) {
            delete dataBufferRef.current[dataKey][subKey];
          }
        }
        // Remove empty parent keys
        if (Object.keys(dataBufferRef.current[dataKey]).length === 0) {
          delete dataBufferRef.current[dataKey];
        }
      }
    };
  }, [
    isAuthenticated,
    currentUser?.id,
    currentUser?.selectedSchool,
    targetUserIds,
    data.availableSchools?.join(","),
  ]);

  const updateData = async (
    newDataPayload: Partial<AppData>,
    overrideSchools?: string[],
  ) => {
    if (isAuthenticated && currentUser) {
      const processedNewData = { ...newDataPayload };

      // Ensure profile updates always target the branch-specific map format in the cloud
      if (processedNewData.profile) {
        const isFlatProfile =
          (processedNewData.profile as any).ministry !== undefined ||
          (processedNewData.profile as any).district !== undefined;
        if (isFlatProfile) {
          const currentSchool = currentUser.selectedSchool
            ?.split(",")[0]
            ?.trim();
          const currentBranch = currentUser.selectedBranch?.trim();
          if (currentSchool && currentBranch) {
            const existingSchoolProfiles = data.profiles?.[currentSchool] || {};
            const activeProfileObj = {
              ...existingSchoolProfiles[currentBranch],
              ...(processedNewData.profile as any),
              branch: currentBranch,
            };
            delete activeProfileObj.lastUpdated;
            processedNewData.profile = {
              ...existingSchoolProfiles,
              [currentBranch]: activeProfileObj,
            } as any;
          } else if (currentSchool) {
            const fallbackBranch = "الاعدادات العامة";
            const existingSchoolProfiles = data.profiles?.[currentSchool] || {};
            const activeProfileObj = {
              ...existingSchoolProfiles[fallbackBranch],
              ...(processedNewData.profile as any),
              branch: fallbackBranch,
            };
            delete activeProfileObj.lastUpdated;
            processedNewData.profile = {
              ...existingSchoolProfiles,
              [fallbackBranch]: activeProfileObj,
            } as any;
          }
        }
      }

      const newData = processedNewData;

      let isBlockedByReadOnly = currentUser.permissions?.readOnly;

      if (isBlockedByReadOnly) {
        // Find if this specific update is allowed by a specific module's allowEdits
        let canBypass = false;
        const perms: any = currentUser.permissions || {};

        // Define mapping of data keys to their parent permission key
        const keyToModuleMap: Record<string, string[]> = {
          secretariatStudents: ["secretariat"],
          secretariatStaff: ["secretariat"],
          timetable: ["secretariat"],
          dailyReports: ["dailyFollowUp"],
          adminReports: ["adminFollowUp"],
          studentReports: ["studentAffairs", "secretariat"], // Secretariat might update this implicitly
          violations: ["studentAffairs"],
          parentVisits: ["studentAffairs"],
          teacherFollowUps: ["teacherPortal"],
          selfEvaluations: ["teacherPortal"],
          studentEvaluations: ["teacherPortal"],
          substitutions: ["substitutions"],
          schoolProfile: ["schoolProfile"],
          profile: ["schoolProfile"],
          schoolBranches: ["schoolProfile"],
          availableSchools: ["schoolProfile"], // Admins can manage this usually, but keep it mapped just in case
          users: ["userManagement"],
          taskReports: ["specialReports"],
          absenceLogs: ["specialReports"],
          studentLatenessLogs: ["specialReports"],
          studentViolationLogs: ["specialReports"],
          exitLogs: ["specialReports"],
          damageLogs: ["specialReports"],
          parentVisitLogs: ["specialReports"],
          examLogs: ["specialReports"],
          issues: ["issuesModal"],
          trainingCourses: ["trainingCourses"],
          caseStudies: ["caseStudyModal"],
          comprehensiveIndicators: ["comprehensiveIndicators"],
          taskTemplates: ["dashboard"],
        };

        const tryingToUpdateKeys = Object.keys(newData);
        canBypass = tryingToUpdateKeys.every((key) => {
          const modNames = keyToModuleMap[key] || [key];
          return modNames.some((modName) => {
            const modPerms = perms[modName];
            return Array.isArray(modPerms) && modPerms.includes("allowEdits");
          });
        });

        if (canBypass) {
          isBlockedByReadOnly = false;
        }
      }

      if (isBlockedByReadOnly) {
        console.warn("ReadOnly permission: Update blocked");
        toast.error(
          lang === "ar"
            ? "غير مسموح بتغيير البيانات للرتب الممنوحة لك (للقراءة فقط)"
            : "Data change not allowed for your role (Read-Only)",
        );
        return;
      }
      const selectedSchools =
        overrideSchools && overrideSchools.length > 0
          ? overrideSchools.map((s) => s.trim())
          : currentUser.selectedSchool.split(",").map((s) => s.trim());
      let targetAvailableSchools = data.availableSchools || [];
      if (newData.availableSchools) {
        targetAvailableSchools = newData.availableSchools;
      }
      const schoolsToUpdate = (
        selectedSchools.includes("all")
          ? targetAvailableSchools
          : selectedSchools
      ).map((s) => s.trim());
      // const schoolsToUpdate = ['TEST_SCHOOL']; // 🔥 HARDCODED FOR TEST
      const strictlySharedKeys = [
        "profile",
        "users",
        "availableSchools",
        "availableYears",
        "schoolBranches",
        "secretariatStudents",
        "secretariatStaff",
        "selfEvaluationTemplates",
        "courseEvaluationSchema_v2",
        "metricsList",
        "adminMetricsList",
        "branchMetrics",
        "adminBranchMetrics",
        "adminFollowUpTypes",
        "adminActivitiesList",
        "adminBranchActivities",
        "adminIndividualReportFields",
        "adminIndividualReports",
        "addedTasks",
        "postponedTasks",
        "issueRecommendations",
        "creativityRecords",
        "trainingEvaluations",
      ];
      const customizableKeys = [
        "taskTemplates",
        "customViolationElements",
        "absenceManualAdditions",
        "absenceExclusions",
      ];

      // Helper to check if an item matches the current active filters (user + date).
      // Uses effectiveUserIds so 'all' still resolves to a concrete list.
      const matchesCurrentFilter = (item: any, key: string) => {
        const { from, to } = dateRange;

        // User filter: item belongs to one of the currently-visible users
        if (
          item.userId &&
          effectiveUserIds.length > 0 &&
          !effectiveUserIds.includes(item.userId)
        ) {
          return false;
        }

        // Date filter: only for activity arrays
        const entityKeys = ["studentReports", "timetable", "teacherFollowUps"];
        if (!entityKeys.includes(key)) {
          const rawDate =
            item.date ||
            item.dateStr ||
            (item.createdAt ? item.createdAt.substring(0, 10) : null);
          if (rawDate && typeof rawDate === "string") {
            const actualDate = rawDate.split(" ")[0];
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
          const isAdminOrFull =
            currentUser.role === "admin" ||
            currentUser.permissions?.all === true;
          const isManager =
            currentUser.permissions?.userManagement === true ||
            (Array.isArray(currentUser.permissions?.userManagement) &&
              currentUser.permissions.userManagement.length > 0) ||
            currentUser.permissions?.specialCodes === true ||
            (Array.isArray(currentUser.permissions?.specialCodes) &&
              currentUser.permissions.specialCodes.length > 0);

          const isSecretariatRole = [
            "مدير عام المدارس",
            "مدير الفرع",
            "السكرتارية",
          ].includes(currentUser.jobTitle || "");
          const isSecretariatDisabled =
            Array.isArray(currentUser.permissions?.secretariat) &&
            currentUser.permissions.secretariat.includes("disable");
          const isSecretariatEnabled =
            !isSecretariatDisabled &&
            (isSecretariatRole ||
              (Array.isArray(currentUser.permissions?.secretariat)
                ? currentUser.permissions?.secretariat.includes("allowEdits")
                : currentUser.permissions?.secretariat === true));

          const canEditTemplate = Array.isArray(
            currentUser.permissions?.teacherPortal,
          )
            ? currentUser.permissions.teacherPortal.includes(
                "editEvaluationTemplate",
              )
            : currentUser.permissions?.teacherPortal === true;

          const isGeneralSupervisor =
            (currentUser.role as string) === "general_supervisor" ||
            currentUser.permissions?.specialCodes === true ||
            (Array.isArray(currentUser.permissions?.specialCodes) &&
              currentUser.permissions.specialCodes.length > 0);
          const canEditDaily =
            isGeneralSupervisor ||
            currentUser.permissions?.dailyFollowUp === true ||
            (Array.isArray(currentUser.permissions?.dailyFollowUp) &&
              !currentUser.permissions.dailyFollowUp.includes("view") &&
              !currentUser.permissions.dailyFollowUp.includes("disable"));
          const canEditAdminFollowUp =
            isGeneralSupervisor ||
            currentUser.permissions?.adminFollowUp === true ||
            (Array.isArray(currentUser.permissions?.adminFollowUp) &&
              !currentUser.permissions.adminFollowUp.includes("view") &&
              !currentUser.permissions.adminFollowUp.includes("disable"));

          let canSave = false;
          if (isAdminOrFull) canSave = true;
          else if (key === "users" && isManager) canSave = true;
          else if (
            (key === "secretariatStudents" || key === "secretariatStaff") &&
            isSecretariatEnabled
          )
            canSave = true;
          else if (
            (key === "metricsList" || key === "branchMetrics") &&
            (isSecretariatEnabled || canEditDaily)
          )
            canSave = true;
          else if (
            (key === "adminMetricsList" ||
              key === "adminBranchMetrics" ||
              key === "adminActivitiesList" ||
              key === "adminBranchActivities" ||
              key === "adminIndividualReportFields" ||
              key === "adminFollowUpTypes") &&
            (isSecretariatEnabled || canEditAdminFollowUp)
          )
            canSave = true;
          else if (key === "selfEvaluationTemplates" && canEditTemplate)
            canSave = true;
          else if ((key === "profile" || key === "schoolBranches") && isSecretariatEnabled) canSave = true;
          else if (
            (key === "availableSchools" || key === "availableYears") &&
            isAdminOrFull
          )
            canSave = true;
          else if (
            (key === "aboutSliderImages" ||
              key === "aboutExternalLinks" ||
              key === "aboutLogoImg") &&
            isAdminOrFull
          )
            canSave = true;

          if (canSave) {
            if (key === "profile") {
              const profileData = {
                ...(newData[key] as any),
                lastUpdated: Date.now(),
              };
              newData[key] = profileData;

              // Update local profiles map for all targeted schools to ensure instant feedback
              const currentProfiles = { ...(data.profiles || {}) };
              schoolsToUpdate.forEach((s) => {
                currentProfiles[s] = profileData;
              });
              pendingChanges.profiles = currentProfiles;
            }
            if (key === "users" && Array.isArray(newData[key])) {
              const mergedUsersMap = new Map();
              defaultData.users.forEach((u) => mergedUsersMap.set(u.id, u));
              (newData[key] as any[]).forEach((u) =>
                mergedUsersMap.set(u.id, u),
              );
              newData[key] = Array.from(mergedUsersMap.values()) as any;
            }
            if (key === "availableSchools" && Array.isArray(newData[key])) {
              newData[key] = [
                ...new Set([
                  ...(defaultData.availableSchools || []),
                  ...newData[key],
                ]),
              ] as any;
            }

            // Priority: Send to Firestore first for strictly shared data
            let schoolsToUpdateForThisKey = [...schoolsToUpdate];

            const promises = schoolsToUpdateForThisKey.map(async (school) => {
              const fullPath = `schools/${school}/shared/${key}`;

              let payloadToSave = newData[key];

              // Prevent Multi-Tenant Data Leak: Filter arrays before writing to a specific school's Firebase doc
              if (Array.isArray(payloadToSave)) {
                if (key === "users") {
                  payloadToSave = (payloadToSave as any[]).filter(
                    (u) =>
                      (u.schools && u.schools.some(s => s && (s.trim() === school.trim() || s.trim() === "all"))) ||
                      u.role === "admin" ||
                      u.permissions?.all === true,
                  ) as any;
                } else if (
                  key === "secretariatStudents" ||
                  key === "secretariatStaff"
                ) {
                  payloadToSave = (payloadToSave as any[]).filter(
                    (s) =>
                      s.school === school ||
                      (s.schoolBranch && s.schoolBranch.startsWith(school)),
                  ) as any;
                }
              }

              if (key === "profile") {
                console.log(
                  `جاري الإرسال للمدرسة رقم: "${school}" (Length: ${school.length}) عبر المسار الكامل: ${fullPath}`,
                );
              } else {
                console.log(
                  `📤 Pushing ${key} update to Firebase via: ${fullPath} (Items: ${Array.isArray(payloadToSave) ? payloadToSave.length : "N/A"})`,
                );
              }

              // Always await the promise to ensure data is synced before proceeding
              try {
                await setDoc(
                  doc(db, "schools", school, "shared", key),
                  { data: payloadToSave },
                );
                
                if (key === "profile") {
                  console.log(
                    `✅ تأكيد النجاح من السيرفر: تم الإرسال بنجاح للمدرسة ${school}`,
                  );
                }
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, fullPath);
              }

              if (key === "profile") {
                pendingChanges.profiles = {
                  ...(pendingChanges.profiles || data.profiles),
                  [school]: newData[key],
                } as any;
              }
            });

            await Promise.all(promises);

            if (key === "availableSchools" || key === "availableYears") {
               if (isAdminOrFull) {
                 setDoc(doc(db, "system", "introConfig", "data", key), {
                   data: newData[key]
                 }).catch(err => console.error("Failed to sync global", err));
               }
            }

            // Update local state immediately for instant feedback
            if (key !== "profile" && key !== "profiles") {
              pendingChanges[key] = newData[key] as any;
            }
          }
          continue;
        }

        if (
          key === "aboutSliderImages" ||
          key === "aboutExternalLinks" ||
          key === "aboutLogoImg"
        ) {
          pendingChanges[key] = newData[key] as any;
          if (
            currentUser.role === "admin" ||
            currentUser.permissions?.all === true
          ) {
            setDoc(doc(db, "system", "introConfig", "data", key), {
              data: newData[key],
            }).catch((err) =>
              handleFirestoreError(
                err,
                OperationType.WRITE,
                `system/introConfig/data/${key}`,
              ),
            );
          }
          continue;
        }

        if (customizableKeys.includes(key)) {
          pendingChanges[key] = newData[key] as any;
          const isAdminOrFull =
            currentUser.role === "admin" ||
            currentUser.permissions?.all === true;

          schoolsToUpdate.forEach((school) => {
            if (isAdminOrFull) {
              setDoc(doc(db, "schools", school, "shared", key), {
                data: newData[key],
              }).catch((err) =>
                handleFirestoreError(
                  err,
                  OperationType.WRITE,
                  `schools/${school}/shared/${key}`,
                ),
              );
            } else {
              setDoc(
                doc(
                  db,
                  "schools",
                  school,
                  "users",
                  currentUser.id,
                  "data",
                  key,
                ),
                { data: newData[key] },
              ).catch((err) =>
                handleFirestoreError(
                  err,
                  OperationType.WRITE,
                  `schools/${school}/users/${currentUser.id}/data/${key}`,
                ),
              );
            }
          });
          continue;
        }

        const newArray = newData[key] as any[];
        if (!Array.isArray(newArray)) {
          pendingChanges[key] = newData[key] as any;
          continue;
        }

        const oldArray = (rawData[key] as any[]) || [];

        // Merge: keep items outside the current filter window, replace those inside.
        const itemsNotMatchingFilter = oldArray.filter(
          (item) => !matchesCurrentFilter(item, key),
        );
        const finalArray = [...itemsNotMatchingFilter, ...newArray];

        pendingChanges[key] = finalArray as any;

        const userIds = new Set<string>();
        finalArray.forEach((item) => {
          if (!item.userId) item.userId = currentUser.id;
          userIds.add(item.userId);
        });

        if (userIds.size === 0) {
          userIds.add(currentUser.id);
        }

        for (const uid of userIds) {
          // Check if the items changed, independent of array ordering
          const userItems = finalArray.filter((item) => item.userId === uid);
          const oldUserItems = oldArray.filter((item) => item.userId === uid);

          const sortedUserItems = [...userItems].sort((a, b) =>
            (a.id || "").localeCompare(b.id || ""),
          );
          const sortedOldUserItems = [...oldUserItems].sort((a, b) =>
            (a.id || "").localeCompare(b.id || ""),
          );

          if (
            JSON.stringify(sortedUserItems) ===
            JSON.stringify(sortedOldUserItems)
          ) {
            continue; // No changes for this user, skip Firebase write
          }

          // Group by school
          const itemsBySchool: Record<string, any[]> = {};
          schoolsToUpdate.forEach((s) => (itemsBySchool[s] = [])); // Initialize all with empty array

          userItems.forEach((item) => {
            let sId =
              item.schoolId ||
              item.schoolName ||
              item.school ||
              schoolsToUpdate[0];
            if (!schoolsToUpdate.includes(sId)) {
              sId = schoolsToUpdate[0];
            }
            if (!itemsBySchool[sId]) itemsBySchool[sId] = [];
            itemsBySchool[sId].push(item);
          });

          for (const sId of Object.keys(itemsBySchool)) {
            setDoc(doc(db, "schools", sId, "users", uid, "data", key), {
              items: itemsBySchool[sId],
            }).catch((err) =>
              handleFirestoreError(
                err,
                OperationType.WRITE,
                `schools/${sId}/users/${uid}/data/${key}`,
              ),
            );
          }
        }
      }

      setData((prev) => {
        const final = { ...prev, ...pendingChanges };
        
        return final;
      });
    } else {
      // Fallback for non-authenticated or initial state
      setData((prev) => {
        const final = { ...prev, ...newDataPayload };
        
        return final;
      });
    }
  };

  const login = (username: string, code: string) => {
    const user = data.users.find((u) => u.name === username && u.code === code);
    return user || null;
  };

  const completeLogin = async (user: User, school: string, year: string, branch?: string) => {
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      jobTitle: user.jobTitle,
      grades: user.grades,
      sections: user.sections,
      selectedSchool: school,
      selectedYear: year,
      selectedBranch: branch,
      role: user.role,
      permissions: user.permissions,
    };
    
    // Clear old data when a different user logs in
    if (currentUser?.id && currentUser.id !== user.id) {
       setData((prev) => ({
         ...defaultData,
         users: prev.users, // Retain users list for login dropdown
         availableSchools: prev.availableSchools,
         availableYears: prev.availableYears,
         schoolBranches: prev.schoolBranches,
       }));
    }

    setIsAuthenticated(true);
    setCurrentUser(authUser);
    
    if (auth.currentUser) {
       setDoc(doc(db, "users", auth.currentUser.uid), {
             isActiveSession: true,
             customUserId: user.id,
             name: user.name,
             jobTitle: user.jobTitle || "",
             grades: user.grades || [],
             sections: user.sections || [],
             selectedSchool: school,
             selectedYear: year,
             selectedBranch: branch || "",
             role: user.role,
             permissions: user.permissions || {},
             customSchoolProfiles: user.customSchoolProfiles || {}
       }, { merge: true }).catch(console.error);
    }
  };

  const logout = () => {
    if (auth.currentUser) {
       setDoc(doc(db, "users", auth.currentUser.uid), {
             isActiveSession: false
       }, { merge: true }).catch(console.error);
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setData((prev) => ({
      ...defaultData,
      users: prev.users,
      availableSchools: prev.availableSchools,
      availableYears: prev.availableYears,
      schoolBranches: prev.schoolBranches,
    }));
  };

  const handleSetLang = (l: Language) => {
    setLang(l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
  };

  return (
    <GlobalContext.Provider
      value={{
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
        effectiveUserIds,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error("useGlobal must be used within GlobalProvider");
  return context;
};
