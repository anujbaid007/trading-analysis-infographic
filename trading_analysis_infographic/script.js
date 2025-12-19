// Global Charts Config
Chart.defaults.color = '#9aa0a6';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.font.family = "'Space Grotesk', sans-serif";

let scriptBarChartInstance = null;
let compositionChartInstance = null;
let topMoversChartInstance = null;

// ========================================
// MASTER DATA (From User's Spreadsheet)
// ========================================
const SUMMARY_DATA = {
    Overall: {
        booked: 2684000,    // 26.84 L
        running: -2935000,  // -29.35 L
        fno: 944000,        // 9.44 L
        dividend: 502000,   // 5.02 L
        commodity: 250000,  // 2.5 L
        misc: 250000,       // 2.5 L
        final: 1695000      // 16.95 L
    },
    AKB: {
        booked: 980000,     // 5.89 + 3.91 = 9.8 L
        running: -1824000,  // -18.24 L
        fno: 653000,        // 1.38 + 5.15 = 6.53 L
        dividend: 274000,   // 1.06 + 1.68 = 2.74 L
        commodity: 250000,  // 2.5 L
        misc: 30000,        // 0.3 L
        final: 363000       // 3.63 L
    },
    Aruna: {
        booked: 504000,     // 0.51 + 4.53 = 5.04 L
        running: -269000,   // -2.69 L
        fno: 98000,         // 0 + 0.98 = 0.98 L
        dividend: 71000,    // 0.16 + 0.55 = 0.71 L
        commodity: 0,
        misc: 20000,        // 0.2 L
        final: 424000       // 4.24 L
    },
    Anurita: {
        booked: 1200000,    // 10.28 + 1.72 = 12.0 L
        running: -842000,   // -8.42 L
        fno: 193000,        // 0.14 + 1.79 = 1.93 L
        dividend: 157000,   // 0.79 + 0.78 = 1.57 L
        commodity: 0,
        misc: 200000,       // 2 L
        final: 908000       // 9.08 L
    }
};

let currentEntity = 'Overall';
let currentChartFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    // Initial Render
    renderDashboard('Overall');

    // Tab Switching
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentEntity = tab.dataset.tab;
            renderDashboard(currentEntity);
        });
    });

    // Chart Filters
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartFilter = btn.dataset.filter;
            renderDashboard(currentEntity);
        });
    });

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const toggleIcon = themeToggle.querySelector('.icon');
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        toggleIcon.textContent = '🌙';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        toggleIcon.textContent = isLight ? '🌙' : '☀️';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        // Re-render charts with updated grid colors
        renderDashboard(currentEntity);
    });

});

function renderDashboard(entity) {
    const scriptData = TRADING_DATA[entity] || [];
    const summary = SUMMARY_DATA[entity] || SUMMARY_DATA.Overall;

    // Update ALL 6 KPI Cards + Final
    updateKPI('kpiFinal', summary.final);
    updateKPI('kpiBooked', summary.booked);
    updateKPI('kpiRunning', summary.running);
    updateKPI('kpiFnO', summary.fno);
    updateKPI('kpiDividend', summary.dividend);
    updateKPI('kpiCommodity', summary.commodity);
    updateKPI('kpiMisc', summary.misc);

    renderScriptBarChart(scriptData);
    renderCompositionChart(summary);
    renderTopMoversChart(scriptData);
    renderTable(scriptData);
}

function updateKPI(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const inLakhs = (value / 100000).toFixed(2);
    el.innerText = `${inLakhs}`;

    // Safely update classes
    el.classList.remove('positive', 'negative');
    el.classList.add(value >= 0 ? 'positive' : 'negative');
}

function renderScriptBarChart(data) {
    const ctx = document.getElementById('scriptBarChart').getContext('2d');
    if (scriptBarChartInstance) scriptBarChartInstance.destroy();

    // 1. FILTER: specific request to show only > 0.20L impact (20k)
    let filteredData = data.filter(d => Math.abs(d.Total) >= 20000);

    // 2. FILTER: Apply Profit/Loss filter
    if (currentChartFilter === 'PROFIT') {
        filteredData = filteredData.filter(d => d.Total > 0);
    } else if (currentChartFilter === 'LOSS') {
        filteredData = filteredData.filter(d => d.Total < 0);
    }

    // 3. SORT: by magnitude
    const sorted = [...filteredData].sort((a, b) => Math.abs(b.Total) - Math.abs(a.Total));

    // Dynamic width: 40px per bar, minimum 1200px
    const canvasWidth = Math.max(sorted.length * 40, 1200);

    // Set width on the inner wrapper div
    const scrollBox = document.querySelector('.chart-scroll-box');
    if (scrollBox) {
        scrollBox.style.width = canvasWidth + 'px';
    }

    const labels = sorted.map(d => d.Symbol);
    const realizedData = sorted.map(d => d.Realized);
    const unrealizedData = sorted.map(d => d.Unrealized);

    // DARK GREEN for positive Unrealized, RED for negative
    const unrealizedColors = unrealizedData.map(v => v >= 0 ? '#228B22' : '#ff3366');

    scriptBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Realized',
                    data: realizedData,
                    backgroundColor: '#00e5ff',
                    stack: 'Stack 0',
                    borderRadius: 4
                },
                {
                    label: 'Unrealized',
                    data: unrealizedData,
                    backgroundColor: unrealizedColors,
                    stack: 'Stack 0',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // CRITICAL: Allow chart to grow horizontally without growing vertically
            interaction: { mode: 'index', intersect: false },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            let label = ctx.dataset.label || '';
                            if (label) label += ': ';
                            if (ctx.parsed.y !== null) label += (ctx.parsed.y / 100000).toFixed(2) + 'L';
                            return label;
                        },
                        footer: (tooltipItems) => {
                            let sum = 0;
                            tooltipItems.forEach(ti => sum += ti.parsed.y);
                            return 'Total: ' + (sum / 100000).toFixed(2) + 'L';
                        }
                    },
                    backgroundColor: 'rgba(22, 24, 29, 0.95)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 10,
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                },
                legend: { display: true, position: 'top', labels: { boxWidth: 12, color: '#9aa0a6' } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#9aa0a6', maxRotation: 45, minRotation: 45 } },
                y: { title: { display: true, text: 'P&L (INR)', color: '#9aa0a6' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
            }
        }
    });
}

function renderCompositionChart(summary) {
    const ctx = document.getElementById('compositionChart').getContext('2d');
    if (compositionChartInstance) compositionChartInstance.destroy();

    const labels = ['Eq Booked', 'Eq Running', 'F&O', 'Dividends', 'Commodity', 'Misc'];
    const dataVals = [summary.booked, summary.running, summary.fno, summary.dividend, summary.commodity, summary.misc];
    const colors = ['#00e5ff', '#ff3366', '#f4d03f', '#228B22', '#9b59b6', '#e67e22'];

    compositionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataVals.map(v => Math.abs(v)),
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const idx = ctx.dataIndex;
                            const val = dataVals[idx];
                            return `${ctx.label}: ${(val / 100000).toFixed(2)}L`;
                        }
                    }
                }
            }
        }
    });
}

function renderTopMoversChart(data) {
    const ctx = document.getElementById('topMoversChart').getContext('2d');
    if (topMoversChartInstance) topMoversChartInstance.destroy();

    const sorted = [...data].sort((a, b) => b.Total - a.Total);
    const top10 = sorted.slice(0, 10);
    const bottom10 = sorted.slice(-10).reverse();

    const combined = [...top10, ...bottom10];
    const labels = combined.map(d => d.Symbol);
    const values = combined.map(d => d.Total);

    // Theme-aware grid colors
    const isLightMode = document.body.classList.contains('light-mode');
    const gridColorX = isLightMode ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
    const gridColorY = isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';

    topMoversChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total P&L',
                data: values,
                backgroundColor: values.map(v => v >= 0 ? '#228B22' : '#ff3366'),
                borderColor: values.map(v => v >= 0 ? 'rgba(34, 139, 34, 0.3)' : 'rgba(255, 51, 102, 0.3)'),
                borderWidth: 2,
                borderRadius: 4,
                categoryPercentage: 0.7, // Controls spacing between categories
                barPercentage: 0.8 // Controls thickness of bars within category
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            return `Total: ${(ctx.parsed.x / 100000).toFixed(2)}L`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: gridColorX,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#9aa0a6',
                        stepSize: 100000,
                        callback: function (value) {
                            // Format as Lakhs (e.g., -3L, -2L, -1L, 0, 1L, 2L, 3L)
                            const inLakhs = value / 100000;
                            if (inLakhs === 0) return '0';
                            return inLakhs + 'L';
                        }
                    }
                },
                y: {
                    grid: {
                        display: true,
                        color: gridColorY
                    },
                    ticks: {
                        color: '#9aa0a6',
                        autoSkip: false // Show all labels, not alternating
                    }
                }
            },
            layout: {
                padding: {
                    left: 10,
                    right: 10
                }
            }
        }
    });

    // Chart summary removed to give more space to the chart
}

let currentSortColumn = 'Total';
let currentSortDir = 'desc'; // 'asc' or 'desc'
let currentTableData = [];

function renderTable(data) {
    currentTableData = data;
    sortAndRenderTable();

    // Attach sort handlers (only once)
    if (!window.sortHandlersAttached) {
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                if (currentSortColumn === column) {
                    currentSortDir = currentSortDir === 'desc' ? 'asc' : 'desc';
                } else {
                    currentSortColumn = column;
                    currentSortDir = column === 'Symbol' ? 'asc' : 'desc';
                }
                updateSortIndicators();
                sortAndRenderTable();
            });
        });
        window.sortHandlersAttached = true;
    }
    updateSortIndicators();
}

function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach(th => {
        const column = th.dataset.sort;
        th.classList.remove('active');
        const baseText = column === 'Symbol' ? 'Script' : column;
        if (column === currentSortColumn) {
            th.classList.add('active');
            th.textContent = `${baseText} ${currentSortDir === 'asc' ? '↑' : '↓'}`;
        } else {
            th.textContent = `${baseText} ↕`;
        }
    });
}

function sortAndRenderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const sorted = [...currentTableData].sort((a, b) => {
        if (currentSortColumn === 'Symbol') {
            return currentSortDir === 'asc'
                ? a.Symbol.localeCompare(b.Symbol)
                : b.Symbol.localeCompare(a.Symbol);
        } else {
            const valA = a[currentSortColumn];
            const valB = b[currentSortColumn];
            return currentSortDir === 'asc' ? valA - valB : valB - valA;
        }
    });

    sorted.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.Symbol}</td>
            <td class="text-right ${row.Realized >= 0 ? 'positive-val' : 'negative-val'}">${(row.Realized).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
            <td class="text-right ${row.Unrealized >= 0 ? 'positive-val' : 'negative-val'}">${(row.Unrealized).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
            <td class="text-right ${row.Total >= 0 ? 'positive-val' : 'negative-val'}"><strong>${(row.Total).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

// ========================================
// MODAL: CLICKABLE KPI BREAKDOWN
// ========================================
const KPI_LABELS = {
    booked: 'Equity Booked',
    running: 'Equity Running',
    fno: 'F&O',
    dividend: 'Dividends',
    commodity: 'Commodity',
    misc: 'Misc (Infy/Demrg)',
    final: 'Final Net Profit'
};

document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers to all clickable KPI cards (including Hero)
    document.querySelectorAll('.kpi-card.clickable, .hero-card.clickable').forEach(card => {
        card.addEventListener('click', () => {
            const kpiKey = card.dataset.kpi;
            showBreakdownModal(kpiKey);
        });
    });

    // Close modal on background click
    document.getElementById('breakdownModal').addEventListener('click', (e) => {
        if (e.target.id === 'breakdownModal') {
            closeModal();
        }
    });
});

function showBreakdownModal(kpiKey) {
    const modal = document.getElementById('breakdownModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.innerText = `${KPI_LABELS[kpiKey]} - Account Breakdown`;

    const entities = ['AKB', 'Aruna', 'Anurita'];
    let html = '';

    entities.forEach(entity => {
        const val = SUMMARY_DATA[entity][kpiKey];
        const inLakhs = (val / 100000).toFixed(2);
        const colorClass = val >= 0 ? 'positive' : 'negative';
        html += `
            <div class="breakdown-row">
                <span class="entity">${entity}</span>
                <span class="amount ${colorClass}">${inLakhs} L</span>
            </div>
        `;
    });

    // Add total
    const total = SUMMARY_DATA.Overall[kpiKey];
    const totalLakhs = (total / 100000).toFixed(2);
    const totalClass = total >= 0 ? 'positive' : 'negative';
    html += `
        <div class="breakdown-row" style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 0.5rem; padding-top: 1rem;">
            <span class="entity"><strong>TOTAL</strong></span>
            <span class="amount ${totalClass}"><strong>${totalLakhs} L</strong></span>
        </div>
    `;

    body.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('breakdownModal').classList.add('hidden');
}
