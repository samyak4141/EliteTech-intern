// background.js

let currentActiveTab = null;
let trackingStartTime = null; // Timestamp when tracking started for the current active tab/URL

// Data structure for storing tracking information in chrome.storage.local
// Example:
// {
//   "trackingData": {
//     "2023-10-27": { // Date in YYYY-MM-DD format
//       "google.com": 3600000, // milliseconds spent on this domain
//       "facebook.com": 1800000
//     },
//     "2023-10-28": { ... }
//   },
//   "productiveSites": ["github.com", "stackoverflow.com"],
//   "unproductiveSites": ["facebook.com", "twitter.com"],
//   "lastActiveUrl": "https://example.com/page", // Full URL of the last active tab
//   "lastActiveDomain": "example.com", // Domain of the last active tab
//   "lastActivityTimestamp": 1678886400000 // Timestamp of last activity (for idle detection)
// }

// Initialize default settings if they don't exist
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['productiveSites', 'unproductiveSites'], (result) => {
        if (!result.productiveSites) {
            chrome.storage.local.set({ productiveSites: ['github.com', 'stackoverflow.com', 'leetcode.com', 'developer.chrome.com'] });
        }
        if (!result.unproductiveSites) {
            chrome.storage.local.set({ unproductiveSites: ['facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'tiktok.com'] });
        }
    });
});

/**
 * Extracts the main domain from a URL.
 * @param {string} url The full URL.
 * @returns {string|null} The domain (e.g., "google.com") or null if invalid.
 */
function getDomainFromUrl(url) {
    try {
        const urlObj = new URL(url);
        // Remove 'www.' prefix for consistency
        return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
        return null; // Invalid URL
    }
}

/**
 * Gets the current date in YYYY-MM-DD format.
 * @returns {string} Current date string.
 */
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Saves the time spent on the previous active URL.
 */
async function saveTime() {
    if (!currentActiveTab || !trackingStartTime) {
        return; // No active tab or tracking not started
    }

    const { url, domain } = currentActiveTab;
    const duration = Date.now() - trackingStartTime; // Duration in milliseconds

    if (duration <= 0 || !domain) {
        return; // Invalid duration or domain
    }

    const today = getTodayDate();

    // Retrieve existing tracking data
    const result = await chrome.storage.local.get('trackingData');
    const trackingData = result.trackingData || {};

    // Ensure the date entry exists
    if (!trackingData[today]) {
        trackingData[today] = {};
    }

    // Add duration to the domain
    trackingData[today][domain] = (trackingData[today][domain] || 0) + duration;

    // Save updated tracking data
    await chrome.storage.local.set({ trackingData: trackingData });

    // Update last active info
    await chrome.storage.local.set({
        lastActiveUrl: url,
        lastActiveDomain: domain,
        lastActivityTimestamp: Date.now()
    });

    console.log(`Saved ${duration / 1000}s for ${domain} on ${today}`);
}

/**
 * Starts tracking for a new active tab/URL.
 * @param {string} url The URL of the newly active tab.
 */
async function startTracking(url) {
    // First, save time for the previously active tab/URL
    await saveTime();

    const domain = getDomainFromUrl(url);
    if (!domain) {
        // If the URL is invalid (e.g., chrome://newtab), don't track
        currentActiveTab = null;
        trackingStartTime = null;
        return;
    }

    currentActiveTab = { url, domain };
    trackingStartTime = Date.now();
    console.log(`Started tracking for: ${domain}`);
}

// --- Event Listeners for Tab Activity ---

// Fired when the active tab in a window changes.
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log('Tab activated:', activeInfo.tabId);
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab && tab.url) {
            startTracking(tab.url);
        }
    } catch (error) {
        console.error("Error getting tab info on activation:", error);
    }
});

// Fired when a tab is updated (e.g., URL changes within the same tab).
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only track if the URL has actually changed and the tab is active
    if (changeInfo.url && tab.active) {
        console.log('Tab updated (URL changed):', tab.url);
        startTracking(tab.url);
    }
});

// Fired when a window gains or loses focus.
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Browser lost focus (e.g., user switched to another application)
        console.log('Browser lost focus. Pausing tracking.');
        await saveTime(); // Save time for the currently active tab before pausing
        currentActiveTab = null; // Clear active tab to pause tracking
        trackingStartTime = null;
    } else {
        // Browser gained focus
        console.log('Browser gained focus. Resuming tracking.');
        try {
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            if (tab && tab.url) {
                startTracking(tab.url);
            }
        } catch (error) {
            console.error("Error getting tab info on window focus change:", error);
        }
    }
});

// --- Alarm for Periodic Saving ---
// This ensures data is saved regularly, even if browser isn't closed cleanly.
chrome.alarms.create('saveTrackingData', { periodInMinutes: 1 }); // Save every 1 minute

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'saveTrackingData') {
        console.log('Alarm triggered: Saving tracking data...');
        await saveTime();
    }
});

// --- Initial setup on extension startup ---
// When the service worker starts (e.g., browser launched, extension reloaded)
chrome.runtime.onStartup.addListener(async () => {
    console.log('Extension started up. Initializing tracking.');
    try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab && tab.url) {
            startTracking(tab.url);
        }
    } catch (error) {
        console.error("Error initializing tracking on startup:", error);
    }
});

// Listener for messages from popup.js or options.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getTrackingData") {
        chrome.storage.local.get('trackingData', (result) => {
            sendResponse(result.trackingData || {});
        });
        return true; // Indicates that sendResponse will be called asynchronously
    } else if (request.action === "getSiteClassifications") {
        chrome.storage.local.get(['productiveSites', 'unproductiveSites'], (result) => {
            sendResponse({
                productive: result.productiveSites || [],
                unproductive: result.unproductiveSites || []
            });
        });
        return true;
    } else if (request.action === "updateSiteClassifications") {
        chrome.storage.local.set({
            productiveSites: request.productive,
            unproductiveSites: request.unproductive
        }, () => {
            sendResponse({ success: true });
        });
        return true;
    } else if (request.action === "getCurrentActiveSite") {
        sendResponse({
            url: currentActiveTab ? currentActiveTab.url : null,
            domain: currentActiveTab ? currentActiveTab.domain : null,
            trackingStartTime: trackingStartTime
        });
    }
});
