const fs = require('fs');
const code = `import React, { useState, useEffect, useRef } from "react";
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
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [myUsername, setMyUsername] = useState("You");
  const [userStatus, setUserStatus] = useState("Online");
  const [typingUser, setTypingUser] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatEndRef = useRef(null);
  const [activeChat, setActiveChat] = useState("Saved Messages");
  const [rooms, setRooms] = useState(["Saved Messages", "Global Community", "Tech Talk"]);
  const [searchQuery, setSearchQuery] = useState("");
  const emojis = ["👍", "❤️", "🔥", "😂", "👏"];

  useEffect(() => {
    socket.emit("join_room", activeChat || "Saved Messages");
    setTypingUser(""); setReplyingTo(null); setForwardingMessage(null);
    socket.on("load_history", (h) => setMessages(h || []));
    socket.on("receive_message", (d) => { if (d && d.room === activeChat) setMessages((p) => [...p, d]); });
    socket.on("update_poll", (d) => { if(d) setMessages((p) => p.map((m) => m.id === d.messageId ? { ...m, pollData: d.pollData } : m)); });
    socket.on("update_pin", (d) => { if(d) setMessages((p) => p.map((m) => m.id === d.messageId ? { ...m, pinned: d.pinned } : m)); });
    socket.on("update_reaction", (d) => { if(d) setMessages((p) => p.map((m) => m.id === d.messageId ? { ...m, reactions: d.reactions } : m)); });
    socket.on("remove_message", (d) => { if(d) setMessages((p) => p.filter((m) => m.id !== d.messageId)); });
    socket.on("display_typing", (d) => { if (d && d.room === activeChat) setTypingUser("Someone is typing..."); });
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

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() && !image && !audioUrl && !fileData) return;
    socket.emit("stop_typing", { room: activeChat });
    socket.emit("send_message", {
      id: Date.now().toString(), sender: myUsername, text: text.trim() || null, image, audio: audioUrl, fileData, fileName, pinned: 0, reactions: {},
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
      pinned: 0, reactions: {}, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), room: activeChat
    });
    setPollQuestion(""); setPollOptions(["", ""]); setShowPollModal(false);
  };

  const handleForwardToRoom = (targetRoom) => {
    if (!forwardingMessage) return;
    socket.emit("send_message", {
      id: Date.now().toString(), sender: myUsername, text: forwardingMessage.text, image: forwardingMessage.image, audio: forwardingMessage.audio,
      fileData: forwardingMessage.fileData, fileName: forwardingMessage.fileName, pollData: forwardingMessage.pollData, forwardedFrom: forwardingMessage.sender,
      pinned: 0, reactions: {}, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), room: targetRoom
    });
    setForwardingMessage(null); setActiveChat(targetRoom);
  };

  const pinnedMessage = messages && messages.find ? messages.find((m) => m && m.pinned === 1) : null;

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0e1621", color: "#fff", fontFamily: "sans-serif", position: "relative" }}>
      {showProfileModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#17212b", padding: "25px", borderRadius: "12px", width: "320px", border: "1px solid #242f3d" }}>
            <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "15px", color: "#5288c1" }}>👤 Profile Settings</div>
            <div style={{ marginBottom: "12px", fontSize: "13px", color: "#a2b5c7" }}>Display Name</div>
            <input type="text" value={myUsername} onChange={(e) => setMyUsername(e.target.value)} style={{ width: "100%", padding: "10px", background: "#242f3d", border: "none", borderRadius: "8px", color: "#fff", marginBottom: "15px", outline: "none" }} />
            <button onClick={() => setShowProfileModal(false)} style={{ width: "100%", padding: "10px", background: "#5288c1", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "600", cursor: "pointer" }}>Save Profile</button>
          </div>
        </div>
      )}

      {forwardingMessage && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#17212b", padding: "25px", borderRadius: "12px", width: "350px", border: "1px solid #242f3d" }}>
            <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "15px", color: "#5288c1" }}>Forward Message to...</div>
            <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "15px" }}>
              {rooms.map((r) => (<div key={r} onClick={() => handleForwardToRoom(r)} style={{ padding: "10px 12px", borderRadius: "6px", background: "#242f3d", marginBottom: "6px", cursor: "pointer", fontSize: "14px" }}>{r}</div>))}
            </div>
            <button onClick={() => setForwardingMessage(null)} style={{ width: "100%", padding: "10px", background: "#ff5252", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ width: "300px", borderRight: "1px solid #17212b", background: "#17212b", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #242f3d" }}>
          <div style={{ fontWeight: "600", fontSize: "15px" }}>Telegram Web</div>
          <button onClick={() => setShowProfileModal(true)} style={{ background: "#242f3d", border: "none", padding: "6px 10px", borderRadius: "6px", color: "#fff", cursor: "pointer", fontSize: "12px" }}>⚙️ Settings</button>
        </div>
        <div style={{ padding: "12px 15px" }}><input type="text" placeholder="Search rooms..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "10px", background: "#242f3d", border: "none", borderRadius: "8px", color: "#fff", outline: "none" }} /></div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {rooms.filter(r => r.toLowerCase().includes(searchQuery.toLowerCase())).map((r) => (<div key={r} onClick={() => setActiveChat(r)} style={{ padding: "12px 15px", cursor: "pointer", background: activeChat === r ? "#2b5278" : "transparent" }}>{r === "Saved Messages" ? "⭐ Saved Messages" : r}</div>))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "15px", background: "#17212b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: "600" }}>{activeChat === "Saved Messages" ? "⭐ Saved Messages (Cloud Storage)" : activeChat}</div>
            <div style={{ fontSize: "12px", color: "#6c7883" }}>{typingUser || userStatus}</div>
          </div>
          <button onClick={() => setShowPollModal(true)} style={{ background: "#5288c1", border: "none", padding: "6px 12px", borderRadius: "6px", color: "#fff", cursor: "pointer" }}>Create Poll</button>
        </div>

        {pinnedMessage && (
          <div style={{ background: "#17212b", padding: "8px 16px", borderBottom: "1px solid #242f3d", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#5288c1", fontWeight: "bold" }}>📌 Pinned:</span>
              <span style={{ color: "#a2b5c7" }}>{pinnedMessage.pollData ? pinnedMessage.pollData.question : pinnedMessage.fileName || pinnedMessage.text}</span>
            </div>
            <button onClick={() => socket.emit("pin_message", { messageId: pinnedMessage.id, pinned: 0, room: activeChat })} style={{ background: "transparent", border: "none", color: "#ff5252", cursor: "pointer", fontSize: "12px" }}>Unpin</button>
          </div>
        )}

        <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages && messages.map && messages.map((m) => (
            <div key={m.id} style={{ alignSelf: m.sender === myUsername ? "flex-end" : "flex-start", background: m.sender === myUsername ? "#2b5278" : "#18222d", padding: "10px 14px", borderRadius: "12px", maxWidth: "60%", position: "relative" }}>
              <div style={{ fontSize: "11px", color: "#5288c1", fontWeight: "600", marginBottom: "2px" }}>{m.sender}</div>
              {m.forwardedFrom && (<div style={{ fontSize: "11px", color: "#a2b5c7", marginBottom: "4px" }}>↗️ Forwarded from {m.forwardedFrom}</div>)}
              {m.replyTo && (
                <div style={{ background: "rgba(0,0,0,0.25)", borderLeft: "3px solid #5288c1", padding: "4px 8px", borderRadius: "4px", marginBottom: "6px", fontSize: "12px" }}>
                  <div style={{ color: "#5288c1", fontWeight: "600" }}>{m.replyTo.sender}</div>
                  <div style={{ color: "#a2b5c7" }}>{m.replyTo.text}</div>
                </div>
              )}
              {m.pollData ? (
                <div>
                  <div style={{ fontWeight: "600", marginBottom: "6px" }}>📊 {m.pollData.question}</div>
                  {m.pollData.options && m.pollData.options.map((opt, idx) => {
                    const pct = m.pollData.totalVotes > 0 ? Math.round((opt.votes / m.pollData.totalVotes) * 100) : 0;
                    return (<div key={idx} onClick={() => socket.emit("vote_poll", { messageId: m.id, optionIndex: idx, room: activeChat })} style={{ background: "#242f3d", padding: "6px", borderRadius: "4px", marginBottom: "4px", cursor: "pointer" }}>{opt.text} - {pct}% ({opt.votes})</div>);
                  })}
                </div>
              ) : m.image ? (<img src={m.image} alt="upload" style={{ maxWidth: "100%", borderRadius: "6px", marginBottom: "4px" }} />) : m.audio ? (<audio controls src={m.audio} style={{ width: "220px" }} />) : m.fileData ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span>📄</span><div><div style={{ fontSize: "13px", fontWeight: "600" }}>{m.fileName}</div><a href={m.fileData} download={m.fileName} style={{ fontSize: "11px", color: "#a2b5c7" }}>Download</a></div></div>
              ) : (<div>{m.text}</div>)}

              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                {m.reactions && Object.entries(m.reactions).map(([emoji, count]) => (count > 0 && (<span key={emoji} onClick={() => socket.emit("add_reaction", { messageId: m.id, emoji, room: activeChat })} style={{ fontSize: "11px", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "10px", cursor: "pointer" }}>{emoji} {count}</span>)))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "11px", color: "#a2b5c7" }}>
                <span>{m.time}</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <span onClick={() => setForwardingMessage(m)} style={{ cursor: "pointer" }} title="Forward">↗️</span>
                  <span onClick={() => socket.emit("pin_message", { messageId: m.id, pinned: m.pinned ? 0 : 1, room: activeChat })} style={{ cursor: "pointer" }} title="Pin">📌</span>
                  <span onClick={() => setReplyingTo(m)} style={{ cursor: "pointer" }} title="Reply">↩️</span>
                  <span onClick={() => { if (window.confirm("Delete message?")) socket.emit("delete_message", { messageId: m.id, room: activeChat }); }} style={{ cursor: "pointer", color: "#ff5252" }} title="Delete">🗑️</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                {emojis.map((emoji) => (<span key={emoji} onClick={() => socket.emit("add_reaction", { messageId: m.id, emoji, room: activeChat })} style={{ cursor: "pointer", fontSize: "13px" }} title={emoji}>{emoji}</span>))}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {image && (<div style={{ padding: "10px 15px", background: "#17212b", display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontSize: "13px", color: "#a2b5c7" }}>Image selected</span><button onClick={() => setImage(null)} style={{ background: "transparent", border: "none", color: "#ff5252", cursor: "pointer" }}>Remove</button></div>)}
        {fileData && (<div style={{ padding: "10px 15px", background: "#17212b", display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontSize: "13px", color: "#a2b5c7" }}>File: {fileName}</span><button onClick={() => { setFileData(null); setFileName(""); }} style={{ background: "transparent", border: "none", color: "#ff5252", cursor: "pointer" }}>Remove</button></div>)}
        {audioUrl && (<div style={{ padding: "10px 15px", background: "#17212b", display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontSize: "13px", color: "#a2b5c7" }}>Voice Note ready:</span><audio controls src={audioUrl} style={{ height: "30px" }} /><button onClick={() => setAudioUrl(null)} style={{ background: "transparent", border: "none", color: "#ff5252", cursor: "pointer" }}>Discard</button></div>)}

        {replyingTo && (
          <div style={{ padding: "8px 15px", background: "#17212b", borderTop: "1px solid #242f3d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "12px" }}><span style={{ color: "#5288c1", fontWeight: "600" }}>Replying to {replyingTo.sender}: </span><span style={{ color: "#a2b5c7" }}>{replyingTo.text || replyingTo.fileName || "Attachment"}</span></div>
            <button onClick={() => setReplyingTo(null)} style={{ background: "transparent", border: "none", color: "#ff5252", cursor: "pointer", fontSize: "14px" }}>✕</button>
          </div>
        )}

        {showPollModal && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <form onSubmit={createPoll} style={{ background: "#17212b", padding: "20px", borderRadius: "8px", width: "300px" }}>
              <input type="text" placeholder="Question" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "10px", background: "#242f3d", color: "#fff", border: "none" }} />
              {pollOptions.map((opt, idx) => (<input key={idx} type="text" placeholder={"Option " + (idx + 1)} value={opt} onChange={(e) => { const n = [...pollOptions]; n[idx] = e.target.value; setPollOptions(n); }} style={{ width: "100%", padding: "6px", marginBottom: "6px", background: "#242f3d", color: "#fff", border: "none" }} />))}
              <button type="submit" style={{ width: "100%", padding: "8px", background: "#5288c1", color: "#fff", border: "none", cursor: "pointer" }}>Publish</button>
              <button type="button" onClick={() => setShowPollModal(false)} style={{ width: "100%", padding: "8px", background: "#ff5252", color: "#fff", border: "none", cursor: "pointer", marginTop: "6px" }}>Cancel</button>
            </form>
          </div>
        )}

        <form onSubmit={handleSend} style={{ padding: "15px", background: "#17212b", display: "flex", gap: "10px", alignItems: "center" }}>
          <label style={{ cursor: "pointer", fontSize: "20px", color: "#a2b5c7" }} title="Attach Image">📎<input type="file" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onloadend = () => setImage(r.result); r.readAsDataURL(f); } }} style={{ display: "none" }} /></label>
          <label style={{ cursor: "pointer", fontSize: "20px", color: "#a2b5c7" }} title="Attach File">📁<input type="file" onChange={(e)=>{ const f = e.target.files[0]; if(f){ setFileName(f.name); const r = new FileReader(); r.onloadend = () => setFileData(r.result); r.readAsDataURL(f); } }} style={{ display: "none" }} /></label>
          {isRecording ? (<button type="button" onClick={stopRecording} style={{ background: "#ff5252", border: "none", borderRadius: "50%", width: "40px", height: "40px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Stop Recording">⏹️</button>) : (<button type="button" onClick={startRecording} style={{ background: "#242f3d", border: "none", borderRadius: "50%", width: "40px", height: "40px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Record Voice Note">🎤</button>)}
          <input type="text" placeholder="Write a message..." value={text} onChange={handleTextChange} style={{ flex: 1, padding: "10px", background: "#242f3d", border: "none", borderRadius: "8px", color: "#fff", outline: "none" }} />
          <button type="submit" style={{ padding: "0 20px", background: "#5288c1", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer" }}>Send</button>
        </form>
      </div>
    </div>
  );
}`;
fs.writeFileSync("src/components/Telegram.jsx", code);
console.log("Updated Telegram.jsx with Profile Settings.");
