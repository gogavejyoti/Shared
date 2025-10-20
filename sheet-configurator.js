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
                </style>
            `);

            $('body').append(`
              <div class="modal fade" id="sheetConfigModal" tabindex="-1" style="z-index:9999;zoom:85%">
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
                              <label class="form-label">LOB Type</label>
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
                              <div class="form-text">Column with headers.</div>
                            </div>
                          </div>
                        </div>

                        <div id="headerMappingContainer" class="mt-3"></div>
                      </form>
                    </div>
                    <div class="modal-footer">
                      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                      <button type="button" class="btn btn-primary" id="saveConfigBtn">Save</button>
                    </div>
                  </div>
                </div>
              </div>
            `);
        }

        // --- rest of your plugin code remains unchanged ---
        const $sheetSelect = $('#configSheetSelect');
        const $sheetType = $('#configSheetType');
        const $lobInputs = $('#lobInputs');
        const $site = $('#configSite');
        const $projectId = $('#configProjectId');
        const $weekRow = $('#configWeekRow');
        const $headerCol = $('#configHeaderCol');
        const $mappingContainer = $('#headerMappingContainer');
        const $weekLabel = $('#weekDateLabel');

        $('#sheetConfigModal').off('hidden.bs.modal').on('hidden.bs.modal', function () {
            tempConfigs = {};
        });

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
                headerMappings: {}
            };
            $('.mapping-dropdown').each(function () {
                const std = $(this).data('std');
                const val = $(this).val();
                if (val) cfg.headerMappings[std] = val;
            });
            return cfg;
        }

        function bindConfig(config) {
            $sheetType.val('').trigger('change');
            $lobInputs.hide();
            $site.val('');
            $projectId.val('');
            $weekRow.val('');
            $headerCol.val('');
            $mappingContainer.empty();
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
            $('#configLobType').val(config.lobType || 'fte');
            $('#configLocation').val(config.location || 'us');
            $site.val(config.site || '');
            $projectId.val(config.projectId || '');
            $weekRow.val(config.weekRow || '');
            $headerCol.val(config.headerCol || '');
            if (config.headerCol) {
                const sheetData = settings.getSheetDataFn(config.sheetName);
                buildHeaderMapping(sheetData, config.headerCol, config.headerMappings || {});
            }
        }

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

        function buildHeaderMapping(sheetData, colInput, existingMappings) {
            if (!colInput) return;
            let colIdx = isNaN(colInput)
                ? colInput.toUpperCase().charCodeAt(0) - 65
                : parseInt(colInput) - 1;

            const headers = [];
            for (let r = 0; r < sheetData.length; r++) {
                const cell = sheetData[r][colIdx];
                if (cell) {
                    const val = cell.m || cell.v || "";
                    if (val) headers.push(val);
                }
            }
            headers.push("Not Applicable");
            const uniqueHeaders = [...new Set(headers.filter(h => h.trim() !== ""))];

            $mappingContainer.empty();
            if (!uniqueHeaders.length) return;

            const standardHeaders = ["Client Lock", "Forecasted Hours", "Actual Hours", "Required HC", "Available HC", "Planned Attrition", "Actual Attrition", "Planned Shrinkage", "Actual Shrinkage", "Planned AHT", "Actual AHT"];
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
        }

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
            const sheetName = $sheetSelect.val();
            const sheetData = settings.getSheetDataFn(sheetName) || [];
            buildHeaderMapping(sheetData, $(this).val(), {});
        });

        $('#saveConfigBtn').off('click').on('click', function () {
            $("#configSheetSelect option").each(function () {
                var sheetName = $(this).val();
                var config = null;
                if ($sheetSelect.val() !== sheetName) {
                    if (tempConfigs[sheetName]) {
                        config = tempConfigs[sheetName];
                        settings.existingConfigs[sheetName] = config;
                    }
                    else {
                        config = settings.existingConfigs[sheetName];
                    }
                }
                else if ($sheetSelect.val() === sheetName) {
                    config = getFormConfig(sheetName);
                    settings.existingConfigs[sheetName] = config;
                    delete tempConfigs[sheetName];
                }
                settings.saveCallback(config, sheetName);
                $('#saveConfigBtn').text("Saving...")
            });
            $('#saveConfigBtn').text("✓ Saved");
            setTimeout(function () {
                $('#saveConfigBtn').text("Save")
            }, 2000);
        });

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