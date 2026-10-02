"""
ROBOT ARM CONTROL - Flask Backend
=================================
Stage 5.5: Simulation Mode (Windows Laptop / Raspberry Pi)
Hardware Target: Raspberry Pi + Arduino Nano + 4 MG90S Servos

Endpoints:
  - GET  /       : Loads the web control dashboard
  - POST /servo  : Moves an individual joint (Base, Shoulder, Elbow, Gripper)
  - POST /home   : Resets all joints to default Home positions
"""

from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ==============================================================================
# SERVO CONFIGURATION & MAPPINGS
# ==============================================================================
# Mapping from joint name (frontend) to serial command prefix (Arduino protocol)
JOINT_PREFIXES = {
    'base': 'B',
    'shoulder': 'S',
    'elbow': 'E',
    'gripper': 'G'
}

# Default safe home angles (0° to 180°)
DEFAULT_POSITIONS = {
    'base': 90,
    'shoulder': 90,
    'elbow': 90,
    'gripper': 30
}

# In-memory storage for current positions
current_positions = DEFAULT_POSITIONS.copy()


# ==============================================================================
# SERIAL COMMUNICATION INTERFACE (FUTURE ARDUINO NANO HARDWARE)
# ==============================================================================
# When you connect Arduino Nano to Raspberry Pi via USB, you will:
# 1. Install pyserial: pip install pyserial
# 2. Uncomment and configure the serial connection below:
#
# import serial
# import time
#
# SERIAL_PORT = '/dev/ttyUSB0'  # Use 'COM3' / 'COM4' on Windows, '/dev/ttyUSB0' or '/dev/ttyACM0' on Raspberry Pi
# BAUD_RATE = 9600
#
# try:
#     ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
#     time.sleep(2)  # Wait for Arduino reboot after serial connection
#     print(f"[SERIAL] Connected to Arduino on {SERIAL_PORT}")
# except Exception as e:
#     ser = None
#     print(f"[SERIAL WARNING] Could not open {SERIAL_PORT}: {e}")

def send_serial_command(command_str: str) -> None:
    """
    Sends a formatted command string to the Arduino or prints to terminal in simulation mode.
    
    Command Format:
      - B90 -> Base to 90°
      - S90 -> Shoulder to 90°
      - E90 -> Elbow to 90°
      - G30 -> Gripper to 30°
    """
    # -------------------------------------------------------------
    # FUTURE HARDWARE EXECUTION (Uncomment when Arduino is connected)
    # -------------------------------------------------------------
    # global ser
    # if ser and ser.is_open:
    #     ser.write(f"{command_str}\n".encode('utf-8'))
    #     ser.flush()

    # -------------------------------------------------------------
    # SIMULATION MODE EXECUTION (Active for Stage 5.5 testing)
    # -------------------------------------------------------------
    print(f"[SIMULATION] {command_str}", flush=True)


# ==============================================================================
# FLASK ROUTES
# ==============================================================================

@app.route('/')
def index():
    """Renders the main robotic arm control dashboard."""
    return render_template('index.html', initial_positions=current_positions)


@app.route('/servo', methods=['POST'])
def control_servo():
    """
    Endpoint to control a single servo joint.
    Expects JSON payload:
      {
        "joint": "base" | "shoulder" | "elbow" | "gripper",
        "angle": 0 - 180
      }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'status': 'error', 'message': 'Invalid or missing JSON body'}), 400

    joint = data.get('joint', '').strip().lower()
    angle_val = data.get('angle')

    # Validate joint name
    if joint not in JOINT_PREFIXES:
        return jsonify({
            'status': 'error',
            'message': f'Invalid joint: "{joint}". Must be one of: {list(JOINT_PREFIXES.keys())}'
        }), 400

    # Validate and clamp angle
    try:
        angle = int(round(float(angle_val)))
    except (ValueError, TypeError):
        return jsonify({'status': 'error', 'message': 'Angle must be a valid integer between 0 and 180'}), 400

    if angle < 0 or angle > 180:
        return jsonify({'status': 'error', 'message': 'Angle must be between 0 and 180 degrees'}), 400

    # Update in-memory state
    current_positions[joint] = angle

    # Build and dispatch command string (e.g. "B120", "S70", "E45", "G20")
    prefix = JOINT_PREFIXES[joint]
    command_str = f"{prefix}{angle}"
    send_serial_command(command_str)

    return jsonify({
        'status': 'success',
        'joint': joint,
        'angle': angle,
        'command': command_str,
        'message': f'Command {command_str} sent'
    })


@app.route('/home', methods=['POST'])
def home_position():
    """
    Resets all 4 servos to their home positions:
      Base: 90° (B90)
      Shoulder: 90° (S90)
      Elbow: 90° (E90)
      Gripper: 30° (G30)
    """
    commands_generated = []
    
    # Update positions and emit commands for all joints in fixed order
    for joint in ['base', 'shoulder', 'elbow', 'gripper']:
        target_angle = DEFAULT_POSITIONS[joint]
        current_positions[joint] = target_angle
        prefix = JOINT_PREFIXES[joint]
        cmd = f"{prefix}{target_angle}"
        commands_generated.append(cmd)
        send_serial_command(cmd)

    return jsonify({
        'status': 'success',
        'positions': current_positions,
        'commands': commands_generated,
        'latest_command': f"B90 S90 E90 G30",
        'message': 'Robotic arm reset to HOME position'
    })


@app.route('/stop', methods=['POST'])
def emergency_stop():
    """
    Emergency Stop / Hold endpoint.
    Halts any ongoing motion and holds current joint positions.
    """
    command_str = "STOP"
    send_serial_command(command_str)
    return jsonify({
        'status': 'success',
        'command': command_str,
        'positions': current_positions,
        'message': 'EMERGENCY STOP: Arm movement stopped'
    })


@app.route('/reset', methods=['POST'])
def reset_simulation():
    """
    Resets the entire simulation to initial default positions:
      Base: 90°, Shoulder: 90°, Elbow: 90°, Gripper: 30°
    """
    commands_generated = []
    for joint in ['base', 'shoulder', 'elbow', 'gripper']:
        target_angle = DEFAULT_POSITIONS[joint]
        current_positions[joint] = target_angle
        prefix = JOINT_PREFIXES[joint]
        cmd = f"{prefix}{target_angle}"
        commands_generated.append(cmd)
        send_serial_command(cmd)

    return jsonify({
        'status': 'success',
        'command': 'RESET',
        'positions': current_positions,
        'commands': commands_generated,
        'latest_command': 'RESET (B90 S90 E90 G30)',
        'message': 'Simulation reset to default state'
    })


# Predefined motion presets
PRESETS = {
    'home': {'base': 90, 'shoulder': 90, 'elbow': 90, 'gripper': 30},
    'pick': {'base': 90, 'shoulder': 130, 'elbow': 50, 'gripper': 120},
    'release': {'base': 90, 'shoulder': 130, 'elbow': 50, 'gripper': 30}
}


@app.route('/preset', methods=['POST'])
def apply_preset():
    """
    Executes predefined arm poses: 'home', 'pick', 'release'
    """
    data = request.get_json(silent=True) or {}
    preset_name = data.get('preset', '').strip().lower()
    
    if preset_name not in PRESETS:
        return jsonify({'status': 'error', 'message': f'Unknown preset: "{preset_name}"'}), 400
        
    target = PRESETS[preset_name]
    commands_generated = []
    for joint in ['base', 'shoulder', 'elbow', 'gripper']:
        angle = target[joint]
        current_positions[joint] = angle
        cmd = f"{JOINT_PREFIXES[joint]}{angle}"
        commands_generated.append(cmd)
        send_serial_command(cmd)
        
    return jsonify({
        'status': 'success',
        'preset': preset_name,
        'positions': current_positions,
        'commands': commands_generated,
        'latest_command': f"{preset_name.upper()} ({' '.join(commands_generated)})",
        'message': f'Preset "{preset_name.upper()}" applied'
    })


@app.route('/status', methods=['GET'])
def get_status():
    """Returns current joint angles and system status."""
    return jsonify({
        'status': 'online',
        'mode': 'SIMULATION',
        'positions': current_positions,
        'controller': 'Raspberry Pi -> Arduino Nano',
        'connection_status': {
            'website': 'Connected',
            'raspberry_pi': 'Waiting',
            'arduino_nano': 'Waiting',
            'servos': 'Waiting'
        }
    })


# ==============================================================================
# MAIN ENTRY POINT
# ==============================================================================
if __name__ == '__main__':
    print("\n" + "="*60)
    print("      ROBOT ARM CONTROL - FLASK SERVER STARTED")
    print("="*60)
    print("  Controller : Raspberry Pi -> Arduino Nano")
    print("  Mode       : SIMULATION MODE (No Arduino required)")
    print("  Server URL : http://localhost:5000")
    print("  Mobile URL : http://<YOUR-IP-ADDRESS>:5000")
    print("="*60 + "\n")
    
    # Run server accessible on local network (0.0.0.0) for phone control
    app.run(host="0.0.0.0", port=5000, debug=True)
