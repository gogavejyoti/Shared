  pasteHandler: function (e, n) {
                if (!gr(h.luckysheet_select_save, h.currentSheetIndex) || h.allowEdit === !1)
                    return;
                let l = Q().paste;
                if (h.luckysheet_select_save.length > 1 && (de() ? alert(l.errorNotAllowMulti) : U.info(`<i class="fa fa-exclamation-triangle"></i>${l.warning}`, l.errorNotAllowMulti)),
                    typeof e == "object") {
                    if (e.length == 0)
                        return;
                    let a = $.extend(!0, {}, h.config);
                    a.merge == null && (a.merge = {}),
                        JSON.stringify(n).length > 2 && a.borderInfo == null && (a.borderInfo = []);
                    let o = e.length
                        , s = e[0].length
                        , u = h.luckysheet_select_save[0].row[0]
                        , d = u + o - 1
                        , f = h.luckysheet_select_save[0].column[0]
                        , m = f + s - 1
                        , g = !1;
                    if (a.merge != null && (g = Dt(a, u, d, f, m)),
                        g) {
                        de() ? alert(l.errorNotAllowMerged) : U.info(`<i class="fa fa-exclamation-triangle"></i>${l.warning}`, l.errorNotAllowMerged);
                        return
                    }
                    let y = we.deepCopyFlowData(h.flowdata)
                        , v = y.length
                        , k = y[0].length
                        , b = d - v + 1
                        , w = m - k + 1;
                    (b > 0 || w > 0) && (y = il([].concat(y), b, w, !0)),
                        a.rowlen == null && (a.rowlen = {});
                    let x = !1
                        , C = {};
                    for (let S = u; S <= d; S++) {
                        let _ = [].concat(y[S])
                            , T = h.defaultrowlen;
                        a.rowlen[S] != null && (T = a.rowlen[S]);
                        for (let A = f; A <= m; A++) {
                            L(_[A]) == "object" && "mc" in _[A] && ("rs" in _[A].mc && delete a.merge[_[A].mc.r + "_" + _[A].mc.c],
                                delete _[A].mc);
                            let R = null;
                            if (e[S - u] != null && e[S - u][A - f] != null && (R = e[S - u][A - f]),
                                _[A] = $.extend(!0, {}, R),
                                R != null && "mc" in _[A] && (_[A].mc.rs != null ? (_[A].mc.r = S,
                                    _[A].mc.c = A,
                                    a.merge[_[A].mc.r + "_" + _[A].mc.c] = _[A].mc,
                                    C[R.mc.r + "_" + R.mc.c] = [_[A].mc.r, _[A].mc.c]) : _[A] = {
                                        mc: {
                                            r: C[R.mc.r + "_" + R.mc.c][0],
                                            c: C[R.mc.r + "_" + R.mc.c][1]
                                        }
                                    }),
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
                                a.borderInfo.push(N)
                            }
                            let I = ra(_[A])
                                , F = be.getTextSize("\u7530", I)[1];
                            F > T && (T = F,
                                x = !0)
                        }
                        y[S] = _,
                            T != h.defaultrowlen && (a.rowlen[S] = T)
                    }
                    if (h.luckysheet_select_save = [{
                        row: [u, d],
                        column: [f, m]
                    }],
                        b > 0 || w > 0 || x) {
                        let S = {
                            cfg: a,
                            RowlChange: !0
                        };
                        Ye(y, h.luckysheet_select_save, S)
                    } else {
                        let S = {
                            cfg: a
                        };
                        Ye(y, h.luckysheet_select_save, S),
                            tt()
                    }
                } else {
                    e = e.replace(/\r/g, "");
                    let a = []
                        , o = e.split(`
`)
                        , s = o[0].split("	").length;
                    for (let w = 0; w < o.length; w++)
                        o[w].split("	").length < s || a.push(o[w].split("	"));
                    let u = we.deepCopyFlowData(h.flowdata)
                        , d = h.luckysheet_select_save[h.luckysheet_select_save.length - 1]
                        , f = d.row == null ? 0 : d.row[0]
                        , m = d.column == null ? 0 : d.column[0]
                        , g = a.length
                        , y = a[0].length
                        , v = !1;
                    if (h.config.merge != null && (v = Dt(h.config, f, f + g - 1, m, m + y - 1)),
                        v) {
                        de() ? alert(l.errorNotAllowMerged) : U.info(`<i class="fa fa-exclamation-triangle"></i>${l.warning}`, l.errorNotAllowMerged);
                        return
                    }
                    let k = f + g - u.length
                        , b = m + y - u[0].length;
                    (k > 0 || b > 0) && (u = il([].concat(u), k, b, !0));
                    for (let w = 0; w < g; w++) {
                        let x = [].concat(u[w + f]);
                        for (let C = 0; C < y; C++) {
                            let S = x[C + m]
                                , _ = a[w][C];
                            if (B(_) && (S && S.ct && S.ct.fa === "@" ? _ = String(_) : _ = parseFloat(_)),
                                S instanceof Object)
                                S.v = _,
                                    S.ct != null && S.ct.fa != null ? S.m = mt(S.ct.fa, _) : S.m = _,
                                    S.f != null && S.f.length > 0 && (S.f = "",
                                        p.delFunctionGroup(w + f, C + m, h.currentSheetIndex));
                            else {
                                let T = {}
                                    , A = it(_);
                                T.v = A[2],
                                    T.ct = A[1],
                                    T.m = A[0],
                                    x[C + m] = T
                            }
                        }
                        u[w + f] = x
                    }
                    if (d.row = [f, f + g - 1],
                        d.column = [m, m + y - 1],
                        k > 0 || b > 0) {
                        let w = {
                            RowlChange: !0
                        };
                        Ye(u, h.luckysheet_select_save, w)
                    } else
                        Ye(u, h.luckysheet_select_save),
                            tt()
                }
            },


 delFunctionGroup: function (e, n, t) {
                t == null && (t = h.currentSheetIndex);
                let l = Ft()
                    , a = l[K(t)]
                    , o = a.calcChain;
                if (o != null)
                    for (let u = 0; u < o.length; u++) {
                        let d = o[u];
                        if (d.r == e && d.c == n && d.index == t) {
                            o.splice(u, 1),
                                ne.saveParam("fc", t, null, {
                                    op: "del",
                                    pos: u
                                });
                            break
                        }
                    }
                let s = a.dynamicArray;
                if (s != null)
                    for (let u = 0; u < s.length; u++) {
                        let d = s[u];
                        if (d.r == e && d.c == n && (d.index == null || d.index == t)) {
                            s.splice(u, 1),
                                ne.saveParam("ac", t, null, {
                                    op: "del",
                                    pos: u
                                });
                            break
                        }
                    }
                Wn(l)
            },


  execfunction: function (e, n, t, l, a, o) {
 		const sheetName = luckysheet.getSheet().name;
 		const sheetIndex = luckysheet.getSheet().index;

                let s = this, d = Q().formulaMore;
                // quick error check
                if (e.indexOf(s.error.r) > -1) return [!1, s.error.r, e];
                if (!s.checkBracketNum(e)) e += ")";

		    if (typeof e === "string" && e.charAt(0) === "=") {
                    // Replace number% patterns with (number/100)
                    // e.g. =BX109*30% → =BX109*(30/100)
                    e = e.replace(/(\d+(\.\d+)?)%/g, "($1/100)");
                   if (e.indexOf(sheetName) > -1 && sheetIndex == l){
                        const quotedName = sheetName.replace(/'/g, "''");
                        const unquoted = sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const quoted = `'${quotedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`;
                        // Optional workbook part [Book.xlsx], then quoted or unquoted sheet name, then !
                        const pattern = new RegExp(
                            String.raw`(?:(?:\[[^\]]+\])\s*)?(?:${quoted}|${unquoted})!`,
                            'g'
                        );
                        e = e.replace(pattern, '');
                    }

                }
		

                if (l == null) l = h.currentSheetIndex;
                h.calculateSheetIndex = l;

                let f = $.trim(s.functionParserExe(e));

                if ((f.substr(0, 20) == "luckysheet_function." || f.substr(0, 22) == "luckysheet_compareWith") && (s.functionHTMLIndex = 0),
                    !s.testFunction(e, f) || f == "")
                    return U.info("", d.execfunctionError),
                        [!1, s.error.n, e];

                let m = null;
                window.luckysheetCurrentRow = n;
                window.luckysheetCurrentColumn = t;
                window.luckysheetCurrentIndex = l;
                window.luckysheetCurrentFunction = e;
                let g = null;

                try {
                    // self-reference detection (keeps behavior)
                    if (f.indexOf("luckysheet_getcelldata") > -1) {
                        const parts = f.split("luckysheet_getcelldata('");
                        for (let k = 1; k < parts.length; k++) {
                            const b = parts[k].split("')")[0];
                            const w = s.getcellrange(b);
                            if (w == null || w.row[0] < 0 || w.column[0] < 0) return [!0, s.error.r, e];
                            if (w.sheetIndex == h.calculateSheetIndex && n >= w.row[0] && n <= w.row[1] && t >= w.column[0] && t <= w.column[1])
                                return de() ? alert(d.execfunctionSelfError) : U.info("", `<span style="color:red;font-weight:bold;">Error:</span> ${d.execfunctionSelfErrorResult} <br/> <b>Sheet:</b> ${sheetName} | <b>Cell:</b> ${s.getExcelAddr(n, t)} | <b>Formula:</b> ${e}`),
                                    [!1, 0, e];
                        }
                    }

                    m = new Function("return " + f)();
                    if (typeof m == "string") m = m.replace(/\x7F/g, '"');
                    if (f.indexOf("SPLINES") > -1) { g = m; m = ""; }
                } catch (err) {
                    console.log(err, f);
                    const k = s.errorInfo(err);
                    m = [s.error.n, k];
                }

                // normalize object return type
                if (L(m) == "object" && m.startCell != null) {
                    if (L(m.data) == "array") m = s.error.v;
                    else if (L(m.data) == "object" && !fe(m.data.v)) m = m.data.v;
                    else if (fe(m.data)) m = 0;
                    else if (m.cell > 1 || m.rowl > 1 || L(m.data) == "string" || L(m.data) == "number") m = m.data;
                    else m = 0;
                }

                let y = null;
                if (L(m) == "array") {
                    let simple = !(L(m[0]) == "array") && m.length == 2 && H(m[0]);
                    if (simple) m = m[0];
                    else if (L(m[0]) == "array" && m.length == 1 && m[0].length == 1) m = m[0][0];
                    else {
                        y = {
                            r: n,
                            c: t,
                            f: e,
                            index: l,
                            data: m
                        };
                        m = "";
                    }
                }

                // reset globals
                window.luckysheetCurrentRow = null;
                window.luckysheetCurrentColumn = null;
                window.luckysheetCurrentIndex = null;
                window.luckysheetCurrentFunction = null;

                // update groups if needed
                if (n != null && t != null) {
                    if (a) s.execFunctionGroup(n, t, m, l);
                    if (!o) s.insertUpdateFunctionGroup(n, t, l);
                }

                if (g) return [!0, m, e, { type: "sparklines", data: g }];
                if (y) return [!0, m, e, { type: "dynamicArrayItem", data: y }];
                return [!0, m, e];
            },

  execFunctionGroup: function (e, n, t, l, a, o = !1) {
                if (o) return;
                const s = this;

                // Initialize helpers
                if (a == null) a = h.flowdata;
                if (!window.luckysheet_compareWith) {
                    window.luckysheet_compareWith = ja;
                    window.luckysheet_getarraydata = wc;
                    window.luckysheet_getcelldata = nr;
                    window.luckysheet_parseData = Ua;
                    window.luckysheet_getValue = qn;
                    window.luckysheet_indirect_check = xc;
                    window.luckysheet_indirect_check_return = _c;
                    window.luckysheet_offset_check = Cc;
                    window.luckysheet_calcADPMM = _t;
                    window.luckysheet_getSpecialReference = Tc;
                }

                if (!s.execFunctionGlobalData) s.execFunctionGlobalData = {};
                if (l == null) l = h.currentSheetIndex;

                // Store explicit value if provided
                if (t != null) {
                    const tmp = [[{ v: null }]];
                    At(0, 0, tmp, t);
                    s.execFunctionGlobalData[e + "_" + n + "_" + l] = tmp[0][0];
                }

                // Update cross-sheet references before recalculation
                if (typeof _shiftCrossSheetReference === 'function') {
                    _shiftCrossSheetReference({
                        type: 'recalc',
                        sheetIndex: l
                    });
                }

                // Get all function group cells and sheet info
                let allFuncCells = [];
                let sheetIndices = null;
                if (e && n) {
                    const formulaOrValue = (window.luckysheet_getcelldata_cache && Object.keys(window.luckysheet_getcelldata_cache).join("+")) || null;
                    sheetIndices = s.getAllDependentSheetsFromSheet(l, formulaOrValue);
                    allFuncCells = s.getAllDependentFunctionGroup(sheetIndices) || [];
                }
                else {
                    allFuncCells = s.getAllFunctionGroup() || [];
                }



                const sheetsInfo = Ft() || [];
                const sheetMap = {};

                if (sheetIndices) {
                    for (let i = 0; i < sheetsInfo.length; i++) {
                        if (!sheetIndices.includes(sheetsInfo[i].index)) continue;
                        sheetMap[sheetsInfo[i].index] = sheetsInfo[i].data;
                    }
                }
                else {
                    for (let i = 0; i < sheetsInfo.length; i++) {
                        sheetMap[sheetsInfo[i].index] = sheetsInfo[i].data;
                    }
                }

                // Build execSet
                const execSet = {};
                if (s.execFunctionExist == null) {
                    execSet["r" + e + "c" + n + "i" + l] = 1;
                } else {
                    for (let i = 0; i < s.execFunctionExist.length; i++) {
                        const T = s.execFunctionExist[i];
                        execSet["r" + T.r + "c" + T.c + "i" + T.i] = 1;
                    }
                }

                const nodes = {};
                const rangeToKeysCache = {};

                // Helper: get keys in a rectangular range
                function keysForRange(R) {
                    const cacheKey = `r${R.row[0]}_${R.row[1]}_c${R.column[0]}_${R.column[1]}_i${R.sheetIndex}`;
                    if (rangeToKeysCache[cacheKey]) return rangeToKeysCache[cacheKey];
                    const list = [];
                    for (let rr = R.row[0]; rr <= R.row[1]; rr++) {
                        for (let cc = R.column[0]; cc <= R.column[1]; cc++) {
                            const k = "r" + rr + "c" + cc + "i" + R.sheetIndex;
                            list.push({ key: k, r: rr, c: cc, sheetIndex: R.sheetIndex });
                        }
                    }
                    rangeToKeysCache[cacheKey] = list;
                    return list;
                }

                // Build nodes
                for (let i = 0; i < allFuncCells.length; i++) {
                    const T = allFuncCells[i];
                    const nodeKey = "r" + T.r + "c" + T.c + "i" + T.index;
                    const R = zl(T.r, T.c, T.index);
                    if (!R) continue;

                    const upper = R.toUpperCase();
                    const needsFunctionRange = upper.indexOf("INDIRECT(") > -1 || upper.indexOf("OFFSET(") > -1 || upper.indexOf("INDEX(") > -1;
                    const formulaRanges = [];

                    if (needsFunctionRange) {
                        this.isFunctionRange(R, null, null, T.index, null, function (ref) {
                            const rg = s.getcellrange($.trim(ref), T.index);
                            if (rg) formulaRanges.push(rg);
                        });
                    } else if (!(R.substr(0, 2) === '="' && R.substr(R.length - 1, 1) === '"')) {
                        const tokens = R.split(/==|!=|<>|<=|>=|[,()=+\-/*%&\^><]/).filter(Boolean);
                        for (let ti = 0; ti < tokens.length; ti++) {
                            let tk = tokens[ti].trim();
                            if (!tk) continue;
                            if (tk.length <= 1 && !(s.iscelldata && s.iscelldata(tk))) continue;
                            const rg = s.getcellrange($.trim(tk), T.index);
                            if (rg) formulaRanges.push(rg);
                        }
                    }

                    nodes[nodeKey] = {
                        formulaArray: formulaRanges,
                        calc_funcStr: R,
                        key: nodeKey,
                        r: T.r,
                        c: T.c,
                        index: T.index,
                        parents: {},
                        chidren: {},
                        color: "w"
                    };
                }

                // Build dependency graph
                const y = [];
                const nodeKeys = Object.keys(nodes);
                for (let i = 0; i < nodeKeys.length; i++) {
                    const node = nodes[nodeKeys[i]];
                    const ranges = node.formulaArray || [];
                    for (let ri = 0; ri < ranges.length; ri++) {
                        const rect = ranges[ri];
                        const keys = keysForRange(rect);
                        for (let ki = 0; ki < keys.length; ki++) {
                            const cellInfo = keys[ki];
                            const A = cellInfo.key;
                            if (A in nodes) {
                                node.chidren[A] = 1;
                                nodes[A].parents[node.key] = 1;
                            }
                            if (!o && (A in execSet)) y.push(node);
                        }
                    }
                    if (o) y.push(node);
                }

                // Topological sort
                const S = {};
                const stack = y.slice();
                const ordered = [];
                while (stack.length > 0) {
                    const cur = stack.pop();
                    if (!cur || S[cur.key]) continue;
                    if (cur.color === "b") {
                        ordered.push(cur);
                        S[cur.key] = 1;
                        continue;
                    }

                    const parentKeys = Object.keys(cur.parents || {});
                    const parentNodes = [];
                    for (let pi = 0; pi < parentKeys.length; pi++) {
                        const pk = parentKeys[pi];
                        if (nodes[pk]) parentNodes.push(nodes[pk]);
                    }

                    if (parentNodes.length === 0) {
                        ordered.push(cur);
                        S[cur.key] = 1;
                    } else {
                        cur.color = "b";
                        stack.push(cur);
                        for (let p = 0; p < parentNodes.length; p++) stack.push(parentNodes[p]);
                    }
                }

                ordered.reverse();

                // Evaluate nodes
                for (let i = 0; i < ordered.length; i++) {
                    const T = ordered[i];
                    window.luckysheet_getcelldata_cache = null;
                    const Rres = s.execfunction(T.calc_funcStr, T.r, T.c, T.index);

                    s.groupValuesRefreshData.push({
                        r: T.r,
                        c: T.c,
                        v: Rres[1],
                        f: Rres[2],
                        spe: Rres[3],
                        index: T.index
                    });

                    s.execFunctionGlobalData[T.r + "_" + T.c + "_" + T.index] = {
                        v: Rres[1],
                        f: Rres[2]
                    };
                }

                s.execFunctionExist = null;
            },
