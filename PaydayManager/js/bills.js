/**
 * Bills Module for Payday Manager
 * Handles bill tracking, payments, and due dates
 */

/**
 * Initialize bills module
 */
function initBillsModule() {
    // Set up event listeners
    document.getElementById('bill-form').addEventListener('submit', handleBillSubmit);
    
    // Set today's date as default for bill due date
    const dueDateInput = document.getElementById('bill-due-date');
    if (dueDateInput) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        dueDateInput.valueAsDate = nextMonth;
    }
    
    // Load bills
    loadBills();
    loadBillPaymentHistory();
    updateUpcomingBills();
}

/**
 * Handle bill form submission
 * @param {Event} event - The form submit event
 */
function handleBillSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('bill-name').value;
    const totalAmount = parseFloat(document.getElementById('bill-total').value);
    const amountPerPaycheck = parseFloat(document.getElementById('bill-per-paycheck').value);
    const currency = document.getElementById('bill-currency').value;
    const dueDate = document.getElementById('bill-due-date').value;
    
    if (!name || isNaN(totalAmount) || totalAmount <= 0 || isNaN(amountPerPaycheck) || amountPerPaycheck <= 0 || !dueDate) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    // Create new bill
    const bill = {
        name,
        totalAmount,
        amountPerPaycheck,
        currency,
        dueDate,
        paid: []
    };
    
    // Add bill to data
    addItem('bills', bill);
    
    // Update displays
    loadBills();
    updateUpcomingBills();
    
    // Reset form
    document.getElementById('bill-form').reset();
    
    // Set next month as default due date
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('bill-due-date').valueAsDate = nextMonth;
    
    // Show success message
    showSuccessMessage('Bill Added', `${name} has been added to your bills.`);
}

/**
 * Load bills list
 */
function loadBills() {
    const bills = getSection('bills');
    const billsList = document.getElementById('bills-list');
    
    if (!bills || bills.length === 0) {
        billsList.innerHTML = '<li class="loading">No bills added yet</li>';
        return;
    }
    
    // Sort bills by paid status first (unpaid first), then by due date
    const sortedBills = [...bills].sort((a, b) => {
        const aIsPaid = hasPaidCurrentBill(a);
        const bIsPaid = hasPaidCurrentBill(b);
        
        // If payment status is different, sort by that first
        if (aIsPaid !== bIsPaid) {
            return aIsPaid ? 1 : -1; // Unpaid bills first
        }
        
        // If both are unpaid or both are paid, sort by due date
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    // Generate HTML for each bill
    billsList.innerHTML = sortedBills.map((bill, index) => {
        const isPaid = hasPaidCurrentBill(bill);
        const isPastDue = isDatePast(bill.dueDate) && !isPaid;
        const isDueSoon = isDateSoon(bill.dueDate, 7) && !isPaid;
        
        let statusClass = '';
        if (isPaid) statusClass = 'paid';
        else if (isPastDue) statusClass = 'overdue';
        else if (isDueSoon) statusClass = 'due-soon';
        
        const daysUntil = daysBetween(new Date(), bill.dueDate);
        let dueText = '';
        
        if (isPaid) {
            dueText = 'Paid';
        } else if (isPastDue) {
            dueText = `Overdue by ${Math.abs(daysUntil)} days`;
        } else {
            dueText = `Due in ${daysUntil} days`;
        }
        
        // Display the per-paycheck amount as the primary amount
        return `
            <li class="${statusClass}">
                <input type="checkbox" id="bill-${index}" ${isPaid ? 'checked' : ''} 
                    onchange="markBillPaid(${bills.indexOf(sortedBills[index])}, this.checked)">
                <div class="${isPaid ? 'paid' : ''}">
                    <div><strong>${bill.name}</strong> - ${formatCurrency(bill.amountPerPaycheck, bill.currency)}</div>
                    <div>Total: ${formatCurrency(bill.totalAmount, bill.currency)}</div>
                    <div>Due: ${formatDate(bill.dueDate)} (${dueText})</div>
                </div>
            </li>
        `;
    }).join('');
}

/**
 * Check if a bill has been paid for the current period
 * @param {Object} bill - The bill to check
 * @returns {boolean} True if the bill is paid for the current period
 */
function hasPaidCurrentBill(bill) {
    if (!bill.paid || bill.paid.length === 0) return false;
    
    // Get the most recent payment
    const latestPayment = [...bill.paid].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    })[0];
    
    // Check if the payment was made after the last due date but before the next due date
    const dueDate = new Date(bill.dueDate);
    const lastDueDate = new Date(dueDate);
    lastDueDate.setMonth(lastDueDate.getMonth() - 1);
    
    const paymentDate = new Date(latestPayment.date);
    
    return paymentDate >= lastDueDate && paymentDate <= dueDate;
}

/**
 * Mark a bill as paid
 * @param {number} index - The index of the bill
 * @param {boolean} isPaid - Whether the bill is paid
 */
function markBillPaid(index, isPaid) {
    const bills = getSection('bills');
    
    if (!bills || !bills[index]) return;
    
    const bill = bills[index];
    
    if (isPaid) {
        // Add payment record
        const payment = {
            date: new Date().toISOString().split('T')[0],
            amount: bill.amountPerPaycheck,
            status: 'paid'
        };
        
        if (!bill.paid) bill.paid = [];
        bill.paid.push(payment);
    } else {
        // Remove the most recent payment if it was made today
        if (bill.paid && bill.paid.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const latestPaymentIndex = bill.paid.findIndex(p => p.date === today);
            
            if (latestPaymentIndex !== -1) {
                bill.paid.splice(latestPaymentIndex, 1);
            }
        }
    }
    
    // Update bill in data
    updateItem('bills', index, bill);
    
    // Update displays
    loadBills();
    loadBillPaymentHistory();
    updateUpcomingBills();
    
    // Show success message if paid
    if (isPaid) {
        showSuccessMessage('Bill Marked as Paid', `${bill.name} has been marked as paid.`);
    }
}

/**
 * Load bill payment history
 */
function loadBillPaymentHistory() {
    const bills = getSection('bills');
    const historyList = document.getElementById('bill-payment-history');
    
    if (!bills || bills.length === 0) {
        historyList.innerHTML = '<li class="loading">No payments recorded yet</li>';
        return;
    }
    
    // Collect all payments from all bills
    let allPayments = [];
    bills.forEach(bill => {
        if (bill.paid && bill.paid.length > 0) {
            bill.paid.forEach(payment => {
                allPayments.push({
                    billName: bill.name,
                    date: payment.date,
                    amount: payment.amount,
                    currency: bill.currency
                });
            });
        }
    });
    
    if (allPayments.length === 0) {
        historyList.innerHTML = '<li class="loading">No payments recorded yet</li>';
        return;
    }
    
    // Sort payments by date (newest first)
    allPayments.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Generate HTML for each payment
    historyList.innerHTML = allPayments.map(payment => {
        return `
            <li>
                <div><strong>${payment.billName}</strong></div>
                <div>${formatDate(payment.date)} - ${formatCurrency(payment.amount, payment.currency)}</div>
            </li>
        `;
    }).join('');
}

/**
 * Update upcoming bills on dashboard
 */
function updateUpcomingBills() {
    const bills = getSection('bills');
    const upcomingBillsList = document.getElementById('upcoming-bills');
    
    if (!bills || bills.length === 0) {
        upcomingBillsList.innerHTML = '<li class="loading">No bills added yet</li>';
        return;
    }
    
    // Sort all bills by paid status first (unpaid first), then by due date
    const sortedBills = [...bills].sort((a, b) => {
        const aIsPaid = hasPaidCurrentBill(a);
        const bIsPaid = hasPaidCurrentBill(b);
        
        // If payment status is different, sort by that first
        if (aIsPaid !== bIsPaid) {
            return aIsPaid ? 1 : -1; // Unpaid bills first
        }
        
        // If both are unpaid or both are paid, sort by due date
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    // Filter for unpaid bills
    const unpaidBills = sortedBills.filter(bill => !hasPaidCurrentBill(bill));
    
    if (unpaidBills.length === 0) {
        upcomingBillsList.innerHTML = '<li class="positive">All bills are paid! 🎉</li>';
        return;
    }
    
    // Take only the next 3 upcoming bills
    const nextBills = unpaidBills.slice(0, 3);
    
    // Generate HTML for each bill
    upcomingBillsList.innerHTML = nextBills.map((bill, index) => {
        const isPastDue = isDatePast(bill.dueDate);
        const isDueSoon = isDateSoon(bill.dueDate, 7);
        
        let statusClass = '';
        let statusIcon = '';
        
        if (isPastDue) {
            statusClass = 'overdue';
            statusIcon = '⚠️';
        } else if (isDueSoon) {
            statusClass = 'due-soon';
            statusIcon = '⏰';
        }
        
        const daysUntil = daysBetween(new Date(), bill.dueDate);
        let dueText = '';
        
        if (isPastDue) {
            dueText = `Overdue by ${Math.abs(daysUntil)} days`;
        } else {
            dueText = `Due in ${daysUntil} days`;
        }
        
        return `
            <li class="${statusClass}">
                <input type="checkbox" id="dash-bill-${index}" 
                    onchange="markBillPaidFromDashboard(${bills.indexOf(bill)}, this.checked)">
                <div>
                    <div><strong>${bill.name}</strong> - ${formatCurrency(bill.amountPerPaycheck, bill.currency)}</div>
                    <div>Due: ${formatDate(bill.dueDate)} (${dueText}) ${statusIcon}</div>
                </div>
            </li>
        `;
    }).join('');
    
    // Add "View All" link if there are more bills
    if (unpaidBills.length > 3) {
        upcomingBillsList.innerHTML += `
            <li class="view-all">
                <a href="#" onclick="navigateToBillsTab(); return false;">View all ${unpaidBills.length} unpaid bills</a>
            </li>
        `;
    }
}

/**
 * Mark a bill as paid from the dashboard
 * @param {number} billIndex - The index of the bill in the bills array
 * @param {boolean} isPaid - Whether the bill is paid
 */
function markBillPaidFromDashboard(billIndex, isPaid) {
    markBillPaid(billIndex, isPaid);
}

/**
 * Navigate to the bills tab
 */
function navigateToBillsTab() {
    // Switch to bills tab
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    document.querySelector('nav a[data-tab="bills"]').classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById('bills').classList.add('active');
}

/**
 * Reset bill payment status on new month
 * This should be called when checking for a new month
 */
function resetMonthlyBills() {
    const bills = getSection('bills');
    
    if (!bills || bills.length === 0) return;
    
    // No changes needed, as we check if the payment was made for the current period
    // This is handled by the hasPaidCurrentBill function
    
    // Update displays
    loadBills();
    updateUpcomingBills();
}
