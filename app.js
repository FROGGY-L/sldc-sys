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
    const employee = employeeFilter.value;
    filteredRecords = allRecords.filter(r => {
        if (dateFrom.value && r.date < dateFrom.value) return false;
        if (dateTo.value && r.date > dateTo.value) return false;
        if (employee !== 'all' && r.name !== employee) return false;
        return true;
    });
    renderTable();
    recordCount.textContent = `${filteredRecords.length} records`;
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
function renderTable() {
    attendanceTableBody.innerHTML = '';
    if (!filteredRecords.length) {
        attendanceTableBody.innerHTML = `<tr><td colspan="4" class="no-data">No records found</td></tr>`;
        return;
    }

    const grouped = {};
    filteredRecords.forEach(r => {
        const key = r.name + '||' + r.date;
        if (!grouped[key]) {
            grouped[key] = { name: r.name, date: r.date, records: [] };
        }
        grouped[key].records.push(r);
    });

    const rows = [];
    Object.values(grouped).forEach(group => {
        const sortedRecords = group.records.sort((a, b) => a.time.localeCompare(b.time));

        let checkInTime = null;
        let checkOutTime = null;
        let hasCheckIn = false;
        let hasCheckOut = false;

        for (const record of sortedRecords) {
            const status = record.status.toLowerCase().trim();

            if (status.includes('checkin') ||
                status === 'check in' ||
                status === 'breakin' ||
                status === 'break in' ||
                status === 'overtimein' ||
                status === 'overtime in') {
                if (!hasCheckIn) {
                    checkInTime = record.time;
                    hasCheckIn = true;
                } else if (hasCheckIn && !hasCheckOut) {
                    continue;
                } else if (hasCheckIn && hasCheckOut) {
                    checkInTime = record.time;
                    hasCheckIn = true;
                    hasCheckOut = false;
                    checkOutTime = null;
                }
            } else if (status.includes('checkout') ||
                status === 'check out' ||
                status === 'breakout' ||
                status === 'break out' ||
                status === 'overtimeout' ||
                status === 'overtime out') {
                if (hasCheckIn && !hasCheckOut) {
                    checkOutTime = record.time;
                    hasCheckOut = true;
                    rows.push({
                        name: group.name,
                        date: group.date,
                        checkIn: checkInTime,
                        checkOut: checkOutTime
                    });
                    checkInTime = null;
                    checkOutTime = null;
                    hasCheckIn = false;
                    hasCheckOut = false;
                }
            }
        }

        if (hasCheckIn && !hasCheckOut && checkInTime) {
            rows.push({
                name: group.name,
                date: group.date,
                checkIn: checkInTime,
                checkOut: ''
            });
        }
    });

    rows.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        return a.date.localeCompare(b.date);
    });

    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="employee-name">${esc(row.name)}</span></td>
            <td>${esc(row.date)}</td>
            <td class="checkin-cell">${esc(row.checkIn || '')}</td>
            <td class="checkout-cell">${esc(row.checkOut || '')}</td>
        `;
        attendanceTableBody.appendChild(tr);
    });
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
        const sortedRecords = group.records.sort((a, b) => a.time.localeCompare(b.time));

        let checkInTime = null;
        let checkOutTime = null;
        let hasCheckIn = false;
        let hasCheckOut = false;

        for (const record of sortedRecords) {
            const status = record.status.toLowerCase().trim();

            if (status.includes('checkin') ||
                status === 'check in' ||
                status === 'breakin' ||
                status === 'break in' ||
                status === 'overtimein' ||
                status === 'overtime in') {
                if (!hasCheckIn) {
                    checkInTime = record.time;
                    hasCheckIn = true;
                } else if (hasCheckIn && !hasCheckOut) {
                    continue;
                } else if (hasCheckIn && hasCheckOut) {
                    checkInTime = record.time;
                    hasCheckIn = true;
                    hasCheckOut = false;
                    checkOutTime = null;
                }
            } else if (status.includes('checkout') ||
                status === 'check out' ||
                status === 'breakout' ||
                status === 'break out' ||
                status === 'overtimeout' ||
                status === 'overtime out') {
                if (hasCheckIn && !hasCheckOut) {
                    checkOutTime = record.time;
                    hasCheckOut = true;
                    rows.push({
                        name: group.name,
                        date: group.date,
                        checkIn: checkInTime,
                        checkOut: checkOutTime
                    });
                    checkInTime = null;
                    checkOutTime = null;
                    hasCheckIn = false;
                    hasCheckOut = false;
                }
            }
        }

        if (hasCheckIn && !hasCheckOut && checkInTime) {
            rows.push({
                name: group.name,
                date: group.date,
                checkIn: checkInTime,
                checkOut: ''
            });
        }
    });

    rows.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        return a.date.localeCompare(b.date);
    });

    return rows;
}

// Enhanced Excel export with colors using ExcelJS
async function exportExcel() {
    if (!filteredRecords.length) {
        alert('No data to export.');
        return;
    }

    const rows = getPairedRecords(filteredRecords);
    
    // Create workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Attendance System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Attendance', {
        properties: { tabColor: { argb: 'FF217346' } },
        pageSetup: { orientation: 'landscape', fitToPage: true, margins: {
            left: 0.7, right: 0.7, top: 0.7, bottom: 0.7, header: 0.3, footer: 0.3
        }}
    });

    // Define columns
    worksheet.columns = [
        { header: 'Employee', key: 'employee', width: 25 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Check In', key: 'checkIn', width: 15 },
        { header: 'Check Out', key: 'checkOut', width: 15 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F2B45' }
    };
    headerRow.border = {
        top: { style: 'thin', color: { argb: 'FF1a5c38' } },
        bottom: { style: 'thin', color: { argb: 'FF1a5c38' } },
        left: { style: 'thin', color: { argb: 'FF1a5c38' } },
        right: { style: 'thin', color: { argb: 'FF1a5c38' } }
    };

    // Add data rows with alternating colors
    rows.forEach((row, index) => {
        const rowData = worksheet.addRow({
            employee: row.name,
            date: row.date,
            checkIn: row.checkIn || '',
            checkOut: row.checkOut || ''
        });

        const rowNum = index + 2; // +2 because header is row 1
        const rowRef = worksheet.getRow(rowNum);
        rowRef.height = 24;
        rowRef.alignment = { vertical: 'middle', horizontal: 'left' };
        
        // Alternating row colors
        if (index % 2 === 0) {
            rowRef.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8FAFC' }
            };
        } else {
            rowRef.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF1F5F9' }
            };
        }

        // Style Check In column (blue)
        const checkInCell = rowRef.getCell(3);
        checkInCell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF1E40AF' } };
        
        // Style Check Out column (brown)
        const checkOutCell = rowRef.getCell(4);
        checkOutCell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF92400E' } };

        // Add borders
        rowRef.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE9EDF2' } },
                bottom: { style: 'thin', color: { argb: 'FFE9EDF2' } },
                left: { style: 'thin', color: { argb: 'FFE9EDF2' } },
                right: { style: 'thin', color: { argb: 'FFE9EDF2' } }
            };
        });
    });

    // Auto-filter
    worksheet.autoFilter = {
        from: 'A1',
        to: 'D1'
    };

    // Freeze header row
    worksheet.views = [
        { state: 'frozen', ySplit: 1 }
    ];

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'attendance_checkinout.xlsx');
}

async function exportPDF() {
    if (!filteredRecords.length) {
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

    const drawHeaders = (p) => {
        p.drawText('Employee', { x: cols[0], y, size: 10, font: bold, color: rgb(0, 0, 0) });
        p.drawText('Date', { x: cols[1], y, size: 10, font: bold, color: rgb(0, 0, 0) });
        p.drawText('Check In', { x: cols[2], y, size: 10, font: bold, color: rgb(0, 0, 0) });
        p.drawText('Check Out', { x: cols[3], y, size: 10, font: bold, color: rgb(0, 0, 0) });
        y -= lineH;
    };
    drawHeaders(page);

    for (let row of rows) {
        if (y < 40) {
            const np = doc.addPage([600, 800]);
            y = np.getSize().height - 40;
            drawHeaders(np);
        }
        const currentPage = doc.getPages()[doc.getPages().length - 1];
        currentPage.drawText(String(row.name).substring(0, 20), {
            x: cols[0], y, size: 9, font, color: rgb(0.1, 0.1, 0.1)
        });
        currentPage.drawText(String(row.date), { x: cols[1], y, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
        currentPage.drawText(String(row.checkIn || '').substring(0, 15), {
            x: cols[2], y, size: 9, font, color: rgb(0.1, 0.1, 0.1)
        });
        currentPage.drawText(String(row.checkOut || '').substring(0, 15), {
            x: cols[3], y, size: 9, font, color: rgb(0.1, 0.1, 0.1)
        });
        y -= lineH;
    }
    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    saveAs(blob, 'attendance_checkinout.pdf');
}

function exportCSV() {
    if (!filteredRecords.length) {
        alert('No data to export.');
        return;
    }
    const rows = getPairedRecords(filteredRecords);
    let csv = 'Employee,Date,Check In,Check Out\n';
    rows.forEach(row => {
        csv += `"${row.name}","${row.date}","${row.checkIn || ''}","${row.checkOut || ''}"\n`;
    });
    downloadFile(csv, 'attendance_checkinout.csv', 'text/csv');
}

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
}