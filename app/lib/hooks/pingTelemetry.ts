// FIXME ping telemetry server directly instead of going through the backend.

import { getNutLoginKey } from '~/lib/replay/Problems';

// We do this to work around CORS insanity.
export async function pingTelemetry(event: string, data: any) {
  const requestBody: any = {
    event: 'NutChat.' + event,
    data,
  };

  await fetch('/api/ping-telemetry', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
}

// Manage telemetry events for a single chat message.

export class ChatMessageTelemetry {
  id: string;
  numMessages: number;

  constructor(numMessages: number) {
    this.id = Math.random().toString(36).substring(2, 15);
    this.numMessages = numMessages;
    this._ping('StartMessage');
  }

  private _ping(event: string, data: any = {}) {
    pingTelemetry(event, {
      ...data,
      loginKey: getNutLoginKey(),
      messageId: this.id,
      numMessages: this.numMessages,
    });
  }

  finish() {
    this._ping('FinishMessage');
  }

  abort(reason: string) {
    this._ping('AbortMessage', { reason });
  }

  startSimulation() {
    this._ping('StartSimulation');
  }

  endSimulation(status: string) {
    this._ping('EndSimulation', { status });
  }

  sendPrompt(simulationStatus: string) {
    this._ping('SendPrompt', { simulationStatus });
  }
}
