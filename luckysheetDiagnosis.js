(function ($) {
    $.fn.luckysheetDiagnosis = function (options) {
        const settings = $.extend({ onFixComplete: null }, options);

        if (!window._luckysheetDiagState) {
            window._luckysheetDiagState = { scanned: false, issues: {}, activeSheetName: null };
        }
        const state = window._luckysheetDiagState;

        const getExcelAddr = (r, c) => {
            let label = ""; let col = c;
            while (col >= 0) { label = String.fromCharCode((col % 26) + 65) + label; col = Math.floor(col / 26) - 1; }
            return label + (r + 1);
        };

        // --- REFINED ENTERPRISE UI STYLES ---
        $('#luckysheetDiagModal').remove();
        if ($('#luckysheetDiagStyles').length === 0) {
            $('head').append(`
            <style id="luckysheetDiagStyles">
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono&display=swap');
                
                #luckysheetDiagModal .modal-content { border-radius: 12px; font-family: 'Plus Jakarta Sans', sans-serif; border: none; overflow: hidden; background: #fff; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
                #luckysheetDiagModal .modal-header { background: #0f172a; color: #fff; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
                
                .diag-container { display: flex; height: 650px; background: #fff; }
                .diag-sidebar { width: 260px; background: #f8fafc; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
                .diag-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }

                /* Sidebar Navigation */
                .sidebar-label { padding: 1.25rem 1rem 0.5rem; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
                .sheet-list { flex: 1; overflow-y: auto; padding: 0 0.75rem; }
                .sheet-item { padding: 10px 12px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; transition: 0.2s; font-size: 13px; color: #475569; }
                .sheet-item:hover { background: #f1f5f9; }
                .sheet-item.active { background: #3b82f6; color: #fff; font-weight: 600; }
                .error-badge { font-size: 10px; background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
                .sheet-item.active .error-badge { background: #fff; color: #3b82f6; }

                /* TOP CONSOLE WINDOW - Always Visible */
                .diag-console-top { background: #1e293b; color: #38bdf8; font-family: 'JetBrains Mono'; font-size: 11px; padding: 12px 20px; height: 90px; overflow-y: auto; border-bottom: 1px solid #334155; }
                .log-entry { margin-bottom: 2px; border-left: 2px solid #334155; padding-left: 10px; }
                .log-success { color: #10b981; border-left-color: #10b981; }

                /* Action Bar */
                .diag-action-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                .btn-group-diag { display: flex; gap: 8px; }
                
                .btn-diag-cmd { border-radius: 6px; font-weight: 600; padding: 8px 16px; border: 1px solid transparent; font-size: 12px; transition: all 0.2s; cursor: pointer; }
                .btn-scan-main { background: #0f172a; color: #fff; }
                .btn-fix-main { background: #10b981; color: #fff; }
                .btn-export-main { background: #fff; color: #475569; border-color: #e2e8f0; }
                .btn-reset-main { background: #fff; color: #ef4444; border-color: #fecaca; }

                /* Data Grid - Fixed Dots Issue */
                .diag-grid-container { flex: 1; overflow-y: auto; }
                .diag-table { width: 100%; border-collapse: collapse; table-layout: auto; }
                .diag-table thead th { position: sticky; top: 0; background: #fff; z-index: 10; padding: 12px 16px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 2px solid #f1f5f9; box-shadow: 0 1px 0 #e2e8f0; }
                
                /* Cell Reference - Always Displayed, No Dots */
                .diag-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; white-space: normal; word-break: break-word; }
                .diag-table .cell-ref-col { width: 220px; font-weight: 600; color: #1e293b; }

                .addr-pill { font-family: 'JetBrains Mono'; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569; display: inline-block; }
                .sheet-tag { font-size: 10px; font-weight: 700; color: #64748b; background: #e2e8f0; padding: 2px 4px; border-radius: 3px; margin-right: 6px; text-transform: uppercase; }
                
                .diag-progress-line { position: absolute; top: 0; left: 0; height: 3px; background: #3b82f6; width: 0%; transition: width 0.3s; z-index: 100; }
            </style>
            `);
        }

        const modalHTML = `
        <div class="modal fade" id="luckysheetDiagModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h6 class="mb-0 fw-bold">Workbook Diagnostic & Repair Utility</h6>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>

                    <div class="diag-container">
                        <aside class="diag-sidebar">
                            <div class="sidebar-label">Sheets with issues</div>
                            <div class="sheet-list" id="diag-sheet-list">
                                <div class="text-center mt-5 text-muted small px-3">Scan to begin...</div>
                            </div>
                        </aside>

                        <main class="diag-main">
                            <div class="diag-progress-line" id="diag-prog"></div>
                            
                            <div class="diag-console-top" id="diag-console">
                                <div class="log-entry">> System Ready. Awaiting Deep Scan command.</div>
                            </div>

                            <div class="diag-action-bar">
                                <div id="diag-summary-text" class="small fw-600 text-slate-600">Health Status: Unknown</div>
                                <div class="btn-group-diag">
                                    <button id="btn-diag-reset" class="btn-diag-cmd btn-reset-main">Reset Engine</button>
                                    <button id="btn-diag-export" class="btn-diag-cmd btn-export-main" style="display:none;">Export Audit</button>
                                    <button id="btn-diag-scan" class="btn-diag-cmd btn-scan-main">Run Deep Scan</button>
                                    <button id="btn-diag-fix" class="btn-diag-cmd btn-fix-main" style="display:none;">Apply Repairs</button>
                                </div>
                            </div>

                            <div class="diag-grid-container" id="diag-grid-scroll">
                                <div id="diag-view-content">
                                    <div class="text-center py-5">
                                        <div class="text-muted small">Workbook data not yet analyzed.</div>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>`;

        $('body').append(modalHTML);
        const $modal = $('#luckysheetDiagModal');
        const modalInstance = new bootstrap.Modal($modal[0]);

        const addLog = (msg, success = false) => {
            const $con = $('#diag-console');
            $con.append(`<div class="log-entry ${success ? 'log-success' : ''}">> ${msg}</div>`);
            $con.scrollTop($con[0].scrollHeight);
        };

        const updateUI = () => {
            const $list = $('#diag-sheet-list').empty();
            const names = Object.keys(state.issues);
            let totalIssues = 0;

            if (state.scanned && names.length === 0) {
                $list.append('<div class="p-3 text-success small fw-bold">✓ No Issues Found</div>');
                $('#diag-view-content').html('<div class="text-center py-5 text-success"><h6>Workbook Consistent: All cell values match their formulas.</h6></div>');
                $('#btn-diag-fix, #btn-diag-export').hide();
                $('#diag-summary-text').text("Health Status: 100%");
                return;
            }

            names.forEach(name => {
                const count = state.issues[name].data.length;
                totalIssues += count;
                const activeCls = state.activeSheetName === name ? 'active' : '';
                $list.append(`<div class="sheet-item ${activeCls}" data-name="${name}"><span>${name}</span><span class="error-badge">${count}</span></div>`);
            });

            $('#diag-summary-text').text(`Discrepancies: ${totalIssues}`);
            if (totalIssues > 0) $('#btn-diag-fix, #btn-diag-export').show();

            if (state.activeSheetName && state.issues[state.activeSheetName]) {
                const data = state.issues[state.activeSheetName].data;
                let html = `
                    <table class="diag-table">
                        <thead>
                            <tr>
                                <th class="cell-ref-col">Cell Reference</th>
                                <th>Source Formula</th>
                                <th>Value Mismatch</th>
                            </tr>
                        </thead>
                        <tbody>`;
                
                data.forEach(item => {
                    html += `
                        <tr>
                            <td class="cell-ref-col">
                                <span class="sheet-tag">${state.activeSheetName}</span>
                                <span class="addr-pill">${item.addr.split(' | ')[0]}</span>
                            </td>
                            <td><code style="color:#be123c; font-size:12px; word-break: break-all;">${item.f}</code></td>
                            <td style="min-width: 180px;">
                                <span class="text-danger fw-600">${item.oldVal}</span> 
                                <span class="mx-2 text-slate-300">→</span> 
                                <span class="text-success fw-700">${item.newVal}</span>
                            </td>
                        </tr>`;
                });
                
                html += `</tbody></table>`;
                $('#diag-view-content').html(html);
            }
        };

        // --- SCAN & FIX CORE LOGIC ---
        const runScan = async () => {
            addLog("Initializing deep diagnostic sequence...");
            const isVolatile = (f) => /\b(TODAY|NOW|RAND|RANDBETWEEN|WEEKDAY|DAY|WEEKNUM)\s*\(/i.test(f || "");
            const sheets = luckysheet.getAllSheets() ?? [];
            const issues = {};

            for (let i = 0; i < sheets.length; i++) {
                const sheet = sheets[i];
                luckysheet.setSheetActive(i);
                addLog(`Checking sheet: [${sheet.name}]...`);
                $('#diag-prog').css('width', ((i + 1) / sheets.length * 100) + '%');

                const cells = (sheet.celldata ?? []).filter(c => c?.v?.f && !isVolatile(c.v.f));
                const sheetIssues = [];

                cells.forEach(cell => {
                    let calcV;
                    try {
                        const res = luckysheet.validateCellValue(sheet, cell.r, cell.c, cell.v.f, true, true);
                        calcV = Array.isArray(res) ? res[1] : res;
                    } catch (e) { calcV = "#ERR!"; }

                    const storeV = luckysheet.getCellValue(cell.r, cell.c, { sheetIndex: sheet.index });
                    if (String(storeV) !== String(calcV)) {
                        sheetIssues.push({ r: cell.r, c: cell.c, f: cell.v.f, addr: getExcelAddr(cell.r, cell.c), oldVal: storeV || "null", newVal: calcV });
                    }
                });

                if (sheetIssues.length > 0) issues[sheet.name] = { data: sheetIssues };
                await new Promise(r => setTimeout(r, 20));
            }

            state.issues = issues;
            state.scanned = true;
            if (Object.keys(issues).length > 0) state.activeSheetName = Object.keys(issues)[0];
            addLog("Deep Scan completed successfully.", true);
            updateUI();
        };

        const runFix = async () => {
            const sheets = luckysheet.getAllSheets() ?? [];
            let totalFixed = 0;
            addLog("Executing recursive synchronization pass...");
            
            for (let i = 0; i < sheets.length; i++) {
                const sheet = sheets[i];
                const sheetIssues = state.issues[sheet.name]?.data || [];
                if (sheetIssues.length > 0) {
                    luckysheet.setSheetActive(i);
                    for (const item of sheetIssues) {
                        luckysheet.updateCellValue(sheet, item.r, item.c, item.f, true, true);
                        totalFixed++;
                        if (totalFixed % 10 === 0) addLog(`Updated cell ${sheet.name}!${item.addr.split('|')[0]}`, true);
                    }
                }
                await new Promise(r => setTimeout(r, 20));
            }
            addLog(`Repair sequence complete. ${totalFixed} values synchronized.`, true);
            await runScan(); 
        };

        const exportCSV = () => {
            let csv = "Sheet,Cell,Formula,Old_Value,New_Value\n";
            Object.keys(state.issues).forEach(name => {
                state.issues[name].data.forEach(item => {
                    csv += `"${name}","${item.addr.split('|')[0]}","${item.f.replace(/"/g, '""')}","${item.oldVal}","${item.newVal}"\n`;
                });
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SheetHealth_Audit_${Date.now()}.csv`;
            a.click();
        };

        // --- BUTTON HANDLERS ---
        $('#btn-diag-scan').on('click', runScan);
        $('#btn-diag-fix').on('click', runFix);
        $('#btn-diag-export').on('click', exportCSV);
        
        $('#btn-diag-reset').on('click', () => {
            state.scanned = false;
            state.issues = {};
            state.activeSheetName = null;
            $('#diag-console').empty().append('<div class="log-entry">> Diagnostic engine reset. Awaiting instructions.</div>');
            $('#diag-prog').css('width', '0%');
            updateUI();
        });

        $modal.on('click', '.sheet-item', function() {
            state.activeSheetName = $(this).data('name');
            updateUI();
        });

        modalInstance.show();
        updateUI();
        return this;
    };
}(jQuery));
