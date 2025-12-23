I have updated the **Fixing** logic to include real-time progress updates and detailed logging. Since I am not changing the core calculation logic, I have added calls to `addLog` and `updateProgress` within the loop so you can monitor the repair process as it happens.

The **Console** will now report exactly which pass is being executed and which cells are being updated, while the **Progress Bar** reflects the completion percentage.

```javascript
(function ($) {
    $.fn.luckysheetDiagnosis = function (options) {
        const settings = $.extend({ onFixComplete: null }, options);

        if (!window._luckysheetDiagState) {
            window._luckysheetDiagState = {
                discrepancy: { scanned: false, issues: {} },
                activeSheetName: null
            };
        }
        const state = window._luckysheetDiagState;

        const getExcelAddr = (r, c) => {
            let label = ""; let col = c;
            while (col >= 0) { label = String.fromCharCode((col % 26) + 65) + label; col = Math.floor(col / 26) - 1; }
            return label + (r + 1);
        };

        const updateProgress = (pct, msg) => {
            $('#diag-prog').css('width', pct + '%');
            if(msg) addLog(msg);
        };

        const addLog = (msg) => {
            const $con = $('#diag-console');
            $con.append(`<div class="log-entry">> ${msg}</div>`);
            $con.scrollTop($con[0].scrollHeight);
        };

        // --- UI STYLES ---
        $('#luckysheetDiagModal').remove();
        if ($('#luckysheetDiagStyles').length === 0) {
            $('head').append(`
            <style id="luckysheetDiagStyles">
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono&display=swap');
                #luckysheetDiagModal .modal-content { border-radius: 12px; font-family: 'Plus Jakarta Sans', sans-serif; border: none; overflow: hidden; background: #fff; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
                #luckysheetDiagModal .modal-header { background: #0f172a; color: #fff; padding: 1rem 1.5rem; }
                .diag-container { display: flex; height: 650px; }
                .diag-sidebar { width: 260px; background: #f8fafc; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
                .diag-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }

                /* PINNED TOP CONSOLE */
                .diag-console-top { background: #1e293b; color: #38bdf8; font-family: 'JetBrains Mono'; font-size: 11px; padding: 12px 20px; height: 100px; overflow-y: auto; border-bottom: 2px solid #334155; flex-shrink: 0; }
                .log-entry { margin-bottom: 2px; border-left: 2px solid #334155; padding-left: 10px; }
                
                .diag-action-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; z-index: 5; }
                .btn-diag-cmd { border-radius: 6px; font-weight: 700; padding: 8px 16px; border: 1px solid transparent; font-size: 12px; cursor: pointer; }
                .btn-scan-main { background: #0f172a; color: #fff; }
                .btn-fix-main { background: #10b981; color: #fff; }
                .btn-reset-main { background: #fff; color: #ef4444; border-color: #fecaca; }

                .diag-grid-container { flex: 1; overflow-y: auto; background: #fff; }
                .diag-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .diag-table thead th { position: sticky; top: 0; background: #f8fafc; z-index: 10; padding: 12px 16px; font-size: 11px; text-align: left; border-bottom: 2px solid #e2e8f0; }
                .diag-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: top; white-space: normal; word-wrap: break-word; }
                
                .col-ref { width: 220px; font-weight: 600; }
                .addr-pill { font-family: 'JetBrains Mono'; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569; }
                
                .sheet-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; margin: 4px 10px; font-size: 13px; transition: 0.2s; }
                .sheet-item:hover { background: #f1f5f9; }
                .sheet-item.active { background: #0f172a !important; color: #fff !important; }
                .error-badge { font-size: 10px; background: #fee2e2; color: #ef4444; padding: 2px 7px; border-radius: 10px; font-weight: 800; }
                .diag-progress-line { position: absolute; top: 100px; left: 0; height: 4px; background: #10b981; width: 0%; transition: width 0.2s; z-index: 100; }
            </style>
            `);
        }

        const modalHTML = `
        <div class="modal fade" id="luckysheetDiagModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header"><h6 class="mb-0 fw-bold">Diagnostic Command Center</h6><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div>
                    <div class="diag-container">
                        <aside class="diag-sidebar">
                            <div style="padding: 1.25rem 1rem 0.5rem; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Affected Sheets</div>
                            <div id="diag-sheet-list"></div>
                        </aside>
                        <main class="diag-main">
                            <div class="diag-console-top" id="diag-console"><div class="log-entry">> Initialized.</div></div>
                            <div class="diag-progress-line" id="diag-prog"></div>
                            <div class="diag-action-bar">
                                <div id="diag-summary-text" class="small fw-600 text-muted">Awaiting Scan...</div>
                                <div class="btn-group">
                                    <button id="btn-diag-reset" class="btn-diag-cmd btn-reset-main">Reset Engine</button>
                                    <button id="btn-diag-scan" class="btn-diag-cmd btn-scan-main">Deep Scan</button>
                                    <button id="btn-diag-fix" class="btn-diag-cmd btn-fix-main" style="display:none;">Repair Workbook</button>
                                </div>
                            </div>
                            <div class="diag-grid-container"><div id="diag-view-content"></div></div>
                        </main>
                    </div>
                </div>
            </div>
        </div>`;

        $('body').append(modalHTML);
        const $modal = $('#luckysheetDiagModal');
        const modalInstance = new bootstrap.Modal($modal[0]);

        const render = () => {
            const $list = $('#diag-sheet-list').empty();
            const issuesObj = state.discrepancy.issues;
            const names = Object.keys(issuesObj);
            
            if (!state.discrepancy.scanned) {
                $('#diag-view-content').html('<div class="text-center py-5 text-muted small">No data analyzed.</div>');
                $('#btn-diag-fix').hide();
                return;
            }

            if (names.length === 0) {
                $('#diag-view-content').html('<div class="text-center py-5 text-success"><h6>Workbook Consistent.</h6></div>');
                $('#btn-diag-fix').hide();
                return;
            }

            if (!state.activeSheetName) state.activeSheetName = names[0];

            names.forEach(name => {
                const count = issuesObj[name].data.length;
                const activeCls = state.activeSheetName === name ? 'active' : '';
                $list.append(`<div class="sheet-item ${activeCls}" data-name="${name}"><span>${name}</span><span class="error-badge">${count}</span></div>`);
            });

            $('#btn-diag-fix').show();
            const data = issuesObj[state.activeSheetName]?.data || [];
            let html = `<table class="diag-table"><thead><tr><th class="col-ref">Reference</th><th>Formula</th><th>Mismatch</th></tr></thead><tbody>`;
            data.forEach(item => {
                html += `<tr>
                    <td class="col-ref"><span class="addr-pill">${item.addr}</span></td>
                    <td><code style="color:#be123c;">${item.f}</code></td>
                    <td><span class="text-danger">${item.oldVal}</span> → <span class="text-success fw-700">${item.newVal}</span></td>
                </tr>`;
            });
            $('#diag-view-content').html(html + `</tbody></table>`);
        };

        // --- CORE SCAN LOGIC (INTEGRATED) ---
        const scanDiscrepancies = async () => {
            updateProgress(5, "Initializing Value Check…");
            const isVolatile = (f) => /\b(TODAY|NOW|RAND|RANDBETWEEN|WEEKDAY|DAY|WEEKNUM)\s*\(/i.test(f || "");
            const isDate = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f || "");
            const sheets = luckysheet.getAllSheets() ?? [];
            if (sheets.length === 0) {
                state.discrepancy = { issues: {}, scanned: true };
                updateProgress(100, "No sheets found");
                return 0;
            }
            const activeSheetPos = sheets.findIndex(s => Number(s.status) === 1);
            const restorePos = activeSheetPos >= 0 ? activeSheetPos : 0;
            const issues = {};
            let sheetsWithIssues = 0;
            const normalize = (v) => {
                if (v == null) return "—";
                if (v instanceof Date) return v.getTime();
                if (typeof v === "number") return Number.isFinite(v) ? v : String(v);
                return String(v);
            };
            const valuesEqual = (a, b) => {
                if (a == null && b == null) return true;
                const aNum = (a instanceof Date) ? a.getTime() : Number(a);
                const bNum = (b instanceof Date) ? b.getTime() : Number(b);
                const aNumOK = !Number.isNaN(aNum);
                const bNumOK = !Number.isNaN(bNum);
                if (aNumOK && bNumOK) {
                    const EPS = 1e-9;
                    return Math.abs(aNum - bNum) < EPS;
                }
                return String(a) === String(b);
            };

            try {
                for (let sheetIdx = 0; sheetIdx < sheets.length; sheetIdx++) {
                    const sheet = sheets[sheetIdx];
                    luckysheet.setSheetActive(sheetIdx);
                    const pct = Math.floor(10 + ((sheetIdx + 1) / sheets.length) * 80);
                    updateProgress(pct, `Scanning ${sheet.name}…`);
                    const formulaCells = (sheet.celldata ?? [])
                        .filter(c => c?.v?.f && typeof c.v.f === "string" && c.v.f.length > 0
                            && !isVolatile(c.v.f) && !isDate(c?.v?.m) && c.v.f.indexOf("Next Week") == -1
                        );
                    const sheetIssues = [];
                    for (const cell of formulaCells) {
                        let calcV;
                        try {
                            const res = luckysheet.validateCellValue(sheet, cell.r, cell.c, cell.v.f, true, true);
                            calcV = Array.isArray(res) ? res[1] : res;
                        } catch (e) { calcV = "#EVAL!"; }
                        const storeV = luckysheet.getCellValue(cell.r, cell.c, { sheetIndex: sheet.index });
                        if (!valuesEqual(storeV, calcV)) {
                            sheetIssues.push({
                                r: cell.r, c: cell.c, f: cell.v.f,
                                addr: getExcelAddr(cell.r, cell.c) + " | Row=>" + (cell.r + 1),
                                oldVal: normalize(storeV), newVal: normalize(calcV)
                            });
                        }
                    }
                    if (sheetIssues.length > 0) {
                        issues[sheet.name] = { id: sheet.index, data: sheetIssues };
                        sheetsWithIssues++;
                    }
                    await new Promise(r => setTimeout(r, 50));
                }
                state.discrepancy = { issues, scanned: true };
                updateProgress(100, "Scan Complete");
                luckysheet.setSheetActive(restorePos);
                render();
                return sheetsWithIssues;
            } catch (err) {
                updateProgress(100, "Scan aborted");
                luckysheet.setSheetActive(restorePos);
                throw err;
            }
        };

        // --- CORE FIX LOGIC (INTEGRATED WITH LOGS) ---
        const fixDiscrepancies = async () => {
            const sheets = luckysheet.getAllSheets() ?? [];
            if (sheets.length === 0) return 0;
            const activePos = sheets.findIndex(s => Number(s.status) === 1);
            const restorePos = activePos >= 0 ? activePos : 0;
            const isVolatile = (f) => /\b(TODAY|NOW|RAND|RANDBETWEEN|WEEKDAY|DAY|WEEKNUM)\s*\(/i.test(f || "");
            const isDate = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f || "");
            const valuesEqual = (a, b) => {
                if (a == null && b == null) return true;
                const aDate = (a instanceof Date) ? a.getTime() : Number(a);
                const bDate = (b instanceof Date) ? b.getTime() : Number(b);
                const aNumOK = !Number.isNaN(aDate);
                const bNumOK = !Number.isNaN(bDate);
                if (aNumOK && bNumOK) { const EPS = 1e-9; return Math.abs(aDate - bDate) < EPS; }
                return String(a) === String(b);
            };
            const maxPasses = 5; let totalFixed = 0;
            
            try {
                for (let pass = 1; pass <= maxPasses; pass++) {
                    let changesThisPass = 0;
                    updateProgress((pass / maxPasses) * 100, `Repairing Pass ${pass} of ${maxPasses}...`);
                    
                    for (let sheetIdx = 0; sheetIdx < sheets.length; sheetIdx++) {
                        const sheet = sheets[sheetIdx];
                        luckysheet.setSheetActive(sheetIdx);
                        
                        const formulaCells = (sheet.celldata ?? [])
                            .filter(cell => {
                                const f = cell?.v?.f;
                                return f && typeof f === "string" && f.length > 0 && !isVolatile(f) && !isDate(cell?.v?.m) && f.indexOf("Next Week") == -1;
                            })
                            .map(cell => ({ r: cell.r, c: cell.c, f: cell.v.f, oldValue: luckysheet.getCellValue(cell.r, cell.c, { sheetIndex: sheet.index }) }));
                        
                        for (const m of formulaCells) {
                            let newValue;
                            try {
                                const res = luckysheet.validateCellValue(sheet, m.r, m.c, m.f, true, true);
                                newValue = Array.isArray(res) ? res[1] : res;
                            } catch (e) { newValue = "#EVAL!"; }
                            
                            if (!valuesEqual(m.oldValue, newValue)) {
                                changesThisPass++;
                                addLog(`Fixing ${sheet.name}!${getExcelAddr(m.r, m.c)}: ${m.oldValue} → ${newValue}`);
                                luckysheet.updateCellValue(sheet, m.r, m.c, m.f, true, true);
                            }
                        }
                        await new Promise(r => setTimeout(r, 16));
                    }
                    totalFixed += changesThisPass;
                    if (changesThisPass === 0) {
                        addLog(`Converged early at Pass ${pass}.`);
                        break;
                    }
                }
            } finally {
                luckysheet.setSheetActive(restorePos);
                updateProgress(100, `Repair finished. Synchronized ${totalFixed} values.`);
                await scanDiscrepancies();
            }
            return totalFixed;
        };

        // --- HANDLERS ---
        $('#btn-diag-scan').on('click', scanDiscrepancies);
        $('#btn-diag-fix').on('click', fixDiscrepancies);
        $('#btn-diag-reset').on('click', () => {
            state.discrepancy = { scanned: false, issues: {} };
            state.activeSheetName = null;
            $('#diag-console').html('<div class="log-entry">> Engine reset.</div>');
            $('#diag-prog').css('width', '0%');
            render();
        });
        $modal.on('click', '.sheet-item', function() {
            state.activeSheetName = $(this).data('name');
            render();
        });

        modalInstance.show();
        render();
        return this;
    };
}(jQuery));

```
