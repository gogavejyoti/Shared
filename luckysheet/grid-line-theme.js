/* ============================================================================
   GRID LINE THEME SHIM (Luckysheet)
   ----------------------------------------------------------------------------
   WHY: Luckysheet paints cell gridlines AND row/column-header hairlines on a
   <canvas> with a hardcoded module-private config:

       pl = { ..., strokeStyle: "#dfdfdf", ... }

   "#dfdfdf" occurs EXACTLY ONCE in luckysheet.umd.js (verified), so mapping
   that single string at the Canvas2D prototype level recolors every gridline
   and header rule app-wide with ZERO effect on any other drawing (cell fills,
   borders, text, charts all use different colors / fillStyle).

   HOW: Intercepts only the exact legacy string on the strokeStyle setter,
   delegating everything else to the native accessor. Idempotent + fail-open.

   TUNE: set window.GRID_LINE_COLOR before this script to override the target.
   ============================================================================ */
(function () {
    "use strict";

    var FROM = "#dfdfdf";                                          // legacy ink (do not change)
    var TO = String(window.GRID_LINE_COLOR || "#d2e7da");          // light sage green

    if (window.__lsGridLinePatched) return;

    var desc = Object.getOwnPropertyDescriptor(
        CanvasRenderingContext2D.prototype,
        "strokeStyle"
    );
    if (!desc || !desc.set || !desc.get) return;                   // exotic engine: bail out

    try {
        Object.defineProperty(CanvasRenderingContext2D.prototype, "strokeStyle", {
            get: function () {
                return desc.get.call(this);
            },
            set: function (value) {
                if (typeof value === "string" && value.toLowerCase() === FROM) {
                    value = TO;
                }
                desc.set.call(this, value);
            },
            enumerable: true,
            configurable: true
        });
        window.__lsGridLinePatched = true;
    } catch (err) {
        /* Fail open: stock rendering remains untouched. */
    }
})();

/* ============================================================================
   HEADER FONT (Arial)
   ----------------------------------------------------------------------------
   Header labels (A,B,C… / 1,2,3…) are drawn with the internal builder:
       "normal normal normal <size>pt Times New Roman, Helvetica Neue, …"
   (fontarray[0] = "Times New Roman" is Luckysheet's stock default).
   We rewrite ONLY that exact pattern on the canvas `font` setter so Arial
   leads the stack. Blast radius: headers + cells that never set an explicit
   font — i.e. everything that currently renders Times New Roman by fallback.
   Cells carrying their own font (ff style) are untouched.
   TUNE: set window.GRID_HEADER_FONT before this script to override.
   ============================================================================ */
(function () {
    "use strict";

    var FROM_FAMILY = /(^|\s)(\S+\s+\S+\s+\S+\s+\d+(?:\.\d+)?pt\s+)Times New Roman,/;
    var TO_FAMILY = String(window.GRID_HEADER_FONT || "Arial");

    if (window.__lsHeaderFontPatched) return;

    var desc = Object.getOwnPropertyDescriptor(
        CanvasRenderingContext2D.prototype,
        "font"
    );
    if (!desc || !desc.set || !desc.get) return;

    try {
        Object.defineProperty(CanvasRenderingContext2D.prototype, "font", {
            get: function () {
                return desc.get.call(this);
            },
            set: function (value) {
                if (typeof value === "string" && value.indexOf("Times New Roman") !== -1 && /^normal normal normal \d+(?:\.\d+)?pt /.test(value)) {
                    value = value.replace(FROM_FAMILY, "$1$2\"" + TO_FAMILY + "\",");
                }
                desc.set.call(this, value);
            },
            enumerable: true,
            configurable: true
        });
        window.__lsHeaderFontPatched = true;
    } catch (err) {
        /* Fail open: stock rendering remains untouched. */
    }
})();

/* ============================================================================
   HEADER BACKGROUND HOOKS
   ----------------------------------------------------------------------------
   Luckysheet paints row-number / column-header cells as WHITE canvas fills
   ("#ffffff" -> fillRect) followed by text and hairlines. Mapping that white
   globally would recolor cell backgrounds too, so instead we use Luckysheet's
   OFFICIAL render hooks. The *After variants receive the exact cell rect once
   default painting is done; we lay a translucent sage wash over each header
   cell (text keeps full contrast — same technique as Google Sheets).

   Wire-up: pass `hook: window.GridThemeHooks` to luckysheet.create().
   TUNE:    set window.GRID_HEADER_TINT before this script to override.
   ============================================================================ */
(function () {
    "use strict";

    var TINT = String(window.GRID_HEADER_TINT || "rgba(16, 185, 129, 0.10)");

    function paint(ctx, x, y, w, h) {
        if (!ctx || typeof ctx.fillRect !== "function") return;
        ctx.fillStyle = TINT;
        ctx.fillRect(x, y, w, h);
    }

    window.GridThemeHooks = {
        /* pos = { r, top, width, height } — strip starts at x = 0 */
        rowTitleCellRenderAfter: function (num, pos, ctx) {
            if (!pos) return;
            paint(ctx, 0, pos.top, pos.width, pos.height);
        },
        /* pos = { c, left, width, height } — strip starts at y = 0 */
        columnTitleCellRenderAfter: function (num, pos, ctx) {
            if (!pos) return;
            paint(ctx, pos.left, 0, pos.width, pos.height);
        }
    };
})();
