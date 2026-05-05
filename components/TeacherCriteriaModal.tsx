import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Save, FileSpreadsheet } from 'lucide-react';
import { useGlobal } from '../context/GlobalState';
import { MetricDefinition } from '../types';
import { toast } from 'sonner';

interface TeacherCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherCriteriaModal: React.FC<TeacherCriteriaModalProps> = ({ isOpen, onClose }) => {
  const { data, updateData } = useGlobal();
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);

  useEffect(() => {
    if (isOpen) {
      setMetrics(data.metricsList ? JSON.parse(JSON.stringify(data.metricsList)) : []);
    }
  }, [isOpen, data.metricsList]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateData({ metricsList: metrics });
    toast.success('تم الحفظ وتعميم المعايير بنجاح');
    onClose();
  };

  const handleAdd = () => {
    setMetrics([
      ...metrics,
      { key: `custom_${Date.now()}`, label: 'معيار جديد', emoji: '📝', color: 'bg-emerald-600', max: 5 }
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

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <FileSpreadsheet size={24} />
            </div>
            <h2 className="text-xl font-black">التحكم بمعايير متابعة المعلمين</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="space-y-4">
            {metrics.map((metric, idx) => (
              <div key={metric.key} className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <input
                  type="text"
                  value={metric.label}
                  onChange={(e) => handleChange(idx, 'label', e.target.value)}
                  placeholder="اسم المعيار"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none font-bold text-slate-700"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600 w-16">الدرجة:</span>
                  <input
                    type="number"
                    min="1"
                    value={metric.max}
                    onChange={(e) => handleChange(idx, 'max', parseInt(e.target.value) || 1)}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none font-bold text-center"
                  />
                </div>
                <button
                  onClick={() => handleRemove(idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="حذف المعيار"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAdd}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-xl border-2 border-dashed border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors font-bold"
          >
            <Plus size={20} />
            إضافة معيار جديد
          </button>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save size={20} />
            تغيير وتعميم على المدارس والفروع المشتركة
          </button>
        </div>
      </motion.div>
    </div>
  );
};
