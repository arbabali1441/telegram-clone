import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function Telegram() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [userStatus, setUserStatus] = useState("Online");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatEndRef = useRef(null);
  const [activeChat, setActiveChat] = useState("Saved Messages");
  const [rooms, setRooms] = useState(["Saved Messages", "Global Community", "Tech Talk"]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    socket.emit("join_room", activeChat);
    socket.on("load_history", (h) => setMessages(h));
    socket.on("receive_message", (d) => {
      if (d.room === activeChat) setMessages((p) => [...p, d]);
    });
    socket.on("update_poll", (d) => {
      setMessages((p) =>
        p.map((m) => (m.id === d.messageId ? { ...m, pollData: d.pollData } : m))
      );
    });
    socket.on("update_pin", (d) => {
      setMessages((p) =>
        p.map((m) => (m.id === d.messageId ? { ...m, pinned: d.pinned } : m))
      );
    });
    socket.on("remove_message", (d) => {
      setMessages((p) => p.filter((m) => m.id !== d.messageId));
    });
    return () => {
      socket.off("load_history");
      socket.off("receive_message");
      socket.off("update_poll");
      socket.off("update_pin");
      socket.off("remove_message");
    };
  }, [activeChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setAudioUrl(reader.result);
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => setFileData(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() && !audioUrl && !fileData) return;
    socket.emit("send_message", {
      id: Date.now().toString(),
      sender: "You",
      text: text.trim() || null,
      audio: audioUrl,
      fileData,
      fileName,
      pinned: 0,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      room: activeChat,
    });
    setText("");
    setAudioUrl(null);
    setFileData(null);
    setFileName("");
  };

  const createPoll = (e) => {
    e.preventDefault();
    if (!pollQuestion.trim()) return;
    const validOpts = pollOptions.filter((o) => o.trim()).map((t) => ({ text: t, votes: 0 }));
    const pollData = { question: pollQuestion.trim(), options: validOpts, totalVotes: 0 };
    socket.emit("send_message", {
      id: Date.now().toString(),
      sender: "You",
      text: "📊 Poll",
      pollData,
      pinned: 0,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      room: activeChat,
    });
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowPollModal(false);
  };

  const handleVote = (messageId, optionIndex) => {
    socket.emit("vote_poll", { messageId, optionIndex, room: activeChat });
  };

  const handlePin = (messageId, currentPinned) => {
    const newPinned = currentPinned ? 0 : 1;
    socket.emit("pin_message", { messageId, pinned: newPinned, room: activeChat });
  };

  const handleDelete = (messageId) => {
    if (window.confirm("Delete this message?")) {
      socket.emit("delete_message", { messageId, room: activeChat });
    }
  };

  const pinnedMessage = messages.find((m) => m.pinned === 1);

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0e1621", color: "#fff", fontFamily: "sans-serif" }}>
      <div style={{ width: "300px", borderRight: "1px solid #17212b", background: "#17212b", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "15px" }}>
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "10px", background: "#242f3d", border: "none", borderRadius: "8px", color: "#fff", outline: "none" }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {rooms.map((r) => (
            <div
              key={r}
              onClick={() => setActiveChat(r)}
              style={{ padding: "12px 15px", cursor: "pointer", background: activeChat === r ? "#2b5278" : "transparent" }}
            >
              {r === "Saved Messages" ? "⭐ Saved Messages" : r}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "15px", background: "#17212b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: "600" }}>{activeChat === "Saved Messages" ? "⭐ Saved Messages (Cloud Storage)" : activeChat}</div>
          <button onClick={() => setShowPollModal(true)} style={{ background: "#5288c1", border: "none", padding: "6px 12px", borderRadius: "6px", color: "#fff", cursor: "pointer" }}>
            Create Poll
          </button>
        </div>

        {pinnedMessage && (
          <div style={{ background: "#17212b", padding: "8px 16px", borderBottom: "1px solid #242f3d", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#5288c1", fontWeight: "bold" }}>📌 Pinned:</span>
              <span style={{ color: "#a2b5c7" }}>{pinnedMessage.pollData ? pinnedMessage.pollData.question : pinnedMessage.fileName || pinnedMessage.text}</span>
            </div>
            <button onClick={() => handlePin(pinnedMessage.id, 1)} style={{ background: "transparent", border: "none", color: "#ff5252", cursor: "pointer", fontSize: "12px" }}>Unpin</button>
          </div>
        )}

        <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          {messages.map((m) => (
            <div key={m.id} style={{ alignSelf: "flex-end", background: "#2b5278", padding: "10px", borderRadius: "8px", maxWidth: "60%", position: "relative" }}>
              {m.pollData ? (
                <div>
                  <div style={{ fontWeight: "600", marginBottom: "6px" }}>📊 {m.pollData.question}</div>
                  {m.pollData.options.map((opt, idx) => {
                    const pct = m.pollData.totalVotes > 0 ? Math.round((opt.votes / m.pollData.totalVotes) * 100) : 0;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleVote(m.id, idx)}
                        style={{ background: "#242f3d", padding: "6px", borderRadius: "4px", marginBottom: "4px", cursor: "pointer" }}
                      >
                        {opt.text} - {pct}% ({opt.votes})
                      </div>
                    );
                  })}
                </div>
              ) : m.audio ? (
                <audio controls src={m.audio} style={{ width: "220px" }} />
              ) : m.fileData ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📄</span>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600" }}>{m.fileName}</div>
                    <a href={m.fileData} download={m.fileName} style={{ fontSize: "11px", color: "#a2b5c7" }}>Download</a>
                  </div>
                </div>
              ) : (
                <div>{m.text}</div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px", fontSize: "11px" }}>
                <span onClick={() => handlePin(m.id, m.pinned)} style={{ cursor: "pointer" }} title="Pin">📌</span>
                <span onClick={() => handleDelete(m.id)} style={{ cursor: "pointer", color: "#ff5252" }} title="Delete">🗑️</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {fileData && (
          <div style={{ padding: "10px 15px", background: "#17212b", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "#a2b5c7" }}>File selected: {fileName}</span>
            <button onClick={() => { setFileData(null); setFileName(""); }} style={{ background: "transparent", border: "none", color: "#ff5252", cursor: "pointer" }}>Remove</button>
          </div>
        )}

        {audioUrl && (
          <div style={{ padding: "10px 15px", background: "#17212b", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "#a2b5c7" }}>Voice Note ready:</span>
            <audio controls src={audioUrl} style={{ height: "30px" }} />
            <button onClick={() => setAudioUrl(null)} style={{ background: "transparent", border: "none", color: "#ff5252", cursor: "pointer" }}>Discard</button>
          </div>
        )}

        {showPollModal && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <form onSubmit={createPoll} style={{ background: "#17212b", padding: "20px", borderRadius: "8px", width: "300px" }}>
              <input
                type="text"
                placeholder="Question"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                style={{ width: "100%", padding: "8px", marginBottom: "10px", background: "#242f3d", color: "#fff", border: "none" }}
              />
              {pollOptions.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={"Option " + (idx + 1)}
                  value={opt}
                  onChange={(e) => {
                    const n = [...pollOptions];
                    n[idx] = e.target.value;
                    setPollOptions(n);
                  }}
                  style={{ width: "100%", padding: "6px", marginBottom: "6px", background: "#242f3d", color: "#fff", border: "none" }}
                />
              ))}
              <button type="submit" style={{ width: "100%", padding: "8px", background: "#5288c1", color: "#fff", border: "none", cursor: "pointer" }}>Publish</button>
              <button type="button" onClick={() => setShowPollModal(false)} style={{ width: "100%", padding: "8px", background: "#ff5252", color: "#fff", border: "none", cursor: "pointer", marginTop: "6px" }}>Cancel</button>
            </form>
          </div>
        )}

        <form onSubmit={handleSend} style={{ padding: "15px", background: "#17212b", display: "flex", gap: "10px", alignItems: "center" }}>
          <label style={{ cursor: "pointer", fontSize: "20px", color: "#a2b5c7" }} title="Attach File">
            📁
            <input type="file" onChange={handleFileChange} style={{ display: "none" }} />
          </label>
          {isRecording ? (
            <button type="button" onClick={stopRecording} style={{ background: "#ff5252", border: "none", borderRadius: "50%", width: "40px", height: "40px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Stop Recording">⏹️</button>
          ) : (
            <button type="button" onClick={startRecording} style={{ background: "#242f3d", border: "none", borderRadius: "50%", width: "40px", height: "40px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Record Voice Note">🎤</button>
          )}
          <input
            type="text"
            placeholder="Write a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ flex: 1, padding: "10px", background: "#242f3d", border: "none", borderRadius: "8px", color: "#fff", outline: "none" }}
          />
          <button type="submit" style={{ padding: "0 20px", background: "#5288c1", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer" }}>Send</button>
        </form>
      </div>
    </div>
  );
}
