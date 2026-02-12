
import React, { useState, useMemo, useEffect } from 'react';
import { useGlobal } from '../context/GlobalState';
import {
    Plus, Archive, UserPlus, FileUp, UserCircle, Palette,
    Search, CheckCircle, Zap, Trash2, Star, X, AlertCircle,
    FileText, Share2, Download, ChevronUp, ChevronDown, ListFilter,
    Users, LayoutDashboard, ClipboardList, Send, Calendar, Clock,
    FileBarChart2, MoreHorizontal, MessageSquare
} from 'lucide-react';
import { AdminFollowUp, AdminReportContainer, MetricDefinition } from '../types';

const StaffFollowUpPage: React.FC = () => {
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

    // Utility function to convert Arabic numerals to English
    const toEnglishNum = (num: number | string): string => {
        const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        const englishNums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        let str = String(num);
        for (let i = 0; i < arabicNums.length; i++) {
            str = str.replace(new RegExp(arabicNums[i], 'g'), englishNums[i]);
        }
        return str;
    };

    // Hijri date helper with month names
    const hijriMonths = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
    const toHijri = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
            const day = parts.find(p => p.type === 'day')?.value || '';
            const monthNum = parseInt(parts.find(p => p.type === 'month')?.value || '1');
            const year = parts.find(p => p.type === 'year')?.value || '';
            return `${day}/ ${hijriMonths[monthNum - 1]}/ ${year}`;
        } catch { return ''; }
    };

    // Generate report title helper
    const getReportTitle = (report: any) => {
        if (report?.periodName) {
            return `التقرير ${report.periodName} ل${followUpType}`;
        }
        return `تقرير ${followUpType}`;
    };

    const getReportDateLabel = (report: any) => {
        if (report?.reportCount) {
            const parts = (report.dateStr || '').split(' إلى ');
            const from = parts[0] || '';
            const to = parts[1] || '';
            return `من تاريخ ${toHijri(from)}هـ - ${from}م إلى تاريخ ${toHijri(to)}هـ - ${to}م`;
        }
        return `بتاريخ ${toHijri(report?.dateStr || '')}هـ - ${report?.dateStr || ''}م`;
    };

    // Derived Data
    const employees = useMemo(() => {
        const report = data.adminReports?.find(r => r.id === currentReportId);
        if (!report) return [];
        return report.employeesData;
    }, [data.adminReports, currentReportId]);

    const displayedMetrics = useMemo(() => {
        return data.adminMetricsList?.[followUpType] || [];
    }, [data.adminMetricsList, followUpType]);

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
            setWriter(reportsOfType[0].writer || '');
        } else {
            setCurrentReportId(null);
            setWriter('');
        }
    };

    const createNewReport = () => {
        const lastReportOfType = (data.adminReports || []).find(r => r.followUpType === followUpType);
        const inheritedEmployees = lastReportOfType ? lastReportOfType.employeesData.map(e => ({
            ...e,
            id: `emp_${Date.now()}_${Math.random()}`,
            violations_score: 0,
            violations_notes: [],
            // Reset scores for all metrics to 0
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

    const aggregateReports = (period: string) => {
        if (!data.adminReports || data.adminReports.length === 0) {
            alert('لا توجد تقارير سابقة لتجميعها');
            return;
        }

        const filtered = (data.adminReports || []).filter(r =>
            r.followUpType === followUpType &&
            r.dateStr >= aggDateFrom &&
            r.dateStr <= aggDateTo &&
            !r.reportCount // Don't aggregate already aggregated reports to avoid double counting
        );

        if (filtered.length === 0) {
            alert('لا توجد تقارير في هذه الفترة الزمنية لهذا النوع من المتابعة');
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

    const addEmployee = () => {
        if (!currentReportId) { alert('نرجو إنشاء جدول جديد أولاً'); return; }
        const name = prompt('أدخل اسم الموظف:');
        if (!name) return;

        const newEmp: AdminFollowUp = {
            id: `emp_${Date.now()}`,
            employeeName: name,
            gender: 'ذكر',
            branch: 'المركز الرئيسي',
            role: followUpType.includes('متابعة') ? followUpType.split('متابعة ')[1] || followUpType : followUpType,
            violations_score: 0,
            violations_notes: [],
            unaccreditedMetrics: []
        };

        const updatedReports = (data.adminReports || []).map(r => {
            if (r.id === currentReportId) return { ...r, employeesData: [...r.employeesData, newEmp] };
            return r;
        });
        updateData({ adminReports: updatedReports });
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
    .header { background-color: #800000; color: white; font-weight: bold; font-size: 16px; }
    .subheader { background-color: #FFD966; color: #4F3F0F; font-weight: bold; }
    .metric-header { background-color: #f0f0f0; font-weight: bold; font-size: 11px; }
    .data-row { background-color: #fff; }
    .data-row:nth-child(even) { background-color: #f9f9f9; }
    .footer-row { background-color: #FFD966; font-weight: bold; }
    .total-cell { background-color: #E6B11F; font-weight: bold; }
    .percent-cell { background-color: #800000; color: white; font-weight: bold; }
    .signature { border: none; padding: 20px; font-weight: bold; }
    .title-section { border: none; text-align: center; font-size: 18px; font-weight: bold; }
    .date-section { border: none; text-align: center; font-size: 14px; color: #666; }
</style>
</head>
<body>
<table>
    <!-- Header Section -->
    <tr>
        <td colspan="${5 + displayedMetrics.length + 4}" class="title-section" style="background-color: #800000; color: white; font-size: 20px; padding: 15px;">
            ${profile.schoolName || 'المدرسة'} ${profile.branch ? `- فرع ${profile.branch}` : ''}
        </td>
    </tr>
    <tr>
        <td colspan="${5 + displayedMetrics.length + 4}" class="title-section" style="padding: 10px;">
            ${title}
        </td>
    </tr>
    <tr>
        <td colspan="${5 + displayedMetrics.length + 4}" class="date-section" style="padding: 8px;">
            ${dateLabel}
        </td>
    </tr>
    <tr><td colspan="${5 + displayedMetrics.length + 4}" style="border: none; height: 10px;"></td></tr>
    
    <!-- Table Header Row 1 -->
    <tr class="subheader">
        <th rowspan="2" style="width: 40px;">#</th>
        <th rowspan="2" style="min-width: 150px;">اسم الموظف</th>
        <th rowspan="2">النوع</th>
        <th rowspan="2">الوظيفة</th>
        <th rowspan="2">الفرع</th>
        <th colspan="${displayedMetrics.length}">مجالات تقييم الموظفين</th>
        <th rowspan="2">المخالفات</th>
        <th rowspan="2">المجموع</th>
        <th rowspan="2">النسبة %</th>
        <th rowspan="2" style="min-width: 200px;">الملاحظات والتوصيات</th>
    </tr>
    
    <!-- Table Header Row 2 - Metrics -->
    <tr class="metric-header">
        ${displayedMetrics.map(m => `<th style="background-color: ${m.color}; min-width: 80px;">${m.label}<br/>(${m.max * rcCount})</th>`).join('')}
    </tr>
    
    <!-- Data Rows -->
    ${employees.map((emp, idx) => {
            const total = calculateTotal(emp);
            const max = calculateMaxTotal(emp);
            const percent = max > 0 ? ((total / max) * 100).toFixed(1) : '0';
            return `
    <tr class="data-row">
        <td>${idx + 1}</td>
        <td style="text-align: right; font-weight: bold;">${emp.employeeName}</td>
        <td>${emp.gender}</td>
        <td>${emp.role}</td>
        <td>${emp.branch}</td>
        ${displayedMetrics.map(m => {
                const isUnaccredited = (emp.unaccreditedMetrics || []).includes(m.key);
                const val = isUnaccredited ? 'غ.م' : (emp[m.key] || 0);
                return `<td style="background-color: ${m.color}15;">${val}</td>`;
            }).join('')}
        <td style="${emp.violations_score > 0 ? 'background-color: #fee2e2; color: #dc2626;' : ''}">${emp.violations_score}</td>
        <td style="background-color: #dbeafe; font-weight: bold;">${total}</td>
        <td style="background-color: #dbeafe; font-weight: bold;">${percent}%</td>
        <td style="text-align: right; font-size: 11px;">${(emp.recommendations || '').replace(/[\n\r]/g, ' ')}</td>
    </tr>`;
        }).join('')}
    
    <!-- Statistics Footer Row -->
    <tr class="footer-row">
        <td colspan="5" style="text-align: right; font-weight: bold;">الإحصائيات الإجمالية والنسب المئوية المحققة</td>
        ${displayedMetrics.map(m => {
            const sum = getColSum(m.key);
            const pct = getColPercent(m.key, m.max);
            return `<td style="background-color: ${m.color}30;">(${sum})<br/>${pct}%</td>`;
        }).join('')}
        <td></td>
        <td class="total-cell">(${employees.reduce((acc, e) => acc + calculateTotal(e), 0)})</td>
        <td class="percent-cell">${(() => {
                const tSum = employees.reduce((acc, e) => acc + calculateTotal(e), 0);
                const tMax = employees.reduce((acc, e) => acc + calculateMaxTotal(e), 0);
                return tMax > 0 ? ((tSum / tMax) * 100).toFixed(1) : '0';
            })()}%</td>
        <td></td>
    </tr>
    
    <!-- Empty Row -->
    <tr><td colspan="${5 + displayedMetrics.length + 4}" style="border: none; height: 20px;"></td></tr>
    
    <!-- Signature Section -->
    <tr>
        <td colspan="${Math.floor((5 + displayedMetrics.length + 4) / 2)}" class="signature" style="text-align: right;">
            <strong>كاتب التقرير:</strong> ${writer || report.writer || '......................'}
        </td>
        <td colspan="${Math.ceil((5 + displayedMetrics.length + 4) / 2)}" class="signature" style="text-align: left;">
            <strong>مدير الفرع:</strong> ${profile.branchManager || '......................'}
        </td>
    </tr>
    
    <!-- Legend -->
    <tr>
        <td colspan="${5 + displayedMetrics.length + 4}" style="border: none; font-size: 10px; color: #666; text-align: center; padding: 10px;">
            غ.م = غير معتمد (مستبعد من الحساب) | الدرجات الضعيفة أقل من 30%
        </td>
    </tr>
</table>
</body>
</html>`;

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + content], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${title.replace(/\s+/g, '_')}.xls`;
        link.click();
    };

    const exportToTxt = () => {
        const report = data.adminReports?.find(r => r.id === currentReportId);
        if (!report) return;
        const title = getReportTitle(report) + ' - ' + getReportDateLabel(report);
        let content = `${title}\n`;
        content += `كاتب التقرير: ${writer || report.writer}\n`;
        content += `${'='.repeat(50)}\n\n`;
        employees.forEach((emp, idx) => {
            const total = calculateTotal(emp);
            const max = calculateMaxTotal(emp);
            const percent = max > 0 ? ((total / max) * 100).toFixed(1) : '0';
            content += `${idx + 1}. ${emp.employeeName} (${emp.role} - ${emp.branch})\n`;
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
            {/* Top Selector Bar */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-4 border-slate-50 flex flex-wrap items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col gap-2 min-w-[300px] flex-1">
                    <label className="text-sm font-black text-slate-600 mr-2 flex items-center gap-2">
                        <ListFilter size={18} className="text-blue-500" /> نوع المتابعة
                    </label>
                    <select
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
                        value={followUpType}
                        onChange={(e) => handleTypeChange(e.target.value)}
                    >
                        {(data.adminFollowUpTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                    <label className="text-sm font-black text-slate-600 mr-2 flex items-center gap-2">
                        <UserCircle size={18} className="text-blue-500" /> كاتب التقرير
                    </label>
                    <input
                        type="text"
                        className="bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-sans"
                        placeholder="اسم كاتب التقرير..."
                        value={writer}
                        onChange={(e) => setWriter(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-black text-slate-600 mr-2 flex items-center gap-2">
                        <FileBarChart2 size={18} className="text-blue-500" /> نوع التقرير
                    </label>
                    <div className="flex gap-2">
                        {['أسبوعي', 'شهري', 'فصلي', 'سنوي'].map(period => (
                            <button
                                key={period}
                                onClick={() => setSelectedReportPeriod(selectedReportPeriod === period ? null : period)}
                                className={`px-5 py-3.5 border-2 rounded-[1.2rem] font-black text-xs transition-all shadow-sm active:scale-95 ${selectedReportPeriod === period
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-blue-500'
                                    }`}
                            >
                                {period}
                            </button>
                        ))}
                    </div>
                </div>

                {selectedReportPeriod && (
                    <div className="flex flex-col gap-2 flex-1 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-sm font-black text-slate-600 mr-2 flex items-center gap-2">
                            <Calendar size={18} className="text-amber-500" /> فترة التجميع (من تاريخ - إلى تاريخ)
                        </label>
                        <div className="flex gap-2 items-center">
                            <div className="flex flex-col gap-1 flex-1">
                                <span className="text-[10px] font-bold text-slate-400 mr-2">من تاريخ</span>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3 font-bold text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 font-sans transition-all"
                                    value={aggDateFrom}
                                    onChange={(e) => setAggDateFrom(e.target.value)}
                                />
                            </div>
                            <span className="text-slate-400 font-bold mt-5">إلى</span>
                            <div className="flex flex-col gap-1 flex-1">
                                <span className="text-[10px] font-bold text-slate-400 mr-2">إلى تاريخ</span>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3 font-bold text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 font-sans transition-all"
                                    value={aggDateTo}
                                    onChange={(e) => setAggDateTo(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => {
                                    aggregateReports(selectedReportPeriod);
                                    setSelectedReportPeriod(null);
                                }}
                                className="mt-5 px-6 py-3 bg-amber-500 text-white rounded-[1.2rem] font-black text-xs hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 active:scale-95"
                            >
                                تجميع
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={createNewReport}
                    className="mt-auto h-[58px] px-8 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 transform hover:scale-[1.02] active:scale-95"
                >
                    <Plus size={22} /> إظهار التقرير
                </button>
            </div>

            {currentReportId && (
                <>
                    {/* Header Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white/60 backdrop-blur-lg p-5 rounded-[2.2rem] border border-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={createNewReport}
                                className="flex items-center gap-2 h-11 px-5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                            >
                                <Plus size={18} /> إضافة جدول
                            </button>
                            <button
                                onClick={() => setShowArchive(true)}
                                className="flex items-center gap-2 h-11 px-5 bg-slate-800 text-white rounded-xl text-xs font-black shadow-lg shadow-slate-100 hover:bg-slate-900 transition-all"
                            >
                                <Archive size={18} /> أرشيف التقارير
                            </button>
                            <div className="h-8 w-[2px] bg-slate-200 mx-2" />
                            <button
                                onClick={addEmployee}
                                className="flex items-center gap-2 h-11 px-5 bg-teal-600 text-white rounded-xl text-xs font-black shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all"
                            >
                                <UserPlus size={18} /> إضافة اسم
                            </button>
                            <button
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.txt,.xml,.xlsx';
                                    input.onchange = (e) => alert('تم استيراد الأسماء بنجاح (محاكاة)');
                                    input.click();
                                }}
                                className="flex items-center gap-2 h-11 px-5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                            >
                                <FileUp size={18} /> استيراد الأسماء
                            </button>
                            <button
                                onClick={() => { if (employees.length > 0) setShowIndividualModal(employees[0].id); }}
                                className="flex items-center gap-2 h-11 px-5 bg-purple-600 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all"
                            >
                                <UserCircle size={18} /> تقرير فردي
                            </button>
                            <button
                                onClick={() => setShowCustomizer(true)}
                                className="flex items-center gap-2 h-11 px-5 bg-amber-500 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all"
                            >
                                <Palette size={18} /> تخصيص المجالات
                            </button>
                            <div className="h-8 w-[2px] bg-slate-200 mx-2" />
                            <button
                                onClick={exportToExcel}
                                className="flex items-center gap-2 h-11 px-5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                            >
                                <Download size={18} /> excel
                            </button>
                            <button
                                onClick={exportToTxt}
                                className="flex items-center gap-2 h-11 px-5 bg-rose-600 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all"
                            >
                                <FileText size={18} /> TXT
                            </button>
                            <button
                                onClick={() => generateWhatsAppReport('bulk')}
                                className="flex items-center gap-2 h-11 px-5 bg-green-600 text-white rounded-xl text-xs font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all"
                            >
                                <Share2 size={18} /> واتساب
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="بحث سريع عن اسم..."
                                    className="bg-white border-2 border-slate-100 rounded-2xl pr-12 pl-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none w-72 shadow-inner transition-all font-sans"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
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
                                <div className="flex items-center gap-3 bg-slate-50 px-6 py-2 rounded-full border border-slate-100">
                                    <Calendar size={18} className="text-blue-500" />
                                    <span className="font-black text-slate-600 text-sm">
                                        {getReportDateLabel(report)}
                                    </span>
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
                                    ) : employees.filter(e => e.employeeName?.includes(searchTerm)).map((emp, idx) => {
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
                    <div className="bg-white rounded-[3rem] w-full max-w-3xl overflow-hidden shadow-2xl border-[10px] border-white flex flex-col max-h-[85vh] animate-in zoom-in-95">
                        <div className="p-10 bg-slate-900 text-white flex items-center justify-between shadow-2xl">
                            <div className="flex flex-col">
                                <h3 className="text-3xl font-black tracking-tight">أرشيف تقارير المتابعة</h3>
                                <p className="text-slate-400 font-bold mt-1">تصفح وإدارة الجوال السابقة</p>
                            </div>
                            <button onClick={() => setShowArchive(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90 bg-white/5 border border-white/10">
                                <X size={28} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-10 space-y-4 custom-scrollbar">
                            {(data.adminReports || []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                                    <Archive size={64} strokeWidth={1} />
                                    <span className="font-black text-xl">الأرشيف فارغ حالياً</span>
                                </div>
                            ) : (data.adminReports || []).filter(r => r.followUpType === followUpType).map(r => {
                                const reportTypeLabel = r.periodName ? r.periodName : 'يومي';
                                return (
                                    <div key={r.id} className="group relative flex items-center justify-between p-6 bg-slate-50 border-2 border-indigo-100 rounded-[2rem] hover:border-indigo-500 hover:bg-white transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1">
                                        <div className="flex items-center gap-6" onClick={() => { setCurrentReportId(r.id); setFollowUpType(r.followUpType); setWriter(r.writer || ''); setShowArchive(false); }}>
                                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center font-black shadow-inner group-hover:scale-110 transition-transform">
                                                <Calendar size={28} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${reportTypeLabel === 'يومي' ? 'bg-green-100 text-green-700' :
                                                        reportTypeLabel === 'الأسبوعي' ? 'bg-blue-100 text-blue-700' :
                                                            reportTypeLabel === 'الشهري' ? 'bg-purple-100 text-purple-700' :
                                                                reportTypeLabel === 'الفصلي' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-red-100 text-red-700'
                                                        }`}>{reportTypeLabel}</span>
                                                    <span className="font-black text-xl text-slate-800">{r.dateStr}</span>
                                                </div>
                                                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-0.5 rounded-full inline-block w-fit">{r.followUpType}</span>
                                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mt-2">
                                                    <span className="flex items-center gap-1"><UserCircle size={14} /> {r.writer || 'غير محدد'}</span>
                                                    <span className="flex items-center gap-1"><Users size={14} /> {r.employeesData.length} موظف</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => deleteReport(r.id)} className="p-4 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                                                <Trash2 size={24} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setCurrentReportId(r.id); setFollowUpType(r.followUpType); setWriter(r.writer || ''); setTimeout(() => generateWhatsAppReport('bulk'), 100); }} className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 hover:bg-green-200 transition-colors">
                                                <Send size={24} className="rotate-180" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
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
};

export default StaffFollowUpPage;
