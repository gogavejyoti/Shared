pasteHandler: function (e, n) {
    if (!gr(h.luckysheet_select_save, h.currentSheetIndex) || h.allowEdit === !1) return;

    const pasteCfg = Q().paste;
    if (h.luckysheet_select_save.length > 1) {
        de() ? alert(pasteCfg.errorNotAllowMulti)
             : U.info(`<i class="fa fa-exclamation-triangle"></i>${pasteCfg.warning}`, pasteCfg.errorNotAllowMulti);
        return;
    }

    const sel = h.luckysheet_select_save[0];
    let sr = sel.row[0], sc = sel.column[0];

    let data = we.deepCopyFlowData(h.flowdata);
    let cfg = $.extend(true, {}, h.config);
    cfg.merge == null && (cfg.merge = {});
    cfg.rowlen == null && (cfg.rowlen = {});
    cfg.borderInfo == null && (cfg.borderInfo = []);

    const __ucvQueue = [];              // [r,c,formula]
    const __affected = new Set();       // cells that must mark dependents dirty

    // =====================================================
    // =============== NORMALIZE INPUT =====================
    // =====================================================
    let matrix;
    if (typeof e === "object") {
        matrix = e;
    } else {
        e = e.replace(/\r/g, "");
        matrix = e.split("\n").map(r => r.split("\t"));
    }

    if (!matrix.length || !matrix[0].length) return;

    let er = sr + matrix.length - 1;
    let ec = sc + matrix[0].length - 1;

    // =====================================================
    // ================= MERGE CHECK =======================
    // =====================================================
    if (cfg.merge && Dt(cfg, sr, er, sc, ec)) {
        de() ? alert(pasteCfg.errorNotAllowMerged)
             : U.info(`<i class="fa fa-exclamation-triangle"></i>${pasteCfg.warning}`, pasteCfg.errorNotAllowMerged);
        return;
    }

    // =====================================================
    // =============== EXPAND SHEET ========================
    // =====================================================
    let addR = er - data.length + 1;
    let addC = ec - data[0].length + 1;
    (addR > 0 || addC > 0) && (data = il([].concat(data), addR, addC, true));

    // =====================================================
    // =============== WRITE CELLS =========================
    // =====================================================
    for (let r = 0; r < matrix.length; r++) {
        let row = [].concat(data[sr + r]);
        let rowH = cfg.rowlen[sr + r] || h.defaultrowlen;

        for (let c = 0; c < matrix[r].length; c++) {
            let cell = matrix[r][c];
            let target = {};

            // -------- OBJECT PASTE (Excel/Luckysheet)
            if (typeof e === "object" && cell && typeof cell === "object") {
                target = $.extend(true, {}, cell);

                let fml =
                    cell.f ||
                    (typeof cell.v === "string" && cell.v.trim().startsWith("=") && cell.v.trim()) ||
                    (typeof cell.m === "string" && cell.m.trim().startsWith("=") && cell.m.trim());

                if (fml) {
                    __ucvQueue.push([sr + r, sc + c, fml]);
                    __affected.add(sr + r + "," + sc + c);
                }

                if (cell.mc) {
                    if (cell.mc.rs != null) {
                        target.mc.r = sr + r;
                        target.mc.c = sc + c;
                        cfg.merge[target.mc.r + "_" + target.mc.c] = target.mc;
                    }
                }
            }
            // -------- TEXT PASTE
            else {
                let txt = String(cell).trim();
                if (txt.startsWith("=") && !txt.startsWith("'")) {
                    target.v = txt;
                    __ucvQueue.push([sr + r, sc + c, txt]);
                    __affected.add(sr + r + "," + sc + c);
                } else {
                    let t = it(txt);
                    target.v = t[2];
                    target.ct = t[1];
                    target.m = t[0];
                }
            }

            row[sc + c] = target;

            let hgt = be.getTextSize("田", ra(target))[1];
            hgt > rowH && (rowH = hgt);
        }

        data[sr + r] = row;
        rowH !== h.defaultrowlen && (cfg.rowlen[sr + r] = rowH);
    }

    // =====================================================
    // =============== APPLY DATA ==========================
    // =====================================================
    h.luckysheet_select_save = [{ row: [sr, er], column: [sc, ec] }];
    Ye(data, h.luckysheet_select_save, { cfg: cfg, RowlChange: true });
    tt();

    // =====================================================
    // ===== REGISTER FORMULAS (NO CALC YET) ==============
    // =====================================================
    if (!__ucvQueue.length) return;

    const sheet = luckysheet.getSheet();
    const formulaMap = Object.create(null);
    const cellSet = new Set();

    for (const [r, c, f] of __ucvQueue) {
        formulaMap[r + "," + c] = f;
        cellSet.add(r + "," + c);
        try { Ucv(sheet, r, c, f, false); } catch {}
    }

    // =====================================================
    // =========== LOCAL DEPENDENCY GRAPH ==================
    // =====================================================
    const graph = Object.create(null);
    for (const k in formulaMap) {
        graph[k] = [];
        const refs = formulaMap[k].match(/\$?[A-Z]+\$?\d+/g);
        if (!refs) continue;

        for (const ref of refs) {
            const pos = luckysheet.getRowColByCell(ref);
            if (pos && cellSet.has(pos.row + "," + pos.col)) {
                graph[k].push(pos.row + "," + pos.col);
            }
        }
    }

    // =====================================================
    // =========== TOPO SORT (CYCLE SAFE) ==================
    // =====================================================
    const visited = {}, visiting = {}, order = [];
    function dfs(n) {
        if (visited[n] || visiting[n]) return;
        visiting[n] = 1;
        (graph[n] || []).forEach(dfs);
        visiting[n] = 0;
        visited[n] = 1;
        order.push(n);
    }
    for (const k in graph) dfs(k);

    // =====================================================
    // ========== EVALUATE IN SAFE ORDER ===================
    // =====================================================
    for (const k of order) {
        const [r, c] = k.split(",").map(Number);
        try { Ucv(sheet, r, c, formulaMap[k], true); } catch {}
    }

    // =====================================================
    // ===== FORCE DIRTY FLAGS (CRITICAL FIX) ===============
    // =====================================================
    try {
        const chain = sheet.calcChain;
        if (chain) {
            for (let i = 0; i < chain.length; i++) {
                const it = chain[i];
                if (it && it.func && __affected.has(it.r + "," + it.c)) {
                    it.func[0] = false;
                }
            }
        }
    } catch {}

    tt();
}
