pasteHandler: function (e) {
    if (!gr(h.luckysheet_select_save, h.currentSheetIndex) || h.allowEdit === false) {
        return;
    }

    const sel = h.luckysheet_select_save[0];
    const sr = sel.row[0];
    const sc = sel.column[0];

    /* =====================================================
       1️⃣ Normalize clipboard
    ===================================================== */
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

    /* =====================================================
       2️⃣ Detect formulas (STRICT)
    ===================================================== */
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

    /* =====================================================
       3️⃣ Config & merge check
    ===================================================== */
    let cfg = $.extend(true, {}, h.config);
    cfg.merge ??= {};
    cfg.rowlen ??= {};

    if (cfg.merge && Dt(cfg, sr, er, sc, ec)) {
        alert("Cannot paste into merged cells");
        return;
    }

    /* =====================================================
       4️⃣ Data strategy (CRITICAL)
    ===================================================== */
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

    // expand grid if needed
    let addR = er - data.length + 1;
    let addC = ec - data[0].length + 1;
    if (addR > 0 || addC > 0) {
        data = il([].concat(data), addR, addC, true);
    }

    /* =====================================================
       5️⃣ Write cells (NO CALC)
    ===================================================== */
    for (let r = 0; r < rows; r++) {
        let row = [].concat(data[sr + r]);

        for (let c = 0; c < cols; c++) {
            let cell = {};
            let src = matrix[r][c];

            if (isObjectPaste && src && typeof src === "object") {
                cell = $.extend(true, {}, src);

                // 🔑 normalize formula (NO calculation)
                if (cell.f) {
                    const rr = sr + r;
                    const cc = sc + c;
                    const norm = this.execfunction(cell.f, rr, cc, void 0, false);
                    cell.f = norm[2];
                    cell.v = null;
                    delete cell.spl;
                }
            } else {
                let txt = String(src).trim();

                if (txt.startsWith("=") && !txt.startsWith("'")) {
                    cell.f = txt;
                    cell.v = null;
                } else {
                    let parsed = it(txt);
                    cell.m = parsed[0];
                    cell.ct = parsed[1];
                    cell.v = parsed[2];
                }
            }

            row[sc + c] = cell;
        }

        data[sr + r] = row;
    }

    h.luckysheet_select_save = [{ row: [sr, er], column: [sc, ec] }];
    Ye(data, h.luckysheet_select_save, { cfg: cfg, RowlChange: true });
    tt();

    /* =====================================================
       🚀 VALUES ONLY → DONE
    ===================================================== */
    if (!hasFormula) return;

    /* =====================================================
       🔒 FULL REBUILD (ONLY SAFE WAY)
    ===================================================== */
    const sheet = luckysheet.getSheet();
    sheet.calcChain = [];

    const sd = sheet.data;
    for (let r = 0; r < sd.length; r++) {
        for (let c = 0; c < sd[r].length; c++) {
            let ce = sd[r][c];
            if (ce && ce.f) {
                Ucv(sheet, r, c, ce.f, false);
            }
        }
    }

    for (let node of sheet.calcChain) {
        if (node?.func) {
            Ucv(sheet, node.r, node.c, node.func[2], true);
        }
    }

    tt();
}
