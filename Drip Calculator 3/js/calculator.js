// Wrap everything in an IIFE to avoid global scope pollution
(function($) {
    let showYear = true;           // toggle state
    let monthlyTableHtml = "";     // populated after calculation
    let yearlyTableHtml  = "";     // populated after calculation
    let dripChart, dripData;

    // Helper function to format numbers with commas
    function formatWithCommas(n) {
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Helper function for rounded number formatting
    const fmtRounded = n => Math.round(n).toLocaleString();

    // Helper function for cell formatting
    function cell(v) {
        return v ? `$${fmtRounded(v)}` : '–';
    }

    // Chart plugins
    const bgPlugin = {
        id: 'bgImage',
        beforeDraw: chart => {
            const { ctx, chartArea } = chart;
            const bgImage = new Image();
            bgImage.src = dripCalculator.pluginUrl + '/assets/MorrisonM.png';
            
            if (!bgImage.complete) return;
            
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

    const watermarkPlugin = {
        id: 'watermark',
        afterDraw: chart => {
            const { ctx, chartArea } = chart;
            ctx.save();
            ctx.font = '8px Montserrat';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(
                '© Morrison Financial',
                chartArea.left - 83,
                chartArea.bottom - -76
            );
            ctx.restore();
        }
    };

    // Register chart plugins
    Chart.register(bgPlugin, watermarkPlugin);

    // Main calculation function
    function calculateDrip() {
        console.log('calculateDrip function called');
        
        // Get input values with validation
        let initialInvestment = document.getElementById('initialInvestment').value.trim();
        initialInvestment = initialInvestment === '' ? 0 : parseFloat(initialInvestment.replace(/,/g, ''));
        initialInvestment = Math.min(initialInvestment, 1000000000);
        
        let annualRate = document.getElementById('annualRate').value.trim();
        annualRate = annualRate === '' ? 0 : parseFloat(annualRate);
        annualRate = Math.min(annualRate, 100);
        
        let years = document.getElementById('years').value.trim();
        years = years === '' ? 0 : parseInt(years, 10);
        years = Math.min(years, 200);
        
        let contributionAmount = document.getElementById('contributionAmount').value.trim();
        contributionAmount = contributionAmount === '' ? 0 : parseFloat(contributionAmount.replace(/,/g, ''));
        contributionAmount = Math.min(contributionAmount, 1000000000);
        
        let freq = document.getElementById('contributionFrequency').value.trim();
        freq = freq === '' ? 0 : parseInt(freq, 10);
        
        // Update input fields with validated values
        document.getElementById('initialInvestment').value = initialInvestment === 0 ? '0' : formatWithCommas(initialInvestment);
        document.getElementById('annualRate').value = annualRate;
        document.getElementById('years').value = years;
        document.getElementById('contributionAmount').value = contributionAmount === 0 ? '0' : formatWithCommas(contributionAmount);
        document.getElementById('contributionFrequency').value = freq;
        
        // Convert to calculation variables
        const P = initialInvestment;
        const r = annualRate / 100;
        const yrs = years;
        const C = contributionAmount;
        
        if ([P, r, yrs, C, freq].some(v => isNaN(v) || v < 0) || yrs === 0 || freq === 0) {
            return alert('Enter valid non-negative numbers and years/frequency ≥1');
        }

        const months = yrs * 12;
        const monthlyRate = r / 12;
        let principalDrip = P;
        let principalNonDrip = P;
        let accNonDripInterest = 0;
        let contribTotal = 0;

        let cumulativeDividendGain = 0;
        let cumulativeNonDripDividend = 0;

        const labels = [];
        const regReturnArr = [];
        const dripReturnArr = [];
        const contribThisMonthArr = [];
        const cashflows = [];
        const totalDripReturnArr = [];
        const totalNonDripReturnArr = [];

        cashflows.push(-P);

        // Calculate monthly values
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

        // Finalize cashflows
        cashflows[cashflows.length - 1] += principalDrip;

        // Store data for export functions
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
        const finalIndex = totalNonDripReturnArr.length - 1;
        const finalNonDrip = totalNonDripReturnArr[finalIndex];
        const totalInvested = P + contribTotal;
        
        // Calculate annualized return
        const sumOfAllDrip = dripReturnArr.reduce((sum, drip) => sum + drip, 0);
        const annualizedDripReturn = (sumOfAllDrip/(months/12))/P;

        // Update results display
        updateResults(r, annualizedDripReturn, totalInvested, finalNonDrip, principalDrip);
        
        // Update tables
        updateTables(P, labels, contribThisMonthArr, regReturnArr, dripReturnArr, totalNonDripReturnArr, totalDripReturnArr);
        
        // Update chart
        updateChart(labels, totalNonDripReturnArr, totalDripReturnArr, contribThisMonthArr, P);
    }

    // Helper function to update results display
    function updateResults(r, annualizedDripReturn, totalInvested, finalNonDrip, principalDrip) {
        document.getElementById('dripResults').innerHTML = `
            <div class="result-row">
                <strong>Annualized Return (No DRIP):</strong>
                <span>${(r * 100).toFixed(2)}%</span>
            </div>
            <div class="result-row">
                <strong>Annualized Return (With DRIP):</strong>
                <span>${(annualizedDripReturn * 100).toFixed(2)}%</span>
            </div>
            <div class="result-row">
                <strong>Total Value (No DRIP):</strong>
                <span>$${fmtRounded(totalInvested + finalNonDrip)}</span>
            </div>
            <div class="result-row">
                <strong>Total Value (With DRIP):</strong>
                <span>$${fmtRounded(principalDrip)}</span>
            </div>
            <div class="result-row">
                <strong>Percentage Growth (No DRIP):</strong>
                <span>${((finalNonDrip/totalInvested) * 100).toFixed(2)}%</span>
            </div>
            <div class="result-row">
                <strong>Percentage Growth (With DRIP)</strong>
                <span>${(((principalDrip/totalInvested) - 1) * 100).toFixed(2)}%</span>
            </div>
        `;

        // Add tooltips
        addTooltips();
    }

    // Helper function to update tables
    function updateTables(P, labels, contribThisMonthArr, regReturnArr, dripReturnArr, totalNonDripReturnArr, totalDripReturnArr) {
        console.log('updateTables function called');
        // Build monthly table
        const monthlyRows = labels.map((m, i) => {
            const invested = (i === 0) ? P : contribThisMonthArr[i];
            const totalInvestedToDate = P + contribThisMonthArr.slice(0, i+1).reduce((sum, val) => sum + val, 0);
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
            <table class="drip-detail-table monthly-table">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Principal<br/>Invested</th>
                        <th>Return<br/>(No DRIP)</th>
                        <th>Return<br/>(With DRIP)</th>
                        <th>Total Value<br/>(No DRIP)</th>
                        <th>Total Value<br/>(With DRIP)</th>
                    </tr>
                </thead>
                <tbody>
                    ${monthlyRows} 
                </tbody>
            </table>`;

        // Build yearly table
        const yearLabels = [];
        labels.forEach(m => {
            if (m % 12 === 0) yearLabels.push(m / 12);
        });

        const yearlyRows = yearLabels.map((y, index) => {
            const startIdx = (y - 1) * 12;
            const endIdx = y * 12 - 1;
            
            const thisYearContrib = contribThisMonthArr
                .slice(startIdx, endIdx + 1)
                .reduce((sum, c) => sum + c, 0);
            
            const invested = (y === 1 ? P : 0) + thisYearContrib;
            const totalInvestedToDate = P + contribThisMonthArr.slice(0, endIdx+1).reduce((sum, val) => sum + val, 0);
            
            const regularValue = totalInvestedToDate + totalNonDripReturnArr[endIdx];
            const dripValue = totalInvestedToDate + totalDripReturnArr[endIdx];
            
            let yearlyRegularReturn = 0;
            let yearlyDripReturn = 0;
            
            if (index > 0) {
                const prevYearIdx = yearLabels[index-1] * 12 - 1;
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
                        <th>Principal<br/>Invested</th>
                        <th>Return<br/>(No DRIP)</th>
                        <th>Return<br/>(With DRIP)</th>
                        <th>Total Value<br/>(No DRIP)</th>
                        <th>Total Value<br/>(With DRIP)</th>
                    </tr>
                </thead>
                <tbody>
                    ${yearlyRows}
                </tbody>
            </table>`;

        document.getElementById('dripTableContainer').innerHTML = showYear ? yearlyTableHtml : monthlyTableHtml;
    }

    // Helper function to update chart
    function updateChart(labels, totalNonDripReturnArr, totalDripReturnArr, contribThisMonthArr, P) {
        console.log('updateChart function called');
        console.log('Chart.js available:', typeof Chart !== 'undefined');
        
        const yearLabels = [];
        const yearlyDripTotal = [];
        const yearlyNonDripTotal = [];
        
        labels.forEach(m => {
            if (m % 12 === 0) {
                const y = m / 12;
                yearLabels.push(y);
                const idx = m - 1;
                const totalInvestedToDate = P + contribThisMonthArr.slice(0, idx+1).reduce((sum, val) => sum + val, 0);
                yearlyDripTotal.push(totalInvestedToDate + totalDripReturnArr[idx]);
                yearlyNonDripTotal.push(totalInvestedToDate + totalNonDripReturnArr[idx]);
            }
        });

        if (dripChart) dripChart.destroy();

        const canvas = document.getElementById('dripChart');
        canvas.width = 480;
        canvas.height = 380;
        
        Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
        Chart.defaults.color = getComputedStyle(document.body).color;
        Chart.defaults.devicePixelRatio = 2;
        
        const ctx = canvas.getContext('2d');
        
        setTimeout(() => {
            dripChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: yearLabels.map(y => `Year ${y}`),
                    datasets: [
                        {
                            label: 'Total Value (With DRIP):',
                            data: yearlyDripTotal,
                            borderColor: '#006644',
                            pointBackgroundColor: '#006644',
                            pointBorderColor: '#ffffff',
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Total Value (no DRIP)',
                            data: yearlyNonDripTotal,
                            borderColor: '#004C84',
                            pointBackgroundColor: '#004C84',
                            pointBorderColor: '#ffffff',
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            left: 5,
                            right: 10,
                            top: 5,
                            bottom: 25
                        }
                    },
                    scales: {
                        x: {
                            type: 'category',
                            title: {
                                display: true,
                                text: 'Number of years invested'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Total Investment Value ($)'
                            },
                            ticks: {
                                callback: value => Math.round(value).toLocaleString()
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = Math.round(context.parsed.y).toLocaleString();
                                    return `${context.dataset.label}: $${value}`;
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'Total Investment Value Over Time (Regular VS DRIP)',
                            padding: { top: 10 },
                            font: { size: 16, weight: '500' }
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                boxWidth: 8,
                                boxHeight: 8,
                                padding: 16
                            }
                        }
                    }
                }
            });
        }, 100);
    }

    // Helper function to add tooltips
    function addTooltips() {
        document.querySelectorAll('#dripResults .result-row span').forEach(span => {
            const container = document.createElement('span');
            container.className = 'tooltip-container';
            
            const iconEl = document.createElement('span');
            iconEl.className = 'tooltip-icon';
            iconEl.textContent = '?';
            
            const bubble = document.createElement('span');
            bubble.className = 'tooltip-bubble';
            
            const label = span.previousElementSibling.textContent;
            
            switch(label) {
                case "Annualized Return (No DRIP):":
                    bubble.textContent = "The annual distribution yield you selected. This represents the regular dividend payments if not reinvested.";
                    break;
                case "Annualized Return (With DRIP):":
                    bubble.textContent = "Average annual return when dividends are reinvested. Calculated as: (Sum of all DRIP returns / Years) / Average Principal. This shows the compound effect of reinvesting dividends.";
                    break;
                case "Total Value (No DRIP):":
                    bubble.textContent = "Final value of your investment without reinvesting dividends. Includes your initial investment, additional contributions, and accumulated dividends.";
                    break;
                case "Total Value (With DRIP):":
                    bubble.textContent = "Final value of your investment with dividend reinvestment. Shows how your wealth grows when dividends are automatically reinvested to buy more units.";
                    break;
                case "Percentage Growth (No DRIP):":
                    bubble.textContent = "Percentage increase from your total invested amount when not reinvesting dividends. Calculated as: (Total Returns / Total Invested) × 100";
                    break;
                case "Percentage Growth (With DRIP):":
                    bubble.textContent = "Percentage increase from your total invested amount with dividend reinvestment. Calculated as: ((Final DRIP Value / Total Invested) - 1) × 100";
                    break;
                default:
                    bubble.textContent = label;
            }
            
            container.appendChild(iconEl);
            container.appendChild(bubble);
            span.appendChild(container);
            
            const positionTooltip = () => {
                const originalTransition = bubble.style.transition;
                bubble.style.transition = 'none';
                bubble.style.visibility = 'hidden'; 
                bubble.style.display = 'block'; 

                const iconRect = iconEl.getBoundingClientRect();
                let bubbleW = bubble.offsetWidth;
                let bubbleH = bubble.offsetHeight;

                bubble.style.display = ''; 
                bubble.style.visibility = ''; 

                if (bubbleW === 0 || bubbleH === 0) {
                    console.warn("Tooltip dimensions initially zero. W:", bubbleW, "H:", bubbleH, ". Text:", bubble.textContent.substring(0,10));
                }
                
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const scrollY = window.scrollY; 

                let idealLeft = iconRect.left + (iconRect.width / 2) - (bubbleW / 2);
                let idealTop = iconRect.top + scrollY - bubbleH - 8;

                if (idealLeft < 5) {
                    idealLeft = 5;
                } else if (idealLeft + bubbleW > viewportWidth - 5) {
                    idealLeft = viewportWidth - bubbleW - 5;
                }

                let arrowPointsDown = true; 
                if ((idealTop - scrollY) < 5) { 
                    idealTop = iconRect.bottom + scrollY + 8; 
                    arrowPointsDown = false; 
                    if ((idealTop + bubbleH - scrollY) > (viewportHeight - 5)) {
                        idealTop = scrollY + 5;
                        arrowPointsDown = true; 
                    }
                }
                
                bubble.style.left = `${idealLeft}px`;
                bubble.style.top = `${idealTop}px`;
                
                const iconCenterX = iconRect.left + iconRect.width / 2;
                const arrowX = iconCenterX - idealLeft; 
                bubble.style.setProperty('--arrow-left', `${arrowX}px`);

                if (arrowPointsDown) {
                    bubble.classList.remove('points-up');
                } else {
                    bubble.classList.add('points-up');
                }
                
                bubble.style.transition = originalTransition;
            };
            
            container.addEventListener('mouseenter', positionTooltip);
        });
    }

    // Export functions
    function downloadCsv() {
        if(!dripData) return alert('Run calculation first');
        
        const { labels, regReturnArr, dripReturnArr, totalNonDripReturnArr, totalDripReturnArr, contribThisMonthArr, initialPrincipal } = dripData;
        
        let csv = 'DRIP Investment Calculator Results\n';
        csv += 'Input Parameters:\n';
        csv += `Initial Investment,$${parseFloat(document.getElementById('initialInvestment').value.replace(/,/g, '')).toFixed(2)}\n`;
        csv += `Annualized Distribution Yield,${parseFloat(document.getElementById('annualRate').value).toFixed(2)}%\n`;
        csv += `Time Horizon,${parseInt(document.getElementById('years').value)} years\n`;
        csv += `Additional Contribution Amount,$${parseFloat(document.getElementById('contributionAmount').value.replace(/,/g, '')).toFixed(2)}\n`;
        csv += `Contribution Frequency,${parseInt(document.getElementById('contributionFrequency').value)} months\n\n`;
        
        csv += 'Month,Contribution,Regular Return,DRIP Return,Total Value (No DRIP),Total Value (With DRIP)\n';
        
        labels.forEach((m,i) => {
            const totalInvestedToDate = initialPrincipal + contribThisMonthArr.slice(0, i+1).reduce((sum, val) => sum + val, 0);
            const regularValue = totalInvestedToDate + totalNonDripReturnArr[i];
            const dripValue = totalInvestedToDate + totalDripReturnArr[i];
            
            csv += [
                m,
                (i === 0 ? initialPrincipal : contribThisMonthArr[i]).toFixed(2),
                regReturnArr[i].toFixed(2),
                dripReturnArr[i].toFixed(2),
                regularValue.toFixed(2),
                dripValue.toFixed(2)
            ].join(',') + '\n';
        });

        // Create and download CSV file
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'drip_calculator_results.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadChart() {
        if (!dripChart) return alert('Run calculation first');
        
        const SCALE = 2;
        const DEFAULT_WIDTH = 480;
        const DEFAULT_HEIGHT = 370;

        const srcCanvas = dripChart.canvas;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = DEFAULT_WIDTH * SCALE;
        exportCanvas.height = DEFAULT_HEIGHT * SCALE;
        exportCanvas.style.width = `${DEFAULT_WIDTH}px`;
        exportCanvas.style.height = `${DEFAULT_HEIGHT}px`;

        const ctx = exportCanvas.getContext('2d');
        ctx.scale(SCALE, SCALE);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
        ctx.drawImage(srcCanvas, 0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);

        exportCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'drip_chart@2x.png';
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    function emailData() {
        if(!dripData) return alert('Run calculation first');
        
        const { labels, regReturnArr, dripReturnArr, totalNonDripReturnArr, totalDripReturnArr, contribThisMonthArr, initialPrincipal } = dripData;
        
        let csv = 'DRIP Investment Calculator Results\n';
        csv += 'Input Parameters:\n';
        csv += `Initial Investment,$${parseFloat(document.getElementById('initialInvestment').value.replace(/,/g, '')).toFixed(2)}\n`;
        csv += `Annualized Distribution Yield,${parseFloat(document.getElementById('annualRate').value).toFixed(2)}%\n`;
        csv += `Time Horizon,${parseInt(document.getElementById('years').value)} years\n`;
        csv += `Additional Contribution Amount,$${parseFloat(document.getElementById('contributionAmount').value.replace(/,/g, '')).toFixed(2)}\n`;
        csv += `Contribution Frequency,${parseInt(document.getElementById('contributionFrequency').value)} months\n\n`;
        
        csv += 'Month,Contribution,Regular Return,DRIP Return,Total Value (No DRIP),Total Value (With DRIP)\n';
        
        labels.forEach((m,i) => {
            const totalInvestedToDate = initialPrincipal + contribThisMonthArr.slice(0, i+1).reduce((sum, val) => sum + val, 0);
            const regularValue = totalInvestedToDate + totalNonDripReturnArr[i];
            const dripValue = totalInvestedToDate + totalDripReturnArr[i];
            
            csv += [
                m,
                (i === 0 ? initialPrincipal : contribThisMonthArr[i]).toFixed(2),
                regReturnArr[i].toFixed(2),
                dripReturnArr[i].toFixed(2),
                regularValue.toFixed(2),
                dripValue.toFixed(2)
            ].join(',') + '\n';
        });

        // Get email address from user
        const email = prompt('Please enter your email address:');
        if (!email) return;

        // Send data via AJAX
        $.ajax({
            url: dripCalculator.ajaxUrl,
            type: 'POST',
            data: {
                action: dripCalculator.emailEndpoint,
                nonce: dripCalculator.nonce,
                email: email,
                data: csv
            },
            success: function(response) {
                if (response.success) {
                    alert('Data sent successfully to ' + email);
                } else {
                    alert('Failed to send data: ' + response.data);
                }
            },
            error: function() {
                alert('Failed to send data. Please try again.');
            }
        });
    }

    // Initialize when DOM is ready
    $(document).ready(function() {
        // Check if dripCalculator object exists
        if (typeof dripCalculator !== 'undefined' && dripCalculator.defaultValues) {
            // Set default values from WordPress
            $('#initialInvestment').val(formatWithCommas(dripCalculator.defaultValues.initialInvestment));
            $('#annualRate').val(dripCalculator.defaultValues.annualRate);
            $('#years').val(dripCalculator.defaultValues.years);
            $('#contributionAmount').val(formatWithCommas(dripCalculator.defaultValues.contributionAmount));
            $('#contributionFrequency').val(dripCalculator.defaultValues.contributionFrequency);
        }

        // Add event listeners
        $('#calculateDrip').on('click', calculateDrip);
        
        $('#toggleView').on('click', () => {
            showYear = !showYear;
            $('#dripTableContainer').html(showYear ? yearlyTableHtml : monthlyTableHtml);
            $('#toggleView').text(showYear ? 'Show Details by Month' : 'Show Details by Year');
        });

        $('#downloadCsv').on('click', downloadCsv);
        $('#downloadChart').on('click', downloadChart);
        $('#emailData').on('click', emailData);

        // Add input formatting
        ['initialInvestment', 'contributionAmount'].forEach(id => {
            const el = document.getElementById(id);
            $(el).on('blur', () => {
                const raw = el.value.replace(/[^0-9.]/g, '');
                if (raw) el.value = formatWithCommas(raw);
            });
        });

        // Auto-run initial calculation only if Chart.js is loaded
        if (typeof Chart !== 'undefined') {
            calculateDrip();
        } else {
            console.log('Chart.js not loaded yet, skipping auto-calculation');
        }
    });
})(jQuery); 