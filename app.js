// ============================================================
// STATE
// ============================================================
let allRecords = [];
let filteredRecords = [];
let employeeNames = {};

// DOM refs
const uploadSection = document.getElementById('uploadSection');
const fileInput = document.getElementById('fileInput');
const loadingEl = document.getElementById('loading');
const filtersSection = document.getElementById('filtersSection');
const tableSection = document.getElementById('tableSection');
const footerActions = document.getElementById('footerActions');
const attendanceTableBody = document.getElementById('attendanceTableBody');
const employeeFilter = document.getElementById('employeeFilter');
const dateFrom = document.getElementById('dateFrom');
const dateTo = document.getElementById('dateTo');
const recordCount = document.getElementById('recordCount');
const dateErrorMsg = document.getElementById('dateErrorMessage');

// ============================================================
// INIT - set default date to today
// ============================================================
function setDefaultDate() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    dateFrom.value = dateStr;
}
setDefaultDate();

// ============================================================
// ENHANCED DATE DISPLAY / DATE RANGE UX
// ============================================================
function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return dateStr;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[d.getMonth()]}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
}

function validateDateRange() {
    const fromVal = dateFrom.value;
    const toVal = dateTo.value;
    const invalid = fromVal && toVal && fromVal > toVal;
    dateFrom.classList.toggle('warning', !!invalid);
    dateTo.classList.toggle('warning', !!invalid);
    if (dateErrorMsg) dateErrorMsg.classList.toggle('visible', !!invalid);
    return !invalid;
}

dateFrom.addEventListener('change', validateDateRange);
dateTo.addEventListener('change', validateDateRange);
dateFrom.addEventListener('blur', validateDateRange);
dateTo.addEventListener('blur', validateDateRange);

function setTodayRange() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    dateFrom.value = dateStr;
    dateTo.value = dateStr;
    validateDateRange();
    applyFilters();
}

function setWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dateFrom.value = fmt(monday);
    dateTo.value = fmt(sunday);
    validateDateRange();
    applyFilters();
}

function setMonthRange() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    dateFrom.value = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0);
    dateTo.value = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    validateDateRange();
    applyFilters();
}

function clearDateRange() {
    dateFrom.value = '';
    dateTo.value = '';
    validateDateRange();
    applyFilters();
}

// ============================================================
// FILE HANDLING
// ============================================================
uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('dragover');
});
uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('dragover');
});
uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target.result);
    reader.readAsText(file);
}

function cleanValue(val) {
    if (!val) return '';
    let cleaned = val.trim();
    if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    return cleaned.trim();
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function parseCSV(text) {
    showLoading(true);
    setTimeout(() => {
        try {
            const lines = text.split('\n').filter(line => line.trim());
            if (!lines.length) {
                alert('Empty file.');
                showLoading(false);
                return;
            }

            const headerValues = parseCSVLine(lines[0]);
            const headers = headerValues.map(h => cleanValue(h));

            let sNameIdx = -1, dateIdx = -1, timeIdx = -1, statusIdx = -1;

            headers.forEach((h, idx) => {
                const hLower = h.toLowerCase();
                if (hLower === 'sname' || hLower === 'name' || hLower === 'employee') sNameIdx = idx;
                if (hLower === 'date') dateIdx = idx;
                if (hLower === 'time') timeIdx = idx;
                if (hLower === 'attendancestatus' || hLower === 'in/out' || hLower === 'status') statusIdx = idx;
            });

            if (sNameIdx === -1 || dateIdx === -1 || timeIdx === -1 || statusIdx === -1) {
                alert('Required columns not found: sName, Date, Time, AttendanceStatus');
                showLoading(false);
                return;
            }

            const records = [];
            const nameMap = {};
            let skippedCount = 0;

            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                if (values.length <= Math.max(sNameIdx, dateIdx, timeIdx, statusIdx)) continue;

                const name = cleanValue(values[sNameIdx] || '');
                const date = cleanValue(values[dateIdx] || '');
                const time = cleanValue(values[timeIdx] || '');
                const status = cleanValue(values[statusIdx] || '');

                if (!name || name === 'NULL' || name === 'Unknown' || name === '' || name === 'null' || name === 'undefined') {
                    skippedCount++;
                    continue;
                }
                if (!date || !time || !status) {
                    skippedCount++;
                    continue;
                }

                nameMap[name] = name;
                records.push({ name, date, time, status });
            }

            if (!records.length) {
                alert('No valid records found. Total lines: ' + lines.length + ', Skipped: ' + skippedCount +
                    '. Please check the file format.');
                showLoading(false);
                return;
            }

            allRecords = records;
            employeeNames = nameMap;
            updateUI();
            showLoading(false);
        } catch (err) {
            console.error(err);
            alert('Error parsing file: ' + err.message);
            showLoading(false);
        }
    }, 100);
}

// ============================================================
// UI UPDATE
// ============================================================
function updateUI() {
    updateEmployeeFilter();
    showSections(true);
    applyFilters();
}

function showSections(show) {
    const d = show ? 'flex' : 'none';
    const db = show ? 'block' : 'none';
    filtersSection.style.display = d;
    tableSection.style.display = db;
    footerActions.style.display = d;
}

function showLoading(active) {
    loadingEl.classList.toggle('active', active);
}

function updateEmployeeFilter() {
    const names = Object.keys(employeeNames).sort();
    employeeFilter.innerHTML = '<option value="all">All Employees</option>';
    names.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        employeeFilter.appendChild(opt);
    });
}

// ============================================================
// FILTERS
// ============================================================
function applyFilters() {
    validateDateRange();
    const employee = employeeFilter.value;
    filteredRecords = allRecords.filter(r => {
        if (dateFrom.value && r.date < dateFrom.value) return false;
        if (dateTo.value && r.date > dateTo.value) return false;
        if (employee !== 'all' && r.name !== employee) return false;
        return true;
    });
    renderTable();
}

function resetFilters() {
    setDefaultDate();
    dateTo.value = '';
    employeeFilter.value = 'all';
    applyFilters();
}

// ============================================================
// RENDER TABLE
// ============================================================
function pairAttendanceRecords(records) {
    const grouped = {};

    records.forEach(r => {
        const key = r.name + '||' + r.date;
        if (!grouped[key]) {
            grouped[key] = { name: r.name, date: r.date, records: [] };
        }
        grouped[key].records.push(r);
    });

    const rows = [];

    Object.values(grouped).forEach(group => {
        const sortedRecords = group.records
            .slice()
            .sort((a, b) => a.time.localeCompare(b.time));

        let checkInTime = '';
        let checkOutTime = '';

        // Keep ONLY ONE attendance row per employee/date.
        // The first valid IN is the check-in and the last valid OUT
        // is the check-out. Extra IN scans after checkout are ignored.
        for (const record of sortedRecords) {
            const status = record.status.toLowerCase().trim();

            const isIn =
                status.includes('checkin') ||
                status === 'check in' ||
                status === 'breakin' ||
                status === 'break in' ||
                status === 'overtimein' ||
                status === 'overtime in';

            const isOut =
                status.includes('checkout') ||
                status === 'check out' ||
                status === 'breakout' ||
                status === 'break out' ||
                status === 'overtimeout' ||
                status === 'overtime out';

            if (isIn) {
                // First IN only.
                if (!checkInTime) {
                    checkInTime = record.time;
                }
            } else if (isOut) {
                // Keep the latest valid OUT for this employee/date.
                // This prevents another IN scan from creating a duplicate row.
                if (checkInTime) {
                    checkOutTime = record.time;
                }
            }
        }

        // Exactly one row for each employee + date.
        if (checkInTime || checkOutTime) {
            rows.push({
                name: group.name,
                date: group.date,
                checkIn: checkInTime,
                checkOut: checkOutTime
            });
        }
    });

    rows.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        return a.date.localeCompare(b.date);
    });

    return rows;
}

function renderTable() {
    attendanceTableBody.innerHTML = '';

    if (!filteredRecords.length) {
        attendanceTableBody.innerHTML =
            `<tr><td colspan="4" class="no-data">No records found</td></tr>`;
        recordCount.textContent = '0 records';
        return;
    }

    const rows = pairAttendanceRecords(filteredRecords);

    rows.forEach(row => {
        const tr = document.createElement('tr');
        const displayDate = formatDateDisplay(row.date);
        tr.innerHTML = `
            <td><span class="employee-name">${esc(row.name)}</span></td>
            <td class="date-display">${esc(displayDate)}</td>
            <td class="checkin-cell">${esc(row.checkIn || '')}</td>
            <td class="checkout-cell">${esc(row.checkOut || '')}</td>
        `;
        attendanceTableBody.appendChild(tr);
    });

    recordCount.textContent = `${rows.length} records`;
}

function esc(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

// ============================================================
// EXPORT FUNCTIONS
// ============================================================
function getPairedRecords(records) {
    return pairAttendanceRecords(records);
}

// Enhanced Excel export with colors using ExcelJS
exportExcel = async function () {
            if (!filteredRecords || !filteredRecords.length) {
                alert('No data to export.');
                return;
            }
            const rows = getPairedRecords(filteredRecords);
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Attendance System';
            workbook.created = new Date();
            const worksheet = workbook.addWorksheet('Attendance', {
                properties: { tabColor: { argb: 'FF217346' } },
                pageSetup: {
                    orientation: 'landscape', fitToPage: true, margins: {
                        left: 0.7, right: 0.7, top: 0.7,
                        bottom: 0.7, header: 0.3, footer: 0.3
                    }
                }
            });
            worksheet.columns = [
                { header: 'Employee', key: 'employee', width: 25 },
                { header: 'Date', key: 'date', width: 20 },
                { header: 'Check In', key: 'checkIn', width: 15 },
                { header: 'Check Out', key: 'checkOut', width: 15 }
            ];
            const headerRow = worksheet.getRow(1);
            headerRow.height = 30;
            headerRow.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2B45' } };
            headerRow.border = {
                top: { style: 'thin', color: { argb: 'FF1a5c38' } },
                bottom: { style: 'thin', color: { argb: 'FF1a5c38' } },
                left: { style: 'thin', color: { argb: 'FF1a5c38' } },
                right: { style: 'thin', color: { argb: 'FF1a5c38' } }
            };

            rows.forEach((row, index) => {
                const displayDate = formatDateDisplay(row.date);
                const rowData = worksheet.addRow({
                    employee: row.name,
                    date: displayDate,
                    checkIn: row.checkIn || '',
                    checkOut: row.checkOut || ''
                });
                const rowNum = index + 2;
                const rowRef = worksheet.getRow(rowNum);
                rowRef.height = 24;
                rowRef.alignment = { vertical: 'middle', horizontal: 'left' };
                if (index % 2 === 0) {
                    rowRef.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                } else {
                    rowRef.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                }
                const checkInCell = rowRef.getCell(3);
                checkInCell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF1E40AF' } };
                const checkOutCell = rowRef.getCell(4);
                checkOutCell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF92400E' } };
                rowRef.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE9EDF2' } },
                        bottom: { style: 'thin', color: { argb: 'FFE9EDF2' } },
                        left: { style: 'thin', color: { argb: 'FFE9EDF2' } },
                        right: { style: 'thin', color: { argb: 'FFE9EDF2' } }
                    };
                });
            });
            worksheet.autoFilter = { from: 'A1', to: 'D1' };
            worksheet.views = [{ state: 'frozen', ySplit: 1 }];
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, 'attendance_checkinout.xlsx');
        };

        // ============================================================
        // OVERRIDE applyFilters to validate before applying (warning only)
        // ============================================================

exportPDF = async function () {
            if (!filteredRecords || !filteredRecords.length) {
                alert('No data to export.');
                return;
            }
            const rows = getPairedRecords(filteredRecords);
            const { PDFDocument, rgb, StandardFonts } = PDFLib;
            const doc = await PDFDocument.create();
            const font = await doc.embedFont(StandardFonts.Helvetica);
            const bold = await doc.embedFont(StandardFonts.HelveticaBold);

            const page = doc.addPage([600, 800]);
            let y = page.getSize().height - 40;
            const lineH = 18;
            const cols = [40, 160, 300, 440];

            // header with color
            const headerBg = rgb(0.06, 0.17, 0.27);
            page.drawRectangle({
                x: cols[0] - 4,
                y: y - 14,
                width: 440,
                height: 20,
                color: headerBg,
            });
            page.drawText('Employee', { x: cols[0], y: y - 2, size: 10, font: bold, color: rgb(1, 1, 1) });
            page.drawText('Date', { x: cols[1], y: y - 2, size: 10, font: bold, color: rgb(1, 1, 1) });
            page.drawText('Check In', { x: cols[2], y: y - 2, size: 10, font: bold, color: rgb(1, 1, 1) });
            page.drawText('Check Out', { x: cols[3], y: y - 2, size: 10, font: bold, color: rgb(1, 1, 1) });
            y -= lineH;

            const drawRow = (row, index, currentPage) => {
                const bgColor = index % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(0.94, 0.96, 0.98);
                currentPage.drawRectangle({
                    x: cols[0] - 4,
                    y: y - 12,
                    width: 440,
                    height: 16,
                    color: bgColor,
                });
                const displayDate = formatDateDisplay(row.date);
                currentPage.drawText(String(row.name).substring(0, 20), {
                    x: cols[0],
                    y: y - 2,
                    size: 9,
                    font: font,
                    color: rgb(0.1, 0.1, 0.1)
                });
                currentPage.drawText(displayDate, {
                    x: cols[1],
                    y: y - 2,
                    size: 9,
                    font: font,
                    color: rgb(0.1, 0.1, 0.1)
                });
                currentPage.drawText(String(row.checkIn || '').substring(0, 15), {
                    x: cols[2],
                    y: y - 2,
                    size: 9,
                    font: font,
                    color: rgb(0.12, 0.25, 0.69)
                });
                currentPage.drawText(String(row.checkOut || '').substring(0, 15), {
                    x: cols[3],
                    y: y - 2,
                    size: 9,
                    font: font,
                    color: rgb(0.57, 0.25, 0.05)
                });
            };

            for (let idx = 0; idx < rows.length; idx++) {
                const row = rows[idx];
                if (y < 40) {
                    const np = doc.addPage([600, 800]);
                    y = np.getSize().height - 40;
                    const headerBgNew = rgb(0.06, 0.17, 0.27);
                    np.drawRectangle({
                        x: cols[0] - 4,
                        y: y - 14,
                        width: 440,
                        height: 20,
                        color: headerBgNew,
                    });
                    np.drawText('Employee', { x: cols[0], y: y - 2, size: 10, font: bold, color: rgb(1, 1, 1) });
                    np.drawText('Date', { x: cols[1], y: y - 2, size: 10, font: bold, color: rgb(1, 1, 1) });
                    np.drawText('Check In', { x: cols[2], y: y - 2, size: 10, font: bold, color: rgb(1, 1, 1) });
                    np.drawText('Check Out', { x: cols[3], y: y - 2, size: 10, font: bold, color: rgb(1, 1, 1) });
                    y -= lineH;
                }
                const currentPage = doc.getPages()[doc.getPages().length - 1];
                drawRow(row, idx, currentPage);
                y -= lineH;
            }

            const pdfBytes = await doc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            saveAs(blob, 'attendance_checkinout_colored.pdf');
        };

        // ============================================================
        // ENHANCE CSV / EXCEL EXPORT WITH FORMATTED DATES
        // ============================================================

exportCSV = function () {
            if (!filteredRecords || !filteredRecords.length) {
                alert('No data to export.');
                return;
            }
            const rows = getPairedRecords(filteredRecords);
            let csv = 'Employee,Date,Check In,Check Out\n';
            rows.forEach(row => {
                const displayDate = formatDateDisplay(row.date);
                csv += `"${row.name}","${displayDate}","${row.checkIn || ''}","${row.checkOut || ''}"\n`;
            });
            downloadFile(csv, 'attendance_checkinout.csv', 'text/csv');
        };

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// ============================================================
// CLEAR
// ============================================================
function clearData() {
    if (!confirm('Clear all data?')) return;
    allRecords = [];
    filteredRecords = [];
    employeeNames = {};
    showSections(false);
    attendanceTableBody.innerHTML = '';
    employeeFilter.innerHTML = '<option value="all">All Employees</option>';
    recordCount.textContent = '0 records';
    fileInput.value = '';
    setDefaultDate();
    dateTo.value = '';
    validateDateRange();
}