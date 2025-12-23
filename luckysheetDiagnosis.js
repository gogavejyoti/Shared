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

    // ---------------- Parse clipboard ----------------
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

    // ---------------- Detect formulas ----------------
    const pastedFormulaCells = [];
    let hasFormula = false;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = matrix[r][c];
            const txt = isObjectPaste
                ? (cell && (cell.f || cell.v || cell.m))
                : String(cell).trim();

            if (typeof txt === "string" && txt.startsWith("=") && !txt.startsWith("'")) {
                hasFormula = true;
                pastedFormulaCells.push([sr + r, sc + c, txt]);
            }
        }
    }

    // ---------------- Config ----------------
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

    // ---------------- DATA STRATEGY ----------------
    let data;

    if (!hasFormula && !isObjectPaste) {
        // 🚀 FAST PATH: values-only external paste
        data = h.flowdata;
        for (let r = sr; r <= er; r++) {
            data[r] = [].concat(data[r]);
        }
    } else {
        // 🛡️ SAFE PATH
        data = we.deepCopyFlowData(h.flowdata);
    }

    // Expand grid if needed
    let addR = er - data.length + 1;
    let addC = ec - data[0].length + 1;
    (addR > 0 || addC > 0) && (data = il([].concat(data), addR, addC, true));

    // ---------------- WRITE CELLS ----------------
    for (let r = 0; r < rows; r++) {
        let row = [].concat(data[sr + r]);
        let rowH = cfg.rowlen[sr + r] || h.defaultrowlen;

        for (let c = 0; c < cols; c++) {
            let target = {};
            let src = matrix[r][c];

            if (isObjectPaste && src && typeof src === "object") {
                target = $.extend(true, {}, src);
                if (target.f) target.v = null;
            } else {
                let txt = String(src).trim();
                if (txt.startsWith("=") && !txt.startsWith("'")) {
                    target.f = txt;
                    target.v = null;
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

    // ---------------- 🚀 NO FORMULAS → DONE ----------------
    if (!hasFormula) return;

    // ---------------- 🧮 LOCALIZED CALC ----------------
    const sheet = luckysheet.getSheet();

    // Register ONLY pasted formulas
    for (let i = 0; i < pastedFormulaCells.length; i++) {
        const [r, c, fml] = pastedFormulaCells[i];
        Ucv(sheet, r, c, fml, false);
    }

    // Calculate ONLY affected chain
    const chain = sheet.calcChain || [];
    for (let i = 0; i < chain.length; i++) {
        const node = chain[i];
        if (node && node.func) {
            Ucv(sheet, node.r, node.c, node.func[2], true);
        }
    }

    tt();
}
