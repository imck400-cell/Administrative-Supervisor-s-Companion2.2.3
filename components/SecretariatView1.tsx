import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Briefcase, Users, Upload, FileSpreadsheet, Plus, Trash2, Search, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGlobal } from '../context/GlobalState';
import * as XLSX from 'xlsx';

type TabType = 'students' | 'staff' | null;

interface StudentData {
  id: string;
  serialNumber: number;
  schoolBranch?: string; // legacy
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
  schoolBranch?: string; // legacy
  school: string;
  branch: string;
  name: string;
  gender: string;
  subjects: string[];
  grades: string[];
}

import ConfirmDialog from './ConfirmDialog';

export const SecretariatView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(null);
  
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

// ... StudentsManager & StaffManager omitted here ...
