# README.md

```markdown
# 📋 Attendance · Check In / Out

A clean, modern web application for uploading, filtering, and exporting employee attendance records. Built with vanilla JavaScript — no build step, no framework, just open and go.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Version](https://img.shields.io/badge/version-1.0-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## ✨ Features

- **🏠 Homepage Dashboard** — Clean landing page with feature overview and quick access to the tool
- **📁 CSV Upload** — Drag & drop or click to upload attendance files
- **🔍 Smart Filtering** — Filter by date range (Today / This Week / This Month / Custom) or by individual employee
- **⚡ Auto Pairing** — Automatically pairs check-in and check-out events per employee per day
- **📊 Multi-Format Export** — Download reports as styled **Excel**, **PDF**, or **CSV**
- **🎨 Modern UI** — Polished design with smooth animations, toast notifications, and full responsiveness
- **♿ Accessible** — Keyboard focus states, reduced-motion support, and semantic markup

---

## 🚀 Getting Started

### Prerequisites
A modern web browser (Chrome, Edge, Firefox, Safari). No installation or build step required.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/attendance-checkinout.git
   cd attendance-checkinout
   ```

2. **Open in browser**
   Simply open `index.html` in your browser — or use a local server:
   ```bash
   # Python 3
   python -m http.server 8000

   # Node.js (with npx)
   npx serve
   ```
   Then visit `http://localhost:8000`.

---

## 📁 Project Structure

```
attendance-checkinout/
├── index.html      # Markup — homepage + tool view
├── style.css       # All styling (variables, components, responsive)
├── app.js          # All logic (parsing, filtering, rendering, exports)
└── README.md       # You are here
```

---

## 📄 CSV File Format

Your CSV file **must** contain the following columns (header names are case-insensitive):

| Column | Aliases | Description |
|--------|---------|-------------|
| `sName` | `name`, `employee` | Employee name |
| `Date` | — | Date in `YYYY-MM-DD` format |
| `Time` | — | Time in `HH:MM:SS` or `HH:MM` format |
| `AttendanceStatus` | `in/out`, `status` | Status value (see below) |

### Example CSV

```csv
sName,Date,Time,AttendanceStatus
John Doe,2024-06-03,08:02:15,CheckIn
John Doe,2024-06-03,12:01:00,BreakOut
John Doe,2024-06-03,13:00:45,BreakIn
John Doe,2024-06-03,17:05:30,CheckOut
Jane Smith,2024-06-03,08:15:00,CheckIn
Jane Smith,2024-06-03,17:10:00,CheckOut
```

### Recognized Status Values

**Check-In statuses:**
- `CheckIn`, `Check In`
- `BreakIn`, `Break In`
- `OvertimeIn`, `Overtime In`

**Check-Out statuses:**
- `CheckOut`, `Check Out`
- `BreakOut`, `Break Out`
- `OvertimeOut`, `Overtime Out`

> Records are grouped by **employee + date**. The earliest check-in and the latest check-out within the group are used to compute the daily row.

---

## 🖥️ How to Use

### 1. Open the Tool
From the homepage, click **"🚀 Open Attendance Tool"**.

### 2. Upload Your CSV
- Drag and drop your file onto the upload zone, **or**
- Click **"Choose CSV File"** to browse

### 3. Filter Records
- **Date Range** — pick a custom range or use quick buttons:
  - 📆 **Today**
  - 📅 **This Week** (Monday → Sunday)
  - 🗓️ **This Month**
  - ✕ **Clear**
- **Employee** — select a specific employee or leave as "All Employees"
- Click **✓ Apply** to refresh, or **↻ Reset** to restore defaults

### 4. Export Your Report
Use the buttons at the bottom to download the filtered data:
- **📊 Excel** — Styled workbook with titles, summaries, and conditional formatting
- **📄 PDF** — Clean paginated PDF table
- **📋 CSV** — Plain comma-separated values

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Markup** | HTML5 |
| **Styling** | Vanilla CSS (custom properties, flexbox, grid) |
| **Logic** | Vanilla JavaScript (ES6+) |
| **Fonts** | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |
| **Excel Export** | [ExcelJS](https://github.com/exceljs/exceljs) |
| **PDF Export** | [pdf-lib](https://github.com/Hopding/pdf-lib) |
| **File Saving** | [FileSaver.js](https://github.com/eligrey/FileSaver.js/) |

All libraries are loaded via CDN — no `npm install` needed.

---

## 🎨 Design System

The app uses CSS custom properties (defined in `:root` inside `style.css`) for consistent theming:

- **Colors** — `--primary`, `--success`, `--danger`, `--excel`, `--warning`, plus surface/border/text tokens
- **Radii** — `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-pill`
- **Shadows** — `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow`
- **Transitions** — `--t-fast` (0.15s), `--t-base` (0.2s)

To rebrand, simply update the variables in `:root`.

---

## 📱 Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| `> 1200px` | Full desktop layout |
| `≤ 1200px` | Date range row wraps; quick buttons stack below inputs |
| `≤ 768px` | Filters stack vertically; header column; export buttons full-width |
| `≤ 640px` | Homepage CTAs stack vertically |
| `≤ 480px` | Compact padding; smaller fonts; buttons fill width |

---

## ♿ Accessibility

- Focus-visible outlines on all interactive elements
- `prefers-reduced-motion` disables animations
- Semantic HTML (`<header>`, `<table>`, `<label>`)
- ARIA-friendly toast notifications
- Keyboard-navigable filters and buttons

---

## 🐛 Troubleshooting

**"Required columns not found"**
→ Verify your CSV header row contains `sName`, `Date`, `Time`, and `AttendanceStatus` (aliases accepted).

**Records aren't appearing after upload**
→ Check that your date format matches `YYYY-MM-DD` and that the date range filter isn't excluding your data. Try clicking **↻ Reset**.

**Export buttons do nothing**
→ Ensure an internet connection is available (libraries load from CDN). Check the browser console for errors.

**Empty file or no valid records**
→ Confirm the file has a header row and at least one data row with non-empty name, date, time, and status.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "feat: add your feature"
   ```
4. Push and open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Your Name**
- GitHub: [@your-username](https://github.com/your-username)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- [ExcelJS](https://github.com/exceljs/exceljs) for powerful Excel generation
- [pdf-lib](https://github.com/Hopding/pdf-lib) for client-side PDF creation
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) for cross-browser file downloads
- [Inter font](https://fonts.google.com/specimen/Inter) by Rasmus Andersson

---

## 📌 Version History

### v1.0.0
- Initial release
- Homepage with feature grid and CTA
- CSV upload with drag & drop
- Date range and employee filters
- Auto-pairing of check-in / check-out events
- Excel, PDF, and CSV exports
- Fully responsive design
- Separated CSS and JavaScript files

---

⭐ **If this project helped you, consider giving it a star!**
```