/**
 * DataTable Component
 * ===================
 * Reusable data table with built-in search, filter, sort, and pagination.
 *
 * Usage:
 *   const table = new DataTable({
 *     container: document.getElementById('table-container'),
 *     columns: [
 *       { key: 'name', label: 'Name', sortable: true },
 *       { key: 'email', label: 'Email', sortable: true },
 *       { key: 'status', label: 'Status', render: (val) => renderBadge(val) },
 *       { key: 'actions', label: 'Actions', sortable: false },
 *     ],
 *     data: [...],
 *     pageSize: 10,
 *     onSort: (key, direction) => { ... },
 *     onSearch: (term) => { ... },
 *   });
 */

/** @module components/table */

export class DataTable {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Element to render the table into.
     * @param {Array<{key: string, label: string, sortable?: boolean, render?: function}>} options.columns - Column definitions.
     * @param {Array<Object>} [options.data=[]] - Initial data array.
     * @param {number} [options.pageSize=10] - Rows per page.
     * @param {function} [options.onSort] - Called with (key, direction) when column header clicked.
     * @param {function} [options.onSearch] - Called with search term on input.
     * @param {string} [options.emptyMessage='No records found.'] - Message when no data.
     */
    constructor(options = {}) {
        this.container = options.container;
        this.columns = options.columns || [];
        this._data = options.data || [];
        this.pageSize = options.pageSize || 10;
        this.onSort = options.onSort || null;
        this.onSearch = options.onSearch || null;
        this.emptyMessage = options.emptyMessage || 'No records found.';

        this.currentPage = 1;
        this.sortKey = null;
        this.sortDir = 'asc';
        this.searchTerm = '';

        this._elements = {};
        this._filteredData = [...this._data];

        if (this.container) {
            this._build();
        }
    }

    /**
     * Build the table DOM structure.
     */
    _build() {
        this.container.innerHTML = '';

        // Search input
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'mb-4';

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search...';
        searchInput.className = 'theme-input w-full rounded-lg px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-400';
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.currentPage = 1;
            if (this.onSearch) {
                this.onSearch(this.searchTerm);
            } else {
                this._filter();
            }
        });
        searchWrapper.appendChild(searchInput);
        this.container.appendChild(searchWrapper);

        // Table wrapper for horizontal scroll
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'overflow-x-auto';

        const table = document.createElement('table');
        table.className = 'w-full';
        table.setAttribute('role', 'table');

        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.className = 'theme-table-header';

        this.columns.forEach((col) => {
            const th = document.createElement('th');
            th.className = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none';
            th.setAttribute('scope', 'col');

            const headerContent = document.createElement('div');
            headerContent.className = 'flex items-center gap-1';

            const label = document.createElement('span');
            label.textContent = col.label;
            headerContent.appendChild(label);

            if (col.sortable !== false) {
                const arrow = document.createElement('span');
                arrow.className = 'text-xs opacity-50';
                arrow.dataset.sortArrow = col.key;
                headerContent.appendChild(arrow);

                th.addEventListener('click', () => {
                    const dir = this.sortKey === col.key && this.sortDir === 'asc' ? 'desc' : 'asc';
                    this.sortKey = col.key;
                    this.sortDir = dir;
                    this._updateSortIndicators();
                    if (this.onSort) {
                        this.onSort(col.key, dir);
                    } else {
                        this._sort();
                    }
                });
            }

            th.appendChild(headerContent);
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        tbody.id = 'table-body';
        table.appendChild(tbody);

        tableWrapper.appendChild(table);
        this.container.appendChild(tableWrapper);

        // Pagination
        const paginationWrapper = document.createElement('div');
        paginationWrapper.className = 'flex items-center justify-between mt-4';

        const info = document.createElement('p');
        info.className = 'theme-muted text-sm';
        info.id = 'table-info';
        paginationWrapper.appendChild(info);

        const controls = document.createElement('div');
        controls.className = 'flex gap-2';

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'theme-btn-secondary px-3 py-1 rounded text-sm font-medium';
        prevBtn.textContent = 'Previous';
        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this._render();
            }
        });
        controls.appendChild(prevBtn);

        const pageNum = document.createElement('span');
        pageNum.className = 'theme-text px-3 py-1 text-sm';
        pageNum.id = 'table-page';
        controls.appendChild(pageNum);

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'theme-btn-secondary px-3 py-1 rounded text-sm font-medium';
        nextBtn.textContent = 'Next';
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(this._filteredData.length / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this._render();
            }
        });
        controls.appendChild(nextBtn);

        paginationWrapper.appendChild(controls);
        this.container.appendChild(paginationWrapper);

        this._elements = { tbody, searchInput, prevBtn, nextBtn, pageNum, info };

        // Initial render
        this._filteredData = [...this._data];
        this._render();
    }

    /**
     * Internal filter (client-side).
     */
    _filter() {
        if (!this.searchTerm) {
            this._filteredData = [...this._data];
        } else {
            const term = this.searchTerm.toLowerCase();
            this._filteredData = this._data.filter((row) => {
                return this.columns.some((col) => {
                    const val = row[col.key];
                    return val != null && String(val).toLowerCase().includes(term);
                });
            });
        }
        this._render();
    }

    /**
     * Internal sort (client-side).
     */
    _sort() {
        this._filteredData.sort((a, b) => {
            const valA = a[this.sortKey];
            const valB = b[this.sortKey];
            if (valA == null) return 1;
            if (valB == null) return -1;
            const cmp = typeof valA === 'string'
                ? valA.localeCompare(valB)
                : valA - valB;
            return this.sortDir === 'asc' ? cmp : -cmp;
        });
        this._render();
    }

    /**
     * Update sort arrow indicators.
     */
    _updateSortIndicators() {
        this.container.querySelectorAll('[data-sort-arrow]').forEach((el) => {
            const key = el.dataset.sortArrow;
            if (key === this.sortKey) {
                el.textContent = this.sortDir === 'asc' ? ' ▲' : ' ▼';
            } else {
                el.textContent = '';
            }
        });
    }

    /**
     * Render the current page of data.
     */
    _render() {
        const { tbody, prevBtn, nextBtn, pageNum, info } = this._elements;
        if (!tbody) return;

        const totalPages = Math.ceil(this._filteredData.length / this.pageSize) || 1;
        this.currentPage = Math.min(this.currentPage, totalPages);

        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this._filteredData.slice(start, end);

        tbody.innerHTML = '';

        if (pageData.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.setAttribute('colspan', String(this.columns.length));
            cell.className = 'text-center py-8 theme-muted';
            cell.textContent = this.emptyMessage;
            row.appendChild(cell);
            tbody.appendChild(row);
        } else {
            pageData.forEach((rowData) => {
                const row = document.createElement('tr');
                row.className = 'theme-row-hover';

                this.columns.forEach((col) => {
                    const cell = document.createElement('td');
                    cell.className = 'px-4 py-3 text-sm';

                    const val = rowData[col.key];
                    if (col.render && typeof col.render === 'function') {
                        // Use render function (may return HTML for badges)
                        const rendered = col.render(val, rowData);
                        if (typeof rendered === 'string') {
                            cell.innerHTML = rendered;
                        } else if (rendered instanceof HTMLElement) {
                            cell.appendChild(rendered);
                        } else {
                            cell.textContent = String(rendered ?? '');
                        }
                    } else {
                        cell.textContent = val != null ? String(val) : '';
                    }

                    row.appendChild(cell);
                });

                tbody.appendChild(row);
            });
        }

        // Update pagination
        const total = this._filteredData.length;
        if (info) {
            if (total === 0) {
                info.textContent = '0 records';
            } else {
                info.textContent = `Showing ${start + 1}–${Math.min(end, total)} of ${total}`;
            }
        }
        if (pageNum) {
            pageNum.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;

        this._updateSortIndicators();
    }

    /**
     * Update the table with new data.
     * @param {Array} data
     */
    setData(data) {
        this._data = data;
        this._filteredData = [...data];
        this.currentPage = 1;
        this._render();
    }

    /**
     * Get current filtered data.
     * @returns {Array}
     */
    getFilteredData() {
        return [...this._filteredData];
    }
}