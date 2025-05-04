const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let documentText = "";
let cursors = {};

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Real-Time Collaborative Editor</title>
      <style>
        body { font-family: sans-serif; }
        #editor { width: 100%; height: 80vh; font-size: 16px; }
        .cursor-label {
          position: absolute;
          background: rgba(0,0,0,0.1);
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h2>Collaborative Editor</h2>
      <textarea id="editor" placeholder="Start typing..."></textarea>
      <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
      <script>
        const socket = io();
        const editor = document.getElementById("editor");
        const username = prompt("Enter your name:");
        socket.emit("register", username);

        let localChange = false;

        // On initialization
        socket.on("init", ({ text }) => {
          editor.value = text;
        });

        // On remote text change
        socket.on("text-change", (text) => {
          localChange = true;
          editor.value = text;
          localChange = false;
        });

        // On editor input
        editor.addEventListener("input", () => {
          if (!localChange) {
            socket.emit("text-change", editor.value);
          }
        });

        // Send cursor position
        editor.addEventListener("keyup", () => {
          socket.emit("cursor-move", editor.selectionStart);
        });

        // Receive others' cursor updates
        socket.on("cursor-update", ({ user, position }) => {
          console.log(\`\${user} cursor at: \${position}\`);
        });
      </script>
    </body>
    </html>
  `);
});

io.on("connection", (socket) => {
  let user = "Anonymous";

  socket.on("register", (username) => {
    user = username || "Anonymous";
    console.log(\`\${user} connected\`);
    socket.emit("init", { text: documentText });
  });

  socket.on("text-change", (newText) => {
    documentText = newText;
    socket.broadcast.emit("text-change", newText);
  });

  socket.on("cursor-move", (position) => {
    cursors[socket.id] = { user, position };
    socket.broadcast.emit("cursor-update", { user, position });
  });

  socket.on("disconnect", () => {
    delete cursors[socket.id];
    console.log(\`\${user} disconnected\`);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(\`Collaborative editor running at http://localhost:\${PORT}\`);
});
