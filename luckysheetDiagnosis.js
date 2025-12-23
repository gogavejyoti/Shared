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
    let hasFormula = false;

    for (let r = 0; r < rows && !hasFormula; r++) {
        for (let c = 0; c < cols; c++) {
            const v = isObjectPaste
                ? matrix[r][c]?.f
                : String(matrix[r][c]).trim();

            if (typeof v === "string" && v.startsWith("=") && !v.startsWith("'")) {
                hasFormula = true;
                break;
            }
        }
    }

    // ---------------- Config ----------------
    let cfg = $.extend(true, {}, h.config);
    cfg.merge ??= {};
    cfg.rowlen ??= {};

    if (cfg.merge && Dt(cfg, sr, er, sc, ec)) {
        de()
            ? alert(pasteCfg.errorNotAllowMerged)
            : U.info(`<i class="fa fa-exclamation-triangle"></i>${pasteCfg.warning}`, pasteCfg.errorNotAllowMerged);
        return;
    }

    // ---------------- Data copy ----------------
    let data;

    if (!hasFormula && !isObjectPaste) {
        // 🚀 FAST & SAFE: values only
        data = h.flowdata;
        for (let r = sr; r <= er; r++) {
            data[r] = [].concat(data[r]);
        }
    } else {
        // 🔒 SAFE: formulas involved
        data = we.deepCopyFlowData(h.flowdata);
    }

    // Expand grid if needed
    let addR = er - data.length + 1;
    let addC = ec - data[0].length + 1;
    (addR > 0 || addC > 0) && (data = il([].concat(data), addR, addC, true));

    // ---------------- Write cells ----------------
    for (let r = 0; r < rows; r++) {
        let row = [].concat(data[sr + r]);

        for (let c = 0; c < cols; c++) {
            let cell = {};
            let src = matrix[r][c];

            if (isObjectPaste && src && typeof src === "object") {
                cell = $.extend(true, {}, src);
                cell.v = null;
            } else {
                let txt = String(src).trim();
                if (txt.startsWith("=") && !txt.startsWith("'")) {
                    cell.f = txt;
                    cell.v = null;
                } else {
                    let parsed = it(txt);
                    cell.m = parsed[0];
                    cell.ct = pa
