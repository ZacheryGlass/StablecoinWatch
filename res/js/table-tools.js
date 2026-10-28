/**
 * Filtering, search and paging for the stablecoin and blockchain tables.
 *
 * Markup contract:
 *   [data-table]                 wrapper; optional data-page-size (default 25)
 *   tbody tr[data-search]        lower-case text to search; optional data-filter-value and data-href
 *   [data-filter]                buttons that set the active filter (value "all" shows every row)
 *   [data-search-input]          text input
 *   [data-empty]                 shown when nothing matches
 *   [data-count]                 receives "1–25 of 178"
 *   [data-pager] [data-prev] [data-next] [data-page]
 *
 * Without JavaScript every row stays visible.
 */
(function () {
    var table = document.querySelector('[data-table]');
    if (!table) return;

    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr[data-search]'));
    var pageSize = parseInt(table.getAttribute('data-page-size'), 10) || 25;
    var filters = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
    var input = document.querySelector('[data-search-input]');
    var empty = document.querySelector('[data-empty]');
    var count = document.querySelector('[data-count]');
    var pager = document.querySelector('[data-pager]');
    var prev = pager && pager.querySelector('[data-prev]');
    var next = pager && pager.querySelector('[data-next]');
    var pageLabel = pager && pager.querySelector('[data-page]');
    var state = { filter: 'all', query: '', page: 1 };

    function matches(row) {
        if (state.filter !== 'all' && row.getAttribute('data-filter-value') !== state.filter) return false;
        if (state.query && row.getAttribute('data-search').indexOf(state.query) === -1) return false;
        return true;
    }

    function render() {
        var visible = rows.filter(matches);
        var pages = Math.max(1, Math.ceil(visible.length / pageSize));
        if (state.page > pages) state.page = pages;
        var start = (state.page - 1) * pageSize;
        var end = Math.min(start + pageSize, visible.length);

        rows.forEach(function (row) { row.hidden = true; });
        visible.slice(start, end).forEach(function (row) { row.hidden = false; });

        if (empty) empty.hidden = visible.length !== 0;
        if (count) count.textContent = visible.length ? (start + 1) + '–' + end + ' of ' + visible.length : '0 results';
        if (pager) {
            pager.hidden = pages <= 1;
            prev.disabled = state.page <= 1;
            next.disabled = state.page >= pages;
            pageLabel.textContent = 'Page ' + state.page + ' of ' + pages;
        }
    }

    filters.forEach(function (button) {
        button.addEventListener('click', function () {
            state.filter = button.getAttribute('data-filter');
            state.page = 1;
            filters.forEach(function (b) { b.setAttribute('aria-pressed', b === button ? 'true' : 'false'); });
            render();
        });
    });

    if (input) {
        input.addEventListener('input', function () {
            state.query = input.value.trim().toLowerCase();
            state.page = 1;
            render();
        });
    }

    if (pager) {
        prev.addEventListener('click', function () { state.page -= 1; render(); });
        next.addEventListener('click', function () { state.page += 1; render(); });
    }

    // Whole-row click for mouse users; the name link stays the keyboard target
    table.addEventListener('click', function (event) {
        if (event.target.closest('a, button')) return;
        var row = event.target.closest('tr[data-href]');
        if (row) window.location.href = row.getAttribute('data-href');
    });

    render();
})();
