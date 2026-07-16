/* ============================================================
   GroupManager — Native Excel-style Row & Column Grouping
   Uses Luckysheet config.rowhidden / colhidden + setConfig API
   ============================================================ */
var GroupManager = (function () {
  "use strict";

  /* ---------- state ---------- */
  var _panelRow = null;
  var _panelCol = null;
  var _resizeTimer = null;
  var _scrollTimer = null;
  var _menuInjected = false;
  var _toolbarInjected = false;

  /* ---------- helpers ---------- */
  function _getSheet() {
    try {
      if (typeof luckysheet.getSheet === "function") {
        var s = luckysheet.getSheet();
        if (s) return s;
      }
    } catch (e) {}
    try {
      var sheets = luckysheet.getluckysheetfile();
      if (!sheets || !sheets.length) return null;
      try {
        var sel = luckysheet.getluckysheet_select_save();
        if (sel && sel[0] && sel[0].sheetIndex != null) {
          for (var i = 0; i < sheets.length; i++) {
            if (sheets[i].index === sel[0].sheetIndex) return sheets[i];
          }
        }
      } catch (e2) {}
      return sheets[0];
    } catch (e) {
      return null;
    }
  }

  function _getGroups(sheet, type) {
    if (!sheet) return [];
    var key = type === "row" ? "rowGroups" : "columnGroups";
    if (!sheet[key]) sheet[key] = [];
    return sheet[key];
  }

  function _setGroups(sheet, type, groups) {
    var key = type === "row" ? "rowGroups" : "columnGroups";
    sheet[key] = groups;
  }

  function _sortGroups(groups) {
    return groups.slice().sort(function (a, b) {
      return a.start - b.start;
    });
  }

  function _maxLevel(groups) {
    var mx = 0;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].level > mx) mx = groups[i].level;
    }
    return mx;
  }

  function _hideMenu() {
    try {
      $("#luckysheet-rightclick-menu").hide();
      if (typeof rt === "function") rt();
    } catch (e) {}
  }

  /* ---------- get set of all indices managed by any group ---------- */
  function _getManagedIndices(type) {
    var sheet = _getSheet();
    if (!sheet) return {};
    var groups = _getGroups(sheet, type);
    var total = type === "row" ? (sheet.row || 50) : (sheet.column || 20);
    var indices = {};
    for (var g = 0; g < groups.length; g++) {
      for (var r = groups[g].start; r <= groups[g].end; r++) {
        if (r < total) indices[r] = true;
      }
    }
    return indices;
  }

  /* ---------- compute hidden rows/cols for ALL groups on current sheet ---------- */
  function _computeAllHidden(type) {
    var sheet = _getSheet();
    if (!sheet) return {};
    var groups = _getGroups(sheet, type);
    var total = type === "row" ? (sheet.row || 50) : (sheet.column || 20);
    var hidden = {};
    var sorted = _sortGroups(groups);
    for (var g = 0; g < sorted.length; g++) {
      if (sorted[g].collapsed) {
        for (var r = sorted[g].start; r <= sorted[g].end; r++) {
          if (r < total) hidden[r] = 0;
        }
      }
    }
    return hidden;
  }

  /* ---------- apply config: merge BOTH row and column hidden states ---------- */
  function _applyConfig() {
    var existing;
    try {
      existing = luckysheet.getConfig();
    } catch (e) {
      try {
        existing = luckysheet.getconfig();
      } catch (e2) {
        existing = {};
      }
    }
    var cfg = $.extend(true, {}, existing || {});

    var rowH = _computeAllHidden("row");
    var colH = _computeAllHidden("column");

    /* Preserve any rowhidden set by other features (e.g. filters),
       but EXCLUDE rows managed by any group (they are controlled
       solely by the collapsed flag, not stale config remnants). */
    var managedRows = _getManagedIndices("row");
    var managedCols = _getManagedIndices("column");

    if (existing.rowhidden) {
      for (var rk in existing.rowhidden) {
        if (!(rk in managedRows) && !(rk in rowH))
          rowH[rk] = existing.rowhidden[rk];
      }
    }
    if (existing.colhidden) {
      for (var ck in existing.colhidden) {
        if (!(ck in managedCols) && !(ck in colH))
          colH[ck] = existing.colhidden[ck];
      }
    }

    cfg.rowhidden = rowH;
    cfg.colhidden = colH;

    try {
      luckysheet.setConfig(cfg);
    } catch (e) {
      console.warn("[GroupManager] setConfig failed:", e);
    }

    /* Force re-render */
    try {
      if (typeof luckysheet.luckysheetrefreshgrid === "function") {
        luckysheet.luckysheetrefreshgrid();
      } else if (typeof luckysheet.refresh === "function") {
        luckysheet.refresh();
      }
    } catch (e) {}
  }

  /* ---------- collapse / expand ---------- */
  function toggleGroup(type, index) {
    var sheet = _getSheet();
    if (!sheet) return;
    var groups = _getGroups(sheet, type);
    if (index < 0 || index >= groups.length) return;

    groups[index].collapsed = !groups[index].collapsed;
    _setGroups(sheet, type, groups);
    _applyConfig();
    _renderPanel(type);
  }

  function collapseAll(type) {
    var sheet = _getSheet();
    if (!sheet) return;
    var groups = _getGroups(sheet, type);
    for (var i = 0; i < groups.length; i++) groups[i].collapsed = true;
    _setGroups(sheet, type, groups);
    _applyConfig();
    _renderPanel(type);
  }

  function expandAll(type) {
    var sheet = _getSheet();
    if (!sheet) return;
    var groups = _getGroups(sheet, type);
    for (var i = 0; i < groups.length; i++) groups[i].collapsed = false;
    _setGroups(sheet, type, groups);
    _applyConfig();
    _renderPanel(type);
  }

  /* ---------- CRUD: create / remove groups from selection ---------- */
  function createGroup(type) {
    var sheet = _getSheet();
    if (!sheet) return;

    var sel;
    try {
      sel = luckysheet.getluckysheet_select_save();
    } catch (e) {
      return;
    }
    if (!sel || !sel.length) return;

    var range = sel[0];
    var start, end;
    if (type === "row") {
      start = range.row[0];
      end = range.row[1];
    } else {
      start = range.column[0];
      end = range.column[1];
    }

    if (start == null || end == null) return;

    var groups = _getGroups(sheet, type);
    var level = groups.length > 0 ? _maxLevel(groups) + 1 : 1;

    groups.push({
      start: start,
      end: end,
      level: level,
      collapsed: false,
    });

    _setGroups(sheet, type, groups);
    _applyConfig();
    _renderPanel(type);
  }

  /* ---------- clear stale hidden state for a range before group removal ---------- */
  function _clearHiddenRange(type, start, end) {
    try {
      var cfg = luckysheet.getConfig() || {};
      var key = type === "row" ? "rowhidden" : "colhidden";
      if (!cfg[key]) return;
      var changed = false;
      for (var i = start; i <= end; i++) {
        if (i in cfg[key]) {
          delete cfg[key][i];
          changed = true;
        }
      }
      if (changed) luckysheet.setConfig(cfg);
    } catch (e) {}
  }

  function removeGroup(type, index) {
    var sheet = _getSheet();
    if (!sheet) return;

    var groups = _getGroups(sheet, type);
    if (index < 0 || index >= groups.length) return;

    var removed = groups.splice(index, 1)[0];
    _setGroups(sheet, type, groups);

    if (removed && removed.collapsed) {
      _clearHiddenRange(type, removed.start, removed.end);
    }

    _applyConfig();
    _renderPanel(type);
  }

  function removeAllGroups(type) {
    var sheet = _getSheet();
    if (!sheet) return;

    var groups = _getGroups(sheet, type);
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].collapsed) {
        _clearHiddenRange(type, groups[i].start, groups[i].end);
      }
    }

    _setGroups(sheet, type, []);
    _applyConfig();
    _renderPanel(type);
  }

  function removeGroupsForSelection(type) {
    var sheet = _getSheet();
    if (!sheet) return;

    var sel;
    try {
      sel = luckysheet.getluckysheet_select_save();
    } catch (e) {
      return;
    }
    if (!sel || !sel.length) return;

    var range = sel[0];
    var selStart, selEnd;
    if (type === "row") {
      selStart = range.row[0];
      selEnd = range.row[1];
    } else {
      selStart = range.column[0];
      selEnd = range.column[1];
    }
    if (selStart == null || selEnd == null) return;

    var groups = _getGroups(sheet, type);
    var remaining = [];
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var overlaps = g.start <= selEnd && g.end >= selStart;
      if (overlaps && g.collapsed) {
        _clearHiddenRange(type, g.start, g.end);
      }
      if (!overlaps) {
        remaining.push(g);
      }
    }

    _setGroups(sheet, type, remaining);
    _applyConfig();
    _renderPanel(type);
  }

  /* ---------- render indicator panels ---------- */
  function _renderPanel(type) {
    if (type === "row") _renderRowPanel();
    else _renderColumnPanel();
  }

  function _renderRowPanel() {
    if (_panelRow) _panelRow.remove();
    _panelRow = null;

    var sheet = _getSheet();
    if (!sheet) return;
    var groups = _getGroups(sheet, "row");
    if (groups.length === 0) return;

    var sorted = _sortGroups(groups);
    var $container = $("#spreadsheetContainer");
    var $cellMain = $("#luckysheet-cell-main");

    if (!$cellMain.length || !$container.length) return;

    var containerRect = $container[0].getBoundingClientRect();
    var cellMainRect = $cellMain[0].getBoundingClientRect();
    var scrollTop = $cellMain.scrollTop() || 0;

    var vis = sheet.visibledatarow || [];
    if (vis.length === 0) return;

    var totalHeight = vis[vis.length - 1] || 800;
    var panelWidth = 22;
    var panelLeft = cellMainRect.left - containerRect.left - panelWidth;

    var $panel = $('<div class="group-panel group-panel-row"></div>').css({
      position: "absolute",
      left: panelLeft + "px",
      top: (cellMainRect.top - containerRect.top) + "px",
      width: panelWidth + "px",
      height: cellMainRect.height + "px",
      zIndex: 200,
      overflow: "hidden",
    });

    var $inner = $('<div class="group-panel-inner"></div>').css({
      position: "relative",
      width: "100%",
      height: totalHeight + "px",
      transform: "translateY(-" + scrollTop + "px)",
      transition: "transform 80ms linear",
    });

    for (var i = 0; i < sorted.length; i++) {
      var g = sorted[i];
      var topPos = g.start > 0 ? (vis[g.start - 1] || 0) : 0;
      var bottomPos = vis[g.end] || (vis[vis.length - 1] || 800);
      var bracketH = Math.max(bottomPos - topPos, 20);

      var $bracket = $('<div class="group-bracket"></div>').css({
        position: "absolute",
        left: "0",
        top: topPos + "px",
        width: "100%",
        height: bracketH + "px",
      });

      var $line = $('<div class="group-bracket-line"></div>').css({
        position: "absolute",
        left: "8px",
        top: "0",
        width: "2px",
        height: "100%",
        background: "#94A3B8",
        borderRadius: "1px",
      });

      var $btn = $(
        '<button class="group-btn" title="' +
          (g.collapsed ? "Expand" : "Collapse") +
          " group " +
          (i + 1) +
          '">' +
          (g.collapsed ? "+" : "\u2212") +
          "</button>"
      ).css({
        position: "absolute",
        left: "1px",
        bottom: "-7px",
        width: "14px",
        height: "14px",
        borderRadius: "3px",
        border: "1px solid #CBD5E1",
        background: "#FFFFFF",
        color: "#475569",
        fontSize: "10px",
        lineHeight: "12px",
        textAlign: "center",
        cursor: "pointer",
        padding: "0",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        zIndex: 1,
      });

      (function (idx) {
        $btn.on("click", function (e) {
          e.stopPropagation();
          toggleGroup("row", idx);
        });
      })(i);

      $bracket.append($line).append($btn);
      $inner.append($bracket);
    }

    $panel.append($inner);
    $container.append($panel);
    _panelRow = $panel;
  }

  function _renderColumnPanel() {
    if (_panelCol) _panelCol.remove();
    _panelCol = null;

    var sheet = _getSheet();
    if (!sheet) return;
    var groups = _getGroups(sheet, "column");
    if (groups.length === 0) return;

    var sorted = _sortGroups(groups);
    var $container = $("#spreadsheetContainer");
    var $cellMain = $("#luckysheet-cell-main");

    if (!$cellMain.length || !$container.length) return;

    var containerRect = $container[0].getBoundingClientRect();
    var cellMainRect = $cellMain[0].getBoundingClientRect();
    var scrollLeft = $cellMain.scrollLeft() || 0;

    var vis = sheet.visibledatacolumn || [];
    if (vis.length === 0) return;

    var totalWidth = vis[vis.length - 1] || 1200;
    var panelHeight = 22;
    var panelTop = cellMainRect.top - containerRect.top - panelHeight;

    var $panel = $('<div class="group-panel group-panel-col"></div>').css({
      position: "absolute",
      top: panelTop + "px",
      left: (cellMainRect.left - containerRect.left) + "px",
      width: cellMainRect.width + "px",
      height: panelHeight + "px",
      zIndex: 200,
      overflow: "hidden",
    });

    var $inner = $('<div class="group-panel-inner"></div>').css({
      position: "relative",
      width: totalWidth + "px",
      height: "100%",
      transform: "translateX(-" + scrollLeft + "px)",
      transition: "transform 80ms linear",
    });

    for (var i = 0; i < sorted.length; i++) {
      var g = sorted[i];
      var leftPos = g.start > 0 ? (vis[g.start - 1] || 0) : 0;
      var rightPos = vis[g.end] || (vis[vis.length - 1] || 1200);
      var bracketW = Math.max(rightPos - leftPos, 20);

      var $bracket = $('<div class="group-bracket group-bracket-col"></div>').css({
        position: "absolute",
        top: "0",
        left: leftPos + "px",
        height: "100%",
        width: bracketW + "px",
      });

      var $line = $('<div class="group-bracket-line"></div>').css({
        position: "absolute",
        top: "8px",
        left: "0",
        height: "2px",
        width: "100%",
        background: "#94A3B8",
        borderRadius: "1px",
      });

      var $btn = $(
        '<button class="group-btn" title="' +
          (g.collapsed ? "Expand" : "Collapse") +
          " group " +
          (i + 1) +
          '">' +
          (g.collapsed ? "+" : "\u2212") +
          "</button>"
      ).css({
        position: "absolute",
        top: "1px",
        right: "-7px",
        width: "14px",
        height: "14px",
        borderRadius: "3px",
        border: "1px solid #CBD5E1",
        background: "#FFFFFF",
        color: "#475569",
        fontSize: "10px",
        lineHeight: "12px",
        textAlign: "center",
        cursor: "pointer",
        padding: "0",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        zIndex: 1,
      });

      (function (idx) {
        $btn.on("click", function (e) {
          e.stopPropagation();
          toggleGroup("column", idx);
        });
      })(i);

      $bracket.append($line).append($btn);
      $inner.append($bracket);
    }

    $panel.append($inner);
    $container.append($panel);
    _panelCol = $panel;
  }

  /* ---------- refresh ---------- */
  function refresh() {
    _renderPanel("row");
    _renderPanel("column");
  }

  /* ---------- inject context menu items ---------- */
  function _injectContextMenu() {
    var menuEl = document.getElementById("luckysheet-rightclick-menu");
    if (!menuEl) return false;

    var $menu = $(menuEl);
    if ($menu.find("#group-rows-item").length > 0) {
      _menuInjected = true;
      return true;
    }

    var html =
      '<div class="luckysheet-menuseparator luckysheet-mousedown-cancel" role="separator"></div>' +
      '<div id="group-rows-item" class="luckysheet-cols-menuitem luckysheet-mousedown-cancel">' +
        '<div class="luckysheet-cols-menuitem-content luckysheet-mousedown-cancel">' +
          '<i class="fa-solid fa-layer-group" style="margin-right:6px;opacity:0.5"></i>' +
          "Group Rows" +
        "</div></div>" +
      '<div id="group-cols-item" class="luckysheet-cols-menuitem luckysheet-mousedown-cancel">' +
        '<div class="luckysheet-cols-menuitem-content luckysheet-mousedown-cancel">' +
          '<i class="fa-solid fa-layer-group" style="margin-right:6px;opacity:0.5"></i>' +
          "Group Columns" +
        "</div></div>" +
      '<div class="luckysheet-menuseparator luckysheet-mousedown-cancel" role="separator"></div>' +
      '<div id="ungroup-rows-item" class="luckysheet-cols-menuitem luckysheet-mousedown-cancel">' +
        '<div class="luckysheet-cols-menuitem-content luckysheet-mousedown-cancel">' +
          "Ungroup Rows" +
        "</div></div>" +
      '<div id="ungroup-cols-item" class="luckysheet-cols-menuitem luckysheet-mousedown-cancel">' +
        '<div class="luckysheet-cols-menuitem-content luckysheet-mousedown-cancel">' +
          "Ungroup Columns" +
        "</div></div>" +
      '<div class="luckysheet-menuseparator luckysheet-mousedown-cancel" role="separator"></div>' +
      '<div id="collapse-all-item" class="luckysheet-cols-menuitem luckysheet-mousedown-cancel">' +
        '<div class="luckysheet-cols-menuitem-content luckysheet-mousedown-cancel">' +
          "Collapse All Groups" +
        "</div></div>" +
      '<div id="expand-all-item" class="luckysheet-cols-menuitem luckysheet-mousedown-cancel">' +
        '<div class="luckysheet-cols-menuitem-content luckysheet-mousedown-cancel">' +
          "Expand All Groups" +
        "</div></div>";

    $menu.append(html);

    /* Bind using mousedown (fires before Luckysheet's click-to-hide) */
    $menu
      .off("mousedown.groupItems")
      .on("mousedown.groupItems", "#group-rows-item", function (e) {
        e.stopPropagation();
        _hideMenu();
        setTimeout(function () { createGroup("row"); }, 10);
      })
      .on("mousedown.groupItems", "#group-cols-item", function (e) {
        e.stopPropagation();
        _hideMenu();
        setTimeout(function () { createGroup("column"); }, 10);
      })
      .on("mousedown.groupItems", "#ungroup-rows-item", function (e) {
        e.stopPropagation();
        _hideMenu();
        setTimeout(function () { removeGroupsForSelection("row"); }, 10);
      })
      .on("mousedown.groupItems", "#ungroup-cols-item", function (e) {
        e.stopPropagation();
        _hideMenu();
        setTimeout(function () { removeGroupsForSelection("column"); }, 10);
      })
      .on("mousedown.groupItems", "#collapse-all-item", function (e) {
        e.stopPropagation();
        _hideMenu();
        setTimeout(function () {
          collapseAll("row");
          collapseAll("column");
        }, 10);
      })
      .on("mousedown.groupItems", "#expand-all-item", function (e) {
        e.stopPropagation();
        _hideMenu();
        setTimeout(function () {
          expandAll("row");
          expandAll("column");
        }, 10);
      });

    _menuInjected = true;
    return true;
  }

  /* ---------- inject toolbar buttons ---------- */
  function _injectToolbar() {
    var ribbonEl = document.getElementById("ribbonContent");
    if (!ribbonEl) return;

    var $ribbon = $(ribbonEl);
    if ($ribbon.find("#group-toolbar-btn").length > 0) {
      _toolbarInjected = true;
      return;
    }

    var $sep = $('<div class="ribbon-separator"></div>');
    var $group = $('<div class="ribbon-group"></div>');

    $group.append(
      '<button class="ribbon-btn" id="group-toolbar-btn" title="Group selected rows or columns" style="width:auto;padding:0 8px;font-size:11px;gap:4px;">' +
        '<i class="fa-solid fa-layer-group"></i>' +
        '<span>Group</span>' +
        "</button>"
    );

    $group.append(
      '<button class="ribbon-btn" id="ungroup-toolbar-btn" title="Remove all groups" style="width:auto;padding:0 8px;font-size:11px;gap:4px;">' +
        '<i class="fa-solid fa-layer-group" style="opacity:0.5"></i>' +
        '<span>Ungroup</span>' +
        "</button>"
    );

    $ribbon.append($sep).append($group);

    var $dropdown = $(
      '<select id="group-type-select" style="' +
        "height:22px;font-size:11px;padding:0 4px;border:1px solid #CBD5E1;" +
        "border-radius:4px;background:#fff;color:#374151;cursor:pointer;" +
        'margin-left:4px;">' +
        '<option value="row">Rows</option>' +
        '<option value="column">Columns</option>' +
        "</select>"
    );
    $group.append($dropdown);

    $(document).on("click", "#group-toolbar-btn", function () {
      var type = $("#group-type-select").val() || "row";
      createGroup(type);
    });

    $(document).on("click", "#ungroup-toolbar-btn", function () {
      var type = $("#group-type-select").val() || "row";
      removeGroupsForSelection(type);
    });

    _toolbarInjected = true;
  }

  /* ---------- init ---------- */
  function init() {
    /* Inject toolbar buttons */
    var toolbarAttempts = 0;
    function tryInjectToolbar() {
      _injectToolbar();
      if (!_toolbarInjected && toolbarAttempts < 40) {
        toolbarAttempts++;
        setTimeout(tryInjectToolbar, 250);
      }
    }
    setTimeout(tryInjectToolbar, 200);

    /* Inject context menu on right-click */
    $(document).on("mousedown.groupMenuInit", function (e) {
      if (e.button === 2) {
        setTimeout(_injectContextMenu, 30);
      }
    });

    /* Also try to inject once after a delay */
    setTimeout(_injectContextMenu, 600);

    /* Render initial panels after Luckysheet is ready */
    setTimeout(function () {
      refresh();
    }, 1000);

    /* Sheet switching */
    $(document).on("click", ".luckysheet-sheets-item", function () {
      setTimeout(refresh, 200);
    });

    /* Scroll tracking — attach directly to the scrollable element
       (scroll events do not bubble, so delegation on document won't work) */
    function _attachScroll() {
      var $cm = $("#luckysheet-cell-main");
      if ($cm.length && !$cm.data("groupScrollBound")) {
        $cm.data("groupScrollBound", true).on("scroll.groupPanel", function () {
          if (_scrollTimer) clearTimeout(_scrollTimer);
          _scrollTimer = setTimeout(refresh, 50);
        });
      }
    }
    var scrollAttempts = 0;
    function _tryScrollBind() {
      _attachScroll();
      if (!$("#luckysheet-cell-main").data("groupScrollBound") && scrollAttempts < 40) {
        scrollAttempts++;
        setTimeout(_tryScrollBind, 250);
      }
    }
    setTimeout(_tryScrollBind, 500);

    /* Resize tracking */
    $(window).on("resize", function () {
      if (_resizeTimer) clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(refresh, 150);
    });
  }

  /* ---------- public API ---------- */
  return {
    init: init,
    toggleGroup: toggleGroup,
    createGroup: createGroup,
    removeGroup: removeGroup,
    removeAllGroups: removeAllGroups,
    removeGroupsForSelection: removeGroupsForSelection,
    collapseAll: collapseAll,
    expandAll: expandAll,
    refresh: refresh,
    getGroups: function (type) {
      return _getGroups(_getSheet(), type);
    },
  };
})();
