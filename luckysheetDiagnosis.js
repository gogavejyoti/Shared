            pasteHandler: function (e, n) {
                if (!gr(h.luckysheet_select_save, h.currentSheetIndex) || h.allowEdit === !1)
                    return;
                let l = Q().paste;

                if (h.luckysheet_select_save.length > 1 &&
                    (de() ? alert(l.errorNotAllowMulti) : U.info(`<i class="fa fa-exclamation-triangle"></i>${l.warning}`, l.errorNotAllowMulti))) {
                    return;
                }

                if (typeof e == "object") {
                    if (e.length == 0) return;

                    let a = $.extend(!0, {}, h.config);
                    a.merge == null && (a.merge = {}),
                        JSON.stringify(n).length > 2 && a.borderInfo == null && (a.borderInfo = []);

                    let o = e.length,
                        s = e[0].length,
                        u = h.luckysheet_select_save[0].row[0],
                        d = u + o - 1,
                        f = h.luckysheet_select_save[0].column[0],
                        m = f + s - 1,
                        g = !1;

                    if (a.merge != null && (g = Dt(a, u, d, f, m)), g) {
                        de() ? alert(l.errorNotAllowMerged) : U.info(`<i class="fa fa-exclamation-triangle"></i>${l.warning}`, l.errorNotAllowMerged);
                        return;
                    }

                    let y = we.deepCopyFlowData(h.flowdata),
                        v = y.length,
                        k = y[0].length,
                        b = d - v + 1,
                        w = m - k + 1;

                    (b > 0 || w > 0) && (y = il([].concat(y), b, w, !0)),
                        a.rowlen == null && (a.rowlen = {});

                    let x = !1,
                        C = {};

                    // NEW: queue for Ucv calls (detect formulas in object payload: f OR v/m starting with '=')
                    const __ucvQueue = [];

                    for (let S = u; S <= d; S++) {
                        let _ = [].concat(y[S]),
                            T = h.defaultrowlen;
                        a.rowlen[S] != null && (T = a.rowlen[S]);

                        for (let A = f; A <= m; A++) {
                            L(_[A]) == "object" && "mc" in _[A] &&
                                ("rs" in _[A].mc && delete a.merge[_[A].mc.r + "_" + _[A].mc.c], delete _[A].mc);

                            let R = null;
                            if (e[S - u] != null && e[S - u][A - f] != null && (R = e[S - u][A - f]),
                                _[A] = $.extend(!0, {}, R),

                                // NEW: if source cell has a formula, queue Ucv call
                                //      handle both shapes: R.f OR strings in R.v/R.m that start with '='
                                R && (
                                    (R.f && __ucvQueue.push([S, A, R.f])) ||
                                    (typeof R.v === "string" && R.v.trim().charAt(0) === "=" && __ucvQueue.push([S, A, R.v.trim()])) ||
                                    (typeof R.m === "string" && R.m.trim().charAt(0) === "=" && __ucvQueue.push([S, A, R.m.trim()]))
                                ),

                                R != null && "mc" in _[A] &&
                                (_[A].mc.rs != null ? (
                                    _[A].mc.r = S,
                                    _[A].mc.c = A,
                                    a.merge[_[A].mc.r + "_" + _[A].mc.c] = _[A].mc,
                                    C[R.mc.r + "_" + R.mc.c] = [_[A].mc.r, _[A].mc.c]
                                ) : _[A] = { mc: { r: C[R.mc.r + "_" + R.mc.c][0], c: C[R.mc.r + "_" + R.mc.c][1] } }),
                                n[S - u + "_" + (A - f)]) {

                                let N = {
                                    rangeType: "cell",
                                    value: {
                                        row_index: S,
                                        col_index: A,
                                        l: n[S - u + "_" + (A - f)].l,
                                        r: n[S - u + "_" + (A - f)].r,
                                        t: n[S - u + "_" + (A - f)].t,
                                        b: n[S - u + "_" + (A - f)].b
                                    }
                                };
                                a.borderInfo.push(N);
                            }

                            let I = ra(_[A]),
                                F = be.getTextSize("\u7530", I)[1];
                            F > T && (T = F, x = !0);
                        }

                        y[S] = _;
                        T != h.defaultrowlen && (a.rowlen[S] = T);
                    }

                    if (h.luckysheet_select_save = [{ row: [u, d], column: [f, m] }],
                        b > 0 || w > 0 || x) {
                        Ye(y, h.luckysheet_select_save, { cfg: a, RowlChange: !0 });
                    } else {
                        Ye(y, h.luckysheet_select_save, { cfg: a });
                        tt();
                    }

                    // NEW: after apply, call Ucv for queued formulas (handles e with v/m like '=A1', '=B1', '=C1')
                    if (__ucvQueue.length) {
                        const __sheet = luckysheet.getSheet();
                        for (const [__r, __c, __f] of __ucvQueue) {
                            try { Ucv(__sheet, __r, __c, __f, true); } catch (err) { }
                        }
                        tt();
                    }

                } else {
                    e = e.replace(/\r/g, "");
                    let a = [],
                        o = e.split(`\n`),
                        s = o[0].split("    ").length;

                    for (let w = 0; w < o.length; w++)
                        o[w].split("    ").length < s || a.push(o[w].split("    "));

                    let u = we.deepCopyFlowData(h.flowdata),
                        d = h.luckysheet_select_save[h.luckysheet_select_save.length - 1],
                        f = d.row == null ? 0 : d.row[0],
                        m = d.column == null ? 0 : d.column[0],
                        g = a.length,
                        y = a[0].length,
                        v = !1;

                    if (h.config.merge != null && (v = Dt(h.config, f, f + g - 1, m, m + y - 1)), v) {
                        de() ? alert(l.errorNotAllowMerged) : U.info(`<i class="fa fa-exclamation-triangle"></i>${l.warning}`, l.errorNotAllowMerged);
                        return;
                    }

                    let k = f + g - u.length,
                        b = m + y - u[0].length;
                    (k > 0 || b > 0) && (u = il([].concat(u), k, b, !0));

                    // NEW: queue for Ucv calls (detect formulas in text tokens)
                    const __ucvQueue = [];

                    for (let w = 0; w < g; w++) {
                        let x = [].concat(u[w + f]);
                        for (let C = 0; C < y; C++) {
                            let S = x[C + m]
                                , _ = a[w][C];

                            // Unchanged write logic
                            if (B(_) && (S && S.ct && S.ct.fa === "@" ? _ = String(_) : _ = parseFloat(_)),
                                S instanceof Object)
                                S.v = _,
                                    S.ct != null && S.ct.fa != null ? S.m = mt(S.ct.fa, _) : S.m = _,
                                    S.f != null && S.f.length > 0 && (S.f = "",
                                        p.delFunctionGroup(w + f, C + m, h.currentSheetIndex));
                            else {
                                let T = {}, A = it(_);
                                T.v = A[2];
                                T.ct = A[1];
                                T.m = A[0];
                                x[C + m] = T;
                            }

                            // NEW: token-level formula detection (trim, ignore leading apostrophe)
                            if (typeof a[w][C] === "string") {
                                const __trim = a[w][C].trim();
                                const __forcedText = __trim.startsWith("'");
                                const __isFormula = !__forcedText && __trim.startsWith("=");
                                if (__isFormula) {
                                    __ucvQueue.push([w + f, C + m, __trim]);
                                }
                            }
                        }
                        u[w + f] = x
                    }

                    if (d.row = [f, f + g - 1],
                        d.column = [m, m + y - 1],
                        k > 0 || b > 0) {
                        Ye(u, h.luckysheet_select_save, { RowlChange: !0 });
                    } else {
                        Ye(u, h.luckysheet_select_save);
                        tt();
                    }

                    // NEW: after apply, call Ucv for all detected formulas in text paste
                    if (__ucvQueue.length) {
                        const __sheet = luckysheet.getSheet();
                        for (const [__r, __c, __f] of __ucvQueue) {
                            try { Ucv(__sheet, __r, __c, __f, true); } catch (err) { }
                        }
                        tt();
                    }
                }
            },
