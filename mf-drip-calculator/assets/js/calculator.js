/**
 * Initialize one calculator instance inside a container.
 * @param {string} containerId - DOM id of the calculator wrapper element
 * @param {string} imageUrl - Optional watermark image for the chart background
 */
function initializeDripCalculator(containerId, imageUrl) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }

    let showYear = true;
    let monthlyTableHtml = "";
    let yearlyTableHtml = "";
    let dripChart, dripData;

    // Scoped element references
    const initialInvestmentEl = container.querySelector('.mf-initial-investment');
    const annualRateEl = container.querySelector('.mf-annual-rate');
    const yearsEl = container.querySelector('.mf-years');
    const contributionAmountEl = container.querySelector('.mf-contribution-amount');
    const contributionFrequencyEl = container.querySelector('.mf-contribution-frequency');
    const calculateButton = container.querySelector('.mf-calculate-drip');
    const dripResultsEl = container.querySelector('.mf-drip-results');
    const canvas = container.querySelector('.mf-drip-chart');
    const toggleButton = container.querySelector('.mf-toggle-view');
    const dripTableContainerEl = container.querySelector('.mf-drip-table-container');
    const downloadCsvButton = container.querySelector('.mf-download-csv');
    const downloadChartButton = container.querySelector('.mf-download-chart');
    const chartWrapper = container.querySelector('.chart-wrapper');

    // Tooltip copy used for inline help in the results area
    const tooltipDescriptions = {
        "Annualized Return (No DRIP):": "The annual distribution yield you selected. This represents the regular dividend payments if not reinvested.",
        "Annualized Return (With DRIP):": "Average annual return when dividends are reinvested. Calculated as: (Sum of all DRIP returns / Years) / Average Principal. This shows the compound effect of reinvesting dividends.",
        "Total Value (No DRIP):": "Final value of your investment without reinvesting dividends. Includes your initial investment, additional contributions, and accumulated dividends.",
        "Total Value (With DRIP):": "Final value of your investment with dividend reinvestment. Shows how your wealth grows when dividends are automatically reinvested.",
        "Percentage Growth (No DRIP):": "Percentage increase from your total invested amount when not reinvesting dividends. Calculated as: (Total Returns / Total Invested) × 100",
        "Percentage Growth (With DRIP)": "Percentage increase from your total invested amount with dividend reinvestment. Calculated as: ((Final DRIP Value / Total Invested) - 1) × 100"
    };

    function formatWithCommas(n) {
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    const bgImage = new Image();
    if (imageUrl) {
        bgImage.src = imageUrl;
    }

    // Background image (watermark) plugin for Chart.js
    const bgPlugin = {
        id: 'bgImage',
        beforeDraw: chart => {
            const { ctx, chartArea } = chart;
            if (!bgImage.complete || !bgImage.src) return;
            const SCALE = 0.5;
            const imgRatio = bgImage.width / bgImage.height;
            const dw = chartArea.width * SCALE;
            const dh = dw / imgRatio;
            const dx = chartArea.left + (chartArea.width - dw) / 2;
            const dy = chartArea.top + (chartArea.height - dh) / 2;
            ctx.save();
            ctx.globalAlpha = 0.05;
            ctx.drawImage(bgImage, dx, dy, dw, dh);
            ctx.restore();
        }
    };

    // Footer watermark text plugin for Chart.js
    const watermarkPlugin = {
        id: 'watermark',
        afterDraw: chart => {
            const { ctx, chartArea } = chart;
            ctx.save();
            ctx.font = '8px Montserrat';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText('© Morrison Financial', chartArea.left - 86, chartArea.bottom - -76);
            ctx.restore();
        }
    };

    Chart.register(bgPlugin, watermarkPlugin);

    const fmtRounded = n => Math.round(n).toLocaleString();

    // Main calculation + render pipeline
    function calculateAndDisplay() {
        let initialInvestment = initialInvestmentEl.value.trim();
        initialInvestment = initialInvestment === '' ? 0 : parseFloat(initialInvestment.replace(/,/g, ''));
        initialInvestment = Math.min(initialInvestment, 1000000000);

        let annualRate = annualRateEl.value.trim();
        annualRate = annualRate === '' ? 0 : parseFloat(annualRate);
        annualRate = Math.min(annualRate, 100);

        let years = yearsEl.value.trim();
        years = years === '' ? 0 : parseInt(years, 10);
        years = Math.min(years, 200);

        let contributionAmount = contributionAmountEl.value.trim();
        contributionAmount = contributionAmount === '' ? 0 : parseFloat(contributionAmount.replace(/,/g, ''));
        contributionAmount = Math.min(contributionAmount, 1000000000);

        let freq = contributionFrequencyEl.value.trim();
        freq = freq === '' ? 0 : parseInt(freq, 10);

        initialInvestmentEl.value = initialInvestment === 0 ? '0' : formatWithCommas(initialInvestment);
        annualRateEl.value = annualRate;
        yearsEl.value = years;
        contributionAmountEl.value = contributionAmount === 0 ? '0' : formatWithCommas(contributionAmount);
        contributionFrequencyEl.value = freq;

        const P = initialInvestment;
        const r = annualRate / 100;
        const yrs = years;
        const C = contributionAmount;

        if ([P, r, yrs, C, freq].some(v => isNaN(v) || v < 0) || yrs === 0 || freq === 0) {
            if (dripResultsEl) {
                dripResultsEl.innerHTML = '<p style="color: red;">Please enter valid non-negative numbers and a time horizon/frequency of at least 1.</p>';
            }
            return;
        }

        function cell(v) {
            return v ? `$${fmtRounded(v)}` : '–';
        }

        const months = yrs * 12;
        const monthlyRate = r / 12;
        let principalDrip = P;
        let principalNonDrip = P;
        let accNonDripInterest = 0;
        let contribTotal = 0;
        let cumulativeDividendGain = 0;
        let cumulativeNonDripDividend = 0;

        const totalDripReturnArr = [];
        const totalNonDripReturnArr = [];
        const labels = [];
        const regReturnArr = [];
        const dripReturnArr = [];
        const contribThisMonthArr = [];
        const cashflows = [-P];

        for (let m = 1; m <= months; m++) {
            const iDrip = principalDrip * monthlyRate;
            principalDrip += iDrip;
            cumulativeDividendGain += iDrip;

            const iNon = principalNonDrip * monthlyRate;
            accNonDripInterest += iNon;
            cumulativeNonDripDividend += iNon;

            let added = 0;
            if (C > 0 && (m - 1) % freq === 0 && m !== 1) {
                principalDrip += C;
                principalNonDrip += C;
                contribTotal += C;
                added = C;
            }
            contribThisMonthArr.push(added);
            cashflows.push(-added);

            regReturnArr.push(iNon);
            dripReturnArr.push(iDrip);
            totalNonDripReturnArr.push(cumulativeNonDripDividend);
            totalDripReturnArr.push(cumulativeDividendGain);
            labels.push(m);
        }

        cashflows[cashflows.length - 1] += principalDrip;

        // Simple Newton–Raphson IRR solver on monthly cashflows
        function irr(cfs, guess = 0.01) {
            let rate = guess;
            for (let iter = 0; iter < 50; iter++) {
                let f = 0, fprime = 0;
                cfs.forEach((cf, k) => {
                    f += cf / Math.pow(1 + rate, k);
                    fprime += -k * cf / Math.pow(1 + rate, k + 1);
                });
                const newRate = rate - f / fprime;
                if (Math.abs(newRate - rate) < 1e-9) break;
                rate = newRate;
            }
            return rate;
        }
        const monthlyIRR = irr(cashflows);
        const annualizedDrip = Math.pow(1 + monthlyIRR, 12) - 1;

        dripData = { labels, regReturnArr, dripReturnArr, totalNonDripReturnArr, totalDripReturnArr, contribThisMonthArr, annualizedDrip, initialPrincipal: P };

        const finalIndex = dripData.totalNonDripReturnArr.length - 1;
        const finalNonDrip = dripData.totalNonDripReturnArr[finalIndex];
        const sumOfAllDrip = dripReturnArr.reduce((sum, drip) => sum + drip, 0);
        const annualizedDripReturn = (sumOfAllDrip / (months / 12)) / P;

        const totalInvested = P + contribTotal;
        dripResultsEl.innerHTML = `
            <table class="results-summary-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>No DRIP</th>
                        <th>With DRIP</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="row-label">Annualized Return</td>
                        <td class="result-value">${(r * 100).toFixed(2)}%</td>
                        <td class="result-value">${(annualizedDripReturn * 100).toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td class="row-label">Total Value</td>
                        <td class="result-value">$${fmtRounded(totalInvested + finalNonDrip)}</td>
                        <td class="result-value">$${fmtRounded(principalDrip)}</td>
                    </tr>
                    <tr>
                        <td class="row-label">Total Percentage Growth</td>
                        <td class="result-value">${((finalNonDrip / totalInvested) * 100).toFixed(2)}%</td>
                        <td class="result-value">${(((principalDrip / totalInvested) - 1) * 100).toFixed(2)}%</td>
                    </tr>
                </tbody>
            </table>
        `;

        const monthlyRows = labels.map((m, i) => {
            const invested = (i === 0) ? P : contribThisMonthArr[i];
            const totalInvestedToDate = P + contribThisMonthArr.slice(0, i + 1).reduce((sum, val) => sum + val, 0);
            const regularValue = totalInvestedToDate + totalNonDripReturnArr[i];
            const dripValue = totalInvestedToDate + totalDripReturnArr[i];
            return `<tr><td>${m}</td><td>${cell(invested)}</td><td>${cell(regReturnArr[i])}</td><td>${cell(dripReturnArr[i])}</td><td>${cell(regularValue)}</td><td>${cell(dripValue)}</td></tr>`;
        }).join('');
        monthlyTableHtml = `<table class="drip-detail-table monthly-table"><thead><tr><th>Month</th><th>Principal<br/>Invested</th><th>Return<br/>(No DRIP)</th><th>Return<br/>(With DRIP)</th><th>Total Value<br/>(No DRIP)</th><th>Total Value<br/>(With DRIP)</th></tr></thead><tbody>${monthlyRows}</tbody></table>`;

        const yearLabels = [];
        labels.forEach(m => { if (m % 12 === 0) yearLabels.push(m / 12); });
        const yearlyRows = yearLabels.map((y, index) => {
            const startIdx = (y - 1) * 12;
            const endIdx = y * 12 - 1;
            const thisYearContrib = contribThisMonthArr.slice(startIdx, endIdx + 1).reduce((sum, c) => sum + c, 0);
            const invested = (y === 1 ? P : 0) + thisYearContrib;
            const totalInvestedToDate = P + contribThisMonthArr.slice(0, endIdx + 1).reduce((sum, val) => sum + val, 0);
            const regularValue = totalInvestedToDate + totalNonDripReturnArr[endIdx];
            const dripValue = totalInvestedToDate + totalDripReturnArr[endIdx];
            let yearlyRegularReturn = (index > 0) ? totalNonDripReturnArr[endIdx] - totalNonDripReturnArr[yearLabels[index - 1] * 12 - 1] : totalNonDripReturnArr[endIdx];
            let yearlyDripReturn = (index > 0) ? totalDripReturnArr[endIdx] - totalDripReturnArr[yearLabels[index - 1] * 12 - 1] : totalDripReturnArr[endIdx];
            return `<tr><td>${y}</td><td>${cell(invested)}</td><td>${cell(yearlyRegularReturn)}</td><td>${cell(yearlyDripReturn)}</td><td>${cell(regularValue)}</td><td>${cell(dripValue)}</td></tr>`;
        }).join('');
        yearlyTableHtml = `<table class="drip-detail-table"><thead><tr><th>Year</th><th>Principal<br/>Invested</th><th>Return<br/>(No DRIP)</th><th>Return<br/>(With DRIP)</th><th>Total Value<br/>(No DRIP)</th><th>Total Value<br/>(With DRIP)</th></tr></thead><tbody>${yearlyRows}</tbody></table>`;

        dripTableContainerEl.innerHTML = showYear ? yearlyTableHtml : monthlyTableHtml;

        container.querySelectorAll('.mf-drip-results .result-row .tooltip-placeholder').forEach(placeholder => {
            const existingTooltip = placeholder.querySelector('.tooltip-container');
            if (existingTooltip) existingTooltip.remove();

            const tooltipContainer = document.createElement('span');
            tooltipContainer.className = 'tooltip-container';
            const iconEl = document.createElement('span');
            iconEl.className = 'tooltip-icon';
            iconEl.textContent = '?';
            const bubble = document.createElement('span');
            bubble.className = 'tooltip-bubble';
            
            const labelEl = placeholder.parentElement.querySelector('.light-text');
            const label = labelEl ? labelEl.textContent.trim().replace(/:$/, '') : '';
            const descriptionKey = Object.keys(tooltipDescriptions).find(key => key.includes(label));
            
            bubble.textContent = tooltipDescriptions[descriptionKey] || label;

            tooltipContainer.append(iconEl, bubble);
            placeholder.appendChild(tooltipContainer);
            tooltipContainer.addEventListener('mousemove', e => {
                const iconRect = tooltipContainer.getBoundingClientRect();
                const bubbleW = bubble.offsetWidth;
                const bubbleH = bubble.offsetHeight;
                const left = iconRect.left + iconRect.width / 2 - bubbleW / 2;
                const top = iconRect.top - bubbleH - 8;
                bubble.style.left = `${left}px`;
                bubble.style.top = `${top}px`;
                bubble.style.setProperty('--arrow-left', `${iconRect.left + iconRect.width / 2 - left}px`);
            });
        });

        const yearlyDripTotal = [];
        const yearlyNonDripTotal = [];
        const yearLabelsForChart = [];
        labels.forEach(m => { if (m % 12 === 0) yearLabelsForChart.push(m / 12); });
        yearLabelsForChart.forEach(y => {
            const idx = y * 12 - 1;
            const totalInvestedToDate = P + contribThisMonthArr.slice(0, idx + 1).reduce((sum, val) => sum + val, 0);
            yearlyDripTotal.push(totalInvestedToDate + totalDripReturnArr[idx]);
            yearlyNonDripTotal.push(totalInvestedToDate + totalNonDripReturnArr[idx]);
        });

        if (!canvas) return;
        
        // Initialize chart if it doesn't exist
        if (!dripChart) {
            // Pull dimensions/colors from CSS custom properties for theming
            const chartWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--chart-width')) || 480;
            const chartHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--chart-height')) || 380;
            
            canvas.width = chartWidth;
            canvas.height = chartHeight;
            Chart.defaults.font.family = 'Montserrat, sans-serif';
            Chart.defaults.color = getComputedStyle(document.body).color;
            Chart.defaults.devicePixelRatio = 2;
            const ctx = canvas.getContext('2d');
            // Colors (with fallbacks)
            const dripColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-drip-color').trim() || '#006644';
            const nonDripColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-non-drip-color').trim() || '#004C84';
            
            dripChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        { label: 'Total Value (With DRIP)', data: [], borderColor: dripColor, pointBackgroundColor: dripColor, pointBorderColor: '#ffffff', pointRadius: 4, tension: 0.3, fill: false },
                        { label: 'Total Value (no DRIP)', data: [], borderColor: nonDripColor, pointBackgroundColor: nonDripColor, pointBorderColor: '#ffffff', pointRadius: 4, tension: 0.3, fill: false }
                    ]
                },
                options: {
                    responsive: false, maintainAspectRatio: false,
                    layout: { padding: { left: 5, right: 10, top: 5, bottom: 5 } },
                    scales: {
                        x: { type: 'category', title: { display: true, text: 'Number of years invested' } },
                        y: { title: { display: true, text: 'Total Investment Value ($)' }, ticks: { callback: value => Math.round(value).toLocaleString() } }
                    },
                    plugins: {
                        tooltip: { callbacks: { label: function (context) { return `${context.dataset.label}: $${Math.round(context.parsed.y).toLocaleString()}`; } } },
                        title: { display: true, text: 'Total Investment Value Over Time (Regular VS DRIP)', padding: { top: 10 }, font: { size: 16, weight: '500' } },
                        legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 16 } }
                    }
                }
            });
        }
        
        // Update chart data instead of recreating
        dripChart.data.labels = yearLabelsForChart.map(y => `Year ${y}`);
        dripChart.data.datasets[0].data = yearlyDripTotal;
        dripChart.data.datasets[1].data = yearlyNonDripTotal;
        dripChart.update('active');
    }

    if (calculateButton) calculateButton.addEventListener('click', calculateAndDisplay);
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            showYear = !showYear;
            if (dripTableContainerEl) dripTableContainerEl.innerHTML = showYear ? yearlyTableHtml : monthlyTableHtml;
            toggleButton.textContent = showYear ? 'Show Details by Month' : 'Show Details by Year';
        });
    }

    // Build export payload (header + per-month rows)
    function generateExportData() {
        if (!dripData) return null;
        const { labels, regReturnArr, dripReturnArr, totalNonDripReturnArr, totalDripReturnArr, contribThisMonthArr, initialPrincipal } = dripData;
        
        let content = 'DRIP Investment Calculator Results\nInput Parameters:\n';
        content += `Initial Investment,$${parseFloat(initialInvestmentEl.value.replace(/,/g, '')).toFixed(2)}\n`;
        content += `Annualized Distribution Yield,${parseFloat(annualRateEl.value).toFixed(2)}%\n`;
        content += `Time Horizon,${parseInt(yearsEl.value)} years\n`;
        content += `Additional Contribution Amount,$${parseFloat(contributionAmountEl.value.replace(/,/g, '')).toFixed(2)}\n`;
        content += `Contribution Frequency,${parseInt(contributionFrequencyEl.value)} months\n\n`;
        
        return {
            header: content,
            rows: labels.map((m, i) => {
                const contribution = i === 0 ? initialPrincipal : contribThisMonthArr[i];
                const totalInvestedToDate = initialPrincipal + contribThisMonthArr.slice(0, i + 1).reduce((sum, val) => sum + val, 0);
                const regularValue = totalInvestedToDate + totalNonDripReturnArr[i];
                const dripValue = totalInvestedToDate + totalDripReturnArr[i];
                return { m, contribution, regReturn: regReturnArr[i], dripReturn: dripReturnArr[i], regularValue, dripValue };
            })
        };
    }

    if (downloadCsvButton) {
        downloadCsvButton.addEventListener('click', () => {
            const exportData = generateExportData();
            if (!exportData) return alert('Run calc first');
            
            let csv = exportData.header + 'Month,Contribution,Return (No DRIP),Return (With DRIP),Total Value (No DRIP),Total Value (With DRIP)\n';
            exportData.rows.forEach(row => {
                csv += [row.m, row.contribution.toFixed(2), row.regReturn.toFixed(2), row.dripReturn.toFixed(2), row.regularValue.toFixed(2), row.dripValue.toFixed(2)].join(',') + '\n';
            });
            
            const blob = new Blob([csv], { type: 'text/csv' }), url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'drip_returns.csv'; a.click();
            URL.revokeObjectURL(url);
        });
    }

    if (downloadChartButton) {
        downloadChartButton.addEventListener('click', () => {
            if (!dripChart) return alert('Run calc first');
            const SCALE = 2, DEFAULT_WIDTH = 480, DEFAULT_HEIGHT = 380;
            const srcCanvas = dripChart.canvas;
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = DEFAULT_WIDTH * SCALE; exportCanvas.height = DEFAULT_HEIGHT * SCALE;
            exportCanvas.style.width = `${DEFAULT_WIDTH}px`; exportCanvas.style.height = `${DEFAULT_HEIGHT}px`;
            const ctx = exportCanvas.getContext('2d');
            ctx.scale(SCALE, SCALE);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
            ctx.drawImage(srcCanvas, 0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
            exportCanvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'drip_chart@2x.png'; a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        });
    }



    if (chartWrapper) {
        const resizeObserver = new ResizeObserver(() => { if (dripChart) dripChart.resize(); });
        resizeObserver.observe(chartWrapper);
    }
    
    [initialInvestmentEl, contributionAmountEl].forEach(el => {
        if (el) {
            el.addEventListener('blur', () => {
                const raw = el.value.replace(/[^0-9.]/g, '');
                if (raw) el.value = formatWithCommas(raw);
            });
        }
    });

    if (calculateButton) {
        calculateAndDisplay();
    }
} 