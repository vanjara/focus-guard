class FocusGuardBackground {
    constructor() {
        this.initializeListeners();
        this.updateRules();
    }

    initializeListeners() {
        // Handle installation
        chrome.runtime.onInstalled.addListener(() => {
            this.initializeStorage();
        });

        // Handle messages from popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateRules') {
                this.updateRules();
            } else if (message.action === 'openExtensionPage') {
                // Open the extensions page
                chrome.tabs.create({ url: 'chrome://extensions/' });
            } else if (message.action === 'goToNewTab') {
                // Navigate current tab to new tab page
                chrome.tabs.update(sender.tab.id, { url: 'chrome://newtab/' });
            } else if (message.action === 'createNewTab') {
                // Create a new tab
                chrome.tabs.create({ url: 'chrome://newtab/' });
            } else if (message.action === 'checkBlockStatus') {
                // Handle block status check from content script
                this.checkBlockStatus().then(shouldBlock => {
                    sendResponse({ shouldBlock });
                });
                return true; // Keep message channel open for async response
            }
        });

        // Handle alarms for scheduled blocks
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'updateRules') {
                this.updateRules();
            }
        });

        // Set up periodic rule updates
        chrome.alarms.create('updateRules', { periodInMinutes: 1 });
    }

    async initializeStorage() {
        const data = await chrome.storage.sync.get(['enabled', 'websites', 'schedules']);
        
        if (!data.enabled) {
            await chrome.storage.sync.set({
                enabled: false,
                websites: [],
                schedules: [],
                quickBlockEnd: null
            });
        }
    }

    async updateRules() {
        try {
            const data = await chrome.storage.sync.get(['enabled', 'websites', 'schedules', 'quickBlockEnd']);
            
            if (!data.enabled) {
                // Remove all blocking rules
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: await this.getAllRuleIds()
                });
                return;
            }

            // If no websites are configured, don't block anything
            if (!data.websites || data.websites.length === 0) {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: await this.getAllRuleIds()
                });
                return;
            }

            const shouldBlock = await this.shouldBlockNow(data);
            
            if (shouldBlock) {
                // Create blocking rules
                const rules = data.websites.map((website, index) => ({
                    id: index + 1,
                    priority: 1,
                    action: {
                        type: 'redirect',
                        redirect: {
                            extensionPath: '/blocked.html'
                        }
                    },
                    condition: {
                        urlFilter: `*://*.${website.url}/*`,
                        resourceTypes: ['main_frame']
                    }
                }));

                // Update rules
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: await this.getAllRuleIds(),
                    addRules: rules
                });
            } else {
                // Remove all blocking rules
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: await this.getAllRuleIds()
                });
            }
        } catch (error) {
            console.error('Error updating rules:', error);
        }
    }

    async shouldBlockNow(data) {
        const now = new Date();
        
        // Check quick block
        if (data.quickBlockEnd && now < new Date(data.quickBlockEnd)) {
            return true;
        }

        // Check scheduled blocks
        if (data.schedules && data.schedules.length > 0) {
            const currentDay = now.getDay();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            for (const schedule of data.schedules) {
                if (schedule.days.includes(currentDay)) {
                    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
                    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
                    const startTime = startHour * 60 + startMin;
                    const endTime = endHour * 60 + endMin;

                    if (currentTime >= startTime && currentTime < endTime) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    async checkBlockStatus() {
        try {
            const data = await chrome.storage.sync.get(['enabled', 'websites', 'schedules', 'quickBlockEnd']);
            
            if (!data.enabled || !data.websites || data.websites.length === 0) {
                return false;
            }

            return await this.shouldBlockNow(data);
        } catch (error) {
            return false;
        }
    }

    async getAllRuleIds() {
        const rules = await chrome.declarativeNetRequest.getDynamicRules();
        return rules.map(rule => rule.id);
    }
}

// Initialize background script
new FocusGuardBackground();