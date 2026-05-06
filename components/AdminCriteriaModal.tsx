import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Save, Users, Building, FileSpreadsheet } from 'lucide-react';
import { useGlobal } from '../context/GlobalState';
import { MetricDefinition } from '../types';
import { toast } from 'sonner';

interface AdminCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCriteriaModal: React.FC<AdminCriteriaModalProps> = ({ isOpen, onClose }) => {
  const { data, updateData, currentUser } = useGlobal();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);

  // As per instructions, users can select schools and branches.
  // In the current architecture, updateData applies to the user's selected context.
  // We'll show the info so the user knows they are applying changes to their context.
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const isAdminOrFull = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
      const userSchools = isAdminOrFull 
        ? (data.availableSchools || []) 
        : Object.keys(currentUser?.permissions?.schoolsAndBranches || {});

      const defaultSchools = currentUser?.selectedSchool === 'all' 
        ? userSchools 
        : (currentUser?.selectedSchool ? currentUser.selectedSchool.split(',').map(s => s.trim()).filter(s => userSchools.includes(s)) : []);
      
      setSelectedSchools(defaultSchools.length > 0 ? defaultSchools : userSchools);

      if (currentUser?.selectedBranch) {
        setSelectedBranches([currentUser.selectedBranch]);
      }

      if (data.adminFollowUpTypes && data.adminFollowUpTypes.length > 0 && !selectedCategory) {
        setSelectedCategory(data.adminFollowUpTypes[0]);
      }
    }
  }, [isOpen, data.availableSchools, currentUser, selectedCategory, data.adminFollowUpTypes]);

  const [availableBranches, setAvailableBranches] = useState<string[]>([]);

  useEffect(() => {
    const branches = new Set<string>();
    const isAdminOrFull = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
    if (isAdminOrFull) {
      data.secretariatStudents?.forEach(s => { if (s.branch) branches.add(s.branch); });
      data.secretariatStaff?.forEach(s => { if (s.branch) branches.add(s.branch); });
      if (branches.size === 0) branches.add('بدون فرع مخصص');
    } else {
      selectedSchools.forEach(s => {
        const sb = currentUser?.permissions?.schoolsAndBranches?.[s] || [];
        sb.forEach(b => branches.add(b));
      });
    }
    const branchList = Array.from(branches);
    setAvailableBranches(branchList);
    
    // Auto-select valid branches or reset
    if (selectedBranches.length > 0) {
      const validSelected = selectedBranches.filter(b => branchList.includes(b));
      if (validSelected.length !== selectedBranches.length) {
        setSelectedBranches(validSelected);
      }
    }
  }, [selectedSchools, currentUser, data.secretariatStudents, data.secretariatStaff]);

  useEffect(() => {
    if (isOpen && selectedCategory) {
      const activeSchool = selectedSchools.length > 0 ? selectedSchools[0] : '';
      const activeBranch = selectedBranches.length > 0 ? selectedBranches[0] : '';
      const key = `${activeSchool}_${activeBranch}`;

      if (activeSchool && activeBranch && data.adminBranchMetrics?.[key]?.[selectedCategory]) {
        setMetrics(JSON.parse(JSON.stringify(data.adminBranchMetrics[key][selectedCategory])));
      } else if (data.adminMetricsList?.[selectedCategory]) {
        setMetrics(JSON.parse(JSON.stringify(data.adminMetricsList[selectedCategory])));
      } else {
        setMetrics([]);
      }
    }
  }, [isOpen, selectedCategory, data.adminMetricsList, data.adminBranchMetrics, selectedBranches, selectedSchools]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!selectedCategory) {
      toast.error('الرجاء اختيار مجال التقرير أولاً');
      return;
    }

    if (selectedSchools.length > 0 && selectedBranches.length > 0) {
      const updatedAdminBranchMetrics = { ...(data.adminBranchMetrics || {}) };
      selectedSchools.forEach(school => {
        selectedBranches.forEach(branch => {
          const key = `${school}_${branch}`;
          if (!updatedAdminBranchMetrics[key]) {
            updatedAdminBranchMetrics[key] = {};
          }
          updatedAdminBranchMetrics[key] = {
            ...updatedAdminBranchMetrics[key],
            [selectedCategory]: metrics
          };
        });
      });
      updateData({ adminBranchMetrics: updatedAdminBranchMetrics }, selectedSchools);
    } else {
      const updatedAdminMetrics = {
        ...(data.adminMetricsList || {}),
        [selectedCategory]: metrics
      };
      updateData({ adminMetricsList: updatedAdminMetrics }, selectedSchools);
    }

    toast.success('تم الحفظ وتعميم المعايير بنجاح');
    onClose();
  };

  const handleAdd = () => {
    setMetrics([
      ...metrics,
      { key: `admin_${Date.now()}`, label: 'معيار جديد', emoji: '📝', color: '#E1F5FE', max: 4 }
    ]);
  };

  const handleRemove = (index: number) => {
    const newMetrics = [...metrics];
    newMetrics.splice(index, 1);
    setMetrics(newMetrics);
  };

  const handleChange = (index: number, field: keyof MetricDefinition, value: any) => {
    const newMetrics = [...metrics];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    setMetrics(newMetrics);
  };

  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedSchools(value);
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedBranches(value);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        <div className="bg-gradient-to-l from-emerald-600 to-teal-600 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Users size={24} />
            </div>
            <h2 className="text-xl font-black">التحكم بمعايير متابعة الموظفين والعاملين</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Building size={20} className="text-emerald-600" />
              البيانات الأساسية للمجال
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">اسم المدارس المستهدفة</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 h-32 overflow-y-auto space-y-2">
                  {(currentUser?.role === 'admin' || currentUser?.permissions?.all === true ? (data.availableSchools || []) : Object.keys(currentUser?.permissions?.schoolsAndBranches || {})).map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-emerald-500" 
                        checked={selectedSchools.includes(s)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSchools([...selectedSchools, s]);
                          } else {
                            setSelectedSchools(selectedSchools.filter(x => x !== s));
                          }
                        }}
                      />
                      <span className="text-sm text-slate-700">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الفروع المستهدفة</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 h-32 overflow-y-auto space-y-2">
                   {availableBranches.map(b => (
                    <label key={b} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-emerald-500" 
                        checked={selectedBranches.includes(b)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBranches([...selectedBranches, b]);
                          } else {
                            setSelectedBranches(selectedBranches.filter(x => x !== b));
                          }
                        }}
                      />
                      <span className="text-sm text-slate-700">{b}</span>
                    </label>
                   ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">مجال التقرير</label>
                <select 
                  value={selectedCategory} 
                  onChange={e => setSelectedCategory(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>اختر المجال...</option>
                  {(data.adminFollowUpTypes || []).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedCategory && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <FileSpreadsheet size={20} className="text-emerald-600" />
                معايير التقييم للمجال: {selectedCategory}
              </h3>
              
              <div className="space-y-4">
                {metrics.length === 0 ? (
                  <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <p className="text-slate-500 font-bold mb-4">لم يتم العثور على معايير افتراضية لهذا المجال</p>
                    <button onClick={handleAdd} className="bg-emerald-100 text-emerald-700 px-6 py-2 rounded-lg font-bold hover:bg-emerald-200">
                      إضافة المعيار الأول
                    </button>
                  </div>
                ) : (
                  metrics.map((metric, idx) => (
                    <div key={metric.key} className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        value={metric.label}
                        onChange={(e) => handleChange(idx, 'label', e.target.value)}
                        placeholder="اسم المعيار (نص التقييم)"
                        className="flex-1 w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none font-bold text-slate-700 focus:border-emerald-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-600">الدرجة:</span>
                        <input
                          type="number"
                          min="1"
                          value={metric.max}
                          onChange={(e) => handleChange(idx, 'max', parseInt(e.target.value) || 1)}
                          className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none font-bold text-center focus:border-emerald-500"
                        />
                      </div>
                      <button onClick={() => handleRemove(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="حذف المعيار">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {metrics.length > 0 && (
                <button
                  onClick={handleAdd}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 py-3 rounded-xl border-2 border-dashed border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-colors font-bold"
                >
                  <Plus size={20} />
                  إضافة معيار جديد
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">
            إلغاء
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2">
            <Save size={20} />
            تغيير وتعميم على المدارس والفروع المشتركة
          </button>
        </div>
      </motion.div>
    </div>
  );
};
