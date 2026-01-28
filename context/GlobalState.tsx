
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, AppData } from '../types';

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
  latenessLogs: [],
  studentViolationLogs: [],
  examLogs: [],
  genericSpecialReports: [],
  customViolationElements: {
    behavior: [],
    duties: [],
    achievement: []
  }
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
