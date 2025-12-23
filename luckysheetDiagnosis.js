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
        e = String(e || "").replace(/\r/g, "");
        matrix = e.split("\n").map(r => r.split("\t"));
    }

    if (!matrix.length || !matrix[0].length) return;

    const rows = matrix.length;
    const cols = matrix[0].length;
    const er = sr + rows - 1;
    const ec = sc + cols - 1;

    /* =====================================================
       2️⃣ Detect formulas
    ===================================================== */
    const formulaCells = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const v = isObjectPaste
                ? matrix[r][c]?.f
                : String(matrix[r][c]).trim();

            if (typeof v === "string" && v.startsWith("=") && !v.startsWith("'")) {
                formulaCells.push([sr + r, sc + c]);
            }
        }
    }

    const hasFormula = formulaCells.length > 0;

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
       4️⃣ Data strategy
    ===================================================== */
    let data;

    if (!hasFormula && !isObjectPaste) {
        // 🚀 FAST — values only
        data = h.flowdata;
        for (let r = sr; r <= er; r++) {
            data[r] = [].concat(data[r]);
        }
    } else {
        data = we.deepCopyFlowData(h.flowdata);
    }

    // expand grid
    let addR = er - data.length + 1;
    let addC = ec - data[0].length + 1;
    (addR > 0 || addC > 0) && (data = il([].concat(data), addR, addC, true));

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
                if (cell.f) {
                    cell.f = String(cell.f);
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
       6️⃣ WINDOWED DEPENDENCY GRAPH + TOPO-STYLE RECALC
    ===================================================== */
    const sheet = luckysheet.getSheet();

    // choose dependency window
    const PAD = formulaCells.length > 50 ? 200 : 50;

    let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
    for (let [r, c] of formulaCells) {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
    }

    const r1 = Math.max(0, minR - PAD);
    const r2 = Math.min(sheet.data.length - 1, maxR + PAD);
    const c1 = Math.max(0, minC - PAD);
    const c2 = Math.min(sheet.data[0].length - 1, maxC + PAD);

    // clear chain
    sheet.calcChain = [];

    // register dependencies (graph build)
    for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
            const ce = sheet.data[r]?.[c];
            if (ce && ce.f) {
                Ucv(sheet, r, c, ce.f, false);
            }
        }
    }

    // topo-style execution (only affected nodes)
    for (let node of sheet.calcChain) {
        if (
            node &&
            node.r >= r1 && node.r <= r2 &&
            node.c >= c1 && node.c <= c2 &&
            node.func
        ) {
            Ucv(sheet, node.r, node.c, node.func[2], true);
        }
    }

    tt();
}
