(function ($) {
    $.fn.luckysheetDiagnosis = function (options) {
        const settings = $.extend({ onFixComplete: null }, options);

        // State Initialization
        if (!window._luckysheetDiagState) {
            window._luckysheetDiagState = { scanned: false, issues: {}, activeSheetName: null };
        }
        const state = window._luckysheetDiagState;

        const getExcelAddr = (r, c) => {
            let label = ""; let col = c;
            while (col >= 0) { label = String.fromCharCode((col % 26) + 65) + label; col = Math.floor(col / 26) - 1; }
            return label + (r + 1);
        };

        // --- PREMIUM ENTERPRISE STYLES ---
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

                /* FIXED TOP CONSOLE */
                .diag-console-top { background: #1e293b; color: #38bdf8; font-family: 'JetBrains Mono'; font-size: 11px; padding: 12px 20px; height: 100px; overflow-y: auto; border-bottom: 2px solid #334155; flex-shrink: 0; }
                .log-entry { margin-bottom: 2px; border-left: 2px solid #334155; padding-left: 10px; }
                .log-success { color: #10b981; border-left-color: #10b981; }

                /* Action Bar */
                .diag-action-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; z-index: 5; }
                .btn-group-diag { display: flex; gap: 8px; }
                
                .btn-diag-cmd { border-radius: 6px; font-weight: 700; padding: 8px 16px; border: 1px solid transparent; font-size: 12px; transition: all 0.2s; cursor: pointer; display: flex; align-items: center; }
                .btn-scan-main { background: #0f172a; color: #fff; }
                .btn-scan-main:hover { background: #334155; }
                .btn-fix-main { background: #10b981; color: #fff; }
                .btn-export-main { background: #fff; color: #475569; border-color: #e2e8f0; }
                .btn-reset-main { background: #fff; color: #ef4444; border-color: #fecaca; }
                .btn-reset-main:hover { background: #fef2f2; }

                /* Grid Styling (Fixing Dots/Truncation) */
                .diag-grid-container { flex: 1; overflow-y: auto; background: #fff; }
                .diag-table { width: 100%; border-collapse: collapse; table-layout: auto; }
                .diag-table thead th { position: sticky; top: 0; background: #f8fafc; z-index: 10; padding: 12px 16px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; }
                .diag-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: top; white-space: normal; word-wrap: break-word; }
                
                /* Column Widths */
                .col-ref { width: 200px; font-weight: 600; }
                .col-formula { min-width: 250px; }
                .col-diff { width: 220px; }

                .addr-pill { font-family: 'JetBrains Mono'; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569; display: inline-block; }
                .sheet-tag { font-size: 9px; font-weight: 800; color: #64748b; background: #e2e8f0; padding: 2px 5px; border-radius: 3px; margin-right: 6px; text-transform: uppercase; vertical-align: middle; }
                
                .diag-progress-line { position: absolute; top: 100px; left: 0; height: 3px; background: #3b82f6; width: 0%; transition: width 0.3s; z-index: 100; }

                /* Sidebar Items */
                .sheet-list { padding: 10px; }
                .sheet-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 13px; transition: 0.2s; }
                .sheet-item.active { background: #0f172a; color: #fff; }
                .error-badge { font-size: 10px; background: #fee2e2; color: #ef4444; padding: 2px 7px; border-radius: 10px; font-weight: 800; }
                .sheet-item.active .error-badge { background: #ef4444; color: #fff; }
            </style>
            `);
        }

        const modalHTML = `
        <div class="modal fade" id="luckysheetDiagModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h6 class="mb-0 fw-bold">Diagnostic Command Center</h6>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>

                    <div class="diag-container">
                        <aside class="diag-sidebar">
                            <div class="sidebar-label" style="padding: 1.25rem 1rem 0.5rem; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Affected Sheets</div>
                            <div class="sheet-list" id="diag-sheet-list"></div>
                        </aside>

                        <main class="diag-main">
                            <div class="diag-console-top" id="diag-console">
                                <div class="log-entry">> Ready for system scan.</div>
                            </div>
                            
                            <div class="diag-progress-line" id="diag-prog"></div>

                            <div class="diag-action-bar">
                                <div id="diag-summary-text" class="small fw-600 text-muted">Awaiting Scan...</div>
                                <div class="btn-group-diag">
                                    <button id="btn-diag-reset" class="btn-diag-cmd btn-reset-main">Reset Engine</button>
                                    <button id="btn-diag-export" class="btn-diag-cmd btn-export-main" style="display:none;">Export CSV</button>
                                    <button id="btn-diag-scan" class="btn-diag-cmd btn-scan-main">Deep Scan</button>
                                    <button id="btn-diag-fix" class="btn-diag-cmd btn-fix-main" style="display:none;">Repair Workbook</button>
                                </div>
                            </div>

                            <div class="diag-grid-container" id="diag-grid-scroll">
                                <div id="diag-view-content">
                                    <div class="text-center py-5 text-muted small">No diagnostic data found. Run Deep Scan to populate results.</div>
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

        const render = () => {
            const $list = $('#diag-sheet-list').empty();
            const names = Object.keys(state.issues);
            let totalIssues = 0;

            if (!state.scanned) {
                $('#diag-view-content').html('<div class="text-center py-5 text-muted small">Workbook not analyzed.</div>');
                $('#btn-diag-fix, #btn-diag-export').hide();
                $('#diag-summary-text').text("Awaiting Scan...");
                return;
            }

            if (names.length === 0) {
                $list.append('<div class="p-3 text-success small fw-bold">✓ Healthy</div>');
                $('#diag-view-content').html('<div class="text-center py-5 text-success"><h6>Integrity Verified: 0 Discrepancies Found.</h6></div>');
                $('#btn-diag-fix, #btn-diag-export').hide();
                $('#diag-summary-text').text("Status: Optimal");
                return;
            }

            names.forEach(name => {
                const count = state.issues[name].data.length;
                totalIssues += count;
                const activeCls = state.activeSheetName === name ? 'active' : '';
                $list.append(`<div class="sheet-item ${activeCls}" data-name="${name}"><span>${name}</span><span class="error-badge">${count}</span></div>`);
            });

            $('#diag-summary-text').text(`Total Issues: ${totalIssues}`);
            $('#btn-diag-fix, #btn-diag-export').show();

            if (state.activeSheetName && state.issues[state.activeSheetName]) {
                const data = state.issues[state.activeSheetName].data;
                let html = `
                    <table class="diag-table">
                        <thead>
                            <tr>
                                <th class="col-ref">Reference</th>
                                <th class="col-formula">Formula</th>
                                <th class="col-diff">Mismatch</th>
                            </tr>
                        </thead>
                        <tbody>`;
                
                data.forEach(item => {
                    html += `
                        <tr>
                            <td class="col-ref">
                                <span class="sheet-tag">${state.activeSheetName}</span>
                                <span class="addr-pill">${item.addr.split(' | ')[0]}</span>
                            </td>
                            <td class="col-formula"><code style="color:#be123c; word-break: break-all;">${item.f}</code></td>
                            <td class="col-diff">
                                <span class="text-danger fw-600">${item.oldVal}</span> 
                                <span class="mx-1 text-muted">→</span> 
                                <span class="text-success fw-700">${item.newVal}</span>
                            </td>
                        </tr>`;
                });
                html += `</tbody></table>`;
                $('#diag-view-content').html(html);
            }
        };

        // --- HANDLERS ---
        $('#btn-diag-scan').on('click', async function() {
            addLog("Scanning workbook sheets...");
            const sheets = luckysheet.getAllSheets() ?? [];
            const issues = {};
            
            for (let i = 0; i < sheets.length; i++) {
                const sheet = sheets[i];
                luckysheet.setSheetActive(i);
                addLog(`Checking [${sheet.name}]...`);
                $('#diag-prog').css('width', ((i + 1) / sheets.length * 100) + '%');

                const cells = (sheet.celldata ?? []).filter(c => c?.v?.f);
                const sheetIssues = [];

                cells.forEach(cell => {
                    const res = luckysheet.validateCellValue(sheet, cell.r, cell.c, cell.v.f, true, true);
                    const calcV = Array.isArray(res) ? res[1] : res;
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
            state.activeSheetName = Object.keys(issues)[0] || null;
            addLog("Scan Complete.", true);
            render();
        });

        $('#btn-diag-reset').on('click', () => {
            // Hard reset of the state
            state.scanned = false;
            state.issues = {};
            state.activeSheetName = null;
            
            // UI Cleanup
            $('#diag-console').html('<div class="log-entry">> Diagnostic engine reset. Awaiting instructions.</div>');
            $('#diag-prog').css('width', '0%');
            
            addLog("Memory cleared. Grid purged.");
            render(); // Refresh the grid to show empty state
        });

        $('#btn-diag-export').on('click', () => {
            let csv = "Sheet,Cell,Formula,Old,New\n";
            Object.keys(state.issues).forEach(name => {
                state.issues[name].data.forEach(item => {
                    csv += `"${name}","${item.addr}","${item.f.replace(/"/g, '""')}","${item.oldVal}","${item.newVal}"\n`;
                });
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Audit_Report.csv`;
            a.click();
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
