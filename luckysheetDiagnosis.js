pasteHandlerOfCopyPaste: function (e) {
    if (!gr(h.luckysheet_select_save, h.currentSheetIndex)) return;

    let t = Q().paste;
    let l = $.extend(true, {}, h.config);
    l.merge == null && (l.merge = {});
    l.borderInfo == null && (l.borderInfo = []);

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
    // 1️⃣ Collect copied data (ORIGINAL LOGIC)
    // =====================================================
    for (let se = 0; se < e.copyRange.length; se++) {
        let ie = Nt({ row: e.copyRange[se].row, column: e.copyRange[se].column }, s);
        if (e.copyRange.length > 1) {
            if (u === e.copyRange[1].row[0] && d === e.copyRange[1].row[1]) {
                ie = ie[0].map((_, he) => ie.map(J => J[he]));
                g = g.concat(ie);
                y = true;
            } else if (f === e.copyRange[1].column[0] && m === e.copyRange[1].column[1]) {
                g = g.concat(ie);
            }
        } else {
            g = ie;
        }
    }
    y && (g = g[0].map((_, i) => g.map(r => r[i])));

    let v = $.extend(true, [], g);

    // remove only spl (NOT formulas)
    for (let r = 0; r < v.length; r++) {
        for (let c = 0; c < v[r].length; c++) {
            v[r][c] && delete v[r][c].spl;
        }
    }

    let k = v.length,
        b = v[0].length,
        w = h.luckysheet_select_save[h.luckysheet_select_save.length - 1],
        x = w.row[0],
        C = x + k - 1,
        S = w.column[0],
        _ = S + b - 1;

    // =====================================================
    // 2️⃣ Merge validation
    // =====================================================
    if (l.merge && Dt(l, x, C, S, _)) {
        de()
            ? alert(t.errorNotAllowMerged)
            : U.info(`<i class="fa fa-exclamation-triangle"></i>${t.warning}`, t.errorNotAllowMerged);
        return;
    }

    // =====================================================
    // 3️⃣ Expand sheet if needed
    // =====================================================
    let N = we.deepCopyFlowData(h.flowdata);
    let addR = C - N.length + 1;
    let addC = _ - N[0].length + 1;
    (addR > 0 || addC > 0) && (N = il([].concat(N), addR, addC, true));

    // =====================================================
    // 4️⃣ Paste cells (SHIFT + NORMALIZE FORMULAS ONLY)
    // =====================================================
    const isSameSheet = s === h.currentSheetIndex;
    const fastPath = isSameSheet && !o;

    for (let G = x; G <= C; G++) {
        let row = [].concat(N[G]);
        for (let pe = S; pe <= _; pe++) {
            let src = v[G - x] && v[G - x][pe - S];
            let oe = src ? $.extend(true, {}, src) : null;

            if (oe && oe.f) {
                let Fe = oe.f;
                let ue = G - u;
                let he = pe - f;

                ue > 0 && (Fe = "=" + p.functionCopy(Fe, "down", ue));
                ue < 0 && (Fe = "=" + p.functionCopy(Fe, "up", Math.abs(ue)));
                he > 0 && (Fe = "=" + p.functionCopy(Fe, "right", he));
                he < 0 && (Fe = "=" + p.functionCopy(Fe, "left", Math.abs(he)));

                // 🔑 Normalize formula WITHOUT calculating value
                let ae = p.execfunction(Fe, G, pe, void 0, false);
                oe.f = ae[2];
                oe.v = null;
                oe.m = null;
            }

            row[pe] = oe;
        }
        N[G] = row;
    }

    w.row = [x, C];
    w.column = [S, _];

    Ye(N, h.luckysheet_select_save, { cfg: l, RowlChange: true });
    tt();

    const sheet = luckysheet.getSheet();

    // =====================================================
    // 🚀 FAST PATH – same sheet simple copy
    // =====================================================
    if (fastPath) {
        try {
            for (let r = x; r <= C; r++) {
                for (let c = S; c <= _; c++) {
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
    // 🛡️ SAFE PATH – deterministic full rebuild
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
