
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useGlobal } from '../context/GlobalState';
import { Save, Plus, Trash2, School, Building, Calendar, Users, Briefcase, Sparkles, Image as ImageIcon, Upload } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { data, updateData, lang, currentUser } = useGlobal();
  const isReadOnly = currentUser?.permissions?.readOnly === true || (Array.isArray(currentUser?.permissions?.schoolProfile) && currentUser.permissions.schoolProfile.includes('disable'));
  const profile = data.profile;

  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.permissions?.all === true || currentUser?.permissions?.userManagement === true;

  useEffect(() => {
    // Only auto-fill if the profile is completely empty, to avoid overwriting the secretariat's settings
    if (currentUser && isManagerOrAdmin) {
      const mainSchool = currentUser.selectedSchool?.split(',')[0]?.trim() || '';
      const branches = currentUser.permissions?.schoolsAndBranches?.[mainSchool] || [];
      const mainBranch = branches[0] || '';

      if (!profile.schoolName && mainSchool) {
          updateData({
            profile: {
              ...profile,
              schoolName: mainSchool,
              branch: mainBranch
            }
          });
      }
    }
  }, [currentUser, profile, isManagerOrAdmin, updateData]);

  const updateField = (field: string, value: string) => {
    if (isReadOnly) return;
    updateData({
      profile: { ...profile, [field]: value }
    });
  };

  const handleAddCustomField = () => {
    if (isReadOnly) return;
    const customFields = profile.customFields || [];
    updateData({
      profile: {
        ...profile,
        customFields: [...customFields, { label: '', value: '' }]
      }
    });
  };

  const updateCustomField = (index: number, field: 'label' | 'value', value: string) => {
    if (isReadOnly) return;
    const customFields = (profile.customFields || []).map((f, i) =>
      i === index ? { ...f, [field]: value } : f
    );
    updateData({ profile: { ...profile, customFields } });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 2 ميجابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('logoImg', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteCustomField = (index: number) => {
    if (isReadOnly) return;
    const customFields = (profile.customFields || []).filter((_, i) => i !== index);
    updateData({ profile: { ...profile, customFields } });
  };

  const formFields = [
    { key: 'ministry', label: 'وزارة التربية والتعليم والبحث العلمي', icon: <School className="w-5 h-5" />, autoFilled: true },
    { key: 'district', label: 'المنطقة التعليمية', icon: <Building className="w-5 h-5" />, autoFilled: true },
    { key: 'schoolName', label: 'اسم المدارس', icon: <Briefcase className="w-5 h-5" />, autoFilled: true },
    { key: 'branch', label: 'الفرع', icon: <Sparkles className="w-5 h-5" />, autoFilled: true },
    { key: 'year', label: 'العام الدراسي', icon: <Calendar className="w-5 h-5" />, autoFilled: true },
    { key: 'branchManager', label: 'مدير الفرع', icon: <Users className="w-5 h-5" />, autoFilled: true },
    { key: 'generalManager', label: 'المدير العام', icon: <Users className="w-5 h-5" />, autoFilled: true },
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
        <div className="flex flex-col items-center justify-center space-y-4 mb-8">
          <div className="relative group w-32 h-32 rounded-[2rem] border-4 border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shadow-inner transition-all hover:border-blue-200 cursor-pointer">
            {profile.logoImg ? (
              <img src={profile.logoImg} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-10 h-10 text-slate-300 group-hover:text-blue-400 transition-colors" />
            )}
            {(!isReadOnly && isManagerOrAdmin) && (
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-sm">
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold">رفع شعار</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
          <div className="text-center">
            <h3 className="font-black text-slate-700">شعار المدرسة والفرع</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">يُفضل استخدام صورة بخلفية شفافة (png)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formFields.map((field) => {
            const isReadOnly = field.autoFilled && !isManagerOrAdmin;
            return (
              <div key={field.key} className="space-y-2">
                <label className="text-xs font-black text-slate-500 mr-2 flex items-center gap-2">
                  {field.icon}
                  {field.label}
                  {isReadOnly && <span className="text-[10px] text-white bg-slate-400 px-1.5 py-0.5 rounded-full">تلقائي</span>}
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  className={`w-full p-4 rounded-2xl border-2 transition-all outline-none font-bold text-slate-700 ${isReadOnly ? 'bg-slate-100 border-slate-200 opacity-70 cursor-not-allowed' : 'bg-slate-50 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'}`}
                  value={(profile as any)[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder="..."
                />
              </div>
            );
          })}
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
                <div key={`custom-field-${idx}`} className="flex flex-col md:flex-row gap-4 animate-in slide-in-from-right-2">
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
          onClick={() => toast.success('تم حفظ التغييرات تلقائياً في قاعدة البيانات المحلية')}
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
