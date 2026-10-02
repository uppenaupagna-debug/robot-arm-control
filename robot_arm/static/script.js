/**
 * ROBOT ARM CONTROL - Frontend Logic
 * Minimalist Clean White Industrial Interface
 * Vanilla JavaScript (Zero External Dependencies)
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // Configuration & DOM Element References
    // -------------------------------------------------------------------------
    const joints = ['base', 'shoulder', 'elbow', 'gripper'];
    let commandCounter = 0;

    const currentAngles = {
        base: 90,
        shoulder: 90,
        elbow: 90,
        gripper: 30
    };

    const elements = {
        homeBtn: document.getElementById('btn-home'),
        pickBtn: document.getElementById('btn-pick'),
        releaseBtn: document.getElementById('btn-release'),
        stopBtn: document.getElementById('btn-stop'),
        clearLogBtn: document.getElementById('btn-clear-log'),
        logWindow: document.getElementById('log-window'),
        logCount: document.getElementById('log-count'),
        positionSummary: document.getElementById('current-position-summary'),
        
        // SVG Visualization Nodes
        svgLink1: document.getElementById('svg-link-1'),
        svgLink1Core: document.getElementById('svg-link-1-core'),
        svgLink2: document.getElementById('svg-link-2'),
        svgLink2Core: document.getElementById('svg-link-2-core'),
        svgGripperGroup: document.getElementById('svg-gripper-group'),
        
        // Controls cache
        controls: {}
    };

    // Cache joint controls and viz elements
    joints.forEach(joint => {
        elements.controls[joint] = {
            slider: document.getElementById(`${joint}-slider`),
            angleDisplay: document.getElementById(`${joint}-angle`),
            vizVal: document.getElementById(`viz-${joint}-val`)
        };
    });

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
    // Helper: Append Command to Collapsible Terminal Log
    // -------------------------------------------------------------------------
    function appendCommandLog(command, type = 'command', message = '') {
        if (!elements.logWindow) return;

        commandCounter++;
        if (elements.logCount) {
            elements.logCount.textContent = `${commandCounter} command${commandCounter === 1 ? '' : 's'}`;
        }

        const line = document.createElement('div');
        line.className = `terminal-line ${type}-line`;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'line-time';
        timeSpan.textContent = getTimestamp();

        const tagSpan = document.createElement('span');
        tagSpan.className = 'line-tag';

        if (type === 'stop') {
            tagSpan.textContent = '[STOP]';
        } else if (type === 'system') {
            tagSpan.textContent = '[SYSTEM]';
        } else {
            tagSpan.textContent = '[CMD]';
        }

        const msgSpan = document.createElement('span');
        msgSpan.className = 'line-msg';
        msgSpan.textContent = message ? `${command} (${message})` : command;

        line.appendChild(timeSpan);
        line.appendChild(tagSpan);
        line.appendChild(msgSpan);

        elements.logWindow.appendChild(line);
        elements.logWindow.scrollTop = elements.logWindow.scrollHeight;
    }

    // -------------------------------------------------------------------------
    // Helper: Update Slider Track Visual Fill
    // -------------------------------------------------------------------------
    function updateSliderVisual(slider) {
        if (!slider) return;
        const min = parseInt(slider.min, 10) || 0;
        const max = parseInt(slider.max, 10) || 180;
        const val = parseInt(slider.value, 10) || 0;
        const percentage = ((val - min) / (max - min)) * 100;
        
        slider.style.background = `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`;
    }

    // -------------------------------------------------------------------------
    // Helper: Update Robotic Arm SVG Kinematics
    // -------------------------------------------------------------------------
    function updateArmVisualization() {
        const shoulderDeg = currentAngles.shoulder;
        const elbowDeg = currentAngles.elbow;

        // Origin at Shoulder pivot
        const originX = 160;
        const originY = 200;
        const link1Len = 85;
        const link2Len = 80;

        // Kinematic angles
        // Map 0-180deg to ergonomic visual coordinates
        const rad1 = ((180 - shoulderDeg) * Math.PI) / 180;
        const elbowX = originX + link1Len * Math.cos(rad1);
        const elbowY = originY - link1Len * Math.sin(rad1);

        const rad2 = rad1 + ((90 - elbowDeg) * Math.PI) / 180;
        const wristX = elbowX + link2Len * Math.cos(rad2);
        const wristY = elbowY - link2Len * Math.sin(rad2);

        // Update Link 1 in SVG
        if (elements.svgLink1 && elements.svgLink1Core) {
            elements.svgLink1.setAttribute('x1', originX);
            elements.svgLink1.setAttribute('y1', originY);
            elements.svgLink1.setAttribute('x2', elbowX);
            elements.svgLink1.setAttribute('y2', elbowY);

            elements.svgLink1Core.setAttribute('x1', originX);
            elements.svgLink1Core.setAttribute('y1', originY);
            elements.svgLink1Core.setAttribute('x2', elbowX);
            elements.svgLink1Core.setAttribute('y2', elbowY);
        }

        // Update Link 2 in SVG
        if (elements.svgLink2 && elements.svgLink2Core) {
            elements.svgLink2.setAttribute('x1', elbowX);
            elements.svgLink2.setAttribute('y1', elbowY);
            elements.svgLink2.setAttribute('x2', wristX);
            elements.svgLink2.setAttribute('y2', wristY);

            elements.svgLink2Core.setAttribute('x1', elbowX);
            elements.svgLink2Core.setAttribute('y1', elbowY);
            elements.svgLink2Core.setAttribute('x2', wristX);
            elements.svgLink2Core.setAttribute('y2', wristY);
        }

        // Update Gripper position in SVG
        if (elements.svgGripperGroup) {
            elements.svgGripperGroup.setAttribute('transform', `translate(${wristX}, ${wristY})`);
        }
    }

    // -------------------------------------------------------------------------
    // Helper: Update "CURRENT POSITION" Summary Card
    // -------------------------------------------------------------------------
    function updatePositionSummary() {
        if (!elements.positionSummary) return;
        elements.positionSummary.innerHTML = `
            <span>Base <strong>${currentAngles.base}°</strong></span>
            <span class="pos-dot">&bull;</span>
            <span>Shoulder <strong>${currentAngles.shoulder}°</strong></span>
            <span class="pos-dot">&bull;</span>
            <span>Elbow <strong>${currentAngles.elbow}°</strong></span>
            <span class="pos-dot">&bull;</span>
            <span>Gripper <strong>${currentAngles.gripper}°</strong></span>
        `;
    }

    // -------------------------------------------------------------------------
    // API: Send Single Joint Movement (POST /servo)
    // -------------------------------------------------------------------------
    async function sendServoCommand(joint, angle) {
        try {
            const response = await fetch('/servo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' }
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
    // API: Send Motion Preset (POST /preset)
    // -------------------------------------------------------------------------
    async function sendPresetCommand(presetName) {
        try {
            const response = await fetch('/preset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preset: presetName })
            });

            if (!response.ok) {
                console.error(`[SERVER ERROR] /preset status: ${response.status}`);
                return;
            }

            const data = await response.json();
            if (data.status === 'success') {
                if (Array.isArray(data.commands)) {
                    data.commands.forEach(cmd => appendCommandLog(cmd, 'command'));
                }
            }
        } catch (error) {
            console.error('[NETWORK ERROR] Could not send preset command:', error);
        }
    }

    // -------------------------------------------------------------------------
    // API: Send Emergency Stop (POST /stop)
    // -------------------------------------------------------------------------
    async function sendStopCommand() {
        try {
            const response = await fetch('/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                console.error(`[SERVER ERROR] /stop status: ${response.status}`);
                return;
            }

            const data = await response.json();
            if (data.status === 'success') {
                appendCommandLog('STOP', 'stop', 'Motion halted');
            }
        } catch (error) {
            console.error('[NETWORK ERROR] Could not send stop command:', error);
        }
    }

    // -------------------------------------------------------------------------
    // Set Joint Angle (Updates UI, Viz, and dispatches network request)
    // -------------------------------------------------------------------------
    function setJointAngle(joint, targetAngle, shouldSendNetwork = true, immediate = false) {
        const ctrl = elements.controls[joint];
        if (!ctrl) return;

        // Clamp between 0° and 180°
        const clampedAngle = Math.max(0, Math.min(180, parseInt(targetAngle, 10) || 0));

        // Update local state
        currentAngles[joint] = clampedAngle;

        // Update Slider and Display Text
        ctrl.slider.value = clampedAngle;
        ctrl.angleDisplay.textContent = `${clampedAngle}°`;
        if (ctrl.vizVal) {
            ctrl.vizVal.textContent = `${clampedAngle}°`;
        }

        updateSliderVisual(ctrl.slider);
        updatePositionSummary();
        updateArmVisualization();

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

        updateSliderVisual(ctrl.slider);

        ctrl.slider.addEventListener('input', (e) => {
            const newAngle = e.target.value;
            setJointAngle(joint, newAngle, true, false);
        });

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
            
            const currentVal = currentAngles[joint];
            const targetAngle = currentVal + step;

            setJointAngle(joint, targetAngle, true, true);
        });
    });

    // -------------------------------------------------------------------------
    // Event Listeners: Action Bar (HOME, PICK, RELEASE, STOP)
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

    if (elements.pickBtn) {
        elements.pickBtn.addEventListener('click', () => {
            // Preset: Pick Pose (Base 90°, Shoulder 130°, Elbow 50°, Gripper 120°)
            setJointAngle('base', 90, false);
            setJointAngle('shoulder', 130, false);
            setJointAngle('elbow', 50, false);
            setJointAngle('gripper', 120, false);

            sendPresetCommand('pick');
        });
    }

    if (elements.releaseBtn) {
        elements.releaseBtn.addEventListener('click', () => {
            // Preset: Release Pose (Gripper 30° / open)
            setJointAngle('gripper', 30, false);

            sendPresetCommand('release');
        });
    }

    if (elements.stopBtn) {
        elements.stopBtn.addEventListener('click', () => {
            sendStopCommand();
        });
    }

    // -------------------------------------------------------------------------
    // Event Listener: Clear Terminal Log
    // -------------------------------------------------------------------------
    if (elements.clearLogBtn) {
        elements.clearLogBtn.addEventListener('click', () => {
            if (elements.logWindow) {
                elements.logWindow.innerHTML = `
                    <div class="terminal-line system-line">
                        <span class="line-time">${getTimestamp()}</span>
                        <span class="line-tag">[SYSTEM]</span>
                        <span class="line-msg">Log cleared. Ready for commands.</span>
                    </div>
                `;
            }
            commandCounter = 0;
            if (elements.logCount) {
                elements.logCount.textContent = '0 commands';
            }
        });
    }

    // Initial Kinematic Setup
    updateArmVisualization();
    updatePositionSummary();
    console.log('[ROBOT ARM] Industrial Minimalist Controller Initialized.');
});
