/**
 * Main Application Module for Payday Manager
 * Handles initialization, tab navigation, and payday planning
 */

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// App configuration
const APP_CONFIG = {
    password: 'payday2025', // Default password
    darkMode: false,        // Default theme
    initialized: false      // First-time setup flag
};

/**
 * Initialize the application
 */
function initApp() {
    // Check if password protection is enabled
    if (isPasswordProtected()) {
        showLoginModal();
    } else {
        initializeAppContent();
    }
    
    // Set up night mode toggle
    setupNightModeToggle();
}

/**
 * Check if password protection is enabled
 */
function isPasswordProtected() {
    // Always return true to enable password protection by default
    return true;
}

/**
 * Show login modal
 */
function showLoginModal() {
    const loginModal = document.getElementById('login-modal');
    loginModal.style.display = 'block';
    
    document.getElementById('login-btn').addEventListener('click', function() {
        const password = document.getElementById('password-input').value;
        validatePassword(password);
    });
    
    document.getElementById('password-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const password = document.getElementById('password-input').value;
            validatePassword(password);
        }
    });
}

/**
 * Validate password
 */
function validatePassword(password) {
    const config = localStorage.getItem('payday_manager_config');
    let correctPassword = APP_CONFIG.password;
    
    if (config) {
        const parsedConfig = JSON.parse(config);
        correctPassword = parsedConfig.password;
    }
    
    if (password === correctPassword) {
        document.getElementById('login-modal').style.display = 'none';
        initializeAppContent();
    } else {
        alert('Incorrect password. Please try again.');
    }
}

/**
 * Initialize app content after login
 */
function initializeAppContent() {
    // Initialize data
    const data = initializeData();
    
    // Set up tab navigation
    setupTabNavigation();
    
    // Set up payday form
    document.getElementById('payday-form').addEventListener('submit', handlePaydaySubmit);
    
    // Set today's date as default for income date
    document.getElementById('income-date').valueAsDate = new Date();
    
    // Initialize modules
    initCharityModule();
    initBillsModule();
    initDebtsModule();
    initSavingsModule();
    
    // Update next payday display
    updateNextPaydayDisplay();
    
    // Load payday history
    loadPaydayHistory();
    
    // Check for payday
    checkForPayday();
    
    // Initialize charts
    initializeCharts();
    
    // Update dashboard totals
    updateDashboardTotals();
    
    // Set up debt chart button
    document.getElementById('view-debt-chart-btn').addEventListener('click', showDebtChart);
    
    // Set up close buttons for modals
    setupModalCloseButtons();
}

/**
 * Set up night mode toggle
 */
function setupNightModeToggle() {
    const toggleBtn = document.getElementById('mode-toggle-btn');
    const icon = toggleBtn.querySelector('i');
    
    // Check saved preference
    const config = localStorage.getItem('payday_manager_config');
    if (config) {
        const parsedConfig = JSON.parse(config);
        if (parsedConfig.darkMode) {
            document.body.classList.add('dark-mode');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
    
    toggleBtn.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            saveAppConfig({ darkMode: true });
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            saveAppConfig({ darkMode: false });
        }
        
        // Update charts with new theme colors
        updateChartsTheme();
    });
}

/**
 * Save app configuration
 */
function saveAppConfig(updates) {
    let config = APP_CONFIG;
    
    // Load existing config if available
    const savedConfig = localStorage.getItem('payday_manager_config');
    if (savedConfig) {
        config = JSON.parse(savedConfig);
    }
    
    // Apply updates
    config = { ...config, ...updates };
    
    // Save to localStorage
    localStorage.setItem('payday_manager_config', JSON.stringify(config));
}

/**
 * Set up modal close buttons
 */
function setupModalCloseButtons() {
    // Get all close buttons
    const closeButtons = document.querySelectorAll('.close');
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Find the parent modal
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

/**
 * Update dashboard totals
 */
function updateDashboardTotals() {
    updateTotalBills();
    updateTotalDebts();
    updateAllocationChart();
}

/**
 * Update total bills badge
 */
function updateTotalBills() {
    const bills = getSection('bills');
    const totalBillsBadge = document.getElementById('total-bills-badge');
    
    if (!bills || bills.length === 0) {
        totalBillsBadge.textContent = '$0';
        return;
    }
    
    // Calculate total unpaid bills
    let totalBills = 0;
    bills.forEach(bill => {
        if (!hasPaidCurrentBill(bill)) {
            totalBills += convertCurrency(bill.totalAmount, bill.currency, 'USD');
        }
    });
    
    totalBillsBadge.textContent = formatCurrency(totalBills, 'USD');
}

/**
 * Update total debts badge
 */
function updateTotalDebts() {
    const debts = getSection('debts');
    const totalDebtsBadge = document.getElementById('total-debts-badge');
    
    if (!debts || debts.length === 0) {
        totalDebtsBadge.textContent = '$0';
        return;
    }
    
    // Calculate total debt
    let totalDebts = 0;
    debts.forEach(debt => {
        totalDebts += convertCurrency(debt.balance, debt.currency, 'USD');
    });
    
    totalDebtsBadge.textContent = formatCurrency(totalDebts, 'USD');
}

/**
 * Initialize charts
 */
function initializeCharts() {
    // Initialize allocation chart with empty data
    const allocationCtx = document.getElementById('allocation-chart').getContext('2d');
    window.allocationChart = new Chart(allocationCtx, {
        type: 'pie',
        data: {
            labels: ['Bills', 'Credit Cards', 'Charity', 'Savings', 'Other'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    '#FF9800',  // Bills - Orange
                    '#F44336',  // Credit Cards - Red
                    '#4CAF50',  // Charity - Green
                    '#2196F3',  // Savings - Blue
                    '#9C27B0'   // Other - Purple
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Paycheck Allocation'
                }
            }
        }
    });
}

/**
 * Update allocation chart
 */
function updateAllocationChart() {
    const paydays = getSection('paydays');
    
    if (!paydays || paydays.length === 0) {
        document.getElementById('allocation-summary').innerHTML = '<p>Add a payday record to see allocation breakdown</p>';
        return;
    }
    
    // Get the most recent payday
    const latestPayday = [...paydays].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    })[0];
    
    // Extract allocation data
    const allocations = latestPayday.allocations;
    const data = [
        allocations.bills || 0,
        allocations.creditCards || 0,
        allocations.charity || 0,
        allocations.savings || 0,
        allocations.other || 0
    ];
    
    // Update chart data
    window.allocationChart.data.datasets[0].data = data;
    window.allocationChart.update();
    
    // Update allocation summary
    const totalIncome = latestPayday.income.reduce((sum, income) => sum + income.amount, 0);
    const currency = latestPayday.income[0].currency;
    
    let summaryHTML = `<h4>Latest Paycheck: ${formatDate(latestPayday.date)}</h4>`;
    summaryHTML += `<p>Total Income: ${formatCurrency(totalIncome, currency)}</p>`;
    summaryHTML += '<ul>';
    
    if (allocations.bills) {
        summaryHTML += `<li>Bills: ${formatCurrency(allocations.bills, currency)} (${Math.round(allocations.bills / totalIncome * 100)}%)</li>`;
    }
    
    if (allocations.creditCards) {
        summaryHTML += `<li>Credit Cards: ${formatCurrency(allocations.creditCards, currency)} (${Math.round(allocations.creditCards / totalIncome * 100)}%)</li>`;
    }
    
    if (allocations.charity) {
        summaryHTML += `<li>Charity: ${formatCurrency(allocations.charity, currency)} (${Math.round(allocations.charity / totalIncome * 100)}%)</li>`;
    }
    
    if (allocations.savings) {
        summaryHTML += `<li>Savings: ${formatCurrency(allocations.savings, currency)} (${Math.round(allocations.savings / totalIncome * 100)}%)</li>`;
    }
    
    if (allocations.other) {
        summaryHTML += `<li>Other: ${formatCurrency(allocations.other, currency)} (${Math.round(allocations.other / totalIncome * 100)}%)</li>`;
    }
    
    summaryHTML += '</ul>';
    
    document.getElementById('allocation-summary').innerHTML = summaryHTML;
}

/**
 * Show debt breakdown chart
 */
function showDebtChart() {
    const debts = getSection('debts');
    const modal = document.getElementById('debt-chart-modal');
    
    if (!debts || debts.length === 0) {
        alert('Add debts to see the breakdown chart');
        return;
    }
    
    // Prepare data for chart
    const labels = debts.map(debt => debt.name);
    const data = debts.map(debt => convertCurrency(debt.balance, debt.currency, 'USD'));
    const backgroundColors = generateChartColors(debts.length);
    
    // Create or update chart
    if (window.debtChart) {
        window.debtChart.data.labels = labels;
        window.debtChart.data.datasets[0].data = data;
        window.debtChart.data.datasets[0].backgroundColor = backgroundColors;
        window.debtChart.update();
    } else {
        const ctx = document.getElementById('debt-chart').getContext('2d');
        window.debtChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Debt Breakdown'
                    }
                }
            }
        });
    }
    
    // Show modal
    modal.style.display = 'block';
}

/**
 * Generate chart colors
 */
function generateChartColors(count) {
    const baseColors = [
        '#F44336', // Red
        '#E91E63', // Pink
        '#9C27B0', // Purple
        '#673AB7', // Deep Purple
        '#3F51B5', // Indigo
        '#2196F3', // Blue
        '#03A9F4', // Light Blue
        '#00BCD4', // Cyan
        '#009688', // Teal
        '#4CAF50', // Green
        '#8BC34A', // Light Green
        '#CDDC39', // Lime
        '#FFEB3B', // Yellow
        '#FFC107', // Amber
        '#FF9800', // Orange
        '#FF5722'  // Deep Orange
    ];
    
    // If we need more colors than in our base set, we'll generate them
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }
    
    // Generate additional colors
    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
        const hue = (i * 137.5) % 360; // Golden angle approximation for good distribution
        colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    
    return colors;
}

/**
 * Update charts theme based on dark/light mode
 */
function updateChartsTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#FFFFFF' : '#000000';
    
    // Update allocation chart if it exists
    if (window.allocationChart) {
        window.allocationChart.options.plugins.title.color = textColor;
        window.allocationChart.options.plugins.legend.labels.color = textColor;
        window.allocationChart.update();
    }
    
    // Update debt chart if it exists
    if (window.debtChart) {
        window.debtChart.options.plugins.title.color = textColor;
        window.debtChart.options.plugins.legend.labels.color = textColor;
        window.debtChart.update();
    }
}

/**
 * Set up tab navigation
 */
function setupTabNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(link => link.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Get tab ID from data attribute
            const tabId = this.getAttribute('data-tab');
            
            // Hide all tab content
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab content
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Update next payday display
 */
function updateNextPaydayDisplay() {
    const userData = getUserSettings();
    const nextPaydayDate = userData.payday.nextDate;
    
    if (!nextPaydayDate) {
        document.getElementById('payday-date').textContent = 'Not set';
        document.getElementById('days-until').textContent = '';
        return;
    }
    
    const formattedDate = formatDate(nextPaydayDate);
    const daysUntil = daysBetween(new Date(), nextPaydayDate);
    
    document.getElementById('payday-date').textContent = formattedDate;
    document.getElementById('days-until').textContent = `(${daysUntil} days) 📅`;
}

/**
 * Handle payday form submission
 * @param {Event} event - The form submit event
 */
function handlePaydaySubmit(event) {
    event.preventDefault();
    
    const date = document.getElementById('income-date').value;
    const type = document.getElementById('income-type').value;
    const amount = parseFloat(document.getElementById('income-amount').value);
    const currency = document.getElementById('income-currency').value;
    
    const billsAllocation = parseFloat(document.getElementById('bills-allocation').value) || 0;
    const creditAllocation = parseFloat(document.getElementById('credit-allocation').value) || 0;
    const charityAllocation = parseFloat(document.getElementById('charity-allocation').value) || 0;
    const savingsAllocation = parseFloat(document.getElementById('savings-allocation').value) || 0;
    const otherAllocation = parseFloat(document.getElementById('other-allocation').value) || 0;
    
    if (!date || isNaN(amount) || amount <= 0) {
        alert('Please fill in all required fields with valid values.');
        return;
    }
    
    // Create new payday record
    const payday = {
        date,
        income: [
            { type, amount, currency }
        ],
        allocations: {
            bills: billsAllocation,
            creditCards: creditAllocation,
            charity: charityAllocation,
            savings: savingsAllocation,
            other: otherAllocation
        }
    };
    
    // Add payday to data
    const data = loadData();
    if (!data.paydays) data.paydays = [];
    data.paydays.push(payday);
    
    // Update next payday date
    const nextPayday = calculateNextPayday(data.user.payday.frequency, date);
    data.user.payday.nextDate = nextPayday.toISOString().split('T')[0];
    
    // Save data
    saveData(data);
    
    // Process charity increment
    processCharityOnPayday(date);
    
    // Process savings
    processSavingsOnPayday(date, savingsAllocation);
    
    // Update displays
    updateNextPaydayDisplay();
    loadPaydayHistory();
    
    // Reset form
    document.getElementById('payday-form').reset();
    document.getElementById('income-date').valueAsDate = new Date();
    document.getElementById('savings-allocation').value = data.user.savings.amountPerPaycheck;
    
    // Show success message
    showSuccessMessage('Payday Recorded', `Your ${type} of ${formatCurrency(amount, currency)} has been recorded.`);
}

/**
 * Load payday history
 */
function loadPaydayHistory() {
    const data = loadData();
    const historyList = document.getElementById('payday-history');
    
    if (!data.paydays || data.paydays.length === 0) {
        historyList.innerHTML = '<li class="loading">No payday records yet</li>';
        return;
    }
    
    // Sort paydays by date (newest first)
    const sortedPaydays = [...data.paydays].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Generate HTML for each payday
    historyList.innerHTML = sortedPaydays.map(payday => {
        // Calculate total income
        const totalIncome = payday.income.reduce((sum, income) => {
            return sum + income.amount;
        }, 0);
        
        // Get currency from first income (assuming all incomes use the same currency)
        const currency = payday.income[0].currency;
        
        // Calculate total allocations
        const totalAllocations = Object.values(payday.allocations).reduce((sum, value) => {
            return sum + (value || 0);
        }, 0);
        
        return `
            <li>
                <div><strong>${formatDate(payday.date)}</strong> - ${payday.income[0].type}</div>
                <div>Income: ${formatCurrency(totalIncome, currency)}</div>
                <div class="allocations-summary">
                    ${payday.allocations.bills ? `<span>Bills: ${formatCurrency(payday.allocations.bills, currency)}</span>` : ''}
                    ${payday.allocations.creditCards ? `<span>Credit: ${formatCurrency(payday.allocations.creditCards, currency)}</span>` : ''}
                    ${payday.allocations.charity ? `<span>Charity: ${formatCurrency(payday.allocations.charity, currency)}</span>` : ''}
                    ${payday.allocations.savings ? `<span>Savings: ${formatCurrency(payday.allocations.savings, currency)}</span>` : ''}
                    ${payday.allocations.other ? `<span>Other: ${formatCurrency(payday.allocations.other, currency)}</span>` : ''}
                </div>
                <div>Allocated: ${formatCurrency(totalAllocations, currency)} / ${formatCurrency(totalIncome, currency)}</div>
            </li>
        `;
    }).join('');
}

/**
 * Check if today is payday
 */
function checkForPayday() {
    const userData = getUserSettings();
    const nextPaydayDate = userData.payday.nextDate;
    
    if (!nextPaydayDate) return;
    
    const today = new Date().toISOString().split('T')[0];
    const nextPayday = new Date(nextPaydayDate).toISOString().split('T')[0];
    
    if (today === nextPayday) {
        // It's payday! Show notification
        showPaydayNotification();
    }
}

/**
 * Show payday notification
 */
function showPaydayNotification() {
    const userData = getUserSettings();
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'payday-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <h3>🎉 It's Payday! 🎉</h3>
            <p>Today is your scheduled payday. Don't forget to:</p>
            <ul>
                <li>Record your income</li>
                <li>Pay your bills</li>
                <li>Make credit card payments</li>
                <li>Set aside money for charity</li>
                <li>Add to your savings</li>
            </ul>
            <button id="record-payday-btn" class="btn btn-primary">Record Payday Now</button>
            <button id="dismiss-notification-btn" class="btn">Dismiss</button>
        </div>
    `;
    
    // Add notification to body
    document.body.appendChild(notification);
    
    // Add event listeners
    document.getElementById('record-payday-btn').addEventListener('click', function() {
        // Navigate to payday tab
        document.querySelector('nav a[data-tab="payday"]').click();
        
        // Remove notification
        document.body.removeChild(notification);
    });
    
    document.getElementById('dismiss-notification-btn').addEventListener('click', function() {
        // Remove notification
        document.body.removeChild(notification);
    });
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .payday-notification {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1001;
        }
        
        .notification-content {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        .notification-content h3 {
            margin-bottom: 15px;
            color: var(--primary-color);
        }
        
        .notification-content ul {
            text-align: left;
            margin: 15px 0;
            padding-left: 20px;
        }
        
        .notification-content button {
            margin: 5px;
        }
    `;
    
    document.head.appendChild(style);
}
