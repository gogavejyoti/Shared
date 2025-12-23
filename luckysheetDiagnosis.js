pasteHandlerOfCopyPaste: function (e) {
    if (!gr(h.luckysheet_select_save, h.currentSheetIndex)) return;

    let t = Q().paste;
    let l = $.extend(true, {}, h.config);
    l.merge == null && (l.merge = {});
    l.borderInfo == null && (l.borderInfo = []);

    const isSameSheet = e.dataSheetIndex === h.currentSheetIndex;
    const canFastPath = isSameSheet && !e.RowlChange;

    let a = e.HasMC,
        s = e.dataSheetIndex,
        u = e.copyRange[0].row[0],
        d = e.copyRange[0].row[1],
        f = e.copyRange[0].column[0],
        m = e.copyRange[0].column[1],
        g = [],
        transposed = false;

    // =====================================================
    // 1️⃣ Collect copied matrix (unchanged logic)
    // =====================================================
    for (let i = 0; i < e.copyRange.length; i++) {
        let block = Nt({ row: e.copyRange[i].row, column: e.copyRange[i].column }, s);
        if (e.copyRange.length > 1) {
            if (u === e.copyRange[1].row[0] && d === e.copyRange[1].row[1]) {
                block = block[0].map((_, k) => block.map(r => r[k]));
                g = g.concat(block);
                transposed = true;
            } else {
                g = g.concat(block);
            }
        } else {
            g = block;
        }
    }
    transposed && (g = g[0].map((_, i) => g.map(r => r[i])));

    let v = $.extend(true, [], g);

    // remove spl only, NOT formulas
    for (let r = 0; r < v.length; r++) {
        for (let c = 0; c < v[r].length; c++) {
            v[r][c] && delete v[r][c].spl;
        }
    }

    let k = v.length,
        b = v[0].length,
        sel = h.luckysheet_select_save[h.luckysheet_select_save.length - 1],
        sr = sel.row[0],
        er = sr + k - 1,
        sc = sel.column[0],
        ec = sc + b - 1;

    // =====================================================
    // 2️⃣ Merge validation
    // =====================================================
    if (l.merge && Dt(l, sr, er, sc, ec)) {
        de()
            ? alert(t.errorNotAllowMerged)
            : U.info(`<i class="fa fa-exclamation-triangle"></i>${t.warning}`, t.errorNotAllowMerged);
        return;
    }

    // =====================================================
    // 3️⃣ Expand sheet if required
    // =====================================================
    let N = we.deepCopyFlowData(h.flowdata);
    let addR = er - N.length + 1;
    let addC = ec - N[0].length + 1;
    (addR > 0 || addC > 0) && (N = il([].concat(N), addR, addC, true));

    // =====================================================
    // 4️⃣ Write cells (NO calculation)
    // =====================================================
    for (let r = sr; r <= er; r++) {
        let row = [].concat(N[r]);
        for (let c = sc; c <= ec; c++) {
            let src = v[r - sr] && v[r - sr][c - sc];
            let cell = src ? $.extend(true, {}, src) : null;

            if (cell && cell.f) {
                // shift formula ONLY
                cell.v = null;
                cell.m = null;
            }
            row[c] = cell;
        }
        N[r] = row;
    }

    sel.row = [sr, er];
    sel.column = [sc, ec];

    Ye(N, h.luckysheet_select_save, { cfg: l, RowlChange: true });
    tt();

    const sheet = luckysheet.getSheet();

    // =====================================================
    // 🚀 FAST PATH (same sheet, simple copy)
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
        } catch (e) {}
        tt();
        return;
    }

    // =====================================================
    // 🛡️ SAFE PATH (cross-sheet / complex)
    // =====================================================
    try {
        const data = sheet.data;

        // hard reset
        sheet.calcChain = [];

        // register all formulas
        for (let r = 0; r < data.length; r++) {
            for (let c = 0; c < data[r].length; c++) {
                let cell = data[r][c];
                if (cell && cell.f) {
                    Ucv(sheet, r, c, cell.f, false);
                }
            }
        }

        // deterministic calculation
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
