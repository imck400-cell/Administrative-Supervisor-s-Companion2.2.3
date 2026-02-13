
import React, { useState, useMemo, useEffect } from 'react';
import { useGlobal } from '../context/GlobalState';
import {
    Plus, Archive, UserPlus, FileUp, UserCircle, Palette,
    Search, CheckCircle, Zap, Trash2, Star, X, AlertCircle,
    FileText, Share2, Download, ChevronUp, ChevronDown, ListFilter,
    Users, LayoutDashboard, ClipboardList, Send, Calendar, Clock,
    FileBarChart2, MoreHorizontal, MessageSquare, Target, FileOutput, ChevronLeft
} from 'lucide-react';
import { AdminFollowUp, AdminReportContainer, MetricDefinition } from '../types';

const StaffFollowUpPage: React.FC = React.memo(() => {
    const { lang, data, updateData } = useGlobal();

    // Local State
    const [currentReportId, setCurrentReportId] = useState<string | null>(null);
    const [followUpType, setFollowUpType] = useState<string>(data.adminFollowUpTypes?.[0] || 'متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس');
    const [writer, setWriter] = useState<string>('');
    const [showArchive, setShowArchive] = useState(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [showSummaryReport, setShowSummaryReport] = useState<string | null>(null); // 'أسبوعي', 'شهري', etc.
    const [violationModal, setViolationModal] = useState<{ id: string, notes: string[] } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
    const [showIndividualModal, setShowIndividualModal] = useState<string | null>(null);
    const [notesModal, setNotesModal] = useState<{ empId: string; text: string } | null>(null);
    const [individualSearch, setIndividualSearch] = useState('');
    const [fillValues, setFillValues] = useState<Record<string, number>>({});
    const [aggDateFrom, setAggDateFrom] = useState<string>(new Date().toISOString().split('T')[0]);
    const [aggDateTo, setAggDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedReportPeriod, setSelectedReportPeriod] = useState<string | null>(null);
    const [archiveTab, setArchiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('daily');
    const [archiveSearch, setArchiveSearch] = useState('');
    const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);


    // Derived Data
    const displayedMetrics = useMemo(() => {
        return data.adminMetricsList?.[followUpType] || [];
    }, [data.adminMetricsList, followUpType]);

    const employees = useMemo(() => {
        const report = data.adminReports?.find(r => r.id === currentReportId);
        if (!report) return [];
        let list = [...report.employeesData];
        if (searchTerm) {
            list = list.filter(e => e.employeeName.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return list;
    }, [data.adminReports, currentReportId, searchTerm]);

    const setWriterState = (w: string) => {
        setWriter(w);
        const updatedReports = (data.adminReports || []).map(r =>
            r.id === currentReportId ? { ...r, writer: w } : r
        );
        updateData({ adminReports: updatedReports });
    };

    // Utility for numeric conversion
    const toEnglishNum = (str: string | number) => {
        if (str === null || str === undefined) return '0';
        const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return str.toString().replace(/[٠-٩]/g, d => arabicNums.indexOf(d).toString());
    };

    const toArabicNum = (str: string | number) => {
        if (str === null || str === undefined) return '٠';
        const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return str.toString().replace(/[0-9]/g, d => arabicNums[parseInt(d)]);
    };

    const createNewReport = () => {
        const lastReportOfType = (data.adminReports || []).find(r => r.followUpType === followUpType);
        const inheritedEmployees = lastReportOfType ? lastReportOfType.employeesData.map(e => ({
            ...e,
            id: `emp_${Date.now()}_${Math.random()}`,
            violations_score: 0,
            violations_notes: [],
            ...displayedMetrics.reduce((acc, m) => ({ ...acc, [m.key]: 0 }), {})
        })) : [];

        const newId = `admin_report_${Date.now()}`;
        const newReport: AdminReportContainer = {
            id: newId,
            dateStr: new Date().toISOString().split('T')[0],
            followUpType: followUpType,
            writer: writer,
            employeesData: inheritedEmployees
        };
        updateData({ adminReports: [newReport, ...(data.adminReports || [])] });
        setCurrentReportId(newId);
    };

    const addEmployee = () => {
        const report = data.adminReports?.find(r => r.id === currentReportId);
        if (!report) return;

        const newEmp: AdminFollowUp = {
            id: `emp_${Date.now()}`,
            employeeName: 'موظف جديد',
            gender: 'غير محدد',
            role: 'غير محدد',
            branch: 'غير محدد',
            violations_score: 0,
            violations_notes: [],
            recommendations: '',
            unaccreditedMetrics: [],
            ...displayedMetrics.reduce((acc, m) => ({ ...acc, [m.key]: 0 }), {})
        };

        const updatedReports = (data.adminReports || []).map(r =>
            r.id === currentReportId ? { ...r, employeesData: [...(r.employeesData || []), newEmp] } : r
        );
        updateData({ adminReports: updatedReports });
    };

    // Handle Bottom Menu Actions
    useEffect(() => {
        const handleAction = (e: any) => {
            const { actionId } = e.detail;
            switch (actionId) {
                case 'add_table': createNewReport(); break;
                case 'indicators': setShowIndicatorsModal(true); break;
                case 'archive': setShowArchive(true); break;
                case 'add_teacher': addEmployee(); break;
                case 'import': {
                    const btn = document.querySelector('[data-type="import-btn"]');
                    if (btn instanceof HTMLElement) btn.click();
                    break;
                }
                case 'teacher_report': if (employees.length > 0) setShowIndividualModal(employees[0].id); break;
                case 'metrics': setShowCustomizer(true); break;
                case 'excel': exportToExcel(); break;
                case 'date': {
                    const btn = document.querySelector('[data-type="report-info"]');
                    if (btn instanceof HTMLElement) btn.click();
                    break;
                }
            }
        };
        window.addEventListener('page-action', handleAction);
        return () => window.removeEventListener('page-action', handleAction);
    }, [employees, followUpType, currentReportId, displayedMetrics, data.adminReports, writer]);

    // Auto-create report for today on load or type change
    useEffect(() => {
        if (!data.adminReports) return;
        const today = new Date().toISOString().split('T')[0];
        const existing = data.adminReports.find(r => r.dateStr === today && r.followUpType === followUpType && !r.reportCount);
        if (!existing) {
            // Inherit writer and employees from the most recent daily report of any type or this type
            const lastReport = (data.adminReports || []).find(r => !r.reportCount);
            const lastReportSameType = (data.adminReports || []).find(r => r.followUpType === followUpType && !r.reportCount);

            const inheritedWriter = lastReportSameType?.writer || lastReport?.writer || '';
            const inheritedEmployees = lastReportSameType ? lastReportSameType.employeesData.map(e => ({
                ...e,
                id: `emp_${Date.now()}_${Math.random()}`,
                violations_score: 0,
                violations_notes: [],
                recommendations: '',
                ...displayedMetrics.reduce((acc, m) => ({ ...acc, [m.key]: 0 }), {})
            })) : [];

            const newId = `admin_report_${Date.now()}`;
            const newReport: AdminReportContainer = {
                id: newId,
                dateStr: today,
                followUpType: followUpType,
                writer: inheritedWriter,
                employeesData: inheritedEmployees
            };
            setCurrentReportId(newId);
            setWriterState(inheritedWriter);
        } else {
            setCurrentReportId(existing.id);
            setWriterState(existing.writer || '');
        }
    }, [followUpType, data.adminReports, displayedMetrics, updateData, setCurrentReportId]);


    // Hijri date helper with month names
    const hijriMonths = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
    const toHijriFriendly = (dateStr: string) => {
        try {
            if (!dateStr) return '';
            // Handle range
            if (dateStr.includes(' إلى ')) {
                const parts = dateStr.split(' إلى ');
                return `${toHijriFriendly(parts[0])} إلى ${toHijriFriendly(parts[1])}`;
            }
            const d = new Date(dateStr);
            const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
            const day = parts.find(p => p.type === 'day')?.value || '';
            const monthNum = parseInt(parts.find(p => p.type === 'month')?.value || '1');
            const year = parts.find(p => p.type === 'year')?.value || '';
            return `${day}/ ${hijriMonths[monthNum - 1]}/ ${year}`;
        } catch { return dateStr; }
    };

    const formatGregorianDate = (dateStr: string) => {
        try {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d);
        } catch { return dateStr; }
    };

    // Generate report title helper
    const getReportTitle = (report: any) => {
        const typeLabel = report?.periodName || 'اليومي';
        return `التقرير ${typeLabel} لأداء المعلمين والمعلمات`;
    };

    const getReportDateLabel = (report: any) => {
        if (report?.reportCount) {
            const parts = (report.dateStr || '').split(' إلى ');
            return `من تاريخ ${toHijriFriendly(parts[0])}هـ - ${formatGregorianDate(parts[0])}م إلى ${toHijriFriendly(parts[1])}هـ - ${formatGregorianDate(parts[1])}م`;
        }
        return `بتاريخ ${toHijriFriendly(report?.dateStr || '')}هـ - ${formatGregorianDate(report?.dateStr || '')}م`;
    };

    // Actions
    const handleTypeChange = (newType: string) => {
        let targetType = newType;
        if (newType === 'متابعة أخرى') {
            const customName = prompt('أدخل مسمى نوع المتابعة الجديد:');
            if (customName) {
                if (!data.adminFollowUpTypes?.includes(customName)) {
                    updateData({
                        adminFollowUpTypes: [...(data.adminFollowUpTypes || []), customName],
                        adminMetricsList: {
                            ...(data.adminMetricsList || {}),
                            [customName]: data.adminMetricsList?.['متابعة أخرى'] || []
                        }
                    });
                }
                targetType = customName;
            } else return;
        }

        setFollowUpType(targetType);
        // Automatically switch to the latest report of this type if it exists
        const reportsOfType = (data.adminReports || []).filter(r => r.followUpType === targetType);
        if (reportsOfType.length > 0) {
            setCurrentReportId(reportsOfType[0].id);
            setWriterState(reportsOfType[0].writer || '');
        } else {
            setCurrentReportId(null);
            setWriterState('');
        }
    };


    const aggregateReports = (period: string) => {
        if (!data.adminReports || data.adminReports.length === 0) {
            alert('لا توجد تقارير سابقة لتجميعها');
            return;
        }

        const filtered = (data.adminReports || []).filter(r =>
            r.followUpType === followUpType &&
            r.dateStr >= aggDateFrom &&
            r.dateStr <= aggDateTo &&
            !r.reportCount // CRITICAL: Only aggregate daily reports
        );

        if (filtered.length === 0) {
            alert('لا توجد تقارير يومية في هذه الفترة الزمنية لهذا النوع من المتابعة لكي يتم تجميعها في تقرير ' + period);
            return;
        }

        const reportCount = filtered.length;

        // Aggregation Logic: Group by employee name
        const aggregatedData: Record<string, AdminFollowUp> = {};
        filtered.forEach(report => {
            report.employeesData.forEach(emp => {
                if (!aggregatedData[emp.employeeName]) {
                    aggregatedData[emp.employeeName] = {
                        ...emp,
                        id: `agg_${Date.now()}_${emp.employeeName}`,
                        unaccreditedMetrics: emp.unaccreditedMetrics || []
                    };
                    // Initialize metrics to 0 for aggregation
                    displayedMetrics.forEach(m => { aggregatedData[emp.employeeName][m.key] = 0; });
                    aggregatedData[emp.employeeName].violations_score = 0;
                    aggregatedData[emp.employeeName].violations_notes = [];
                }

                const target = aggregatedData[emp.employeeName];
                displayedMetrics.forEach(m => {
                    target[m.key] = (Number(target[m.key]) || 0) + (Number(emp[m.key]) || 0);
                });
                target.violations_score += (emp.violations_score || 0);
                target.violations_notes = [...new Set([...target.violations_notes, ...emp.violations_notes])];
            });
        });

        const periodMap: Record<string, string> = { 'أسبوعي': 'الأسبوعي', 'شهري': 'الشهري', 'فصلي': 'الفصلي', 'سنوي': 'السنوي' };
        const newId = `agg_report_${period}_${Date.now()}`;
        const newReport: AdminReportContainer = {
            id: newId,
            dateStr: `${aggDateFrom} إلى ${aggDateTo}`,
            followUpType: followUpType,
            writer: writer,
            employeesData: Object.values(aggregatedData),
            reportCount: reportCount,
            periodName: periodMap[period] || period
        };

        updateData({ adminReports: [newReport, ...(data.adminReports || [])] });
        setCurrentReportId(newId);
        alert(`تم إنشاء التقرير الـ ${period} بنجاح من ${reportCount} تقرير سابق في الفترة المحددة`);
    };

    const deleteReport = (reportId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا التقرير؟')) {
            const newList = (data.adminReports || []).filter(r => r.id !== reportId);
            updateData({ adminReports: newList });
            if (currentReportId === reportId) setCurrentReportId(null);
        }
    };


    const updateEmployee = (empId: string, updates: Partial<AdminFollowUp>) => {
        const updatedReports = (data.adminReports || []).map(r => {
            if (r.id === currentReportId) {
                const newEmps = r.employeesData.map(e => e.id === empId ? { ...e, ...updates } : e);
                return { ...r, employeesData: newEmps };
            }
            return r;
        });
        updateData({ adminReports: updatedReports });
    };

    const deleteEmployees = (ids: string[]) => {
        if (confirm(`حذف ${ids.length} موظف؟`)) {
            const updatedReports = (data.adminReports || []).map(r => {
                if (r.id === currentReportId) return { ...r, employeesData: r.employeesData.filter(e => !ids.includes(e.id)) };
                return r;
            });
            updateData({ adminReports: updatedReports });
            setSelectedEmployees(prev => prev.filter(id => !ids.includes(id)));
        }
    };

    const toggleAccreditation = (empId: string | 'bulk', metricKey: string) => {
        const updatedReports = (data.adminReports || []).map(r => {
            if (r.id === currentReportId) {
                const newEmps = r.employeesData.map(e => {
                    if (empId === 'bulk' || e.id === empId) {
                        const current = e.unaccreditedMetrics || [];
                        const updated = current.includes(metricKey) ? current.filter(k => k !== metricKey) : [...current, metricKey];
                        return { ...e, unaccreditedMetrics: updated };
                    }
                    return e;
                });
                return { ...r, employeesData: newEmps };
            }
            return r;
        });
        updateData({ adminReports: updatedReports });
    };

    const fillMetricColumn = (metricKey: string, value: number) => {
        const updatedReports = (data.adminReports || []).map(r => {
            if (r.id === currentReportId) {
                const newEmps = r.employeesData.map(e => ({ ...e, [metricKey]: value }));
                return { ...r, employeesData: newEmps };
            }
            return r;
        });
        updateData({ adminReports: updatedReports });
    };

    // Calculations
    const calculateTotal = (emp: AdminFollowUp) => {
        return displayedMetrics.reduce((acc, m) => {
            if ((emp.unaccreditedMetrics || []).includes(m.key)) return acc;
            return acc + (Number(emp[m.key]) || 0);
        }, 0);
    };

    const calculateMaxTotal = (emp: AdminFollowUp) => {
        const report = data.adminReports?.find(r => r.id === currentReportId);
        const reportCount = report?.reportCount || 1;
        return displayedMetrics.reduce((acc, m) => {
            if ((emp.unaccreditedMetrics || []).includes(m.key)) return acc;
            return acc + (m.max * reportCount);
        }, 0);
    };

    const getColSum = (metricKey: string) => {
        return employees.reduce((acc, e) => {
            if ((e.unaccreditedMetrics || []).includes(metricKey)) return acc;
            return acc + (Number(e[metricKey]) || 0);
        }, 0);
    };

    const getColPercent = (metricKey: string, maxVal: number) => {
        const report = data.adminReports?.find(r => r.id === currentReportId);
        const reportCount = report?.reportCount || 1;
        const multipliedMax = maxVal * reportCount;

        const credibleEmps = employees.filter(e => !(e.unaccreditedMetrics || []).includes(metricKey));
        if (credibleEmps.length === 0 || multipliedMax === 0) return '0';
        const sum = getColSum(metricKey);
        const totalMax = credibleEmps.length * multipliedMax;
        return ((sum / totalMax) * 100).toFixed(1);
    };

    const handleMaxChange = (key: string, newMax: number) => {
        const updated = displayedMetrics.map(m => m.key === key ? { ...m, max: newMax } : m);
        updateData({ adminMetricsList: { ...(data.adminMetricsList || {}), [followUpType]: updated } });
    };

    const reorderDomain = (index: number, direction: 'up' | 'down') => {
        const newMetrics = [...displayedMetrics];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newMetrics.length) {
            [newMetrics[index], newMetrics[targetIndex]] = [newMetrics[targetIndex], newMetrics[index]];
            updateData({ adminMetricsList: { ...(data.adminMetricsList || {}), [followUpType]: newMetrics } });
        }
    };

    const renameDomain = (key: string, newLabel: string) => {
        const updated = displayedMetrics.map(m => m.key === key ? { ...m, label: newLabel } : m);
        updateData({ adminMetricsList: { ...(data.adminMetricsList || {}), [followUpType]: updated } });
    };

    const handleAddOption = (field: 'gender' | 'role' | 'branch', empId: string) => {
        const newVal = prompt('أدخل القيمة الجديدة:');
        if (newVal) {
            updateEmployee(empId, { [field]: newVal });
        }
    };

    // Styling Helpers
    const getTextColor = (bgColor: string) => {
        if (!bgColor) return 'text-slate-800';
        if (bgColor.startsWith('bg-')) return 'text-white';
        const color = (bgColor.startsWith('#')) ? bgColor.substring(1) : bgColor;
        if (color.length !== 6) return 'text-slate-900';
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128 ? 'text-white' : 'text-slate-900';
    };

    const getMetricStyle = (m: MetricDefinition) => {
        if (m.color?.startsWith('bg-')) return {};
        return { backgroundColor: m.color };
    };

    const generateWhatsAppReport = (empId: string | 'bulk') => {
        const report = data.adminReports?.find(r => r.id === currentReportId);
        if (!report) return;

        const profile = data.profile;
        const title = getReportTitle(report) + ' - ' + getReportDateLabel(report);

        let msg = `✨ *${profile.schoolName || 'المدرسة'} - ${profile.branch || 'الفرع'}* ✨\n`;
        msg += `📋 *${title}*\n`;
        msg += `✍️ *كاتب التقرير:* ${writer || report.writer || 'غير محدد'}\n`;
        msg += `━━━━━━━━━━━━━━━\n\n`;

        if (empId === 'bulk') {
            employees.forEach((emp, idx) => {
                const total = calculateTotal(emp);
                const max = calculateMaxTotal(emp);
                const percent = max > 0 ? ((total / max) * 100).toFixed(1) : '0';

                msg += `👤 *${idx + 1}. ${emp.employeeName}*\n`;
                msg += `🛠️ الوظيفة: ${emp.role}\n`;
                msg += `🏆 الدرجة: ${total} / ${max} (${percent}%)\n`;
                if (emp.violations_score > 0) msg += `⚠️ المخالفات: ${emp.violations_score}\n`;
                msg += `┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈\n`;
            });
        } else {
            const emp = employees.find(e => e.id === empId);
            if (!emp) return;
            const total = calculateTotal(emp);
            const max = calculateMaxTotal(emp);
            const percent = max > 0 ? ((total / max) * 100).toFixed(1) : '0';

            msg += `👤 *الاسم:* ${emp.employeeName}\n`;
            msg += `🏢 *الفرع:* ${emp.branch}\n`;
            msg += `🛠️ *الوظيفة:* ${emp.role}\n\n`;
            msg += `✅ *نتائج المجالات:*\n`;

            displayedMetrics.forEach(m => {
                if (!(emp.unaccreditedMetrics || []).includes(m.key)) {
                    msg += `- ${m.label}: ${emp[m.key] || 0} / ${m.max * (report.reportCount || 1)}\n`;
                }
            });

            msg += `\n🚨 *المخالفات:* ${emp.violations_score}\n`;
            msg += `🏆 *المجموع الكلي:* ${total} / ${max}\n`;
            msg += `📈 *النسبة المئوية:* ${percent}%\n`;
        }

        msg += `\n━━━━━━━━━━━━━━━\n`;
        msg += `📍 *${profile.schoolName || ''}${profile.branch ? ` - فرع ${profile.branch}` : ''}*`;

        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const exportToExcel = () => {
        const report = data.adminReports?.find(r => r.id === currentReportId);
        if (!report) return;

        const profile = data.profile;
        const title = getReportTitle(report);
        const dateLabel = getReportDateLabel(report);
        const rcCount = report.reportCount || 1;

        // Build Excel-compatible HTML table for better formatting
        let content = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<style>
    table { border-collapse: collapse; width: 100%; direction: rtl; }
    th, td { border: 1px solid #000; padding: 8px; text-align: center; font-family: Arial, sans-serif; }
    .title-section { border: none; text-align: center; font-size: 18px; font-weight: bold; }
    .date-section { border: none; text-align: center; font-size: 14px; color: #333; }
    .subheader { background-color: #f1f5f9; font-weight: bold; }
    .metric-header { background-color: #f8fafc; font-weight: bold; font-size: 11px; }
    .footer-row { background-color: #f8fafc; font-weight: bold; }
    .total-cell { background-color: #f1f5f9; font-weight: bold; }
    .percent-cell { background-color: #334155; color: white; font-weight: bold; }
</style>
</head>
<body>
<table>
    <tr>
        <td colspan="${5 + displayedMetrics.length + 3}" class="title-section" style="font-size: 22px; padding: 10px;">
            ${profile.schoolName || 'المدرسة'} - ${profile.branch || ''}
        </td>
    </tr>
    <tr>
        <td colspan="${5 + displayedMetrics.length + 3}" class="title-section" style="padding: 10px;">
            ${title}
        </td>
    </tr>
    <tr>
        <td colspan="${5 + displayedMetrics.length + 3}" class="date-section" style="padding: 8px; font-weight: bold;">
            ${dateLabel}
        </td>
    </tr>
    <tr><td colspan="${5 + displayedMetrics.length + 3}" style="border: none; height: 15px;"></td></tr>
    
    <tr class="subheader">
        <th rowspan="2">م</th>
        <th rowspan="2" style="min-width: 200px;">اسم الموظف</th>
        <th rowspan="2">الوظيفة</th>
        <th rowspan="2">الفرع</th>
        <th colspan="${displayedMetrics.length}">مجالات التقييم</th>
        <th rowspan="2">المخالفات</th>
        <th rowspan="2">المجموع</th>
        <th rowspan="2">النسبة %</th>
        <th rowspan="2">الملاحظات</th>
    </tr>
    
    <tr class="metric-header">
        ${displayedMetrics.map(m => `<th style="background-color: ${m.color}30;">${m.label}<br/>(${m.max * rcCount})</th>`).join('')}
    </tr>
    
    ${employees.map((emp, idx) => {
            const total = calculateTotal(emp);
            const max = calculateMaxTotal(emp);
            const percent = max > 0 ? ((total / max) * 100).toFixed(1) : '0';
            return `
    <tr>
        <td>${idx + 1}</td>
        <td style="text-align: right;">${emp.employeeName}</td>
        <td>${emp.role}</td>
        <td>${emp.branch}</td>
        ${displayedMetrics.map(m => {
                const isUnaccredited = (emp.unaccreditedMetrics || []).includes(m.key);
                return `<td style="background-color: ${m.color}10;">${isUnaccredited ? 'غ.م' : (emp[m.key] || 0)}</td>`;
            }).join('')}
        <td>${emp.violations_score}</td>
        <td style="font-weight: bold;">${total}</td>
        <td style="font-weight: bold;">${percent}%</td>
        <td style="text-align: right;">${emp.recommendations || ''}</td>
    </tr>`;
        }).join('')}
    
    <tr class="footer-row">
        <td colspan="4">المجموع الكلي والنسبة العامة</td>
        ${displayedMetrics.map(m => {
            const sum = getColSum(m.key);
            const pct = getColPercent(m.key, m.max);
            return `<td style="background-color: ${m.color}20;">${sum}<br/>${pct}%</td>`;
        }).join('')}
        <td>${employees.reduce((acc, e) => acc + (e.violations_score || 0), 0)}</td>
        <td class="total-cell">${employees.reduce((acc, e) => acc + calculateTotal(e), 0)}</td>
        <td class="percent-cell">${(() => {
                const tSum = employees.reduce((acc, e) => acc + calculateTotal(e), 0);
                const tMax = employees.reduce((acc, e) => acc + calculateMaxTotal(e), 0);
                return tMax > 0 ? ((tSum / tMax) * 100).toFixed(1) : '0';
            })()}%</td>
        <td></td>
    </tr>

    <tr><td colspan="${5 + displayedMetrics.length + 3}" style="border: none; height: 30px;"></td></tr>
    
    <tr>
        <td colspan="${Math.floor((5 + displayedMetrics.length + 3) / 2)}" style="border: none; text-align: right; font-weight: bold;">
            كاتب التقرير: ${writer || report.writer || ''}
        </td>
        <td colspan="${Math.ceil((5 + displayedMetrics.length + 3) / 2)}" style="border: none; text-align: left; font-weight: bold;">
            مدير الفرع: ${data.profile.branchManager || ''}
        </td>
    </tr>
</table>
</body>
</html>`;

        const blob = new Blob(['\uFEFF' + content], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${title}.xls`;
        link.click();
    };

    const exportToText = () => {
        const report = data.adminReports?.find(r => r.id === currentReportId);
        if (!report) return;

        let content = `التقرير: ${getReportTitle(report)}\nالتاريخ: ${getReportDateLabel(report)}\n\n`;
        employees.forEach((emp, idx) => {
            const total = calculateTotal(emp);
            const max = calculateMaxTotal(emp);
            const percent = max > 0 ? ((total / max) * 100).toFixed(1) : '0';
            content += `${idx + 1}. ${emp.employeeName} (${emp.role} - ${emp.branch}) \n`;
            displayedMetrics.forEach(m => {
                if (!(emp.unaccreditedMetrics || []).includes(m.key)) {
                    content += `   - ${m.label}: ${emp[m.key] || 0} / ${m.max * (report.reportCount || 1)}\n`;
                }
            });
            content += `   المخالفات: ${emp.violations_score}\n`;
            content += `   المجموع: ${total} / ${max} (${percent}%)\n`;
            if (emp.recommendations) content += `   الملاحظات: ${emp.recommendations}\n`;
            content += `${'-'.repeat(40)}\n`;
        });
        content += `\nمدير الفرع: ${data.profile.branchManager || ''}\n`;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${getReportTitle(report).replace(/\s+/g, '_')}.txt`;
        link.click();
    };

    const addDomain = () => {
        const name = prompt('أدخل مسمى المجال الجديد:');
        if (!name) return;
        const max = parseInt(prompt('أدخل الدرجة القصوى لهذا المجال:') || '4');

        const newMetric: MetricDefinition = {
            key: `custom_${Date.now()}`,
            label: name,
            emoji: '⭐',
            max: max,
            color: '#fbbf24'
        };

        const updatedMetrics = {
            ...(data.adminMetricsList || {}),
            [followUpType]: [...displayedMetrics, newMetric]
        };
        updateData({ adminMetricsList: updatedMetrics });
    };

    const deleteDomain = (key: string) => {
        if (confirm('حذف هذا المجال؟ سيؤدي ذلك لحذف درجاته في هذا الجدول.')) {
            const updatedMetrics = {
                ...(data.adminMetricsList || {}),
                [followUpType]: displayedMetrics.filter(m => m.key !== key)
            };
            updateData({ adminMetricsList: updatedMetrics });
        }
    };


    return (
        <div className="flex flex-col gap-6" dir="rtl">
            {/* Top Selector Bar - Hidden in redesign but kept for logic accessibility */}
            <div className="hidden pointer-events-none h-0 p-0 overflow-hidden">
                {/* Legacy Selector Hidden */}
            </div>

            {currentReportId && (
                <>
                    {/* Redesigned Search Bar */}
                    <div className="mb-2 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="relative group max-w-xs mx-auto md:mx-0">
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-all">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="بحث سريع..."
                                className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-10 pl-4 text-sm font-bold shadow-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder:text-slate-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="hidden pointer-events-none h-0 p-0 overflow-hidden">
                        {/* Legacy Header Hidden */}
                    </div>

                    {/* Report Title Header */}
                    {(() => {
                        const report = data.adminReports?.find(r => r.id === currentReportId);
                        if (!report) return null;
                        return (
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center gap-2 text-center animate-in mb-2">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                    {getReportTitle(report)}
                                </h2>
                                <div className="flex items-center gap-3 bg-slate-50 px-6 py-2 rounded-full border border-slate-100 group">
                                    <Calendar size={18} className="text-blue-500" />
                                    {(!report.reportCount) ? (
                                        <input
                                            type="date"
                                            className="bg-transparent font-black text-slate-600 text-sm outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 transition-all cursor-pointer font-sans"
                                            value={report.dateStr}
                                            onChange={(e) => {
                                                const newDate = e.target.value;
                                                const updatedReports = (data.adminReports || []).map(r =>
                                                    r.id === currentReportId ? { ...r, dateStr: newDate } : r
                                                );
                                                updateData({ adminReports: updatedReports });
                                            }}
                                        />
                                    ) : (
                                        <span className="font-black text-slate-600 text-sm">
                                            {getReportDateLabel(report)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Smart Table */}
                    <div className="bg-white rounded-[2.8rem] shadow-2xl border-[8px] border-[#800000] overflow-hidden flex flex-col min-h-[550px] animate-in zoom-in-95 duration-500 relative print:border-0 print:shadow-none">
                        <div className="overflow-x-auto overflow-y-auto max-h-[750px] staff-follow-table custom-scrollbar">
                            <table className="w-full border-collapse text-right select-none">
                                <thead className="sticky top-0 z-30 shadow-xl border-b-2 border-slate-200">
                                    {/* Row 1: Categories */}
                                    <tr className="bg-[#FFD966] text-[#4F3F0F] h-12">
                                        <th rowSpan={2} className="w-12 p-2 border-e border-[#E6B11F] text-center text-xs font-black bg-[#E6B11F]/20 font-sans">#</th>
                                        <th rowSpan={2} className="w-12 p-2 border-e border-[#E6B11F] text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded cursor-pointer accent-[#D4A017]"
                                                    checked={selectedEmployees.length === employees.length && employees.length > 0}
                                                    onChange={() => setSelectedEmployees(selectedEmployees.length === employees.length ? [] : employees.map(e => e.id))}
                                                />
                                                {selectedEmployees.length > 0 && (
                                                    <button onClick={() => deleteEmployees(selectedEmployees)} className="text-red-600 hover:text-red-700 transition-colors" title="حذف المحددين">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                        <th rowSpan={2} className="min-w-[220px] p-4 border-e border-[#E6B11F] text-sm font-black text-center">اسم الموظف والبيانات</th>
                                        <th colSpan={displayedMetrics.length} className="p-2 border-e border-[#E6B11F] text-xs font-black text-center tracking-widest shadow-inner">مجالات تقييم الموظفين</th>
                                        <th rowSpan={2} className="min-w-[80px] p-2 border-e border-[#E6B11F] text-xs font-black text-center shadow-inner">المخالفات</th>
                                        <th colSpan={2} className="p-2 border-e border-[#E6B11F] text-xs font-black text-center tracking-widest">المجموع الكلي</th>
                                        <th rowSpan={2} className="min-w-[160px] p-2 border-e border-[#E6B11F] text-xs font-black text-center">الملاحظات والتوصيات</th>
                                        <th rowSpan={2} className="w-24 p-2 text-xs font-black text-center">إجراءات</th>
                                    </tr>
                                    {/* Row 2: Metrics */}
                                    <tr className="bg-slate-50 text-slate-700 h-32 shadow-md">
                                        {displayedMetrics.map(m => (
                                            <th key={m.key} className="p-1 border-e border-slate-200 min-w-[90px] align-bottom transition-all relative overflow-hidden group" style={getMetricStyle(m)}>
                                                <div className="flex flex-col items-center justify-between h-full gap-2 py-2">
                                                    <div className={`font-black text-[11px] leading-tight text-center px-1 break-words max-w-[85px] line-clamp-3 mb-auto ${getTextColor(m.color)}`}>
                                                        {m.label.split(' ').map((word, i, arr) => (
                                                            <React.Fragment key={i}>
                                                                {word}{' '}
                                                                {((i + 1) % 2 === 0 && i !== arr.length - 1) && <br />}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1 w-full px-1.5 z-10 mt-auto">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-white/40 backdrop-blur-sm border-2 border-slate-200/50 rounded-lg text-center text-[11px] font-black py-1 outline-none font-sans focus:border-white transition-all text-current"
                                                            value={toEnglishNum(m.max * (data.adminReports?.find(r => r.id === currentReportId)?.reportCount || 1))}
                                                            readOnly
                                                        />
                                                        <div className="flex items-center gap-1 w-full">
                                                            <input
                                                                type="number"
                                                                placeholder="قيمة"
                                                                className="w-full bg-white/20 border-none rounded-md text-center text-[9px] font-black py-0.5 outline-none font-sans text-current placeholder:text-current/50"
                                                                value={fillValues[m.key] || ''}
                                                                onChange={(e) => setFillValues(prev => ({ ...prev, [m.key]: parseInt(e.target.value) || 0 }))}
                                                            />
                                                            <button
                                                                onClick={() => fillMetricColumn(m.key, Math.min(m.max, fillValues[m.key] || m.max))}
                                                                className="bg-white/30 text-current rounded-md p-1 hover:bg-white/50 transition-all shadow-sm active:scale-90"
                                                                title="تعبئة الدرجة للعمود"
                                                            >
                                                                <Zap size={10} className="mx-auto" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                            </th>
                                        ))}
                                        <th className="p-3 border-e border-slate-200 text-[11px] font-black bg-indigo-50/80 text-indigo-900 text-center">المجموع</th>
                                        <th className="p-3 border-slate-200 text-[11px] font-black bg-indigo-50/80 text-indigo-900 text-center">النسبة %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {employees.length === 0 ? (
                                        <tr><td colSpan={100} className="p-32 text-center text-slate-300 font-bold text-lg">لم يتم رصد أي موظفين بعد في هذا الجدول</td></tr>
                                    ) : employees.map((emp, idx) => {
                                        const total = calculateTotal(emp);
                                        const max = calculateMaxTotal(emp);
                                        const percent = max > 0 ? ((total / max) * 100).toFixed(1) : '0';
                                        return (
                                            <tr
                                                key={emp.id}
                                                onClick={() => setHighlightedRowId(emp.id)}
                                                className={`transition-all duration-200 group h-14 ${highlightedRowId === emp.id ? 'bg-blue-50' : (selectedEmployees.includes(emp.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80')}`}
                                            >
                                                <td className="p-3 border-e text-center text-xs font-bold text-slate-400 font-sans">{idx + 1}</td>
                                                <td className="p-3 border-e text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded cursor-pointer transition-transform group-hover:scale-110"
                                                        checked={selectedEmployees.includes(emp.id)}
                                                        onChange={() => setSelectedEmployees(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id])}
                                                    />
                                                </td>
                                                <td className="p-4 border-e bg-inherit">
                                                    <div className="flex flex-col gap-1.5">
                                                        <input
                                                            type="text"
                                                            className="bg-transparent border-none font-black text-slate-800 text-sm outline-none w-full focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-1 transition-all"
                                                            value={emp.employeeName}
                                                            onChange={(e) => updateEmployee(emp.id, { employeeName: e.target.value })}
                                                        />
                                                        <div className="flex flex-wrap gap-1.5 text-[8px] font-black">
                                                            <select
                                                                className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border-none outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                                                                value={emp.gender}
                                                                onChange={(e) => e.target.value === 'ADD_NEW' ? handleAddOption('gender', emp.id) : updateEmployee(emp.id, { gender: e.target.value })}
                                                            >
                                                                <option value="ذكر">ذكر</option>
                                                                <option value="أنثى">أنثى</option>
                                                                <option value="ADD_NEW">+ إضافة</option>
                                                            </select>

                                                            <select
                                                                className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border-none outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                                                                value={emp.role}
                                                                onChange={(e) => e.target.value === 'ADD_NEW' ? handleAddOption('role', emp.id) : updateEmployee(emp.id, { role: e.target.value })}
                                                            >
                                                                <option value={emp.role}>{emp.role}</option>
                                                                <option value="إداري">إداري</option>
                                                                <option value="معلم">معلم</option>
                                                                <option value="مدير فرع">مدير فرع</option>
                                                                <option value="ADD_NEW">+ إضافة</option>
                                                            </select>

                                                            <select
                                                                className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border-none outline-none cursor-pointer hover:bg-emerald-100 transition-colors"
                                                                value={emp.branch}
                                                                onChange={(e) => e.target.value === 'ADD_NEW' ? handleAddOption('branch', emp.id) : updateEmployee(emp.id, { branch: e.target.value })}
                                                            >
                                                                <option value="المركز الرئيسي">المركز الرئيسي</option>
                                                                <option value="فرع الطلاب">فرع الطلاب</option>
                                                                <option value="فرع الطالبات">فرع الطالبات</option>
                                                                <option value="فرع البراعم">فرع البراعم</option>
                                                                <option value="ADD_NEW">+ إضافة</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </td>
                                                {displayedMetrics.map(m => {
                                                    const isUnaccredited = (emp.unaccreditedMetrics || []).includes(m.key);
                                                    const val = Number(emp[m.key]) || 0;
                                                    // Use the pastel background from metric color with high transparency
                                                    return (
                                                        <td key={m.key} className="p-1 border-e relative group/cell" style={{ backgroundColor: `${m.color}15` }}>
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full mb-1" style={{ backgroundColor: m.color }} />
                                                                <input
                                                                    type="number"
                                                                    className={`w-full text-center outline-none bg-transparent font-black text-[14px] font-sans transition-all ${isUnaccredited ? 'opacity-20 pointer-events-none' : ''} ${!isUnaccredited && val <= m.max * 0.3 && val > 0 ? 'text-red-500 scale-110' : 'text-slate-800'}`}
                                                                    value={emp[m.key] || ''}
                                                                    placeholder="(0)"
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => {
                                                                        const v = Math.min(m.max, Math.max(0, parseInt(e.target.value) || 0));
                                                                        updateEmployee(emp.id, { [m.key]: v });
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); toggleAccreditation(emp.id, m.key); }}
                                                                    className={`opacity-0 group-hover/cell:opacity-100 transition-all p-0.5 rounded hover:bg-white shadow-sm ${isUnaccredited ? 'text-rose-500 opacity-100 scale-110' : 'text-slate-300'}`}
                                                                    title={isUnaccredited ? "إلغاء الاستبعاد" : "استبعاد من الحساب لهذا الموظف"}
                                                                >
                                                                    <Star size={11} className={isUnaccredited ? 'fill-rose-500' : ''} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td
                                                    className={`p-1 border-e text-center cursor-pointer transition-colors ${emp.violations_score > 0 ? 'bg-red-50/50' : ''}`}
                                                    onClick={() => setViolationModal({ id: emp.id, notes: emp.violations_notes })}
                                                >
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`text-[14px] font-black font-sans ${emp.violations_score > 0 ? 'text-red-600 scale-110 animate-pulse' : 'text-slate-300'}`}>{emp.violations_score}</span>
                                                        {emp.violations_notes.length > 0 && <AlertCircle size={12} className="text-red-500" />}
                                                    </div>
                                                </td>
                                                <td className="p-2 border-e text-center font-black text-[14px] text-blue-800 bg-blue-50/40 font-sans">{total}</td>
                                                <td className="p-2 border-e text-center font-black text-[14px] text-blue-800 bg-blue-50/40 font-sans">{percent}%</td>
                                                <td className="p-2 border-e text-right text-[11px] text-slate-600 max-w-[180px] cursor-pointer hover:bg-amber-50/50 transition-colors" onClick={() => setNotesModal({ empId: emp.id, text: emp.recommendations || '' })}>
                                                    <div className="flex items-start gap-1">
                                                        <span className="flex-1 line-clamp-3 whitespace-pre-wrap">{emp.recommendations || ''}</span>
                                                        <MessageSquare size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => { e.stopPropagation(); generateWhatsAppReport(emp.id); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="إرسال تقرير فردي بالواتساب">
                                                            <Send size={18} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); deleteEmployees([emp.id]); }} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="حذف">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="sticky bottom-0 z-30 bg-[#FFD966] text-[#4F3F0F] font-black text-xs h-16 shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
                                    <tr className="border-t-4 border-[#E6B11F]">
                                        <td colSpan={3} className="px-6 text-right bg-[#E6B11F]/20 border-e border-[#E6B11F] text-sm tracking-wide">الإحصائيات الإجمالية والنسب المئوية المحققة</td>
                                        {displayedMetrics.map(m => (
                                            <td key={m.key} className="p-2 border-e border-[#E6B11F] text-center" style={{ backgroundColor: `${m.color}15` }}>
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="font-sans text-[13px]">({getColSum(m.key)})</span>
                                                    <div className="w-10 h-0.5 bg-black opacity-10 rounded-full my-0.5" />
                                                    <span className="text-[10px] opacity-80 font-sans">{getColPercent(m.key, m.max)}%</span>
                                                </div>
                                            </td>
                                        ))}
                                        <td className="border-e border-[#E6B11F] bg-rose-50/50"></td>
                                        <td className="bg-amber-100 border-e border-[#E6B11F] text-center text-[15px] font-sans shadow-inner">
                                            ({employees.reduce((acc, e) => acc + calculateTotal(e), 0)})
                                        </td>
                                        <td className="bg-amber-200 text-center text-[18px] font-sans shadow-inner text-[#800000]">
                                            {(() => {
                                                const tSum = employees.reduce((acc, e) => acc + calculateTotal(e), 0);
                                                const tMax = employees.reduce((acc, e) => acc + calculateMaxTotal(e), 0);
                                                return tMax > 0 ? ((tSum / tMax) * 100).toFixed(1) : '0';
                                            })()}%
                                        </td>
                                        <td className="bg-[#E6B11F]/20"></td>
                                        <td className="bg-[#E6B11F]/5"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Signatures Footer */}
                        <div className="bg-slate-50 p-10 border-t-2 border-slate-100 flex justify-between items-start gap-20 print:bg-white print:border-slate-200">
                            <div className="flex flex-col gap-8 flex-1">
                                <div className="flex items-center gap-3 text-slate-400 group">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:text-blue-600 transition-colors">
                                        <UserCircle size={20} />
                                    </div>
                                    <span className="font-black text-sm tracking-widest uppercase opacity-60">كاتب التقرير</span>
                                </div>
                                <div className="border-b-4 border-slate-200 border-dotted w-full pb-4 px-2">
                                    <span className="text-2xl font-black text-slate-800 font-sans">
                                        {writer || data.adminReports?.find(r => r.id === currentReportId)?.writer}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-8" style={{ minWidth: '200px' }}>
                                <div className="flex items-center gap-3 text-slate-400 group">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:text-blue-600 transition-colors">
                                        <Users size={20} />
                                    </div>
                                    <span className="font-black text-sm tracking-widest uppercase opacity-60">مدير الفرع</span>
                                </div>
                                <div className="border-b-4 border-slate-200 border-dotted w-full pb-4 px-2">
                                    <span className="text-2xl font-black text-slate-800 font-sans">
                                        {data.profile.branchManager || '......................'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Legend */}
                        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap justify-center gap-6 text-[10px] font-black text-slate-500">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 border border-red-500 rounded" /> درجات ضعيفة (أقل من 30%)</div>
                            <div className="flex items-center gap-2"><Star size={12} className="text-rose-500 fill-rose-500" /> مجال مستبعد من حسابات هذا الموظف</div>
                            <div className="flex items-center gap-2 font-sans opacity-70">123 - الأرقام باللاتينية</div>
                        </div>
                    </div>
                </>
            )}

            {/* Archive Modal */}
            {showArchive && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl border-[10px] border-white flex flex-col max-h-[85vh] animate-in zoom-in-95">
                        <div className="p-8 bg-slate-900 text-white flex items-center justify-between shadow-xl">
                            <div className="flex flex-col">
                                <h3 className="text-3xl font-black tracking-tight">أرشيف التقارير</h3>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type="text"
                                            placeholder="بحث بالتاريخ..."
                                            className="bg-white/10 border border-white/20 rounded-xl pr-10 pl-4 py-2 text-sm font-bold focus:bg-white/20 outline-none w-48 transition-all"
                                            value={archiveSearch}
                                            onChange={(e) => setArchiveSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowArchive(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90 bg-white/5 border border-white/10">
                                <X size={28} />
                            </button>
                        </div>

                        {/* Archive Tabs */}
                        <div className="flex bg-slate-100 p-2 gap-2">
                            {[
                                { id: 'daily', label: 'اليومية' },
                                { id: 'weekly', label: 'الأسبوعية' },
                                { id: 'monthly', label: 'الشهرية' },
                                { id: 'quarterly', label: 'الفصلية' },
                                { id: 'yearly', label: 'السنوية' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setArchiveTab(tab.id as any)}
                                    className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all ${archiveTab === tab.id ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:bg-white/50'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-auto p-8 space-y-4 custom-scrollbar bg-slate-50/50">
                            {(() => {
                                const filteredReports = (data.adminReports || []).filter(r => {
                                    const isTypeMatch = r.followUpType === followUpType;
                                    if (!isTypeMatch) return false;

                                    const reportPeriod = r.periodName || 'Daily';
                                    const tabMap: Record<string, string> = {
                                        'daily': 'Daily',
                                        'weekly': 'الأسبوعي',
                                        'monthly': 'الشهري',
                                        'quarterly': 'الفصلي',
                                        'yearly': 'السنوي'
                                    };
                                    const isTabMatch = archiveTab === 'daily' ? !r.reportCount : reportPeriod === tabMap[archiveTab];
                                    if (!isTabMatch) return false;

                                    if (archiveSearch && !r.dateStr.includes(archiveSearch)) return false;

                                    return true;
                                });

                                if (filteredReports.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                                            <Archive size={64} strokeWidth={1} />
                                            <span className="font-black text-xl">لا توجد تقارير في هذا القسم</span>
                                        </div>
                                    );
                                }

                                return filteredReports.map(r => (
                                    <div key={r.id} className="group relative flex items-center justify-between p-6 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-blue-500 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md">
                                        <div className="flex items-center gap-6 flex-1" onClick={() => { setCurrentReportId(r.id); setFollowUpType(r.followUpType); setWriter(r.writer || ''); setShowArchive(false); }}>
                                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black shadow-inner">
                                                <Calendar size={24} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-lg text-slate-800">{r.dateStr}</span>
                                                    {r.reportCount && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">تجميعي</span>}
                                                </div>
                                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                                    <span className="flex items-center gap-1"><UserCircle size={14} /> {r.writer || 'غير محدد'}</span>
                                                    <span className="flex items-center gap-1"><Users size={14} /> {r.employeesData.length} موظف</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => deleteReport(r.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="حذف">
                                                <Trash2 size={20} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setCurrentReportId(r.id); setFollowUpType(r.followUpType); setWriter(r.writer || ''); setTimeout(() => generateWhatsAppReport('bulk'), 100); }} className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-100 transition-all">
                                                <Send size={20} className="rotate-180" />
                                            </button>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Report Indicators Modal */}
            {showIndicatorsModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[8px] border-white flex flex-col animate-in zoom-in-95">
                        <div className="p-8 bg-blue-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black">مؤشرات التقارير</h3>
                                <p className="text-blue-100 font-bold text-xs">{followUpType}</p>
                            </div>
                            <button onClick={() => setShowIndicatorsModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-xs font-black text-slate-400 mb-2 mr-2">من تاريخ</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-sans"
                                        value={aggDateFrom}
                                        onChange={(e) => setAggDateFrom(e.target.value)}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-black text-slate-400 mb-2 mr-2">إلى تاريخ</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-sans"
                                        value={aggDateTo}
                                        onChange={(e) => setAggDateTo(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {['أسبوعي', 'شهري', 'فصلي', 'سنوي'].map(period => (
                                    <button
                                        key={period}
                                        onClick={() => { aggregateReports(period); setShowIndicatorsModal(false); }}
                                        className={`w-full py-4 px-6 rounded-[1.5rem] font-black text-lg flex items-center justify-between transition-all group shadow-sm hover:shadow-md
                                    ${period === 'أسبوعي' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white' :
                                                period === 'شهري' ? 'bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white' :
                                                    period === 'فصلي' ? 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white' :
                                                        'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white'}`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                                <FileOutput size={20} />
                                            </div>
                                            إنشاء تقرير {period} مجمع
                                        </span>
                                        <ChevronLeft size={20} className="opacity-30 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Violation Modal */}
            {violationModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-red-950/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-[0_30px_60px_-15px_rgba(220,38,38,0.3)] border-[6px] border-white p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between border-b-2 border-slate-50 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-red-100 text-red-600 rounded-[1.2rem] flex items-center justify-center shadow-inner">
                                    <AlertCircle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">سجل المخالفات</h3>
                                    <p className="text-red-500 text-sm font-bold tracking-tight">رصد السلوكيات والتقصير الإداري</p>
                                </div>
                            </div>
                            <button onClick={() => setViolationModal(null)} className="p-3 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all active:scale-90"><X size={24} /></button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-black text-slate-600 mr-2 flex items-center gap-2">درجة المخالفة <span className="text-xs text-slate-400">(تطرح من المجموع)</span></label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 border-3 border-slate-100 rounded-[1.5rem] p-5 font-black text-2xl text-center text-red-600 focus:ring-8 focus:ring-red-100 focus:border-red-500 outline-none transition-all font-sans"
                                    value={employees.find(e => e.id === violationModal.id)?.violations_score || 0}
                                    onChange={(e) => updateEmployee(violationModal.id, { violations_score: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-black text-slate-600 mr-2">تفاصيل الملاحظات <span className="text-xs text-slate-400">(كل ملاحظة في سطر)</span></label>
                                <textarea
                                    className="w-full bg-slate-50 border-3 border-slate-100 rounded-[1.5rem] p-6 font-black h-48 outline-none focus:ring-8 focus:ring-slate-100 focus:border-slate-800 transition-all text-slate-800 leading-relaxed custom-scrollbar"
                                    placeholder="مثال: تأخر في تسليم التقارير، مخالفة الزي الرسمي..."
                                    value={violationModal.notes.join('\n')}
                                    onChange={(e) => updateEmployee(violationModal.id, { violations_notes: e.target.value.split('\n').filter(n => n.trim()) })}
                                />
                            </div>
                            <button onClick={() => setViolationModal(null)} className="w-full bg-slate-900 text-white p-6 rounded-[1.8rem] font-black text-xl shadow-2xl hover:bg-black transition-all transform active:scale-95 shadow-slate-200">اعتماد وحفظ السجل</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Customize Domains Modal */}
            {showCustomizer && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl border-[8px] border-white flex flex-col max-h-[85vh]">
                        <div className="p-8 bg-amber-500 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black">تخصيص مجالات التقييم</h3>
                                <p className="text-amber-100 font-bold text-sm">{followUpType}</p>
                            </div>
                            <button onClick={() => setShowCustomizer(false)} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-6 flex-1 overflow-auto space-y-4 custom-scrollbar">
                            <button
                                onClick={addDomain}
                                className="w-full p-4 bg-amber-50 border-2 border-amber-200 border-dashed rounded-[1.5rem] text-amber-700 font-black flex items-center justify-center gap-2 hover:bg-amber-100 transition-all font-sans"
                            >
                                <Plus size={20} /> إضافة مجال تقييم جديد
                            </button>
                            <div className="grid grid-cols-1 gap-3">
                                {displayedMetrics.map((m, idx) => (
                                    <div key={m.key} className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 group">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => reorderDomain(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-white rounded text-slate-400 disabled:opacity-30"><ChevronUp size={16} /></button>
                                                <button onClick={() => reorderDomain(idx, 'down')} disabled={idx === displayedMetrics.length - 1} className="p-1 hover:bg-white rounded text-slate-400 disabled:opacity-30"><ChevronDown size={16} /></button>
                                            </div>
                                            <div className="w-2 h-10 rounded-full shadow-sm" style={{ backgroundColor: m.color }} />
                                            <div className="flex flex-col flex-1 pl-4">
                                                <input
                                                    type="text"
                                                    className="font-black text-slate-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-amber-200 rounded px-1 transition-all"
                                                    value={m.label}
                                                    onChange={(e) => renameDomain(m.key, e.target.value)}
                                                />
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-bold text-slate-400 font-sans">الدرجة القصوى:</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="20"
                                                        className="w-12 bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-bold text-slate-700 text-center outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                                                        value={m.max}
                                                        onChange={(e) => {
                                                            const newMax = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
                                                            handleMaxChange(m.key, newMax);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                className="w-10 h-10 rounded-xl cursor-pointer border-4 border-white overflow-hidden shadow-lg p-0"
                                                value={m.color}
                                                onChange={(e) => {
                                                    const updated = displayedMetrics.map(item => item.key === m.key ? { ...item, color: e.target.value } : item);
                                                    updateData({ adminMetricsList: { ...(data.adminMetricsList || {}), [followUpType]: updated } });
                                                }}
                                            />
                                            <button onClick={() => deleteDomain(m.key)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 border-t bg-slate-50 text-center">
                            <p className="text-[10px] text-slate-400 font-black tracking-wider">التعديلات تطبق فوراً على هذا النوع من المتابعة في كافة الجداول</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Individual Detail Modal */}
            {showIndividualModal && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-blue-950/30 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-xl shadow-2xl border-[8px] border-white p-10 flex flex-col gap-8 animate-in slide-in-from-bottom-8 max-h-[90vh] overflow-auto custom-scrollbar">
                        {/* Search field */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="ابحث عن اسم الموظف..."
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pr-12 pl-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-sans"
                                    value={individualSearch}
                                    onChange={(e) => {
                                        setIndividualSearch(e.target.value);
                                        const found = employees.find(emp => emp.employeeName.includes(e.target.value));
                                        if (found) setShowIndividualModal(found.id);
                                    }}
                                />
                            </div>
                            <button onClick={() => { setShowIndividualModal(null); setIndividualSearch(''); }} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
                        </div>
                        {/* Employee selector */}
                        <div className="flex flex-wrap gap-2 max-h-20 overflow-auto custom-scrollbar">
                            {employees.filter(e => !individualSearch || e.employeeName.includes(individualSearch)).map(e => (
                                <button key={e.id} onClick={() => setShowIndividualModal(e.id)} className={`px-3 py-1.5 rounded-full text-xs font-black transition-all ${e.id === showIndividualModal ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                    {e.employeeName}
                                </button>
                            ))}
                        </div>
                        {(() => {
                            const emp = employees.find(e => e.id === showIndividualModal);
                            if (!emp) return <div className="text-center text-slate-400 py-10 font-black">لم يتم العثور على الموظف</div>;
                            const total = calculateTotal(emp);
                            const max = calculateMaxTotal(emp);
                            const percent = max > 0 ? ((total / max) * 100).toFixed(1) : '0';
                            return (
                                <>
                                    <div className="flex items-center gap-5 border-b pb-6">
                                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3">
                                            <UserCircle size={48} strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-slate-900">{emp.employeeName}</h3>
                                            <p className="text-blue-600 font-bold tracking-tighter">{emp.role} - {emp.branch}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-50 flex flex-col items-center">
                                            <span className="text-xs font-black text-blue-400 mb-1">نسبة الإنجاز</span>
                                            <span className="text-4xl font-black text-blue-700 font-sans tracking-tight">{percent}%</span>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col items-center">
                                            <span className="text-xs font-black text-slate-400 mb-1">الدرجة المحققة</span>
                                            <span className="text-4xl font-black text-slate-800 font-sans tracking-tight">{total} <span className="text-lg opacity-30">/ {max}</span></span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-black text-slate-800 mr-2 flex items-center gap-2"><CheckCircle size={18} className="text-green-500" /> تحليل مجالات التقييم</h4>
                                        <div className="bg-slate-50/50 rounded-[2rem] border-2 border-slate-50 p-6 space-y-3 max-h-60 overflow-auto custom-scrollbar">
                                            {displayedMetrics.map(m => {
                                                if ((emp.unaccreditedMetrics || []).includes(m.key)) return null;
                                                const v = Number(emp[m.key]) || 0;
                                                const rcCount = data.adminReports?.find(r => r.id === currentReportId)?.reportCount || 1;
                                                const mMax = m.max * rcCount;
                                                const p = mMax > 0 ? (v / mMax) * 100 : 0;
                                                return (
                                                    <div key={m.key} className="space-y-1.5 px-2">
                                                        <div className="flex justify-between text-[11px] font-black">
                                                            <span className="text-slate-600">{m.label}</span>
                                                            <span className="text-blue-600 font-sans">{v} / {mMax}</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-white rounded-full overflow-hidden border">
                                                            <div className={`h-full transition-all duration-1000 ${p > 75 ? 'bg-green-500' : p > 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(p, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => generateWhatsAppReport(emp.id)} className="flex-1 bg-green-600 text-white rounded-[1.8rem] p-5 font-black flex items-center justify-center gap-3 shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95">
                                            <Send size={24} /> مشاركة عبر واتساب
                                        </button>
                                        <button onClick={() => {
                                            const report = data.adminReports?.find(r => r.id === currentReportId);
                                            if (!report) return;
                                            const rcCount = report.reportCount || 1;
                                            const title = getReportTitle(report) + ' - ' + getReportDateLabel(report);
                                            let content = `${title}\n\n`;
                                            content += `الاسم: ${emp.employeeName}\nالوظيفة: ${emp.role}\nالفرع: ${emp.branch}\n\n`;
                                            displayedMetrics.forEach(m => {
                                                if (!(emp.unaccreditedMetrics || []).includes(m.key)) {
                                                    content += `${m.label}\t${emp[m.key] || 0}\t${m.max * rcCount}\n`;
                                                }
                                            });
                                            content += `\nالمخالفات\t${emp.violations_score}\n`;
                                            content += `المجموع\t${total}\t${max}\n`;
                                            content += `النسبة\t${percent}%\n`;
                                            if (emp.recommendations) content += `\nالملاحظات: ${emp.recommendations}\n`;
                                            content += `\nكاتب التقرير: ${writer || report.writer}`;
                                            const BOM = '\uFEFF';
                                            const blob = new Blob([BOM + content], { type: 'text/tab-separated-values;charset=utf-8' });
                                            const link = document.createElement('a');
                                            link.href = URL.createObjectURL(blob);
                                            link.download = `تقرير_${emp.employeeName}.xls`;
                                            link.click();
                                        }} className="w-20 bg-emerald-100 text-emerald-700 rounded-[1.8rem] flex items-center justify-center hover:bg-emerald-200 transition-all font-sans font-black">
                                            <Download size={20} />
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Notes/Recommendations Modal */}
            {notesModal && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center bg-amber-950/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[6px] border-white p-10 space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between border-b-2 border-slate-50 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-[1.2rem] flex items-center justify-center shadow-inner">
                                    <MessageSquare size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">الملاحظات والتوصيات</h3>
                                    <p className="text-amber-600 text-sm font-bold">{employees.find(e => e.id === notesModal.empId)?.employeeName}</p>
                                </div>
                            </div>
                            <button onClick={() => setNotesModal(null)} className="p-3 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all active:scale-90"><X size={24} /></button>
                        </div>
                        <textarea
                            className="w-full h-40 bg-slate-50 rounded-2xl border-2 border-slate-100 p-4 text-sm font-bold outline-none resize-none focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all"
                            placeholder="اكتب الملاحظات والتوصيات هنا..."
                            value={notesModal.text}
                            onChange={(e) => setNotesModal({ ...notesModal, text: e.target.value })}
                        />
                        <button
                            onClick={() => {
                                updateEmployee(notesModal.empId, { recommendations: notesModal.text });
                                setNotesModal(null);
                            }}
                            className="w-full bg-amber-500 text-white rounded-2xl p-4 font-black text-lg hover:bg-amber-600 transition-all active:scale-95 shadow-xl shadow-amber-100"
                        >
                            موافق
                        </button>
                    </div>
                </div>
            )}

            {/* Custom styles for the page */}
            <style>{`
        .staff-follow-table th .vertical-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          text-align: center;
          white-space: nowrap;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
        </div>
    );
});

export default StaffFollowUpPage;
