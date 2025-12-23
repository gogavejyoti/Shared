(function ($) {
    $.fn.luckysheetDiagnosis = function (options) {
        const settings = $.extend({
            onFixComplete: null
        }, options);

        // 1. Fully Isolated Persistent State
        if (!window._luckysheetDiagState) {
            window._luckysheetDiagState = {
                discrepancy: { scanned: false, issues: {} },
                currentTab: 'discrepancy'
            };
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

        // 2. Premium UI Styles
        $('#luckysheetDiagModal').remove();
        if ($('#luckysheetDiagStyles').length === 0) {
            $('head').append(`
            <style id="luckysheetDiagStyles">
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                #luckysheetDiagModal .modal-content { border-radius: 24px; font-family: 'Inter', sans-serif; border: none; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); background: #fff; }
                #luckysheetDiagModal .modal-header { padding: 1.5rem 2.5rem; border-bottom: 1px solid #f0f0f0; }
                
                /* Progress Bar */
                .diag-progress-container { display: none; padding: 0 40px; margin-bottom: 10px; }
                .diag-progress-bar { height: 6px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
                .diag-progress-fill { height: 100%; background: linear-gradient(90deg, #0984e3, #00cec9); width: 0%; transition: width 0.3s ease; }

                .diag-tabs { display: flex; background: #f8f9fa; padding: 12px 24px 0; gap: 10px; border-bottom: 1px solid #eee; }
                .diag-tab { padding: 12px 24px; cursor: pointer; border-radius: 12px 12px 0 0; font-weight: 600; color: #636e72; font-size: 0.9rem; transition: all 0.2s; }
                .diag-tab.active { background: #fff; color: #0984e3; box-shadow: 0 -4px 10px rgba(0,0,0,0.03); margin-bottom: -1px; border: 1px solid #eee; border-bottom: 2px solid #fff; }

                .diag-toolbar { padding: 20px 40px; display: flex; align-items: center; gap: 15px; background: #fff; }
                .btn-premium { border-radius: 12px; font-weight: 700; padding: 10px 24px; transition: transform 0.2s; }
                .btn-premium:active { transform: scale(0.96); }

                /* Card Design */
                .sheet-card { border: 1px solid #e1e8ed; margin: 0 40px 15px; border-radius: 16px; background: #fff; transition: 0.3s; }
                .sheet-card:hover { border-color: #0984e3; box-shadow: 0 10px 20px rgba(9, 132, 227, 0.05); }
                .sheet-header { padding: 16px 24px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f2f6; }
                .sheet-body { display: none; padding: 0; background: #fafbfc; }
                .sheet-body.active { display: block; }

                .diag-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
                .diag-table th { background: #f1f2f6; color: #636e72; padding: 12px 20px; text-align: left; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; }
                .diag-table td { padding: 12px 20px; border-bottom: 1px solid #eee; }

                .cell-pill { background: #e1f5fe; color: #0984e3; font-weight: 800; padding: 4px 10px; border-radius: 8px; font-family: monospace; }
                .formula-pill { background: #fff5f5; color: #d63031; padding: 4px 10px; border-radius: 8px; border: 1px solid #ffd7d7; font-family: monospace; }

                .loader-icon { display: none; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #0984e3; border-radius: 50%; animation: diag-spin 1s linear infinite; }
                @keyframes diag-spin { to { transform: rotate(360deg); } }
            </style>
            `);
        }

        const modalHTML = `
        <div class="modal fade" id="luckysheetDiagModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content shadow-lg">
                    <div class="modal-header">
                        <div>
                            <h5 class="modal-title mb-0">✨ Advanced Sheet Health Assistant</h5>
                            <small class="text-muted">Analyzing and resolving spreadsheet structural integrity.</small>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="diag-tabs">
                        <div class="diag-tab ${state.currentTab === 'discrepancy' ? 'active' : ''}" data-id="discrepancy">Value Discrepancy</div>
                    </div>
                    <div class="diag-toolbar">
                        <button id="btn-diag-scan" class="btn btn-primary btn-premium shadow-sm">Scan Now</button>
                        <button id="btn-diag-reset" class="btn btn-outline-secondary btn-premium">Reset Data</button>
                        <div class="loader-icon" id="diag-master-loader"></div>
                    </div>
                    <div class="diag-progress-container">
                        <div class="d-flex justify-content-between mb-1"><small id="prog-text" class="text-muted">Analyzing...</small><small id="prog-pct" class="text-primary fw-bold">0%</small></div>
                        <div class="diag-progress-bar"><div class="diag-progress-fill"></div></div>
                    </div>
                    <div class="modal-body p-0" style="min-height: 400px; max-height: 60vh; overflow-y:auto; background: #fafafa; padding-bottom: 20px !important;">
                        <div id="diag-result-view" style="padding-top: 20px;"></div>
                    </div>
                    <div class="modal-footer" style="background: #fff; border-top: 1px solid #eee; padding: 1.5rem 2.5rem;">
                        <div class="me-auto">
                            <h6 class="mb-0" id="diag-status-title">System Ready</h6>
                            <span id="diag-status-sub" class="text-muted small">Select a category and tap scan.</span>
                        </div>
                        <button id="btn-diag-fix" class="btn btn-success btn-premium px-5" style="display:none; background:#00b894; border:none; box-shadow: 0 4px 15px rgba(0, 184, 148, 0.3);">Fix All Issues</button>
                    </div>
                </div>
            </div>
        </div>`;

        $('body').append(modalHTML);
        const $modal = $('#luckysheetDiagModal');
        const modalInstance = new bootstrap.Modal($modal[0]);

        // --- PROGRESS HANDLER ---
        const updateProgress = (pct, msg) => {
            $('.diag-progress-container').show();
            $('.diag-progress-fill').css('width', pct + '%');
            $('#prog-pct').text(pct + '%');
            $('#prog-text').text(msg);
            if (pct >= 100) setTimeout(() => $('.diag-progress-container').fadeOut(), 1000);
        };

        // --- RENDER LOGIC ---
        const render = () => {
            const current = state[state.currentTab];
            const $view = $('#diag-result-view').empty();

            if (!current.scanned) {
                $view.append(`
                    <div class="text-center py-5">
                        <div style="font-size: 4rem; opacity: 0.2;">🔍</div>
                        <h4 class="mt-3 fw-bold text-dark">Ready for Inspection</h4>
                        <p class="text-muted">The assistant is waiting to scan the current category.</p>
                    </div>
                `);
                $('#btn-diag-fix').hide();
                return;
            }

            const names = Object.keys(current.issues);
            if (names.length === 0) {
                $view.append(`
                    <div class="text-center py-5">
                        <div style="font-size: 4rem;">✅</div>
                        <h4 class="mt-3 fw-bold text-success">Perfect Health</h4>
                        <p class="text-muted">No issues detected in the <b>${state.currentTab}</b> category.</p>
                    </div>
                `);
                $('#btn-diag-fix').hide();
                return;
            }

            names.forEach(name => {
                const sheet = current.issues[name];
                const $card = $(`
                    <div class="sheet-card">
                        <div class="sheet-header">
                            <span><b>Sheet: ${name}</b> <span class="badge bg-danger ms-2">${sheet.data.length}</span></span>
                            <span class="text-muted small">Click to inspect ↓</span>
                        </div>
                        <div class="sheet-body">
                            <table class="diag-table">
                                <thead><tr><th style="width:140px;">Cell</th><th>Formula</th><th>${state.currentTab === 'discrepancy' ? 'Issue' : 'Status'}</th></tr></thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                `);

                sheet.data.forEach(item => {
                    const statusVal = state.currentTab === 'discrepancy'
                        ? `<td><span class="text-danger">${item.oldVal}</span> → <span class="text-success fw-bold">${item.newVal}</span></td>`
                        : `<td><span class="text-danger fw-bold">Link Broken</span></td>`;

                    $card.find('tbody').append(`
                        <tr>
                            <td><span class="cell-pill">${item.addr}</span></td>
                            <td><span class="formula-pill">${item.f}</span></td>
                            ${statusVal}
                        </tr>
                    `);
                });
                $view.append($card);
            });
            $('#btn-diag-fix').show();
        };

        // --- INDEPENDENT METHOD: SCAN 1 (Discrepancy) ---
        // Scans all sheets for formula/value discrepancies and returns

        // Scans all sheets for formula/value discrepancies and returns
        // the number of sheets that contain at least one issue.
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

            // Capture the currently active sheet as an array position (safer to restore)
            const activeSheetPos = sheets.findIndex(s => Number(s.status) === 1);
            const restorePos = activeSheetPos >= 0 ? activeSheetPos : 0;

            const issues = {};
            let sheetsWithIssues = 0;

            // Helper: normalize value for output
            const normalize = (v) => {
                if (v == null) return "—";
                if (v instanceof Date) return v.getTime(); // store dates as epoch for comparison/output
                if (typeof v === "number") {
                    // Keep as number, but if not finite, stringify
                    return Number.isFinite(v) ? v : String(v);
                }
                return String(v);
            };

            // Helper: tolerant equality
            const valuesEqual = (a, b) => {
                // Both nullish
                if (a == null && b == null) return true;

                // Date-like numeric comparison
                const aNum = (a instanceof Date) ? a.getTime() : Number(a);
                const bNum = (b instanceof Date) ? b.getTime() : Number(b);
                const aNumOK = !Number.isNaN(aNum);
                const bNumOK = !Number.isNaN(bNum);

                if (aNumOK && bNumOK) {
                    // Epsilon for floating-point jitter
                    const EPS = 1e-9;
                    return Math.abs(aNum - bNum) < EPS;
                }

                // Fallback to string comparison
                return String(a) === String(b);
            };

            try {
                for (let sheetIdx = 0; sheetIdx < sheets.length; sheetIdx++) {
                    const sheet = sheets[sheetIdx];
                  
                    // Activate by array position for consistency in this loop
                    luckysheet.setSheetActive(sheetIdx);

                    // Progress (10% → 90% across sheets)
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
                            const res = luckysheet.validateCellValue(
                                sheet,
                                cell.r,
                                cell.c,
                                cell.v.f,
                                true, // isFormula
                                true  // allow array formula calc
                            );
                            calcV = Array.isArray(res) ? res[1] : res;
                        } catch (e) {
                            // Capture evaluation errors as a distinguishable token
                            calcV = "#EVAL!";
                        }

                        // Use sheet.index for the API context (Luckysheet often expects internal index)
                        const storeV = luckysheet.getCellValue(cell.r, cell.c, { sheetIndex: sheet.index });

                        if (!valuesEqual(storeV, calcV)) {
                            console.log(`${sheet.name} | r=>${cell.r} | c=>${cell.c} | f=>${cell.v.f}`);
                            sheetIssues.push({
                                r: cell.r,
                                c: cell.c,
                                f: cell.v.f,
                                addr: getExcelAddr(cell.r, cell.c) + " | Row=>" + (cell.r + 1),
                                oldVal: normalize(storeV),
                                newVal: normalize(calcV)
                            });
                        }
                    }

                    if (sheetIssues.length > 0) {
                        issues[sheet.name] = { id: sheet.index, data: sheetIssues };
                        sheetsWithIssues++;
                    }

                    // Let UI breathe each sheet
                    await new Promise(r => setTimeout(r, 50));
                }

                state.discrepancy = {
                    issues,
                    scanned: true
                };

                updateProgress(100, "Scan Complete");

                // Restore original active sheet by position
                luckysheet.setSheetActive(restorePos);

                return sheetsWithIssues;
            } catch (err) {
                // Defensive: ensure we still restore and report
                console.error("scanDiscrepancies failed:", err);
                updateProgress(100, "Scan aborted due to error");
                luckysheet.setSheetActive(restorePos);
                throw err;
            }
        }

     
        // --- INDEPENDENT METHOD: FIX 1 (Discrepancy) ---

        /**
         * Recalculate all formula cells and update their stored values
         * until no mismatches remain or max passes reached.
         */
        const fixDiscrepancies = async () => {
            const sheets = luckysheet.getAllSheets() ?? [];
            if (sheets.length === 0) {
                return 0;
            }

            // Capture the currently active sheet by array position (safer)
            const activePos = sheets.findIndex(s => Number(s.status) === 1);
            const restorePos = activePos >= 0 ? activePos : 0;

            // Volatile function detector: skip these to avoid non-converging loops
            const isVolatile = (f) => /\b(TODAY|NOW|RAND|RANDBETWEEN|WEEKDAY|DAY|WEEKNUM)\s*\(/i.test(f || "");
            const isDate = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f || "");

            // Numeric/date tolerant equality
            const valuesEqual = (a, b) => {
                if (a == null && b == null) return true;

                const aDate = (a instanceof Date) ? a.getTime() : Number(a);
                const bDate = (b instanceof Date) ? b.getTime() : Number(b);
                const aNumOK = !Number.isNaN(aDate);
                const bNumOK = !Number.isNaN(bDate);

                if (aNumOK && bNumOK) {
                    const EPS = 1e-9;
                    return Math.abs(aDate - bDate) < EPS;
                }
                return String(a) === String(b);
            };

            const maxPasses = 5;          // Bound the loop to avoid infinite cycles
            const breatheEvery = 250;     // Yield every N cells
            let totalFixed = 0;

            try {
                for (let pass = 1; pass <= maxPasses; pass++) {
                    let changesThisPass = 0;

                    for (let sheetIdx = 0; sheetIdx < sheets.length; sheetIdx++) {
                        const sheet = sheets[sheetIdx];
                     
                        // Ensure correct recalculation context
                        luckysheet.setSheetActive(sheetIdx);

                        // Collect candidate formula cells (skip volatile)
                        const formulaCells = (sheet.celldata ?? [])
                            .filter(cell => {
                                const f = cell?.v?.f;
                                return f && typeof f === "string" && f.length > 0 && !isVolatile(f) && !isDate(cell?.v?.m) && f.indexOf("Next Week") == -1;
                            })
                            .map(cell => ({
                                r: cell.r,
                                c: cell.c,
                                f: cell.v.f,
                                oldValue: luckysheet.getCellValue(cell.r, cell.c, { sheetIndex: sheet.index })
                            }));

                        // Recalculate and update only if mismatch
                        let processed = 0;
                        for (const m of formulaCells) {
                            let newValue;
                            try {
                                const res = luckysheet.validateCellValue(
                                    sheet, m.r, m.c, m.f,
                                    true,  // isFormula
                                    true   // silent/array friendly
                                );
                                newValue = Array.isArray(res) ? res[1] : res;
                            } catch (e) {
                                // If evaluation itself fails, skip updating this cell
                                newValue = "#EVAL!";
                            }

                            if (!valuesEqual(m.oldValue, newValue)) {
                                changesThisPass++;

                                // Trigger Luckysheet to recompute and update the stored value,
                                // while preserving the formula (isFormula = true).
                                // If your build requires sheetIndex, adjust accordingly.
                                luckysheet.updateCellValue(sheet, m.r, m.c, m.f, true, true);
                            }

                            // Let UI breathe on large grids
                            processed++;
                            if ((processed % breatheEvery) === 0) {
                                await new Promise(r => setTimeout(r, 16));
                            }
                        }

                        // Short UI yield per sheet
                        await new Promise(r => setTimeout(r, 16));
                    }

                    totalFixed += changesThisPass;

                    // If no changes this pass, we’re done
                    if (changesThisPass === 0) {
                        break;
                    }
                }
            } finally {
                // Restore original active sheet by array position
                luckysheet.setSheetActive(restorePos);
            }

            return totalFixed; // Total number of fixes attempted    return totalFixed; // Total number of fixes attempted across passes
        }

      
        // --- BUTTON HANDLERS ---
        $('#btn-diag-scan').on('click', async function () {
            $(this).prop('disabled', true);
            $('#diag-master-loader').show();
            $('#diag-status-title').text("Scanning...");
            $('#diag-status-sub').text("Processing spreadsheet logic...");
            await scanDiscrepancies();
            $(this).prop('disabled', false);
            $('#diag-master-loader').hide();
            $('#diag-status-title').text("Analysis Complete");
            $('#diag-status-sub').text("Review the issues below before fixing.");
            render();
        });

        $('#btn-diag-fix').on('click', async function () {
            $(this).hide();
            $('#btn-diag-scan').prop('disabled', true);
            $('#diag-status-title').text("Fixing Issues...");

            const passes = await fixDiscrepancies();

            $('#btn-diag-scan').prop('disabled', false);
            $('#diag-status-title').text("Healed Successfully");
            $('#diag-status-sub').text(`Resolved cascading issues in ${passes} recursive pass(es).`);
            render();
            if (settings.onFixComplete) settings.onFixComplete();
        });

        $('#btn-diag-reset').on('click', () => {
            state[state.currentTab] = { scanned: false, issues: {} };
            render();
        });

        $modal.on('click', '.diag-tab', function () {
            state.currentTab = $(this).data('id');
            $('.diag-tab').removeClass('active');
            $(this).addClass('active');
            render();
        });

        $modal.on('click', '.sheet-header', function () {
            $(this).next('.sheet-body').toggleClass('active');
        });

        modalInstance.show();
        render();
        return this;
    };
}(jQuery));