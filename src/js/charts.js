/**
 * ScrapeVerse Pulse — Visual Analytics & Charts Module
 * Modern, high-performance, dark-mode SVG charts with glowing gradients.
 */

/**
 * Render a Donut / Radial Chart for Source Distribution
 * @param {HTMLElement} container
 * @param {Array<{ label: string, value: number, color: string, icon: string }>} data
 */
export function renderDonutChart(container, data) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    container.innerHTML = '<div class="chart-empty">No data available yet</div>';
    return;
  }

  const size = 220;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const slices = data.map((d) => {
    const percent = d.value / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    return `
      <circle
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="transparent"
        stroke="${d.color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDasharray}"
        stroke-dashoffset="${strokeDashoffset}"
        class="donut-slice"
        style="filter: drop-shadow(0 0 6px ${d.color}40);"
        data-label="${d.label}"
        data-value="${d.value}"
        data-percent="${Math.round(percent * 100)}%"
      />
    `;
  });

  const legend = data.map(d => `
    <div class="legend-item">
      <span class="legend-dot" style="background: ${d.color}; box-shadow: 0 0 8px ${d.color};"></span>
      <span class="legend-icon">${d.icon}</span>
      <span class="legend-label">${d.label}</span>
      <span class="legend-val mono">${d.value}</span>
      <span class="legend-pct text-muted">(${total > 0 ? Math.round((d.value / total) * 100) : 0}%)</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="chart-donut-wrapper">
      <div class="svg-donut-container">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="donut-svg">
          <circle
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            stroke-width="${strokeWidth}"
          />
          ${slices.join('')}
        </svg>
        <div class="donut-center-text">
          <span class="donut-total mono">${total}</span>
          <span class="donut-sub">Total Items</span>
        </div>
      </div>
      <div class="donut-legend">
        ${legend}
      </div>
    </div>
  `;
}

/**
 * Render a Glowing Bar Chart for Record Volume & Activity
 * @param {HTMLElement} container
 * @param {Array<{ label: string, count: number, color: string, icon: string, status: string }>} data
 */
export function renderBarChart(container, data) {
  const maxVal = Math.max(...data.map(d => d.count), 10);

  const bars = data.map(d => {
    const heightPct = Math.max((d.count / maxVal) * 100, 6); // Min 6% for visual presence
    return `
      <div class="bar-col">
        <div class="bar-value mono">${d.count}</div>
        <div class="bar-track">
          <div 
            class="bar-fill" 
            style="height: ${heightPct}%; background: linear-gradient(180deg, ${d.color}, ${d.color}66); box-shadow: 0 0 12px ${d.color}40;"
          ></div>
        </div>
        <div class="bar-label">
          <span class="bar-icon">${d.icon}</span>
          <span class="bar-name">${d.label}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="bar-chart-container">
      ${bars}
    </div>
  `;
}
