# 🦾 ROBOT ARM CONTROL

A modern, mobile-responsive web controller dashboard for a **4-DOF Robotic Arm** powered by Python Flask.

Designed for **Raspberry Pi + Arduino Nano + 4 MG90S Servos**, featuring a full **Simulation Mode** for testing without physical hardware connected.

---

## 🌟 Features

- **4 Servo Joint Controls**:
  - **Base**: `0° – 180°` (Default: `90°`)
  - **Shoulder**: `0° – 180°` (Default: `90°`)
  - **Elbow**: `0° – 180°` (Default: `90°`)
  - **Gripper**: `0° – 180°` (Default: `30°`)
- **Real-Time Touch Sliders & Steppers**: ±5° fine-tuning buttons with instant numeric angle displays.
- **Action Buttons**:
  - `HOME` (Resets joints to standard home position: B90, S90, E90, G30)
  - `STOP` (Emergency motion halt / hold position)
  - `RESET` (Restores simulation and resets command history)
- **Live Serial Command Log**: Real-time terminal viewer logging serial commands with timestamps.
- **Hardware Link Status**: Visual connection badges for Website, Raspberry Pi, Arduino Nano, and Servos.
- **Mobile-First Responsive Design**: Touch-friendly interface accessible from laptops, Android phones, and iPhones over local Wi-Fi.

---

## 📂 Project Structure

```text
robot_arm/
├── app.py                  # Python Flask backend & serial command translator
├── templates/
│   └── index.html          # Clean HTML5 UI dashboard
└── static/
    ├── style.css           # Modern dark-themed CSS with touch controls
    └── script.js           # Vanilla JavaScript for real-time slider updates & API calls
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pip install flask
```

### 2. Run the Application
Navigate into the `robot_arm` directory and start Flask:
```bash
cd robot_arm
python app.py
```

### 3. Open in Browser
- **On Laptop**: [http://localhost:5000](http://localhost:5000)
- **On Phone**: `http://<YOUR_IP_ADDRESS>:5000` (e.g., `http://192.168.1.100:5000`)

---

## 📡 Serial Protocol (Arduino Nano)

The Flask backend converts joint movements into standard serial commands:

| Joint | Prefix | Example Output |
| :--- | :---: | :--- |
| Base | `B` | `B120` |
| Shoulder | `S` | `S75` |
| Elbow | `E` | `E45` |
| Gripper | `G` | `G30` |

---

## 🎓 Stage Status
- **Current Stage**: 5.5 (Simulation Mode on Laptop / Raspberry Pi)
- **Next Stage**: Connect Arduino Nano via USB with PySerial
