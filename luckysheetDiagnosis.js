pasteHandlerOfCopyPaste: function (e) {
    if (!gr(h.luckysheet_select_save, h.currentSheetIndex)) return;

    let t = Q().paste;
    let l = $.extend(true, {}, h.config);
    l.merge == null && (l.merge = {});
    l.borderInfo == null && (l.borderInfo = []);

    const sourceSheetIndex = e.dataSheetIndex;
    const isSameSheet = sourceSheetIndex === h.currentSheetIndex;
    const canFastPath = isSameSheet && !e.RowlChange;

    let u = e.copyRange[0].row[0],
        d = e.copyRange[0].row[1],
        f = e.copyRange[0].column[0],
        m = e.copyRange[0].column[1];

    // =====================================================
    // 1️⃣ Collect copied matrix (FIXED – no transpose bug)
    // =====================================================
    let g = [];
    for (let i = 0; i < e.copyRange.length; i++) {
        let block = Nt(
            { row: e.copyRange[i].row, column: e.copyRange[i].column },
            sourceSheetIndex
        );
        g = g.concat(block);
    }

    let v = $.extend(true, [], g);
    let k = v.length;        // source rows
    let b = v[0].length;     // source cols

    // remove only spl (keep formulas)
    for (let r = 0; r < k; r++) {
        for (let c = 0; c < b; c++) {
            v[r][c] && delete v[r][c].spl;
        }
    }

    // =====================================================
    // 2️⃣ Target range MUST come from selection
    // =====================================================
    let w = h.luckysheet_select_save[h.luckysheet_select_save.length - 1];
    let sr = w.row[0],
        er = w.row[1],
        sc = w.column[0],
        ec = w.column[1];

    // =====================================================
    // 3️⃣ Merge validation
    // =====================================================
    if (l.merge && Dt(l, sr, er, sc, ec)) {
        de()
            ? alert(t.errorNotAllowMerged)
            : U.info(`<i class="fa fa-exclamation-triangle"></i>${t.warning}`, t.errorNotAllowMerged);
        return;
    }

    // =====================================================
    // 4️⃣ Expand sheet if needed
    // =====================================================
    let N = we.deepCopyFlowData(h.flowdata);
    let addR = er - N.length + 1;
    let addC = ec - N[0].length + 1;
    (addR > 0 || addC > 0) && (N = il([].concat(N), addR, addC, true));

    // =====================================================
    // 5️⃣ Paste cells (REPEAT pattern + SHIFT formulas)
    // =====================================================
    for (let r = sr; r <= er; r++) {
        let row = [].concat(N[r]);
        for (let c = sc; c <= ec; c++) {
            // 🔑 Correct repeat logic (column copy fixed)
            let src = v[(r - sr) % k][(c - sc) % b];
            let cell = src ? $.extend(true, {}, src) : null;

            if (cell && cell.f) {
                let Fe = cell.f;
                let rowShift = r - u;
                let colShift = c - f;

                rowShift > 0 && (Fe = "=" + p.functionCopy(Fe, "down", rowShift));
                rowShift < 0 && (Fe = "=" + p.functionCopy(Fe, "up", Math.abs(rowShift)));
                colShift > 0 && (Fe = "=" + p.functionCopy(Fe, "right", colShift));
                colShift < 0 && (Fe = "=" + p.functionCopy(Fe, "left", Math.abs(colShift)));

                // normalize formula WITHOUT calculating value
                let ae = p.execfunction(Fe, r, c, void 0, false);
                cell.f = ae[2];
                cell.v = null;
                cell.m = null;
            }

            row[c] = cell;
        }
        N[r] = row;
    }

    w.row = [sr, er];
    w.column = [sc, ec];

    Ye(N, h.luckysheet_select_save, { cfg: l, RowlChange: true });
    tt();

    const sheet = luckysheet.getSheet();

    // =====================================================
    // 🚀 FAST PATH – same sheet, simple copy
    // =====================================================
    if (canFastPath) {
        try {
            for (let r = sr; r <= er; r++) {
                for (let c = sc; c <= ec; c++) {
                    let cell = sheet.data[r][c];
                    if (cell && cell.f) {
                        Ucv(sheet, r, c, cell.f, true);
                    }
                }
            }
        } catch {}
        tt();
        return;
    }

    // =====================================================
    // 🛡️ SAFE PATH – deterministic rebuild
    // =====================================================
    try {
        sheet.calcChain = [];
        const data = sheet.data;

        for (let r = 0; r < data.length; r++) {
            for (let c = 0; c < data[r].length; c++) {
                let cell = data[r][c];
                if (cell && cell.f) {
                    Ucv(sheet, r, c, cell.f, false);
                }
            }
        }

        for (let i = 0; i < sheet.calcChain.length; i++) {
            let node = sheet.calcChain[i];
            if (node && node.func) {
                Ucv(sheet, node.r, node.c, node.func[2], true);
            }
        }
    } catch (err) {
        console.error("pasteHandlerOfCopyPaste calc failed", err);
    }

    tt();
}
