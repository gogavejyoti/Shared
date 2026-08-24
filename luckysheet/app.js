/* ============================================================
   Resource Planner - UI Interactions & Luckysheet Init
   ============================================================ */

$(function () {

  /* ---------- Loading Screen ---------- */
  var $loadingScreen = $("#loadingScreen");

  /* ---------- Luckysheet Initialization (PRESERVED) ---------- */
  luckysheet.create({
    container: "luckysheet",
    lang: "en",
    local: "en-US",
    plugins: [{ name: "chart" }],
    data: demoData,
    showinfobar: false, /* remove top info bar (title/sync/user strip) */
    hook: window.GridThemeHooks, /* light-green header wash (js/grid-line-theme.js) */
  });

  /* Dismiss loading screen after Luckysheet is ready */
  setTimeout(function () {
    window.dispatchEvent(new Event("resize"));
    if ($loadingScreen.length) {
      $loadingScreen.addClass("loaded");
      setTimeout(function () {
        $loadingScreen.remove();
      }, 400);
    }
  }, 600);

  /* ---------- Initialize GroupManager ---------- */
  if (typeof GroupManager !== "undefined") {
    GroupManager.init();
  }

  /* ---------- Sidebar Toggle ---------- */
  var $sidebar = $("#sidebar");
  var $sidebarOverlay = $('<div class="sidebar-overlay"></div>').appendTo("body");

  $("#sidebarToggle").on("click", function () {
    if ($(window).width() <= 1024) {
      $sidebar.toggleClass("open");
      $sidebarOverlay.toggleClass("visible", $sidebar.hasClass("open"));
    } else {
      $sidebar.toggleClass("collapsed");
    }
  });

  $sidebarOverlay.on("click", function () {
    $sidebar.removeClass("open");
    $sidebarOverlay.removeClass("visible");
  });

  /* ---------- AI Panel Toggle ---------- */
  var $aiPanel = $("#aiPanel");

  $("#aiToggle").on("click", function () {
    $aiPanel.toggleClass("hidden");
    setTimeout(function () {
      window.dispatchEvent(new Event("resize"));
    }, 350);
  });

  $("#aiPanelClose").on("click", function () {
    $aiPanel.addClass("hidden");
    setTimeout(function () {
      window.dispatchEvent(new Event("resize"));
    }, 350);
  });

  /* ---------- Sidebar Navigation ---------- */
  $(".sidebar-nav-item").on("click", function (e) {
    e.preventDefault();
    $(".sidebar-nav-item").removeClass("active");
    $(this).addClass("active");
  });

  /* ---------- Sidebar Sheet Items ---------- */
  $(".sidebar-sheet-item").on("click", function (e) {
    e.preventDefault();
    $(".sidebar-sheet-item").removeClass("active");
    $(this).addClass("active");

    var index = $(this).data("index");
    if (typeof luckysheet !== "undefined" && luckysheet.setSheetActive) {
      luckysheet.setSheetActive(index);
    }

    /* Also sync the Luckysheet bottom sheet tabs */
    syncSheetTabs(index);
  });

  function syncSheetTabs(activeIndex) {
    /* Update our sidebar to reflect Luckysheet tab clicks */
    $(".sidebar-sheet-item").removeClass("active");
    $('.sidebar-sheet-item[data-index="' + activeIndex + '"]').addClass("active");
  }

  /* Observe Luckysheet sheet tab clicks (bottom bar) */
  $(document).on("click", ".luckysheet-sheets-item", function () {
    var idx = $(this).index();
    syncSheetTabs(idx);
  });

  /* ---------- Ribbon Tab Switching ---------- */
  $(".ribbon-tab").on("click", function () {
    $(".ribbon-tab").removeClass("active");
    $(this).addClass("active");
  });

  /* ---------- Status Bar: Cell Selection Update ---------- */
  $(document).on("click", "#luckysheet .luckysheet-cell-main", function () {
    updateStatusBar();
  });

  function updateStatusBar() {
    try {
      if (typeof luckysheet === "undefined") return;

      var sheet = luckysheet.getSheet();
      if (!sheet) return;

      var selected = sheet.luckysheet_select_save;
      if (selected && selected.length > 0) {
        var range = selected[0];
        var r = range.row[0];
        var c = range.column[0];

        var colLetter = getColLetter(c);
        var rowNumber = r + 1;
        $("#statusCell").html(
          '<i class="fa-regular fa-hand-pointer"></i> Cell: ' + colLetter + rowNumber
        );
      }

      updateSheetInfo();
    } catch (e) {
      /* silently ignore if selection isn't available yet */
    }
  }

  function getColLetter(col) {
    var letter = "";
    col++;
    while (col > 0) {
      col--;
      letter = String.fromCharCode(65 + (col % 26)) + letter;
      col = Math.floor(col / 26);
    }
    return letter;
  }

  /* ---------- Status Bar: Rows/Cols/Formulas ---------- */
  function updateSheetInfo() {
    try {
      if (typeof luckysheet === "undefined") return;

      var sheet = luckysheet.getSheet();
      if (!sheet) return;

      var totalRows = sheet.row || 50;
      var totalCols = sheet.column || 20;

      $("#statusRows").text("Rows: " + totalRows);
      $("#statusCols").text("Cols: " + totalCols);

      var formulaCount = 0;
      if (sheet.celldata) {
        for (var i = 0; i < sheet.celldata.length; i++) {
          var cell = sheet.celldata[i];
          if (cell && cell.v && cell.v.v && String(cell.v.v).indexOf("=") === 0) {
            formulaCount++;
          }
        }
      }
      $("#statusFormulas").html(
        '<i class="fa-solid fa-function"></i> Formulas: ' + formulaCount
      );
    } catch (e) {
      /* silently ignore */
    }
  }

  setTimeout(updateSheetInfo, 800);
  /* Periodic refresh of status bar */
  setInterval(updateStatusBar, 2000);

  /* ---------- Zoom Controls ---------- */
  var currentZoom = 100;
  var $zoomValue = $("#zoomValue");

  $("#zoomIn").on("click", function () {
    if (currentZoom < 200) {
      currentZoom += 10;
      applyZoom();
    }
  });

  $("#zoomOut").on("click", function () {
    if (currentZoom > 50) {
      currentZoom -= 10;
      applyZoom();
    }
  });

  function applyZoom() {
    $zoomValue.text(currentZoom + "%");
    try {
      if (typeof luckysheet !== "undefined" && luckysheet.zoom) {
        luckysheet.zoom(currentZoom / 100);
      }
    } catch (e) {
      /* fallback: just update display */
    }
  }

  /* ---------- Last Saved Time ---------- */
  function updateLastSaved() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    var timeStr = hours + ":" + minutes + " " + ampm;
    $("#lastSavedTime").text(timeStr);
  }

  updateLastSaved();
  setInterval(updateLastSaved, 60000);

  /* ---------- Keyboard Shortcuts ---------- */
  $(document).on("keydown", function (e) {
    /* Ctrl+K: Search Focus */
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      $(".search-box input").focus();
    }

    /* Ctrl+S: Save (prevent default, placeholder) */
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      updateLastSaved();
    }
  });

  /* ---------- Placeholder Button Actions ---------- */
  $("#btnNew").on("click", function () {
    /* placeholder */
  });

  $("#btnSave").on("click", function () {
    updateLastSaved();
  });

  $("#btnImport").on("click", function () {
    /* placeholder */
  });

  $("#btnExport").on("click", function () {
    /* placeholder */
  });

  /* ---------- Dark Mode Toggle ---------- */
  function initDarkMode() {
    var saved = localStorage.getItem("rp-dark-mode");
    if (saved === "true") {
      document.documentElement.classList.add("dark-mode");
    }
  }

  initDarkMode();

  /* Expose for future use */
  window.toggleDarkMode = function () {
    document.documentElement.classList.toggle("dark-mode");
    var isDark = document.documentElement.classList.contains("dark-mode");
    localStorage.setItem("rp-dark-mode", isDark);
  };

  /* ---------- Window Resize Handler ---------- */
  var resizeTimer;
  $(window).on("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      window.dispatchEvent(new Event("resize"));
    }, 150);
  });

});
