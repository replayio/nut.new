
// FIXME ping telemetry server directly instead of going through the backend.
// We do this to work around CORS insanity.
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
