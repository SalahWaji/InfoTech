/**
 * Storage Module for Payday Manager
 * Handles data persistence using LocalStorage
 */

const STORAGE_KEY = 'payday_manager_data';

// Default data structure
const defaultData = {
    user: {
        payday: {
            frequency: 'biweekly',
            nextDate: null
        },
        savings: {
            amountPerPaycheck: 100,
            currency: 'CAD'
        }
    },
    paydays: [],
    charity: {
        baseAmount: 100,
        incrementAmount: 100,
        currentAmount: 100,
        recurringDonations: [
            { 
                amount: 50, 
                currency: 'USD', 
                description: 'Monthly Donation',
                schedule: 'second-paycheck' 
            }
        ],
        deductions: []
    },
    bills: [],
    debts: [],
    savings: {
        balance: 0,
        history: []
    }
};

/**
 * Initialize data in LocalStorage if it doesn't exist
 */
function initializeData() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        // Set next payday to April 4, 2025
        const initialData = { ...defaultData };
        initialData.user.payday.nextDate = '2025-04-04';
        
        saveData(initialData);
        return initialData;
    }
    return loadData();
}

/**
 * Save data to LocalStorage
 * @param {Object} data - The data to save
 */
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Load data from LocalStorage
 * @returns {Object} The loaded data
 */
function loadData() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data || initializeData();
}

/**
 * Get a specific section of data
 * @param {string} section - The section to get (e.g., 'charity', 'bills')
 * @returns {Object} The requested section
 */
function getSection(section) {
    const data = loadData();
    return data[section] || {};
}

/**
 * Update a specific section of data
 * @param {string} section - The section to update
 * @param {Object} newData - The new data for the section
 */
function updateSection(section, newData) {
    const data = loadData();
    data[section] = newData;
    saveData(data);
}

/**
 * Add an item to an array in a specific section
 * @param {string} section - The section containing the array
 * @param {Object} item - The item to add
 */
function addItem(section, item) {
    const data = loadData();
    if (!Array.isArray(data[section])) {
        data[section] = [];
    }
    data[section].push(item);
    saveData(data);
}

/**
 * Update an item in an array in a specific section
 * @param {string} section - The section containing the array
 * @param {number} index - The index of the item to update
 * @param {Object} updatedItem - The updated item
 */
function updateItem(section, index, updatedItem) {
    const data = loadData();
    if (Array.isArray(data[section]) && index >= 0 && index < data[section].length) {
        data[section][index] = updatedItem;
        saveData(data);
    }
}

/**
 * Remove an item from an array in a specific section
 * @param {string} section - The section containing the array
 * @param {number} index - The index of the item to remove
 */
function removeItem(section, index) {
    const data = loadData();
    if (Array.isArray(data[section]) && index >= 0 && index < data[section].length) {
        data[section].splice(index, 1);
        saveData(data);
    }
}

/**
 * Get user settings
 * @returns {Object} The user settings
 */
function getUserSettings() {
    const data = loadData();
    return data.user || defaultData.user;
}

/**
 * Update user settings
 * @param {Object} settings - The new settings
 */
function updateUserSettings(settings) {
    const data = loadData();
    data.user = { ...data.user, ...settings };
    saveData(data);
}

/**
 * Clear all data (for testing or reset)
 */
function clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    initializeData();
}
