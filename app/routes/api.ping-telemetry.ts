import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';

async function pingTelemetry(event: string, data: any): Promise<boolean> {
  console.log('PingTelemetry', event, data);

  try {
    const response = await fetch('https://telemetry.replay.io/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event, ...data }),
    });

    if (!response.ok) {
      console.error(`Telemetry request returned unexpected status: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Telemetry request failed:', error);
    return false;
  }
}

export async function action(args: ActionFunctionArgs) {
  return pingTelemetryAction(args);
}

async function pingTelemetryAction({ request }: ActionFunctionArgs) {
  const { event, data } = await request.json<{
    event: string;
    data: any;
  }>();

  const success = await pingTelemetry(event, data);

  return json({ success });
}
