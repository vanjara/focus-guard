const quotes = [
    "The key is not to prioritize what's on your schedule, but to schedule your priorities. - Stephen Covey",
    "Focus is a matter of deciding what things you're not going to do. - John Carmack",
    "Where focus goes, energy flows and results show. - T. Harv Eker",
    "The successful warrior is the average person with laser-like focus. - Bruce Lee",
    "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus. - Alexander Graham Bell",
    "Your future is created by what you do today, not tomorrow. - Robert Kiyosaki"
];

function updateBlockedInfo() {
    // Get the URL that was blocked from the referrer or current tab
    let blockedUrl = document.referrer || 'Unknown website';
    
    // Clean up the URL for display
    if (blockedUrl && blockedUrl !== 'Unknown website') {
        try {
            const url = new URL(blockedUrl);
            blockedUrl = url.hostname.replace('www.', '');
        } catch (e) {
            blockedUrl = 'Blocked website';
        }
    } else {
        blockedUrl = 'Blocked website';
    }
    
    document.getElementById('blockedUrl').textContent = blockedUrl;
    document.getElementById('quote').textContent = quotes[Math.floor(Math.random() * quotes.length)];
    
    // Update time info
    updateTimeInfo();
    setInterval(updateTimeInfo, 1000);
}

async function updateTimeInfo() {
    try {
        // Check if chrome.storage is available (extension context)
        if (typeof chrome !== 'undefined' && chrome.storage) {
            const data = await chrome.storage.sync.get(['quickBlockEnd', 'schedules']);
            await updateTimeInfoWithData(data);
        } else {
            // Fallback for when chrome APIs aren't available
            document.getElementById('blockedTime').textContent = 'Block is currently active';
        }
    } catch (error) {
        document.getElementById('blockedTime').textContent = 'Block is currently active';
    }
}

async function updateTimeInfoWithData(data) {
    try {
        const now = new Date();
        let timeInfo = 'Blocked by schedule';
        
        if (data.quickBlockEnd && now < new Date(data.quickBlockEnd)) {
            const remaining = new Date(data.quickBlockEnd) - now;
            const minutes = Math.ceil(remaining / (1000 * 60));
            timeInfo = `Quick block active for ${minutes} more minute${minutes !== 1 ? 's' : ''}`;
        } else if (data.schedules) {
            const currentDay = now.getDay();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            for (const schedule of data.schedules) {
                if (schedule.days.includes(currentDay)) {
                    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
                    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
                    const startTime = startHour * 60 + startMin;
                    const endTime = endHour * 60 + endMin;

                    if (currentTime >= startTime && currentTime < endTime) {
                        const remainingMinutes = endTime - currentTime;
                        const hours = Math.floor(remainingMinutes / 60);
                        const minutes = remainingMinutes % 60;
                        
                        timeInfo = hours > 0 
                            ? `Scheduled block ends in ${hours}h ${minutes}m`
                            : `Scheduled block ends in ${minutes}m`;
                        break;
                    }
                }
            }
        }
        
        document.getElementById('blockedTime').textContent = timeInfo;
    } catch (error) {
        document.getElementById('blockedTime').textContent = 'Block is currently active';
    }
}

function openSettings() {
    // Send message to background script to open extension popup
    try {
        chrome.runtime.sendMessage({ action: 'openExtensionPage' });
    } catch (error) {
        // Fallback: redirect to extensions page
        window.location.href = 'chrome://extensions/';
    }
}

function goBack() {
    // Navigate to new tab page
    try {
        chrome.runtime.sendMessage({ action: 'goToNewTab' });
    } catch (error) {
        // Fallback: go to new tab page
        window.location.href = 'chrome://newtab/';
    }
}

function newTab() {
    // Send message to background script to create new tab
    try {
        chrome.runtime.sendMessage({ action: 'createNewTab' });
    } catch (error) {
        // Fallback: try to open new tab
        window.location.href = 'chrome://newtab/';
    }
}

// Add event listeners after DOM is loaded
function initializeButtons() {
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('goBackBtn').addEventListener('click', goBack);
    document.getElementById('newTabBtn').addEventListener('click', newTab);
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    updateBlockedInfo();
    initializeButtons();
});