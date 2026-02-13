import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, User, Target, FolderOpen, UserCircle, Upload, FileText,
    Settings2, Filter, ListOrdered, Calendar, UserCheck, ClipboardCheck,
    FileSpreadsheet, MessageCircle, FileOutput, BookOpen, GraduationCap,
    Hammer, ShieldAlert, Star, History, Zap
} from 'lucide-react';

interface PullUpMenuProps {
    isOpen: boolean;
    onClose: () => void;
    view: string;
    onAction: (actionId: string) => void;
}

const PullUpMenu: React.FC<PullUpMenuProps> = ({ isOpen, onClose, view, onAction }) => {
    const getActions = () => {
        const mainView = view.split(':')[0];
        switch (mainView) {
            case 'daily':
                return [
                    { id: 'add_table', label: 'إضافة جدول جديد', icon: <Plus /> },
                    { id: 'writer', label: 'كاتب التقرير', icon: <User /> },
                    { id: 'indicators', label: 'مؤشرات التقرير', icon: <Target /> },
                    { id: 'archive', label: 'فتح تقرير', icon: <FolderOpen /> },
                    { id: 'add_teacher', label: 'إضافة معلم', icon: <UserCircle /> },
                    { id: 'import', label: 'استيراد أسماء المعلمين', icon: <Upload /> },
                    { id: 'teacher_report', label: 'تقرير معلم', icon: <FileText /> },
                    { id: 'metrics', label: 'تخصيص المجالات', icon: <Settings2 /> },
                    { id: 'filter', label: 'تصفية العرض', icon: <Filter /> },
                    { id: 'sort', label: 'ترتيب الأسماء', icon: <ListOrdered /> },
                    { id: 'date', label: 'تاريخ الجدول', icon: <Calendar /> },
                ];
            case 'staffFollowUp':
                return [
                    { id: 'follow_up_type', label: 'نوع المتابعة', icon: <ClipboardCheck /> },
                    { id: 'writer', label: 'كاتب التقرير', icon: <User /> },
                    { id: 'report_type', label: 'نوع التقرير', icon: <FileOutput /> },
                    { id: 'show_report', label: 'إظهار التقرير', icon: <FileText /> },
                    { id: 'indicators', label: 'مؤشرات التقرير', icon: <Target /> },
                    { id: 'archive', label: 'أرشيف التقرير', icon: <FolderOpen /> },
                    { id: 'add_name', label: 'إضافة اسم', icon: <Plus /> },
                    { id: 'import', label: 'استيراد الأسماء', icon: <Upload /> },
                    { id: 'individual_report', label: 'تقرير فردي', icon: <UserCircle /> },
                    { id: 'metrics', label: 'تخصيص المجالات', icon: <Settings2 /> },
                    { id: 'export_excel', label: 'تصدير إكسل', icon: <FileSpreadsheet /> },
                    { id: 'export_whatsapp', label: 'تصدير واتساب', icon: <MessageCircle /> },
                    { id: 'export_txt', label: 'تصدير TXT', icon: <FileText /> },
                ];
            case 'substitute':
                return [
                    { id: 'tabs', label: 'تغطية الحصص / الجدول', icon: <BookOpen /> },
                    { id: 'add_table', label: 'إضافة جدول جديد', icon: <Plus /> },
                    { id: 'date', label: 'التاريخ', icon: <Calendar /> },
                    { id: 'history', label: 'تقارير التغطية السابقة', icon: <History /> },
                    { id: 'add_absence', label: 'إضافة بند غياب', icon: <Plus /> },
                    { id: 'export_excel', label: 'تصدير إكسل', icon: <FileSpreadsheet /> },
                    { id: 'export_whatsapp', label: 'تصدير واتساب', icon: <MessageCircle /> },
                    { id: 'export_txt', label: 'تصدير TXT', icon: <FileText /> },
                ];
            case 'studentReports':
                return [
                    { id: 'add_student', label: 'إضافة طالب', icon: <Plus /> },
                    { id: 'student_report', label: 'تقرير طالب', icon: <GraduationCap /> },
                    { id: 'import', label: 'استيراد ملف', icon: <Upload /> },
                    { id: 'delete_student', label: 'حذف طالب', icon: <X /> },
                    { id: 'auto_fill', label: 'التعبئة التلقائية', icon: <Zap /> },
                    { id: 'excellence_list', label: 'قائمة التميز', icon: <Star /> },
                    { id: 'black_list', label: 'القائمة السوداء', icon: <ShieldAlert /> },
                    { id: 'advanced_filter', label: 'فلترة متقدمة', icon: <Filter /> },
                    { id: 'export_excel', label: 'تصدير إكسل', icon: <FileSpreadsheet /> },
                    { id: 'export_whatsapp', label: 'تصدير واتساب', icon: <MessageCircle /> },
                    { id: 'export_txt', label: 'تصدير TXT', icon: <FileText /> },
                ];
            default:
                return [];
        }
    };

    const actions = getActions();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
                    />

                    {/* Full-Height Narrow Side Drawer */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                        className="fixed inset-y-4 right-4 w-44 bg-[#2c2c34] z-[160] rounded-[2.5rem] shadow-[-10px_0_50px_rgba(0,0,0,0.4)] border border-white/5 overflow-hidden flex flex-col"
                    >
                        <div className="flex flex-col items-center justify-between p-6 border-b border-white/5 bg-black/20">
                            <h3 className="text-sm font-black text-[#b2bec3] uppercase tracking-widest">الخيارات</h3>
                            <button
                                onClick={onClose}
                                className="mt-4 p-2 bg-white/5 text-[#b2bec3] rounded-full hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-90"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto custom-scrollbar">
                            {actions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={() => {
                                        onAction(action.id);
                                        onClose();
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl hover:bg-white/5 transition-all group active:scale-95"
                                >
                                    <div className="w-10 h-10 flex items-center justify-center bg-[#3f3f4a] rounded-2xl text-[#b2bec3] group-hover:bg-[#e17055] group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(225,112,85,0.3)] transition-all">
                                        {React.cloneElement(action.icon as React.ReactElement<any>, { size: 18 })}
                                    </div>
                                    <span className="text-[10px] font-black text-[#b2bec3] group-hover:text-white text-center line-clamp-2">{action.label}</span>
                                </button>
                            ))}
                            {actions.length === 0 && (
                                <div className="py-12 text-center text-[#636e72] italic font-bold text-[10px]">
                                    لا توجد خيارات.
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/5 bg-black/10">
                            <div className="w-1 h-12 bg-white/5 mx-auto rounded-full" />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PullUpMenu;