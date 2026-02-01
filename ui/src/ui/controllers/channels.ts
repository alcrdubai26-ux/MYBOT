import type { ChannelsStatusSnapshot } from "../types";
import type { ChannelsState } from "./channels.types";

export type { ChannelsState };

async function fetchApi(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function loadChannels(state: ChannelsState, probe: boolean) {
  if (state.channelsLoading) return;
  state.channelsLoading = true;
  state.channelsError = null;
  try {
    if (state.client && state.connected) {
      const res = (await state.client.request("channels.status", {
        probe,
        timeoutMs: 8000,
      })) as ChannelsStatusSnapshot;
      state.channelsSnapshot = res;
    } else {
      const res = await fetchApi("/channels/status");
      state.channelsSnapshot = res;
    }
    state.channelsLastSuccess = Date.now();
  } catch (err) {
    state.channelsError = String(err);
  } finally {
    state.channelsLoading = false;
  }
}

export async function startWhatsAppLogin(state: ChannelsState, force: boolean) {
  if (state.whatsappBusy) return;
  state.whatsappBusy = true;
  try {
    let res: { message?: string; qrDataUrl?: string; qr?: string };
    if (state.client && state.connected) {
      res = (await state.client.request("web.login.start", {
        force,
        timeoutMs: 30000,
      })) as { message?: string; qrDataUrl?: string };
    } else {
      res = await fetchApi("/channels/whatsapp/start", {
        method: "POST",
        body: JSON.stringify({ force }),
      });
    }
    state.whatsappLoginMessage = res.message ?? null;
    state.whatsappLoginQrDataUrl = res.qrDataUrl ?? res.qr ?? null;
    state.whatsappLoginConnected = null;
  } catch (err) {
    state.whatsappLoginMessage = String(err);
    state.whatsappLoginQrDataUrl = null;
    state.whatsappLoginConnected = null;
  } finally {
    state.whatsappBusy = false;
  }
}

export async function waitWhatsAppLogin(state: ChannelsState) {
  if (state.whatsappBusy) return;
  state.whatsappBusy = true;
  try {
    let res: { connected?: boolean; message?: string };
    if (state.client && state.connected) {
      res = (await state.client.request("web.login.wait", {
        timeoutMs: 120000,
      })) as { connected?: boolean; message?: string };
    } else {
      res = await fetchApi("/channels/whatsapp/wait", {
        method: "POST",
      });
    }
    state.whatsappLoginMessage = res.message ?? null;
    state.whatsappLoginConnected = res.connected ?? null;
    if (res.connected) state.whatsappLoginQrDataUrl = null;
  } catch (err) {
    state.whatsappLoginMessage = String(err);
    state.whatsappLoginConnected = null;
  } finally {
    state.whatsappBusy = false;
  }
}

export async function logoutWhatsApp(state: ChannelsState) {
  if (state.whatsappBusy) return;
  state.whatsappBusy = true;
  try {
    if (state.client && state.connected) {
      await state.client.request("channels.logout", { channel: "whatsapp" });
    } else {
      await fetchApi("/channels/whatsapp/logout", { method: "POST" });
    }
    state.whatsappLoginMessage = "Logged out.";
    state.whatsappLoginQrDataUrl = null;
    state.whatsappLoginConnected = null;
  } catch (err) {
    state.whatsappLoginMessage = String(err);
  } finally {
    state.whatsappBusy = false;
  }
}
