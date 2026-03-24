(function () {
  var grid = document.getElementById("shop-grid");
  var searchInput = document.getElementById("shop-search-input");
  var resultsCount = document.getElementById("results-count");
  var resultsEmpty = document.getElementById("results-empty");
  var categoryRadios = document.querySelectorAll('input[name="category"]');
  var availabilityRadios = document.querySelectorAll('input[name="availability"]');
  var clearBtn = document.getElementById("clear-filters");

  if (!grid) return;

  var cards = Array.from(grid.querySelectorAll(".shop-card"));

  function getFilters() {
    var category = document.querySelector('input[name="category"]:checked');
    var availability = document.querySelector('input[name="availability"]:checked');
    return {
      category: category ? category.value : "all",
      availability: availability ? availability.value : "all",
      search: (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : ""
    };
  }

  function filterCards() {
    var filters = getFilters();
    var visible = 0;

    cards.forEach(function (card) {
      var cat = card.getAttribute("data-category") || "";
      var avail = card.getAttribute("data-availability") || "available";
      var title = (card.getAttribute("data-title") || "").toLowerCase();
      var meta = (card.getAttribute("data-meta") || "").toLowerCase();
      var searchMatch = !filters.search ||
        title.indexOf(filters.search) >= 0 ||
        meta.indexOf(filters.search) >= 0;

      var categoryMatch = filters.category === "all" || cat === filters.category;
      var availabilityMatch = filters.availability === "all" || avail === filters.availability;

      var show = searchMatch && categoryMatch && availabilityMatch;
      card.hidden = !show;
      if (show) visible++;
    });

    if (resultsCount) {
      resultsCount.textContent = visible + " product" + (visible === 1 ? "" : "s");
    }
    if (resultsEmpty) {
      resultsEmpty.hidden = visible > 0;
    }
  }

  function init() {
    filterCards();
    cards.forEach(function (card) {
      card.classList.add("is-visible");
    });
  }

  function attachListeners() {
    if (searchInput) {
      searchInput.addEventListener("input", filterCards);
      searchInput.addEventListener("keyup", filterCards);
    }
    categoryRadios.forEach(function (r) {
      r.addEventListener("change", filterCards);
    });
    availabilityRadios.forEach(function (r) {
      r.addEventListener("change", filterCards);
    });
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        categoryRadios.forEach(function (r) {
          r.checked = r.value === "all";
        });
        availabilityRadios.forEach(function (r) {
          r.checked = r.value === "all";
        });
        if (searchInput) searchInput.value = "";
        filterCards();
      });
    }
  }

  init();
  attachListeners();
})();
