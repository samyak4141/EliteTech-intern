// options.js

const productiveInput = document.getElementById('productiveInput');
const addProductiveBtn = document.getElementById('addProductive');
const productiveListDiv = document.getElementById('productiveList');

const unproductiveInput = document.getElementById('unproductiveInput');
const addUnproductiveBtn = document.getElementById('addUnproductive');
const unproductiveListDiv = document.getElementById('unproductiveList');

let productiveSites = [];
let unproductiveSites = [];

/**
 * Renders the list of sites in the UI.
 * @param {Array<string>} sites The array of site domains.
 * @param {HTMLElement} listElement The DOM element to render the list into.
 * @param {string} type 'productive' or 'unproductive'.
 */
function renderSiteList(sites, listElement, type) {
    listElement.innerHTML = ''; // Clear existing list
    if (sites.length === 0) {
        listElement.innerHTML = `<p class="text-gray-500 italic p-2">No ${type} sites added yet.</p>`;
        return;
    }
    sites.forEach(site => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-2 border-b border-gray-200 last:border-b-0';
        item.innerHTML = `
            <span class="text-gray-800 font-medium">${site}</span>
            <button class="remove-btn text-gray-500 hover:text-gray-700 transition duration-150" data-site="${site}" data-type="${type}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;
        listElement.appendChild(item);
    });

    // Add event listeners for remove buttons
    listElement.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', handleRemoveSite);
    });
}

/**
 * Loads site classifications from Chrome storage and updates the UI.
 */
async function loadSiteClassifications() {
    const result = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "getSiteClassifications" }, resolve);
    });
    productiveSites = result.productive || [];
    unproductiveSites = result.unproductive || [];

    renderSiteList(productiveSites, productiveListDiv, 'productive');
    renderSiteList(unproductiveSites, unproductiveListDiv, 'unproductive');
}

/**
 * Saves site classifications to Chrome storage.
 */
async function saveSiteClassifications() {
    await new Promise(resolve => {
        chrome.runtime.sendMessage({
            action: "updateSiteClassifications",
            productive: productiveSites,
            unproductive: unproductiveSites
        }, resolve);
    });
    console.log('Site classifications saved.');
}

/**
 * Handles adding a new site to a list.
 * @param {HTMLInputElement} inputElement The input field.
 * @param {Array<string>} siteList The array to add the site to.
 * @param {HTMLElement} listElement The DOM element for the list.
 * @param {string} type 'productive' or 'unproductive'.
 */
function handleAddSite(inputElement, siteList, listElement, type) {
    const domain = inputElement.value.trim().toLowerCase();
    if (domain && !siteList.includes(domain)) {
        siteList.push(domain);
        inputElement.value = ''; // Clear input
        renderSiteList(siteList, listElement, type);
        saveSiteClassifications();
    }
}

/**
 * Handles removing a site from a list.
 * @param {Event} event The click event.
 */
function handleRemoveSite(event) {
    const button = event.currentTarget;
    const siteToRemove = button.dataset.site;
    const type = button.dataset.type;

    if (type === 'productive') {
        productiveSites = productiveSites.filter(site => site !== siteToRemove);
        renderSiteList(productiveSites, productiveListDiv, 'productive');
    } else if (type === 'unproductive') {
        unproductiveSites = unproductiveSites.filter(site => site !== siteToRemove);
        renderSiteList(unproductiveSites, unproductiveListDiv, 'unproductive');
    }
    saveSiteClassifications();
}

// Event listeners
addProductiveBtn.addEventListener('click', () => handleAddSite(productiveInput, productiveSites, productiveListDiv, 'productive'));
productiveInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddSite(productiveInput, productiveSites, productiveListDiv, 'productive');
});

addUnproductiveBtn.addEventListener('click', () => handleAddSite(unproductiveInput, unproductiveSites, unproductiveListDiv, 'unproductive'));
unproductiveInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddSite(unproductiveInput, unproductiveSites, unproductiveListDiv, 'unproductive');
});

// Load classifications when the options page is opened
document.addEventListener('DOMContentLoaded', loadSiteClassifications);
