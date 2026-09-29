import { useEffect, useRef, useState } from "react";
import { awardOnce, POINT_VALUES, useWallet } from "./pointsStore";
import { parseAppHash } from "./hashRoute";
import {
  WEBINAR_AWAY_MS,
  attendanceOutcome,
  canJoinWebinar,
  formatIstClock,
  formatWebinarDate,
  joinWindowState,
  markJoin,
  markLeftEarly,
  readAttendance,
  shouldCreditWebinarPoints,
  tickAttendance,
  webinarSessionBounds,
  writeAttendance,
} from "./webinars";

let sessionGuard = 0;

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function persist(id, record) {
  writeAttendance(id, record);
  return record;
}

export default function WebinarSession({ webinar, registered, onBack }) {
  const wallet = useWallet();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [record, setRecord] = useState(() => readAttendance(webinar.id));
  const [award, setAward] = useState(null);
  const [joinError, setJoinError] = useState("");
  const awardKey = useRef("");
  const webinarRef = useRef(webinar);
  webinarRef.current = webinar;

  const bounds = webinarSessionBounds(webinar);
  const windowState = joinWindowState(webinar, nowMs);
  const outcome = attendanceOutcome(webinar, record, nowMs);
  const inRoom = outcome === "in_session" || Boolean(record?.joinedAt && !record?.leftEarlyAt && !record?.endCheckAt && nowMs < (bounds?.endMs || 0));

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!shouldCreditWebinarPoints(webinar, record, nowMs)) return;
    const key = `webinar:${webinar.id}`;
    if (awardKey.current === key) return;
    awardKey.current = key;
    setAward(awardOnce(key, POINT_VALUES.webinar, `Attended webinar: ${webinar.title}`));
  }, [webinar, record, nowMs]);

  useEffect(() => {
    if (!record?.joinedAt || record.endCheckAt || record.leftEarlyAt) return undefined;
    const tick = () => {
      const visible = document.visibilityState === "visible";
      const currentWebinar = webinarRef.current;
      setRecord((prev) => {
        if (!prev?.joinedAt || prev.endCheckAt || prev.leftEarlyAt) return prev;
        const next = tickAttendance(currentWebinar, prev, Date.now(), {
          visible,
          awayMs: WEBINAR_AWAY_MS,
        });
        return persist(currentWebinar.id, next);
      });
      setNowMs(Date.now());
    };
    const timer = window.setInterval(tick, 2000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [webinar.id, record?.joinedAt, record?.endCheckAt, record?.leftEarlyAt]);

  useEffect(() => {
    const my = ++sessionGuard;
    const leaveIfNeeded = () => {
      const current = readAttendance(webinar.id);
      const endMs = webinarSessionBounds(webinarRef.current)?.endMs || 0;
      if (
        current?.joinedAt &&
        !current.endCheckAt &&
        !current.leftEarlyAt &&
        Date.now() < endMs
      ) {
        persist(webinar.id, markLeftEarly(current, Date.now()));
      }
    };
    const onHash = () => {
      const { id, service } = parseAppHash(window.location.hash);
      if (service !== "webinars" || id !== webinar.id) leaveIfNeeded();
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("pagehide", leaveIfNeeded);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("pagehide", leaveIfNeeded);
      window.setTimeout(() => {
        if (sessionGuard !== my) return;
        leaveIfNeeded();
        setRecord(readAttendance(webinar.id));
      }, 80);
    };
  }, [webinar.id]);

  const handleJoin = () => {
    setJoinError("");
    const result = markJoin(webinar, Date.now(), record);
    if (!result.ok) {
      const reason = result.reason;
      setJoinError(
        reason === "upcoming"
          ? "The session has not started yet."
          : reason === "too_late" || reason === "ended"
            ? "Join closed. You can join only until 5 minutes after start."
            : "You cannot join this session."
      );
      return;
    }
    setRecord(persist(webinar.id, result.record));
    setNowMs(Date.now());
  };

  const handleLeave = () => {
    if (inRoom) {
      const current = readAttendance(webinar.id) || record;
      if (current?.joinedAt && !current.endCheckAt) {
        setRecord(persist(webinar.id, markLeftEarly(current, Date.now())));
      }
    }
    onBack?.();
  };

  const credited = Boolean(wallet.earned[`webinar:${webinar.id}`] || award?.ok);
  const startDone = Boolean(record?.startCheckAt);
  const endDone = outcome === "complete";
  const joinAllowed = registered && canJoinWebinar(webinar, nowMs, record) && !record?.joinedAt;

  return (
    <article className="edu-panel-card edu-session">
      <p className="edu-badge">
        {outcome === "complete"
          ? "Attendance complete"
          : inRoom
            ? "Live session"
            : windowState === "join_open"
              ? "Join now"
              : windowState === "upcoming"
                ? "Starting soon"
                : "Session closed"}
      </p>
      <h2>{webinar.title}</h2>
      <p>
        {formatWebinarDate(webinar.date)} · {webinar.time} · {webinar.host}
      </p>

      <div className="edu-checks" aria-label="Attendance checkpoints">
        <div className={startDone ? "edu-check is-done" : "edu-check"}>
          <strong>Start checkpoint</strong>
          <span>
            {startDone
              ? `Joined at ${formatIstClock(record.startCheckAt)}.`
              : bounds
                ? `Join between ${formatIstClock(bounds.startMs)} and ${formatIstClock(bounds.joinCloseMs)}.`
                : "Join at session start."}
          </span>
        </div>
        <div
          className={
            endDone ? "edu-check is-done" : outcome === "left_early" ? "edu-check is-miss" : "edu-check"
          }
        >
          <strong>End checkpoint</strong>
          <span>
            {endDone
              ? `Stayed until ${bounds ? formatIstClock(bounds.endMs) : "the end"}.`
              : outcome === "left_early"
                ? "You left before the session ended."
                : bounds
                  ? `Stay on this page until ${formatIstClock(bounds.endMs)}.`
                  : "Stay until the session ends."}
          </span>
        </div>
      </div>

      {!registered ? (
        <p className="edu-note">Register for a seat first, then join from this screen.</p>
      ) : null}

      {joinError ? <p className="edu-note">{joinError}</p> : null}

      {outcome === "complete" || credited ? (
        <p className="edu-points-earned" role="status">
          {award && !award.already
            ? `+${POINT_VALUES.webinar} MediHome points credited for full attendance. Total ${wallet.balance} points.`
            : `Attendance complete. Your total is ${wallet.balance} MediHome points.`}
        </p>
      ) : null}

      {outcome === "left_early" ? (
        <p className="edu-note">
          You left the session. MediHome points were not credited.
        </p>
      ) : null}

      {outcome === "missed_join" ? (
        <p className="edu-note">
          Join closed 5 minutes after start. MediHome points are not credited if you miss the start checkpoint.
        </p>
      ) : null}

      {windowState === "upcoming" && registered ? (
        <p className="edu-note">
          Join opens at {bounds ? formatIstClock(bounds.startMs) : webinar.time}. You may join up to 5 minutes late. Stay until the end to earn {POINT_VALUES.webinar} MediHome points. Registration alone does not add points.
        </p>
      ) : null}

      {inRoom ? (
        <div className="edu-session-room">
          <p className="edu-session-live">You are in the live session</p>
          <p>
            Stay on this screen until {bounds ? formatIstClock(bounds.endMs) : "the end"}. Leaving this page, or hiding it for more than 20 seconds, cancels MediHome points.
          </p>
          <p className="edu-session-clock">
            {bounds && nowMs < bounds.endMs
              ? `${formatRemaining(bounds.endMs - nowMs)} remaining`
              : "Session ending…"}
          </p>
        </div>
      ) : null}

      <div className="edu-form-actions">
        {joinAllowed ? (
          <button type="button" className="edu-btn edu-btn-primary" onClick={handleJoin}>
            Join session
          </button>
        ) : null}
        {windowState === "upcoming" && registered ? (
          <button type="button" className="edu-btn edu-btn-primary" disabled>
            Join opens at {bounds ? formatIstClock(bounds.startMs) : "start"}
          </button>
        ) : null}
        <button type="button" className="edu-btn edu-btn-ghost" onClick={handleLeave}>
          {inRoom ? "Leave session" : "Back to webinars"}
        </button>
      </div>
    </article>
  );
}
