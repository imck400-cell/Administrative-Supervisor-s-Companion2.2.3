import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Briefcase, Users, FileSpreadsheet, Plus, Trash2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGlobal } from '../context/GlobalState';
import * as XLSX from 'xlsx';

type TabType = 'students' | 'staff' | null;

interface StudentData {
  id: string;
  serialNumber: number;
  schoolBranch?: string;
  school: string;
  branch: string;
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
  schoolBranch?: string;
  school: string;
  branch: string;
  name: string;
  gender: string;
  subjects: string[];
  grades: string[];
}

import ConfirmDialog from './ConfirmDialog';
import { TeacherCriteriaModal } from './TeacherCriteriaModal';
import { AdminCriteriaModal } from './AdminCriteriaModal';

export const SecretariatView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(null);
  const [isTeacherCriteriaOpen, setIsTeacherCriteriaOpen] = useState(false);
  const [isAdminCriteriaOpen, setIsAdminCriteriaOpen] = useState(false);
  
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Briefcase className="text-amber-500" size={32} />
          السكرتارية
        </h2>
      </div>

      {!activeTab ? (
        <div className="space-y-6">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsTeacherCriteriaOpen(true)}
              className="p-6 bg-gradient-to-l from-blue-600 to-indigo-600 rounded-3xl text-white shadow-lg hover:shadow-blue-500/30 transition-all text-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={32} className="text-white" />
                </div>
                <h3 className="text-lg font-black">التحكم بمعايير متابعة المعلمين</h3>
                <p className="text-sm text-blue-100 mt-2">إضافة، تعديل، وحذف المعايير الافتراضية</p>
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAdminCriteriaOpen(true)}
              className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-slate-700 shadow-sm hover:shadow-md transition-all text-center group relative overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-emerald-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase size={32} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-black">التحكم بمعايير متابعة الموظفين والعاملين</h3>
                <p className="text-sm text-slate-500 mt-2">تخصيص مجالات التقارير ومعايير التقييم</p>
              </div>
            </motion.button>
          </div>
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

      <TeacherCriteriaModal 
        isOpen={isTeacherCriteriaOpen} 
        onClose={() => setIsTeacherCriteriaOpen(false)} 
      />
      
      <AdminCriteriaModal 
        isOpen={isAdminCriteriaOpen} 
        onClose={() => setIsAdminCriteriaOpen(false)} 
      />
    </div>
  );
};

const StudentsManager = () => {
  const { currentUser, data, updateData } = useGlobal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [students, setStudents] = useState<StudentData[]>([]);

  useEffect(() => {
    let cloudData = data.secretariatStudents;
    const ls = localStorage.getItem('secretariat_students');
    
    // Migrate local storage if cloud is completely empty AND local storage has something.
    if ((!cloudData || cloudData.length === 0) && ls) {
      try {
        const parsed = JSON.parse(ls);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          updateData({ secretariatStudents: parsed });
          cloudData = parsed;
          localStorage.removeItem('secretariat_students'); // cleanup after migrate
        }
      } catch {}
    }

    if (cloudData) {
      setStudents(cloudData.map((s: any) => ({
        ...s,
        school: s.school || (s.schoolBranch ? s.schoolBranch.split('-')[0]?.trim() || s.schoolBranch : ''),
        branch: s.branch || (s.schoolBranch ? s.schoolBranch.split('-')[1]?.trim() || '' : '')
      })));
    }
  }, [data.secretariatStudents, updateData]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(50);
  const [studentFilterGrade, setStudentFilterGrade] = useState('');
  const [studentFilterSection, setStudentFilterSection] = useState('');

  const saveStudents = (newStudents: StudentData[]) => {
    setStudents(newStudents);
    
    // Sync to studentReports to ensure imported students are globally available
    const existingReports = data.studentReports || [];
    const mergedReports = [...existingReports];
    
    newStudents.forEach(s => {
      // Find by ID, or by name + grade + section to prevent duplicates
      const exists = mergedReports.find(r => r.id === s.id || (r.name && s.name && r.name === s.name && r.grade === s.grade && r.section === s.section));
      if (!exists) {
        mergedReports.push({
          id: s.id,
          userId: currentUser?.id || '',
          createdAt: new Date().toISOString(),
          name: s.name || '',
          gender: s.gender || '',
          grade: s.grade || '',
          section: s.section || '',
          address: s.residenceWork || '',
          workOutside: '',
          healthStatus: s.healthStatus || 'ممتاز',
          healthDetails: '',
          guardianName: s.guardianInfo || '',
          guardianPhones: [],
          academicReading: 'متوسط',
          academicWriting: 'متوسط',
          academicParticipation: 'متوسط',
          behaviorLevel: 'متوسط',
          mainNotes: [],
          otherNotesText: '',
          guardianEducation: 'متعلم',
          guardianFollowUp: 'متوسط',
          guardianCooperation: 'متوسط',
          notes: ''
        } as any);
      } else {
        // Sync immutable details so that editing in secretariat reflects globally
        exists.name = s.name || exists.name;
        exists.gender = s.gender || exists.gender;
        exists.address = s.residenceWork || exists.address;
        exists.healthStatus = s.healthStatus || exists.healthStatus;
        exists.guardianName = s.guardianInfo || exists.guardianName;
        exists.grade = s.grade || exists.grade;
        exists.section = s.section || exists.section;
      }
    });

    updateData({ secretariatStudents: newStudents, studentReports: mergedReports });
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
        const rows = XLSX.utils.sheet_to_json(ws);
        
        let importedSchool = '';
        let importedBranch = '';
        for (const row of rows as any[]) {
            if (row['المدرسة'] || row['اسم المدرسة']) importedSchool = row['المدرسة'] || row['اسم المدرسة'];
            if (row['الفرع'] || row['اسم الفرع']) importedBranch = row['الفرع'] || row['اسم الفرع'];
        }
        
        const fallbackSchool = importedSchool || data.profile?.schoolName || currentUser?.selectedSchool?.split(',')[0] || '';
        const fallbackBranch = importedBranch || currentUser?.selectedBranch || '';

        let newStudents: StudentData[] = [...students];
        let maxSerial = newStudents.reduce((max, s) => Math.max(max, s.serialNumber), 0);

        rows.forEach((row: any) => {
          maxSerial++;
          newStudents.push({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            serialNumber: maxSerial,
            school: row['اسم المدرسة'] || row['المدرسة'] || fallbackSchool,
            branch: row['اسم الفرع'] || row['الفرع'] || fallbackBranch,
            name: row['اسم الطالب'] || row['الاسم'] || '',
            grade: row['الصف'] || '',
            section: row['الشعبة'] || '',
            gender: row['النوع'] || '',
            residenceWork: row['السكن/العمل'] || row['السكن / العمل'] || '',
            healthStatus: row['الحالة الصحية'] || '',
            guardianInfo: row['اسم ولي الأمر / الهاتف'] || row['ولي الأمر'] || '',
          });
        });
        const cleanStudents = JSON.parse(JSON.stringify(newStudents));
        saveStudents(cleanStudents);
      } catch (err) {
        alert('حدث خطأ أثناء قراءة الملف');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const addEmptyRow = () => {
    const maxSerial = students.reduce((max, s) => Math.max(max, s.serialNumber), 0);
    const fallbackSchool = data.profile?.schoolName || currentUser?.selectedSchool?.split(',')[0] || '';
    const fallbackBranch = currentUser?.selectedBranch || '';
    saveStudents([...students, {
      id: Date.now().toString(),
      serialNumber: maxSerial + 1,
      school: fallbackSchool, branch: fallbackBranch, name: '', grade: '', section: '', gender: '', residenceWork: '', healthStatus: '', guardianInfo: ''
    }]);
  };

  const updateRow = (id: string, field: string, value: any) => {
    saveStudents(students.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  
  const deleteRow = (id: string) => {
    saveStudents(students.filter(s => s.id !== id));
    setSelectedIds(selectedIds.filter(sel => sel !== id));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'حذف متعدد',
      message: `هل أنت متأكد من حذف ${selectedIds.length} طالب؟`,
      type: 'danger',
      onConfirm: () => {
        saveStudents(students.filter(s => !selectedIds.includes(s.id)));
        setSelectedIds([]);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const isGeneralSupervisor = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
  const isExplicitlyDisabled = Array.isArray(currentUser?.permissions?.secretariat) && currentUser.permissions.secretariat.includes('disable');
  const isAllowEdits = Array.isArray(currentUser?.permissions?.secretariat) && currentUser.permissions.secretariat.includes('allowEdits');
  const isReadOnlyFlag = currentUser?.permissions?.readOnly === true;
  const isReadOnly = !isGeneralSupervisor && ((isReadOnlyFlag && !isAllowEdits) || isExplicitlyDisabled);

  const availableSchoolsKeys = Object.keys(data.profile.schoolsAndBranches || {});
  const userSchools = isGeneralSupervisor ? availableSchoolsKeys : currentUser?.selectedSchool.split(',').map(s => s.trim()) || [];

  const getAvailableBranches = (school: string) => {
    if (isGeneralSupervisor) return data.profile.schoolsAndBranches?.[school] || [];
    const userBranches = currentUser?.permissions?.schoolsAndBranches?.[school];
    if (userBranches && userBranches.length > 0) return userBranches;
    return userBranches || [];
  };

  const filteredStudents = useMemo(() => {
    let result = students;
    if (studentFilterGrade) {
      result = result.filter(s => s.grade === studentFilterGrade);
    }
    if (studentFilterSection) {
      result = result.filter(s => s.section === studentFilterSection);
    }
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(lowerQ) ||
        s.school.toLowerCase().includes(lowerQ) ||
        s.branch.toLowerCase().includes(lowerQ) ||
        s.grade.toLowerCase().includes(lowerQ) ||
        s.guardianInfo.toLowerCase().includes(lowerQ) ||
        s.residenceWork.toLowerCase().includes(lowerQ)
      );
    }
    return result;
  }, [students, searchQuery, studentFilterGrade, studentFilterSection]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (studentPage - 1) * studentPageSize;
    return filteredStudents.slice(startIndex, startIndex + studentPageSize);
  }, [filteredStudents, studentPage, studentPageSize]);

  // Reset page when filters change
  useEffect(() => {
    setStudentPage(1);
  }, [searchQuery, studentFilterGrade, studentFilterSection, studentPageSize]);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredStudents.map(s => s.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="بحث عن طالب، صف، فرع، ولي أمر..." 
              className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pr-12 pl-4 outline-none focus:border-blue-500 transition-colors font-bold text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            value={studentFilterGrade} 
            onChange={e => setStudentFilterGrade(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-blue-500 font-bold text-sm min-w-[120px]"
          >
            <option value="">كل الصفوف</option>
            {['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select 
            value={studentFilterSection} 
            onChange={e => setStudentFilterSection(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-blue-500 font-bold text-sm min-w-[120px]"
          >
            <option value="">كل الشعب</option>
            {['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        
        {!isReadOnly && (
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold border-2 border-red-100 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={20} />
                حذف المحددين ({selectedIds.length})
              </button>
            )}
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors">
              <FileSpreadsheet size={20} />
              استيراد
            </button>
            <button onClick={addEmptyRow} className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold border-2 border-blue-100 hover:bg-blue-100 transition-colors">
              <Plus size={20} />
              إضافة
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200">
        <table className="w-full text-right whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-600 font-bold text-sm">
            <tr>
              <th className="p-3 w-12 text-center">
                {!isReadOnly && (
                   <input type="checkbox" onChange={toggleSelectAll} checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                )}
              </th>
              <th className="p-3 w-16 text-center">الرقم</th>
              <th className="p-3 w-32">المدرسة</th>
              <th className="p-3 w-32">الفرع</th>
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
            {paginatedStudents.map((student, index) => (
              <tr key={student.id} className={`border-b border-slate-200 transition-colors ${selectedIds.includes(student.id) ? 'bg-blue-50' : 'hover:bg-white'}`}>
                <td className="p-2 text-center">
                  {!isReadOnly && (
                    <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelect(student.id)} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  )}
                </td>
                <td className="p-2 text-center font-bold text-slate-500">{student.serialNumber}</td>
                <td className="p-2">
                  <select className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.school} onChange={e => updateRow(student.id, 'school', e.target.value)} disabled={isReadOnly}>
                    <option value="">اختر المدرسة</option>
                    {userSchools.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.branch} onChange={e => updateRow(student.id, 'branch', e.target.value)} disabled={isReadOnly || !student.school}>
                    <option value="">اختر الفرع</option>
                    {getAvailableBranches(student.school).map((b: string) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <input disabled={isReadOnly} type="text" className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.name} onChange={e => updateRow(student.id, 'name', e.target.value)} />
                </td>
                <td className="p-2">
                  <select disabled={isReadOnly} className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.grade} onChange={e => updateRow(student.id, 'grade', e.target.value)}>
                    <option value="">اختر...</option>
                    {['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select disabled={isReadOnly} className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.section} onChange={e => updateRow(student.id, 'section', e.target.value)}>
                     <option value="">اختر...</option>
                    {['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select disabled={isReadOnly} className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={student.gender} onChange={e => updateRow(student.id, 'gender', e.target.value)}>
                    <option value="">اختر...</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
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
            {paginatedStudents.length === 0 && (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-500 font-bold">لا يوجد طلاب مطابقين، قم بالإضافة أو الاستيراد من إكسل</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredStudents.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-sm font-bold text-slate-600">
            إجمالي الطلاب: {filteredStudents.length} (عرض {((studentPage - 1) * studentPageSize) + 1} إلى {Math.min(studentPage * studentPageSize, filteredStudents.length)})
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={studentPage === 1}
              onClick={() => setStudentPage(p => p - 1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg font-bold transition-colors"
            >
              السابق
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.ceil(filteredStudents.length / studentPageSize) }).map((_, i) => {
                // Show a limited number of page buttons
                const totalPages = Math.ceil(filteredStudents.length / studentPageSize);
                if (totalPages > 7) {
                  if (i !== 0 && i !== totalPages - 1 && Math.abs(i + 1 - studentPage) > 2) {
                    if (Math.abs(i + 1 - studentPage) === 3) return <span key={i} className="px-2 text-slate-400">...</span>;
                    return null;
                  }
                }
                return (
                  <button
                    key={i}
                    onClick={() => setStudentPage(i + 1)}
                    className={`w-10 h-10 rounded-lg font-bold transition-colors ${studentPage === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <button 
              disabled={studentPage * studentPageSize >= filteredStudents.length}
              onClick={() => setStudentPage(p => p + 1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg font-bold transition-colors"
            >
              التالي
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-bold">العرض:</span>
            <select 
              value={studentPageSize} 
              onChange={e => setStudentPageSize(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none text-sm font-bold"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

const StaffManager = () => {
  const { currentUser, data, updateData } = useGlobal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [staff, setStaff] = useState<StaffData[]>([]);

  useEffect(() => {
    let cloudData = data.secretariatStaff;
    const ls = localStorage.getItem('secretariat_staff');
    
    // Migrate local storage if cloud is completely empty AND local storage has something.
    if ((!cloudData || cloudData.length === 0) && ls) {
      try {
        const parsed = JSON.parse(ls);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          updateData({ secretariatStaff: parsed });
          cloudData = parsed;
          localStorage.removeItem('secretariat_staff'); // cleanup after migrate
        }
      } catch {}
    }

    if (cloudData) {
      setStaff(cloudData.map((s: any) => ({
        ...s,
        school: s.school || (s.schoolBranch ? s.schoolBranch.split('-')[0]?.trim() || s.schoolBranch : ''),
        branch: s.branch || (s.schoolBranch ? s.schoolBranch.split('-')[1]?.trim() || '' : '')
      })));
    }
  }, [data.secretariatStaff, updateData]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const saveStaff = (newStaff: StaffData[]) => {
    setStaff(newStaff);
    
    // Auto-sync imported staff to today's daily report so they appear immediately in the Dashboard
    const today = new Date().toISOString().split('T')[0];
    const dailyReports = [...(data.dailyReports || [])];
    
    // Only update reports from today that belong to the user's school (or all if admin)
    let updatedReports = false;
    dailyReports.forEach(r => {
      if (r.dateStr === today) {
        let changed = false;
        newStaff.forEach(s => {
          // Check if this teacher is already in the report
          if (!r.teachersData.some(t => t.teacherName === s.name)) {
            r.teachersData.push({
              id: crypto.randomUUID(),
              teacherName: s.name,
              subjectCode: s.subjects && s.subjects.length > 0 ? s.subjects.join(' / ') : '',
              className: s.grades && s.grades.length > 0 ? s.grades.join(' / ') : '',
              gender: s.gender || 'ذكر',
              violations_score: 0, violations_notes: [], attendance: 0, appearance: 0, preparation: 0, 
              supervision_queue: 0, supervision_rest: 0, supervision_prayer: 0, supervision_end: 0,
              class_management: 0, teaching_strategies: 0, technology_usage: 0, active_learning: 0,
              student_evaluation: 0, correction: 0, weak_students: 0, excellence_students: 0, enrichment: 0,
              correction_books: 0, correction_notebooks: 0, correction_followup: 0, teaching_aids: 0,
              extra_activities: 0, radio: 0, creativity: 0, zero_period: 0, follow_up: 0, admin_directives: 0,
              order: r.teachersData.length + 1
            } as any);
            changed = true;
          }
        });
        if (changed) updatedReports = true;
      }
    });

    if (updatedReports) {
      updateData({ secretariatStaff: newStaff, dailyReports });
    } else {
      updateData({ secretariatStaff: newStaff });
    }
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
        const rows = XLSX.utils.sheet_to_json(ws);
        
        let importedSchool = '';
        let importedBranch = '';
        for (const row of rows as any[]) {
            if (row['المدرسة'] || row['اسم المدرسة']) importedSchool = row['المدرسة'] || row['اسم المدرسة'];
            if (row['الفرع'] || row['اسم الفرع']) importedBranch = row['الفرع'] || row['اسم الفرع'];
        }
        
        const fallbackSchool = importedSchool || data.profile?.schoolName || currentUser?.selectedSchool?.split(',')[0] || '';
        const fallbackBranch = importedBranch || currentUser?.selectedBranch || '';

        let newStaff: StaffData[] = [...staff];
        let maxSerial = newStaff.reduce((max, s) => Math.max(max, s.serialNumber), 0);

        rows.forEach((row: any) => {
          maxSerial++;
          newStaff.push({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            serialNumber: maxSerial,
            school: row['اسم المدرسة'] || row['المدرسة'] || fallbackSchool,
            branch: row['اسم الفرع'] || row['الفرع'] || fallbackBranch,
            name: row['اسم المعلم'] || row['الاسم'] || '',
            gender: row['النوع'] || '',
            subjects: row['المواد']?.toString().split(',') || row['المادة']?.toString().split(',') || [],
            grades: row['الصفوف']?.toString().split(',') || row['الصف']?.toString().split(',') || [],
          });
        });
        const cleanStaff = JSON.parse(JSON.stringify(newStaff));
        saveStaff(cleanStaff);
      } catch (err) {
        alert('حدث خطأ أثناء قراءة الملف');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const addEmptyRow = () => {
    const maxSerial = staff.reduce((max, s) => Math.max(max, s.serialNumber), 0);
    const fallbackSchool = data.profile?.schoolName || currentUser?.selectedSchool?.split(',')[0] || '';
    const fallbackBranch = currentUser?.selectedBranch || '';
    saveStaff([...staff, {
      id: Date.now().toString(),
      serialNumber: maxSerial + 1,
      school: fallbackSchool, branch: fallbackBranch, name: '', gender: '', subjects: [], grades: []
    }]);
  };

  const updateRow = (id: string, field: string, value: any) => {
    saveStaff(staff.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  
  const deleteRow = (id: string) => {
    saveStaff(staff.filter(s => s.id !== id));
    setSelectedIds(selectedIds.filter(sel => sel !== id));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'حذف متعدد',
      message: `هل أنت متأكد من حذف ${selectedIds.length} موظف؟`,
      type: 'danger',
      onConfirm: () => {
        saveStaff(staff.filter(s => !selectedIds.includes(s.id)));
        setSelectedIds([]);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const toggleArrayItem = (id: string, field: 'subjects'|'grades', item: string) => {
    setStaff(staff.map(s => {
      if (s.id !== id) return s;
      const arr = s[field] || [];
      const newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
      return { ...s, [field]: newArr };
    }));
  };

  const isGeneralSupervisor = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
  const isExplicitlyDisabled = Array.isArray(currentUser?.permissions?.secretariat) && currentUser.permissions.secretariat.includes('disable');
  const isAllowEdits = Array.isArray(currentUser?.permissions?.secretariat) && currentUser.permissions.secretariat.includes('allowEdits');
  const isReadOnlyFlag = currentUser?.permissions?.readOnly === true;
  const isReadOnly = !isGeneralSupervisor && ((isReadOnlyFlag && !isAllowEdits) || isExplicitlyDisabled);

  const availableSchoolsKeys = Object.keys(data.profile.schoolsAndBranches || {});
  const userSchools = isGeneralSupervisor ? availableSchoolsKeys : currentUser?.selectedSchool.split(',').map(s => s.trim()) || [];

  const getAvailableBranches = (school: string) => {
    if (isGeneralSupervisor) return data.profile.schoolsAndBranches?.[school] || [];
    const userBranches = currentUser?.permissions?.schoolsAndBranches?.[school];
    if (userBranches && userBranches.length > 0) return userBranches;
    return userBranches || [];
  };

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staff;
    const lowerQ = searchQuery.toLowerCase();
    return staff.filter(s => 
      s.name.toLowerCase().includes(lowerQ) ||
      s.school.toLowerCase().includes(lowerQ) ||
      s.branch.toLowerCase().includes(lowerQ) ||
      (s.subjects || []).join(' ').toLowerCase().includes(lowerQ) ||
      (s.grades || []).join(' ').toLowerCase().includes(lowerQ)
    );
  }, [staff, searchQuery]);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredStaff.map(s => s.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="بحث عن معلم، مادة، صف، مدرسة..." 
            className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pr-12 pl-4 outline-none focus:border-blue-500 transition-colors font-bold text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {!isReadOnly && (
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold border-2 border-red-100 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={20} />
                حذف المحددين ({selectedIds.length})
              </button>
            )}
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors">
              <FileSpreadsheet size={20} />
              استيراد
            </button>
            <button onClick={addEmptyRow} className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold border-2 border-blue-100 hover:bg-blue-100 transition-colors">
              <Plus size={20} />
              إضافة
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200 pb-[100px]">
        <table className="w-full text-right whitespace-nowrap min-h-[200px]">
          <thead className="bg-slate-100 text-slate-600 font-bold text-sm">
            <tr>
              <th className="p-3 w-12 text-center">
                {!isReadOnly && (
                   <input type="checkbox" onChange={toggleSelectAll} checked={filteredStaff.length > 0 && selectedIds.length === filteredStaff.length} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                )}
              </th>
              <th className="p-3 w-16 text-center">الرقم</th>
              <th className="p-3 w-32">المدرسة</th>
              <th className="p-3 w-32">الفرع</th>
              <th className="p-3 min-w-[200px]">اسم المعلم</th>
              <th className="p-3 w-32">النوع</th>
              <th className="p-3 w-64">المادة (يمكن اختيار أكثر من واحدة)</th>
              <th className="p-3 w-64">الصف (يمكن اختيار أكثر من واحد)</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((employee, index) => (
               <tr key={employee.id} className={`border-b border-slate-200 transition-colors ${selectedIds.includes(employee.id) ? 'bg-blue-50' : 'hover:bg-white'}`}>
                <td className="p-2 text-center">
                  {!isReadOnly && (
                    <input type="checkbox" checked={selectedIds.includes(employee.id)} onChange={() => toggleSelect(employee.id)} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  )}
                </td>
                <td className="p-2 text-center font-bold text-slate-500">{employee.serialNumber}</td>
                <td className="p-2">
                  <select className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={employee.school} onChange={e => updateRow(employee.id, 'school', e.target.value)} disabled={isReadOnly}>
                    <option value="">اختر المدرسة</option>
                    {userSchools.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50" value={employee.branch} onChange={e => updateRow(employee.id, 'branch', e.target.value)} disabled={isReadOnly || !employee.school}>
                    <option value="">اختر الفرع</option>
                    {getAvailableBranches(employee.school).map((b: string) => <option key={b} value={b}>{b}</option>)}
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
                    <div className="min-h-[38px] p-2 border border-slate-200 rounded-lg bg-transparent truncate max-w-[200px]" title={(employee.subjects || []).join('، ')}>
                      {(employee.subjects || []).join('، ') || 'اختر...'}
                    </div>
                    {!isReadOnly && (
                      <div className="absolute top-full right-0 mt-1 w-48 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl hidden group-hover:block z-50">
                        {['مربية', 'القرآن الكريم', 'التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الكيمياء', 'الفيزياء', 'الأحياء', 'الاجتماعيات', 'الحاسوب', 'المكتبة', 'الفنية', 'المختص الاجتماعي', 'الأنشطة'].map(subj => (
                          <label key={subj} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm">
                            <input type="checkbox" checked={(employee.subjects || []).includes(subj)} onChange={() => toggleArrayItem(employee.id, 'subjects', subj)} className="rounded border-slate-300 text-blue-500 w-4 h-4 cursor-pointer" />
                            {subj}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <div className="relative group">
                    <div className="min-h-[38px] p-2 border border-slate-200 rounded-lg bg-transparent truncate max-w-[200px]" title={(employee.grades || []).join('، ')}>
                      {(employee.grades || []).join('، ') || 'اختر...'}
                    </div>
                    {!isReadOnly && (
                      <div className="absolute top-full right-0 mt-1 w-32 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl hidden group-hover:block z-50">
                        {['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(gr => (
                          <label key={gr} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm">
                            <input type="checkbox" checked={(employee.grades || []).includes(gr)} onChange={() => toggleArrayItem(employee.id, 'grades', gr)} className="rounded border-slate-300 text-blue-500 w-4 h-4 cursor-pointer" />
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
            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500 font-bold">لا يوجد موظفون مطابقون للبحث، قم بالإضافة أو الاستيراد من إكسل</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
