class FocusGuardPopup {
    constructor() {
        this.initializeElements();
        this.initializeEventListeners();
        this.loadData();
        this.updateStatus();
        
        // Update status every second
        setInterval(() => this.updateStatus(), 1000);
    }

    initializeElements() {
        this.globalToggle = document.getElementById('globalToggle');
        this.toggleLabel = document.getElementById('toggleLabel');
        this.statusCard = document.getElementById('statusCard');
        this.statusIcon = document.getElementById('statusIcon');
        this.statusText = document.getElementById('statusText');
        this.statusDetail = document.getElementById('statusDetail');
        
        this.addWebsiteBtn = document.getElementById('addWebsiteBtn');
        this.addWebsiteForm = document.getElementById('addWebsiteForm');
        this.websiteInput = document.getElementById('websiteInput');
        this.saveWebsiteBtn = document.getElementById('saveWebsiteBtn');
        this.cancelWebsiteBtn = document.getElementById('cancelWebsiteBtn');
        this.websitesList = document.getElementById('websitesList');
        this.emptyState = document.getElementById('emptyState');
        
        this.addScheduleBtn = document.getElementById('addScheduleBtn');
        this.addScheduleForm = document.getElementById('addScheduleForm');
        this.scheduleStartTime = document.getElementById('scheduleStartTime');
        this.scheduleEndTime = document.getElementById('scheduleEndTime');
        this.saveScheduleBtn = document.getElementById('saveScheduleBtn');
        this.cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
        this.schedulesList = document.getElementById('schedulesList');
        this.schedulesEmptyState = document.getElementById('schedulesEmptyState');
        
        this.quickButtons = document.querySelectorAll('.quick-btn');
    }

    initializeEventListeners() {
        // Global toggle
        this.globalToggle.addEventListener('change', (e) => {
            this.toggleBlocking(e.target.checked);
        });

        // Website management
        this.addWebsiteBtn.addEventListener('click', () => this.showAddWebsiteForm());
        this.saveWebsiteBtn.addEventListener('click', () => this.saveWebsite());
        this.cancelWebsiteBtn.addEventListener('click', () => this.hideAddWebsiteForm());
        this.websiteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveWebsite();
        });

        // Schedule management
        this.addScheduleBtn.addEventListener('click', () => this.showAddScheduleForm());
        this.saveScheduleBtn.addEventListener('click', () => this.saveSchedule());
        this.cancelScheduleBtn.addEventListener('click', () => this.hideAddScheduleForm());

        // Quick block buttons
        this.quickButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const duration = parseInt(e.target.dataset.duration);
                this.startQuickBlock(duration);
            });
        });
    }

    async loadData() {
        try {
            const data = await chrome.storage.sync.get(['enabled', 'websites', 'schedules', 'quickBlockEnd']);
            
            this.globalToggle.checked = data.enabled || false;
            this.toggleLabel.textContent = data.enabled ? 'Enabled' : 'Disabled';
            
            this.websites = data.websites || [];
            this.schedules = data.schedules || [];
            this.quickBlockEnd = data.quickBlockEnd || null;
            
            this.renderWebsites();
            this.renderSchedules();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async saveData() {
        try {
            await chrome.storage.sync.set({
                enabled: this.globalToggle.checked,
                websites: this.websites,
                schedules: this.schedules,
                quickBlockEnd: this.quickBlockEnd
            });
            
            // Notify background script of changes
            chrome.runtime.sendMessage({ action: 'updateRules' });
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    async toggleBlocking(enabled) {
        this.toggleLabel.textContent = enabled ? 'Enabled' : 'Disabled';
        await this.saveData();
    }

    updateStatus() {
        const now = new Date();
        const isEnabled = this.globalToggle.checked;
        let isBlocking = false;
        let statusText = 'Blocking Disabled';
        let statusDetail = 'Enable blocking to start';
        let statusIcon = '⏸️';

        if (isEnabled) {
            // Check if no websites are configured
            if (!this.websites || this.websites.length === 0) {
                statusText = 'Ready to Block';
                statusDetail = 'Add websites below to start blocking';
                statusIcon = '📝';
                this.statusCard.className = 'status-card ready';
                this.statusIcon.textContent = statusIcon;
                this.statusText.textContent = statusText;
                this.statusDetail.textContent = statusDetail;
                return;
            }
            // Check quick block
            else if (this.quickBlockEnd && now < new Date(this.quickBlockEnd)) {
                isBlocking = true;
                const remaining = new Date(this.quickBlockEnd) - now;
                const minutes = Math.ceil(remaining / (1000 * 60));
                statusText = 'Quick Block Active';
                statusDetail = `${minutes} minutes remaining`;
                statusIcon = '🚫';
            }
            // Check scheduled blocks
            else {
                const currentDay = now.getDay();
                const currentTime = now.getHours() * 60 + now.getMinutes();

                for (const schedule of this.schedules) {
                    if (schedule.days.includes(currentDay)) {
                        const [startHour, startMin] = schedule.startTime.split(':').map(Number);
                        const [endHour, endMin] = schedule.endTime.split(':').map(Number);
                        const startTime = startHour * 60 + startMin;
                        const endTime = endHour * 60 + endMin;

                        if (currentTime >= startTime && currentTime < endTime) {
                            isBlocking = true;
                            const remainingMinutes = endTime - currentTime;
                            const hours = Math.floor(remainingMinutes / 60);
                            const minutes = remainingMinutes % 60;
                            
                            statusText = 'Scheduled Block Active';
                            statusDetail = hours > 0 
                                ? `${hours}h ${minutes}m remaining`
                                : `${minutes}m remaining`;
                            statusIcon = '📅';
                            break;
                        }
                    }
                }

                if (!isBlocking) {
                    if (this.websites && this.websites.length > 0) {
                        statusText = 'Monitoring';
                        statusDetail = `${this.websites.length} website${this.websites.length !== 1 ? 's' : ''} being watched`;
                        statusIcon = '👁️';
                    }
                }
            }
        }

        this.statusCard.className = `status-card ${isBlocking ? 'active' : ''}`;
        this.statusIcon.textContent = statusIcon;
        this.statusText.textContent = statusText;
        this.statusDetail.textContent = statusDetail;
    }

    showAddWebsiteForm() {
        this.addWebsiteForm.style.display = 'block';
        this.websiteInput.focus();
    }

    hideAddWebsiteForm() {
        this.addWebsiteForm.style.display = 'none';
        this.websiteInput.value = '';
    }

    async saveWebsite() {
        const url = this.websiteInput.value.trim();
        if (!url) return;

        // Clean and validate URL
        const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        
        if (this.websites.some(w => w.url === cleanUrl)) {
            alert('Website already exists!');
            return;
        }

        this.websites.push({
            id: Date.now(),
            url: cleanUrl,
            name: cleanUrl
        });

        await this.saveData();
        this.renderWebsites();
        this.hideAddWebsiteForm();
    }

    async deleteWebsite(id) {
        this.websites = this.websites.filter(w => w.id !== id);
        await this.saveData();
        this.renderWebsites();
    }

    renderWebsites() {
        if (this.websites.length === 0) {
            this.emptyState.style.display = 'block';
            this.websitesList.innerHTML = '';
            return;
        }

        this.emptyState.style.display = 'none';
        this.websitesList.innerHTML = '';
        
        this.websites.forEach(website => {
            const websiteItem = document.createElement('div');
            websiteItem.className = 'website-item';
            websiteItem.innerHTML = `
                <div>
                    <div class="website-name">${website.name}</div>
                    <div class="website-url">${website.url}</div>
                </div>
                <button class="delete-btn">Delete</button>
            `;
            
            const deleteBtn = websiteItem.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => this.deleteWebsite(website.id));
            
            this.websitesList.appendChild(websiteItem);
        });
    }

    showAddScheduleForm() {
        this.addScheduleForm.style.display = 'block';
    }

    hideAddScheduleForm() {
        this.addScheduleForm.style.display = 'none';
        this.scheduleStartTime.value = '';
        this.scheduleEndTime.value = '';
        this.addScheduleForm.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    }

    async saveSchedule() {
        const startTime = this.scheduleStartTime.value;
        const endTime = this.scheduleEndTime.value;
        const days = Array.from(this.addScheduleForm.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.value));

        if (!startTime || !endTime || days.length === 0) {
            alert('Please fill all fields!');
            return;
        }

        this.schedules.push({
            id: Date.now(),
            startTime,
            endTime,
            days
        });

        await this.saveData();
        this.renderSchedules();
        this.hideAddScheduleForm();
    }

    async deleteSchedule(id) {
        this.schedules = this.schedules.filter(s => s.id !== id);
        await this.saveData();
        this.renderSchedules();
    }

    renderSchedules() {
        if (this.schedules.length === 0) {
            this.schedulesEmptyState.style.display = 'block';
            this.schedulesList.innerHTML = '';
            return;
        }

        this.schedulesEmptyState.style.display = 'none';
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        this.schedulesList.innerHTML = '';
        
        this.schedules.forEach(schedule => {
            const daysText = schedule.days.map(d => dayNames[d]).join(', ');
            const scheduleItem = document.createElement('div');
            scheduleItem.className = 'schedule-item';
            scheduleItem.innerHTML = `
                <div>
                    <div class="schedule-info">${schedule.startTime} - ${schedule.endTime}</div>
                    <div class="schedule-days">${daysText}</div>
                </div>
                <button class="delete-btn">Delete</button>
            `;
            
            const deleteBtn = scheduleItem.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => this.deleteSchedule(schedule.id));
            
            this.schedulesList.appendChild(scheduleItem);
        });
    }

    async startQuickBlock(minutes) {
        // Check if no websites are configured
        if (!this.websites || this.websites.length === 0) {
            alert('Please add websites to block first!');
            return;
        }
        
        const endTime = new Date(Date.now() + minutes * 60 * 1000);
        this.quickBlockEnd = endTime.toISOString();
        
        // Enable blocking if not already enabled
        if (!this.globalToggle.checked) {
            this.globalToggle.checked = true;
            this.toggleLabel.textContent = 'Enabled';
        }
        
        await this.saveData();
        this.updateStatus();
    }
}

// Initialize the popup when DOM is loaded
let focusGuard;
document.addEventListener('DOMContentLoaded', () => {
    focusGuard = new FocusGuardPopup();
});