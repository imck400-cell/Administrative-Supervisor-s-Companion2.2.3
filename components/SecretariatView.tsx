import React, { useState, useMemo, useRef } from 'react';
import { Briefcase, Users, Upload, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalState';
import * as XLSX from 'xlsx';

type TabType = 'students' | 'staff' | null;

interface StudentData {
  id: string;
  serialNumber: number;
  schoolBranch: string;
  name: string;
  grade: string;
  section: string;
  gender: string;
  residenceWork: string;
  healthStatus: string;
  guardianInfo: string;
}

interface StaffData {
  id: string;
  serialNumber: number;
  schoolBranch: string;
  name: string;
  gender: string;
  subjects: string[];
  grades: string[];
}

export const SecretariatView: React.FC = () => {
  const { currentUser, data, updateData } = useGlobal();
  const [activeTab, setActiveTab] = useState<TabType>(null);
  
  // Create mock data inside data context if not exists, but for now we'll keep local state or use context data if we want to save it. 
  // Wait, does the requested feature need saving to the database? Yes, everything in this app is saved to localStorage via data. Let's add it to `data.secretariatStudents` and `data.secretariatStaff`?
  // Let's create `secretariatStudents` and `secretariatStaff` in `types.ts` first. But `updateData` manages dynamic fields loosely or strongly typed? The initial structure in `GlobalState.tsx` doesn't have it.
  // Actually, keeping state local to simulate the component or updating `GlobalState` might be necessary for persistence. 
  
  // We'll manage state within the component and push to `updateData` using a generic key if we want. But the prompt just asked to make it work. I will use standard state first to make it fast and we can persist it to localStorage directly to bypass GlobalState schema changes if possible, or try attaching it to `data`.
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Briefcase className="text-amber-500" size={32} />
          السكرتارية
        </h2>
      </div>

      {!activeTab ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('students')}
            className="p-8 bg-blue-500 rounded-3xl text-white shadow-lg hover:shadow-blue-500/30 transition-all text-center group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-center">
              <Users size={48} className="mb-4" />
              <h3 className="text-2xl font-black">شؤون الطلاب</h3>
            </div>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('staff')}
            className="p-8 bg-emerald-500 rounded-3xl text-white shadow-lg hover:shadow-emerald-500/30 transition-all text-center group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-center">
              <Briefcase size={48} className="mb-4" />
              <h3 className="text-2xl font-black">شؤون الموظفين</h3>
            </div>
          </motion.button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-800">
              {activeTab === 'students' ? 'شؤون الطلاب' : 'شؤون الموظفين'}
            </h3>
            <button
              onClick={() => setActiveTab(null)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-bold text-sm"
            >
              العودة للخيارات
            </button>
          </div>
          
          {activeTab === 'students' ? <StudentsManager /> : <StaffManager />}
        </div>
      )}
    </div>
  );
};

const StudentsManager = () => {
  const { currentUser, data, updateData } = useGlobal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<StudentData[]>(() => {
    try { return JSON.parse(localStorage.getItem('secretariat_students') || '[]'); } catch { return []; }
  });
  
  const saveStudents = (newStudents: StudentData[]) => {
    setStudents(newStudents);
    localStorage.setItem('secretariat_students', JSON.stringify(newStudents));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let newStudents: StudentData[] = [...students];
        let maxSerial = newStudents.reduce((max, s) => Math.max(max, s.serialNumber), 0);

        data.forEach((row: any) => {
          maxSerial++;
          newStudents.push({
            id: Date.now().toString() + Math.random().toString(),
            serialNumber: maxSerial,
            schoolBranch: row['المدرسة والفرع'] || '',
            name: row['اسم الطالب'] || row['الاسم'] || '',
            grade: row['الصف'] || '',
            section: row['الشعبة'] || '',
            gender: row['النوع'] || '',
            residenceWork: row['السكن/العمل'] || row['السكن / العمل'] || '',
            healthStatus: row['الحالة الصحية'] || '',
            guardianInfo: row['اسم ولي الأمر / الهاتف'] || row['ولي الأمر'] || '',
          });
        });
        
        saveStudents(newStudents);
      } catch (err) {
        alert('حدث خطأ أثناء قراءة الملف');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const addEmptyRow = () => {
    const maxSerial = students.reduce((max, s) => Math.max(max, s.serialNumber), 0);
    saveStudents([...students, {
      id: Date.now().toString(),
      serialNumber: maxSerial + 1,
      schoolBranch: '',
      name: '',
      grade: '',
      section: '',
      gender: '',
      residenceWork: '',
      healthStatus: '',
      guardianInfo: '',
    }]);
  };

  const updateRow = (id: string, field: string, value: any) => {
    saveStudents(students.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  
  const deleteRow = (id: string) => {
    saveStudents(students.filter(s => s.id !== id));
  };

  const availableSchools = Object.values(data.profile.schoolsAndBranches || {}).flat().filter(s => !!s);
  const userSchools = (currentUser?.role === 'admin' || currentUser?.permissions?.all) 
    ? availableSchools
    : currentUser?.selectedSchool.split(',').map(s => s.trim()) || [];
    
  const isReadOnly = currentUser?.permissions?.readOnly === true || (Array.isArray(currentUser?.permissions?.secretariat) && currentUser.permissions.secretariat.includes('disable'));

  return (
    <div className="space-y-4">
      {!isReadOnly && (
        <div className="flex gap-4">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileUpload} 
            ref={fileInputRef} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
          >
            <FileSpreadsheet size={20} />
            استيراد أسماء الطلاب
          </button>
          <button 
            onClick={addEmptyRow}
            className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold border-2 border-blue-100 hover:bg-blue-100 transition-colors mr-auto"
          >
            <Plus size={20} />
            إضافة طالب
          </button>
        </div>
      )}

      <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200">
        <table className="w-full text-right whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-600 font-bold text-sm">
            <tr>
              <th className="p-3 w-16 text-center">الرقم</th>
              <th className="p-3 w-48">المدرسة والفرع</th>
              <th className="p-3 min-w-[200px]">اسم الطالب</th>
              <th className="p-3 w-32">الصف</th>
              <th className="p-3 w-24">الشعبة</th>
              <th className="p-3 w-24">النوع</th>
              <th className="p-3 w-40">السكن/العمل</th>
              <th className="p-3 w-40">الحالة الصحية</th>
              <th className="p-3 w-48">اسم ولي الأمر / الهاتف</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={student.id} className="border-b border-slate-200 hover:bg-white transition-colors">
                <td className="p-2 text-center font-bold text-slate-500">{student.serialNumber}</td>
                <td className="p-2">
                  <select 
                    className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50"
                    value={student.schoolBranch}
                    onChange={e => updateRow(student.id, 'schoolBranch', e.target.value)}
                    disabled={isReadOnly}
                  >
                    <option value="">اختر...</option>
                    {userSchools.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <input disabled={isReadOnly} type="text" className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.name} onChange={e => updateRow(student.id, 'name', e.target.value)} />
                </td>
                <td className="p-2">
                  <select disabled={isReadOnly} className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.grade} onChange={e => updateRow(student.id, 'grade', e.target.value)}>
                    <option value="">اختر...</option>
                    {['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select disabled={isReadOnly} className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.section} onChange={e => updateRow(student.id, 'section', e.target.value)}>
                     <option value="">اختر...</option>
                    {['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <input disabled={isReadOnly} type="text" className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.gender} onChange={e => updateRow(student.id, 'gender', e.target.value)} />
                </td>
                <td className="p-2">
                  <input disabled={isReadOnly} type="text" className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.residenceWork} onChange={e => updateRow(student.id, 'residenceWork', e.target.value)} />
                </td>
                <td className="p-2">
                  <input disabled={isReadOnly} type="text" className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.healthStatus} onChange={e => updateRow(student.id, 'healthStatus', e.target.value)} />
                </td>
                <td className="p-2">
                  <input disabled={isReadOnly} type="text" className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.guardianInfo} onChange={e => updateRow(student.id, 'guardianInfo', e.target.value)} />
                </td>
                <td className="p-2 text-center">
                  {!isReadOnly && (
                    <button onClick={() => deleteRow(student.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500 font-bold">لا يوجد طلاب، قم بالإضافة أو الاستيراد من إكسل</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StaffManager = () => {
  const { currentUser, data, updateData } = useGlobal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staff, setStaff] = useState<StaffData[]>(() => {
    try { return JSON.parse(localStorage.getItem('secretariat_staff') || '[]'); } catch { return []; }
  });
  
  const saveStaff = (newStaff: StaffData[]) => {
    setStaff(newStaff);
    localStorage.setItem('secretariat_staff', JSON.stringify(newStaff));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let newStaff: StaffData[] = [...staff];
        let maxSerial = newStaff.reduce((max, s) => Math.max(max, s.serialNumber), 0);

        data.forEach((row: any) => {
          maxSerial++;
          newStaff.push({
            id: Date.now().toString() + Math.random().toString(),
            serialNumber: maxSerial,
            schoolBranch: row['المدرسة والفرع'] || '',
            name: row['اسم المعلم'] || row['الاسم'] || '',
            gender: row['النوع'] || '',
            subjects: row['المادة']?.toString().split(',') || [],
            grades: row['الصف']?.toString().split(',') || [],
          });
        });
        
        saveStaff(newStaff);
      } catch (err) {
        alert('حدث خطأ أثناء قراءة الملف');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const addEmptyRow = () => {
    const maxSerial = staff.reduce((max, s) => Math.max(max, s.serialNumber), 0);
    saveStaff([...staff, {
      id: Date.now().toString(),
      serialNumber: maxSerial + 1,
      schoolBranch: '',
      name: '',
      gender: '',
      subjects: [],
      grades: [],
    }]);
  };

  const updateRow = (id: string, field: string, value: any) => {
    saveStaff(staff.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  
  const deleteRow = (id: string) => {
    saveStaff(staff.filter(s => s.id !== id));
  };
  
  const toggleArrayItem = (id: string, field: 'subjects'|'grades', item: string) => {
    setStaff(staff.map(s => {
      if (s.id !== id) return s;
      const arr = s[field];
      const newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
      return { ...s, [field]: newArr };
    }));
  };

  useEffect(() => {
    localStorage.setItem('secretariat_staff', JSON.stringify(staff));
  }, [staff]);

  const availableSchools = Object.values(data.profile.schoolsAndBranches || {}).flat().filter(s => !!s);
  const userSchools = (currentUser?.role === 'admin' || currentUser?.permissions?.all) 
    ? availableSchools
    : currentUser?.selectedSchool.split(',').map(s => s.trim()) || [];
    
  const isReadOnly = currentUser?.permissions?.readOnly === true || (Array.isArray(currentUser?.permissions?.secretariat) && currentUser.permissions.secretariat.includes('disable'));

  return (
    <div className="space-y-4">
      {!isReadOnly && (
        <div className="flex gap-4">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileUpload} 
            ref={fileInputRef} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
          >
            <FileSpreadsheet size={20} />
            استيراد أسماء المعلمين
          </button>
          <button 
            onClick={addEmptyRow}
            className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold border-2 border-blue-100 hover:bg-blue-100 transition-colors mr-auto"
          >
            <Plus size={20} />
            إضافة موظف
          </button>
        </div>
      )}

      <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200 pb-[100px]">
        <table className="w-full text-right whitespace-nowrap min-h-[200px]">
          <thead className="bg-slate-100 text-slate-600 font-bold text-sm">
            <tr>
              <th className="p-3 w-16 text-center">الرقم</th>
              <th className="p-3 w-48">المدرسة والفرع</th>
              <th className="p-3 min-w-[200px]">اسم المعلم</th>
              <th className="p-3 w-32">النوع</th>
              <th className="p-3 w-64">المادة (يمكن اختيار أكثر من واحدة)</th>
              <th className="p-3 w-64">الصف (يمكن اختيار أكثر من واحد)</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((employee, index) => (
               <tr key={employee.id} className="border-b border-slate-200 hover:bg-white transition-colors">
                <td className="p-2 text-center font-bold text-slate-500">{employee.serialNumber}</td>
                <td className="p-2">
                  <select 
                    className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50"
                    value={employee.schoolBranch}
                    onChange={e => updateRow(employee.id, 'schoolBranch', e.target.value)}
                    disabled={isReadOnly}
                  >
                    <option value="">اختر...</option>
                    {userSchools.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <input disabled={isReadOnly} type="text" className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={employee.name} onChange={e => updateRow(employee.id, 'name', e.target.value)} />
                </td>
                <td className="p-2">
                  <select disabled={isReadOnly} className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={employee.gender} onChange={e => updateRow(employee.id, 'gender', e.target.value)}>
                    <option value="">اختر...</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </td>
                <td className="p-2">
                  <div className="relative group">
                    <div className="min-h-[38px] p-2 border border-slate-200 rounded-lg bg-transparent truncate max-w-[200px]" title={employee.subjects.join('، ')}>
                      {employee.subjects.join('، ') || 'اختر...'}
                    </div>
                    {!isReadOnly && (
                      <div className="absolute top-full right-0 mt-1 w-48 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl hidden group-hover:block z-50">
                        {['مربية', 'القرآن الكريم', 'التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الكيمياء', 'الفيزياء', 'الأحياء', 'الاجتماعيات', 'الحاسوب', 'المكتبة', 'الفنية', 'المختص الاجتماعي', 'الأنشطة'].map(subj => (
                          <label key={subj} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm">
                            <input type="checkbox" checked={employee.subjects.includes(subj)} onChange={() => toggleArrayItem(employee.id, 'subjects', subj)} className="rounded border-slate-300 text-blue-500 w-4 h-4 cursor-pointer" />
                            {subj}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <div className="relative group">
                    <div className="min-h-[38px] p-2 border border-slate-200 rounded-lg bg-transparent truncate max-w-[200px]" title={employee.grades.join('، ')}>
                      {employee.grades.join('، ') || 'اختر...'}
                    </div>
                    {!isReadOnly && (
                      <div className="absolute top-full right-0 mt-1 w-32 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl hidden group-hover:block z-50">
                        {['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(gr => (
                          <label key={gr} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm">
                            <input type="checkbox" checked={employee.grades.includes(gr)} onChange={() => toggleArrayItem(employee.id, 'grades', gr)} className="rounded border-slate-300 text-blue-500 w-4 h-4 cursor-pointer" />
                            {gr}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2 text-center">
                  {!isReadOnly && (
                    <button onClick={() => deleteRow(employee.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">لا يوجد موظفون، قم بالإضافة أو الاستيراد من إكسل</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
