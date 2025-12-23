  pasteHandler: function (e, n) {
                if (!gr(h.luckysheet_select_save, h.currentSheetIndex) || h.allowEdit === !1)
                    return;

                const pasteCfg = Q().paste;

                if (h.luckysheet_select_save.length > 1) {
                    de()
                        ? alert(pasteCfg.errorNotAllowMulti)
                        : U.info(`<i class="fa fa-exclamation-triangle"></i>${pasteCfg.warning}`, pasteCfg.errorNotAllowMulti);
                    return;
                }

                const sel = h.luckysheet_select_save[0];
                const sr = sel.row[0];
                const sc = sel.column[0];

                let data = we.deepCopyFlowData(h.flowdata);
                let cfg = $.extend(true, {}, h.config);
                cfg.merge == null && (cfg.merge = {});
                cfg.rowlen == null && (cfg.rowlen = {});
                cfg.borderInfo == null && (cfg.borderInfo = []);

                let matrix;
                if (typeof e === "object") {
                    matrix = e;
                } else {
                    e = e.replace(/\r/g, "");
                    matrix = e.split("\n").map(r => r.split("\t"));
                }
                if (!matrix.length || !matrix[0].length) return;

                const er = sr + matrix.length - 1;
                const ec = sc + matrix[0].length - 1;

                if (cfg.merge && Dt(cfg, sr, er, sc, ec)) {
                    de()
                        ? alert(pasteCfg.errorNotAllowMerged)
                        : U.info(`<i class="fa fa-exclamation-triangle"></i>${pasteCfg.warning}`, pasteCfg.errorNotAllowMerged);
                    return;
                }

                const addR = er - data.length + 1;
                const addC = ec - data[0].length + 1;
                (addR > 0 || addC > 0) && (data = il([].concat(data), addR, addC, true));

                // =====================================================
                // 1️⃣ WRITE CELLS (NO CALC)
                // =====================================================
                const pastedFormulaCells = [];

                for (let r = 0; r < matrix.length; r++) {
                    let row = [].concat(data[sr + r]);
                    let rowH = cfg.rowlen[sr + r] || h.defaultrowlen;

                    for (let c = 0; c < matrix[r].length; c++) {
                        let target = {};
                        let cell = matrix[r][c];

                        if (typeof e === "object" && cell && typeof cell === "object") {
                            target = $.extend(true, {}, cell);

                            let fml =
                                cell.f ||
                                (typeof cell.v === "string" && cell.v.trim().startsWith("=") && cell.v.trim()) ||
                                (typeof cell.m === "string" && cell.m.trim().startsWith("=") && cell.m.trim());

                            if (fml) {
                                target.f = fml;
                                pastedFormulaCells.push([sr + r, sc + c, fml]);
                            }
                        } else {
                            let txt = String(cell).trim();
                            if (txt.startsWith("=") && !txt.startsWith("'")) {
                                target.v = txt;
                                target.f = txt;
                                pastedFormulaCells.push([sr + r, sc + c, txt]);
                            } else {
                                let t = it(txt);
                                target.v = t[2];
                                target.ct = t[1];
                                target.m = t[0];
                            }
                        }

                        row[sc + c] = target;
                        let hgt = be.getTextSize("田", ra(target))[1];
                        hgt > rowH && (rowH = hgt);
                    }

                    data[sr + r] = row;
                    rowH !== h.defaultrowlen && (cfg.rowlen[sr + r] = rowH);
                }

                h.luckysheet_select_save = [{ row: [sr, er], column: [sc, ec] }];
                Ye(data, h.luckysheet_select_save, { cfg: cfg, RowlChange: true });
                tt();

                // =====================================================
                // 2️⃣ INLINE calcChain REBUILD (CRITICAL)
                // =====================================================
                const sheet = luckysheet.getSheet();

                // 🔥 HARD RESET calcChain
                sheet.calcChain = [];

                // Re-register ALL formulas in sheet (not just pasted)
                const sheetsData = sheet.data || data;

                for (let r = 0; r < sheetsData.length; r++) {
                    for (let c = 0; c < sheetsData[r].length; c++) {
                        const cell = sheetsData[r][c];
                        if (cell && cell.f) {
                            try {
                                // false → register only
                                Ucv(sheet, r, c, cell.f, false);
                            } catch (e) { }
                        }
                    }
                }

                // =====================================================
                // 3️⃣ INLINE calculation pass (DETERMINISTIC)
                // =====================================================
                if (sheet.calcChain && sheet.calcChain.length) {
                    for (let i = 0; i < sheet.calcChain.length; i++) {
                        const node = sheet.calcChain[i];
                        if (!node || !node.func) continue;

                        const r = node.r;
                        const c = node.c;
                        const fml = node.func[2];

                        try {
                            Ucv(sheet, r, c, fml, true);
                        } catch (e) { }
                    }
                }

                tt();
            },
