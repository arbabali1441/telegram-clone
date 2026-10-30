<div align="center">

# 🚀 Telegram Web Clone (Pro Edition)

<img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-b7ef-4f15-b707-86541f710f73.gif" width="100">

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

*A high-performance, real-time, and modern Telegram Web (Z-Version) clone built with enterprise-level architecture and sleek UI/UX.*

</div>

---

### 📺 Live Project Video Demo

[![Telegram Web Clone Demo](https://img.youtube.com/vi/5vRhr4sikyM/maxresdefault.jpg)](https://youtu.be/5vRhr4sikyM "Watch Telegram Web Clone Demo")

> 💡 **Click the image above** to watch the full HD video demonstration of real-time messaging, voice notes, polls, and SQLite features in action!


## 📸 App Screenshots Preview

### 1. Authentication / Login Screen
<div align="center">
  <img width="517" height="640" alt="Screenshot from 2026-10-29 14-40-51" src="https://github.com/user-attachments/assets/2eb6ce9b-21f3-419c-85e4-d0ab30b20689" />

</div>

### 2. Main Workspace & Chat Dashboard
<div align="center">
  <img width="1366" height="768" alt="Screenshot from 2026-10-29 14-56-09" src="https://github.com/user-attachments/assets/8769203d-3a42-4eea-8166-1aedeed5b932" />
</div>

---

## ✨ Key Features & Capabilities

| Feature Category | Pro Implementation Details | Status |
| :--- | :--- | :--- |
| **Real-Time Messaging** | Instant bi-directional messaging powered by Socket.IO and permanent SQLite storage. | ✅ Completed |
| **Rich Media & Files** | Image preview, document sharing with download links, and voice note recording (`MediaRecorder API`). | ✅ Completed |
| **Interactive Polls** | Live voting mechanism with dynamic percentage breakdown and real-time state synchronization. | ✅ Completed |
| **Message Management** | Pin/Unpin banners, emoji reactions, reply quotes, forwarding, and secure message deletion. | ✅ Completed |
| **Pro UI / UX Design** | Authentic Telegram Desktop SVG vector icons, smooth Dark/Light theme toggles, and live typing indicators. | ✅ Completed |
| **Voice & Video Calls** | Integrated mock/peer connection call interfaces with immersive overlay backdrops. | ✅ Completed |

---

## 🛠️ Tech Stack & Architecture Blueprint

- **Frontend (Client)**: React.js, Vite, Modular Styling, Socket.IO Client
- **Backend (Server)**: Node.js, Express, Socket.IO Server Engine
- **Database Layer**: SQLite3 Relational Database (Persistent Message Store)

---

## 📂 Project Structure

- `server/index.js`: Express & Socket.IO server + SQLite persistence handlers
- `server/telegram.db`: Local persistent database file
- `src/components/Telegram.jsx`: High-performance core client interface
- `src/App.jsx`: Root wrapper component
- `src/main.jsx`: Vite entry point
- `package.json`: Dependency configurations
- `README.md`: Project documentation

---

## 🚀 Getting Started Locally

To run this project locally, follow these steps:

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/your-username/telegram-web-clone.git](https://github.com/your-username/telegram-web-clone.git)
   cd telegram-web-clone
   
2. **Install Dependencies:**
   ```bash
    npm install
    
3.**Start Server and Frontend Simultaneously:**
   ```bash
  node server/index.js & npm start
  ```



**🗺️ Development Roadmap**
```

Phase 1: Core chat rooms and WebSocket integration.

Phase 2: SQLite persistence layer & pro SVG icons upgrade.

Phase 3: True WebRTC peer-to-peer secure audio/video streams using STUN/TURN servers.

Phase 4: JWT Authentication and multi-user private 1-on-1 secret chats.
```


🤝 Support & Contact
```
If you have any questions or suggestions, feel free to connect with me on GitHub and drop a direct message!
