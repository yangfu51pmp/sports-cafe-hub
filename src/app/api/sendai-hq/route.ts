import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import {
  SENDAI_ISOLATION_CONFIG,
  SendaiHqState,
  DEFAULT_SENDAI_HQ_STATE,
  SiteScoutRecord,
  CampLeadRecord,
  FinancialSimInput,
} from '../../../lib/sendai-hq/types-and-defaults';

const STATE_KEY = `${SENDAI_ISOLATION_CONFIG.redisKeyPrefix}:state`;

async function loadHqState(): Promise<SendaiHqState> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const res = await fetch(`${url}/get/${encodeURIComponent(STATE_KEY)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as { result?: string | null };
        if (data.result) {
          return JSON.parse(data.result) as SendaiHqState;
        }
      }
    } catch {
      // Fallback to local file if Redis unreachable
    }
  }

  try {
    const raw = await readFile(SENDAI_ISOLATION_CONFIG.localFallbackFile, 'utf8');
    return JSON.parse(raw) as SendaiHqState;
  } catch {
    return DEFAULT_SENDAI_HQ_STATE;
  }
}

async function saveHqState(nextState: SendaiHqState): Promise<void> {
  const stamped: SendaiHqState = {
    ...nextState,
    updatedAt: new Date().toISOString(),
  };

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      await fetch(`${url}/set/${encodeURIComponent(STATE_KEY)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(stamped),
      });
    } catch {
      // Continue writing local backup as well
    }
  }

  try {
    await writeFile(
      SENDAI_ISOLATION_CONFIG.localFallbackFile,
      JSON.stringify(stamped, null, 2),
      'utf8'
    );
  } catch {
    // Ignore read-only fs in serverless if Redis succeeded
  }
}

export async function GET() {
  const state = await loadHqState();
  return NextResponse.json({ ok: true, state });
}

interface PostPayload {
  action:
    | 'add_scout'
    | 'delete_scout'
    | 'save_sim'
    | 'add_camp_lead'
    | 'delete_camp_lead';
  scout?: Omit<SiteScoutRecord, 'id' | 'createdAt'>;
  id?: string;
  simInput?: FinancialSimInput;
  campLead?: Omit<CampLeadRecord, 'id' | 'createdAt'>;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PostPayload;
    const cur = await loadHqState();

    if (body.action === 'add_scout' && body.scout) {
      const item: SiteScoutRecord = {
        ...body.scout,
        id: `scout-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      cur.scouts = [item, ...cur.scouts];
    } else if (body.action === 'delete_scout' && body.id) {
      cur.scouts = cur.scouts.filter((s) => s.id !== body.id);
    } else if (body.action === 'save_sim' && body.simInput) {
      cur.simInput = body.simInput;
    } else if (body.action === 'add_camp_lead' && body.campLead) {
      const lead: CampLeadRecord = {
        ...body.campLead,
        id: `lead-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      cur.campLeads = [lead, ...cur.campLeads];
    } else if (body.action === 'delete_camp_lead' && body.id) {
      cur.campLeads = cur.campLeads.filter((l) => l.id !== body.id);
    }

    await saveHqState(cur);
    return NextResponse.json({ ok: true, state: cur });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
