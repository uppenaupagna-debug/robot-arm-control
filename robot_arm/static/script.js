/**
 * ROBOT ARM CONTROL - Frontend Logic
 * Stage 5.5: College Project Demonstration & Simulation Mode
 * Vanilla JavaScript (Zero External Dependencies)
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // Joint Configuration & Elements Cache
    // -------------------------------------------------------------------------
    const joints = ['base', 'shoulder', 'elbow', 'gripper'];
    let totalCommandCount = 0;
    
    const elements = {
        homeBtn: document.getElementById('btn-home'),
        stopBtn: document.getElementById('btn-stop'),
        resetBtn: document.getElementById('btn-reset'),
        clearLogBtn: document.getElementById('btn-clear-log'),
        logWindow: document.getElementById('log-window'),
        logCount: document.getElementById('log-count'),
        controls: {}
    };

    // Cache joint-specific DOM elements
    joints.forEach(joint => {
        elements.controls[joint] = {
            slider: document.getElementById(`${joint}-slider`),
            angleDisplay: document.getElementById(`${joint}-angle`),
            card: document.getElementById(`card-${joint}`)
        };
    });

    // Debounce timer map for rapid slider sliding
    const debounceTimers = {};

    // -------------------------------------------------------------------------
    // Helper: Formatted Timestamp [HH:MM:SS]
    // -------------------------------------------------------------------------
    function getTimestamp() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
    }

    // -------------------------------------------------------------------------
    // Helper: Add Entry to Command Log Terminal
    // -------------------------------------------------------------------------
    function appendCommandLog(command, type = 'command', message = '') {
        if (!elements.logWindow) return;

        totalCommandCount++;
        if (elements.logCount) {
            elements.logCount.textContent = `${totalCommandCount} command${totalCommandCount === 1 ? '' : 's'}`;
        }

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}-entry`;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        timeSpan.textContent = getTimestamp();

        const tagSpan = document.createElement('span');
        tagSpan.className = 'log-tag';
        
        if (type === 'stop') {
            tagSpan.textContent = '[STOP]';
        } else if (type === 'system') {
            tagSpan.textContent = '[SYSTEM]';
        } else {
            tagSpan.textContent = '[CMD]';
        }

        const msgSpan = document.createElement('span');
        msgSpan.className = 'log-msg';
        msgSpan.textContent = message ? `${command} (${message})` : command;

        entry.appendChild(timeSpan);
        entry.appendChild(tagSpan);
        entry.appendChild(msgSpan);

        elements.logWindow.appendChild(entry);

        // Auto scroll to latest command
        elements.logWindow.scrollTop = elements.logWindow.scrollHeight;
    }

    // -------------------------------------------------------------------------
    // Helper: Update Slider Track Dynamic Gradient Fill
    // -------------------------------------------------------------------------
    function updateSliderVisual(slider) {
        if (!slider) return;
        const min = parseInt(slider.min, 10) || 0;
        const max = parseInt(slider.max, 10) || 180;
        const val = parseInt(slider.value, 10) || 0;
        const percentage = ((val - min) / (max - min)) * 100;
        
        slider.style.background = `linear-gradient(to right, #0284c7 0%, #38bdf8 ${percentage}%, #0f172a ${percentage}%, #0f172a 100%)`;
    }

    // -------------------------------------------------------------------------
    // API: Send Single Joint Movement (POST /servo)
    // -------------------------------------------------------------------------
    async function sendServoCommand(joint, angle) {
        try {
            const response = await fetch('/servo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    joint: joint,
                    angle: parseInt(angle, 10)
                })
            });

            if (!response.ok) {
                console.error(`[SERVER ERROR] /servo status: ${response.status}`);
                return;
            }

            const data = await response.json();
            if (data.status === 'success' && data.command) {
                appendCommandLog(data.command, 'command');
            }
        } catch (error) {
            console.error('[NETWORK ERROR] Could not send servo command:', error);
        }
    }

    // -------------------------------------------------------------------------
    // API: Send Home Position Command (POST /home)
    // -------------------------------------------------------------------------
    async function sendHomeCommand() {
        try {
            const response = await fetch('/home', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`[SERVER ERROR] /home status: ${response.status}`);
                return;
            }

            const data = await response.json();
            if (data.status === 'success') {
                if (Array.isArray(data.commands)) {
                    data.commands.forEach(cmd => appendCommandLog(cmd, 'command'));
                } else {
                    appendCommandLog('B90 S90 E90 G30', 'command', 'Home Position');
                }
            }
        } catch (error) {
            console.error('[NETWORK ERROR] Could not send home command:', error);
        }
    }

    // -------------------------------------------------------------------------
    // API: Send Emergency Stop (POST /stop)
    // -------------------------------------------------------------------------
    async function sendStopCommand() {
        try {
            const response = await fetch('/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`[SERVER ERROR] /stop status: ${response.status}`);
                return;
            }

            const data = await response.json();
            if (data.status === 'success') {
                appendCommandLog('STOP', 'stop', 'Arm motion halted');
            }
        } catch (error) {
            console.error('[NETWORK ERROR] Could not send stop command:', error);
        }
    }

    // -------------------------------------------------------------------------
    // API: Reset Simulation (POST /reset)
    // -------------------------------------------------------------------------
    async function sendResetCommand() {
        try {
            const response = await fetch('/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`[SERVER ERROR] /reset status: ${response.status}`);
                return;
            }

            const data = await response.json();
            if (data.status === 'success') {
                appendCommandLog('RESET', 'system', 'Simulation restored to default');
                if (Array.isArray(data.commands)) {
                    data.commands.forEach(cmd => appendCommandLog(cmd, 'command'));
                }
            }
        } catch (error) {
            console.error('[NETWORK ERROR] Could not send reset command:', error);
        }
    }

    // -------------------------------------------------------------------------
    // Set Joint Angle (Updates UI and triggers network request)
    // -------------------------------------------------------------------------
    function setJointAngle(joint, targetAngle, shouldSendNetwork = true, immediate = false) {
        const ctrl = elements.controls[joint];
        if (!ctrl) return;

        // Clamp between 0° and 180°
        const clampedAngle = Math.max(0, Math.min(180, parseInt(targetAngle, 10) || 0));

        // Update Slider and Display immediately
        ctrl.slider.value = clampedAngle;
        ctrl.angleDisplay.textContent = clampedAngle;
        updateSliderVisual(ctrl.slider);

        if (!shouldSendNetwork) return;

        if (immediate) {
            if (debounceTimers[joint]) {
                clearTimeout(debounceTimers[joint]);
            }
            sendServoCommand(joint, clampedAngle);
        } else {
            if (debounceTimers[joint]) {
                clearTimeout(debounceTimers[joint]);
            }
            debounceTimers[joint] = setTimeout(() => {
                sendServoCommand(joint, clampedAngle);
            }, 50);
        }
    }

    // -------------------------------------------------------------------------
    // Event Listeners: Sliders
    // -------------------------------------------------------------------------
    joints.forEach(joint => {
        const ctrl = elements.controls[joint];
        if (!ctrl || !ctrl.slider) return;

        // Initialize track visuals
        updateSliderVisual(ctrl.slider);

        // Real-time update as user drags slider
        ctrl.slider.addEventListener('input', (e) => {
            const newAngle = e.target.value;
            setJointAngle(joint, newAngle, true, false);
        });

        // Ensure final position is dispatched upon release
        ctrl.slider.addEventListener('change', (e) => {
            const newAngle = e.target.value;
            setJointAngle(joint, newAngle, true, true);
        });
    });

    // -------------------------------------------------------------------------
    // Event Listeners: Step Buttons (-5° and +5°)
    // -------------------------------------------------------------------------
    document.querySelectorAll('.btn-step').forEach(button => {
        button.addEventListener('click', () => {
            const joint = button.getAttribute('data-joint');
            const step = parseInt(button.getAttribute('data-step'), 10) || 0;
            
            const ctrl = elements.controls[joint];
            if (!ctrl || !ctrl.slider) return;

            const currentVal = parseInt(ctrl.slider.value, 10) || 0;
            const targetAngle = currentVal + step;

            setJointAngle(joint, targetAngle, true, true);
        });
    });

    // -------------------------------------------------------------------------
    // Event Listener: HOME Button
    // -------------------------------------------------------------------------
    if (elements.homeBtn) {
        elements.homeBtn.addEventListener('click', () => {
            setJointAngle('base', 90, false);
            setJointAngle('shoulder', 90, false);
            setJointAngle('elbow', 90, false);
            setJointAngle('gripper', 30, false);

            sendHomeCommand();
        });
    }

    // -------------------------------------------------------------------------
    // Event Listener: STOP Button
    // -------------------------------------------------------------------------
    if (elements.stopBtn) {
        elements.stopBtn.addEventListener('click', () => {
            sendStopCommand();
        });
    }

    // -------------------------------------------------------------------------
    // Event Listener: RESET SIMULATION Button
    // -------------------------------------------------------------------------
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => {
            setJointAngle('base', 90, false);
            setJointAngle('shoulder', 90, false);
            setJointAngle('elbow', 90, false);
            setJointAngle('gripper', 30, false);

            sendResetCommand();
        });
    }

    // -------------------------------------------------------------------------
    // Event Listener: Clear Log Button
    // -------------------------------------------------------------------------
    if (elements.clearLogBtn) {
        elements.clearLogBtn.addEventListener('click', () => {
            if (elements.logWindow) {
                elements.logWindow.innerHTML = `
                    <div class="log-entry system-entry">
                        <span class="log-time">${getTimestamp()}</span>
                        <span class="log-tag">[SYSTEM]</span>
                        <span class="log-msg">Log cleared. Ready for commands.</span>
                    </div>
                `;
            }
            totalCommandCount = 0;
            if (elements.logCount) {
                elements.logCount.textContent = '0 commands';
            }
        });
    }

    console.log('[ROBOT ARM] Professional Web Interface Active in Simulation Mode.');
});
