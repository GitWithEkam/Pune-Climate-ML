import crypto from "node:crypto";
import nodemailer from "nodemailer";
import twilio from "twilio";

export class NotificationService {
  constructor({ config, store, jobQueue = null }) {
    this.config = config;
    this.store = store;
    this.jobQueue = jobQueue;
    this.mailer = config.smtp.host ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
    }) : null;
    this.sms = config.twilio.accountSid && config.twilio.authToken
      ? twilio(config.twilio.accountSid, config.twilio.authToken)
      : null;
  }

  async create({ userId, title, message, channels = ["in_app"], metadata = {} }) {
    if (!await this.store.getUser(userId)) {
      const error = new Error("Notification user not found");
      error.status = 404;
      throw error;
    }
    const notification = {
      id: crypto.randomUUID(), userId, title, message, channels, metadata,
      delivery: { in_app: "delivered", email: "not_requested", sms: "not_requested" },
      readAt: null, createdAt: new Date().toISOString(),
    };
    await this.store.saveNotification(notification);
    const outbound = channels.filter((channel) => channel !== "in_app");
    if (outbound.length) {
      if (this.jobQueue?.enabled) await this.jobQueue.addNotification({ notificationId: notification.id, userId, channels: outbound });
      else {
        try { await this.deliver(notification, outbound); }
        catch (error) {
          for (const channel of outbound) notification.delivery[channel] = "failed";
          notification.deliveryError = error.message;
          await this.store.saveNotification(notification);
        }
      }
    }
    return notification;
  }

  async deliver(notification, channels = notification.channels) {
    const user = await this.store.getUser(notification.userId);
    if (!user) throw new Error("Notification user not found");
    if (channels.includes("email")) {
      if (this.mailer && user.email) {
        await this.mailer.sendMail({ from: this.config.smtp.from, to: user.email, subject: notification.title, text: notification.message });
        notification.delivery.email = "delivered";
      } else notification.delivery.email = "not_configured";
    }
    if (channels.includes("sms")) {
      if (this.sms && user.phone && this.config.twilio.fromNumber) {
        await this.sms.messages.create({ from: this.config.twilio.fromNumber, to: user.phone, body: `${notification.title}: ${notification.message}` });
        notification.delivery.sms = "delivered";
      } else notification.delivery.sms = "not_configured";
    }
    await this.store.saveNotification(notification);
    return notification;
  }
}
