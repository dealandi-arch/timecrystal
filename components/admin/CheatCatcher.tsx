'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import ReplayViewer from './ReplayViewer';
import type { Replay } from '../rpg/replay';
import { formatTime } from '../profile/formatTime';

interface ReportRow {
  id: number;
  profileId: string;
  player: string;
  levelName: string;
  timeMs: number;
  reason: string;
  status: string;
  createdAt: string;
  hasReplay: boolean;
}

const STATUS_LABEL: Record<string, string> = { open: 'Refused', review: 'Counted, check it', confirmed: 'Cheating confirmed', cleared: 'Cleared' };

// The Cheat catcher's reports for admins: runs it refused, records that look suspicious, and a scan of old records.
export default function CheatCatcher() {
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/reports?status=${tab}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    setNotReady(!!data.notReady);
    setReports(data.reports ?? []);
  }, [tab]);

  useEffect(() => {
    setReports(null);
    load();
  }, [load]);

  async function scan() {
    setScanning(true);
    setMessage(null);
    const res = await fetch('/api/admin/scan', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setScanning(false);
    setMessage(res.ok ? `Scanned ${data.scanned} records: ${data.suspicious} look suspicious, ${data.newReports} new report${data.newReports === 1 ? '' : 's'}.` : data?.error ?? 'Scan failed.');
    load();
  }

  return (
    <section className="cheat-catcher">
      <h2>🚨 Cheat catcher</h2>
      <p className="gacha-fine">
        Every run is checked as it’s sent in. Refused runs and suspicious records show up here with their replay. Scan the records already on the lists to
        catch older cheating.
      </p>
      <div className="rank3d-tabs">
        <button className={tab === 'todo' ? 'on' : ''} onClick={() => setTab('todo')}>
          To review
        </button>
        <button className={tab === 'done' ? 'on' : ''} onClick={() => setTab('done')}>
          Decided
        </button>
        <button className="ability-btn" onClick={scan} disabled={scanning}>
          {scanning ? 'Scanning…' : '🔎 Scan all records'}
        </button>
      </div>
      {message && <p className="event-ok">{message}</p>}
      {notReady && <p className="event-error">The Cheat catcher isn’t set up yet. Run the latest supabase/schema.sql.</p>}
      {reports === null ? (
        <p>Loading…</p>
      ) : reports.length === 0 ? (
        <p>{tab === 'todo' ? 'Nothing to review. 🎉' : 'No decided reports yet.'}</p>
      ) : (
        <div className="report-list">
          {reports.map((r) => (
            <Link key={r.id} href={`/admin/reports/${r.id}`} className={`report-row status-${r.status}`}>
              <strong>
                #{r.id} · {r.player} · {r.levelName} · {formatTime(r.timeMs)}
              </strong>
              <span className="report-status">{STATUS_LABEL[r.status] ?? r.status}</span>
              <span className="report-reason">{r.reason}</span>
              <small>
                {new Date(r.createdAt).toLocaleString()} · {r.hasReplay ? '🎬 replay' : 'no replay'}
              </small>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function ReportView({ id }: { id: number }) {
  const [report, setReport] = useState<{
    id: number;
    profileId: string;
    player: string;
    levelName: string;
    timeMs: number;
    reason: string;
    status: string;
    createdAt: string;
    replay: Replay | null;
    level: { grid: number[][]; start: { x: number; y: number }; enemies: { x: number; y: number; hp: number }[]; crystalPath: { x: number; y: number }[] } | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/reports/${id}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data?.error ?? 'Could not load the report.');
    else setReport(data.report);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(decision: 'confirm' | 'clear') {
    const res = await fetch(`/api/admin/reports/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data?.error ?? 'That didn’t work.');
    else {
      setDone(decision === 'confirm' ? `Confirmed as cheating. The player has been warned${data.removed ? ' and the time removed' : ''}.` : 'Cleared: not cheating.');
      load();
    }
  }

  if (error) return <p className="event-error">{error}</p>;
  if (!report) return <p>Loading…</p>;
  return (
    <div className="report-view">
      <h2>
        Report #{report.id}: <Link href={`/profiles/${report.profileId}`}>{report.player}</Link> on {report.levelName}
      </h2>
      <p>
        <strong>{formatTime(report.timeMs)}</strong> · {STATUS_LABEL[report.status] ?? report.status} · {new Date(report.createdAt).toLocaleString()}
      </p>
      <p className="report-reason">
        <strong>How it was caught:</strong> {report.reason}
      </p>
      <ReplayViewer replay={report.replay} level={report.level} claimedMs={report.timeMs} />
      {done && <p className="event-ok">{done}</p>}
      {(report.status === 'open' || report.status === 'review') && (
        <p className="report-decide">
          <button className="ability-btn notice-confirm" onClick={() => window.confirm('Confirm this was cheating? The player is warned and, if this time is on a list, it’s removed.') && decide('confirm')}>
            🚫 Confirm cheat
          </button>
          <button className="ability-btn story-skip" onClick={() => decide('clear')}>
            ✓ Not cheating
          </button>
        </p>
      )}
    </div>
  );
}
