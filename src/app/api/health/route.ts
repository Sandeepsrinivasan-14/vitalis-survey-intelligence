import { getSurvey } from '@/lib/survey/dataset';

export const dynamic = 'force-dynamic';

/** Liveness/readiness probe for load balancers and Docker. Reveals nothing sensitive. */
export function GET() {
  let ready = true;
  try {
    ready = getSurvey().records.length > 0;
  } catch {
    ready = false;
  }
  return Response.json(
    { status: ready ? 'ok' : 'degraded', uptimeSeconds: Math.round(process.uptime()) },
    { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
