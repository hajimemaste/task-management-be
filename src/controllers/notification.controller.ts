import * as notificationService from "../services/notification.service";
import { Request, Response } from "express";

export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.user!.id.toString();
  const data = await notificationService.getNotificationsByUser(userId);
  res.json(data);
};

export const markAsRead = async (req: Request, res: Response) => {
  await notificationService.markNotificationAsRead(req.params.id.toString());
  res.json({ success: true });
};

export const getUnreadCount = async (req: Request, res: Response) => {
  const userId = req.user!.id.toString();

  const count = await notificationService.countUnreadNotifications(userId);
  res.json({ count });
};

export const getAllNotifications = async (req: Request, res: Response) => {
  const data = await notificationService.getAllNotificationsForAdmin();
  res.json(data);
};
