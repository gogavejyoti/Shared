/* ============================================================================
   LUCKYSHEET — PAGE LAYOUT & PAGE BREAK PREVIEW
   ----------------------------------------------------------------------------
   Implements the three print-view buttons that ship (handler-less) in this
   project's customized bundle template:
       [Normal] [Page Layout] [Page break preview]

   DESIGN CONTRACT (why this cannot break Luckysheet):
     * Fully sandboxed IIFE. No vendor code is modified or monkey-patched
       except an optional, reversible wrapper around luckysheet.zoom().
     * Rendering happens on OUR OWN overlay (pointer-events:none) inserted
       inside the grid window — Luckysheet's canvases, render loop and DOM
       are never written to.
     * Geometry comes from public sources only:
         - sheet config columnlen/rowlen/rowhidden/colhidden/freeze
           (via luckysheet.getLuckysheetfile())
         - default sizes via public getters when available
         - header sizes + freeze split + scroll measured from live DOM
     * Every external access sits in try/catch; on any surprise the module
       degrades to "do nothing" rather than throwing.

   VIEW MODES
     viewNormal  overlay hidden (stock behavior)
     viewLayout  page boundaries + dimmed out-of-page gutters (margins)
     viewPage    page boundaries + "Page N" corner badges

   TUNABLES (set before this script):
     PRINTVIEW_PAPER        "A4" | "letter"          (default A4)
     PRINTVIEW_ORIENTATION  "portrait" | "landscape" (default portrait)
     PRINTVIEW_MARGIN_MM    number                   (default 19mm ~= 0.75in)

   PUBLIC API (optional):
     LuckysheetPrintView.setView("viewNormal"|"viewLayout"|"viewPage")
     LuckysheetPrintView.refresh()
     ============================================================================ */
(function () {
    "use strict";

    if (window.__lsPrintViewInit) return;
    window.__lsPrintViewInit = true;

    /* ------------------------------------------------------------------ */
    /* Config                                                              */
    /* ------------------------------------------------------------------ */
    var MM_PX = 96 / 25.4;
    var PAPERS = { a4: [210, 297], letter: [216, 279] };
    var paperName = String(window.PRINTVIEW_PAPER || "A4").toLowerCase();
    var dims = PAPERS[paperName] || PAPERS.a4;
    var orient = String(window.PRINTVIEW_ORIENTATION || "portrait").toLowerCase();
    var marginMM = Number(window.PRINTVIEW_MARGIN_MM);
    if (!isFinite(marginMM)) marginMM = 19;

    var paperW = orient === "landscape" ? dims[1] : dims[0];
    var paperH = orient === "landscape" ? dims[0] : dims[1];
    var PAGE_W = (paperW - 2 * marginMM) * MM_PX;   /* printable px @100% */
    var PAGE_H = (paperH - 2 * marginMM) * MM_PX;

    var MAX_SCAN = 5000;                             /* hard safety cap    */

    var state = {
        view: "viewNormal",
        overlay: null,
        bound: false,
        zoom: 1,
        lastGeom: ""
    };

    /* ------------------------------------------------------------------ */
    /* Tiny helpers                                                        */
    /* ------------------------------------------------------------------ */
    function $(sel, root) { return (root || document).querySelector(sel); }

    function num(v, fallback) {
        var n = Number(v);
        return isFinite(n) && n > 0 ? n : fallback;
    }

    function activeFile() {
        try {
            var files = window.luckysheet.getLuckysheetfile();
            if (!files || !files.length) return null;
            for (var i = 0; i < files.length; i++) {
                if (files[i] && files[i].status === 1) return files[i];
            }
            return files[0];
        } catch (err) { return null; }
    }

    function defaultColWidth(file) {
        var d = num(file && file.config && file.config.defaultColWidth, 0);
        if (!d) { try { d = num(window.luckysheet.getdefaultColWidth(), 0); } catch (err) { /* noop */ } }
        return d || 72;
    }

    function defaultRowHeight(file) {
        var d = num(file && file.config && file.config.defaultRowHeight, 0);
        if (!d) { try { d = num(window.luckysheet.getdefaultRowHeight(), 0); } catch (err) { /* noop */ } }
        return d || 19;
    }

    /* Cumulative content-space offset arrays, skipping hidden rows/cols. */
    function buildOffsets(countMax, sizeMap, defaultSize, hiddenMap, capKey) {
        var offs = [0];
        var total = 0;
        for (var i = 0; i <= countMax; i++) {
            var sz = defaultSize;
            if (sizeMap && sizeMap[i] != null) {
                var m = num(sizeMap[i], 0);
                if (m > 0) sz = m;
            }
            if (!(hiddenMap && hiddenMap[i])) total += sz;
            offs.push(total);
            if (i >= capKey && i >= countMax) break;
        }
        return offs;
    }

    /* ------------------------------------------------------------------ */
    /* Geometry                                                            */
    /* ------------------------------------------------------------------ */
    function measureChrome() {
        var rowsH = $("#luckysheet-rows-h");
        var colsH = $("#luckysheet-cols-h");
        return {
            rowHeaderW: rowsH ? rowsH.offsetWidth || 0 : 0,
            colHeaderH: colsH ? colsH.offsetHeight || 0 : 0
        };
    }

    function freezeInfo(cfg) {
        /* Returns content-space split point(s); 0 means "no freeze". */
        var fRow = 0, fCol = 0;
        try {
            if (cfg && cfg.freeze) {
                if (cfg.freeze.row != null && cfg.freeze.row > -1) {
                    fRow = parseInt(cfg.freeze.row, 10) + 1;
                }
                if (cfg.freeze.column != null && cfg.freeze.column > -1) {
                    fCol = parseInt(cfg.freeze.column, 10) + 1;
                }
            }
        } catch (err) { /* noop */ }
        return { fRow: fRow || 0, fCol: fCol || 0 };
    }

    function collectGeometry() {
        var file = activeFile();
        if (!file) return null;

        var cfg = file.config || {};
        var colCount = 0, rowCount = 0, k;

        try {
            if (file.data && file.data[0]) colCount = file.data[0].length;
            if (file.data) rowCount = file.data.length;
        } catch (err) { /* sparse data */ }
        /* NOTE: config keys are `columnlen` / `rowlen` (not collen). */
        for (k in (cfg.columnlen || {})) { k = +k + 1; if (k > colCount) colCount = k; }
        for (k in (cfg.rowlen || {})) { k = +k + 1; if (k > rowCount) rowCount = k; }
        colCount = Math.min(Math.max(colCount, 1), MAX_SCAN);
        rowCount = Math.min(Math.max(rowCount, 1), MAX_SCAN);

        return {
            colOff: buildOffsets(colCount, cfg.collen, defaultColWidth(file), cfg.colhidden, colCount),
            rowOff: buildOffsets(rowCount, cfg.rowlen, defaultRowHeight(file), cfg.rowhidden, rowCount),
            freeze: freezeInfo(cfg),
            chrome: measureChrome()
        };
    }

    /* Screen mapping with frozen-pane awareness (measured from live DOM). */
    function screenTransform(geom) {
        var sx = $(".luckysheet-scrollbar-x");
        var sy = $(".luckysheet-scrollbar-y");
        var vBar = $("#luckysheet-freezebar-vertical") || $("#luckysheet-freezebar-vertical-p");
        var hBar = $("#luckysheet-freezebar-horizontal") || $("#luckysheet-freezebar-horizontal-p");

        var scrollX = sx ? (sx.scrollLeft || 0) : 0;
        var scrollY = sy ? (sy.scrollTop || 0) : 0;

        var fColPx = geom.colOff[Math.min(geom.freeze.fCol, geom.colOff.length - 1)] || 0;
        var fRowPx = geom.rowOff[Math.min(geom.freeze.fRow, geom.rowOff.length - 1)] || 0;

        var vBarX = vBar ? (parseFloat(getComputedStyle(vBar).left) || 0) : (geom.chrome.rowHeaderW + fColPx * state.zoom);
        var hBarY = hBar ? (parseFloat(getComputedStyle(hBar).top) || 0) : (geom.chrome.colHeaderH + fRowPx * state.zoom);

        return {
            x: function (cx) {
                cx *= state.zoom;
                if (geom.freeze.fCol && cx >= fColPx * state.zoom) {
                    return vBarX + (cx - fColPx * state.zoom) - scrollX;
                }
                return geom.chrome.rowHeaderW + cx - (geom.freeze.fCol ? 0 : scrollX);
            },
            y: function (cy) {
                cy *= state.zoom;
                if (geom.freeze.fRow && cy >= fRowPx * state.zoom) {
                    return hBarY + (cy - fRowPx * state.zoom) - scrollY;
                }
                return geom.chrome.colHeaderH + cy - (geom.freeze.fRow ? 0 : scrollY);
            }
        };
    }

    /* ------------------------------------------------------------------ */
    /* Overlay                                                             */
    /* ------------------------------------------------------------------ */
    function ensureOverlay() {
        if (state.overlay && document.body.contains(state.overlay)) return state.overlay;
        try {
            var win = $(".luckysheet-grid-window-1");
            if (!win) return null;
            var ov = document.createElement("div");
            ov.id = "pv-overlay";
            ov.style.cssText =
                "position:absolute;left:0;top:0;width:100%;height:100%;" +
                "pointer-events:none;z-index:14;display:none;";
            win.appendChild(ov);
            state.overlay = ov;
            return ov;
        } catch (err) { return null; }
    }

    function clearOverlay() {
        if (state.overlay) state.overlay.innerHTML = "";
        if (state.overlay) state.overlay.style.display = "none";
    }

    function el(tag, css, text) {
        var n = document.createElement(tag);
        n.style.cssText = css;
        if (text) n.textContent = text;
        return n;
    }

    function render() {
        if (state.view === "viewNormal") { clearOverlay(); return; }

        var ov = ensureOverlay();
        if (!ov) return;

        var geom = collectGeometry();
        if (!geom) { clearOverlay(); return; }

        var T = screenTransform(geom);
        var winEl = ov.parentElement;
        var vw = winEl ? winEl.clientWidth : 0;
        var vh = winEl ? winEl.clientHeight : 0;
        if (!vw || !vh) { clearOverlay(); return; }

        /* Break positions (content space -> screen), deduped, in-view. */
        var xs = [], ys = [], x, y, p;
        var pageWc = PAGE_W / state.zoom;
        var pageHc = PAGE_H / state.zoom;

        for (p = 1; ; p++) {
            x = pageWc * p;
            if (x >= geom.colOff[geom.colOff.length - 1]) break;
            var sxc = Math.round(T.x(x));
            if (sxc >= 0 && sxc <= vw) xs.push({ at: sxc, page: p });
            if (xs.length > 400) break;
        }
        for (p = 1; ; p++) {
            y = pageHc * p;
            if (y >= geom.rowOff[geom.rowOff.length - 1]) break;
            var syc = Math.round(T.y(y));
            if (syc >= 0 && syc <= vh) ys.push({ at: syc, page: p });
            if (ys.length > 2000) break;
        }

        var frag = document.createDocumentFragment();

        var totalWc = geom.colOff[geom.colOff.length - 1];
        var totalHc = geom.rowOff[geom.rowOff.length - 1];
        var marginPx = marginMM * MM_PX * state.zoom;

        /* Margin gutters (Page Layout only): dim the printable-margin bands
           at both sides of every page column / row band. */
        if (state.view === "viewLayout") {
            function dimStrip(css) {
                frag.appendChild(el("div",
                    "position:absolute;background:rgba(15,23,42,0.05);" + css));
            }
            /* Vertical page bands (columns). */
            for (p = 0; ; p++) {
                x = pageWc * p;
                if (x >= totalWc && p > 0) break;
                var bx0 = T.x(x);
                var bx1 = Math.round(bx0 + PAGE_W * state.zoom);
                if (bx0 > vw) break;
                if (bx0 < vw) {
                    if (bx1 - bx0 >= PAGE_W * state.zoom * 0.5) {
                        dimStrip("top:0;bottom:0;left:" + Math.max(0, bx0) + "px;width:" +
                            Math.min(marginPx, Math.max(0, bx1 - bx0)) + "px;");
                        dimStrip("top:0;bottom:0;left:" + (bx1 - marginPx) + "px;width:" +
                            marginPx + "px;");
                    }
                }
                if (x >= totalWc) break;
            }
            /* Horizontal page bands (rows) — top/bottom margins. */
            for (p = 0; ; p++) {
                y = pageHc * p;
                if (y >= totalHc && p > 0) break;
                var by0 = T.y(y);
                var by1 = Math.round(by0 + PAGE_H * state.zoom);
                if (by0 > vh) break;
                if (by1 - by0 >= PAGE_H * state.zoom * 0.5) {
                    dimStrip("left:0;right:0;top:" + Math.max(0, by0) + "px;height:" +
                        Math.min(marginPx, Math.max(0, by1 - by0)) + "px;");
                    dimStrip("left:0;right:0;top:" + (by1 - marginPx) + "px;height:" +
                        marginPx + "px;");
                }
                if (y >= totalHc) break;
            }
        }

        /* Dashed boundaries — start inside the header strips so labels stay
           clean, exactly like Excel draws them through the sheet area. */
        xs.forEach(function (b) {
            frag.appendChild(el("div",
                "position:absolute;top:" + geom.chrome.colHeaderH + "px;bottom:0;left:" + b.at + "px;width:0;" +
                "border-left:2px dashed rgba(6,95,70,0.55);"));
        });
        ys.forEach(function (b) {
            frag.appendChild(el("div",
                "position:absolute;left:" + geom.chrome.rowHeaderW + "px;right:0;top:" + b.at + "px;height:0;" +
                "border-top:2px dashed rgba(6,95,70,0.55);"));
        });

        /* Corner intersections get a subtle dot marker. */
        xs.forEach(function (bx) {
            ys.forEach(function (by) {
                frag.appendChild(el("div",
                    "position:absolute;left:" + (bx.at - 3) + "px;top:" + (by.at - 3) + "px;" +
                    "width:6px;height:6px;border-radius:50%;background:#059669;opacity:.7;"));
            });
        });

        /* Page-number badges (Page Break Preview only): one per visible
           page cell, numbered row-major (across, then down). */
        if (state.view === "viewPage") {
            var colEdges = [geom.chrome.rowHeaderW].concat(xs.map(function (b) { return b.at; }));
            var rowEdges = [geom.chrome.colHeaderH].concat(ys.map(function (b) { return b.at; }));
            var pageNo = 0;
            rowEdges.forEach(function (ry) {
                colEdges.forEach(function (cxEdge) {
                    pageNo++;
                    frag.appendChild(el("div",
                        "position:absolute;left:" + (cxEdge + 6) + "px;top:" + (ry + 6) + "px;" +
                        "background:#059669;color:#fff;font:bold 10px Arial;padding:2px 7px;" +
                        "border-radius:4px;box-shadow:0 1px 3px rgba(6,78,59,.35);" +
                        "font-family:Arial,'Helvetica Neue',sans-serif;z-index:2;",
                        "Page " + pageNo));
                });
            });
        }

        ov.innerHTML = "";
        ov.style.display = "block";
        ov.appendChild(frag);
    }

    function refresh(force) {
        try {
            ensureZoomTracking();
            if (state.view === "viewNormal") { if (state.overlay) clearOverlay(); return; }
            var geom = collectGeometry();
            if (!geom) return;
            var sig = [
                state.zoom,
                geom.colOff.length, geom.rowOff.length,
                geom.colOff[geom.colOff.length - 1], geom.rowOff[geom.rowOff.length - 1],
                geom.freeze.fCol, geom.freeze.fRow
            ].join("|");
            if (!force && sig === state.lastGeom) { render(); return; }
            state.lastGeom = sig;
            render();
        } catch (err) { /* fail open */ }
    }

    /* ------------------------------------------------------------------ */
    /* Button wiring                                                       */
    /* ------------------------------------------------------------------ */
    function setActiveButton(type) {
        var btns = document.querySelectorAll(".luckysheet-print-viewBtn");
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.remove("luckysheet-print-viewBtn-active");
        }
        var target = document.querySelector('.luckysheet-print-viewBtn[type="' + type + '"]');
        if (target) target.classList.add("luckysheet-print-viewBtn-active");
    }

    function setView(view) {
        if (["viewNormal", "viewLayout", "viewPage"].indexOf(view) === -1) return;
        state.view = view;
        state.lastGeom = "";
        setActiveButton(view);
        if (view === "viewNormal") { clearOverlay(); return; }
        refresh(true);
    }

    function bindButtons() {
        if (state.bound) return;
        document.addEventListener("click", function (ev) {
            var t = ev.target;
            while (t && t !== document) {
                if (t.classList && t.classList.contains("luckysheet-print-viewBtn")) {
                    var type = t.getAttribute("type");
                    if (type) setView(type);
                    return;
                }
                t = t.parentNode;
            }
        }, true);
        state.bound = true;
    }

    /* ------------------------------------------------------------------ */
    /* Environment tracking                                                */
    /* ------------------------------------------------------------------ */
    function ensureZoomTracking() {
        if (!window.luckysheet || typeof window.luckysheet.zoom !== "function") return;
        if (window.__pvZoomWrapped) return;
        try {
            var orig = window.luckysheet.zoom;
            window.luckysheet.zoom = function (ratio) {
                if (typeof ratio === "number" && isFinite(ratio)) state.zoom = ratio;
                else state.zoom = 1;               /* reset semantics */
                var out = orig.apply(this, arguments);
                setTimeout(function () { refresh(true); }, 80);
                return out;
            };
            window.__pvZoomWrapped = true;
        } catch (err) { /* keep stock zoom */ }
    }

    function bindEnvironment() {
        var sx = $(".luckysheet-scrollbar-x");
        var sy = $(".luckysheet-scrollbar-y");
        if (sx && !sx.__pvBound) { sx.addEventListener("scroll", onScroll, { passive: true }); sx.__pvBound = true; }
        if (sy && !sy.__pvBound) { sy.addEventListener("scroll", onScroll, { passive: true }); sy.__pvBound = true; }
        if (!window.__pvResizeBound) {
            window.addEventListener("resize", function () { refresh(); }, { passive: true });
            window.__pvResizeBound = true;
        }
        /* Sheet switching: tab clicks land on the sheet area. */
        if (!window.__pvTabBound) {
            var area = $(".luckysheet-sheet-area");
            if (area) {
                area.addEventListener("click", function () {
                    setTimeout(function () { refresh(true); }, 120);
                }, true);
                window.__pvTabBound = true;
            }
        }
    }

    var rafPending = false;
    function onScroll() {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(function () {
            rafPending = false;
            refresh();
        });
    }

    /* ------------------------------------------------------------------ */
    /* Boot                                                                */
    /* ------------------------------------------------------------------ */
    function boot() {
        bindButtons();
        bindEnvironment();
        refresh(true);
    }

    /* The bottom bar is part of Luckysheet's template — observe until the
       buttons exist, then boot. Observer disconnects itself afterwards. */
    var observerTries = 0;
    var obs = new MutationObserver(function () {
        if ($(".luckysheet-print-viewList")) {
            obs.disconnect();
            boot();
        } else if (++observerTries > 400) {
            obs.disconnect();
        }
    });

    function start() {
        if ($(".luckysheet-print-viewList")) { boot(); return; }
        try {
            obs.observe(document.body, { childList: true, subtree: true });
        } catch (err) { /* headless edge: no-op */ }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    window.LuckysheetPrintView = {
        setView: setView,
        refresh: refresh,
        get view() { return state.view; }
    };
})();
