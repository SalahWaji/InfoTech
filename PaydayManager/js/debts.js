/**
 * Debts Module for Payday Manager
 * Handles debt tracking, payments, and payoff strategies
 */

/**
 * Initialize debts module
 */
function initDebtsModule() {
    // Set up event listeners
    document.getElementById('debt-form').addEventListener('submit', handleDebtSubmit);
    document.getElementById('debt-payment-form').addEventListener('submit', handleDebtPaymentSubmit);
    document.getElementById('view-payoff-btn').addEventListener('click', navigateToDebtsTab);
    
    // Set today's date as default for debt payment date
    document.getElementById('debt-payment-date').valueAsDate = new Date();
    
    // Set next month as default for debt due date
    const dueDateInput = document.getElementById('debt-due-date');
    if (dueDateInput) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        dueDateInput.valueAsDate = nextMonth;
    }
    
    // Load debts
    loadDebts();
    updateDebtPaymentDropdown();
    updateDebtSummary();
    updatePayoffStrategy();
}

/**
 * Handle debt form submission
 * @param {Event} event - The form submit event
 */
function handleDebtSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('debt-name').value;
    const balance = parseFloat(document.getElementById('debt-balance').value);
    const currency = document.getElementById('debt-currency').value;
    const interestRate = parseFloat(document.getElementById('debt-interest').value);
    const minimumPayment = parseFloat(document.getElementById('debt-minimum').value);
    const dueDate = document.getElementById('debt-due-date').value;
    
    if (!name || isNaN(balance) || balance < 0 || isNaN(interestRate) || interestRate < 0 || isNaN(minimumPayment) || minimumPayment < 0) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    // Create new debt
    const debt = {
        name,
        balance,
        currency,
        interestRate,
        minimumPayment,
        dueDate: dueDate || null,
        payments: []
    };
    
    // Add debt to data
    addItem('debts', debt);
    
    // Update displays
    loadDebts();
    updateDebtPaymentDropdown();
    updateDebtSummary();
    updatePayoffStrategy();
    
    // Reset form
    document.getElementById('debt-form').reset();
    
    // Set next month as default due date
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('debt-due-date').valueAsDate = nextMonth;
    
    // Show success message
    showSuccessMessage('Debt Added', `${name} has been added to your debts.`);
}

/**
 * Handle debt payment form submission
 * @param {Event} event - The form submit event
 */
function handleDebtPaymentSubmit(event) {
    event.preventDefault();
    
    const debtIndex = document.getElementById('debt-payment-debt').value;
    const date = document.getElementById('debt-payment-date').value;
    const amount = parseFloat(document.getElementById('debt-payment-amount').value);
    
    if (!debtIndex || !date || isNaN(amount) || amount <= 0) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    const debts = getSection('debts');
    
    if (!debts || !debts[debtIndex]) {
        alert('Selected debt not found.');
        return;
    }
    
    const debt = debts[debtIndex];
    
    // Add payment to debt
    const payment = {
        date,
        amount
    };
    
    if (!debt.payments) debt.payments = [];
    debt.payments.push(payment);
    
    // Update balance
    debt.balance -= amount;
    if (debt.balance < 0) debt.balance = 0;
    
    // Check if debt is fully paid off
    const wasFullyPaid = debt.balance <= 0;
    
    // Update debt in data
    updateItem('debts', debtIndex, debt);
    
    // Update displays
    loadDebts();
    updateDebtSummary();
    updatePayoffStrategy();
    
    // Reset form
    document.getElementById('debt-payment-form').reset();
    document.getElementById('debt-payment-date').valueAsDate = new Date();
    
    // Show success message
    if (wasFullyPaid) {
        // Show debt payoff celebration
        showDebtPayoffCelebration(debt.name);
    } else {
        // Show regular success message
        showSuccessMessage('Payment Recorded', `Payment of ${formatCurrency(amount, debt.currency)} has been recorded for ${debt.name}.`);
    }
}

/**
 * Load debts list
 */
function loadDebts() {
    const debts = getSection('debts');
    const debtsList = document.getElementById('debts-list');
    
    if (!debts || debts.length === 0) {
        debtsList.innerHTML = '<li class="loading">No debts added yet</li>';
        return;
    }
    
    // Sort debts by balance first (paid off debts at the bottom), then by due date and interest rate
    const sortedDebts = [...debts].sort((a, b) => {
        // If one is paid off and the other isn't, the unpaid one comes first
        if (a.balance === 0 && b.balance > 0) return 1;
        if (a.balance > 0 && b.balance === 0) return -1;
        
        // If both have the same payment status, sort by due date
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        // If only one has a due date, it comes first
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        // Otherwise sort by interest rate (highest first)
        return b.interestRate - a.interestRate;
    });
    
    // Generate HTML for each debt
    debtsList.innerHTML = sortedDebts.map((debt, index) => {
        const isPastDue = debt.dueDate && isDatePast(debt.dueDate);
        const isDueSoon = debt.dueDate && isDateSoon(debt.dueDate, 7);
        
        let statusClass = '';
        let statusIcon = '';
        
        if (isPastDue) {
            statusClass = 'overdue';
            statusIcon = '⚠️';
        } else if (isDueSoon) {
            statusClass = 'due-soon';
            statusIcon = '⏰';
        }
        
        let dueText = '';
        if (debt.dueDate) {
            const daysUntil = daysBetween(new Date(), debt.dueDate);
            if (isPastDue) {
                dueText = `Payment overdue by ${Math.abs(daysUntil)} days`;
            } else {
                dueText = `Payment due in ${daysUntil} days`;
            }
        }
        
        // Calculate total paid
        const totalPaid = debt.payments ? debt.payments.reduce((sum, payment) => sum + payment.amount, 0) : 0;
        
        // Add paid class if debt is fully paid off
        const isPaidOff = debt.balance === 0;
        if (isPaidOff) {
            statusClass += ' paid';
        }
        
        return `
            <li class="${statusClass}">
                <div class="${isPaidOff ? 'paid' : ''}">
                    <div><strong>${debt.name}</strong> - ${formatCurrency(debt.balance, debt.currency)}</div>
                    <div>Interest Rate: ${debt.interestRate}% - Minimum Payment: ${formatCurrency(debt.minimumPayment, debt.currency)}</div>
                    ${debt.dueDate ? `<div>Due: ${formatDate(debt.dueDate)} (${dueText}) ${statusIcon}</div>` : ''}
                    <div>Total Paid: ${formatCurrency(totalPaid, debt.currency)}</div>
                </div>
                <div class="debt-actions">
                    <button class="btn" onclick="showDebtPaymentForm(${index})" ${isPaidOff ? 'disabled' : ''}>
                        ${isPaidOff ? 'Paid Off ✓' : 'Record Payment'}
                    </button>
                </div>
            </li>
        `;
    }).join('');
}

/**
 * Show debt payment form for a specific debt
 * @param {number} debtIndex - The index of the debt
 */
function showDebtPaymentForm(debtIndex) {
    // Set the selected debt in the dropdown
    document.getElementById('debt-payment-debt').value = debtIndex;
    
    // Scroll to the payment form
    document.getElementById('debt-payment-form').scrollIntoView({ behavior: 'smooth' });
    
    // Focus on the payment amount field
    document.getElementById('debt-payment-amount').focus();
}

/**
 * Update debt payment dropdown
 */
function updateDebtPaymentDropdown() {
    const debts = getSection('debts');
    const dropdown = document.getElementById('debt-payment-debt');
    
    if (!debts || debts.length === 0) {
        dropdown.innerHTML = '<option value="">No debts available</option>';
        return;
    }
    
    // Filter out fully paid debts
    const activeDebts = debts.filter((debt, index) => debt.balance > 0);
    
    if (activeDebts.length === 0) {
        dropdown.innerHTML = '<option value="">All debts are paid off!</option>';
        return;
    }
    
    // Generate options for each active debt
    dropdown.innerHTML = '<option value="">Select a debt</option>' + 
        debts.map((debt, index) => {
            // Skip paid off debts
            if (debt.balance <= 0) return '';
            
            return `<option value="${index}">${debt.name} - ${formatCurrency(debt.balance, debt.currency)}</option>`;
        }).join('');
}

/**
 * Update debt summary on dashboard
 */
function updateDebtSummary() {
    const debts = getSection('debts');
    const debtSummary = document.getElementById('debt-summary');
    
    if (!debts || debts.length === 0) {
        debtSummary.innerHTML = '<li class="loading">No debts added yet</li>';
        return;
    }
    
    // Filter out fully paid debts
    const activeDebts = debts.filter(debt => debt.balance > 0);
    
    if (activeDebts.length === 0) {
        debtSummary.innerHTML = '<li class="positive">All debts are paid off! 🎉</li>';
        return;
    }
    
    // Sort debts by priority (due date, then interest rate)
    const prioritizedDebts = prioritizeDebts(activeDebts);
    
    // Take only the top 3 priority debts
    const topDebts = prioritizedDebts.slice(0, 3);
    
    // Generate HTML for each debt
    debtSummary.innerHTML = topDebts.map((debt, index) => {
        const isPastDue = debt.dueDate && isDatePast(debt.dueDate);
        const isDueSoon = debt.dueDate && isDateSoon(debt.dueDate, 7);
        
        let statusClass = '';
        let statusIcon = '';
        
        if (isPastDue) {
            statusClass = 'overdue';
            statusIcon = '⚠️';
        } else if (isDueSoon) {
            statusClass = 'due-soon';
            statusIcon = '⏰';
        }
        
        return `
            <li class="${statusClass}">
                <div><strong>${debt.name}</strong> - ${formatCurrency(debt.balance, debt.currency)}</div>
                <div>${debt.interestRate}% interest${debt.dueDate ? ` - Due: ${formatDate(debt.dueDate)}` : ''} ${statusIcon}</div>
            </li>
        `;
    }).join('');
    
    // Add "View All" link if there are more debts
    if (activeDebts.length > 3) {
        debtSummary.innerHTML += `
            <li class="view-all">
                <a href="#" onclick="navigateToDebtsTab(); return false;">View all ${activeDebts.length} active debts</a>
            </li>
        `;
    }
}

/**
 * Navigate to the debts tab
 */
function navigateToDebtsTab() {
    // Switch to debts tab
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    document.querySelector('nav a[data-tab="debts"]').classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById('debts').classList.add('active');
}

/**
 * Prioritize debts based on due date and interest rate
 * @param {Array} debts - The debts to prioritize
 * @returns {Array} Prioritized debts
 */
function prioritizeDebts(debts) {
    if (!debts || debts.length === 0) return [];
    
    // Clone the debts array to avoid modifying the original
    const debtsCopy = [...debts];
    
    // Sort by priority:
    // 1. Past due debts (sorted by how overdue they are)
    // 2. Upcoming due debts (sorted by due date)
    // 3. No due date debts (sorted by interest rate, highest first)
    return debtsCopy.sort((a, b) => {
        const aIsPastDue = a.dueDate && isDatePast(a.dueDate);
        const bIsPastDue = b.dueDate && isDatePast(b.dueDate);
        
        // If both are past due, sort by how overdue they are (most overdue first)
        if (aIsPastDue && bIsPastDue) {
            return daysBetween(a.dueDate, new Date()) - daysBetween(b.dueDate, new Date());
        }
        
        // Past due debts come first
        if (aIsPastDue) return -1;
        if (bIsPastDue) return 1;
        
        // If both have upcoming due dates, sort by due date
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        
        // Debts with due dates come before those without
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        
        // For debts without due dates, sort by interest rate (highest first)
        return b.interestRate - a.interestRate;
    });
}

/**
 * Update payoff strategy
 */
function updatePayoffStrategy() {
    const debts = getSection('debts');
    const strategyDiv = document.getElementById('payoff-strategy');
    
    if (!debts || debts.length === 0) {
        strategyDiv.innerHTML = '<p>Add debts to see payoff recommendations</p>';
        return;
    }
    
    // Filter out fully paid debts
    const activeDebts = debts.filter(debt => debt.balance > 0);
    
    if (activeDebts.length === 0) {
        strategyDiv.innerHTML = `
            <div class="positive">
                <h4>🎉 All debts are paid off! 🎉</h4>
                <p>Congratulations on becoming debt-free!</p>
            </div>
        `;
        return;
    }
    
    // Prioritize active debts
    const prioritizedDebts = prioritizeDebts(activeDebts);
    
    // Calculate total debt
    const totalDebt = activeDebts.reduce((sum, debt) => {
        // Convert all to USD for simplicity
        return sum + convertCurrency(debt.balance, debt.currency, 'USD');
    }, 0);
    
    // Generate strategy HTML
    let strategyHTML = `
        <h4>Total Debt: ${formatCurrency(totalDebt, 'USD')}</h4>
        <p>Recommended payment order:</p>
        <ol>
    `;
    
    prioritizedDebts.forEach(debt => {
        let reason = '';
        
        if (debt.dueDate && isDatePast(debt.dueDate)) {
            reason = 'Overdue payment';
        } else if (debt.dueDate && isDateSoon(debt.dueDate, 7)) {
            reason = 'Due soon';
        } else if (!debt.dueDate) {
            reason = 'High interest rate';
        } else {
            reason = 'Upcoming due date';
        }
        
        strategyHTML += `
            <li>
                <strong>${debt.name}</strong> - ${formatCurrency(debt.balance, debt.currency)}
                <span class="strategy-reason">(Reason: ${reason})</span>
            </li>
        `;
    });
    
    strategyHTML += `
        </ol>
        <div class="strategy-tips">
            <h4>Payoff Tips:</h4>
            <ul>
                <li>Always make at least the minimum payment on all debts</li>
                <li>Put extra money towards the highest priority debt</li>
                <li>Once a debt is paid off, move to the next priority</li>
            </ul>
        </div>
    `;
    
    strategyDiv.innerHTML = strategyHTML;
}

/**
 * Show debt payoff celebration
 * @param {string} debtName - The name of the debt that was paid off
 */
function showDebtPayoffCelebration(debtName) {
    // Create a custom modal for the celebration
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <div class="success-icon">🎉</div>
            <h3>Congratulations!</h3>
            <p>You've completely paid off <strong>${debtName}</strong>!</p>
            <p>This is a huge financial achievement. Keep up the great work!</p>
        </div>
    `;
    
    // Add modal to body
    document.body.appendChild(modal);
    
    // Add event listener to close button
    modal.querySelector('.close').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Launch confetti
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
    });
    
    // Launch more confetti after a delay
    setTimeout(() => {
        confetti({
            particleCount: 100,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
        });
    }, 500);
    
    // And from the other side
    setTimeout(() => {
        confetti({
            particleCount: 100,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
        });
    }, 1000);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    }, 5000);
}

/**
 * Calculate months to payoff for a debt
 * @param {Object} debt - The debt to calculate payoff for
 * @param {number} monthlyPayment - The monthly payment amount
 * @returns {number} Months to payoff
 */
function calculateMonthsToPayoff(debt, monthlyPayment) {
    if (debt.balance <= 0 || monthlyPayment <= 0) return 0;
    
    // Simple calculation (doesn't account for compounding interest)
    const monthlyInterestRate = debt.interestRate / 100 / 12;
    
    // If no interest, simple division
    if (monthlyInterestRate === 0) {
        return Math.ceil(debt.balance / monthlyPayment);
    }
    
    // With interest, use the formula for loan payoff
    // M = log(P / (P - B * r)) / log(1 + r)
    // Where M is months, P is payment, B is balance, r is monthly interest rate
    const numerator = Math.log(monthlyPayment / (monthlyPayment - debt.balance * monthlyInterestRate));
    const denominator = Math.log(1 + monthlyInterestRate);
    
    return Math.ceil(numerator / denominator);
}
