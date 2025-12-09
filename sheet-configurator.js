(function ($) {
    $.fn.sheetConfigurator = function (options) {
        const settings = $.extend({
            luckysheetInstances: [],
            existingConfigs: {},
            activeSheet: null,
            saveCallback: function (config, sheetName) { },
            getSheetDataFn: function (sheetName) { return []; }
        }, options);

        let tempConfigs = {};

        // Inject modal once
        if (!$('#sheetConfigModal').length) {
            $('head').append(`
                <style id="sheetConfigModalStyles">
                    /* Font & base colors */
                    #sheetConfigModal * { font-family: 'Inter', sans-serif; }
                    #sheetConfigModal .modal-content {
                        border-radius: 12px;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                        border: none;
                    }
                    #sheetConfigModal .modal-header {
                        background-color: #D7C4F0; /* soft digital lavender */
                        color: #1a1a1a;
                        border-bottom: none;
                        border-top-left-radius: 12px;
                        border-top-right-radius: 12px;
                        padding: 1rem 1.5rem;
                    }
                    #sheetConfigModal .modal-title {
                        font-weight: 600;
                        font-size: 1.25rem;
                    }
                    #sheetConfigModal .btn-close {
                        opacity: 0.7;
                        border: none;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        transition: background-color 0.2s, opacity 0.2s;
                    }
                    #sheetConfigModal .btn-close:hover {
                        background-color: rgba(0,0,0,0.05);
                        opacity: 1;
                    }
                    #sheetConfigModal .modal-body {
                        padding: 1.5rem;
                        background-color: #f9f9f9;
                    }
                    #sheetConfigModal .modal-footer {
                        border-top: none;
                        padding: 1rem 1.5rem;
                        justify-content: flex-end;
                        gap: 0.75rem;
                    }
                    #sheetConfigModal .btn-primary {
                        background-color: #A084F7; 
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 8px;
                        transition: background 0.2s;
                    }
                    #sheetConfigModal .btn-primary:hover { background-color: #8E61F0; }
                    #sheetConfigModal .btn-secondary {
                        background-color: #e0e0e0;
                        color: #333;
                        border-radius: 8px;
                        padding: 0.5rem 1rem;
                        border: none;
                    }
                    #sheetConfigModal .btn-secondary:hover { background-color: #d1d1d1; }
                    #sheetConfigModal label { font-weight: 500; color: #333; }
                    #sheetConfigModal .form-control, #sheetConfigModal .form-select {
                        border-radius: 8px;
                        border: 1px solid #ccc;
                        padding: 0.5rem;
                        height: 38px;
                    }
                    #sheetConfigModal .form-text { color: #666; }
                    #sheetConfigModal .row.mb-3 { margin-bottom: 1rem; }
                    #sheetConfigModal .custom-field-row { border: 1px dashed #e6e6e6; padding: .5rem; border-radius: 8px; margin-bottom: .5rem; background: #fff; }
                    #sheetConfigModal .formula-input.invalid { border-color: #e74c3c !important; box-shadow: none; }
                    #sheetConfigModal .formula-input.valid { border-color: #27ae60 !important; box-shadow: none; }
                    #sheetConfigModal .small-error { color: #e74c3c; font-size: 0.85rem; display:block; margin-top:4px; }
                    #sheetConfigModal .insert-header-btn { margin-left: 6px; }
                </style>
            `);

            $('body').append(`
              <div class="modal fade" id="sheetConfigModal" tabindex="-1" style="z-index:9999">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Sheet Configuration</h5>
                      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                      <form id="sheetConfigForm" class="container-fluid">
                        <div class="row mb-3">
                          <div class="col-md-6">
                            <label class="form-label">Sheet</label>
                            <select class="form-select" id="configSheetSelect"></select>
                          </div>
                          <div class="col-md-6">
                            <label class="form-label">Sheet Type</label>
                            <select class="form-select" id="configSheetType">
                              <option value="">--Select--</option>
                              <option value="custom">Custom</option>
                              <option value="lob">LOB</option>
                            </select>
                          </div>
                        </div>

                        <div id="lobInputs" style="display:none;">
                          <div class="row mb-3">
                            <div class="col-md-6">
                              <label class="form-label">Billing type</label>
                              <select class="form-select" id="configLobType">
                                <option value="FTE">FTE</option>
                                <option value="Transaction">Transaction</option>
                              </select>
                            </div>
                            <div class="col-md-6">
                              <label class="form-label">Location</label>
                              <select class="form-select" id="configLocation">
                                <option value="Bulgaria">Bulgaria</option>
                                <option value="Canada">Canada</option>
                                <option value="China">China</option>
                                <option value="Colombia">Colombia</option>
                                <option value="Egypt">Egypt</option>
                                <option value="India">India</option>
                                <option value="Jamaica">Jamaica</option>
                                <option value="Kosovo">Kosovo</option>
                                <option value="Malaysia">Malaysia</option>
                                <option value="Mexico">Mexico</option>
                                <option value="Philippines">Philippines</option>
                                <option value="USA">USA</option>
                              </select>
                            </div>
                          </div>
                          <div class="row mb-3"> 
                            <div class="col-md-6">   
                                <label class="form-label">Site</label>    
                                <input type="text" class="form-control" id="configSite" />  
                            </div>
                            <div class="col-md-6">   
                                <label class="form-label">ProjectId</label>    
                                <input type="text" class="form-control" id="configProjectId" />  
                            </div> 
                          </div>
                          <div class="row mb-3">
                            <div class="col-md-6">
                              <label class="form-label">Week Header Row</label>
                              <input type="number" min="1" class="form-control" id="configWeekRow" />
                              <div class="form-text">Row number that contains dates.</div>
                              <small class="text-muted" id="weekDateLabel"></small>
                            </div>
                            <div class="col-md-6">
                              <label class="form-label">Header Column</label>
                              <input type="text" class="form-control" id="configHeaderCol" />
                              <div class="form-text">Column with headers (A, B, C or numeric index). Example: A or 1</div>
                            </div>
                          </div>
                        </div>

                        <div id="headerMappingContainer" class="mt-3"></div>

                        <hr />

                        <div id="customFieldsSection" class="mt-3">
                          <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="mb-0">Custom Fields</h6>
                            <button type="button" class="btn btn-sm btn-secondary" id="addCustomFieldBtn">Add Custom Field</button>
                          </div>
                          <div id="customFieldsContainer"></div>
                          <div class="form-text">Use <code>[Header Name]</code> tokens in formulas. Use the Insert button to pick headers.</div>
                        </div>

                      </form>
                    </div>
                    <div class="modal-footer">
                      <span id="configSaveError" class="small-error" style="display:none"></span>
                      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                      <button type="button" class="btn btn-primary" id="saveConfigBtn">Save</button>
                    </div>
                  </div>
                </div>
              </div>
            `);
        }

        // --- plugin internals ---
        const $sheetSelect = $('#configSheetSelect');
        const $sheetType = $('#configSheetType');
        const $lobInputs = $('#lobInputs');
        const $site = $('#configSite');
        const $projectId = $('#configProjectId');
        const $weekRow = $('#configWeekRow');
        const $headerCol = $('#configHeaderCol');
        const $mappingContainer = $('#headerMappingContainer');
        const $weekLabel = $('#weekDateLabel');
        const $customFieldsContainer = $('#customFieldsContainer');
        const $addCustomFieldBtn = $('#addCustomFieldBtn');
        const $saveBtn = $('#saveConfigBtn');
        const $configSaveError = $('#configSaveError');

        $('#sheetConfigModal').off('hidden.bs.modal').on('hidden.bs.modal', function () {
            tempConfigs = {};
            $mappingContainer.empty();
            $customFieldsContainer.empty();
            $configSaveError.hide().text('');
        });

        // Utility: Excel-like column name -> zero-based index (supports A, Z, AA, AB, etc.)
        function columnNameToIndex(colName) {
            if (colName === null || colName === undefined || colName === '') return null;
            const c = String(colName).trim().toUpperCase();
            if (/^\d+$/.test(c)) {
                return parseInt(c, 10) - 1;
            }
            let idx = 0;
            for (let i = 0; i < c.length; i++) {
                const charCode = c.charCodeAt(i) - 64; // A -> 1
                if (charCode < 1 || charCode > 26) return null;
                idx = idx * 26 + charCode;
            }
            return idx - 1;
        }

        // Utility: extract header tokens [Header Name]
        function extractTokens(formula) {
            const re = /\[([^\]]+)\]/g;
            const tokens = [];
            let m;
            while ((m = re.exec(formula)) !== null) tokens.push(m[1]);
            return tokens;
        }

        // Build unique headers from sheet data based on header column
        function buildHeaderList(sheetData, colInput) {
            if (!colInput) return [];
            let colIdx = columnNameToIndex(colInput);
            if (colIdx === null) return [];
            const headers = [];
            for (let r = 0; r < sheetData.length; r++) {
                const cell = sheetData[r] && sheetData[r][colIdx];
                if (!cell) continue;
                const val = (cell.m !== undefined && cell.m !== null) ? cell.m : (cell.v !== undefined ? cell.v : "");
                if (val !== null && String(val).trim() !== "") headers.push(String(val));
            }
            headers.push("Not Applicable");
            const uniqueHeaders = [...new Set(headers.map(h => String(h).trim()).filter(h => h !== ""))];
            return uniqueHeaders;
        }

        // Build header mapping UI and return headers list (for reuse)
        function buildHeaderMappingAndList(sheetData, colInput, existingMappings) {
            const uniqueHeaders = buildHeaderList(sheetData, colInput);
            $mappingContainer.empty();
            if (!uniqueHeaders.length) return uniqueHeaders;

            const standardHeaders = ["Client Lock", "Forecasted Hours", "Actual Hours", "Required HC", "Available HC", "Planned Attrition", "Actual Attrition", "Planned Shrinkage", "Actual Shrinkage", "Planned AHT", "Actual AHT", "FTE Required", "FTE Available"];

            standardHeaders.forEach(std => {
                let options = uniqueHeaders.map(h =>
                    `<option value="${h}" ${existingMappings && existingMappings[std] === h ? "selected" : ""}>${h}</option>`
                ).join("");
                $mappingContainer.append(`
                  <div class="row mb-2">
                    <div class="col-md-6"><label class="form-label">${std}</label></div>
                    <div class="col-md-6">
                      <select class="form-select mapping-dropdown" data-std="${std}">
                        <option value="">--Select--</option>
                        ${options}
                      </select>
                    </div>
                  </div>
                `);
            });

            return uniqueHeaders;
        }

        // Create a custom field row DOM and attach events
        function createCustomFieldRow(field = { name: '', formula: '' }, availableHeaders = [], insertHeaderCallback) {
            const idx = Date.now() + Math.floor(Math.random() * 1000);
            const $row = $(`
                <div class="custom-field-row" data-row-id="${idx}">
                  <div class="row g-2 align-items-center">
                    <div class="col-md-4">
                      <input type="text" class="form-control custom-field-name" placeholder="Field name" value="${escapeHtml(field.name || '')}" />
                    </div>
                    <div class="col-md-6">
                      <div class="d-flex">
                        <input type="text" class="form-control formula-input" placeholder="[Header] * [Other Header]" value="${escapeHtml(field.formula || '')}" />
                        <div class="btn-group insert-header-btn" role="group">
                          <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">Insert</button>
                          <ul class="dropdown-menu dropdown-menu-end header-insert-list" style="max-height:200px;overflow:auto"></ul>
                        </div>
                      </div>
                      <span class="small-error" style="display:none"></span>
                    </div>
                    <div class="col-md-2 text-end">
                      <button type="button" class="btn btn-sm btn-danger remove-custom-field">Remove</button>
                    </div>
                  </div>
                </div>
            `);

            // populate header insert list
            const $list = $row.find('.header-insert-list');
            $list.empty();
            availableHeaders.forEach(h => {
                $list.append(`<li><a class="dropdown-item header-insert-item" href="#" data-h="${escapeHtml(h)}">${escapeHtml(h)}</a></li>`);
            });

            // events
            $row.on('click', '.remove-custom-field', function () {
                $row.remove();
            });

            $row.on('click', '.header-insert-item', function (e) {
                e.preventDefault();
                const headerName = $(this).data('h');
                const $input = $row.find('.formula-input');
                insertAtCursor($input[0], `[${headerName}]`);
                $input.trigger('input');
            });

            // live validation
            $row.on('input', '.formula-input, .custom-field-name', function () {
                const $fi = $row.find('.formula-input');
                const fname = $row.find('.custom-field-name').val();
                const form = $fi.val();
                const validHeaders = getAvailableHeaderNames(); // dynamic list
                const val = validateFormula(form, validHeaders, /*allowCustomNames=*/ true);
                const $err = $row.find('.small-error');
                if (!val.valid) {
                    $fi.addClass('invalid').removeClass('valid');
                    $err.show().text(val.error || 'Invalid formula');
                } else {
                    $fi.removeClass('invalid').addClass('valid');
                    $err.hide().text('');
                }
            });

            return $row;
        }

        // Escape HTML helper
        function escapeHtml(text) {
            if (text === null || text === undefined) return '';
            return String(text).replace(/[&<>"'`=\/]/g, function (s) {
                return ({
                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
                })[s];
            });
        }

        // Insert text at cursor for input/textarea
        function insertAtCursor(el, text) {
            el.focus();
            if (document.selection) {
                const sel = document.selection.createRange();
                sel.text = text;
            } else if (el.selectionStart || el.selectionStart === 0) {
                const startPos = el.selectionStart;
                const endPos = el.selectionEnd;
                const before = el.value.substring(0, startPos);
                const after = el.value.substring(endPos, el.value.length);
                el.value = before + text + after;
                el.selectionStart = el.selectionEnd = startPos + text.length;
            } else {
                el.value += text;
            }
        }

        // Return available header names from current sheet (standard + unique headers + custom fields)
        function getAvailableHeaderNames() {
            const sheetName = $sheetSelect.val();
            const sheetData = settings.getSheetDataFn(sheetName) || [];
            const headerColVal = $headerCol.val();
            const sheetHeaders = buildHeaderList(sheetData, headerColVal);
            const standardHeaders = ["Client Lock", "Forecasted Hours", "Actual Hours", "Required HC", "Available HC", "Planned Attrition", "Actual Attrition", "Planned Shrinkage", "Actual Shrinkage", "Planned AHT", "Actual AHT", "FTE Required", "FTE Available"];
            // custom field names present in the UI
            const uiCustomNames = [];
            $customFieldsContainer.find('.custom-field-name').each(function () {
                const v = $(this).val();
                if (v && String(v).trim() !== '') uiCustomNames.push(String(v).trim());
            });
            const all = [...new Set([...sheetHeaders, ...standardHeaders, ...uiCustomNames])];
            return all;
        }

        // Validate formula: tokens must exist in validHeaders (array) or be custom names if allowed.
        // Also validate arithmetic syntax by replacing tokens with 1 and trying to evaluate using math.js (if present) or a safe evaluator.
        function validateFormula(formula, validHeaders, allowCustomNames) {
            const res = { valid: true, error: null };

            if (!formula || String(formula).trim() === '') return { valid: true }; // empty is ok (no formula)

            // check bracket balance
            let openCount = (formula.match(/\[/g) || []).length;
            let closeCount = (formula.match(/\]/g) || []).length;
            if (openCount !== closeCount) return { valid: false, error: 'Mismatched brackets' };

            const tokens = extractTokens(formula);
            for (let t of tokens) {
                const found = (validHeaders || []).some(h => String(h).trim() === String(t).trim());
                if (!found) {
                    // If custom names allowed, check UI custom fields
                    if (allowCustomNames) {
                        const uiCustom = $customFieldsContainer.find('.custom-field-name').map(function () { return $(this).val(); }).get();
                        if (!uiCustom.some(c => String(c).trim() === String(t).trim())) {
                            return { valid: false, error: `Unknown reference: [${t}]` };
                        }
                    } else {
                        return { valid: false, error: `Unknown reference: [${t}]` };
                    }
                }
            }

            // Replace tokens with 1 for syntax check
            let expr = String(formula).replace(/\[([^\]]+)\]/g, '1');

            // Only allow safe characters: digits, spaces, operators, dots, parentheses, percentage
            if (!/^[0-9+\-*/().%\s]+$/.test(expr)) {
                // But percent sign is a special operator; allow it but we'll convert it
                // reject if other characters present
                // to provide better errors, attempt to strip allowed and see if leftover exists
                const stripped = expr.replace(/[0-9+\-*/().%\s]/g, '');
                if (stripped.length > 0) {
                    return { valid: false, error: 'Formula contains invalid characters' };
                }
            }

            // Convert percentage operator: "x%" -> "(x/100)"
            expr = expr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

            // Try evaluating with math.js if present
            try {
                if (window.math && typeof window.math.evaluate === 'function') {
                    window.math.evaluate(expr);
                } else {
                    // Fallback: use Function but ensure only allowed characters (already tested)
                    // Still guard against constructors: double-check no letters remain
                    if (/[A-Za-z]/.test(expr)) {
                        return { valid: false, error: 'Invalid characters in expression' };
                    }
                    // eslint-disable-next-line no-new-func
                    const fn = new Function('return ' + expr + ';');
                    fn();
                }
            } catch (e) {
                return { valid: false, error: 'Syntax error in formula' };
            }

            return res;
        }

        // Evaluate formula for a given row values map: { "Header Name": numeric_value, ... }
        // Will attempt to use math.js evaluate with replacements; fallback to safe eval
        function evaluateFormulaForRow(formula, rowValueMap) {
            if (!formula || String(formula).trim() === '') return null;
            let expr = String(formula);
            expr = expr.replace(/\[([^\]]+)\]/g, function (_, token) {
                const key = String(token).trim();
                const v = rowValueMap.hasOwnProperty(key) ? rowValueMap[key] : 0;
                return (v === null || v === undefined || v === '') ? 0 : v;
            });
            // convert percent "x%" -> (x/100)
            expr = expr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
            // Evaluate
            try {
                if (window.math && typeof window.math.evaluate === 'function') {
                    return window.math.evaluate(expr);
                } else {
                    if (/[A-Za-z]/.test(expr)) throw new Error('Invalid characters in expression');
                    // eslint-disable-next-line no-new-func
                    const fn = new Function('return ' + expr + ';');
                    return fn();
                }
            } catch (e) {
                return null; // or throw depending on caller expectations
            }
        }

        // get form config (including custom fields)
        function getFormConfig(sheetName) {
            const cfg = {
                sheetName,
                type: $sheetType.val(),
                lobType: $('#configLobType').val(),
                location: $('#configLocation').val(),
                site: $site.val(),
                projectId: $projectId.val(),
                weekRow: $weekRow.val(),
                headerCol: $headerCol.val(),
                headerMappings: {},
                customFields: []
            };
            $('.mapping-dropdown').each(function () {
                const std = $(this).data('std');
                const val = $(this).val();
                if (val) cfg.headerMappings[std] = val;
            });

            // collect custom fields
            $customFieldsContainer.find('.custom-field-row').each(function () {
                const name = $(this).find('.custom-field-name').val();
                const formula = $(this).find('.formula-input').val();
                if (name && String(name).trim() !== '') {
                    cfg.customFields.push({ name: String(name).trim(), formula: formula ? String(formula).trim() : '' });
                }
            });

            return cfg;
        }

        // bind config to UI (including custom fields)
        function bindConfig(config) {
            $sheetType.val('').trigger('change');
            $lobInputs.hide();
            $site.val('');
            $projectId.val('');
            $weekRow.val('');
            $headerCol.val('');
            $mappingContainer.empty();
            $customFieldsContainer.empty();
            $weekLabel.text('');
            if (!config) return;

            $sheetType.val(config.type || '').trigger('change');
            if (config.type === 'lob') {
                $lobInputs.show();
                $('#headerMappingContainer').show();
            }
            else {
                $lobInputs.hide();
                $('#headerMappingContainer').hide();
            }
            $('#configLobType').val(config.lobType || 'FTE');
            $('#configLocation').val(config.location || 'USA');
            $site.val(config.site || '');
            $projectId.val(config.projectId || '');
            $weekRow.val(config.weekRow || '');
            $headerCol.val(config.headerCol || '');

            const sheetName = $sheetSelect.val();
            const sheetData = settings.getSheetDataFn(sheetName) || [];
            // build header mapping and obtain header list
            const headerList = buildHeaderMappingAndList(sheetData, config.headerCol, config.headerMappings || {});

            // Build custom fields UI
            const availableHeaders = headerList;
            if (config.customFields && Array.isArray(config.customFields)) {
                config.customFields.forEach(cf => {
                    const $row = createCustomFieldRow(cf, availableHeaders);
                    $customFieldsContainer.append($row);
                });
            }
        }

        // validate week row (unchanged logic but supports different cell structures)
        function validateWeekRow(sheet, rowNum) {
            const row = sheet.data ? sheet.data[rowNum - 1] : sheet[rowNum - 1];
            if (!row) return { valid: false };
            let start = null, end = null;
            row.forEach(cell => {
                const val = cell && (cell.m || cell.v);
                if (val && !isNaN(Date.parse(val))) {
                    if (start === null) start = val;
                    end = val;
                }
            });
            return { valid: start !== null, start, end };
        }

        // Build header mapping when header column blur happens AND refresh custom field insert lists
        function rebuildMappingsAndCustomInsertLists() {
            const sheetName = $sheetSelect.val();
            const sheetData = settings.getSheetDataFn(sheetName) || [];
            const headerColVal = $headerCol.val();
            const headerList = buildHeaderMappingAndList(sheetData, headerColVal, {});
            // Refresh header insert lists for custom fields
            $customFieldsContainer.find('.header-insert-list').each(function () {
                const $list = $(this);
                $list.empty();
                headerList.forEach(h => {
                    $list.append(`<li><a class="dropdown-item header-insert-item" href="#" data-h="${escapeHtml(h)}">${escapeHtml(h)}</a></li>`);
                });
            });
        }

        // populate sheet select
        $sheetSelect.empty();
        settings.luckysheetInstances.forEach(name => {
            $sheetSelect.append(`<option value="${name}">${name}</option>`);
        });

        if (settings.activeSheet) {
            $sheetSelect.val(settings.activeSheet);
            bindConfig(settings.existingConfigs[settings.activeSheet] || null);
            $sheetSelect.data('lastSheet', settings.activeSheet);
        }

        $sheetSelect.off('change').on('change', function () {
            const prevSheet = $(this).data('lastSheet');
            const newSheet = $(this).val();
            if (prevSheet) {
                tempConfigs[prevSheet] = getFormConfig(prevSheet);
            }
            const config = tempConfigs[newSheet] || settings.existingConfigs[newSheet] || null;
            bindConfig(config);
            $(this).data('lastSheet', newSheet);
        });

        $weekRow.off('blur').on('blur', function () {
            const sheetName = $sheetSelect.val();
            const sheetData = settings.getSheetDataFn(sheetName) || [];
            const weekCheck = validateWeekRow({ data: sheetData }, parseInt($(this).val()));
            if (weekCheck.valid) {
                $weekLabel.text(`Start: ${weekCheck.start} → End: ${weekCheck.end}`);
            } else {
                $weekLabel.text("Invalid week row (no dates found).");
            }
        });

        $headerCol.off('blur').on('blur', function () {
            rebuildMappingsAndCustomInsertLists();
        });

        // Add custom field button
        $addCustomFieldBtn.off('click').on('click', function () {
            const sheetName = $sheetSelect.val();
            const sheetData = settings.getSheetDataFn(sheetName) || [];
            const headerList = buildHeaderList(sheetData, $headerCol.val());
            const $row = createCustomFieldRow({}, headerList);
            $customFieldsContainer.append($row);
        });

        // delegate header-insert clicks (works for dynamically added items)
        $customFieldsContainer.off('click', '.header-insert-item').on('click', '.header-insert-item', function (e) {
            e.preventDefault();
            const headerName = $(this).data('h');
            const $container = $(this).closest('.custom-field-row');
            const $input = $container.find('.formula-input');
            insertAtCursor($input[0], `[${headerName}]`);
            $input.trigger('input');
        });

        // Save — validate everything (including formulas) before calling saveCallback
        $saveBtn.off('click').on('click', function () {
            $configSaveError.hide().text('');
            const sheetName = $sheetSelect.val();
            const cfg = getFormConfig(sheetName);

            // Validate custom field names unique & not empty
            const names = {};
            for (let i = 0; i < cfg.customFields.length; i++) {
                const cf = cfg.customFields[i];
                if (!cf.name || String(cf.name).trim() === '') {
                    $configSaveError.show().text('Custom field name cannot be empty.');
                    return;
                }
                if (names[cf.name]) {
                    $configSaveError.show().text('Duplicate custom field name: ' + cf.name);
                    return;
                }
                names[cf.name] = true;
            }

            // Build list of valid header names for validation (sheet headers + standard + custom names)
            const sheetData = settings.getSheetDataFn(sheetName) || [];
            const sheetHeaders = buildHeaderList(sheetData, cfg.headerCol);
            const standardHeaders = ["Client Lock", "Forecasted Hours", "Actual Hours", "Required HC", "Available HC", "Planned Attrition", "Actual Attrition", "Planned Shrinkage", "Actual Shrinkage", "Planned AHT", "Actual AHT", "FTE Required", "FTE Available"];
            const validHeaders = [...new Set([...sheetHeaders, ...standardHeaders, ...cfg.customFields.map(c => c.name)])];

            // Validate each formula
            for (let i = 0; i < cfg.customFields.length; i++) {
                const cf = cfg.customFields[i];
                const validation = validateFormula(cf.formula, validHeaders, true);
                if (!validation.valid) {
                    $configSaveError.show().text(`Error in "${cf.name}": ${validation.error || 'Invalid formula'}`);
                    return;
                }
            }

            // If all good, persist config for this sheet only (more expected UX than saving all)
            settings.existingConfigs[sheetName] = cfg;
            // Call save callback for just this sheet
            try {
                $saveBtn.text("Saving...");
                settings.saveCallback(cfg, sheetName);
                $saveBtn.text("✓ Saved");
                setTimeout(function () { $saveBtn.text("Save"); }, 1500);
            } catch (e) {
                $saveBtn.text("Save");
                $configSaveError.show().text('Save callback error: ' + (e.message || e));
            }
        });

        // sheet type toggle
        $sheetType.off('change').on('change', function () {
            if ($(this).val() === 'lob') $lobInputs.show();
            else {
                $lobInputs.hide();
                $mappingContainer.empty();
            }
        });

        return this;
    };
})(jQuery);
