import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { getCurrentSpan, wrapWithSpan } from '~/lib/.server/otel';

export async function action(args: ActionFunctionArgs) {
  return pingTelemetryAction(args);
}

const pingTelemetryAction = wrapWithSpan(
  {
    name: "ping-telemetry",
  },
  async function pingTelemetryAction({ context, request }: ActionFunctionArgs) {
    const { event, data } = await request.json<{
      event: string;
      data: any;
    }>();

    console.log("PingTelemetry", event, data);

    const span = getCurrentSpan();
    span?.setAttributes({
      "telemetry.event": event,
      "telemetry.data": data,
    });

    return json({ success: true });
  }
);
