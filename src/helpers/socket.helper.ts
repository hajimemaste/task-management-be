import { getIO } from "../socket";

export const emitToUsers = (userIds: string[], event: string, data: any) => {
  const io = getIO();

  userIds.forEach((userId) => {
    io.to(userId).emit(event, data);
  });
};
