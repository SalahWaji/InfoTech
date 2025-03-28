/**
 * Charity Module for Payday Manager
 * Handles charity tracking, donations, and recurring donations
 */

/**
 * Initialize charity module
 */
function initCharityModule() {
    // Set up event listeners
    document.getElementById('donation-form').addEventListener('submit', handleDonationSubmit);
    document.getElementById('record-donation-btn').addEventListener('click', navigateToDonationForm);
    
    // Set today's date as default for donation date
    document.getElementById('donation-date').valueAsDate = new Date();
    
    // Update charity displays
    updateCharityDisplays();
    loadDonationHistory();
}

/**
 * Update all charity-related displays
 */
function updateCharityDisplays() {
    const charityData = getSection('charity');
    
    // Update charity amount on dashboard
    document.getElementById('charity-amount').textContent = charityData.currentAmount;
    
    // Update charity balance on charity tab
    document.getElementById('charity-balance').textContent = charityData.currentAmount;
    
    // Update charity increment amount
    document.getElementById('charity-increment').textContent = charityData.incrementAmount;
}

/**
 * Handle donation form submission
 * @param {Event} event - The form submit event
 */
function handleDonationSubmit(event) {
    event.preventDefault();
    
    const date = document.getElementById('donation-date').value;
    const amount = parseFloat(document.getElementById('donation-amount').value);
    const description = document.getElementById('donation-description').value;
    
    if (!date || isNaN(amount) || amount <= 0 || !description) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    // Add donation to deductions
    const donation = {
        date,
        amount,
        description
    };
    
    // Update charity data
    const charityData = getSection('charity');
    charityData.deductions.push(donation);
    charityData.currentAmount -= amount;
    
    // Ensure charity amount doesn't go negative
    if (charityData.currentAmount < 0) {
        charityData.currentAmount = 0;
    }
    
    // Save updated charity data
    updateSection('charity', charityData);
    
    // Update displays
    updateCharityDisplays();
    loadDonationHistory();
    
    // Reset form
    document.getElementById('donation-form').reset();
    document.getElementById('donation-date').valueAsDate = new Date();
    
    // Show success message
    showSuccessMessage('Donation Recorded', `$${amount} donation has been recorded successfully.`);
}

/**
 * Navigate to the donation form
 */
function navigateToDonationForm() {
    // Switch to charity tab
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    document.querySelector('nav a[data-tab="charity"]').classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById('charity').classList.add('active');
    
    // Focus on donation amount field
    document.getElementById('donation-amount').focus();
}

/**
 * Load donation history
 */
function loadDonationHistory() {
    const charityData = getSection('charity');
    const historyList = document.getElementById('donation-history');
    
    if (!charityData.deductions || charityData.deductions.length === 0) {
        historyList.innerHTML = '<li class="loading">No donations recorded yet</li>';
        return;
    }
    
    // Sort deductions by date (newest first)
    const sortedDeductions = [...charityData.deductions].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Generate HTML for each deduction
    historyList.innerHTML = sortedDeductions.map(deduction => {
        return `
            <li>
                <div><strong>${deduction.description}</strong></div>
                <div>${formatDate(deduction.date)} - <span class="negative">-$${deduction.amount.toFixed(2)}</span></div>
            </li>
        `;
    }).join('');
}

/**
 * Process charity increment on payday
 * @param {string} paydayDate - The payday date
 * @returns {Object} Updated charity data
 */
function processCharityOnPayday(paydayDate) {
    const charityData = getSection('charity');
    const today = new Date();
    const payday = new Date(paydayDate);
    
    // Only increment charity amount if payday is today or in the past
    if (payday <= today) {
        // Increment charity amount
        charityData.currentAmount += charityData.incrementAmount;
        
        // Process recurring donations if it's the second payday of the month
        if (isSecondPaydayOfMonth(paydayDate) && charityData.recurringDonations) {
            charityData.recurringDonations.forEach(donation => {
                if (donation.schedule === 'second-paycheck') {
                    // Add to deductions
                    charityData.deductions.push({
                        date: paydayDate,
                        amount: donation.amount,
                        description: donation.description + ' (Recurring)'
                    });
                    
                    // Deduct from current amount
                    charityData.currentAmount -= donation.amount;
                }
            });
        }
        
        // Ensure charity amount doesn't go negative
        if (charityData.currentAmount < 0) {
            charityData.currentAmount = 0;
        }
        
        // Save updated charity data
        updateSection('charity', charityData);
    }
    
    return charityData;
}
