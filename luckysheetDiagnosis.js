(function ($) {
    $.fn.luckysheetDiagnosis = function (options) {
        const settings = $.extend({
            onFixComplete: null
        }, options);

        if (!window._luckysheetDiagState) {
            window._luckysheetDiagState = { scanned: false, issues: {}, logs: [] };
        }
        const state = window._luckysheetDiagState;

        const getExcelAddr = (r, c) => {
            let label = "";
            let col = c;
            while (col >= 0) {
                label = String.fromCharCode((col % 26) + 65) + label;
                col = Math.floor(col / 26) - 1;
            }
            return label + (r + 1);
        };

        // --- STYLES: Enterprise Dark Mode & Modern UI ---
        $('#luckysheetDiagModal').remove();
        if ($('#luckysheetDiagStyles').length === 0) {
            $('head').append(`
            <style id="luckysheetDiagStyles">
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
                
                #luckysheetDiagModal .modal-content { border-radius: 12px; font-family: 'Inter', sans-serif; border: 1px solid #e2e8f0; background: #ffffff; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); }
                #luckysheetDiagModal .modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid #f1f5f9; background: #fff; }
                
                /* KPI Dashboard */
                .diag-kpi-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding: 1.5rem 2rem; background: #f8fafc; }
                .kpi-card { padding: 1.25rem; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; }
                .kpi-label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
                .kpi-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
                .kpi-value.danger { color: #ef4444; }

                /* Progress & Live Console */
                .diag-work-area { padding: 0 2rem 1.5rem; background: #f8fafc; }
                .diag-progress-wrapper { height: 6px; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 12px; display: none; }
                .diag-progress-fill { height: 100%; background: #3b82f6; width: 0%; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                
                .diag-console { 
                    background: #0f172a; color: #94a3b8; font-family: 'JetBrains Mono', monospace; 
                    font-size: 12px; padding: 1rem; border-radius: 8px; height: 160px; 
                    overflow-y: auto; border: 1px solid #1e293b; line-height: 1.6;
                }
                .log-line { border-left: 2px solid #334155; padding-left: 10px; margin-bottom: 4px; }
                .log-line.info { border-color: #3b82f6; color: #38bdf8; }
                .log-line.success { border-color: #10b981; color: #34d399; }
                .log-line.warn { border-color: #f59e0b; color: #fbbf24; }

                /* Issue Table */
                .diag-body { padding: 1.5rem 2rem; max-height: 350px; overflow-y: auto; }
                .issue-group { margin-bottom: 1.5rem; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                .issue-header { background: #fff; padding: 0.75rem 1.25rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
                
                .diag-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .diag-table th { background: #f8fafc; color: #64748b; font-weight: 600; padding: 10px 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                .diag-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; background: #fff; }

                .addr-tag { font-family: 'JetBrains Mono'; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
                .val-old { color: #ef4444; font-weight: 500; }
                .val-new { color: #10b981; font-weight: 700; }

                /* Buttons */
                .btn-diag { padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; transition: all 0.2s; border: none; }
                .btn-primary-diag { background: #0f172a; color: #fff; }
                .btn-primary-diag:hover { background: #1e293b; transform: translateY(-1px); }
                .btn-success-diag { background: #10b981; color: #fff; }
                .btn-export-diag { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
            </style>
            `);
        }

        const modalHTML = `
        <div class="modal fade" id="luckysheetDiagModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <div>
                            <h5 class="fw-bold mb-0" style="letter-spacing:-0.02em; color:#0f172a;">Integrity Analysis Tool</h5>
                            <p class="text-muted small mb-0">System-wide formula consistency and value synchronization</p>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>

                    <div class="diag-kpi-container">
                        <div class="kpi-card">
                            <div class="kpi-label">System State</div>
                            <div class="kpi-value" id="kpi-state">Ready</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-label">Discrepancies</div>
                            <div class="kpi-value" id="kpi-issues">0</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-label">Health Index</div>
                            <div class="kpi-value" id="kpi-health">--</div>
                        </div>
                    </div>

                    <div class="diag-work-area">
                        <div class="diag-progress-wrapper" id="prog-wrap">
                            <div class="diag-progress-fill"></div>
                        </div>
                        <div class="diag-console" id="diag-console">
                            <div class="log-line info">Diagnostic engine initialized. Awaiting user command...</div>
                        </div>
                    </div>

                    <div class="diag-body" id="diag-result-view">
                        <div class="text-center py-5">
                            <p class="text-muted">Initiate a <b>Deep Scan</b> to analyze all formulas across workbook sheets.</p>
                        </div>
                    </div>

                    <div class="modal-footer" style="padding: 1.5rem 2rem; border-top: 1px solid #f1f5f9;">
                        <button id="btn-diag-reset" class="btn btn-link text-muted me-auto text-decoration-none small">Reset Engine</button>
                        <button id="btn-diag-export" class="btn-diag btn-export-diag" style="display:none;">Export Audit (CSV)</button>
                        <button id="btn-diag-scan" class="btn-diag btn-primary-diag">Run Deep Scan</button>
                        <button id="btn-diag-fix" class="btn-diag btn-success-diag" style="display:none;">Apply Recursive Fix</button>
                    </div>
                </div>
            </div>
        </div>`;

        $('body').append(modalHTML);
        const $modal = $('#luckysheetDiagModal');
        const modalInstance = new bootstrap.Modal($modal[0]);

        const addLog = (msg, type = 'info') => {
            const $console = $('#diag-console');
            const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            $console.append(`<div class="log-line ${type}">[${time}] ${msg}</div>`);
            $console.scrollTop($console[0].scrollHeight);
        };

        const updateProgress = (pct, msg) => {
            $('#prog-wrap').show();
            $('.diag-progress-fill').css('width', pct + '%');
            if (msg) $('#kpi-state').text(msg);
            if (pct >= 100) setTimeout(() => $('#prog-wrap').fadeOut(), 1000);
        };

        const render = () => {
            const $view = $('#diag-result-view').empty();
            const names = Object.keys(state.issues);
            let totalCount = 0;

            if (!state.scanned) return;

            if (names.length === 0) {
                $view.append('<div class="text-center py-5"><h6 class="fw-bold text-success">Workbook Integrity Verified: 100% Match</h6></div>');
                $('#kpi-health').text('100%').css('color', '#10b981');
                $('#kpi-issues').text('0');
                $('#btn-diag-fix, #btn-diag-export').hide();
                return;
            }

            names.forEach(name => {
                const sheet = state.issues[name];
                totalCount += sheet.data.length;
                const $group = $(`
                    <div class="issue-group">
                        <div class="issue-header">
                            <span class="fw-bold" style="color:#334155">${name}</span>
                            <span class="badge rounded-pill bg-danger" style="font-size:10px">${sheet.data.length} Errors</span>
                        </div>
                        <table class="diag-table">
                            <thead><tr><th>Cell</th><th>Stored Value</th><th>Calculated</th></tr></thead>
                            <tbody></tbody>
                        </table>
                    </div>
                `);

                sheet.data.forEach(item => {
                    $group.find('tbody').append(`
                        <tr>
                            <td><span class="addr-tag">${item.addr.split('|')[0]}</span></td>
                            <td class="val-old">${item.oldVal}</td>
                            <td class="val-new">${item.newVal}</td>
                        </tr>
                    `);
                });
                $view.append($group);
            });

            $('#kpi-issues').text(totalCount).addClass('danger');
            $('#kpi-health').text('Action Required').css('color', '#ef4444');
            $('#btn-diag-fix, #btn-diag-export').show();
        };

        // --- CORE LOGIC (KEEPING YOUR ORIGINAL LOGIC INTACT) ---
        const runScan = async () => {
            addLog("Starting deep scan of all worksheets...", "info");
            const isVolatile = (f) => /\b(TODAY|NOW|RAND|RANDBETWEEN|WEEKDAY|DAY|WEEKNUM)\s*\(/i.test(f || "");
            const sheets = luckysheet.getAllSheets() ?? [];
            const activePos = sheets.findIndex(s => Number(s.status) === 1);
            const issues = {};

            for (let i = 0; i < sheets.length; i++) {
                const sheet = sheets[i];
                luckysheet.setSheetActive(i);
                updateProgress(Math.floor(((i + 1) / sheets.length) * 100), "Scanning...");
                addLog(`Analyzing ${sheet.name}...`);

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

                if (sheetIssues.length > 0) issues[sheet.name] = { index: sheet.index, data: sheetIssues };
                await new Promise(r => setTimeout(r, 20));
            }

            state.issues = issues;
            state.scanned = true;
            luckysheet.setSheetActive(activePos);
            addLog("Scan complete. Verification data ready.", "success");
        };

        const runFix = async () => {
            addLog("Executing recursive repair passes...", "warn");
            const sheets = luckysheet.getAllSheets() ?? [];
            let grandTotal = 0;

            for (let pass = 1; pass <= 3; pass++) {
                let passCount = 0;
                addLog(`Repair Pass ${pass} in progress...`, "info");
                
                for (let i = 0; i < sheets.length; i++) {
                    const sheet = sheets[i];
                    luckysheet.setSheetActive(i);
                    const currentIssues = state.issues[sheet.name]?.data || [];
                    
                    for (const item of currentIssues) {
                        luckysheet.updateCellValue(sheet, item.r, item.c, item.f, true, true);
                        passCount++;
                        if (passCount % 5 === 0) addLog(`Healed ${item.addr} in ${sheet.name}`, "success");
                    }
                }
                grandTotal += passCount;
                if (passCount === 0) break;
                await runScan(); // Refresh data for next pass
            }
            return grandTotal;
        };

        // --- EXPORT LOGIC ---
        const exportToCSV = () => {
            let csv = "Sheet,Cell,Formula,OldValue,NewValue\n";
            Object.keys(state.issues).forEach(name => {
                state.issues[name].data.forEach(item => {
                    csv += `"${name}","${item.addr}","${item.f.replace(/"/g, '""')}","${item.oldVal}","${item.newVal}"\n`;
                });
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `Diagnosis_Report_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        // --- HANDLERS ---
        $('#btn-diag-scan').on('click', async function () {
            $(this).prop('disabled', true);
            await runScan();
            $(this).prop('disabled', false);
            render();
        });

        $('#btn-diag-fix').on('click', async function () {
            $(this).hide();
            const total = await runFix();
            addLog(`Repair sequence complete. ${total} records synchronized.`, "success");
            render();
            if (settings.onFixComplete) settings.onFixComplete();
        });

        $('#btn-diag-export').on('click', exportToCSV);
        $('#btn-diag-reset').on('click', () => { 
            state.scanned = false; state.issues = {}; 
            $('#diag-console').empty(); 
            addLog("Engine reset. Awaiting instructions.");
            render(); 
        });

        modalInstance.show();
        render();
        return this;
    };
}(jQuery));
