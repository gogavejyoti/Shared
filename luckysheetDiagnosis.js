updatecell: function (e, n, t, l = !0) {
    let a = this,
        o = $("#luckysheet-rich-text-editor"),
        s = o.text(),
        u = o.html();

    // Switch sheet if required
    if (a.rangetosheet != null && a.rangetosheet != h.currentSheetIndex) {
        ve.changeSheetExec(a.rangetosheet);
    }

    if (!bn(e, n, h.currentSheetIndex)) return;

    // ---------------- Data validation ----------------
    if (Xe.dataVerification != null) {
        let dv = Xe.dataVerification[e + "_" + n];
        if (dv != null && dv.prohibitInput && !Xe.validateCellData(s, dv)) {
            U.info(Xe.getFailureText(dv), "");
            a.cancelNormalSelected();
            return;
        }
    }

    let oldCell = h.flowdata[e][n];
    let oldSnapshot = JSON.stringify(oldCell);
    let isFormulaCell = xl(oldCell);

    // ---------------- Inline string handling ----------------
    let isInlineStr = s.slice(0, 1) !== "=" && u.substr(0, 5) === "<span";
    let hasNewLine = false;

    if (!isInlineStr && s && s.length > 0) {
        let arr = s
            .replace(/\r\n/g, "_x000D_")
            .replace(/&#13;&#10;/g, "_x000D_")
            .replace(/\r/g, "_x000D_")
            .replace(/\n/g, "_x000D_")
            .split("_x000D_");

        if (arr.length > 1) {
            hasNewLine = true;
            isInlineStr = true;
            s = arr.join("\r\n");
        }
    }

    // ---------------- Prepare editable data ----------------
    let data = we.deepCopyFlowData(h.flowdata);
    let cell = data[e][n] || {};

    // ---------------- Normalize input ----------------
    if (isInlineStr) {
        // Inline text
        delete cell.f;
        delete cell.v;
        delete cell.m;
        cell.ct = cell.ct || { fa: "General" };
        cell.ct.t = "inlineStr";
        cell.ct.s = Hd(o.find("span"));
        if (hasNewLine) {
            cell.ct.s = [{ v: s }];
        }
    } else {
        t = t || s;

        // ---------------- Formula input ----------------
        if (typeof t === "string" && t.startsWith("=") && t.length > 1) {
            // 🔑 Normalize formula ONLY (NO calculation)
            let r = a.execfunction(t, e, n, void 0, false);
            cell.f = r[2];
            cell.v = null;
            cell.m = null;
            delete cell.spl;
        }
        // ---------------- Object input ----------------
        else if (typeof t === "object") {
            for (let k in t) cell[k] = t[k];
        }
        // ---------------- Value input ----------------
        else {
            delete cell.f;
            delete cell.spl;
            cell.v = t;
            cell.qp === 1 && (cell.qp = 0);
        }
    }

    // ---------------- Hook before update ----------------
    if (!Je.createHookFunction("cellUpdateBefore", e, n, t, l)) {
        a.cancelNormalSelected();
        return;
    }

    // ---------------- Apply change ----------------
    data[e][n] = cell;
    At(e, n, data, cell);

    // ---------------- Row height recalculation ----------------
    let cfg = $.extend(true, {}, Ft()[K(h.currentSheetIndex)].config);
    cfg.rowlen == null && (cfg.rowlen = {});
    let rowChanged = false;

    if (cell.tb === "2" && cell.v != null || xl(cell) && cell.mc == null) {
        let ctx = $("#luckysheetTableContent").get(0).getContext("2d");
        let defaultH = h.defaultrowlen;
        if (!(cfg.customHeight && cfg.customHeight[e] === 1)) {
            let width = Rt(n)[1] - Rt(n)[0] - 2;
            let size = Tr(cell, ctx, { r: e, c: n, cellWidth: width });
            if (size && size.textHeightAll + 2 > defaultH) {
                cfg.rowlen[e] = size.textHeightAll + 2;
                rowChanged = true;
            }
        }
    }

    // ---------------- Commit to sheet ----------------
    let params = rowChanged ? { cfg: cfg, RowlChange: true } : {};
    Ye(data, [{ row: [e, e], column: [n, n] }], params, false);
    a.cancelNormalSelected();

    // ---------------- Deterministic calculation pass ----------------
    try {
        const sheet = luckysheet.getSheet();
        const sheetData = sheet.data;

        // 🔥 rebuild calcChain INLINE
        sheet.calcChain = [];

        for (let r = 0; r < sheetData.length; r++) {
            for (let c = 0; c < sheetData[r].length; c++) {
                let ce = sheetData[r][c];
                if (ce && ce.f) {
                    Ucv(sheet, r, c, ce.f, false); // register
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
        console.error("updatecell calc failed", err);
    }

    // ---------------- Hook after update ----------------
    setTimeout(() => {
        Je.createHookFunction(
            "cellUpdated",
            e,
            n,
            JSON.parse(oldSnapshot),
            h.flowdata[e][n],
            l
        );
    }, 0);
}
