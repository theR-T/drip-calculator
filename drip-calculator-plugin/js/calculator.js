// Simple DRIP Calculator - Focus on getting chart to work
(function() {
    console.log('DRIP Calculator loading...');
    
    let showYear = true;
    let monthlyTableHtml = "";
    let yearlyTableHtml = "";
    let dripChart, dripData;

    // Wait for everything to load
    function waitForDependencies() {
        return new Promise((resolve) => {
            const checkReady = () => {
                if (typeof Chart !== 'undefined' && document.getElementById('dripChart')) {
                    console.log('Chart.js and canvas ready!');
                    resolve();
                } else {
                    console.log('Waiting for Chart.js or canvas...');
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    // Helper functions
    function formatWithCommas(n) {
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    const fmtRounded = n => Math.round(n).toLocaleString();

    function cell(v) {
        return v ? `$${fmtRounded(v)}` : '–';
    }

    // Simple chart creation
    function createChart(yearLabels, yearlyDripTotal, yearlyNonDripTotal) {
        console.log('Creating chart with data:', {
            labels: yearLabels.length,
            drip: yearlyDripTotal.length,
            regular: yearlyNonDripTotal.length
        });

        const canvas = document.getElementById('dripChart');
        if (!canvas) {
            console.error('Canvas not found!');
            return;
        }

        // Destroy existing chart
        if (dripChart) {
            dripChart.destroy();
        }

        try {
            const ctx = canvas.getContext('2d');
            
            dripChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: yearLabels.map(y => `Year ${y}`),
                    datasets: [
                        {
                            label: 'With DRIP',
                            data: yearlyDripTotal,
                            borderColor: '#006644',
                            backgroundColor: 'rgba(0, 102, 68, 0.1)',
                            pointBackgroundColor: '#006644',
                            pointBorderColor: '#ffffff',
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Regular',
                            data: yearlyNonDripTotal,
                            borderColor: '#004C84',
                            backgroundColor: 'rgba(0, 76, 132, 0.1)',
                            pointBackgroundColor: '#004C84',
                            pointBorderColor: '#ffffff',
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Investment Value Over Time (Regular vs DRIP)',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = Math.round(context.parsed.y).toLocaleString();
                                    return `${context.dataset.label}: $${value}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Years'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Total Value ($)'
                            },
                            ticks: {
                                callback: value => '$' + Math.round(value).toLocaleString()
                            }
                        }
                    }
                }
            });

            console.log('Chart created successfully!');
            
        } catch (error) {
            console.error('Error creating chart:', error);
        }
    }

    // Main calculation function
    function calculateDrip() {
        console.log('Starting calculation...');

        // Get inputs
        const initialInvestment = parseFloat(document.getElementById('initialInvestment').value.replace(/,/g, '')) || 0;
        const annualRate = parseFloat(document.getElementById('annualRate').value) || 0;
        const years = parseInt(document.getElementById('years').value) || 0;
        const contributionAmount = parseFloat(document.getElementById('contributionAmount').value.replace(/,/g, '')) || 0;
        const freq = parseInt(document.getElementById('contributionFrequency').value) || 12;

        console.log('Inputs:', { initialInvestment, annualRate, years, contributionAmount, freq });

        if (initialInvestment <= 0 || annualRate <= 0 || years <= 0) {
            alert('Please enter valid positive values');
            return;
        }

        const P = initialInvestment;
        const r = annualRate / 100;
        const yrs = years;
        const C = contributionAmount;
        const months = yrs * 12;
        const monthlyRate = r / 12;

        let principalDrip = P;
        let principalNonDrip = P;
        let contribTotal = 0;
        let cumulativeDividendGain = 0;
        let cumulativeNonDripDividend = 0;

        const labels = [];
        const regReturnArr = [];
        const dripReturnArr = [];
        const contribThisMonthArr = [];
        const totalDripReturnArr = [];
        const totalNonDripReturnArr = [];

        // Calculate monthly values
        for (let m = 1; m <= months; m++) {
            const iDrip = principalDrip * monthlyRate;
            principalDrip += iDrip;
            cumulativeDividendGain += iDrip;

            const iNon = principalNonDrip * monthlyRate;
            cumulativeNonDripDividend += iNon;

            let added = 0;
            if (C > 0 && (m - 1) % freq === 0 && m !== 1) {
                principalDrip += C;
                principalNonDrip += C;
                contribTotal += C;
                added = C;
            }

            contribThisMonthArr.push(added);
            regReturnArr.push(iNon);
            dripReturnArr.push(iDrip);
            totalNonDripReturnArr.push(cumulativeNonDripDividend);
            totalDripReturnArr.push(cumulativeDividendGain);
            labels.push(m);
        }

        // Store data
        dripData = {
            labels,
            regReturnArr,
            dripReturnArr,
            totalNonDripReturnArr,
            totalDripReturnArr,
            contribThisMonthArr,
            initialPrincipal: P
        };

        // Calculate final values
        const totalInvested = P + contribTotal;
        const finalNonDrip = totalNonDripReturnArr[totalNonDripReturnArr.length - 1];
        const compoundAnnualDripReturn = Math.pow(principalDrip / totalInvested, 1 / yrs) - 1;

        // Update results
        const resultsEl = document.getElementById('dripResults');
        resultsEl.innerHTML = `
            <div class="result-row">
                <strong>Annualized Return (Regular):</strong>
                <span>${(r * 100).toFixed(2)}%</span>
            </div>
            <div class="result-row">
                <strong>Annualized Return (DRIP):</strong>
                <span>${(compoundAnnualDripReturn * 100).toFixed(2)}%</span>
            </div>
            <div class="result-row">
                <strong>Total Regular Value:</strong>
                <span>$${fmtRounded(totalInvested + finalNonDrip)}</span>
            </div>
            <div class="result-row">
                <strong>Total DRIP Value:</strong>
                <span>$${fmtRounded(principalDrip)}</span>
            </div>
        `;

        // Build yearly data for chart
        const yearLabels = [];
        for (let y = 1; y <= yrs; y++) {
            yearLabels.push(y);
        }

        const yearlyDripTotal = [];
        const yearlyNonDripTotal = [];
        
        yearLabels.forEach(y => {
            const idx = y * 12 - 1;
            const totalInvestedToDate = P + contribThisMonthArr.slice(0, idx + 1).reduce((sum, val) => sum + val, 0);
            const nonDripTotal = totalInvestedToDate + totalNonDripReturnArr[idx];
            const dripTotal = totalInvestedToDate + totalDripReturnArr[idx];
            
            yearlyDripTotal.push(dripTotal);
            yearlyNonDripTotal.push(nonDripTotal);
        });

        // Create chart
        createChart(yearLabels, yearlyDripTotal, yearlyNonDripTotal);

        // Build tables
        buildTables(P, labels, contribThisMonthArr, regReturnArr, dripReturnArr, totalNonDripReturnArr, totalDripReturnArr);

        console.log('Calculation complete!');
    }

    // Build tables
    function buildTables(P, labels, contribThisMonthArr, regReturnArr, dripReturnArr, totalNonDripReturnArr, totalDripReturnArr) {
        // Monthly table
        const monthlyRows = labels.map((m, i) => {
            const invested = (i === 0) ? P : contribThisMonthArr[i];
            const totalInvestedToDate = P + contribThisMonthArr.slice(0, i + 1).reduce((sum, val) => sum + val, 0);
            const regularValue = totalInvestedToDate + totalNonDripReturnArr[i];
            const dripValue = totalInvestedToDate + totalDripReturnArr[i];
            
            return `
                <tr>
                    <td>${m}</td>
                    <td>${cell(invested)}</td>
                    <td>${cell(regReturnArr[i])}</td>
                    <td>${cell(dripReturnArr[i])}</td>
                    <td>${cell(regularValue)}</td>
                    <td>${cell(dripValue)}</td>
                </tr>`;
        }).join('');

        monthlyTableHtml = `
            <table class="drip-detail-table">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Principal Invested</th>
                        <th>Regular Return</th>
                        <th>DRIP Return</th>
                        <th>Total Regular Value</th>
                        <th>Total DRIP Value</th>
                    </tr>
                </thead>
                <tbody>${monthlyRows}</tbody>
            </table>`;

        // Yearly table
        const yearLabels = [];
        labels.forEach(m => {
            if (m % 12 === 0) yearLabels.push(m / 12);
        });

        const yearlyRows = yearLabels.map((y, index) => {
            const endIdx = y * 12 - 1;
            const startIdx = (y - 1) * 12;
            const thisYearContrib = contribThisMonthArr.slice(startIdx, endIdx + 1).reduce((sum, c) => sum + c, 0);
            const invested = (y === 1 ? P : 0) + thisYearContrib;
            const totalInvestedToDate = P + contribThisMonthArr.slice(0, endIdx + 1).reduce((sum, val) => sum + val, 0);
            const regularValue = totalInvestedToDate + totalNonDripReturnArr[endIdx];
            const dripValue = totalInvestedToDate + totalDripReturnArr[endIdx];
            
            let yearlyRegularReturn = 0;
            let yearlyDripReturn = 0;
            
            if (index > 0) {
                const prevYearIdx = yearLabels[index - 1] * 12 - 1;
                yearlyRegularReturn = totalNonDripReturnArr[endIdx] - totalNonDripReturnArr[prevYearIdx];
                yearlyDripReturn = totalDripReturnArr[endIdx] - totalDripReturnArr[prevYearIdx];
            } else {
                yearlyRegularReturn = totalNonDripReturnArr[endIdx];
                yearlyDripReturn = totalDripReturnArr[endIdx];
            }

            return `
                <tr>
                    <td>${y}</td>
                    <td>${cell(invested)}</td>
                    <td>${cell(yearlyRegularReturn)}</td>
                    <td>${cell(yearlyDripReturn)}</td>
                    <td>${cell(regularValue)}</td>
                    <td>${cell(dripValue)}</td>
                </tr>`;
        }).join('');

        yearlyTableHtml = `
            <table class="drip-detail-table">
                <thead>
                    <tr>
                        <th>Year</th>
                        <th>Principal Invested</th>
                        <th>Regular Return</th>
                        <th>DRIP Return</th>
                        <th>Total Regular Value</th>
                        <th>Total DRIP Value</th>
                    </tr>
                </thead>
                <tbody>${yearlyRows}</tbody>
            </table>`;

        // Display table
        const tableContainer = document.getElementById('dripTableContainer');
        if (tableContainer) {
            tableContainer.innerHTML = showYear ? yearlyTableHtml : monthlyTableHtml;
        }
    }

    // Export functions
    function downloadCsv() {
        if (!dripData) return alert('Run calculation first');
        
        const { labels, regReturnArr, dripReturnArr, totalNonDripReturnArr, totalDripReturnArr, contribThisMonthArr, initialPrincipal } = dripData;
        
        let csv = 'Month,Contribution,Regular Return,DRIP Return,Total Regular Value,Total DRIP Value\n';
        
        labels.forEach((m, i) => {
            const contribution = i === 0 ? initialPrincipal : contribThisMonthArr[i];
            const totalInvestedToDate = initialPrincipal + contribThisMonthArr.slice(0, i + 1).reduce((sum, val) => sum + val, 0);
            const regularValue = totalInvestedToDate + totalNonDripReturnArr[i];
            const dripValue = totalInvestedToDate + totalDripReturnArr[i];
            
            csv += [m, contribution.toFixed(2), regReturnArr[i].toFixed(2), dripReturnArr[i].toFixed(2), regularValue.toFixed(2), dripValue.toFixed(2)].join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drip_returns.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function downloadChart() {
        if (!dripChart) return alert('Run calculation first');
        
        const canvas = dripChart.canvas;
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'drip_chart.png';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    function emailData() {
        if (!dripData) return alert('Run calculation first');
        
        const { labels, regReturnArr, dripReturnArr, totalNonDripReturnArr, totalDripReturnArr, contribThisMonthArr, initialPrincipal } = dripData;
        
        let body = 'DRIP Calculator Results\n\n';
        body += 'Month,Contribution,Regular Return,DRIP Return,Total Regular Value,Total DRIP Value\n';
        
        labels.forEach((m, i) => {
            const totalInvestedToDate = initialPrincipal + contribThisMonthArr.slice(0, i + 1).reduce((sum, val) => sum + val, 0);
            const regularValue = totalInvestedToDate + totalNonDripReturnArr[i];
            const dripValue = totalInvestedToDate + totalDripReturnArr[i];
            
            body += [m, contribThisMonthArr[i].toFixed(2), regReturnArr[i].toFixed(2), dripReturnArr[i].toFixed(2), regularValue.toFixed(2), dripValue.toFixed(2)].join(',') + '\n';
        });
        
        window.location.href = `mailto:?subject=${encodeURIComponent('DRIP Returns Data')}&body=${encodeURIComponent(body)}`;
    }

    // Initialize
    async function init() {
        console.log('Initializing...');
        
        // Wait for dependencies
        await waitForDependencies();
        
        // Add event listeners
        const calculateBtn = document.getElementById('calculateDrip');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', calculateDrip);
            console.log('Calculate button ready');
        }
        
        const toggleBtn = document.getElementById('toggleView');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                showYear = !showYear;
                const tableContainer = document.getElementById('dripTableContainer');
                if (tableContainer) {
                    tableContainer.innerHTML = showYear ? yearlyTableHtml : monthlyTableHtml;
                    toggleBtn.textContent = showYear ? 'Show Details by Month' : 'Show Details by Year';
                }
            });
        }

        const csvBtn = document.getElementById('downloadCsv');
        if (csvBtn) csvBtn.addEventListener('click', downloadCsv);

        const chartBtn = document.getElementById('downloadChart');
        if (chartBtn) chartBtn.addEventListener('click', downloadChart);

        const emailBtn = document.getElementById('emailData');
        if (emailBtn) emailBtn.addEventListener('click', emailData);

        // Add input formatting
        ['initialInvestment', 'contributionAmount'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('blur', () => {
                    const raw = el.value.replace(/[^0-9.]/g, '');
                    if (raw) el.value = formatWithCommas(raw);
                });
            }
        });

        console.log('All event listeners attached');
        
        // Run initial calculation
        calculateDrip();
    }

    // Start when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(); 