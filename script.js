class AutoClickApp {
    constructor() {
        this.API_BASE_URL = 'http://localhost:8080/api';
        this.clickCounter = 0;
        this.isActive = false;
        this.delayClicks = [];

        // CPS tracking variables
        this.cpsStartTime = null;
        this.cpsInterval = null;
        this.currentCps = 0;
        this.lastClickTime = null;
        this.inactivityTimeout = null;
        this.INACTIVITY_LIMIT = 5000; // 5 segundos en milisegundos

        this.isLoading = true; // Flag to prevent auto-stop during initialization
        
        this.initializeElements();
        this.loadConfiguration();
        this.addInitialDelayClick();
        this.attachEventListeners(); // Attach after loading to prevent false triggers
        this.updateStatus('disconnected');
        this.detectActiveWindow(); // Auto-detect current window on startup
        this.setInitialButtonStates(); // Set correct initial button states
        
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
        this.directClickBtn = document.getElementById('directClickBtn');
        this.detectWindowBtn = document.getElementById('detectWindow');
        
        // Display elements
        this.clickCounterDisplay = document.getElementById('clickCounter');
        this.cpsCounterDisplay = document.getElementById('cpsCounter');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.delayClicksContainer = document.getElementById('delayClicksContainer');
        this.toastContainer = document.getElementById('toastContainer');
        
        // Debug: Check if critical elements exist
        console.log('Direct Click Button:', this.directClickBtn);
        console.log('Click Counter Display:', this.clickCounterDisplay);
        console.log('CPS Counter Display:', this.cpsCounterDisplay);
        console.log('Detect Window Button:', this.detectWindowBtn);
    }

    setInitialButtonStates() {
        // Initially, Start should be enabled and Stop should be disabled
        if (this.startBtn) this.startBtn.disabled = false;
        if (this.stopBtn) this.stopBtn.disabled = true;
        
        // Ensure we're not in active state initially
        this.isActive = false;
        
        console.log('Initial state - Start button disabled:', this.startBtn?.disabled, 'Stop button disabled:', this.stopBtn?.disabled);
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startAutoClick());
        this.stopBtn.addEventListener('click', () => this.stopAutoClick());
        this.addDelayClickBtn.addEventListener('click', () => this.addDelayClick());
        this.resetCounterBtn.addEventListener('click', () => this.resetCounter());
        this.directClickBtn.addEventListener('click', () => this.executeDirectClick());
        this.detectWindowBtn.addEventListener('click', () => this.detectActiveWindow());
        
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
                console.log('Started - Start button disabled:', this.startBtn.disabled, 'Stop button disabled:', this.stopBtn.disabled);
                
                const mode = this.modeSelect.value;
                let statusMessage = '';
                
                if (mode === 'KEY') {
                    statusMessage = 'Press F1 to execute clicks, F3 to save coordinates';
                } else if (mode === 'MOUSE') {
                    statusMessage = 'Click with mouse to execute automatic clicks';
                } else if (mode === 'AUTO') {
                    statusMessage = 'Automatic mode started - executing clicks continuously';
                    this.warnAboutTimingLimitations();
                }
                

                this.showToast('Listeners activated', 'success');
                
                // Only simulate clicks if AUTO mode
                if (mode === 'AUTO') {
                    this.simulateClickCounting();
                }
            } else {
                throw new Error(`HTTP Error: ${response.status}`);
            }
        } catch (error) {

            this.showToast('Error connecting to API', 'error');
            this.updateStatus('error');
        }
    }

    async stopAutoClick() {
        
        // Send stop configuration to API
        await this.sendStopConfiguration();
        
        // Stop local execution
        this.forceStop();
        
        this.showToast('AutoClick stopped', 'warning');
    }

    simulateClickCounting() {
        // Counter is now independent of API simulation
        // This function is kept for potential future features
        // but no longer affects the click counter
        console.log('API simulation started (counter independent)');
    }

    warnAboutTimingLimitations() {
        const interval = parseInt(this.intervalInput.value) || 100;
        const mode = this.speedModeSelect.value;
        
        if (mode === 'NN' && interval < 1000000) {
            this.showToast('⚠️ Browser cannot simulate nanosecond precision. Monitoring is approximate', 'warning');
        } else if (mode === 'MC' && interval < 1000) {
            this.showToast('⚠️ Browser timing limited to ~1ms precision. Monitoring is approximate', 'warning');
        } else if (interval < 4) {
            this.showToast('⚠️ Browser minimum timing is ~4ms. Very fast intervals are approximate', 'warning');
        }
    }

    usePrecisionTiming(targetInterval) {
        // Counter is now independent of API simulation
        // This function is kept for potential future features
        console.log('Precision timing setup (counter independent)');
    }

    simulateDelayClickExecution(clickCount, onComplete) {
        // Counter is now independent of API simulation
        // This function is kept for API functionality only
        console.log(`API simulation for ${clickCount} clicks (counter independent)`);
        if (onComplete) onComplete();
    }

    simulateManualTrigger() {
        // For KEY and MOUSE modes - API functionality only
        // Counter is now independent of API simulation
        const delayClicks = this.getDelayClicksData();
        let totalClicks = delayClicks.reduce((sum, dc) => sum + dc.count, 0);
        
        console.log(`API manual trigger for ${totalClicks} clicks (counter independent)`);
        
        let delayIndex = 0;
        
        const executeNextDelayClick = () => {
            if (delayIndex >= delayClicks.length) {
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
            actualInterval = Math.max(0.001, interval / 1000); // Microseconds to ms
        } else if (mode === 'NN') {
            actualInterval = Math.max(0.000001, interval / 1000000); // Nanoseconds to ms
        }
        
        // Log the actual timing being used
        
        return actualInterval;
    }

    incrementClickCounter() {
        console.log('incrementClickCounter called, current value:', this.clickCounter);
        
        // Actualizar tiempo del último click
        this.lastClickTime = Date.now();
        
        // Iniciar CPS tracking en el primer click
        if (this.clickCounter === 0) {
            this.startCpsTracking();
        }
        
        // Resetear el timeout de inactividad
        this.resetInactivityTimeout();
        
        this.clickCounter++;
        console.log('incremented to:', this.clickCounter);
        console.log('clickCounterDisplay element:', this.clickCounterDisplay);
        this.updateClickCounterDisplay();
    }

    trackTimingPrecision() {
        const now = performance.now();
        if (this.lastClickTime) {
            const actualInterval = now - this.lastClickTime;
            const expectedInterval = this.getActualInterval();
            const deviation = Math.abs(actualInterval - expectedInterval);
            
            // Update timing stats every 10 clicks
            if (this.clickCounter % 10 === 0) {
                const precision = ((1 - (deviation / expectedInterval)) * 100).toFixed(1);
                
                // Update real interval display if speed test results exist

            }
        }
        this.lastClickTime = now;
    }

    updateClickCounterDisplay() {
        console.log('updateClickCounterDisplay called with counter:', this.clickCounter);
        
        if (this.clickCounterDisplay) {
            this.clickCounterDisplay.textContent = this.clickCounter.toLocaleString();
            console.log('Updated display to:', this.clickCounterDisplay.textContent);
            
            // Animate counter with color flash for better visual feedback
            this.clickCounterDisplay.style.transform = 'scale(1.1)';
            this.clickCounterDisplay.style.color = 'var(--yellow)';
            
            setTimeout(() => {
                this.clickCounterDisplay.style.transform = 'scale(1)';
                this.clickCounterDisplay.style.color = 'var(--cyan)';
            }, 150);
        } else {
            console.log('clickCounterDisplay element not found!');
        }
    }

    resetCounter() {
        this.clickCounter = 0;
        this.stopCpsTracking();
        this.updateClickCounterDisplay();
        this.updateCpsDisplay(0);
        this.showToast('Counter reset', 'info');
    }

    startCpsTracking() {
        console.log('Starting CPS tracking...');
        this.cpsStartTime = Date.now();
        this.currentCps = 0;
        
        // Actualizar CPS cada segundo
        this.cpsInterval = setInterval(() => {
            this.calculateAndUpdateCps();
        }, 1000);
    }

    stopCpsTracking() {
        console.log('Stopping CPS tracking...');
        if (this.cpsInterval) {
            clearInterval(this.cpsInterval);
            this.cpsInterval = null;
        }
        this.clearInactivityTimeout();
        this.cpsStartTime = null;
        this.currentCps = 0;
        this.lastClickTime = null;
    }

    calculateAndUpdateCps() {
        if (!this.cpsStartTime || this.clickCounter === 0) {
            this.currentCps = 0;
        } else {
            // Verificar si han pasado más de 5 segundos desde el último click
            if (this.lastClickTime && (Date.now() - this.lastClickTime) >= this.INACTIVITY_LIMIT) {
                console.log('Inactivity detected during CPS calculation');
                this.handleInactivity();
                return; // No actualizar CPS, ya se ha reseteado
            }
            
            const timeElapsed = (Date.now() - this.cpsStartTime) / 1000; // segundos
            this.currentCps = this.clickCounter / timeElapsed;
        }
        
        console.log('CPS calculated:', this.currentCps.toFixed(1));
        this.updateCpsDisplay(this.currentCps);
    }

    updateCpsDisplay(cps) {
        if (this.cpsCounterDisplay) {
            this.cpsCounterDisplay.textContent = cps.toFixed(1);
            
            // Animate CPS with color flash for better visual feedback
            this.cpsCounterDisplay.style.transform = 'scale(1.05)';
            this.cpsCounterDisplay.style.color = 'var(--yellow)';
            
            setTimeout(() => {
                this.cpsCounterDisplay.style.transform = 'scale(1)';
                this.cpsCounterDisplay.style.color = 'var(--green)';
            }, 200);
        } else {
            console.log('cpsCounterDisplay element not found!');
        }
    }

    resetInactivityTimeout() {
        // Limpiar timeout anterior si existe
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
        }
        
        // Configurar nuevo timeout de 5 segundos
        this.inactivityTimeout = setTimeout(() => {
            console.log('5 segundos sin clicks - reseteando CPS');
            this.handleInactivity();
        }, this.INACTIVITY_LIMIT);
    }

    handleInactivity() {
        console.log('Handling inactivity - resetting counter and stopping CPS tracking');
        
        // Resetear contador total de clicks
        this.clickCounter = 0;
        this.updateClickCounterDisplay();
        
        // Resetear CPS
        this.stopCpsTracking();
        this.updateCpsDisplay(0);
        
        this.showToast('Counter and CPS reset due to inactivity (5s)', 'info');
    }

    clearInactivityTimeout() {
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
            this.inactivityTimeout = null;
        }
    }

    executeDirectClick() {
        console.log('executeDirectClick called - Simple counter increment only');
        console.log('directClickBtn element:', this.directClickBtn);
        console.log('clickCounter before increment:', this.clickCounter);
        
        // Simple counter increment - completely independent of API
        this.incrementClickCounter();
        console.log('clickCounter after increment:', this.clickCounter);
        
        // Visual feedback for button press
        if (this.directClickBtn) {
            this.directClickBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.directClickBtn.style.transform = 'scale(1)';
            }, 100);
        }
        
        // Show simple feedback toast
        this.showToast(`Click counted! Total: ${this.clickCounter}`, 'success');
    }

    async detectActiveWindow() {
        try {
            if (this.detectWindowBtn) {
                this.detectWindowBtn.disabled = true;
                this.detectWindowBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';
            }
            
            // Get the actual window title from the browser
            const activeWindow = document.title + " - Brave";  // This gets "AutoClick Control Panel - Brave"
            
            this.windowTitleInput.value = activeWindow;
            
            // Save configuration but don't trigger auto-stop
            this.saveConfiguration();
            
            if (this.detectWindowBtn) {
                this.showToast(`Window detected: ${activeWindow}`, 'success');
            }
            
        } catch (error) {
            console.error('Error detecting window:', error);
            if (this.detectWindowBtn) {
                this.showToast('Failed to detect window', 'error');
            }
        } finally {
            if (this.detectWindowBtn) {
                setTimeout(() => {
                    this.detectWindowBtn.disabled = false;
                    this.detectWindowBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Auto-detect';
                }, 1000);
            }
        }
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

        } catch (error) {
        }
    }

    forceStop() {
        this.isActive = false;
        this.updateStatus('disconnected');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        console.log('Stopped - Start button disabled:', this.startBtn.disabled, 'Stop button disabled:', this.stopBtn.disabled);
        
        // Clear all intervals and reset timing tracking
        if (this.clickCountingInterval) {
            clearInterval(this.clickCountingInterval);
            this.clickCountingInterval = null;
        }
        
        // Reset timing tracking
        this.lastClickTime = null;
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
                
                // Si hay clicks guardados, inicializar CPS tracking
                if (this.clickCounter > 0) {
                    this.startCpsTracking();
                    // Iniciar el timeout de inactividad desde el principio
                    this.resetInactivityTimeout();
                } else {
                    this.updateCpsDisplay(0);
                }
                
                // Clear existing delay clicks and load saved ones
                this.delayClicksContainer.innerHTML = '';
                if (config.delayClicks && config.delayClicks.length > 0) {
                    config.delayClicks.forEach(dc => {
                        this.addDelayClick(dc.delay, dc.count);
                    });
                } else {
                    this.addInitialDelayClick();
                }
                
            } catch (error) {
                this.addInitialDelayClick();
                this.updateCpsDisplay(0);
            }
        } else {
            this.updateCpsDisplay(0);
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
        this.stopCpsTracking();
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
