const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require('sqlite3').verbose();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const db = new sqlite3.Database('./telegram.db', (err) => {
  if (err) console.error('Database error: ', err.message);
});

db.run(`CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room TEXT,
  sender TEXT,
  text TEXT,
  image TEXT,
  audio TEXT,
  fileData TEXT,
  fileName TEXT,
  pinned INTEGER,
  reactions TEXT,
  replyTo TEXT,
  forwardedFrom TEXT,
  pollData TEXT,
  time TEXT
)`);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join_room", (room) => {
    socket.join(room);
    db.all(`SELECT * FROM messages WHERE room = ?`, [room], (err, rows) => {
      if (!err && rows) {
        const history = rows.map(r => ({
          ...r,
          reactions: r.reactions ? JSON.parse(r.reactions) : {},
          replyTo: r.replyTo ? JSON.parse(r.replyTo) : null,
          pollData: r.pollData ? JSON.parse(r.pollData) : null
        }));
        socket.emit("load_history", history);
      } else {
        socket.emit("load_history", []);
      }
    });
  });

  socket.on("send_message", (data) => {
    if (!data || !data.room) return;
    const { id, room, sender, text, image, audio, fileData, fileName, pinned, reactions, replyTo, forwardedFrom, pollData, time } = data;
    
    db.run(`INSERT OR REPLACE INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, room, sender, text, image, audio, fileData, fileName, pinned || 0, JSON.stringify(reactions || {}), JSON.stringify(replyTo || null), forwardedFrom || null, JSON.stringify(pollData || null), time],
      (err) => {
        if (!err) {
          io.to(room).emit("receive_message", data);
        } else {
          console.error("DB Insert error:", err);
        }
      }
    );
  });

  socket.on("vote_poll", ({ messageId, optionIndex, room }) => {
    db.get(`SELECT pollData FROM messages WHERE id = ?`, [messageId], (err, row) => {
      if (!err && row && row.pollData) {
        let pData = JSON.parse(row.pollData);
        if (pData && pData.options && pData.options[optionIndex]) {
          pData.options[optionIndex].votes += 1;
          pData.totalVotes = (pData.totalVotes || 0) + 1;
          db.run(`UPDATE messages SET pollData = ? WHERE id = ?`, [JSON.stringify(pData), messageId], (err2) => {
            if (!err2) io.to(room).emit("update_poll", { messageId, pollData: pData });
          });
        }
      }
    });
  });

  socket.on("pin_message", ({ messageId, pinned, room }) => {
    if (pinned === 0) {
      db.run(`UPDATE messages SET pinned = 0 WHERE room = ?`, [room], () => {
        io.to(room).emit("update_pin", { messageId, pinned: 0 });
      });
    } else {
      db.run(`UPDATE messages SET pinned = 0 WHERE room = ?`, [room], () => {
        db.run(`UPDATE messages SET pinned = 1 WHERE id = ?`, [messageId], () => {
          io.to(room).emit("update_pin", { messageId, pinned: 1 });
        });
      });
    }
  });

  socket.on("add_reaction", ({ messageId, emoji, room }) => {
    db.get(`SELECT reactions FROM messages WHERE id = ?`, [messageId], (err, row) => {
      if (!err && row) {
        let rxn = row.reactions ? JSON.parse(row.reactions) : {};
        rxn[emoji] = (rxn[emoji] || 0) + 1;
        db.run(`UPDATE messages SET reactions = ? WHERE id = ?`, [JSON.stringify(rxn), messageId], (err2) => {
          if (!err2) io.to(room).emit("update_reaction", { messageId, reactions: rxn });
        });
      }
    });
  });

  socket.on("delete_message", ({ messageId, room }) => {
    db.run(`DELETE FROM messages WHERE id = ?`, [messageId], (err) => {
      if (!err) io.to(room).emit("remove_message", { messageId });
    });
  });

  socket.on("typing", ({ room }) => socket.to(room).emit("display_typing", { room }));
  socket.on("stop_typing", ({ room }) => socket.to(room).emit("hide_typing", { room }));

  socket.on("disconnect", () => {});
});

server.listen(5000, () => console.log("Server running on port 5000"));
