
export type Language = 'ar' | 'en';

export interface SchoolProfile {
  ministry: string;
  district: string;
  schoolName: string;
  branch: string;
  year: string;
  semester: string;
  branchManager: string;
  generalManager: string;
  customFields?: { label: string, value: string }[];
  // Legacy fields preserved for compatibility
  supervisorName?: string;
  classes?: string;
  qualityOfficer?: string;
  managerName?: string;
}

export interface TimetableEntry {
  id: string;
  teacherName: string;
  subject: string;
  days: {
    [key: string]: { // Saturday, Sunday...
      [key: string]: string; // p0, p1, p2... value is Class/Section
    }
  };
  notes: string;
}

export interface ExamLog {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  semester: string;
  stage: 'basic' | 'secondary';
  type: 'monthly' | 'final';
  subjectsData: Record<string, { class: string; grade: string; status: 'tested' | 'not_tested' }>;
}

export interface SubstitutionEntry {
  id: string;
  absentTeacher: string;
  replacementTeacher: string;
  period: string;
  class: string;
  date: string;
  paymentStatus: 'pending' | 'paid';
  // Existing specific fields for periods
  p1?: string; p2?: string; p3?: string; p4?: string; p5?: string; p6?: string; p7?: string;
  sig1?: string; sig2?: string; sig3?: string; sig4?: string; sig5?: string; sig6?: string; sig7?: string;
  signature?: string;
}

export interface TeacherFollowUp {
  id: string;
  teacherName: string;
  subjectCode: string;
  className: string;
  attendance: number;
  appearance: number;
  preparation: number;
  supervision_queue: number;
  supervision_rest: number;
  supervision_end: number;
  correction_books: number;
  correction_notebooks: number;
  correction_followup: number;
  teaching_aids: number;
  extra_activities: number;
  radio: number;
  creativity: number;
  zero_period: number;
  violations_score: number;
  violations_notes: string[];
  order?: number;
}

export interface DailyReportContainer {
  id: string;
  dayName: string;
  dateStr: string;
  teachersData: TeacherFollowUp[];
}

export interface StudentReport {
  id: string;
  name: string;
  gender: string;
  grade: string;
  section: string;
  address: string;
  workOutside: string;
  healthStatus: string;
  healthDetails: string;
  guardianName: string;
  guardianPhones: string[];
  academicReading: string;
  academicWriting: string;
  academicParticipation: string;
  behaviorLevel: string;
  mainNotes: string[];
  otherNotesText: string;
  guardianEducation: string;
  guardianFollowUp: string;
  guardianCooperation: string;
  notes: string;
  createdAt: string;
  isBlacklisted?: boolean;
  isExcellent?: boolean;
  totalAbsences?: number;
}

export interface AbsenceLog {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني';
  date: string;
  day: string;
  status: 'expected' | 'recurring' | 'week1' | 'week2' | 'most' | 'disconnected';
  reason: string;
  commStatus: 'تم التواصل' | 'لم يتم التواصل';
  commType: 'هاتف' | 'رسالة sms' | 'رسالة واتس' | 'أخرى';
  commOtherDetail?: string;
  replier: 'الأب' | 'الأم' | 'الجد' | 'الجدة' | 'الأخ' | 'الأخت' | 'العم' | 'الخال' | 'غيرهم';
  replierOther?: string;
  result: 'تم الرد' | 'لم يتم الرد' | string;
  notes: string;
  prevAbsenceCount: number;
}

export interface LatenessLog {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني';
  date: string;
  day: string;
  status: 'recurring' | 'frequent' | 'permanent';
  reason: string;
  action: string;
  pledge: string;
  notes: string;
  prevLatenessCount: number;
}

export interface StudentViolationLog {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني';
  date: string;
  totalViolations: number;
  behaviorViolations: string[];
  dutiesViolations: string[];
  achievementViolations: string[];
  status: 'blacklist' | 'high' | 'medium' | 'rare';
  action: string;
  pledge: string;
  notes: string;
}

export interface ExitLog {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني' | 'الفصلين';
  date: string;
  day: string;
  status: string;
  customStatusItems: string[];
  action: string;
  pledge: string;
  notes: string;
  prevExitCount: number;
}

export interface DamageLog {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني' | 'الفصلين';
  date: string;
  day: string;
  description: string;
  statusTags: string[];
  action: string;
  pledge: string;
  notes: string;
  prevDamageCount: number;
}

export interface ParentVisitLog {
  id: string;
  studentId: string;
  studentName: string;
  visitorName: string;
  grade: string;
  section: string;
  semester: 'الأول' | 'الثاني' | 'الفصلين';
  date: string;
  day: string;
  type: 'visit' | 'communication';
  status: string;
  customStatusItems: string[];
  reason: string;
  recommendations: string;
  actions: string;
  followUpStatus: string[];
  prevVisitCount: number;
}

export interface GenericSpecialReport {
  id: string;
  category: string;
  subCategory: string;
  title: string;
  content: string;
  date: string;
}

export interface AppData {
  profile: SchoolProfile;
  substitutions: SubstitutionEntry[];
  timetable: TimetableEntry[];
  dailyReports: DailyReportContainer[];
  violations: any[];
  parentVisits: any[];
  teacherFollowUps: TeacherFollowUp[];
  maxGrades: Record<string, number>;
  studentReports?: StudentReport[];
  absenceLogs?: AbsenceLog[];
  latenessLogs?: LatenessLog[];
  studentViolationLogs?: StudentViolationLog[];
  exitLogs?: ExitLog[];
  damageLogs?: DamageLog[];
  parentVisitLogs?: ParentVisitLog[];
  examLogs?: ExamLog[];
  customExitItems?: string[];
  customDamageItems?: string[];
  customVisitItems?: string[];
  pinnedExitStudents?: string[];
  pinnedDamageStudents?: string[];
  pinnedVisitStudents?: string[];
  genericSpecialReports?: GenericSpecialReport[];
  customViolationElements?: {
    behavior: string[];
    duties: string[];
    achievement: string[];
  };
  absenceManualAdditions?: Record<string, string[]>;
  absenceExclusions?: Record<string, string[]>;
}
