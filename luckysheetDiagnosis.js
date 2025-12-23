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

    // =====================================================
    // 1️⃣ Normalize clipboard data
    // =====================================================
    let matrix;
    const isObjectPaste = typeof e === "object";

    if (isObjectPaste) {
        matrix = e;
    } else {
        e = e.replace(/\r/g, "");
        matrix = e.split("\n").map(r => r.split("\t"));
    }

    if (!matrix.length || !matrix[0].length) return;

    const rows = matrix.length;
    const cols = matrix[0].length;
    const er = sr + rows - 1;
    const ec = sc + cols - 1;

    // =====================================================
    // 2️⃣ Detect formulas in pasted content
    // =====================================================
    let hasFormula = false;

    if (isObjectPaste) {
        outer:
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (matrix[r][c] && matrix[r][c].f) {
                    hasFormula = true;
                    break outer;
                }
            }
        }
    } else {
        outer:
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const v = String(matrix[r][c]).trim();
                if (v.startsWith("=") && !v.startsWith("'")) {
                    hasFormula = true;
                    break outer;
                }
            }
        }
    }

    // =====================================================
    // 3️⃣ Prepare config
    // =====================================================
    let cfg = $.extend(true, {}, h.config);
    cfg.merge ??= {};
    cfg.rowlen ??= {};
    cfg.borderInfo ??= [];

    if (cfg.merge && Dt(cfg, sr, er, sc, ec)) {
        de()
            ? alert(pasteCfg.errorNotAllowMerged)
            : U.info(`<i class="fa fa-exclamation-triangle"></i>${pasteCfg.warning}`, pasteCfg.errorNotAllowMerged);
        return;
    }

    // =====================================================
    // 4️⃣ DATA STRATEGY (THIS IS THE BIG PERFORMANCE WIN)
    // =====================================================
    let data;

    if (!hasFormula && !isObjectPaste) {
        // 🚀 FAST PATH — values only, external paste
        data = h.flowdata;

        // clone only affected rows
        for (let r = sr; r <= er; r++) {
            data[r] = [].concat(data[r]);
        }
    } else {
        // 🛡️ SAFE PATH — formulas involved
        data = we.deepCopyFlowData(h.flowdata);
    }

    // expand sheet if required
    let addR = er - data.length + 1;
    let addC = ec - data[0].length + 1;
    (addR > 0 || addC > 0) && (data = il([].concat(data), addR, addC, true));

    // =====================================================
    // 5️⃣ WRITE CELLS (NO CALC)
    // =====================================================
    const pastedFormulaCells = [];

    for (let r = 0; r < rows; r++) {
        let row = [].concat(data[sr + r]);
        let maxH = cfg.rowlen[sr + r] || h.defaultrowlen;

        for (let c = 0; c < cols; c++) {
            let cell = {};

            if (isObjectPaste) {
                let src = matrix[r][c];
                src && (cell = $.extend(true, {}, src));
                cell && cell.f && pastedFormulaCells.push([sr + r, sc + c, cell.f]);
            } else {
                let txt = String(matrix[r][c]).trim();

                if (txt.startsWith("=") && !txt.startsWith("'")) {
                    cell.f = txt;
                    cell.v = null;
                    pastedFormulaCells.push([sr + r, sc + c, txt]);
                } else {
                    let parsed = it(txt);
                    cell.m = parsed[0];
                    cell.ct = parsed[1];
                    cell.v = parsed[2];
                }
            }

            row[sc + c] = cell;

            let hgt = be.getTextSize("田", ra(cell))[1];
            hgt > maxH && (maxH = hgt);
        }

        data[sr + r] = row;
        maxH !== h.defaultrowlen && (cfg.rowlen[sr + r] = maxH);
    }

    h.luckysheet_select_save = [{ row: [sr, er], column: [sc, ec] }];
    Ye(data, h.luckysheet_select_save, { cfg: cfg, RowlChange: true });
    tt();

    // =====================================================
    // 🚀 FAST EXIT — NO FORMULAS
    // =====================================================
    if (!hasFormula) return;

    // =====================================================
    // 🛡️ SAFE CALC — FORMULAS PRESENT
    // =====================================================
    try {
        const sheet = luckysheet.getSheet();
        const sheetData = sheet.data;

        sheet.calcChain = [];

        // register
        for (let r = 0; r < sheetData.length; r++) {
            for (let c = 0; c < sheetData[r].length; c++) {
                let ce = sheetData[r][c];
                ce && ce.f && Ucv(sheet, r, c, ce.f, false);
            }
        }

        // calculate
        for (let i = 0; i < sheet.calcChain.length; i++) {
            let node = sheet.calcChain[i];
            node && node.func && Ucv(sheet, node.r, node.c, node.func[2], true);
        }
    } catch (err) {
        console.error("pasteHandler calc failed", err);
    }

    tt();
}
