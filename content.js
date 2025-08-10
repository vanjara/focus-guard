// Content script to handle blocked page behavior
class FocusGuardContent {
    constructor() {
        this.checkIfBlocked();
    }

    async checkIfBlocked() {
        try {
            const data = await chrome.storage.sync.get(['enabled', 'websites']);
            
            if (!data.enabled || !data.websites) return;
            
            const currentDomain = window.location.hostname.replace('www.', '');
            const isBlocked = data.websites.some(website => 
                currentDomain.includes(website.url) || website.url.includes(currentDomain)
            );
            
            if (isBlocked) {
                // Check if we should block right now
                const response = await chrome.runtime.sendMessage({ action: 'checkBlockStatus' });
                if (response && response.shouldBlock) {
                    this.showBlockedPage();
                }
            }
        } catch (error) {
            // Silently handle errors
        }
    }

    showBlockedPage() {
        // Only redirect if we're not already on the blocked page
        if (!window.location.href.includes('chrome-extension://')) {
            window.location.href = chrome.runtime.getURL('blocked.html');
        }
    }
}

// Initialize content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FocusGuardContent();
    });
} else {
    new FocusGuardContent();
}