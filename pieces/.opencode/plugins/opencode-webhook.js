/**
 * OpenCode plugin: forwards session events to OpenPieces webhook for real-time UI.
 * Set OPENPIECES_WEBHOOK_URL (e.g. http://app:3000/api/opencode/webhook) in env.
 */
export const OpenPiecesWebhookPlugin = async () => {
  const webhookUrl = process.env.OPENPIECES_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[opencode-webhook] OPENPIECES_WEBHOOK_URL not set, plugin disabled");
    return {};
  }

  return {
    event: async ({ event }) => {
      const sessionId =
        event.properties?.sessionID ??
        event.properties?.session_id ??
        event.sessionID ??
        event.session_id;
      if (!sessionId) return;

      const payload = {
        type: event.type,
        sessionId,
        ...event,
      };

      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error("[opencode-webhook] Failed to POST event:", err.message);
      });
    },
  };
};
