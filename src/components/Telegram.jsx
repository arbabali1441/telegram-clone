import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
const socket = io("http://localhost:5000");

export default function Telegram() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [myUsername, setMyUsername] = useState("Coach Ali");
  const [userStatus, setUserStatus] = useState("Online");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [typingUser, setTypingUser] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatEndRef = useRef(null);
  const [activeChat, setActiveChat] = useState("Saved Messages");
  const [rooms, setRooms] = useState(["Saved Messages", "Global Community", "Tech Talk"]);
  const [searchQuery, setSearchQuery] = useState("");
  const emojis = ["👍", "❤️", "🔥", "😂", "👏", "🎉"];

  useEffect(() => {
    socket.emit("join_room", activeChat || "Saved Messages");
    setTypingUser(""); setReplyingTo(null); setForwardingMessage(null); setShowChatSearch(false); setChatSearchQuery("");
    socket.on("load_history", (h) => setMessages(h || []));
    socket.on("receive_message", (d) => { if (d && d.room === activeChat) setMessages((p) => [...p, d]); });
    socket.on("update_poll", (d) => { if(d) setMessages((p) => p.map((m) => m.id === d.messageId ? { ...m, pollData: d.pollData } : m)); });
    socket.on("update_pin", (d) => { if(d) setMessages((p) => p.map((m) => m.id === d.messageId ? { ...m, pinned: d.pinned } : m)); });
    socket.on("update_reaction", (d) => { if(d) setMessages((p) => p.map((m) => m.id === d.messageId ? { ...m, reactions: d.reactions } : m)); });
    socket.on("remove_message", (d) => { if(d) setMessages((p) => p.filter((m) => m.id !== d.messageId)); });
    socket.on("display_typing", (d) => { if (d && d.room === activeChat) setTypingUser("typing..."); });
    socket.on("hide_typing", (d) => { if (d && d.room === activeChat) setTypingUser(""); });
    return () => { socket.off("load_history"); socket.off("receive_message"); socket.off("update_poll"); socket.off("update_pin"); socket.off("update_reaction"); socket.off("remove_message"); socket.off("display_typing"); socket.off("hide_typing"); };
  }, [activeChat]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typingUser]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    socket.emit("typing", { room: activeChat });
    clearTimeout(window.tTimer);
    window.tTimer = setTimeout(() => { socket.emit("stop_typing", { room: activeChat }); }, 1000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = () => {
        const reader = new FileReader();
        reader.onloadend = () => setAudioUrl(reader.result);
        reader.readAsDataURL(new Blob(audioChunksRef.current, { type: "audio/webm" }));
      };
      mediaRecorderRef.current.start(); setIsRecording(true);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const roomName = newRoomName.trim();
    if (!rooms.includes(roomName)) setRooms([...rooms, roomName]);
    setActiveChat(roomName);
    setNewRoomName("");
    setShowNewChatModal(false);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() && !image && !audioUrl && !fileData) return;
    socket.emit("stop_typing", { room: activeChat });
    socket.emit("send_message", {
      id: Date.now().toString(), sender: myUsername, text: text.trim() || null, image, audio: audioUrl, fileData, fileName, pinned: 0, reactions: {}, seen: true,
      replyTo: replyingTo ? { text: replyingTo.text || replyingTo.fileName || "Attachment", sender: replyingTo.sender } : null,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), room: activeChat
    });
    setText(""); setImage(null); setAudioUrl(null); setFileData(null); setFileName(""); setReplyingTo(null);
  };

  const createPoll = (e) => {
    e.preventDefault();
    if (!pollQuestion.trim()) return;
    socket.emit("send_message", {
      id: Date.now().toString(), sender: myUsername, text: "📊 Poll",
      pollData: { question: pollQuestion.trim(), options: pollOptions.filter(o => o.trim()).map(t => ({ text: t, votes: 0 })), totalVotes: 0 },
      pinned: 0, reactions: {}, seen: true, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), room: activeChat
    });
    setPollQuestion(""); setPollOptions(["", ""]); setShowPollModal(false);
  };

  const handleForwardToRoom = (targetRoom) => {
    if (!forwardingMessage) return;
    socket.emit("send_message", {
      id: Date.now().toString(), sender: myUsername, text: forwardingMessage.text, image: forwardingMessage.image, audio: forwardingMessage.audio,
      fileData: forwardingMessage.fileData, fileName: forwardingMessage.fileName, pollData: forwardingMessage.pollData, forwardedFrom: forwardingMessage.sender,
      pinned: 0, reactions: {}, seen: true, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), room: targetRoom
    });
    setForwardingMessage(null); setActiveChat(targetRoom);
  };

  const pinnedMessage = messages && messages.find ? messages.find((m) => m && m.pinned === 1) : null;
  const filteredMessages = messages && messages.filter ? messages.filter(m => {
    if (!chatSearchQuery.trim()) return true;
    const q = chatSearchQuery.toLowerCase();
    return (m.text && m.text.toLowerCase().includes(q)) || (m.fileName && m.fileName.toLowerCase().includes(q)) || (m.sender && m.sender.toLowerCase().includes(q));
  }) : [];

  const theme = isDarkMode ? {
    bg: "#0e1621", sidebarBg: "#17212b", chatBg: "#0e1621", panelBg: "#17212b", border: "#202b36", text: "#f5f5f5", textMuted: "#8696a7",
    myMsgBg: "#2b5278", otherMsgBg: "#18222d", inputBg: "#242f3d", accent: "#5288c1", hoverBg: "#202b36", iconColor: "#8696a7"
  } : {
    bg: "#ffffff", sidebarBg: "#f8f9fa", chatBg: "#efeae2", panelBg: "#ffffff", border: "#e5e7eb", text: "#111827", textMuted: "#6b7280",
    myMsgBg: "#eeffde", otherMsgBg: "#ffffff", inputBg: "#f1f3f5", accent: "#3390ec", hoverBg: "#f1f3f5", iconColor: "#707579"
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: theme.bg, color: theme.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", position: "relative", overflow: "hidden" }}>
      {inCall && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
          <div style={{ fontSize: "22px", fontWeight: "600", marginBottom: "8px", color: "#fff" }}>{callType === "video" ? "Video Call" : "Voice Call"} with {activeChat}</div>
          <div style={{ fontSize: "14px", color: "#a2b5c7", marginBottom: "30px" }}>Secure Peer Connection Established</div>
          <div style={{ width: callType === "video" ? "540px" : "0px", height: callType === "video" ? "340px" : "0px", background: "#17212b", borderRadius: "16px", marginBottom: "30px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", border: "1px solid #242f3d", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            {callType === "video" ? "Camera Stream Active" : ""}
          </div>
          <button onClick={() => setInCall(false)} style={{ background: "#ff3b30", border: "none", padding: "12px 30px", borderRadius: "30px", color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "15px", boxShadow: "0 4px 15px rgba(255,59,48,0.4)" }}>End Call</button>
        </div>
      )}

      {showProfileModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <div style={{ background: theme.panelBg, padding: "28px", borderRadius: "16px", width: "340px", border: "1px solid " + theme.border, boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "18px", color: theme.accent }}>Profile Settings</div>
            <div style={{ marginBottom: "8px", fontSize: "13px", color: theme.textMuted, fontWeight: "500" }}>Display Name</div>
            <input type="text" value={myUsername} onChange={(e) => setMyUsername(e.target.value)} style={{ width: "100%", padding: "12px 14px", background: theme.inputBg, border: "1px solid " + theme.border, borderRadius: "10px", color: theme.text, marginBottom: "18px", outline: "none", fontSize: "14px" }} />
            <div style={{ marginBottom: "8px", fontSize: "13px", color: theme.textMuted, fontWeight: "500" }}>Status</div>
            <select value={userStatus} onChange={(e) => setUserStatus(e.target.value)} style={{ width: "100%", padding: "12px 14px", background: theme.inputBg, border: "1px solid " + theme.border, borderRadius: "10px", color: theme.text, marginBottom: "24px", outline: "none", fontSize: "14px" }}>
              <option value="Online">Online</option>
              <option value="Busy">Busy</option>
              <option value="Away">Away</option>
              <option value="Offline">Offline</option>
            </select>
            <button onClick={() => setShowProfileModal(false)} style={{ width: "100%", padding: "12px", background: theme.accent, border: "none", borderRadius: "10px", color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>Save Profile</button>
          </div>
        </div>
      )}

      {showNewChatModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <form onSubmit={handleCreateRoom} style={{ background: theme.panelBg, padding: "28px", borderRadius: "16px", width: "340px", border: "1px solid " + theme.border, boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "18px", color: theme.accent }}>New Chat / Room</div>
            <input type="text" placeholder="Enter room or chat name..." value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} style={{ width: "100%", padding: "12px 14px", background: theme.inputBg, border: "1px solid " + theme.border, borderRadius: "10px", color: theme.text, marginBottom: "18px", outline: "none", fontSize: "14px" }} />
            <button type="submit" style={{ width: "100%", padding: "12px", background: theme.accent, border: "none", borderRadius: "10px", color: "#fff", fontWeight: "600", cursor: "pointer", marginBottom: "10px", fontSize: "14px" }}>Create / Join</button>
            <button type="button" onClick={() => setShowNewChatModal(false)} style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid " + theme.border, borderRadius: "10px", color: "#ff3b30", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
          </form>
        </div>
      )}

      {forwardingMessage && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <div style={{ background: theme.panelBg, padding: "28px", borderRadius: "16px", width: "360px", border: "1px solid " + theme.border, boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: theme.accent }}>Forward Message to...</div>
            <div style={{ maxHeight: "220px", overflowY: "auto", marginBottom: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {rooms.map((r) => (<div key={r} onClick={() => handleForwardToRoom(r)} style={{ padding: "12px 14px", borderRadius: "10px", background: theme.inputBg, cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>{r}</div>))}
            </div>
            <button onClick={() => setForwardingMessage(null)} style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid " + theme.border, borderRadius: "10px", color: "#ff3b30", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={{ width: "320px", borderRight: "1px solid " + theme.border, background: theme.sidebarBg, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid " + theme.border }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#fff", fontSize: "15px" }}>{myUsername.charAt(0)}</div>
            <div>
              <div style={{ fontWeight: "600", fontSize: "15px" }}>{myUsername}</div>
              <div style={{ fontSize: "12px", color: "#34c759", fontWeight: "500" }}>● {userStatus}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background: theme.inputBg, border: "none", width: "34px", height: "34px", borderRadius: "50%", color: theme.iconColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Toggle Theme">
              {isDarkMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              )}
            </button>
            <button onClick={() => setShowProfileModal(true)} style={{ background: theme.inputBg, border: "none", width: "34px", height: "34px", borderRadius: "50%", color: theme.iconColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </div>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", gap: "8px" }}>
          <input type="text" placeholder="Search chats..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, padding: "10px 14px", background: theme.inputBg, border: "none", borderRadius: "20px", color: theme.text, outline: "none", fontSize: "14px" }} />
          <button onClick={() => setShowNewChatModal(true)} style={{ background: theme.accent, border: "none", width: "38px", height: "38px", borderRadius: "50%", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }} title="New Chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
          {rooms.filter(r => r.toLowerCase().includes(searchQuery.toLowerCase())).map((r) => (
            <div key={r} onClick={() => setActiveChat(r)} style={{ padding: "12px 16px", borderRadius: "12px", cursor: "pointer", background: activeChat === r ? theme.accent : "transparent", color: activeChat === r ? "#fff" : theme.text, marginBottom: "4px", fontWeight: activeChat === r ? "600" : "400", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "18px" }}>{r === "Saved Messages" ? "⭐" : "💬"}</span>
              <div style={{ fontSize: "14px" }}>{r}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: theme.chatBg }}>
        {/* Chat Header */}
        <div style={{ padding: "14px 24px", background: theme.panelBg, borderBottom: "1px solid " + theme.border, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#2b5278", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#fff" }}>{activeChat.charAt(0)}</div>
            <div>
              <div style={{ fontWeight: "600", fontSize: "15px" }}>{activeChat === "Saved Messages" ? "⭐ Saved Messages (Cloud Storage)" : activeChat}</div>
              <div style={{ fontSize: "12px", color: theme.textMuted, fontWeight: "500" }}>{typingUser || "last seen recently"}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => { setCallType("voice"); setInCall(true); }} style={{ background: theme.inputBg, border: "none", width: "36px", height: "36px", borderRadius: "50%", color: theme.iconColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Voice Call">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </button>
            <button onClick={() => { setCallType("video"); setInCall(true); }} style={{ background: theme.inputBg, border: "none", width: "36px", height: "36px", borderRadius: "50%", color: theme.iconColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Video Call">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            </button>
            <button onClick={() => { setShowChatSearch(!showChatSearch); setChatSearchQuery(""); }} style={{ background: theme.inputBg, border: "none", width: "36px", height: "36px", borderRadius: "50%", color: theme.iconColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Search Messages">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
            <button onClick={() => setShowPollModal(true)} style={{ background: theme.accent, border: "none", padding: "8px 16px", borderRadius: "20px", color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>Create Poll</button>
          </div>
        </div>

        {showChatSearch && (
          <div style={{ background: theme.panelBg, padding: "10px 20px", borderBottom: "1px solid " + theme.border, display: "flex", gap: "10px", alignItems: "center" }}>
            <input type="text" placeholder="Search in current chat..." value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} style={{ flex: 1, padding: "10px 14px", background: theme.inputBg, border: "none", borderRadius: "20px", color: theme.text, outline: "none", fontSize: "14px" }} />
            <button onClick={() => { setShowChatSearch(false); setChatSearchQuery(""); }} style={{ background: "transparent", border: "none", color: "#ff3b30", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>✕</button>
          </div>
        )}

        {pinnedMessage && (
          <div style={{ background: theme.panelBg, padding: "10px 20px", borderBottom: "1px solid " + theme.border, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: theme.accent, fontWeight: "bold" }}>📌 Pinned:</span>
              <span style={{ color: theme.textMuted }}>{pinnedMessage.pollData ? pinnedMessage.pollData.question : pinnedMessage.fileName || pinnedMessage.text}</span>
            </div>
            <button onClick={() => socket.emit("pin_message", { messageId: pinnedMessage.id, pinned: 0, room: activeChat })} style={{ background: "transparent", border: "none", color: "#ff3b30", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>Unpin</button>
          </div>
        )}

        {/* Message List */}
        <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredMessages && filteredMessages.map && filteredMessages.map((m) => (
            <div key={m.id} style={{ alignSelf: m.sender === myUsername ? "flex-end" : "flex-start", background: m.sender === myUsername ? theme.myMsgBg : theme.otherMsgBg, color: m.sender === myUsername && !isDarkMode ? "#111827" : theme.text, padding: "10px 14px", borderRadius: "14px", maxWidth: "60%", position: "relative", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
              <div style={{ fontSize: "12px", color: theme.accent, fontWeight: "600", marginBottom: "3px" }}>{m.sender}</div>
              {m.forwardedFrom && (<div style={{ fontSize: "11px", color: theme.textMuted, marginBottom: "4px" }}>↗️ Forwarded from {m.forwardedFrom}</div>)}
              {m.replyTo && (
                <div style={{ background: "rgba(0,0,0,0.15)", borderLeft: "3px solid " + theme.accent, padding: "6px 10px", borderRadius: "6px", marginBottom: "6px", fontSize: "12px" }}>
                  <div style={{ color: theme.accent, fontWeight: "600" }}>{m.replyTo.sender}</div>
                  <div style={{ color: theme.textMuted }}>{m.replyTo.text}</div>
                </div>
              )}
              {m.pollData ? (
                <div>
                  <div style={{ fontWeight: "600", marginBottom: "8px" }}>📊 {m.pollData.question}</div>
                  {m.pollData.options && m.pollData.options.map((opt, idx) => {
                    const pct = m.pollData.totalVotes > 0 ? Math.round((opt.votes / m.pollData.totalVotes) * 100) : 0;
                    return (<div key={idx} onClick={() => socket.emit("vote_poll", { messageId: m.id, optionIndex: idx, room: activeChat })} style={{ background: theme.inputBg, padding: "8px 10px", borderRadius: "8px", marginBottom: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500", border: "1px solid " + theme.border }}>{opt.text} - {pct}% ({opt.votes})</div>);
                  })}
                </div>
              ) : m.image ? (<img src={m.image} alt="upload" style={{ maxWidth: "100%", borderRadius: "8px", marginBottom: "4px" }} />) : m.audio ? (<audio controls src={m.audio} style={{ width: "240px" }} />) : m.fileData ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontSize: "20px" }}>📄</span><div><div style={{ fontSize: "13px", fontWeight: "600" }}>{m.fileName}</div><a href={m.fileData} download={m.fileName} style={{ fontSize: "11px", color: theme.accent, textDecoration: "none", fontWeight: "500" }}>Download File</a></div></div>
              ) : (<div style={{ fontSize: "14px", lineHeight: "1.4", wordBreak: "break-word" }}>{m.text}</div>)}

              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                {m.reactions && Object.entries(m.reactions).map(([emoji, count]) => (count > 0 && (<span key={emoji} onClick={() => socket.emit("add_reaction", { messageId: m.id, emoji, room: activeChat })} style={{ fontSize: "12px", background: "rgba(0,0,0,0.25)", padding: "2px 8px", borderRadius: "12px", cursor: "pointer", color: "#fff" }}>{emoji} {count}</span>)))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "11px", color: theme.textMuted, gap: "15px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>{m.time} {m.sender === myUsername && <span style={{ color: "#34c759", fontWeight: "bold" }}>✓✓</span>}</span>
                <div style={{ display: "flex", gap: "10px", opacity: 0.8 }}>
                  <span onClick={() => setForwardingMessage(m)} style={{ cursor: "pointer" }} title="Forward">↗️</span>
                  <span onClick={() => socket.emit("pin_message", { messageId: m.id, pinned: m.pinned ? 0 : 1, room: activeChat })} style={{ cursor: "pointer" }} title="Pin">📌</span>
                  <span onClick={() => setReplyingTo(m)} style={{ cursor: "pointer" }} title="Reply">↩️</span>
                  <span onClick={() => { if (window.confirm("Delete message?")) socket.emit("delete_message", { messageId: m.id, room: activeChat }); }} style={{ cursor: "pointer", color: "#ff3b30" }} title="Delete">🗑️</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                {emojis.map((emoji) => (<span key={emoji} onClick={() => socket.emit("add_reaction", { messageId: m.id, emoji, room: activeChat })} style={{ cursor: "pointer", fontSize: "14px", padding: "2px 4px", borderRadius: "4px", background: theme.inputBg }} title={emoji}>{emoji}</span>))}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {image && (<div style={{ padding: "10px 24px", background: theme.panelBg, display: "flex", alignItems: "center", gap: "12px", borderTop: "1px solid " + theme.border }}><span style={{ fontSize: "13px", color: theme.textMuted }}>Image attached</span><button onClick={() => setImage(null)} style={{ background: "transparent", border: "none", color: "#ff3b30", cursor: "pointer", fontWeight: "600" }}>Remove</button></div>)}
        {fileData && (<div style={{ padding: "10px 24px", background: theme.panelBg, display: "flex", alignItems: "center", gap: "12px", borderTop: "1px solid " + theme.border }}><span style={{ fontSize: "13px", color: theme.textMuted }}>File: {fileName}</span><button onClick={() => { setFileData(null); setFileName(""); }} style={{ background: "transparent", border: "none", color: "#ff3b30", cursor: "pointer", fontWeight: "600" }}>Remove</button></div>)}
        {audioUrl && (<div style={{ padding: "10px 24px", background: theme.panelBg, display: "flex", alignItems: "center", gap: "12px", borderTop: "1px solid " + theme.border }}><span style={{ fontSize: "13px", color: theme.textMuted }}>Voice Note ready:</span><audio controls src={audioUrl} style={{ height: "30px" }} /><button onClick={() => setAudioUrl(null)} style={{ background: "transparent", border: "none", color: "#ff3b30", cursor: "pointer", fontWeight: "600" }}>Discard</button></div>)}

        {replyingTo && (
          <div style={{ padding: "10px 24px", background: theme.panelBg, borderTop: "1px solid " + theme.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "13px" }}><span style={{ color: theme.accent, fontWeight: "600" }}>Replying to {replyingTo.sender}: </span><span style={{ color: theme.textMuted }}>{replyingTo.text || replyingTo.fileName || "Attachment"}</span></div>
            <button onClick={() => setReplyingTo(null)} style={{ background: "transparent", border: "none", color: "#ff3b30", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>✕</button>
          </div>
        )}

        {showPollModal && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <form onSubmit={createPoll} style={{ background: theme.panelBg, padding: "28px", borderRadius: "16px", width: "340px", border: "1px solid " + theme.border, boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
              <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: theme.accent }}>Create a Poll</div>
              <input type="text" placeholder="Ask a question..." value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} style={{ width: "100%", padding: "12px 14px", background: theme.inputBg, border: "1px solid " + theme.border, borderRadius: "10px", color: theme.text, marginBottom: "12px", outline: "none", fontSize: "14px" }} />
              {pollOptions.map((opt, idx) => (<input key={idx} type="text" placeholder={"Option " + (idx + 1)} value={opt} onChange={(e) => { const n = [...pollOptions]; n[idx] = e.target.value; setPollOptions(n); }} style={{ width: "100%", padding: "10px 14px", background: theme.inputBg, border: "1px solid " + theme.border, borderRadius: "10px", color: theme.text, marginBottom: "8px", outline: "none", fontSize: "14px" }} />))}
              <button type="submit" style={{ width: "100%", padding: "12px", background: theme.accent, color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", marginTop: "10px", fontSize: "14px" }}>Publish Poll</button>
              <button type="button" onClick={() => setShowPollModal(false)} style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid " + theme.border, borderRadius: "10px", color: "#ff3b30", fontWeight: "600", cursor: "pointer", marginTop: "8px", fontSize: "14px" }}>Cancel</button>
            </form>
          </div>
        )}

        {/* Pro Input Bar with Telegram SVG Icons */}
        <form onSubmit={handleSend} style={{ padding: "12px 24px", background: theme.panelBg, borderTop: "1px solid " + theme.border, display: "flex", gap: "12px", alignItems: "center" }}>
          <label style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "50%", background: theme.inputBg, color: theme.iconColor }} title="Attach Image">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onloadend = () => setImage(r.result); r.readAsDataURL(f); } }} style={{ display: "none" }} />
          </label>
          <label style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "50%", background: theme.inputBg, color: theme.iconColor }} title="Attach File">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
            <input type="file" onChange={(e)=>{ const f = e.target.files[0]; if(f){ setFileName(f.name); const r = new FileReader(); r.onloadend = () => setFileData(r.result); r.readAsDataURL(f); } }} style={{ display: "none" }} />
          </label>
          
          {isRecording ? (
            <button type="button" onClick={stopRecording} style={{ background: "#ff3b30", border: "none", borderRadius: "50%", width: "40px", height: "40px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Stop Recording">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>
            </button>
          ) : (
            <button type="button" onClick={startRecording} style={{ background: theme.inputBg, border: "none", borderRadius: "50%", width: "40px", height: "40px", color: theme.iconColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Record Voice Note">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
          )}

          <input type="text" placeholder="Write a message..." value={text} onChange={handleTextChange} style={{ flex: 1, padding: "12px 18px", background: theme.inputBg, border: "none", borderRadius: "24px", color: theme.text, outline: "none", fontSize: "14px" }} />
          
          <button type="submit" style={{ background: theme.accent, border: "none", borderRadius: "50%", width: "42px", height: "42px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(51,144,236,0.3)" }} title="Send Message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translateX(1px)" }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
    </div>
  );
}