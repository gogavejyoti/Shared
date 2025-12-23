            updatecell: function (e, n, t, l = !0) {
                let a = this
                    , o = $("#luckysheet-rich-text-editor")
                    , s = o.text()
                    , u = o.html();
                if (a.rangetosheet != null && a.rangetosheet != h.currentSheetIndex && ve.changeSheetExec(a.rangetosheet),
                    !bn(e, n, h.currentSheetIndex))
                    return;
                if (Xe.dataVerification != null) {
                    let _ = Xe.dataVerification[e + "_" + n];
                    if (_ != null && _.prohibitInput && !Xe.validateCellData(s, _)) {
                        let T = Xe.getFailureText(_);
                        U.info(T, ""),
                            a.cancelNormalSelected();
                        return
                    }
                }
                let d = h.flowdata[e][n]
                    , f = JSON.stringify(d)
                    , m = xl(d)
                    , g = s.slice(0, 1) != "=" && u.substr(0, 5) == "<span"
                    , y = !1;
                if (!g && s && s.length > 0) {
                    let _ = s.replace(/\r\n/g, "_x000D_").replace(/&#13;&#10;/g, "_x000D_").replace(/\r/g, "_x000D_").replace(/\n/g, "_x000D_").split("_x000D_");
                    _.length > 1 && (y = !0,
                        g = !0,
                        s = _.join(`\r
`))
                }
                if (!t && !g && m ? (delete d.ct.s,
                    d.ct.t = "g",
                    d.ct.fa = "General",
                    t = "") : g && (L(d) != "object" && (d = {}),
                        delete d.f,
                        delete d.v,
                        delete d.m,
                        d.ct == null && (d.ct = {},
                            d.ct.fa = "General"),
                        d.ct.t = "inlineStr",
                        d.ct.s = Hd(o.find("span")),
                        y && (d.ct.s = [{
                            v: s
                        }])),
                    t = t || o.text(),
                    !Je.createHookFunction("cellUpdateBefore", e, n, t, l)) {
                    a.cancelNormalSelected();
                    return
                }
                if (!g) {
                    if (fe(t) && !m) {
                        if (d == null || fe(d.v) && d.spl == null && d.f == null) {
                            a.cancelNormalSelected();
                            return
                        }
                    } else if (d != null && d.qp != 1) {
                        //if (L(d) == "object" && (t == d.f || t == d.v || t == d.m)) {
                        //    a.cancelNormalSelected();
                        //    return
                        //} else 
                        
                        if (t == d) {
                            a.cancelNormalSelected();
                            return
                        }
                    }
                    L(t) == "string" && t.slice(0, 1) == "=" && t.length > 1 || L(d) == "object" && d.ct != null && d.ct.fa != null && d.ct.fa != "@" && !fe(t) && (delete d.m,
                        d.f != null && (delete d.f,
                            delete d.spl))
                }
                window.luckysheet_getcelldata_cache = null;
                let v = !0
                    , k = we.deepCopyFlowData(h.flowdata)
                    , b = null;
                if (L(d) == "object") {
                    if (!g)
                        if (L(t) == "string" && t.slice(0, 1) == "=" && t.length > 1) {
                            let _ = a.execfunction(t, e, n, void 0, !0);
                            if (v = !1,
                                d = $.extend(!0, {}, k[e][n]),
                                d.v = _[1],
                                d.f = _[2],
                                _.length == 4 && _[3].type == "sparklines") {
                                delete d.m,
                                    delete d.v;
                                let T = _[3].data;
                                L(T) == "array" && L(T[0]) != "object" ? d.v = T[0] : d.spl = _[3].data
                            } else
                                _.length == 4 && _[3].type == "dynamicArrayItem" && (b = _[3].data)
                        } else if (L(t) == "object") {
                            let _ = t.f;
                            if (L(_) == "string" && _.slice(0, 1) == "=" && _.length > 1) {
                                let T = a.execfunction(_, e, n, void 0, !0);
                                if (v = !1,
                                    d = $.extend(!0, {}, k[e][n]),
                                    d.v = T[1],
                                    d.f = T[2],
                                    T.length == 4 && T[3].type == "sparklines") {
                                    delete d.m,
                                        delete d.v;
                                    let A = T[3].data;
                                    L(A) == "array" && L(A[0]) != "object" ? d.v = A[0] : d.spl = T[3].data
                                } else
                                    T.length == 4 && T[3].type == "dynamicArrayItem" && (b = T[3].data)
                            } else
                                for (let T in t)
                                    d[T] = t[T]
                        } else
                            a.delFunctionGroup(e, n),
                                a.execFunctionGroup(e, n, t),
                                v = !1,
                                d = $.extend(!0, {}, k[e][n]),
                                d.v = t,
                                delete d.f,
                                delete d.spl,
                                d.qp == 1 && ("" + t).substr(0, 1) != "'" && (d.qp = 0,
                                    d.ct != null && (d.ct.fa = "General",
                                        d.ct.t = "n"));
                    t = d
                } else if (L(t) == "string" && t.slice(0, 1) == "=" && t.length > 1) {
                    let _ = a.execfunction(t, e, n, void 0, !0);
                    if (v = !1,
                        t = {
                            v: _[1],
                            f: _[2]
                        },
                        _.length == 4 && _[3].type == "sparklines") {
                        let T = _[3].data;
                        L(T) == "array" && L(T[0]) != "object" ? t.v = T[0] : t.spl = _[3].data
                    } else
                        _.length == 4 && _[3].type == "dynamicArrayItem" && (b = _[3].data)
                } else if (L(t) == "object") {
                    let _ = t.f;
                    if (L(_) == "string" && _.slice(0, 1) == "=" && _.length > 1) {
                        let T = a.execfunction(_, e, n, void 0, !0);
                        if (v = !1,
                            t.v = T[1],
                            t.f = T[2],
                            T.length == 4 && T[3].type == "sparklines") {
                            let A = T[3].data;
                            L(A) == "array" && L(A[0]) != "object" ? t.v = A[0] : t.spl = T[3].data
                        } else
                            T.length == 4 && T[3].type == "dynamicArrayItem" && (b = T[3].data)
                    } else {
                        let T = d;
                        t.v == null && (t.v = T)
                    }
                } else
                    a.delFunctionGroup(e, n),
                        a.execFunctionGroup(e, n, t),
                        v = !1;
                At(e, n, k, t),
                    a.cancelNormalSelected();
                let w = !1
                    , x = $.extend(!0, {}, Ft()[K(h.currentSheetIndex)].config);

                if (x.rowlen == null && (x.rowlen = {}),
                    k[e][n].tb == "2" && k[e][n].v != null || xl(k[e][n]) && typeof k[e][n].mc == "undefined") {
                    let _ = h.defaultrowlen
                        , T = $("#luckysheetTableContent").get(0).getContext("2d");
                    if (!(x.customHeight && x.customHeight[e] == 1)) {
                        let A = Rt(n)[1] - Rt(n)[0] - 2
                            , R = Tr(k[e][n], T, {
                                r: e,
                                c: n,
                                cellWidth: A
                            })
                            , I = _;
                        R != null && (I = R.textHeightAll + 2),
                            I > _ && (x.rowlen[e] = I,
                                w = !0)
                    }
                }
                let C = null;
                b && (C = $.extend(!0, [], this.insertUpdateDynamicArray(b)));
                let S = {
                    dynamicArray: C
                };
                if (w && (S = {
                    cfg: x,
                    dynamicArray: C,
                    RowlChange: w
                }),
                    setTimeout(() => {
                        Je.createHookFunction("cellUpdated", e, n, JSON.parse(f), h.flowdata[e][n], l)
                    }
                        , 0),
                    l)
                    Ye(k, [{
                        row: [e, e],
                        column: [n, n]
                    }], S, v),
                        a.execFunctionGlobalData = null;
                else
                    return {
                        data: k,
                        allParam: S
                    }
            },
