"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { competitionColor } from "@/lib/colors";
import { ContentDbPicker, type DataSource } from "@/components/admin/ContentDbPicker";

/* ------------------------------ Types ------------------------------ */

type Lookup = { Id: number; Text: string };

type Fixture = {
  FixtureID: number;
  FixtureDate: string;
  HomeClubID: number;
  AwayClubID: number;
  SeasonID: number;
  CompetitionID: number;
  CupRoundID: number | null;
  AlternateVenue: string | null;
  SeasonTicket: string | null;
  AddInfo: string | null;
  AlbumID: string | null;
  EmbedCode: string | null;
  SCEmbedURL: string | null;
  HomeFinalScore: string | null;
  AwayFinalScore: string | null;
  Crowd: number | null;
};

type ApiState = {
  configured: boolean;
  contentDataSourceId: string | null;
  dataSources: DataSource[];
  seasonId?: number | null;
  list?: Fixture[];
  clubs?: Lookup[];
  seasons?: Lookup[];
  competitions?: Lookup[];
  cupRounds?: Lookup[];
  error?: string;
};

// Result fields as typed into the form (strings so inputs can be blank).
type ResultModel = { home: string; away: string; crowd: string; postponed: boolean };

type EditModel = {
  FixtureID: number; // 0 = new
  Date: string; // YYYY-MM-DD
  KickOff: string; // HH:mm
  HomeClubID: string;
  AwayClubID: string;
  SeasonID: string;
  CompetitionID: string;
  CupRoundID: string;
  AlternateVenue: string;
  SeasonTicket: string;
  AddInfo: string;
  AlbumID: string;
  EmbedCode: string;
  SCEmbedURL: string;
  result: ResultModel;
  originalResult: ResultModel;
};

type Filter = "all" | "upcoming" | "due" | "played";
type Status = "upcoming" | "due" | "played" | "postponed";

/* ------------------------------ Helpers ------------------------------ */

const QOS_CLUB_ID = 1;
const POSTPONED = "P";
const EMPTY_RESULT: ResultModel = { home: "", away: "", crowd: "", postponed: false };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function splitDate(v: string): { date: string; time: string } {
  const m = v.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return m ? { date: m[1], time: m[2] } : { date: v.slice(0, 10), time: "15:00" };
}

// Parse the DB wall-clock string as a local date (no timezone shift).
function parseLocal(v: string): Date {
  const { date, time } = splitDate(v);
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0);
}

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function nextSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return isoDate(d);
}

function hasResult(f: Fixture): boolean {
  return f.HomeFinalScore != null && f.HomeFinalScore !== "";
}

function statusOf(f: Fixture, now: number): Status {
  if (hasResult(f)) return f.HomeFinalScore === POSTPONED ? "postponed" : "played";
  // Allow ~2 hours for the match to finish before nagging for a result.
  return parseLocal(f.FixtureDate).getTime() + 2 * 3600_000 < now ? "due" : "upcoming";
}

function resultFromFixture(f: Fixture): ResultModel {
  if (!hasResult(f)) return { ...EMPTY_RESULT, crowd: f.Crowd != null ? String(f.Crowd) : "" };
  const postponed = f.HomeFinalScore === POSTPONED;
  return {
    home: postponed ? "" : (f.HomeFinalScore ?? ""),
    away: postponed ? "" : (f.AwayFinalScore ?? ""),
    crowd: f.Crowd != null ? String(f.Crowd) : "",
    postponed,
  };
}

function sameResult(a: ResultModel, b: ResultModel): boolean {
  return (
    a.postponed === b.postponed &&
    a.home.trim() === b.home.trim() &&
    a.away.trim() === b.away.trim() &&
    a.crowd.trim() === b.crowd.trim()
  );
}

function isBlankResult(r: ResultModel): boolean {
  return !r.postponed && !r.home.trim() && !r.away.trim() && !r.crowd.trim();
}

// Validate the typed result and build the API body, or return an error message.
function resultBody(r: ResultModel): { body: object } | { error: string } {
  const toInt = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[,\s]/g, "")));
  const crowd = toInt(r.crowd);
  if (crowd !== null && (!Number.isInteger(crowd) || crowd < 0)) {
    return { error: "Crowd must be a whole number." };
  }
  if (r.postponed) return { body: { postponed: true, home: null, away: null, crowd } };
  const home = toInt(r.home);
  const away = toInt(r.away);
  if (home === null || away === null) return { error: "Enter both scores, or mark the match as postponed." };
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return { error: "Scores must be whole numbers." };
  }
  return { body: { postponed: false, home, away, crowd } };
}

async function sendResult(fixtureId: number, r: ResultModel): Promise<string | null> {
  const url = `/api/admin/fixtures/${fixtureId}/result`;
  let res: Response;
  if (isBlankResult(r)) {
    res = await fetch(url, { method: "DELETE" });
  } else {
    const built = resultBody(r);
    if ("error" in built) return built.error;
    res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(built.body),
    });
  }
  if (res.ok) return null;
  const d = await res.json().catch(() => ({}));
  return d.error ?? "Could not save the result.";
}

function fmtCrowd(n: number | null): string {
  return n == null ? "" : n.toLocaleString("en-GB");
}

/* ------------------------------ Styles ------------------------------ */

const panelStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E7EC",
  borderRadius: 12,
  padding: 16,
};
const fieldLabel: React.CSSProperties = {
  fontSize: 12,
  color: "#667085",
  marginBottom: 5,
  display: "block",
};
const inputStyle: React.CSSProperties = {
  height: 38,
  width: "100%",
  padding: "0 11px",
  border: "1px solid #D0D5DD",
  borderRadius: 9,
  fontSize: 13.5,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};
const btnSecondary: React.CSSProperties = {
  height: 36,
  padding: "0 14px",
  border: "1px solid #D0D5DD",
  borderRadius: 9,
  fontSize: 13.5,
  fontWeight: 500,
  color: "#344054",
  background: "#fff",
  cursor: "pointer",
};
const btnDanger: React.CSSProperties = {
  ...btnSecondary,
  border: "1px solid #FDA29B",
  color: "#B42318",
};
const btnPrimary: React.CSSProperties = {
  height: 36,
  padding: "0 18px",
  background: "#0A4B93",
  color: "#fff",
  borderRadius: 9,
  fontSize: 13.5,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

function PanelHeading({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: "#101828", marginBottom: 13, display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0, display: "inline-block" }} />
      {children}
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */

export function FixturesAdmin() {
  const [data, setData] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  // "Now" snapshotted per load so status badges are stable between renders.
  const [now, setNow] = useState(0);

  const [mode, setMode] = useState<"list" | "edit">("list");
  const [edit, setEdit] = useState<EditModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fixture | null>(null);
  const [resultTarget, setResultTarget] = useState<Fixture | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [pickingDb, setPickingDb] = useState(false);
  const [chosenDb, setChosenDb] = useState("");
  const [savingDb, setSavingDb] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async (season?: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const qs = season ? `?season=${season}` : "";
      const res = await fetch(`/api/admin/fixtures${qs}`);
      const d: ApiState = await res.json();
      setData(d);
      setNow(Date.now());
      if (d.error && d.configured) setError(d.error);
      if (d.seasonId) setSeasonId(d.seasonId);
      setChosenDb(d.contentDataSourceId ?? "");
    } catch {
      setError("Could not load fixtures.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  async function saveDb() {
    if (!chosenDb) return;
    setSavingDb(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/news/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId: chosenDb }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "Could not set the content database.");
      else {
        setPickingDb(false);
        await load();
      }
    } catch {
      setError("Could not set the content database.");
    }
    setSavingDb(false);
  }

  const clubs = useMemo(() => data?.clubs ?? [], [data]);
  const seasons = data?.seasons ?? [];
  const competitions = useMemo(() => data?.competitions ?? [], [data]);
  const cupRounds = useMemo(() => data?.cupRounds ?? [], [data]);
  const list = useMemo(() => data?.list ?? [], [data]);

  const clubName = useMemo(() => {
    const m = new Map(clubs.map((c) => [c.Id, c.Text]));
    return (id: number) => m.get(id) ?? `Club ${id}`;
  }, [clubs]);
  const compName = useMemo(() => {
    const m = new Map(competitions.map((c) => [c.Id, c.Text]));
    return (id: number) => m.get(id) ?? "";
  }, [competitions]);
  const roundName = useMemo(() => {
    const m = new Map(cupRounds.map((c) => [c.Id, c.Text]));
    return (id: number | null) => (id ? (m.get(id) ?? "") : "");
  }, [cupRounds]);


  const withStatus = useMemo(
    () => list.map((f) => ({ f, status: statusOf(f, now) })),
    [list, now],
  );
  const counts = useMemo(() => {
    const c = { all: withStatus.length, upcoming: 0, due: 0, played: 0 };
    for (const { status } of withStatus) {
      if (status === "upcoming") c.upcoming++;
      else if (status === "due") c.due++;
      else c.played++;
    }
    return c;
  }, [withStatus]);

  const filtered = withStatus.filter(({ f, status }) => {
    const matchFilter =
      filter === "all" ||
      (filter === "upcoming" && status === "upcoming") ||
      (filter === "due" && status === "due") ||
      (filter === "played" && (status === "played" || status === "postponed"));
    if (!matchFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      clubName(f.HomeClubID).toLowerCase().includes(q) ||
      clubName(f.AwayClubID).toLowerCase().includes(q) ||
      compName(f.CompetitionID).toLowerCase().includes(q)
    );
  });

  function changeSeason(id: number) {
    setSeasonId(id);
    load(id);
  }

  function startAdd() {
    setFormError(null);
    const lastComp = list.at(-1)?.CompetitionID;
    setEdit({
      FixtureID: 0,
      Date: nextSaturday(),
      KickOff: "15:00",
      HomeClubID: String(QOS_CLUB_ID),
      AwayClubID: "",
      SeasonID: seasonId ? String(seasonId) : "",
      CompetitionID: lastComp ? String(lastComp) : "",
      CupRoundID: "",
      AlternateVenue: "",
      SeasonTicket: "",
      AddInfo: "",
      AlbumID: "",
      EmbedCode: "",
      SCEmbedURL: "",
      result: { ...EMPTY_RESULT },
      originalResult: { ...EMPTY_RESULT },
    });
    setMode("edit");
  }

  function startEdit(f: Fixture) {
    setFormError(null);
    const { date, time } = splitDate(f.FixtureDate);
    const result = resultFromFixture(f);
    setEdit({
      FixtureID: f.FixtureID,
      Date: date,
      KickOff: time,
      HomeClubID: String(f.HomeClubID),
      AwayClubID: String(f.AwayClubID),
      SeasonID: String(f.SeasonID),
      CompetitionID: String(f.CompetitionID),
      CupRoundID: f.CupRoundID ? String(f.CupRoundID) : "",
      AlternateVenue: f.AlternateVenue ?? "",
      SeasonTicket: f.SeasonTicket ?? "",
      AddInfo: f.AddInfo ?? "",
      AlbumID: f.AlbumID ?? "",
      EmbedCode: f.EmbedCode ?? "",
      SCEmbedURL: f.SCEmbedURL ?? "",
      result,
      originalResult: result,
    });
    setMode("edit");
  }

  function patch(p: Partial<EditModel>) {
    setEdit((e) => (e ? { ...e, ...p } : e));
  }

  async function save() {
    if (!edit) return;
    const missing =
      (!edit.Date && "a date") ||
      (!edit.KickOff && "a kick-off time") ||
      (!edit.HomeClubID && "the home club") ||
      (!edit.AwayClubID && "the away club") ||
      (!edit.SeasonID && "a season") ||
      (!edit.CompetitionID && "a competition");
    if (missing) {
      setFormError(`Please choose ${missing}.`);
      return;
    }
    if (edit.HomeClubID === edit.AwayClubID) {
      setFormError("Home and away clubs must be different.");
      return;
    }
    const resultChanged = edit.FixtureID !== 0 && !sameResult(edit.result, edit.originalResult);
    if (resultChanged && !isBlankResult(edit.result)) {
      const check = resultBody(edit.result);
      if ("error" in check) {
        setFormError(check.error);
        return;
      }
    }

    setSaving(true);
    setFormError(null);
    const body = {
      Date: edit.Date,
      KickOff: edit.KickOff,
      HomeClubID: Number(edit.HomeClubID),
      AwayClubID: Number(edit.AwayClubID),
      SeasonID: Number(edit.SeasonID),
      CompetitionID: Number(edit.CompetitionID),
      CupRoundID: edit.CupRoundID ? Number(edit.CupRoundID) : null,
      AlternateVenue: edit.AlternateVenue,
      SeasonTicket: edit.SeasonTicket,
      AddInfo: edit.AddInfo,
      AlbumID: edit.AlbumID,
      EmbedCode: edit.EmbedCode,
      SCEmbedURL: edit.SCEmbedURL,
    };
    try {
      const isNew = edit.FixtureID === 0;
      const res = await fetch(isNew ? "/api/admin/fixtures" : `/api/admin/fixtures/${edit.FixtureID}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(d.error ?? "Save failed.");
      } else {
        const resultError = resultChanged ? await sendResult(edit.FixtureID, edit.result) : null;
        if (resultError) {
          setFormError(`Fixture saved, but the result was not: ${resultError}`);
        } else {
          setMode("list");
          setEdit(null);
          setFlash(isNew ? "Fixture added" : "Fixture saved");
          const savedSeason = Number(edit.SeasonID);
          setSeasonId(savedSeason);
          await load(savedSeason);
        }
      }
    } catch {
      setFormError("Save failed.");
    }
    setSaving(false);
  }

  async function doDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/fixtures/${deleteTarget.FixtureID}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Delete failed.");
      } else {
        setMode("list");
        setEdit(null);
        setFlash("Fixture deleted");
        await load(seasonId);
      }
    } catch {
      setError("Delete failed.");
    }
    setDeleteTarget(null);
  }

  async function onResultSaved(message: string) {
    setResultTarget(null);
    setFlash(message);
    await load(seasonId);
  }

  const currentDb = data?.dataSources.find((s) => s.id === data.contentDataSourceId);
  const fixtureLabel = (f: Fixture) => `${clubName(f.HomeClubID)} v ${clubName(f.AwayClubID)}`;

  if (mode === "edit" && edit) {
    return (
      <>
        <EditForm
          edit={edit}
          patch={patch}
          clubs={clubs}
          seasons={seasons}
          competitions={competitions}
          cupRounds={cupRounds}
          saving={saving}
          formError={formError}
          onSave={save}
          onCancel={() => {
            setMode("list");
            setEdit(null);
          }}
          onDelete={
            edit.FixtureID !== 0
              ? () => setDeleteTarget(list.find((f) => f.FixtureID === edit.FixtureID) ?? null)
              : undefined
          }
        />
        {deleteTarget && (
          <DeleteDialog
            label={fixtureLabel(deleteTarget)}
            hasResult={hasResult(deleteTarget)}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={doDelete}
          />
        )}
      </>
    );
  }

  // Group the visible fixtures by month.
  const groups: { key: string; label: string; items: typeof filtered }[] = [];
  for (const row of filtered) {
    const d = parseLocal(row.f.FixtureDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups.at(-1);
    if (!g || g.key !== key) {
      g = { key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, items: [] };
      groups.push(g);
    }
    g.items.push(row);
  }

  const filterPills: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "upcoming", label: "Upcoming", count: counts.upcoming },
    { key: "due", label: "Results due", count: counts.due },
    { key: "played", label: "Played", count: counts.played },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-[22px] flex flex-wrap items-end justify-between" style={{ gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 600, letterSpacing: "-0.025em", color: "#101828", margin: 0 }}>
            Fixtures &amp; results
          </h1>
          {data?.configured && currentDb && (
            <p style={{ fontSize: 14, color: "#667085", marginTop: 6 }}>
              {list.length} fixtures · reading{" "}
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, color: "#344054" }}>
                {currentDb.database}
              </span>{" "}
              ·{" "}
              <button
                type="button"
                onClick={() => { setChosenDb(data.contentDataSourceId ?? ""); setPickingDb(true); }}
                style={{ color: "#0A4B93", background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 0 }}
                className="hover:underline"
              >
                change database
              </button>
            </p>
          )}
        </div>
        {data?.configured && !pickingDb && (
          <button
            type="button"
            onClick={startAdd}
            style={{ ...btnPrimary, height: 38, padding: "0 16px", fontSize: 14 }}
            className="hover:bg-[#073A75]"
          >
            <Plus size={15} /> Add fixture
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] px-3 py-2 text-sm" style={{ background: "#FEF3F2", color: "#B42318" }}>
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid h-40 place-items-center" style={{ color: "#98A2B3" }}>
          <Loader2 className="animate-spin" />
        </div>
      ) : !data?.configured || pickingDb ? (
        <ContentDbPicker
          dataSources={data?.dataSources ?? []}
          value={chosenDb}
          onChange={setChosenDb}
          onSave={saveDb}
          onCancel={data?.configured ? () => setPickingDb(false) : undefined}
          saving={savingDb}
          reason={data?.error}
          description={
            <>
              Fixtures reads and writes the <code>fixtures</code>, <code>scores</code> and{" "}
              <code>results_all</code> tables in the qosfc content database. This is the same
              database News uses.
            </>
          }
        />
      ) : (
        <>
          {/* Results-due callout */}
          {counts.due > 0 && filter !== "due" && (
            <div
              className="mb-[14px] flex flex-wrap items-center justify-between"
              style={{ gap: 12, padding: "11px 14px", background: "#FFFAEB", border: "1px solid #FEDF89", borderRadius: 12 }}
            >
              <div style={{ fontSize: 13.5, color: "#B54708" }}>
                <strong>{counts.due}</strong> {counts.due === 1 ? "match is" : "matches are"} waiting for a final score.
              </div>
              <button
                type="button"
                onClick={() => setFilter("due")}
                style={{ ...btnSecondary, height: 30, fontSize: 12.5, borderColor: "#FEC84B", color: "#B54708", background: "#fff" }}
                className="hover:bg-[#FEF0C7]"
              >
                Show them
              </button>
            </div>
          )}

          {/* Filter row */}
          <div className="mb-[14px] flex flex-wrap items-center" style={{ gap: 10 }}>
            <select
              value={seasonId ?? ""}
              onChange={(e) => changeSeason(Number(e.target.value))}
              style={{ ...inputStyle, width: "auto", minWidth: 150, fontWeight: 500, color: "#344054" }}
              className="focus:border-[#0A4B93]"
              aria-label="Season"
            >
              {seasons.map((s) => (
                <option key={s.Id} value={s.Id}>Season {s.Text}</option>
              ))}
            </select>
            <div className="relative flex items-center">
              <Search size={14} className="pointer-events-none absolute left-3" style={{ color: "#98A2B3" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clubs or competitions"
                style={{ ...inputStyle, width: 260, padding: "0 12px 0 32px", border: "1px solid #E4E7EC", fontSize: 14 }}
                className="focus:border-[#0A4B93]"
              />
            </div>
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {filterPills.map((p) => {
                const active = filter === p.key;
                const warn = p.key === "due" && p.count > 0;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setFilter(p.key)}
                    style={{
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 99,
                      fontSize: 13,
                      fontWeight: 500,
                      border: `1px solid ${active ? "#0A4B93" : "#E4E7EC"}`,
                      background: active ? "#EEF4FB" : "#fff",
                      color: active ? "#0A4B93" : "#475467",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {p.label}
                    <span
                      style={{
                        minWidth: 20,
                        height: 18,
                        padding: "0 6px",
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 600,
                        display: "inline-grid",
                        placeItems: "center",
                        background: warn ? "#FEF0C7" : active ? "#D6E6F7" : "#F2F4F7",
                        color: warn ? "#B54708" : active ? "#0A4B93" : "#667085",
                      }}
                    >
                      {p.count}
                    </span>
                  </button>
                );
              })}
            </div>
            {loading && <Loader2 size={16} className="animate-spin" style={{ color: "#98A2B3" }} />}
          </div>

          {groups.length === 0 ? (
            <div style={{ ...panelStyle, padding: "48px 24px", textAlign: "center", fontSize: 14, color: "#667085" }}>
              {list.length === 0 ? "No fixtures in this season yet." : "No fixtures match."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {groups.map((g) => (
                <section key={g.key}>
                  <h2 style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#667085", margin: "0 0 8px 2px" }}>
                    {g.label}
                  </h2>
                  <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12, overflow: "hidden" }}>
                    {g.items.map(({ f, status }, i) => (
                      <FixtureRowView
                        key={f.FixtureID}
                        f={f}
                        status={status}
                        last={i === g.items.length - 1}
                        home={clubName(f.HomeClubID)}
                        away={clubName(f.AwayClubID)}
                        comp={compName(f.CompetitionID)}
                        round={roundName(f.CupRoundID)}
                        onEdit={() => startEdit(f)}
                        onResult={() => setResultTarget(f)}
                        onDelete={() => setDeleteTarget(f)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {resultTarget && (
        <ResultDialog
          fixture={resultTarget}
          home={clubName(resultTarget.HomeClubID)}
          away={clubName(resultTarget.AwayClubID)}
          comp={compName(resultTarget.CompetitionID)}
          onClose={() => setResultTarget(null)}
          onSaved={onResultSaved}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          label={fixtureLabel(deleteTarget)}
          hasResult={hasResult(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={doDelete}
        />
      )}

      {flash && (
        <div
          className="fixed z-50"
          style={{
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 16px",
            background: "#101828",
            color: "#fff",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 500,
            boxShadow: "0 12px 32px rgba(16,24,40,.25)",
          }}
        >
          {flash}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ List row ------------------------------ */

function FixtureRowView({
  f,
  status,
  last,
  home,
  away,
  comp,
  round,
  onEdit,
  onResult,
  onDelete,
}: {
  f: Fixture;
  status: Status;
  last: boolean;
  home: string;
  away: string;
  comp: string;
  round: string;
  onEdit: () => void;
  onResult: () => void;
  onDelete: () => void;
}) {
  const d = parseLocal(f.FixtureDate);
  const { time } = splitDate(f.FixtureDate);
  const hue = competitionColor(f.CompetitionID);
  const homeIsQos = f.HomeClubID === QOS_CLUB_ID;
  const awayIsQos = f.AwayClubID === QOS_CLUB_ID;
  const played = status === "played";
  const homeWon = played && Number(f.HomeFinalScore) > Number(f.AwayFinalScore);
  const awayWon = played && Number(f.AwayFinalScore) > Number(f.HomeFinalScore);

  const teamStyle = (isQos: boolean, won: boolean): React.CSSProperties => ({
    fontSize: 15,
    fontWeight: isQos || won ? 600 : 500,
    color: isQos ? "#0A4B93" : "#101828",
    letterSpacing: "-0.01em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  });

  return (
    <div
      onClick={onEdit}
      className="hover:bg-[#FAFBFC]"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 16px",
        borderBottom: last ? "none" : "1px solid #F2F4F7",
        cursor: "pointer",
        borderLeft: status === "due" ? "3px solid #F79009" : "3px solid transparent",
      }}
    >
      {/* Date tile */}
      <div
        style={{
          width: 52,
          flexShrink: 0,
          textAlign: "center",
          padding: "5px 0",
          borderRadius: 9,
          background: "#F9FAFB",
          border: "1px solid #EAECF0",
        }}
      >
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#667085" }}>
          {WEEKDAYS[d.getDay()]}
        </div>
        <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.1, color: "#101828" }}>{d.getDate()}</div>
      </div>

      {/* Match */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ ...teamStyle(homeIsQos, homeWon), textAlign: "right" }}>{home}</span>
          <ScoreBadge f={f} status={status} time={time} />
          <span style={teamStyle(awayIsQos, awayWon)}>{away}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center" style={{ gap: 8, marginTop: 6 }}>
          {comp && (
            <span
              style={{
                padding: "1px 8px",
                borderRadius: 6,
                background: hue.bg,
                color: hue.text,
                border: `1px solid ${hue.border}`,
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              {comp}
              {round ? ` · ${round}` : ""}
            </span>
          )}
          {f.AlternateVenue && (
            <span className="inline-flex items-center" style={{ gap: 3, fontSize: 12, color: "#98A2B3" }}>
              <MapPin size={12} /> {f.AlternateVenue}
            </span>
          )}
          {f.Crowd != null && (
            <span className="inline-flex items-center" style={{ gap: 3, fontSize: 12, color: "#98A2B3" }}>
              <Users size={12} /> {fmtCrowd(f.Crowd)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onResult}
          style={
            status === "due"
              ? { ...btnPrimary, height: 30, padding: "0 12px", fontSize: 12.5 }
              : { ...btnSecondary, height: 30, padding: "0 11px", fontSize: 12.5, borderRadius: 8 }
          }
          className={status === "due" ? "hover:bg-[#073A75]" : "hover:bg-[#F9FAFB]"}
        >
          {status === "due" ? "Enter result" : status === "upcoming" ? "Result" : "Edit result"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          style={{ ...btnSecondary, height: 30, padding: "0 11px", fontSize: 12.5, borderRadius: 8 }}
          className="hover:bg-[#F9FAFB]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete fixture"
          aria-label="Delete fixture"
          style={{
            width: 30,
            height: 30,
            display: "grid",
            placeItems: "center",
            border: "none",
            background: "transparent",
            color: "#98A2B3",
            cursor: "pointer",
            borderRadius: 8,
          }}
          className="hover:bg-[#FEF3F2] hover:text-[#B42318]"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function ScoreBadge({ f, status, time }: { f: Fixture; status: Status; time: string }) {
  const base: React.CSSProperties = {
    minWidth: 64,
    height: 30,
    padding: "0 10px",
    borderRadius: 8,
    display: "inline-grid",
    placeItems: "center",
    fontSize: 14,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  };
  if (status === "played") {
    return (
      <span style={{ ...base, background: "#101828", color: "#fff", fontSize: 15 }}>
        {f.HomeFinalScore} – {f.AwayFinalScore}
      </span>
    );
  }
  if (status === "postponed") {
    return <span style={{ ...base, background: "#FFFAEB", color: "#B54708", border: "1px solid #FEDF89", fontSize: 12 }}>P–P</span>;
  }
  if (status === "due") {
    return <span style={{ ...base, background: "#fff", color: "#B54708", border: "1px dashed #F79009", fontSize: 12.5 }}>? – ?</span>;
  }
  return <span style={{ ...base, background: "#F2F4F7", color: "#344054", fontSize: 13 }}>{time}</span>;
}

/* ------------------------------ Result dialog ------------------------------ */

function ResultDialog({
  fixture,
  home,
  away,
  comp,
  onClose,
  onSaved,
}: {
  fixture: Fixture;
  home: string;
  away: string;
  comp: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const original = useMemo(() => resultFromFixture(fixture), [fixture]);
  const [r, setR] = useState<ResultModel>(original);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const homeRef = useRef<HTMLInputElement>(null);
  const d = parseLocal(fixture.FixtureDate);

  useEffect(() => {
    homeRef.current?.focus();
    homeRef.current?.select();
  }, []);

  async function submit(clear = false) {
    const value = clear ? EMPTY_RESULT : r;
    if (!clear && isBlankResult(value)) {
      setErr("Enter both scores, or mark the match as postponed.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const e = await sendResult(fixture.FixtureID, value);
      if (e) setErr(e);
      else onSaved(clear ? "Result cleared" : value.postponed ? "Marked as postponed" : "Result saved");
    } catch {
      setErr("Could not save the result.");
    }
    setSaving(false);
  }

  const scoreInput = (key: "home" | "away", ref?: React.Ref<HTMLInputElement>) => (
    <input
      ref={ref}
      inputMode="numeric"
      value={r[key]}
      disabled={r.postponed}
      onChange={(e) => setR({ ...r, [key]: e.target.value.replace(/[^\d]/g, "").slice(0, 2) })}
      aria-label={`${key === "home" ? home : away} score`}
      style={{
        width: 76,
        height: 72,
        textAlign: "center",
        fontSize: 36,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        border: "1px solid #D0D5DD",
        borderRadius: 12,
        outline: "none",
        color: "#101828",
        background: r.postponed ? "#F2F4F7" : "#fff",
      }}
      className="focus:border-[#0A4B93] focus:shadow-[0_0_0_3px_rgba(10,75,147,.18)]"
    />
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(16,24,40,.45)" }}
      onClick={onClose}
    >
      <form
        className="w-full rounded-xl bg-white"
        style={{ maxWidth: 480, boxShadow: "0 24px 60px rgba(16,24,40,.28)" }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div style={{ padding: "18px 20px 0" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#101828", margin: 0 }}>Final score</h2>
          <p className="flex items-center" style={{ gap: 6, marginTop: 4, fontSize: 13, color: "#667085" }}>
            <CalendarDays size={13} />
            {WEEKDAYS[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)} {d.getFullYear()}
            {comp ? ` · ${comp}` : ""}
          </p>
        </div>

        <div style={{ padding: "22px 20px 6px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "start", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {scoreInput("home", homeRef)}
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#344054", textAlign: "center" }}>{home}</span>
            </div>
            <span style={{ fontSize: 28, color: "#98A2B3", lineHeight: "72px" }}>–</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {scoreInput("away")}
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#344054", textAlign: "center" }}>{away}</span>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={fieldLabel}>Crowd</label>
              <div className="relative flex items-center">
                <Users size={14} className="pointer-events-none absolute left-3" style={{ color: "#98A2B3" }} />
                <input
                  inputMode="numeric"
                  value={r.crowd}
                  onChange={(e) => setR({ ...r, crowd: e.target.value.replace(/[^\d]/g, "").slice(0, 6) })}
                  placeholder="e.g. 3214"
                  style={{ ...inputStyle, paddingLeft: 32 }}
                  className="focus:border-[#0A4B93]"
                />
              </div>
            </div>
            <ToggleRow
              on={r.postponed}
              onToggle={() => setR({ ...r, postponed: !r.postponed })}
              title="Postponed"
              hint="Shows as P–P on the website"
            />
          </div>

          {err && (
            <div style={{ marginTop: 12, padding: "9px 12px", background: "#FEF3F2", border: "1px solid #FDA29B", borderRadius: 9, fontSize: 13, color: "#B42318" }}>
              {err}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between" style={{ padding: "14px 20px 18px", gap: 8 }}>
          <div>
            {hasResult(fixture) && (
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={saving}
                style={{ ...btnSecondary, border: "none", color: "#B42318", padding: "0 6px" }}
                className="hover:underline"
              >
                Clear result
              </button>
            )}
          </div>
          <div className="flex items-center" style={{ gap: 8 }}>
            <button type="button" onClick={onClose} style={btnSecondary} className="hover:bg-[#F9FAFB]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || sameResult(r, original)}
              style={{
                ...btnPrimary,
                opacity: saving || sameResult(r, original) ? 0.6 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
              className="hover:bg-[#073A75]"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save result
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------ Edit form ------------------------------ */

function EditForm({
  edit,
  patch,
  clubs,
  seasons,
  competitions,
  cupRounds,
  saving,
  formError,
  onSave,
  onCancel,
  onDelete,
}: {
  edit: EditModel;
  patch: (p: Partial<EditModel>) => void;
  clubs: Lookup[];
  seasons: Lookup[];
  competitions: Lookup[];
  cupRounds: Lookup[];
  saving: boolean;
  formError: string | null;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const isNew = edit.FixtureID === 0;
  const compId = Number(edit.CompetitionID) || null;
  const compName = competitions.find((c) => c.Id === compId)?.Text ?? null;
  const hue = competitionColor(compId);
  const r = edit.result;
  const setResult = (p: Partial<ResultModel>) => patch({ result: { ...r, ...p } });

  const clubSelect = (key: "HomeClubID" | "AwayClubID") => (
    <select
      value={edit[key]}
      onChange={(e) => patch({ [key]: e.target.value } as Partial<EditModel>)}
      style={{ ...inputStyle, height: 46, fontSize: 15, fontWeight: 600 }}
      className="focus:border-[#0A4B93]"
    >
      <option value="">— Select club —</option>
      {clubs.map((c) => (
        <option key={c.Id} value={c.Id}>{c.Text}</option>
      ))}
    </select>
  );

  return (
    <div style={{ margin: "-32px -28px 0" }}>
      {/* Sticky sub-header */}
      <div className="sticky z-30 border-b bg-white" style={{ top: 56, borderColor: "#E4E7EC" }}>
        <div
          className="mx-auto flex flex-wrap items-center justify-between"
          style={{ maxWidth: 1400, padding: "0 28px", minHeight: 62, gap: 20 }}
        >
          <div className="flex items-center" style={{ gap: 12 }}>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Back to fixtures"
              style={{
                width: 32,
                height: 32,
                display: "grid",
                placeItems: "center",
                border: "1px solid #E4E7EC",
                borderRadius: 8,
                color: "#475467",
                background: "#fff",
                cursor: "pointer",
              }}
              className="hover:bg-[#F2F4F7]"
            >
              <ArrowLeft size={15} />
            </button>
            <div className="flex items-center" style={{ gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", color: "#101828" }}>
                {isNew ? "New fixture" : "Edit fixture"}
              </span>
              {compName && (
                <span
                  style={{
                    padding: "2px 9px",
                    borderRadius: 6,
                    background: hue.bg,
                    border: `1px solid ${hue.border}`,
                    color: hue.text,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  {compName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 8 }}>
            {onDelete && (
              <button type="button" onClick={onDelete} style={btnDanger} className="hover:bg-[#FEF3F2]">
                Delete
              </button>
            )}
            <button type="button" onClick={onCancel} style={btnSecondary} className="hover:bg-[#F9FAFB]">
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              style={{ ...btnPrimary, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
              className="hover:bg-[#073A75]"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isNew ? "Add fixture" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className="mx-auto flex flex-wrap"
        style={{ maxWidth: 1400, padding: "24px 28px 64px", gap: 20, alignItems: "flex-start" }}
      >
        {/* Left column */}
        <div style={{ flex: "1 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Match-up */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${hue.text}`, paddingTop: 14 }}>
            <PanelHeading color={hue.text}>Match</PanelHeading>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 12, alignItems: "end" }}>
              <div>
                <label style={fieldLabel}>Home <span style={{ color: "#B42318" }}>*</span></label>
                {clubSelect("HomeClubID")}
              </div>
              <button
                type="button"
                onClick={() => patch({ HomeClubID: edit.AwayClubID, AwayClubID: edit.HomeClubID })}
                title="Swap home and away"
                aria-label="Swap home and away"
                style={{
                  width: 46,
                  height: 46,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid #E4E7EC",
                  borderRadius: 10,
                  background: "#F9FAFB",
                  color: "#475467",
                  cursor: "pointer",
                }}
                className="hover:bg-[#F2F4F7]"
              >
                <ArrowLeftRight size={16} />
              </button>
              <div>
                <label style={fieldLabel}>Away <span style={{ color: "#B42318" }}>*</span></label>
                {clubSelect("AwayClubID")}
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <label style={fieldLabel}>Date <span style={{ color: "#B42318" }}>*</span></label>
                <input
                  type="date"
                  value={edit.Date}
                  onChange={(e) => patch({ Date: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                />
              </div>
              <div>
                <label style={fieldLabel}>Kick-off <span style={{ color: "#B42318" }}>*</span></label>
                <input
                  type="time"
                  value={edit.KickOff}
                  onChange={(e) => patch({ KickOff: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                />
              </div>
              <div>
                <label style={fieldLabel}>Season <span style={{ color: "#B42318" }}>*</span></label>
                <select
                  value={edit.SeasonID}
                  onChange={(e) => patch({ SeasonID: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                >
                  <option value="">— Select —</option>
                  {seasons.map((s) => (
                    <option key={s.Id} value={s.Id}>{s.Text}</option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <label style={fieldLabel}>Competition <span style={{ color: "#B42318" }}>*</span></label>
                <select
                  value={edit.CompetitionID}
                  onChange={(e) => patch({ CompetitionID: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                >
                  <option value="">— Select —</option>
                  {competitions.map((c) => (
                    <option key={c.Id} value={c.Id}>{c.Text}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>
                  Cup round <span style={{ color: "#98A2B3", fontSize: 11 }}>— cup ties only</span>
                </label>
                <select
                  value={edit.CupRoundID}
                  onChange={(e) => patch({ CupRoundID: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                >
                  <option value="">— none —</option>
                  {cupRounds.filter((c) => c.Id > 0).map((c) => (
                    <option key={c.Id} value={c.Id}>{c.Text}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={panelStyle}>
            <PanelHeading color="#0E7090">Details</PanelHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={fieldLabel}>
                  Alternative venue <span style={{ color: "#98A2B3", fontSize: 11 }}>— leave blank for the home club&apos;s ground</span>
                </label>
                <input
                  value={edit.AlternateVenue}
                  onChange={(e) => patch({ AlternateVenue: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                />
              </div>
              <div>
                <label style={fieldLabel}>Additional info</label>
                <input
                  value={edit.AddInfo}
                  onChange={(e) => patch({ AddInfo: e.target.value })}
                  placeholder="e.g. Live on BBC Scotland"
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                />
              </div>
              <div style={{ maxWidth: 260 }}>
                <label style={fieldLabel}>Season ticket number</label>
                <input
                  value={edit.SeasonTicket}
                  onChange={(e) => patch({ SeasonTicket: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                />
              </div>
            </div>
          </div>

          {formError && (
            <div style={{ padding: "10px 12px", background: "#FEF3F2", border: "1px solid #FDA29B", borderRadius: 9, fontSize: 13.5, color: "#B42318" }}>
              {formError}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ flex: "0 1 332px", minWidth: 280, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Result */}
          <div style={panelStyle}>
            <PanelHeading color="#101828">Result</PanelHeading>
            {isNew ? (
              <p style={{ fontSize: 13, color: "#667085", margin: 0 }}>
                Add the fixture first — you can enter the final score and crowd once it&apos;s saved.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "end" }}>
                  <div>
                    <label style={fieldLabel}>Home</label>
                    <input
                      inputMode="numeric"
                      value={r.home}
                      disabled={r.postponed}
                      onChange={(e) => setResult({ home: e.target.value.replace(/[^\d]/g, "").slice(0, 2) })}
                      style={{ ...inputStyle, height: 46, fontSize: 22, fontWeight: 600, textAlign: "center", background: r.postponed ? "#F2F4F7" : "#fff" }}
                      className="focus:border-[#0A4B93]"
                    />
                  </div>
                  <span style={{ fontSize: 20, color: "#98A2B3", lineHeight: "46px" }}>–</span>
                  <div>
                    <label style={fieldLabel}>Away</label>
                    <input
                      inputMode="numeric"
                      value={r.away}
                      disabled={r.postponed}
                      onChange={(e) => setResult({ away: e.target.value.replace(/[^\d]/g, "").slice(0, 2) })}
                      style={{ ...inputStyle, height: 46, fontSize: 22, fontWeight: 600, textAlign: "center", background: r.postponed ? "#F2F4F7" : "#fff" }}
                      className="focus:border-[#0A4B93]"
                    />
                  </div>
                </div>
                <div>
                  <label style={fieldLabel}>Crowd</label>
                  <input
                    inputMode="numeric"
                    value={r.crowd}
                    onChange={(e) => setResult({ crowd: e.target.value.replace(/[^\d]/g, "").slice(0, 6) })}
                    placeholder="e.g. 3214"
                    style={inputStyle}
                    className="focus:border-[#0A4B93]"
                  />
                </div>
                <ToggleRow
                  on={r.postponed}
                  onToggle={() => setResult({ postponed: !r.postponed })}
                  title="Postponed"
                  hint="Shows as P–P on the website"
                />
                <p style={{ fontSize: 12, color: "#98A2B3", margin: 0 }}>
                  Clear both scores and the crowd to remove the result.
                </p>
              </div>
            )}
          </div>

          {/* Media */}
          <div style={panelStyle}>
            <PanelHeading color="#5925DC">Media</PanelHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={fieldLabel}>Gallery reference</label>
                <input
                  value={edit.AlbumID}
                  onChange={(e) => patch({ AlbumID: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                />
              </div>
              <div>
                <label style={fieldLabel}>YouTube URL</label>
                <input
                  value={edit.EmbedCode}
                  onChange={(e) => patch({ EmbedCode: e.target.value })}
                  placeholder="https://youtube.com/…"
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                />
              </div>
              <div>
                <label style={fieldLabel}>SoundCloud set URL</label>
                <input
                  value={edit.SCEmbedURL}
                  onChange={(e) => patch({ SCEmbedURL: e.target.value })}
                  placeholder="https://soundcloud.com/…"
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Shared bits ------------------------------ */

function DeleteDialog({
  label,
  hasResult,
  onCancel,
  onConfirm,
}: {
  label: string;
  hasResult: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(16,24,40,.45)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5"
        style={{ boxShadow: "0 24px 60px rgba(16,24,40,.28)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#101828" }}>Delete fixture</h2>
        <p style={{ marginTop: 8, fontSize: 14, color: "#475467" }}>
          Delete <strong>{label}</strong>
          {hasResult ? " and its result" : ""}? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end" style={{ gap: 8 }}>
          <button type="button" onClick={onCancel} style={btnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ ...btnDanger, fontWeight: 600 }}
            className="hover:bg-[#FEF3F2]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  on,
  onToggle,
  title,
  hint,
}: {
  on: boolean;
  onToggle: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        background: on ? "#FFFAEB" : "#F9FAFB",
        border: `1px solid ${on ? "#FEDF89" : "#E4E7EC"}`,
        borderRadius: 9,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "#344054" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#98A2B3" }}>{hint}</div>
      </div>
      <div
        style={{
          width: 38,
          height: 22,
          borderRadius: 99,
          background: on ? "#F79009" : "#D0D5DD",
          transition: "background .15s",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            transition: "left .15s",
            boxShadow: "0 1px 2px rgba(16,24,40,.2)",
          }}
        />
      </div>
    </button>
  );
}
