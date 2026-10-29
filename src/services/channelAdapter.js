/**
 * ChannelAdapter Interface for incoming and outgoing message handling.
 *
 * Designed to cleanly abstract chat platforms (e.g. WhatsApp Cloud API / Twilio)
 * so that adding a real WhatsApp webhook later only requires swapping this adapter
 * without touching the conversation state machine or domain logic.
 */
export class ChannelAdapter {
  /**
   * Transforms raw inbound channel payload into standardized { userId, text }
   */
  receive(rawPayload) {
    throw new Error('receive() must be implemented by adapter subclass');
  }

  /**
   * Dispatches a message to the external user
   */
  send(userId, text, extraMetadata = {}) {
    throw new Error('send() must be implemented by adapter subclass');
  }
}

/**
 * Local in-memory adapter used for the in-browser WhatsApp simulation.
 */
export class LocalChatAdapter extends ChannelAdapter {
  constructor(onMessageSent) {
    super();
    this.onMessageSent = onMessageSent || (() => {});
  }

  receive(rawPayload) {
    if (typeof rawPayload === 'string') {
      return { userId: 'local-demo-user', text: rawPayload };
    }
    return {
      userId: rawPayload.userId || 'local-demo-user',
      text: rawPayload.text || '',
    };
  }

  send(userId, text, extraMetadata = {}) {
    this.onMessageSent({
      id: 'bot-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      sender: 'bot',
      userId,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...extraMetadata,
    });
  }
}
