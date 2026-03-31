import { Server } from "socket.io";

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  console.log("🔥 Socket server initialized");

  io.on("connection", (socket) => {
    console.log(`🔌 Connected: ${socket.id}`);

    const userId = socket.handshake.auth?.userId;

    if (userId) {
      socket.join(userId);
      console.log(`👤 Auto join room: ${userId}`);
    }

    socket.on("disconnect", () => {
      console.log(`❌ Disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket chưa init");
  return io;
};
