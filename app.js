// ============================================================
// STATE
// ============================================================
let allRecords = [];
let filteredRecords = [];
let employeeNames = {};

// DOM refs
const uploadSection = document.getElementById("uploadSection");
const fileInput = document.getElementById("fileInput");
const loadingEl = document.getElementById("loading");
const filtersSection = document.getElementById("filtersSection");
const tableSection = document.getElementById("tableSection");
const footerActions = document.getElementById("footerActions");
const attendanceTableBody = document.getElementById("attendanceTableBody");
const employeeFilter = document.getElementById("employeeFilter");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const recordCount = document.getElementById("recordCount");
const dateErrorMsg = document.getElementById("dateErrorMessage");
const statusPill = document.getElementById("statusPill");
const statusText = document.getElementById("statusText");
const toastEl = document.getElementById("toast");

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function showToast(message, type = "info") {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className =
    "toast show" +
    (type === "success" ? " success" : type === "error" ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2800);
}

// ============================================================
// STATUS PILL
// ============================================================
function setStatus(text, active = false) {
  if (statusText) statusText.textContent = text;
  if (statusPill) statusPill.classList.toggle("active", active);
}

// ============================================================
// INIT
// ============================================================
function setDefaultDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  dateFrom.value = `${y}-${m}-${d}`;
}
setDefaultDate();

// ============================================================
// DATE DISPLAY
// ============================================================
function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return dateStr;
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${monthNames[d.getMonth()]}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
}

// ============================================================
// DATE RANGE VALIDATION
// ============================================================
function validateDateRange() {
  const fromVal = dateFrom.value;
  const toVal = dateTo.value;
  const invalid = fromVal && toVal && fromVal > toVal;
  dateFrom.classList.toggle("warning", !!invalid);
  dateTo.classList.toggle("warning", !!invalid);
  if (dateErrorMsg) dateErrorMsg.classList.toggle("visible", !!invalid);
  return !invalid;
}

dateFrom.addEventListener("change", validateDateRange);
dateTo.addEventListener("change", validateDateRange);
dateFrom.addEventListener("blur", validateDateRange);
dateTo.addEventListener("blur", validateDateRange);

// ============================================================
// QUICK DATE RANGES
// ============================================================
function setTodayRange() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  dateFrom.value = dateStr;
  dateTo.value = dateStr;
  validateDateRange();
  applyFilters();
  showToast("📆 Today's range applied", "success");
}

function setWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  dateFrom.value = fmt(monday);
  dateTo.value = fmt(sunday);
  validateDateRange();
  applyFilters();
  showToast("📅 This week's range applied", "success");
}

function setMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  dateFrom.value = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m + 1, 0);
  dateTo.value = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
  validateDateRange();
  applyFilters();
  showToast("🗓️ This month's range applied", "success");
}

function clearDateRange() {
  dateFrom.value = "";
  dateTo.value = "";
  validateDateRange();
  applyFilters();
  showToast("✕ Date range cleared");
}

// ============================================================
// FILE HANDLING
// ============================================================
uploadSection.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadSection.classList.add("dragover");
});
uploadSection.addEventListener("dragleave", () => {
  uploadSection.classList.remove("dragover");
});
uploadSection.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadSection.classList.remove("dragover");
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => parseCSV(e.target.result);
  reader.readAsText(file);
}

function cleanValue(val) {
  if (!val) return "";
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
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text) {
  showLoading(true);
  setStatus("Processing…", false);

  setTimeout(() => {
    try {
      const lines = text.split("\n").filter((line) => line.trim());
      if (!lines.length) {
        showToast("Empty file.", "error");
        showLoading(false);
        setStatus("Ready");
        return;
      }

      const headerValues = parseCSVLine(lines[0]);
      const headers = headerValues.map((h) => cleanValue(h));

      let sNameIdx = -1,
        dateIdx = -1,
        timeIdx = -1,
        statusIdx = -1;

      headers.forEach((h, idx) => {
        const hLower = h.toLowerCase();
        if (hLower === "sname" || hLower === "name" || hLower === "employee")
          sNameIdx = idx;
        if (hLower === "date") dateIdx = idx;
        if (hLower === "time") timeIdx = idx;
        if (
          hLower === "attendancestatus" ||
          hLower === "in/out" ||
          hLower === "status"
        )
          statusIdx = idx;
      });

      if (
        sNameIdx === -1 ||
        dateIdx === -1 ||
        timeIdx === -1 ||
        statusIdx === -1
      ) {
        showToast(
          "Required columns not found: sName, Date, Time, AttendanceStatus",
          "error",
        );
        showLoading(false);
        setStatus("Ready");
        return;
      }

      const records = [];
      const nameMap = {};
      let skippedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length <= Math.max(sNameIdx, dateIdx, timeIdx, statusIdx))
          continue;

        const name = cleanValue(values[sNameIdx] || "");
        const date = cleanValue(values[dateIdx] || "");
        const time = cleanValue(values[timeIdx] || "");
        const status = cleanValue(values[statusIdx] || "");

        if (
          !name ||
          name === "NULL" ||
          name === "Unknown" ||
          name === "null" ||
          name === "undefined"
        ) {
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
        showToast(
          `No valid records found. Total lines: ${lines.length}, Skipped: ${skippedCount}.`,
          "error",
        );
        showLoading(false);
        setStatus("Ready");
        return;
      }

      allRecords = records;
      employeeNames = nameMap;
      updateUI();
      showLoading(false);
      setStatus(`${records.length} records loaded`, true);
      showToast(`✓ Loaded ${records.length} records`, "success");
    } catch (err) {
      console.error(err);
      showToast("Error parsing file: " + err.message, "error");
      showLoading(false);
      setStatus("Ready");
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
  filtersSection.classList.toggle("visible", show);
  tableSection.classList.toggle("visible", show);
  footerActions.classList.toggle("visible", show);
}

function showLoading(active) {
  loadingEl.classList.toggle("active", active);
  if (active) {
    uploadSection.style.display = "none";
  }
}

function updateEmployeeFilter() {
  const names = Object.keys(employeeNames).sort();
  employeeFilter.innerHTML = '<option value="all">All Employees</option>';
  names.forEach((n) => {
    const opt = document.createElement("option");
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
  filteredRecords = allRecords.filter((r) => {
    if (dateFrom.value && r.date < dateFrom.value) return false;
    if (dateTo.value && r.date > dateTo.value) return false;
    if (employee !== "all" && r.name !== employee) return false;
    return true;
  });
  renderTable();
}

function resetFilters() {
  setDefaultDate();
  dateTo.value = "";
  employeeFilter.value = "all";
  validateDateRange();
  applyFilters();
  showToast("↻ Filters reset");
}

// ============================================================
// RENDER TABLE
// ============================================================
function pairAttendanceRecords(records) {
  const grouped = {};

  records.forEach((r) => {
    const key = r.name + "||" + r.date;
    if (!grouped[key]) {
      grouped[key] = { name: r.name, date: r.date, records: [] };
    }
    grouped[key].records.push(r);
  });

  const rows = [];

  Object.values(grouped).forEach((group) => {
    const sortedRecords = group.records
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time));

    let checkInTime = "";
    let checkOutTime = "";

    for (const record of sortedRecords) {
      const status = record.status.toLowerCase().trim();

      const isIn =
        status.includes("checkin") ||
        status === "check in" ||
        status === "breakin" ||
        status === "break in" ||
        status === "overtimein" ||
        status === "overtime in";

      const isOut =
        status.includes("checkout") ||
        status === "check out" ||
        status === "breakout" ||
        status === "break out" ||
        status === "overtimeout" ||
        status === "overtime out";

      if (isIn) {
        if (!checkInTime) checkInTime = record.time;
      } else if (isOut) {
        if (checkInTime) checkOutTime = record.time;
      }
    }

    if (checkInTime || checkOutTime) {
      rows.push({
        name: group.name,
        date: group.date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
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
  attendanceTableBody.innerHTML = "";

  if (!filteredRecords.length) {
    attendanceTableBody.innerHTML = `<tr><td colspan="4" class="no-data">No records found</td></tr>`;
    recordCount.textContent = "0 records";
    recordCount.classList.remove("has-records");
    return;
  }

  const rows = pairAttendanceRecords(filteredRecords);

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const displayDate = formatDateDisplay(row.date);
    tr.innerHTML = `
            <td><span class="employee-name">${esc(row.name)}</span></td>
            <td class="date-display">${esc(displayDate)}</td>
            <td class="checkin-cell">${esc(row.checkIn || "—")}</td>
            <td class="checkout-cell">${esc(row.checkOut || "—")}</td>
        `;
    attendanceTableBody.appendChild(tr);
  });

  recordCount.textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;
  recordCount.classList.toggle("has-records", rows.length > 0);
}

function esc(t) {
  if (!t) return "";
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}

// ============================================================
// EXPORT HELPERS
// ============================================================
function getPairedRecords(records) {
  return pairAttendanceRecords(records);
}

// ============================================================
// EXCEL EXPORT
// ============================================================
async function exportExcel() {
  if (!filteredRecords || !filteredRecords.length) {
    showToast("No data to export.", "error");
    return;
  }

  const rows = getPairedRecords(filteredRecords);

  if (!rows.length) {
    showToast("No paired records to export.", "error");
    return;
  }

  // ---------- BUILD WORKBOOK ----------
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Attendance System";
  workbook.lastModifiedBy = "Attendance System";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.company = "Attendance System";
  workbook.title = "Attendance Report";
  workbook.subject = "Check In / Out Report";
  workbook.keywords = "attendance, check-in, check-out, report";

  const worksheet = workbook.addWorksheet("Attendance", {
    properties: { tabColor: { argb: "FF217346" } },
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
      printTitlesRow: "5:5", // repeat header row on every printed page
    },
    headerFooter: {
      oddHeader: '&C&"Inter,Bold"&12Attendance Report',
      oddFooter: '&LGenerated: &D &T&C&"Inter"Page &P of &N&R&A',
    },
    views: [
      {
        state: "frozen",
        ySplit: 5, // freeze title + meta + header rows
        xSplit: 0,
        activeCell: "A6",
      },
    ],
  });

  // ---------- COLUMN WIDTHS ----------
  worksheet.columns = [
    { key: "num", width: 6 },
    { key: "employee", width: 28 },
    { key: "date", width: 22 },
    { key: "checkIn", width: 16 },
    { key: "checkOut", width: 16 },
    { key: "duration", width: 16 },
    { key: "status", width: 16 },
  ];

  const TOTAL_COLS = 7;
  const LAST_COL_LETTER = "G";

  // ---------- TITLE ROW (row 1) ----------
  worksheet.mergeCells(`A1:${LAST_COL_LETTER}1`);
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "ATTENDANCE  ·  CHECK IN / OUT REPORT";
  titleCell.font = {
    name: "Inter",
    size: 18,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F2B45" },
  };
  worksheet.getRow(1).height = 42;

  // ---------- META ROW (row 2) ----------
  worksheet.mergeCells(`A2:${LAST_COL_LETTER}2`);
  const metaCell = worksheet.getCell("A2");
  const fromText = dateFrom.value
    ? formatDateDisplay(dateFrom.value)
    : "All time";
  const toText = dateTo.value ? formatDateDisplay(dateTo.value) : "All time";
  const empText =
    employeeFilter.value === "all" ? "All Employees" : employeeFilter.value;
  metaCell.value = `Period: ${fromText}  →  ${toText}     •     Employee: ${empText}     •     Records: ${rows.length}`;
  metaCell.font = {
    name: "Inter",
    size: 10,
    italic: true,
    color: { argb: "FF64748B" },
  };
  metaCell.alignment = { vertical: "middle", horizontal: "center" };
  metaCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8FAFC" },
  };
  metaCell.border = {
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
  };
  worksheet.getRow(2).height = 24;

  // ---------- SPACER (row 3) ----------
  worksheet.getRow(3).height = 8;

  // ---------- SUMMARY ROW (row 4) ----------
  worksheet.mergeCells(`A4:${LAST_COL_LETTER}4`);
  const summaryCell = worksheet.getCell("A4");
  summaryCell.value = `Total Employees: ${new Set(rows.map((r) => r.name)).size}     •     Total Rows: ${rows.length}`;
  summaryCell.font = {
    name: "Inter",
    size: 10,
    bold: true,
    color: { argb: "FF0F2B45" },
  };
  summaryCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  summaryCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0F2FE" },
  };
  worksheet.getRow(4).height = 22;

  // ---------- HEADER ROW (row 5) ----------
  const headers = [
    "#",
    "Employee",
    "Date",
    "Check In",
    "Check Out",
    "Duration",
    "Status",
  ];
  const headerRow = worksheet.getRow(5);
  headerRow.values = headers;
  headerRow.height = 32;

  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Inter",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F2B45" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF0F2B45" } },
      bottom: { style: "medium", color: { argb: "FF1D4ED8" } },
      left: { style: "thin", color: { argb: "FF1E293B" } },
      right: { style: "thin", color: { argb: "FF1E293B" } },
    };
  });

  // ---------- HELPER: parse "HH:MM:SS" or "HH:MM" to minutes ----------
  function timeToMinutes(t) {
    if (!t) return null;
    const parts = String(t)
      .split(":")
      .map((n) => parseInt(n, 10));
    if (parts.some(isNaN)) return null;
    const [h = 0, m = 0] = parts;
    return h * 60 + m;
  }

  function minutesToDuration(mins) {
    if (mins == null || mins < 0) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }

  // ---------- DATA ROWS ----------
  const firstDataRow = 6;

  rows.forEach((row, index) => {
    const rowNum = firstDataRow + index;
    const r = worksheet.getRow(rowNum);
    const displayDate = formatDateDisplay(row.date);

    // Compute duration
    const inMin = timeToMinutes(row.checkIn);
    const outMin = timeToMinutes(row.checkOut);
    const durationMin =
      inMin != null && outMin != null && outMin >= inMin
        ? outMin - inMin
        : null;
    const durationText = minutesToDuration(durationMin);

    // Determine row status
    let statusText = "Complete";
    let statusColor = "FF16A34A"; // green
    let statusBg = "FFDCFCE7";

    if (!row.checkIn && !row.checkOut) {
      statusText = "Missing";
      statusColor = "FFDC2626";
      statusBg = "FFFEE2E2";
    } else if (!row.checkIn) {
      statusText = "No Check-In";
      statusColor = "FFB45309";
      statusBg = "FFFEF3C7";
    } else if (!row.checkOut) {
      statusText = "No Check-Out";
      statusColor = "FFB45309";
      statusBg = "FFFEF3C7";
    }

    r.values = [
      index + 1,
      row.name,
      displayDate,
      row.checkIn || "—",
      row.checkOut || "—",
      durationText,
      statusText,
    ];

    r.height = 24;

    // Alternating row background
    const zebra = index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";

    r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Inter", size: 10.5, color: { argb: "FF0F172A" } };
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: zebra },
      };
      cell.border = {
        top: { style: "hair", color: { argb: "FFE2E8F0" } },
        bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
        left: { style: "hair", color: { argb: "FFE2E8F0" } },
        right: { style: "hair", color: { argb: "FFE2E8F0" } },
      };

      // Center-align specific columns
      if ([1, 3, 4, 5, 6, 7].includes(colNumber)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });

    // Column 1 — index
    const c1 = r.getCell(1);
    c1.font = { name: "Inter", size: 10, color: { argb: "FF64748B" } };

    // Column 2 — employee name (bold)
    const c2 = r.getCell(2);
    c2.font = {
      name: "Inter",
      size: 11,
      bold: true,
      color: { argb: "FF0F2B45" },
    };
    c2.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

    // Column 4 — check-in (blue)
    const c4 = r.getCell(4);
    c4.font = {
      name: "Inter",
      size: 10.5,
      color: { argb: "FF1E40AF" },
      bold: true,
    };
    c4.alignment = { vertical: "middle", horizontal: "center" };

    // Column 5 — check-out (amber)
    const c5 = r.getCell(5);
    c5.font = {
      name: "Inter",
      size: 10.5,
      color: { argb: "FF92400E" },
      bold: true,
    };
    c5.alignment = { vertical: "middle", horizontal: "center" };

    // Column 6 — duration
    const c6 = r.getCell(6);
    c6.font = { name: "Inter", size: 10.5, color: { argb: "FF475569" } };
    c6.alignment = { vertical: "middle", horizontal: "center" };

    // Column 7 — status badge
    const c7 = r.getCell(7);
    c7.font = {
      name: "Inter",
      size: 10.5,
      bold: true,
      color: { argb: statusColor },
    };
    c7.alignment = { vertical: "middle", horizontal: "center" };
    c7.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: statusBg },
    };
    c7.border = {
      top: { style: "thin", color: { argb: statusColor } },
      bottom: { style: "thin", color: { argb: statusColor } },
      left: { style: "thin", color: { argb: statusColor } },
      right: { style: "thin", color: { argb: statusColor } },
    };
  });

  // ---------- FOOTER SUMMARY ROW ----------
  const footerRowNum = firstDataRow + rows.length;
  const footerRow = worksheet.getRow(footerRowNum);
  worksheet.mergeCells(`A${footerRowNum}:C${footerRowNum}`);

  const totalDurationMin = rows.reduce((sum, row) => {
    const inMin = timeToMinutes(row.checkIn);
    const outMin = timeToMinutes(row.checkOut);
    if (inMin != null && outMin != null && outMin >= inMin)
      return sum + (outMin - inMin);
    return sum;
  }, 0);

  const avgDurationMin = rows.length
    ? Math.round(totalDurationMin / rows.length)
    : 0;

  footerRow.getCell(1).value =
    `TOTAL — ${rows.length} row${rows.length === 1 ? "" : "s"}`;
  footerRow.getCell(4).value = "Total:";
  footerRow.getCell(5).value = minutesToDuration(totalDurationMin);
  footerRow.getCell(6).value = `Avg: ${minutesToDuration(avgDurationMin)}`;
  footerRow.getCell(7).value = "";

  footerRow.height = 28;
  footerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = {
      name: "Inter",
      size: 11,
      bold: true,
      color: { argb: "FF0F2B45" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0F2FE" },
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF1D4ED8" } },
      bottom: { style: "medium", color: { argb: "FF1D4ED8" } },
      left: { style: "hair", color: { argb: "FF94A3B8" } },
      right: { style: "hair", color: { argb: "FF94A3B8" } },
    };
  });

  // Left-align merged total label
  footerRow.getCell(1).alignment = {
    vertical: "middle",
    horizontal: "left",
    indent: 1,
  };

  // ---------- AUTO FILTER ----------
  worksheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: TOTAL_COLS },
  };

  // ---------- CONDITIONAL FORMATTING — duration highlight ----------
  // Highlight durations under 4h in soft red (short shifts)
  worksheet.addConditionalFormatting({
    ref: `F${firstDataRow}:F${footerRowNum - 1}`,
    rules: [
      {
        type: "cellIs",
        operator: "lessThan",
        formulae: [(4 * 60) / 1440], // 4 hours expressed as a fraction of a day
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFEF2F2" },
          },
          font: { color: { argb: "FFDC2626" }, bold: true },
        },
        priority: 1,
      },
    ],
  });

  // ---------- SHEET PROTECTION (optional, keeps layout intact) ----------
  // worksheet.protect("attendance", {
  //     selectLockedCells: true,
  //     selectUnlockedCells: true,
  //     formatCells: false,
  //     formatColumns: false,
  //     formatRows: false,
  //     insertRows: false,
  //     deleteRows: false,
  //     sort: true,
  //     autoFilter: true,
  // });

  // ---------- WRITE & SAVE ----------
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `attendance_report_${stamp}.xlsx`;

    saveAs(blob, filename);
    showToast(
      `📊 Excel exported — ${rows.length} row${rows.length === 1 ? "" : "s"}`,
      "success",
    );
  } catch (err) {
    console.error("Excel export failed:", err);
    showToast("Failed to export Excel: " + err.message, "error");
  }
}
// ============================================================
// PDF EXPORT
// ============================================================
async function exportPDF() {
  if (!filteredRecords || !filteredRecords.length) {
    showToast("No data to export.", "error");
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

  const headerBg = rgb(0.06, 0.17, 0.27);
  page.drawRectangle({
    x: cols[0] - 4,
    y: y - 14,
    width: 440,
    height: 20,
    color: headerBg,
  });
  page.drawText("Employee", {
    x: cols[0],
    y: y - 2,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Date", {
    x: cols[1],
    y: y - 2,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Check In", {
    x: cols[2],
    y: y - 2,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Check Out", {
    x: cols[3],
    y: y - 2,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });
  y -= lineH;

  const drawRow = (row, index, currentPage) => {
    const bgColor =
      index % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(0.94, 0.96, 0.98);
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
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentPage.drawText(displayDate, {
      x: cols[1],
      y: y - 2,
      size: 9,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentPage.drawText(String(row.checkIn || "").substring(0, 15), {
      x: cols[2],
      y: y - 2,
      size: 9,
      font,
      color: rgb(0.12, 0.25, 0.69),
    });
    currentPage.drawText(String(row.checkOut || "").substring(0, 15), {
      x: cols[3],
      y: y - 2,
      size: 9,
      font,
      color: rgb(0.57, 0.25, 0.05),
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
      np.drawText("Employee", {
        x: cols[0],
        y: y - 2,
        size: 10,
        font: bold,
        color: rgb(1, 1, 1),
      });
      np.drawText("Date", {
        x: cols[1],
        y: y - 2,
        size: 10,
        font: bold,
        color: rgb(1, 1, 1),
      });
      np.drawText("Check In", {
        x: cols[2],
        y: y - 2,
        size: 10,
        font: bold,
        color: rgb(1, 1, 1),
      });
      np.drawText("Check Out", {
        x: cols[3],
        y: y - 2,
        size: 10,
        font: bold,
        color: rgb(1, 1, 1),
      });
      y -= lineH;
    }
    const currentPage = doc.getPages()[doc.getPages().length - 1];
    drawRow(row, idx, currentPage);
    y -= lineH;
  }

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  saveAs(blob, "attendance_checkinout_colored.pdf");
  showToast("📄 PDF exported successfully", "success");
}

// ============================================================
// CSV EXPORT
// ============================================================
function exportCSV() {
  if (!filteredRecords || !filteredRecords.length) {
    showToast("No data to export.", "error");
    return;
  }
  const rows = getPairedRecords(filteredRecords);
  let csv = "Employee,Date,Check In,Check Out\n";
  rows.forEach((row) => {
    const displayDate = formatDateDisplay(row.date);
    csv += `"${row.name}","${displayDate}","${row.checkIn || ""}","${row.checkOut || ""}"\n`;
  });
  downloadFile(csv, "attendance_checkinout.csv", "text/csv");
  showToast("📋 CSV exported successfully", "success");
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType + ";charset=utf-8;" });
  const link = document.createElement("a");
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
  if (!confirm("Clear all data?")) return;
  allRecords = [];
  filteredRecords = [];
  employeeNames = {};
  showSections(false);
  attendanceTableBody.innerHTML = "";
  employeeFilter.innerHTML = '<option value="all">All Employees</option>';
  recordCount.textContent = "0 records";
  recordCount.classList.remove("has-records");
  fileInput.value = "";
  uploadSection.style.display = "";
  setDefaultDate();
  dateTo.value = "";
  validateDateRange();
  setStatus("Ready");
  showToast("🗑️ All data cleared", "success");
}
