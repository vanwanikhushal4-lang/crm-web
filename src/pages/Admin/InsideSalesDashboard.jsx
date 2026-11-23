import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, Headphones, Phone,
  PhoneCall, RefreshCw, Users,
} from 'lucide-react';
import { fetchInsideSalesList } from '../../api/Admin/SalespersonApi';
import { getCalls } from '../../api/apiFunctions/Login/Login_api_function';

const DAY_FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const CHART_DAY_FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const CALLS_PER_PAGE = 12;
const PANEL = 'rounded-2xl border border-white/10 bg-[#0c1220]';
const CONTROL = 'rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/50 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40';
const REACHED = new Set([
  'INTERESTED', 'NOT_INTERESTED', 'REQUESTED_MORE_INFO', 'REQUESTED_CALL_BACK',
  'MEETING_SCHEDULED', 'CONNECTED', 'ANSWERED',
]);

const OUTCOMES = [
  { label: 'Reached', color: '#34d399' },
  { label: 'No response / busy', color: '#fbbf24' },
  { label: 'Invalid number', color: '#fb7185' },
  { label: 'Missed', color: '#a78bfa' },
  { label: 'Other / unclassified', color: '#94a3b8' },
];

function dateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

function calendarDate(key) {
  return new Date(key + 'T12:00:00');
}

function shiftDay(key, offset) {
  const date = calendarDate(key);
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

function decodeList(response, key) {
  const list = [response, response?.data, response?.data?.data, response?.data?.[key], response?.[key]]
    .find(Array.isArray);
  if (!list) throw new Error('Unexpected ' + key + ' response');
  return list;
}

function buildRoster(users) {
  const roster = new Map();
  for (const user of users) {
    const id = String(user?.id ?? user?.userId ?? user?.user_id ?? user?.salesPersonId ?? user?.salespersonId ?? '').trim();
    if (!id) continue;
    const first = user.firstName || user.firstname || user.first_name || '';
    const last = user.lastName || user.lastname || user.last_name || '';
    const name = [first, last].join(' ').trim() || user.fullName || user.name || user.salesPersonName ||
      user.userName || user.username || user.email || 'Rep #' + id;
    roster.set(id, { id, name: String(name).trim() });
  }
  return roster;
}

function normalizeCode(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function callDay(call) {
  const raw = call.callDate || call.call_date || call.date || call.callTime ||
    call.startTime || call.createdDate || call.createdAt || call.timestamp;
  if (!raw) return '';
  const dateOnly = typeof raw === 'string' && raw.trim().match(/^\d{4}-\d{2}-\d{2}/);
  if (dateOnly) return dateOnly[0];
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : dateKey(date);
}

function indexTeamCalls(calls, roster) {
  const byDay = new Map();
  const seen = new Set();
  for (const call of calls) {
    if (!call) continue;
    const userId = String(call.userId ?? call.user_id ?? call.user?.id ?? call.assignedToId ??
      call.assignedTo?.id ?? call.assignedTo ?? call.salesman_id ?? call.salesmanId ??
      call.salesPersonId ?? call.salespersonId ?? call.salesManagerId ?? call.createdById ??
      call.createdBy?.id ?? call.createdBy ?? '').trim();
    const day = callDay(call);
    const id = call.id ?? call.callId;
    if (!roster.has(userId) || !day || (id != null && seen.has(String(id)))) continue;
    if (id != null) seen.add(String(id));
    const result = normalizeCode(call.callResult || call.outcome || call.status);
    const type = normalizeCode(call.callType || call.type);
    const reached = REACHED.has(result);
    const outcome = reached ? 0
      : ['NO_RESPONSE_BUSY', 'NO_RESPONSE', 'NO_ANSWER', 'BUSY', 'NOT_ANSWERED'].includes(result) ? 1
      : result === 'INVALID_NUMBER' ? 2
      : type === 'MISSED' || result === 'MISSED' ? 3 : 4;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push({
      key: id ?? day + '-' + byDay.get(day).length,
      userId,
      type,
      result,
      outcome,
      reached,
      booked: result === 'MEETING_SCHEDULED',
      subject: call.subject || call.title || call.companyName || call.accountName || call.customerName || 'Call',
      sortTime: Date.parse(call.callTime || call.startTime || call.createdAt || call.createdDate || '') || 0,
    });
  }
  return byDay;
}

function summarizeCalls(calls, roster) {
  const people = new Map([...roster].map(([id, rep]) => [id, { ...rep, calls: 0, reached: 0, booked: 0 }]));
  const outcomes = OUTCOMES.map(() => 0);
  let booked = 0;
  for (const call of calls) {
    const rep = people.get(call.userId);
    rep.calls += 1;
    rep.reached += Number(call.reached);
    rep.booked += Number(call.booked);
    outcomes[call.outcome] += 1;
    booked += Number(call.booked);
  }
  const contributions = [...people.values()].sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name));
  return { contributions, outcomes, booked, active: contributions.filter(rep => rep.calls > 0).length };
}

function percent(part, total) {
  return total ? Math.round(part / total * 100) : 0;
}

function showCode(code, fallback) {
  if (!code || code === 'NONE') return fallback;
  return code.toLowerCase().replaceAll('_', ' ').replace(/^\w/, char => char.toUpperCase());
}

function MetricCard({ label, value, detail, icon: Icon, tone }) {
  return (
    <div className={PANEL + ' flex items-start justify-between gap-3 p-5'}>
      <div>
        <div className="text-sm font-medium text-slate-400">{label}</div>
        <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-white">{value.toLocaleString('en-IN')}</div>
        <div className="mt-2 text-xs leading-5 text-slate-400">{detail}</div>
      </div>
      <div className={'rounded-xl p-2.5 ' + tone}><Icon size={19} aria-hidden="true" /></div>
    </div>
  );
}

export default function InsideSalesDashboard() {
  const today = dateKey(new Date());
  const [reportDate, setReportDate] = useState(null);
  const day = reportDate ?? today;
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [repFilter, setRepFilter] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([fetchInsideSalesList(), getCalls()])
      .then(([usersResponse, callsResponse]) => {
        if (!active) return;
        const roster = buildRoster(decodeList(usersResponse, 'users'));
        const byDay = indexTeamCalls(decodeList(callsResponse, 'calls'), roster);
        setData({ roster, byDay });
      })
      .catch(err => {
        if (!active) return;
        console.error('Inside Sales call report failed to load:', err);
        setError(true);
      });
    return () => { active = false; };
  }, [refresh]);

  const dailyCalls = data?.byDay.get(day);
  const stats = useMemo(() => data && summarizeCalls(dailyCalls ?? [], data.roster), [data, dailyCalls]);
  const callRows = useMemo(() => (dailyCalls ?? [])
    .filter(call => !repFilter || call.userId === repFilter)
    .sort((a, b) => b.sortTime - a.sortTime), [dailyCalls, repFilter]);

  const selectDay = (nextDay) => {
    if (!nextDay || nextDay > today) return;
    setReportDate(nextDay === today ? null : nextDay);
    setPage(0);
  };

  const reload = () => {
    setError(false);
    setData(null);
    setRepFilter('');
    setPage(0);
    setRefresh(value => value + 1);
  };

  const selectRep = (id) => {
    setRepFilter(id);
    setPage(0);
  };

  const total = dailyCalls?.length ?? 0;
  const previous = data?.byDay.get(shiftDay(day, -1))?.length ?? 0;
  const difference = total - previous;
  const week = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDay(day, index - 6);
    return { key, label: CHART_DAY_FORMAT.format(calendarDate(key)), total: data?.byDay.get(key)?.length ?? 0 };
  });
  const peak = Math.max(1, ...week.map(item => item.total));
  const lastPage = Math.max(0, Math.ceil(callRows.length / CALLS_PER_PAGE) - 1);
  const visiblePage = Math.min(page, lastPage);
  const dayLabel = DAY_FORMAT.format(calendarDate(day));

  return (
    <section aria-labelledby="inside-sales-heading" className="mx-auto max-w-[1440px] space-y-5 animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-3 text-sky-300">
            <Headphones size={26} aria-hidden="true" />
          </div>
          <div>
            <h1 id="inside-sales-heading" className="text-2xl font-bold tracking-tight text-white">Inside Sales Calling</h1>
            <p className="mt-1 text-sm text-slate-400">Daily call activity and team contributions</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label="Previous day" className={CONTROL} onClick={() => selectDay(shiftDay(day, -1))}><ChevronLeft size={17} /></button>
          <input type="date" aria-label="Reporting date" max={today} value={day}
            onChange={event => selectDay(event.target.value)} className={CONTROL + ' [color-scheme:dark]'} />
          <button type="button" aria-label="Next day" className={CONTROL} disabled={day >= today} onClick={() => selectDay(shiftDay(day, 1))}><ChevronRight size={17} /></button>
          <button type="button" className={CONTROL} onClick={() => selectDay(today)}>Today</button>
          <button type="button" aria-label="Refresh calls" title="Refresh calls" className={CONTROL} onClick={reload} disabled={!data && !error}><RefreshCw size={17} /></button>
        </div>
      </div>

      {error && (
        <div role="alert" className={PANEL + ' flex flex-wrap items-center justify-between gap-3 p-5'}>
          <p className="text-sm text-rose-200">Couldn’t load the Inside Sales roster or call logs.</p>
          <button type="button" className={CONTROL} onClick={reload}>Retry</button>
        </div>
      )}
      {!data && !error && <p role="status" className={PANEL + ' p-6 text-sm text-slate-400'}>Loading Inside Sales call activity…</p>}
      {data && (
        <>
          {!data.roster.size && <p className={PANEL + ' p-5 text-sm text-slate-400'}>The Inside Sales roster is empty.</p>}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))' }}>
            <MetricCard label="Calls logged" value={total} icon={Phone} tone="bg-sky-500/10 text-sky-300"
              detail={difference === 0 ? 'Same as previous day' : (difference > 0 ? '+' : '−') + Math.abs(difference) + ' vs previous day'} />
            <MetricCard label="Reached" value={stats.outcomes[0]} icon={PhoneCall} tone="bg-emerald-500/10 text-emerald-300"
              detail={percent(stats.outcomes[0], total) + '% with a reached outcome'} />
            <MetricCard label="Active reps" value={stats.active} icon={Users} tone="bg-violet-500/10 text-violet-300"
              detail={'Of ' + data.roster.size + ' on the Inside Sales roster'} />
            <MetricCard label="Meetings booked" value={stats.booked} icon={CalendarDays} tone="bg-amber-500/10 text-amber-300"
              detail="Calls marked Meeting Scheduled" />
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
            <section aria-labelledby="inside-sales-trend" className={PANEL + ' p-5'}>
              <h2 id="inside-sales-trend" className="text-base font-bold text-white">Daily call volume</h2>
              <p className="mt-1 text-xs text-slate-400">Seven days through {dayLabel}</p>
              <div className="mt-4 grid gap-1 sm:gap-3" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                {week.map(item => (
                  <button key={item.key} type="button" aria-pressed={item.key === day}
                    aria-label={item.label + ', ' + item.total + (item.total === 1 ? ' call' : ' calls')}
                    onClick={() => selectDay(item.key)}
                    className="grid min-w-0 gap-2 rounded-lg px-1 pt-1 pb-2 text-center hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-sky-400"
                    style={{ gridTemplateRows: '7.5rem auto' }}>
                    <span className="flex h-full flex-col justify-end gap-1">
                      <span className="text-xs font-semibold tabular-nums text-slate-200">{item.total}</span>
                      <span className="mx-auto w-full rounded-t-md"
                        style={{ maxWidth: 36, height: item.total ? Math.max(4, item.total / peak * 90) : 2,
                          backgroundColor: item.key === day ? '#38bdf8' : '#23658b' }} />
                    </span>
                    <span className={'text-[11px] ' + (item.key === day ? 'font-semibold text-sky-300' : 'text-slate-400')}>{item.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="inside-sales-outcomes" className={PANEL + ' p-5'}>
              <h2 id="inside-sales-outcomes" className="text-base font-bold text-white">Call outcomes</h2>
              <p className="mt-1 text-xs text-slate-400">{dayLabel} · {total} logged</p>
              <ul className="mt-4 space-y-2.5">
                {OUTCOMES.map(({ label, color }, index) => (
                  <li key={label} className="grid items-center gap-2 text-xs" style={{ gridTemplateColumns: '8.5rem minmax(0, 1fr) 2rem' }}>
                    <span className="text-slate-300">{label}</span>
                    <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <span className="block h-full rounded-full" style={{ backgroundColor: color, width: percent(stats.outcomes[index], total) + '%' }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums text-slate-200">{stats.outcomes[index]}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section aria-labelledby="inside-sales-contribution" className={PANEL + ' overflow-hidden'}>
            <div className="px-5 pt-5 pb-4">
              <h2 id="inside-sales-contribution" className="text-base font-bold text-white">Rep contributions</h2>
              <p className="mt-1 text-xs text-slate-400">{dayLabel} · Select a rep to filter the call log below</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[570px] text-left text-sm">
                <thead className="border-y border-white/5 bg-slate-900/70 text-xs font-medium text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-3">Inside Sales rep</th>
                    <th scope="col" className="px-3 py-3 text-right">Calls</th>
                    <th scope="col" className="px-3 py-3 text-right">Reached</th>
                    <th scope="col" className="px-3 py-3 text-right">Booked</th>
                    <th scope="col" className="px-5 py-3">Share of calls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.contributions.map(rep => {
                    const share = percent(rep.calls, total);
                    return (
                      <tr key={rep.id} className={repFilter === rep.id ? 'bg-sky-500/10' : 'hover:bg-white/5'}>
                        <th scope="row" className="px-5 py-3 font-medium">
                          <button type="button" aria-pressed={repFilter === rep.id} onClick={() => selectRep(repFilter === rep.id ? '' : rep.id)}
                            className="rounded text-left text-slate-200 hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-sky-400">{rep.name}</button>
                        </th>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-white">{rep.calls}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-300">{rep.reached}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-300">{rep.booked}</td>
                        <td className="px-5 py-3">
                          <div className="flex min-w-28 items-center gap-2">
                            <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                              <span className="block h-full rounded-full" style={{ backgroundColor: '#38bdf8', width: share + '%' }} />
                            </span>
                            <span className="w-9 text-right text-xs tabular-nums text-slate-300">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="inside-sales-call-log" className={PANEL + ' overflow-hidden'}>
            <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 pb-4">
              <div>
                <h2 id="inside-sales-call-log" className="text-base font-bold text-white">Call log</h2>
                <p className="mt-1 text-xs text-slate-400">{dayLabel} · {callRows.length} {callRows.length === 1 ? 'call' : 'calls'}</p>
              </div>
              <select aria-label="Filter call log by rep" value={repFilter} onChange={event => selectRep(event.target.value)} className={CONTROL + ' max-w-full'}>
                <option value="">All Inside Sales reps</option>
                {stats.contributions.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
              </select>
            </div>
            {callRows.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-sm">
                    <thead className="border-y border-white/5 bg-slate-900/70 text-xs text-slate-400">
                      <tr>
                        <th scope="col" className="px-5 py-3">Subject</th>
                        <th scope="col" className="px-3 py-3">Rep</th>
                        <th scope="col" className="px-3 py-3">Type</th>
                        <th scope="col" className="px-5 py-3">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {callRows.slice(visiblePage * CALLS_PER_PAGE, (visiblePage + 1) * CALLS_PER_PAGE).map(call => (
                        <tr key={call.key}>
                          <td className="px-5 py-3 font-medium text-slate-100">{call.subject}</td>
                          <td className="px-3 py-3">{data.roster.get(call.userId).name}</td>
                          <td className="px-3 py-3">{showCode(call.type, 'Unknown')}</td>
                          <td className="px-5 py-3">{showCode(call.result, 'Unclassified')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {lastPage > 0 && (
                  <div className="flex items-center justify-between gap-3 border-t border-white/5 px-5 py-3 text-xs text-slate-400">
                    <span>Page {visiblePage + 1} of {lastPage + 1}</span>
                    <div className="flex gap-2">
                      <button type="button" className={CONTROL} disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}>Previous</button>
                      <button type="button" className={CONTROL} disabled={visiblePage === lastPage} onClick={() => setPage(visiblePage + 1)}>Next</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="border-t border-white/5 px-5 py-8 text-center text-sm text-slate-400">No calls found for this selection.</p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
