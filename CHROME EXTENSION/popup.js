// popup.js

// Helper function to format milliseconds into a human-readable string
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0 || parts.length === 0) parts.push(`${seconds % 60}s`); // Always show seconds if no other unit
    return parts.join(' ');
}

// Gets the current date in YYYY-MM-DD format. (Duplicated from background.js for popup's independence)
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Updates the popup UI with tracking data.
 */
async function updatePopupUI() {
    const today = getTodayDate();

    // Request tracking data from background script
    const trackingData = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "getTrackingData" }, resolve);
    });

    // Request site classifications from background script
    const classifications = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "getSiteClassifications" }, resolve);
    });

    const productiveSites = new Set(classifications.productive || []);
    const unproductiveSites = new Set(classifications.unproductive || []);

    const todayData = trackingData[today] || {};

    let totalProductiveTime = 0;
    let totalUnproductiveTime = 0;
    let totalNeutralTime = 0;
    let totalTrackedTime = 0;

    const analyticsDetailsDiv = document.getElementById('analytics-details');
    analyticsDetailsDiv.innerHTML = ''; // Clear previous content

    const sortedDomains = Object.keys(todayData).sort((a, b) => todayData[b] - todayData[a]);

    if (sortedDomains.length === 0) {
        analyticsDetailsDiv.innerHTML = '<p class="text-gray-600 italic">No tracking data for today yet.</p>';
    } else {
        const ul = document.createElement('ul');
        ul.className = 'space-y-1 text-sm';
        sortedDomains.forEach(domain => {
            const duration = todayData[domain];
            totalTrackedTime += duration;

            let category = 'Neutral';
            let textColor = 'text-gray-700';
            let bgColor = 'bg-gray-100';

            if (productiveSites.has(domain)) {
                totalProductiveTime += duration;
                category = 'Productive';
                textColor = 'text-green-700';
                bgColor = 'bg-green-50';
            } else if (unproductiveSites.has(domain)) {
                totalUnproductiveTime += duration;
                category = 'Unproductive';
                textColor = 'text-red-700';
                bgColor = 'bg-red-50';
            } else {
                totalNeutralTime += duration;
            }

            const li = document.createElement('li');
            li.className = `flex justify-between items-center p-2 rounded-md ${bgColor}`;
            li.innerHTML = `
                <span class="font-medium ${textColor}">${domain}</span>
                <span class="text-xs text-gray-500">${category}</span>
                <span class="font-semibold text-gray-800">${formatDuration(duration)}</span>
            `;
            ul.appendChild(li);
        });
        analyticsDetailsDiv.appendChild(ul);
    }

    // Update summary times
    document.getElementById('productiveTime').textContent = formatDuration(totalProductiveTime);
    document.getElementById('unproductiveTime').textContent = formatDuration(totalUnproductiveTime);
    document.getElementById('neutralTime').textContent = formatDuration(totalNeutralTime);
    document.getElementById('totalTrackedTime').textContent = formatDuration(totalTrackedTime);

    // Update current active site info
    const currentActiveSiteInfo = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "getCurrentActiveSite" }, resolve);
    });

    if (currentActiveSiteInfo && currentActiveSiteInfo.domain) {
        document.getElementById('currentSite').textContent = currentActiveSiteInfo.domain;
        const timeOnCurrentSiteToday = todayData[currentActiveSiteInfo.domain] || 0;
        document.getElementById('timeToday').textContent = formatDuration(timeOnCurrentSiteToday);
    } else {
        document.getElementById('currentSite').textContent = 'Not tracking (e.g., new tab, extension page)';
        document.getElementById('timeToday').textContent = 'N/A';
    }
}

// Initial UI update when popup is opened
document.addEventListener('DOMContentLoaded', updatePopupUI);

// Set up interval to refresh UI (e.g., every 5 seconds)
setInterval(updatePopupUI, 5000);

// Open Options Page
document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// Toggle detailed analytics visibility
const toggleAnalyticsBtn = document.getElementById('toggleAnalytics');
const analyticsDetailsDiv = document.getElementById('analytics-details');
const analyticsToggleIcon = document.getElementById('analyticsToggleIcon');

toggleAnalyticsBtn.addEventListener('click', () => {
    const isHidden = analyticsDetailsDiv.classList.contains('hidden');
    if (isHidden) {
        analyticsDetailsDiv.classList.remove('hidden');
        analyticsToggleIcon.classList.add('rotate-180');
    } else {
        analyticsDetailsDiv.classList.add('hidden');
        analyticsToggleIcon.classList.remove('rotate-180');
    }
});
