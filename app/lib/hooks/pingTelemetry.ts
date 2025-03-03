
// FIXME ping telemetry server directly instead of going through the server.
export async function pingTelemetry(event: string, data: any) {
  const requestBody: any = {
    event,
    data,
  };

  await fetch('/api/ping-telemetry', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
}
