update: function () {
    let e = this;
    if (!gr([e.applyRange], h.currentSheetIndex) || h.allowEdit === !1) return;

    let n = we.deepCopyFlowData(h.flowdata);
    let t = h.luckysheetfile[K(h.currentSheetIndex)];
    let l = $.extend(true, {}, h.config);
    let a = Ur();
    let o = $.extend(true, {}, t.dataVerification);

    let s = e.direction;          // down | up | left | right
    let d = e.copyRange;
    let f = d.row[0], m = d.row[1];
    let g = d.column[0], y = d.column[1];

    let v = e.getCopyData(n, f, m, g, y, s);
    let k;
    if (s === "down" || s === "up") k = m - f + 1;
    else k = y - g + 1;

    let b = e.applyRange;
    let w = b.row[0], x = b.row[1];
    let C = b.column[0], S = b.column[1];

    l.merge == null && (l.merge = {});
    l.borderInfo == null && (l.borderInfo = []);

    // =====================================================
    // 1️⃣ APPLY DATA (SHIFT FORMULAS ONLY – NO CALC)
    // =====================================================
    if (s === "down" || s === "up") {
        let A = x - w + 1;

        for (let R = C; R <= S; R++) {
            let I = v[R - C];
            let F = e.getApplyData(I, k, A);

            if (s === "down") {
                for (let N = w; N <= x; N++) {
                    let D = $.extend(true, {}, F[N - w]);

                    if (D.f != null) {
                        let z = "=" + p.functionCopy(D.f, "down", N - w + 1);
                        D.f = z;
                        D.v = null;
                        D.m = null;
                        delete D.spl;
                    }

                    n[N][R] = D;

                    let E = f + (N - w) % k, P = R;
                    if (a[E + "_" + P]) {
                        l.borderInfo.push({
                            rangeType: "cell",
                            value: { row_index: N, col_index: R, ...a[E + "_" + P] }
                        });
                    }
                    o[E + "_" + P] && (o[N + "_" + R] = o[E + "_" + P]);
                }
            }

            if (s === "up") {
                for (let N = x; N >= w; N--) {
                    let D = $.extend(true, {}, F[x - N]);

                    if (D.f != null) {
                        let z = "=" + p.functionCopy(D.f, "up", x - N + 1);
                        D.f = z;
                        D.v = null;
                        D.m = null;
                        delete D.spl;
                    }

                    n[N][R] = D;

                    let E = m - (x - N) % k, P = R;
                    if (a[E + "_" + P]) {
                        l.borderInfo.push({
                            rangeType: "cell",
                            value: { row_index: N, col_index: R, ...a[E + "_" + P] }
                        });
                    }
                    o[E + "_" + P] && (o[N + "_" + R] = o[E + "_" + P]);
                }
            }
        }
    }

    if (s === "right" || s === "left") {
        let A = S - C + 1;

        for (let R = w; R <= x; R++) {
            let I = v[R - w];
            let F = e.getApplyData(I, k, A);

            if (s === "right") {
                for (let N = C; N <= S; N++) {
                    let D = $.extend(true, {}, F[N - C]);

                    if (D.f != null) {
                        let z = "=" + p.functionCopy(D.f, "right", N - C + 1);
                        D.f = z;
                        D.v = null;
                        D.m = null;
                        delete D.spl;
                    }

                    n[R][N] = D;

                    let E = R, P = g + (N - C) % k;
                    if (a[E + "_" + P]) {
                        l.borderInfo.push({
                            rangeType: "cell",
                            value: { row_index: R, col_index: N, ...a[E + "_" + P] }
                        });
                    }
                    o[E + "_" + P] && (o[R + "_" + N] = o[E + "_" + P]);
                }
            }

            if (s === "left") {
                for (let N = S; N >= C; N--) {
                    let D = $.extend(true, {}, F[S - N]);

                    if (D.f != null) {
                        let z = "=" + p.functionCopy(D.f, "left", S - N + 1);
                        D.f = z;
                        D.v = null;
                        D.m = null;
                        delete D.spl;
                    }

                    n[R][N] = D;

                    let E = R, P = y - (S - N) % k;
                    if (a[E + "_" + P]) {
                        l.borderInfo.push({
                            rangeType: "cell",
                            value: { row_index: R, col_index: N, ...a[E + "_" + P] }
                        });
                    }
                    o[E + "_" + P] && (o[R + "_" + N] = o[E + "_" + P]);
                }
            }
        }
    }

    // =====================================================
    // 2️⃣ APPLY TO SHEET
    // =====================================================
    let T = {
        cfg: l,
        dataVerification: o
    };
    Ye(n, h.luckysheet_select_save, T);
    tt();

    // =====================================================
    // 3️⃣ INLINE calcChain REBUILD + CALC (DETERMINISTIC)
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

        // Calculate in chain order
        if (sheet.calcChain) {
            for (let i = 0; i < sheet.calcChain.length; i++) {
                let node = sheet.calcChain[i];
                if (node && node.func) {
                    Ucv(sheet, node.r, node.c, node.func[2], true);
                }
            }
        }
    } catch (err) {
        console.error("update recalculation failed", err);
    }

    tt();
}
