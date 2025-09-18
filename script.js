class AutoClickApp {
    constructor() {
        this.API_BASE_URL = 'http://localhost:8080/api';
        this.clickCounter = 0;
        this.isActive = false;
        this.delayClicks = [];
        this.speedTestStartTime = null;
        this.speedTestClicks = 0;
        this.isLoading = true; // Flag to prevent auto-stop during initialization
        
        this.initializeElements();
        this.loadConfiguration();
        this.addInitialDelayClick();
        this.attachEventListeners(); // Attach after loading to prevent false triggers
        this.updateStatus('disconnected');
        
        this.isLoading = false; // Now ready for normal operation
        
        // Auto-save configuration
        this.autoSaveInterval = setInterval(() => {
            this.saveConfiguration();
        }, 5000);
    }

    initializeElements() {
        // Form elements
        this.windowTitleInput = document.getElementById('windowTitle');
        this.modeSelect = document.getElementById('mode');
        this.intervalInput = document.getElementById('interval');
        this.speedModeSelect = document.getElementById('speedMode');
        
        // Buttons
        this.startBtn = document.getElementById('startAutoClick');
        this.stopBtn = document.getElementById('stopAutoClick');
        this.addDelayClickBtn = document.getElementById('addDelayClick');
        this.resetCounterBtn = document.getElementById('resetCounter');
        this.speedTestBtn = document.getElementById('speedTest');
        this.clearLogBtn = document.getElementById('clearLog');
        
        // Display elements
        this.clickCounterDisplay = document.getElementById('clickCounter');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.delayClicksContainer = document.getElementById('delayClicksContainer');
        this.logContainer = document.getElementById('logContainer');
        this.toastContainer = document.getElementById('toastContainer');
        
        // Speed test elements
        this.testClicksInput = document.getElementById('testClicks');
        this.totalTimeDisplay = document.getElementById('totalTime');
        this.clicksPerSecondDisplay = document.getElementById('clicksPerSecond');
        this.realIntervalDisplay = document.getElementById('realInterval');
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startAutoClick());
        this.stopBtn.addEventListener('click', () => this.stopAutoClick());
        this.addDelayClickBtn.addEventListener('click', () => this.addDelayClick());
        this.resetCounterBtn.addEventListener('click', () => this.resetCounter());
        this.speedTestBtn.addEventListener('click', () => this.runSpeedTest());
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        
        // Auto-stop and save on configuration changes
        [this.windowTitleInput, this.modeSelect, this.intervalInput, this.speedModeSelect].forEach(element => {
            element.addEventListener('change', () => this.onConfigurationChange());
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    addDelayClick(delay = 0, count = 1) {
        const delayClickItem = document.createElement('div');
        delayClickItem.className = 'delay-click-item';
        delayClickItem.innerHTML = `
            <label>Delay:</label>
            <input type="number" class="delay-input" min="0" value="${delay}" placeholder="ms">
            <label>Count:</label>
            <input type="number" class="count-input" min="1" value="${count}">
            <button type="button" class="delete-btn" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        this.delayClicksContainer.appendChild(delayClickItem);
        
        // Add event listeners
        const deleteBtn = delayClickItem.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            if (this.delayClicksContainer.children.length > 1) {
                delayClickItem.remove();
                this.onConfigurationChange();
                this.showToast('DelayClick removed', 'success');
            } else {
                this.showToast('Must keep at least one DelayClick', 'warning');
            }
        });
        
        const inputs = delayClickItem.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.onConfigurationChange());
        });
        
        // Only save configuration, don't trigger stop for programmatic additions
        this.saveConfiguration();
    }

    addInitialDelayClick() {
        if (this.delayClicksContainer.children.length === 0) {
            this.addDelayClick(0, 10);
        }
    }

    getDelayClicksData() {
        const delayClicks = [];
        const items = this.delayClicksContainer.querySelectorAll('.delay-click-item');
        
        items.forEach(item => {
            const delay = parseInt(item.querySelector('.delay-input').value) || 0;
            const count = parseInt(item.querySelector('.count-input').value) || 1;
            delayClicks.push({ delay, count });
        });
        
        return delayClicks;
    }

    async startAutoClick() {
        if (!this.windowTitleInput.value.trim()) {
            this.showToast('Please enter the window title', 'error');
            return;
        }

        const autoClickData = {
            title: this.windowTitleInput.value.trim(),
            mode: this.modeSelect.value,
            interval: parseInt(this.intervalInput.value) || 100,
            speedMode: this.speedModeSelect.value,
            delayClicks: this.getDelayClicksData()
        };

        try {
            this.log('Configuring AutoClick (listeners activated)...', 'info');
            this.updateStatus('connecting');
            
            const response = await fetch(`${this.API_BASE_URL}/autoclick/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(autoClickData)
            });

            if (response.ok) {
                this.isActive = true;
                this.updateStatus('connected');
                this.startBtn.disabled = true;
                this.stopBtn.disabled = false;
                
                const mode = this.modeSelect.value;
                let statusMessage = '';
                
                if (mode === 'KEY') {
                    statusMessage = 'Press F1 to execute clicks, F3 to save coordinates';
                } else if (mode === 'MOUSE') {
                    statusMessage = 'Click with mouse to execute automatic clicks';
                } else if (mode === 'AUTO') {
                    statusMessage = 'Automatic mode started - executing clicks continuously';
                    this.startAutomaticClickSimulation();
                }
                
                this.log(`AutoClick configured: ${statusMessage}`, 'success');
                this.showToast('Listeners activated', 'success');
                
                // Only simulate clicks if AUTO mode
                if (mode === 'AUTO') {
                    this.simulateAutomaticMode();
                }
            } else {
                throw new Error(`HTTP Error: ${response.status}`);
            }
        } catch (error) {
            this.log(`Error configuring AutoClick: ${error.message}`, 'error');
            this.showToast('Error connecting to API', 'error');
            this.updateStatus('error');
        }
    }

    async stopAutoClick() {
        this.log('Manual stop requested', 'info');
        
        // Send stop configuration to API
        await this.sendStopConfiguration();
        
        // Stop local execution
        this.forceStop();
        
        this.log('AutoClick stopped - Listeners deactivated', 'warning');
        this.showToast('AutoClick stopped', 'warning');
    }

    simulateAutomaticMode() {
        if (this.clickCountingInterval) {
            clearInterval(this.clickCountingInterval);
        }
        
        const delayClicks = this.getDelayClicksData();
        let delayIndex = 0;
        
        const executeDelayClickCycle = () => {
            if (!this.isActive) return;
            
            const currentDelayClick = delayClicks[delayIndex];
            this.log(`Executing DelayClick ${delayIndex + 1}: ${currentDelayClick.count} clicks with ${currentDelayClick.delay}ms delay`, 'info');
            
            // Wait for the delay
            setTimeout(() => {
                if (!this.isActive) return;
                
                // Simulate the clicks for this DelayClick
                this.simulateDelayClickExecution(currentDelayClick.count, () => {
                    delayIndex = (delayIndex + 1) % delayClicks.length;
                    // If we return to the beginning, it's a complete cycle
                    if (delayIndex === 0) {
                        this.log('DelayClicks cycle completed, restarting...', 'info');
                    }
                    executeDelayClickCycle();
                });
            }, currentDelayClick.delay);
        };
        
        executeDelayClickCycle();
    }

    simulateDelayClickExecution(clickCount, onComplete) {
        const interval = this.getActualInterval();
        let executed = 0;
        
        const clickInterval = setInterval(() => {
            if (!this.isActive) {
                clearInterval(clickInterval);
                return;
            }
            
            this.incrementClickCounter();
            executed++;
            
            if (executed >= clickCount) {
                clearInterval(clickInterval);
                this.log(`${clickCount} clicks executed`, 'success');
                if (onComplete) onComplete();
            }
        }, interval);
    }

    simulateManualTrigger() {
        // For KEY and MOUSE modes - simulate execution of all DelayClicks once
        const delayClicks = this.getDelayClicksData();
        let totalClicks = delayClicks.reduce((sum, dc) => sum + dc.count, 0);
        
        this.log(`Executing manual sequence: ${totalClicks} total clicks`, 'info');
        
        let delayIndex = 0;
        
        const executeNextDelayClick = () => {
            if (delayIndex >= delayClicks.length) {
                this.log('Click sequence completed', 'success');
                return;
            }
            
            const currentDelayClick = delayClicks[delayIndex];
            
            setTimeout(() => {
                this.simulateDelayClickExecution(currentDelayClick.count, () => {
                    delayIndex++;
                    executeNextDelayClick();
                });
            }, currentDelayClick.delay);
        };
        
        executeNextDelayClick();
    }

    getActualInterval() {
        const interval = parseInt(this.intervalInput.value) || 100;
        const mode = this.speedModeSelect.value;
        
        let actualInterval = interval;
        if (mode === 'MC') {
            actualInterval = Math.max(1, interval / 1000); // Microseconds to ms
        } else if (mode === 'NN') {
            actualInterval = Math.max(1, interval / 1000000); // Nanoseconds to ms
        }
        
        return actualInterval;
    }

    incrementClickCounter() {
        this.clickCounter++;
        this.updateClickCounterDisplay();
    }

    updateClickCounterDisplay() {
        this.clickCounterDisplay.textContent = this.clickCounter.toLocaleString();
        
        // Animate counter
        this.clickCounterDisplay.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.clickCounterDisplay.style.transform = 'scale(1)';
        }, 150);
    }

    resetCounter() {
        this.clickCounter = 0;
        this.updateClickCounterDisplay();
        this.log('Counter reset', 'info');
        this.showToast('Counter reset', 'info');
    }

    async runSpeedTest() {
        const testClicks = parseInt(this.testClicksInput.value) || 10;
        const interval = parseInt(this.intervalInput.value) || 100;
        const mode = this.speedModeSelect.value;
        
        this.speedTestBtn.disabled = true;
        this.speedTestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        this.log(`Starting speed test: ${testClicks} clicks`, 'info');
        
        let actualInterval = interval;
        if (mode === 'MC') {
            actualInterval = Math.max(1, interval / 1000);
        } else if (mode === 'NN') {
            actualInterval = Math.max(1, interval / 1000000);
        }
        
        const startTime = performance.now();
        let clickCount = 0;
        
        const testInterval = setInterval(() => {
            clickCount++;
            this.incrementClickCounter();
            
            if (clickCount >= testClicks) {
                clearInterval(testInterval);
                const endTime = performance.now();
                const totalTime = endTime - startTime;
                const clicksPerSecond = (testClicks / (totalTime / 1000)).toFixed(2);
                const realInterval = (totalTime / testClicks).toFixed(2);
                
                this.totalTimeDisplay.textContent = `${totalTime.toFixed(2)} ms`;
                this.clicksPerSecondDisplay.textContent = clicksPerSecond;
                this.realIntervalDisplay.textContent = `${realInterval} ms`;
                
                this.speedTestBtn.disabled = false;
                this.speedTestBtn.innerHTML = '<i class="fas fa-stopwatch"></i> Test Speed';
                
                this.log(`Test completed: ${clicksPerSecond} clicks/s`, 'success');
                this.showToast('Speed test completed', 'success');
            }
        }, actualInterval);
    }

    updateStatus(status) {
        const statusDot = this.statusIndicator.querySelector('.status-dot');
        const statusText = this.statusIndicator.querySelector('.status-text');
        
        statusDot.className = 'status-dot';
        
        switch (status) {
            case 'connected':
                statusDot.classList.add('connected');
                const mode = this.modeSelect.value;
                if (mode === 'KEY') {
                    statusText.textContent = 'Ready (F1: clicks, F3: coords)';
                } else if (mode === 'MOUSE') {
                    statusText.textContent = 'Ready (Mouse click: execute)';
                } else if (mode === 'AUTO') {
                    statusText.textContent = 'Running automatic';
                } else {
                    statusText.textContent = 'Connected';
                }
                break;
            case 'connecting':
                statusText.textContent = 'Setting up listeners...';
                break;
            case 'error':
                statusText.textContent = 'Connection error';
                break;
            default:
                statusText.textContent = 'Disconnected';
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            ${message}
        `;
        
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
        
        // Limit log entries
        while (this.logContainer.children.length > 100) {
            this.logContainer.removeChild(this.logContainer.firstChild);
        }
    }

    clearLog() {
        this.logContainer.innerHTML = '';
        this.showToast('Log cleared', 'info');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: 10px;">×</button>
            </div>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    handleKeyboardShortcuts(event) {
        // Prevent shortcuts when typing in inputs
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
            return;
        }
        
        switch (event.code) {
            case 'F1':
                event.preventDefault();
                if (!this.isActive) {
                    this.startAutoClick();
                } else {
                    // If already active and KEY mode, execute clicks
                    const mode = this.modeSelect.value;
                    if (mode === 'KEY') {
                        this.log('F1 pressed - Executing click sequence', 'info');
                        this.simulateManualTrigger();
                    }
                }
                break;
            case 'F2':
                event.preventDefault();
                if (this.isActive) {
                    this.stopAutoClick();
                }
                break;
            case 'F3':
                event.preventDefault();
                this.log('F3 pressed - Mouse coordinates saved', 'success');
                this.showToast('Coordinates saved', 'info');
                break;
        }
    }

    onConfigurationChange() {
        // Don't trigger auto-stop during initialization
        if (this.isLoading) {
            this.saveConfiguration();
            return;
        }
        
        // If AutoClick is active, stop it and send empty config to API
        if (this.isActive) {
            this.log('Configuration changed - Stopping AutoClick automatically', 'warning');
            this.showToast('Configuration changed - AutoClick stopped. Press Start to apply new settings', 'warning');
            
            // Send empty configuration to stop API execution
            this.sendStopConfiguration();
            
            // Stop local execution
            this.forceStop();
            
            // Add visual indicator that restart is needed
            this.showRestartRequired();
        }
        
        // Save the new configuration
        this.saveConfiguration();
    }

    showRestartRequired() {
        this.startBtn.innerHTML = '<i class="fas fa-sync"></i> Restart Required';
        this.startBtn.classList.add('btn-restart-required');
        
        // Remove the indicator after a few seconds
        setTimeout(() => {
            this.startBtn.innerHTML = '<i class="fas fa-play"></i> Start AutoClick';
            this.startBtn.classList.remove('btn-restart-required');
        }, 3000);
    }

    async sendStopConfiguration() {
        try {
            // Send a configuration with 0 delay and 0 clicks to effectively stop execution
            const stopConfig = {
                title: this.windowTitleInput.value.trim() || "dummy",
                mode: this.modeSelect.value,
                interval: 1,
                speedMode: "MS",
                delayClicks: [{ delay: 0, count: 0 }]
            };

            await fetch(`${this.API_BASE_URL}/autoclick/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(stopConfig)
            });

            this.log('Stop configuration sent to API', 'info');
        } catch (error) {
            this.log(`Error sending stop configuration: ${error.message}`, 'error');
        }
    }

    forceStop() {
        this.isActive = false;
        this.updateStatus('disconnected');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        
        // Clear all intervals
        if (this.clickCountingInterval) {
            clearInterval(this.clickCountingInterval);
            this.clickCountingInterval = null;
        }
    }

    saveConfiguration() {
        const config = {
            windowTitle: this.windowTitleInput.value,
            mode: this.modeSelect.value,
            interval: this.intervalInput.value,
            speedMode: this.speedModeSelect.value,
            delayClicks: this.getDelayClicksData(),
            clickCounter: this.clickCounter
        };
        
        localStorage.setItem('autoClickConfig', JSON.stringify(config));
    }

    loadConfiguration() {
        const savedConfig = localStorage.getItem('autoClickConfig');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                
                this.windowTitleInput.value = config.windowTitle || '';
                this.modeSelect.value = config.mode || 'KEY';
                this.intervalInput.value = config.interval || 100;
                this.speedModeSelect.value = config.speedMode || 'MS';
                this.clickCounter = config.clickCounter || 0;
                
                this.updateClickCounterDisplay();
                
                // Clear existing delay clicks and load saved ones
                this.delayClicksContainer.innerHTML = '';
                if (config.delayClicks && config.delayClicks.length > 0) {
                    config.delayClicks.forEach(dc => {
                        this.addDelayClick(dc.delay, dc.count);
                    });
                } else {
                    this.addInitialDelayClick();
                }
                
                this.log('Configuration loaded', 'success');
            } catch (error) {
                this.log('Error loading configuration', 'error');
                this.addInitialDelayClick();
            }
        }
    }

    // Cleanup method
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        if (this.clickCountingInterval) {
            clearInterval(this.clickCountingInterval);
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.autoClickApp = new AutoClickApp();
    
    // Add some initial logs
    window.autoClickApp.log('Application initialized', 'success');
    window.autoClickApp.log('Configuration loaded from localStorage', 'info');
    window.autoClickApp.log('Ready to use - Press F1 to start (KEY mode), F2 to stop, F3 to save coordinates', 'info');
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.autoClickApp) {
        window.autoClickApp.destroy();
    }
});
