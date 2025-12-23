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

        // --- ENTERPRISE UI STYLES ---
        $('#luckysheetDiagModal').remove();
        if ($('#luckysheetDiagStyles').length === 0) {
            $('head').append(`
            <style id="luckysheetDiagStyles">
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono&display=swap');
                
                #luckysheetDiagModal .modal-content { border-radius: 16px; font-family: 'Plus Jakarta Sans', sans-serif; border: none; overflow: hidden; background: #fff; }
                #luckysheetDiagModal .modal-header { background: #0f172a; color: #fff; padding: 1.25rem 2rem; }
                
                /* Layout Split */
                .diag-container { display: flex; height: 550px; background: #f8fafc; }
                .diag-sidebar { width: 280px; background: #fff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
                .diag-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

                /* Sidebar Sheets */
                .sidebar-header { padding: 1.5rem; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; }
                .sheet-list { flex: 1; overflow-y: auto; padding: 10px; }
                .sheet-item { padding: 12px 16px; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; transition: 0.2s; }
                .sheet-item:hover { background: #f1f5f9; }
                .sheet-item.active { background: #eff6ff; color: #2563eb; font-weight: 600; }
                .error-count { font-size: 10px; background: #fee2e2; color: #ef4444; padding: 2px 8px; border-radius: 12px; font-weight: 700; }

                /* Dashboard & Console */
                .diag-stats-strip { display: flex; gap: 20px; padding: 15px 30px; background: #fff; border-bottom: 1px solid #e2e8f0; }
                .stat-box { flex: 1; }
                .stat-box label { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin: 0; }
                .stat-box .val { font-size: 16px; font-weight: 700; color: #1e293b; }

                .diag-console { background: #0f172a; color: #38bdf8; font-family: 'JetBrains Mono'; font-size: 11px; padding: 12px; height: 100px; overflow-y: auto; border-top: 1px solid #1e293b; }
                .log-ln { margin-bottom: 2px; opacity: 0.8; }
                .log-ln.success { color: #10b981; }

                /* Main Grid */
                .diag-grid-view { flex: 1; overflow-y: auto; padding: 20px 30px; }
                .diag-table { width: 100%; border-collapse: separate; border-spacing: 0; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; }
                .diag-table th { position: sticky; top: 0; background: #f8fafc; padding: 12px 15px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; }
                .diag-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: middle; }

                .addr-pill { font-family: 'JetBrains Mono'; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 600; color: #475569; }
                .change-ui { display: flex; align-items: center; gap: 8px; }
                
                /* Progress Bar */
                .diag-progress-bar { position: absolute; bottom: 0; left: 0; height: 4px; background: #3b82f6; width: 0%; transition: width 0.3s; z-index: 100; }

                .btn-diag { border-radius: 8px; font-weight: 600; padding: 8px 20px; border: none; transition: 0.2s; }
                .btn-prime { background: #2563eb; color: #fff; }
                .btn-prime:hover { background: #1d4ed8; }
                .btn-fix { background: #10b981; color: #fff; display: none; }
            </style>
            `);
        }

        const modalHTML = `
        <div class="modal fade" id="luckysheetDiagModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content shadow-2xl">
                    <div class="modal-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0 fw-bold">Health Command Center</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>

                    <div class="diag-container">
                        <div class="diag-sidebar">
                            <div class="sidebar-header">Worksheets</div>
                            <div class="sheet-list" id="diag-sheet-list">
                                <div class="text-center mt-5 text-muted small">No scan results</div>
                            </div>
                        </div>

                        <div class="diag-main">
                            <div class="diag-stats-strip">
                                <div class="stat-box"><label>System Health</label><div class="val" id="stat-health">Ready</div></div>
                                <div class="stat-box"><label>Total Issues</label><div class="val" id="stat-issues">0</div></div>
                                <div class="stat-box text-end">
                                    <button id="btn-diag-scan" class="btn-diag btn-prime">Deep Scan</button>
                                    <button id="btn-diag-fix" class="btn-diag btn-fix">Repair Workbook</button>
                                </div>
                            </div>

                            <div class="diag-grid-view" id="diag-grid-view">
                                <div class="text-center py-5">
                                    <h6 class="text-muted">Initiate scan to analyze formula integrity.</h6>
                                </div>
                            </div>

                            <div class="diag-console" id="diag-console">
                                <div class="log-ln">Awaiting diagnostic sequence...</div>
                            </div>
                            <div class="diag-progress-bar" id="diag-prog"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        $('body').append(modalHTML);
        const $modal = $('#luckysheetDiagModal');
        const modalInstance = new bootstrap.Modal($modal[0]);

        const addLog = (msg, success = false) => {
            const $con = $('#diag-console');
            $con.append(`<div class="log-ln ${success ? 'success' : ''}">> ${msg}</div>`);
            $con.scrollTop($con[0].scrollHeight);
        };

        const updateUI = () => {
            const $list = $('#diag-sheet-list').empty();
            const names = Object.keys(state.issues);
            let total = 0;

            if (names.length === 0 && state.scanned) {
                $list.append('<div class="p-3 text-success small fw-bold">✓ All Sheets Healthy</div>');
                $('#diag-grid-view').html('<div class="text-center py-5 text-success"><h5>Workbook Health 100%</h5></div>');
                return;
            }

            names.forEach(name => {
                const count = state.issues[name].data.length;
                total += count;
                const activeCls = state.activeSheetName === name ? 'active' : '';
                $list.append(`<div class="sheet-item ${activeCls}" data-name="${name}"><span>${name}</span><span class="error-count">${count}</span></div>`);
            });

            $('#stat-issues').text(total);
            $('#stat-health').text(total > 0 ? 'Action Required' : 'Optimal').css('color', total > 0 ? '#ef4444' : '#10b981');
            
            if (total > 0) $('#btn-diag-fix').fadeIn();

            // Render Active Sheet Table
            if (state.activeSheetName) {
                const data = state.issues[state.activeSheetName].data;
                let html = `<table class="diag-table"><thead><tr><th>Cell</th><th>Formula</th><th>Mismatch Details</th></tr></thead><tbody>`;
                data.forEach(item => {
                    html += `<tr>
                        <td><span class="addr-pill">${item.addr.split(' | ')[0]}</span></td>
                        <td><code style="color:#e11d48">${item.f}</code></td>
                        <td><div class="change-ui"><span class="text-danger">${item.oldVal}</span> <small class="text-muted">→</small> <span class="text-success fw-bold">${item.newVal}</span></div></td>
                    </tr>`;
                });
                html += `</tbody></table>`;
                $('#diag-grid-view').html(html);
            }
        };

        // --- SCAN LOGIC (Maintained) ---
        const runScan = async () => {
            addLog("Initializing deep scan...");
            const isVolatile = (f) => /\b(TODAY|NOW|RAND|RANDBETWEEN|WEEKDAY|DAY|WEEKNUM)\s*\(/i.test(f || "");
            const sheets = luckysheet.getAllSheets() ?? [];
            const issues = {};

            for (let i = 0; i < sheets.length; i++) {
                const sheet = sheets[i];
                luckysheet.setSheetActive(i);
                addLog(`Analyzing ${sheet.name}...`);
                $('#diag-prog').css('width', ((i + 1) / sheets.length * 100) + '%');

                const formulaCells = (sheet.celldata ?? []).filter(c => c?.v?.f && !isVolatile(c.v.f));
                const sheetIssues = [];

                formulaCells.forEach(cell => {
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
                await new Promise(r => setTimeout(r, 30));
            }

            state.issues = issues;
            state.scanned = true;
            if (Object.keys(issues).length > 0) state.activeSheetName = Object.keys(issues)[0];
            addLog("Scan complete. Issues mapped.", true);
            updateUI();
        };

        // --- FIX LOGIC (Maintained) ---
        const runFix = async () => {
            const sheets = luckysheet.getAllSheets() ?? [];
            let fixedCount = 0;
            addLog("Starting recursive repair pass...");
            
            for (let i = 0; i < sheets.length; i++) {
                const sheet = sheets[i];
                const sheetIssues = state.issues[sheet.name]?.data || [];
                if (sheetIssues.length > 0) {
                    luckysheet.setSheetActive(i);
                    for (const item of sheetIssues) {
                        luckysheet.updateCellValue(sheet, item.r, item.c, item.f, true, true);
                        fixedCount++;
                        if (fixedCount % 5 === 0) addLog(`Fixed ${sheet.name}!${item.addr}...`, true);
                    }
                }
                await new Promise(r => setTimeout(r, 20));
            }
            addLog(`Repair complete. ${fixedCount} cells synchronized.`, true);
            await runScan(); // Refresh data
        };

        // --- HANDLERS ---
        $('#btn-diag-scan').on('click', runScan);
        $('#btn-diag-fix').on('click', runFix);
        
        $modal.on('click', '.sheet-item', function() {
            state.activeSheetName = $(this).data('name');
            updateUI();
        });

        modalInstance.show();
        updateUI();
        return this;
    };
}(jQuery));
