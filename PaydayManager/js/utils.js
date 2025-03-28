/**
 * Utility functions for Payday Manager
 */

/**
 * Format a date as a readable string
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    if (!date) return 'N/A';
    
    // If date is a string in YYYY-MM-DD format, parse it directly
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[month-1]} ${day}, ${year}`;
    }
    
    // Otherwise use the Date object
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return dateObj.toLocaleDateString(undefined, options);
}

/**
 * Calculate days between two dates
 * @param {string|Date} startDate - The start date
 * @param {string|Date} endDate - The end date (defaults to today)
 * @returns {number} Number of days between dates
 */
function daysBetween(startDate, endDate = new Date()) {
    // Parse YYYY-MM-DD format directly
    let start, end;
    
    if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        const [year, month, day] = startDate.split('-').map(Number);
        start = new Date(Date.UTC(year, month - 1, day));
    } else {
        start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    }
    
    if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        const [year, month, day] = endDate.split('-').map(Number);
        end = new Date(Date.UTC(year, month - 1, day));
    } else {
        end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    }
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return NaN;
    
    // Convert to UTC to avoid timezone issues
    const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    
    // Calculate difference in days
    return Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24));
}

/**
 * Format currency amount
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (USD, CAD, etc.)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'USD') {
    if (isNaN(amount)) return 'Invalid Amount';
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Convert between currencies (simplified version)
 * In a real app, this would use an API for current exchange rates
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - The source currency
 * @param {string} toCurrency - The target currency
 * @returns {number} Converted amount
 */
function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    // Simplified conversion rates (as of March 2025)
    const rates = {
        'USD_CAD': 1.35,
        'CAD_USD': 0.74
    };
    
    const rateKey = `${fromCurrency}_${toCurrency}`;
    const rate = rates[rateKey] || 1;
    
    return amount * rate;
}

/**
 * Check if a date is in the past
 * @param {string|Date} date - The date to check
 * @returns {boolean} True if date is in the past
 */
function isDatePast(date) {
    const checkDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    
    // Set both dates to start of day for comparison
    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate < today;
}

/**
 * Check if a date is within the specified number of days
 * @param {string|Date} date - The date to check
 * @param {number} days - Number of days threshold
 * @returns {boolean} True if date is within the threshold
 */
function isDateSoon(date, days = 7) {
    const daysUntil = daysBetween(new Date(), date);
    return daysUntil >= 0 && daysUntil <= days;
}

/**
 * Show a success message in the modal
 * @param {string} title - The modal title
 * @param {string} message - The modal message
 */
function showSuccessMessage(title, message) {
    const modal = document.getElementById('success-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    modal.style.display = 'block';
    
    // Add animation classes
    const modalContent = document.querySelector('.modal-content');
    modalContent.classList.add('fade-in', 'scale-up');
    
    // Remove animation classes after animation completes
    setTimeout(() => {
        modalContent.classList.remove('fade-in', 'scale-up');
    }, 500);
    
    // Close modal when clicking the close button
    document.querySelector('.close').onclick = function() {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking outside the modal
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // Auto-close after 3 seconds
    setTimeout(() => {
        modal.style.display = 'none';
    }, 3000);
}

/**
 * Calculate the next payday date based on frequency
 * @param {string} frequency - The payday frequency (weekly, biweekly, monthly)
 * @param {string|Date} lastPayday - The last payday date
 * @returns {Date} The next payday date
 */
function calculateNextPayday(frequency, lastPayday) {
    const lastDate = typeof lastPayday === 'string' ? new Date(lastPayday) : lastPayday;
    const nextDate = new Date(lastDate);
    
    switch (frequency) {
        case 'weekly':
            nextDate.setDate(lastDate.getDate() + 7);
            break;
        case 'biweekly':
            nextDate.setDate(lastDate.getDate() + 14);
            break;
        case 'monthly':
            nextDate.setMonth(lastDate.getMonth() + 1);
            break;
        default:
            nextDate.setDate(lastDate.getDate() + 14); // Default to biweekly
    }
    
    return nextDate;
}

/**
 * Determine if a date is the second payday of the month
 * Assumes biweekly paydays
 * @param {string|Date} date - The date to check
 * @returns {boolean} True if it's the second payday of the month
 */
function isSecondPaydayOfMonth(date) {
    const checkDate = typeof date === 'string' ? new Date(date) : date;
    const day = checkDate.getDate();
    
    // Simplified logic: if the day is after the 15th, consider it the second payday
    return day > 15;
}

/**
 * Generate a unique ID
 * @returns {string} A unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
