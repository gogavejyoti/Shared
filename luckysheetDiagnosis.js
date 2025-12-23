pasteHandlerOfCopyPaste: function (e) {
    if (!gr(h.luckysheet_select_save, h.currentSheetIndex)) return;

    let t = Q().paste;
    let l = $.extend(true, {}, h.config);
    l.merge == null && (l.merge = {});

    let a = e.HasMC,
        o = e.RowlChange,
        s = e.dataSheetIndex,
        u = e.copyRange[0].row[0],
        d = e.copyRange[0].row[1],
        f = e.copyRange[0].column[0],
        m = e.copyRange[0].column[1],
        g = [],
        y = false;

    // =====================================================
    // 1️⃣ Collect copied data (UNCHANGED logic)
    // =====================================================
    for (let se = 0; se < e.copyRange.length; se++) {
        let ie = Nt({ row: e.copyRange[se].row, column: e.copyRange[se].column }, s);
        if (e.copyRange.length > 1) {
            if (u == e.copyRange[1].row[0] && d == e.copyRange[1].row[1]) {
                ie = ie[0].map((_, he) => ie.map(J => J[he]));
                g = g.concat(ie);
                y = true;
            } else if (f == e.copyRange[1].column[0] && m == e.copyRange[1].column[1]) {
                g = g.concat(ie);
            }
        } else {
            g = ie;
        }
    }
    y && (g = g[0].map((_, i) => g.map(r => r[i])));

    let v = $.extend(true, [], g);

    // ❌ REMOVE formula evaluation from copied data
    if (e.copyRange.length > 1) {
        for (let r = 0; r < v.length; r++) {
            for (let c = 0; c < v[r].length; c++) {
                if (v[r][c] && v[r][c].f != null) {
                    delete v[r][c].spl;
                }
            }
        }
    }

    let k = v.length,
        b = v[0].length,
        w = h.luckysheet_select_save[h.luckysheet_select_save.length - 1],
        x = w.row[0],
        C = w.row[1],
        S = w.column[0],
        _ = w.column[1];

    let T = (C - x + 1) % k,
        A = (_ - S + 1) % b;

    (T !== 0 || A !== 0) && (C = x + k - 1, _ = S + b - 1);

    // =====================================================
    // 2️⃣ Merge validation
    // =====================================================
    if (l.merge && Dt(l, x, C, S, _)) {
        de() ? alert(t.errorNotAllowMerged)
             : U.info(`<i class="fa fa-exclamation-triangle"></i>${t.warning}`, t.errorNotAllowMerged);
        return;
    }

    let N = we.deepCopyFlowData(h.flowdata),
        D = N.length,
        E = N[0].length,
        P = k + x - D,
        z = b + S - E;

    (P > 0 || z > 0) && (N = il([].concat(N), P, z, true));

    // =====================================================
    // 3️⃣ WRITE CELLS (NO CALC, NO execfunction)
    // =====================================================
    for (let r = x; r <= C; r++) {
        let row = [].concat(N[r]);
        for (let c = S; c <= _; c++) {
            let src = v[r - x] && v[r - x][c - S];
            let cell = src ? $.extend(true, {}, src) : null;

            // ⚠️ DO NOT calculate formula here
            if (cell && cell.f) {
                cell.v = null;
                cell.m = null;
                delete cell.spl;
            }

            row[c] = cell;
        }
        N[r] = row;
    }

    w.row = [x, C];
    w.column = [S, _];

    // =====================================================
    // 4️⃣ APPLY DATA
    // =====================================================
    Ye(N, h.luckysheet_select_save, { cfg: l, RowlChange: true });
    tt();

    // =====================================================
    // 5️⃣ INLINE calcChain rebuild + calculation (100% SAFE)
    // =====================================================
    try {
        const sheet = luckysheet.getSheet();
        const data = sheet.data;

        // HARD RESET
        sheet.calcChain = [];

        // Register all formulas
        for (let r = 0; r < data.length; r++) {
            for (let c = 0; c < data[r].length; c++) {
                let cell = data[r][c];
                if (cell && cell.f) {
                    Ucv(sheet, r, c, cell.f, false); // register only
                }
            }
        }

        // Calculate deterministically
        if (sheet.calcChain) {
            for (let i = 0; i < sheet.calcChain.length; i++) {
                let node = sheet.calcChain[i];
                if (!node || !node.func) continue;
                Ucv(sheet, node.r, node.c, node.func[2], true);
            }
        }
    } catch (err) {
        console.error("pasteHandlerOfCopyPaste calc failed", err);
    }

    tt();
}
