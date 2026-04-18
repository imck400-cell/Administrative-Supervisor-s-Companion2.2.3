import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const hijriMonths = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

export const toHijri = (dateStr: string) => {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const monthNum = parseInt(parts.find(p => p.type === 'month')?.value || '1');
    const year = parts.find(p => p.type === 'year')?.value || '';
    return `${day} / ${hijriMonths[monthNum - 1]} / ${year}`;
  } catch { return ''; }
};

const getDayNameAr = (dateStr: string) => {
  try {
    return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date(dateStr));
  } catch { return ''; }
};

export interface ExcelExportOptions {
  title: string;
  filename: string;
  headers: string[];
  data: any[][];
  headerColors?: string[];
  columnWidths?: number[];
  profile: {
    ministry?: string;
    district?: string;
    schoolName?: string;
    branch?: string;
    branchManager?: string;
    writerName?: string;
    logo?: string;
  };
  date?: string;
  // New: allows custom styling per cell/row
  onRow?: (row: ExcelJS.Row, rowData: any[], rowIndex: number) => void;
}

export const exportToStyledExcel = async (options: ExcelExportOptions) => {
  const { title, filename, headers, data, profile, date = '', onRow } = options;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title, {
    views: [{ rightToLeft: true }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
  });

  const colCount = Math.max(headers.length, 9);
  
  // --- Set Column Widths Early ---
  if (options.columnWidths) {
    options.columnWidths.forEach((w, i) => {
      worksheet.getColumn(i + 1).width = w;
    });
  } else {
    for (let i = 1; i <= colCount; i++) {
        worksheet.getColumn(i).width = 18;
    }
  }

  // --- 1. Top Logo/Header Area ---
  for (let i = 1; i <= 6; i++) {
    worksheet.getRow(i).height = 20;
  }

  // A. Right Side: Ministry Info
  const rightCol = 1;
  worksheet.getCell(1, rightCol).value = profile.ministry || 'وزارة التربية والتعليم والبحث العلمي';
  worksheet.getCell(2, rightCol).value = profile.district || 'مكتب التربية والتعليم';
  worksheet.getCell(3, rightCol).value = profile.schoolName || 'اسم المدارس المختارة';
  worksheet.getCell(4, rightCol).value = `الفرع: ${profile.branch || '... '}`;

  [1, 2, 3, 4].forEach(r => {
    const cell = worksheet.getCell(r, rightCol);
    cell.font = { name: 'Arial', bold: true, size: 10 };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  // B. Center: Logo Placeholder + Title
  const centerCol = Math.ceil(colCount / 2);
  worksheet.mergeCells(2, centerCol - 1, 4, centerCol + 1);
  const titleCell = worksheet.getCell(2, centerCol - 1);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', bold: true, size: 16, color: { argb: 'FF1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F7FF' }
  };
  titleCell.border = {
    top: { style: 'medium', color: { argb: 'FFBFDBFE' } },
    bottom: { style: 'medium', color: { argb: 'FFBFDBFE' } },
    left: { style: 'medium', color: { argb: 'FFBFDBFE' } },
    right: { style: 'medium', color: { argb: 'FFBFDBFE' } }
  };

  if (profile.logo) {
      // If we had a base64 logo, we could add it here
      // const imageId = workbook.addImage({ base64: profile.logo, extension: 'png' });
      // worksheet.addImage(imageId, { tl: { col: centerCol - 0.5, row: 0 }, ext: { width: 50, height: 50 } });
  }

  // C. Left Side: Dates
  const leftCol = colCount;
  const todayDate = date || new Date().toISOString().split('T')[0];
  const hijri = toHijri(todayDate);
  const dayName = getDayNameAr(todayDate);

  worksheet.getCell(1, leftCol).value = `اليوم: ${dayName}`;
  worksheet.getCell(2, leftCol).value = `التاريخ الهجري: ${hijri}`;
  worksheet.getCell(3, leftCol).value = `التاريخ الميلادي: ${todayDate}`;

  [1, 2, 3].forEach(r => {
    const cell = worksheet.getCell(r, leftCol);
    cell.font = { name: 'Arial', bold: true, size: 10 };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // --- 2. Data Table ---
  const startRowIndex = 7;
  const headerRow = worksheet.getRow(startRowIndex);
  headerRow.values = headers;
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });

  data.forEach((rowData, idx) => {
    const excelRow = worksheet.addRow(rowData);
    excelRow.height = 25;
    const isEven = idx % 2 === 0;
    
    excelRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });

    if (onRow) {
      onRow(excelRow, rowData, idx);
    }
  });

  // --- 3. Footer ---
  const lastRow = worksheet.lastRow ? worksheet.lastRow.number : 10;
  const footerStart = lastRow + 2;
  worksheet.getRow(footerStart).height = 35;

  const writerCell = worksheet.getCell(footerStart, 1);
  writerCell.value = `إعداد التقرير: ${profile.writerName || '...'}`;
  writerCell.font = { name: 'Arial', bold: true, size: 11 };
  writerCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const stampCell = worksheet.getCell(footerStart, centerCol);
  stampCell.value = 'ختم المدرسة';
  stampCell.font = { name: 'Arial', bold: true, size: 11 };
  stampCell.alignment = { horizontal: 'center', vertical: 'middle' };
  stampCell.border = {
    top: { style: 'dashDot' }, bottom: { style: 'dashDot' },
    left: { style: 'dashDot' }, right: { style: 'dashDot' }
  };

  const managerCell = worksheet.getCell(footerStart, colCount);
  managerCell.value = `مدير المدرسة: ${profile.branchManager || '...'}`;
  managerCell.font = { name: 'Arial', bold: true, size: 11 };
  managerCell.alignment = { horizontal: 'left', vertical: 'middle' };

  // Save
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}.xlsx`);
};
