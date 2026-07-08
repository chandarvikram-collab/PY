import { logger } from "./logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  if (!payload.token || !payload.token.startsWith("ExponentPushToken")) {
    return;
  }

  const message = {
    to: payload.token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  };

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      logger.warn({ status: res.status, token: payload.token.slice(0, 20) }, "Expo push returned non-OK status");
      return;
    }

    const json = (await res.json()) as { data?: { status: string; message?: string } };
    const result = json?.data;
    if (result?.status === "error") {
      logger.warn({ message: result.message, token: payload.token.slice(0, 20) }, "Expo push delivery error");
    }
  } catch (err) {
    logger.error({ err }, "Failed to send Expo push notification");
  }
}

export async function sendPushNotifications(payloads: PushPayload[]): Promise<void> {
  await Promise.allSettled(payloads.map(sendPushNotification));
}
