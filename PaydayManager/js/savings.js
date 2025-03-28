/**
 * Savings Module for Payday Manager
 * Handles savings tracking and history
 */

/**
 * Initialize savings module
 */
function initSavingsModule() {
    // Update savings displays
    updateSavingsDisplays();
    loadSavingsHistory();
}

/**
 * Update all savings-related displays
 */
function updateSavingsDisplays() {
    const userData = getUserSettings();
    const savingsData = getSection('savings');
    
    // Update savings amount on dashboard
    document.getElementById('savings-amount').textContent = savingsData.balance.toFixed(2);
    document.getElementById('savings-currency').textContent = userData.savings.currency;
    
    // Update per-paycheck savings on dashboard
    document.getElementById('per-paycheck-savings').textContent = userData.savings.amountPerPaycheck.toFixed(2);
    
    // Update savings balance on savings tab
    document.getElementById('savings-balance').textContent = savingsData.balance.toFixed(2);
    document.getElementById('savings-currency-display').textContent = userData.savings.currency;
    
    // Update per-paycheck savings on savings tab
    document.getElementById('savings-per-paycheck').textContent = userData.savings.amountPerPaycheck.toFixed(2);
}

/**
 * Load savings history
 */
function loadSavingsHistory() {
    const savingsData = getSection('savings');
    const historyList = document.getElementById('savings-history');
    
    if (!savingsData.history || savingsData.history.length === 0) {
        historyList.innerHTML = '<li class="loading">No savings records yet</li>';
        return;
    }
    
    // Sort history by date (newest first)
    const sortedHistory = [...savingsData.history].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Generate HTML for each history item
    historyList.innerHTML = sortedHistory.map(item => {
        return `
            <li>
                <div><strong>${item.description}</strong></div>
                <div>${formatDate(item.date)} - <span class="positive">+${formatCurrency(item.amount, item.currency)}</span></div>
                <div>Balance: ${formatCurrency(item.balance, item.currency)}</div>
            </li>
        `;
    }).join('');
}

/**
 * Process savings on payday
 * @param {string} paydayDate - The payday date
 * @param {number} savingsAmount - The amount to save (if different from default)
 * @returns {Object} Updated savings data
 */
function processSavingsOnPayday(paydayDate, savingsAmount = null) {
    const userData = getUserSettings();
    const savingsData = getSection('savings');
    const today = new Date();
    const payday = new Date(paydayDate);
    
    // Only process savings if payday is today or in the past
    if (payday <= today) {
        // Use provided amount or default from user settings
        const amount = savingsAmount !== null ? savingsAmount : userData.savings.amountPerPaycheck;
        
        // Add to savings balance
        savingsData.balance += amount;
        
        // Add to history
        const historyItem = {
            date: paydayDate,
            amount: amount,
            currency: userData.savings.currency,
            description: 'Payday Savings',
            balance: savingsData.balance
        };
        
        if (!savingsData.history) savingsData.history = [];
        savingsData.history.push(historyItem);
        
        // Save updated savings data
        updateSection('savings', savingsData);
        
        // Update displays
        updateSavingsDisplays();
        loadSavingsHistory();
    }
    
    return savingsData;
}

/**
 * Update savings settings
 * @param {number} amountPerPaycheck - The new amount per paycheck
 * @param {string} currency - The currency
 */
function updateSavingsSettings(amountPerPaycheck, currency) {
    const userData = getUserSettings();
    
    userData.savings = {
        amountPerPaycheck,
        currency
    };
    
    updateUserSettings(userData);
    updateSavingsDisplays();
}
