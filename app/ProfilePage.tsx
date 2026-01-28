
import React, { useState } from 'react';
import { useGlobal } from '../context/GlobalState';
import { Save, Plus, Trash2, School, Building, Calendar, Users, Briefcase, Sparkles } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { data, updateData, lang } = useGlobal();
  const profile = data.profile;

  const updateField = (field: string, value: string) => {
    updateData({
      profile: { ...profile, [field]: value }
    });
  };

  const handleAddCustomField = () => {
    const customFields = profile.customFields || [];
    updateData({
      profile: {
        ...profile,
        customFields: [...customFields, { label: '', value: '' }]
      }
    });
  };

  const updateCustomField = (index: number, field: 'label' | 'value', value: string) => {
    const customFields = [...(profile.customFields || [])];
    customFields[index][field] = value;
    updateData({ profile: { ...profile, customFields } });
  };

  const deleteCustomField = (index: number) => {
    const customFields = (profile.customFields || []).filter((_, i) => i !== index);
    updateData({ profile: { ...profile, customFields } });
  };

  const formFields = [
    { key: 'ministry', label: 'وزارة التربية والتعليم والبحث العلمي', icon: <School className="w-5 h-5" /> },
    { key: 'district', label: 'المنطقة التعليمية', icon: <Building className="w-5 h-5" /> },
    { key: 'schoolName', label: 'اسم المدارس', icon: <Briefcase className="w-5 h-5" /> },
    { key: 'branch', label: 'الفرع', icon: <Sparkles className="w-5 h-5" /> },
    { key: 'year', label: 'العام الدراسي', icon: <Calendar className="w-5 h-5" /> },
    { key: 'semester', label: 'الفصل الدراسي', icon: <Calendar className="w-5 h-5" /> },
    { key: 'branchManager', label: 'مدير الفرع', icon: <Users className="w-5 h-5" /> },
    { key: 'generalManager', label: 'المدير العام', icon: <Users className="w-5 h-5" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-arabic animate-in fade-in duration-500 pb-20">
      <header className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800">بيانات ملف المدرسة</h2>
          <p className="text-blue-500 font-bold mt-1 text-sm">إدارة المعلومات التنظيمية والإدارية للمؤسسة</p>
        </div>
        <div className="p-4 bg-blue-600 text-white rounded-3xl shadow-xl">
          <School size={32} />
        </div>
      </header>

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2 flex items-center gap-2">
                {field.icon}
                {field.label}
              </label>
              <input
                type="text"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-slate-700"
                value={(profile as any)[field.key] || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder="..."
              />
            </div>
          ))}
        </div>

        <div className="border-t pt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800">بنود إضافية مخصصة</h3>
            <button
              onClick={handleAddCustomField}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-sm hover:bg-black transition-all shadow-md active:scale-95"
            >
              <Plus size={16} /> إضافة حقل جديد
            </button>
          </div>

          <div className="space-y-4">
            {(profile.customFields || []).length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 italic font-bold">
                لا توجد حقول إضافية حالياً. اضغط "إضافة حقل جديد" لتخصيص ملف المدرسة.
              </div>
            ) : (
              (profile.customFields || []).map((field, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-4 animate-in slide-in-from-right-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">العنوان</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl focus:border-blue-400 outline-none font-bold text-xs"
                      value={field.label}
                      onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                      placeholder="مثال: رقم الترخيص"
                    />
                  </div>
                  <div className="flex-[2] space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">القيمة</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 p-3 bg-white border-2 border-slate-100 rounded-xl focus:border-blue-400 outline-none font-bold text-xs"
                        value={field.value}
                        onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                        placeholder="..."
                      />
                      <button
                        onClick={() => deleteCustomField(idx)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => alert('تم حفظ التغييرات تلقائياً في قاعدة البيانات المحلية')}
          className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-100 transition-all transform active:scale-[0.98] flex items-center justify-center gap-4 mt-6"
        >
          <Save size={24} />
          تأكيد وحفظ بيانات الملف
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
