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
    cfg.merge ??= {};
    cfg.rowlen ??= {};
    cfg.borderInfo ??= [];

    // ---------------- Normalize input ----------------
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
                if (target.f) {
                    pastedFormulaCells.push([sr + r, sc + c, target.f]);
                }
            } else {
                let txt = String(cell).trim();
                if (txt.startsWith("=") && !txt.startsWith("'")) {
                    target.f = txt;
                    target.v = null;
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
    // 🚀 FAST PATH — NO FORMULAS
    // =====================================================
    if (pastedFormulaCells.length === 0) {
        // Plain text / values paste — DONE
        return;
    }

    // =====================================================
    // 🛡️ SAFE PATH — FORMULAS PRESENT
    // =====================================================
    try {
        const sheet = luckysheet.getSheet();
        const sheetData = sheet.data;

        sheet.calcChain = [];

        // Register all formulas
        for (let r = 0; r < sheetData.length; r++) {
            for (let c = 0; c < sheetData[r].length; c++) {
                let cell = sheetData[r][c];
                if (cell && cell.f) {
                    Ucv(sheet, r, c, cell.f, false);
                }
            }
        }

        // Calculate deterministically
        for (let i = 0; i < sheet.calcChain.length; i++) {
            let node = sheet.calcChain[i];
            if (node && node.func) {
                Ucv(sheet, node.r, node.c, node.func[2], true);
            }
        }
    } catch (err) {
        console.error("pasteHandler calc failed", err);
    }

    tt();
}
