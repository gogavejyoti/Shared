pasteHandler: function (e, n) {
    if (!gr(h.luckysheet_select_save, h.currentSheetIndex) || h.allowEdit === !1)
        return;

    let l = Q().paste;

    if (h.luckysheet_select_save.length > 1) {
        de() ? alert(l.errorNotAllowMulti)
             : U.info(`<i class="fa fa-exclamation-triangle"></i>${l.warning}`, l.errorNotAllowMulti);
        return;
    }

    // ============================================================
    // =============== OBJECT PASTE (Excel/Luckysheet) ============
    // ============================================================
    if (typeof e === "object") {
        if (!e.length) return;

        let cfg = $.extend(!0, {}, h.config);
        cfg.merge == null && (cfg.merge = {});
        JSON.stringify(n).length > 2 && cfg.borderInfo == null && (cfg.borderInfo = []);

        let rowCount = e.length,
            colCount = e[0].length,
            sr = h.luckysheet_select_save[0].row[0],
            er = sr + rowCount - 1,
            sc = h.luckysheet_select_save[0].column[0],
            ec = sc + colCount - 1;

        if (cfg.merge && Dt(cfg, sr, er, sc, ec)) {
            de() ? alert(l.errorNotAllowMerged)
                 : U.info(`<i class="fa fa-exclamation-triangle"></i>${l.warning}`, l.errorNotAllowMerged);
            return;
        }

        let data = we.deepCopyFlowData(h.flowdata);
        let addR = er - data.length + 1,
            addC = ec - data[0].length + 1;

        (addR > 0 || addC > 0) && (data = il([].concat(data), addR, addC, !0));
        cfg.rowlen == null && (cfg.rowlen = {});

        const __ucvQueue = [];
        const mergeMap = {};
        let rowResize = !1;

        for (let r = sr; r <= er; r++) {
            let row = [].concat(data[r]);
            let rh = h.defaultrowlen;
            cfg.rowlen[r] != null && (rh = cfg.rowlen[r]);

            for (let c = sc; c <= ec; c++) {
                let src = e[r - sr] && e[r - sr][c - sc];
                row[c] = src ? $.extend(!0, {}, src) : null;

                // ---- Formula detection (ALL shapes)
                if (src) {
                    let fml =
                        src.f ||
                        (typeof src.v === "string" && src.v.trim().startsWith("=") && src.v.trim()) ||
                        (typeof src.m === "string" && src.m.trim().startsWith("=") && src.m.trim());

                    fml && __ucvQueue.push([r, c, fml]);
                }

                // ---- Merge handling
                if (row[c] && row[c].mc) {
                    if (row[c].mc.rs != null) {
                        row[c].mc.r = r;
                        row[c].mc.c = c;
                        cfg.merge[r + "_" + c] = row[c].mc;
                        mergeMap[src.mc.r + "_" + src.mc.c] = [r, c];
                    } else {
                        let pos = mergeMap[src.mc.r + "_" + src.mc.c];
                        row[c] = { mc: { r: pos[0], c: pos[1] } };
                    }
                }

                // ---- Borders
                if (n && n[(r - sr) + "_" + (c - sc)]) {
                    cfg.borderInfo.push({
                        rangeType: "cell",
                        value: {
                            row_index: r,
                            col_index: c,
                            ...n[(r - sr) + "_" + (c - sc)]
                        }
                    });
                }

                let hgt = be.getTextSize("田", ra(row[c]))[1];
                hgt > rh && (rh = hgt, rowResize = !0);
            }

            data[r] = row;
            rh !== h.defaultrowlen && (cfg.rowlen[r] = rh);
        }

        h.luckysheet_select_save = [{ row: [sr, er], column: [sc, ec] }];
        Ye(data, h.luckysheet_select_save, { cfg: cfg, RowlChange: rowResize });
        tt();

        // ---------- DEPENDENCY-SAFE FORMULA EVALUATION ----------
        if (__ucvQueue.length) {
            const sheet = luckysheet.getSheet();
            const map = Object.create(null);
            const set = new Set();

            for (const [r, c, f] of __ucvQueue) {
                map[r + "," + c] = f;
                set.add(r + "," + c);
                try { Ucv(sheet, r, c, f, false); } catch {}
            }

            const graph = Object.create(null);
            for (const k in map) {
                graph[k] = [];
                const refs = map[k].match(/\$?[A-Z]+\$?\d+/g);
                if (!refs) continue;
                for (const ref of refs) {
                    const p = luckysheet.getRowColByCell(ref);
                    if (p && set.has(p.row + "," + p.col))
                        graph[k].push(p.row + "," + p.col);
                }
            }

            const visited = {}, visiting = {}, order = [];
            (function dfs(n){
                if (visited[n] || visiting[n]) return;
                visiting[n] = 1;
                (graph[n] || []).forEach(dfs);
                visiting[n] = 0;
                visited[n] = 1;
                order.push(n);
            });

            for (const k in graph) dfs(k);

            for (const k of order) {
                const [r,c] = k.split(",").map(Number);
                try { Ucv(sheet, r, c, map[k], true); } catch {}
            }
            tt();
        }
        return;
    }

    // ============================================================
    // ===================== TEXT PASTE ===========================
    // ============================================================
    e = e.replace(/\r/g, "");
    const rows = e.split("\n").map(r => r.split("\t"));
    let sr = h.luckysheet_select_save[0].row[0];
    let sc = h.luckysheet_select_save[0].column[0];

    let data = we.deepCopyFlowData(h.flowdata);
    let addR = sr + rows.length - data.length;
    let addC = sc + rows[0].length - data[0].length;
    (addR > 0 || addC > 0) && (data = il([].concat(data), addR, addC, !0));

    const __ucvQueue = [];

    for (let r = 0; r < rows.length; r++) {
        let row = [].concat(data[sr + r]);
        for (let c = 0; c < rows[r].length; c++) {
            let val = rows[r][c].trim();
            let cell = row[sc + c] || {};
            if (val.startsWith("=") && !val.startsWith("'")) {
                cell.v = val;
                __ucvQueue.push([sr + r, sc + c, val]);
            } else {
                let t = it(val);
                cell.v = t[2];
                cell.ct = t[1];
                cell.m = t[0];
            }
            row[sc + c] = cell;
        }
        data[sr + r] = row;
    }

    Ye(data, h.luckysheet_select_save);
    tt();

    if (__ucvQueue.length) {
        const sheet = luckysheet.getSheet();
        for (const [r,c,f] of __ucvQueue) {
            try { Ucv(sheet, r, c, f, true); } catch {}
        }
        tt();
    }
}
