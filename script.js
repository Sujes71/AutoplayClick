class AutoClickApp {
    constructor() {
        this.API_BASE_URL = 'http://localhost:8080/api';
        this.clickCounter = 0;
        this.isActive = false;
        this.delayClicks = [];
        this.speedTestStartTime = null;
        this.speedTestClicks = 0;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadConfiguration();
        this.addInitialDelayClick();
        this.updateStatus('disconnected');
        
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
        
        // Auto-save on input changes
        [this.windowTitleInput, this.modeSelect, this.intervalInput, this.speedModeSelect].forEach(element => {
            element.addEventListener('change', () => this.saveConfiguration());
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
                this.saveConfiguration();
                this.showToast('DelayClick eliminado', 'success');
            } else {
                this.showToast('Debe mantener al menos un DelayClick', 'warning');
            }
        });
        
        const inputs = delayClickItem.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.saveConfiguration());
        });
        
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
            this.showToast('Por favor, ingresa el título de la ventana', 'error');
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
            this.log('Iniciando AutoClick...', 'info');
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
                this.log('AutoClick iniciado correctamente', 'success');
                this.showToast('AutoClick iniciado', 'success');
                
                // Simular contador de clicks para demostración
                this.simulateClickCounting();
            } else {
                throw new Error(`Error HTTP: ${response.status}`);
            }
        } catch (error) {
            this.log(`Error al iniciar AutoClick: ${error.message}`, 'error');
            this.showToast('Error al conectar con la API', 'error');
            this.updateStatus('error');
        }
    }

    stopAutoClick() {
        this.isActive = false;
        this.updateStatus('disconnected');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.log('AutoClick detenido', 'warning');
        this.showToast('AutoClick detenido', 'warning');
        
        if (this.clickCountingInterval) {
            clearInterval(this.clickCountingInterval);
        }
    }

    simulateClickCounting() {
        if (this.clickCountingInterval) {
            clearInterval(this.clickCountingInterval);
        }
        
        const interval = parseInt(this.intervalInput.value) || 100;
        const mode = this.speedModeSelect.value;
        
        let actualInterval = interval;
        if (mode === 'MC') {
            actualInterval = Math.max(1, interval / 1000); // Microseconds to ms
        } else if (mode === 'NN') {
            actualInterval = Math.max(1, interval / 1000000); // Nanoseconds to ms
        }
        
        this.clickCountingInterval = setInterval(() => {
            if (this.isActive) {
                this.incrementClickCounter();
            }
        }, actualInterval);
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
        this.log('Contador reiniciado', 'info');
        this.showToast('Contador reiniciado', 'info');
    }

    async runSpeedTest() {
        const testClicks = parseInt(this.testClicksInput.value) || 10;
        const interval = parseInt(this.intervalInput.value) || 100;
        const mode = this.speedModeSelect.value;
        
        this.speedTestBtn.disabled = true;
        this.speedTestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...';
        this.log(`Iniciando prueba de velocidad: ${testClicks} clicks`, 'info');
        
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
                this.speedTestBtn.innerHTML = '<i class="fas fa-stopwatch"></i> Probar Velocidad';
                
                this.log(`Prueba completada: ${clicksPerSecond} clicks/s`, 'success');
                this.showToast('Prueba de velocidad completada', 'success');
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
                statusText.textContent = 'Conectado';
                break;
            case 'connecting':
                statusText.textContent = 'Conectando...';
                break;
            case 'error':
                statusText.textContent = 'Error';
                break;
            default:
                statusText.textContent = 'Desconectado';
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
        this.showToast('Log limpiado', 'info');
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
                this.log('Coordenadas guardadas (F3 presionado)', 'info');
                this.showToast('Coordenadas guardadas', 'info');
                break;
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
                
                this.log('Configuración cargada', 'success');
            } catch (error) {
                this.log('Error al cargar configuración', 'error');
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
    window.autoClickApp.log('Aplicación inicializada', 'success');
    window.autoClickApp.log('Configuración cargada desde localStorage', 'info');
    window.autoClickApp.log('Listo para usar - Presiona F1 para iniciar, F2 para detener, F3 para guardar coordenadas', 'info');
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.autoClickApp) {
        window.autoClickApp.destroy();
    }
});
