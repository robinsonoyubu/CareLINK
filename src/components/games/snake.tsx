"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AdPlayer, fetchCampaign, type Campaign } from "@/components/medlink/ad-player";
import { shouldShowBreakAd } from "@/lib/medlink/games";

const GRID = 20;
const START_SPEED_MS = 160;
const MIN_SPEED_MS = 60;

type Point = { x: number; y: number };
type Dir = Point;
const DIRS: Record<string, Dir> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

function randomFood(snake: Point[]): Point {
  for (;;) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

function readHigh() { try { return Number(localStorage.getItem("medlink-snake-high") ?? 0); } catch { return 0; } }
function writeHigh(n: number) { try { localStorage.setItem("medlink-snake-high", String(n)); } catch { /* ignore */ } }

/** Retro snake with increasing speed, high score, pause/restart and touch controls. Original graphics. */
export function SnakeGame() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ snake: [{ x: 10, y: 10 }], dir: DIRS.right, queued: DIRS.right, food: { x: 15, y: 10 }, speed: START_SPEED_MS });
  const [phase, setPhase] = useState<"ready" | "playing" | "paused" | "over">("ready");
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);
  const [continued, setContinued] = useState(false);
  const [ad, setAd] = useState<{ campaign: Campaign; placement: "game_break" | "rewarded_game" } | null>(null);
  const rounds = useRef(0);
  const lastAdAt = useRef<number | null>(null);
  const session = useRef<string | null>(null);
  const touchStart = useRef<Point | null>(null);

  useEffect(() => { queueMicrotask(() => setHigh(readHigh())); }, []);

  const draw = useCallback(() => {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const cell = c.width / GRID;
    ctx.fillStyle = "#0B2E4F"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#F59E0B";
    const f = state.current.food;
    ctx.beginPath(); ctx.arc(f.x * cell + cell / 2, f.y * cell + cell / 2, cell / 2.6, 0, Math.PI * 2); ctx.fill();
    state.current.snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#22C55E" : "#4ADE80";
      ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
    });
  }, []);

  const endRound = useCallback(async (finalScore: number) => {
    setPhase("over");
    rounds.current += 1;
    if (finalScore > readHigh()) { writeHigh(finalScore); setHigh(finalScore); }
    if (session.current) {
      const supabase = createClient();
      await supabase.from("game_sessions").update({ ended_at: new Date().toISOString(), score: finalScore, outcome: "failed" }).eq("id", session.current);
      session.current = null;
    }
    // Interstitial only at this natural break, frequency-capped.
    if (shouldShowBreakAd(rounds.current, lastAdAt.current)) {
      const c = await fetchCampaign("game_break");
      if (c) { setAd({ campaign: c, placement: "game_break" }); lastAdAt.current = Date.now(); rounds.current = 0; }
    }
  }, []);

  useEffect(() => {
    if (phase !== "playing") { draw(); return; }
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const s = state.current;
      s.dir = s.queued;
      const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
      const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
      const hitSelf = s.snake.some((p) => p.x === head.x && p.y === head.y);
      if (hitWall || hitSelf) { endRound(s.snake.length - 1); draw(); return; }
      s.snake.unshift(head);
      if (head.x === s.food.x && head.y === s.food.y) {
        s.food = randomFood(s.snake);
        s.speed = Math.max(MIN_SPEED_MS, s.speed - 4);
        setScore(s.snake.length - 1);
      } else {
        s.snake.pop();
      }
      draw();
      timer = setTimeout(tick, s.speed);
    };
    timer = setTimeout(tick, state.current.speed);
    return () => clearTimeout(timer);
  }, [phase, draw, endRound]);

  const turn = useCallback((d: Dir) => {
    const cur = state.current.dir;
    if (cur.x + d.x === 0 && cur.y + d.y === 0) return; // no reversing into yourself
    state.current.queued = d;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: DIRS.up, ArrowDown: DIRS.down, ArrowLeft: DIRS.left, ArrowRight: DIRS.right, w: DIRS.up, s: DIRS.down, a: DIRS.left, d: DIRS.right };
      if (map[e.key] && phase === "playing") { e.preventDefault(); turn(map[e.key]); }
      if (e.key === " " && (phase === "playing" || phase === "paused")) { e.preventDefault(); setPhase(phase === "playing" ? "paused" : "playing"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, turn]);

  async function start(fresh = true) {
    if (fresh) {
      state.current = { snake: [{ x: 10, y: 10 }], dir: DIRS.right, queued: DIRS.right, food: randomFood([{ x: 10, y: 10 }]), speed: START_SPEED_MS };
      setScore(0);
      setContinued(false);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("game_sessions").insert({ profile_id: user.id, game_slug: "snake" }).select("id").single();
        session.current = data?.id ?? null;
      }
    }
    setPhase("playing");
  }

  /** Voluntary rewarded ad → one continue per round. A game perk, not wallet coins. */
  async function offerContinue() {
    const c = await fetchCampaign("rewarded_game");
    if (!c) return;
    setAd({ campaign: c, placement: "rewarded_game" });
  }

  function continueRound() {
    const s = state.current;
    const len = s.snake.length;
    s.snake = Array.from({ length: len }, (_, i) => ({ x: Math.max(0, 10 - i), y: 10 }));
    s.dir = DIRS.right; s.queued = DIRS.right;
    s.food = randomFood(s.snake);
    setContinued(true);
    setPhase("playing");
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-md justify-between text-sm">
        <span>Score <strong>{score}</strong></span>
        <span>High score <strong>{high}</strong></span>
      </div>
      <div className="relative w-full max-w-md">
        <canvas ref={canvas} width={400} height={400} className="w-full aspect-square rounded-xl touch-none"
          aria-label="Snake game board"
          onTouchStart={(e) => { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; }}
          onTouchEnd={(e) => {
            const s = touchStart.current; if (!s) return;
            const t = e.changedTouches[0]; const dx = t.clientX - s.x; const dy = t.clientY - s.y;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
            turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.right : DIRS.left) : (dy > 0 ? DIRS.down : DIRS.up));
          }} />
        {phase !== "playing" && !ad && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/50 text-white">
            {phase === "over" && <p className="text-lg font-semibold">Game over — {score} points</p>}
            {phase === "paused" && <p className="text-lg font-semibold">Paused</p>}
            <div className="flex gap-2">
              {phase === "paused" ? <Button onClick={() => start(false)}><Play className="h-4 w-4" />Resume</Button>
                : <Button onClick={() => start(true)}><Play className="h-4 w-4" />{phase === "over" ? "Play again" : "Start"}</Button>}
              {phase === "over" && !continued && score > 0 && <Button variant="outline" className="text-[#0F172A]" onClick={offerContinue}>Watch ad to continue</Button>}
            </div>
          </div>
        )}
        {ad && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 p-3">
            <div className="w-full">
              <AdPlayer campaign={ad.campaign} placement={ad.placement} gameSlug="snake" onDone={(r) => {
                const wasRewarded = ad.placement === "rewarded_game";
                setAd(null);
                if (wasRewarded && r.completed) continueRound();
              }} />
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 md:hidden" aria-label="Direction controls">
        <span />
        <Button size="icon" variant="outline" onClick={() => turn(DIRS.up)} aria-label="Up"><ArrowUp className="h-5 w-5" /></Button>
        <span />
        <Button size="icon" variant="outline" onClick={() => turn(DIRS.left)} aria-label="Left"><ArrowLeft className="h-5 w-5" /></Button>
        <Button size="icon" variant="outline" onClick={() => turn(DIRS.down)} aria-label="Down"><ArrowDown className="h-5 w-5" /></Button>
        <Button size="icon" variant="outline" onClick={() => turn(DIRS.right)} aria-label="Right"><ArrowRight className="h-5 w-5" /></Button>
      </div>
      <div className="flex gap-2">
        {phase === "playing" && <Button size="sm" variant="outline" onClick={() => setPhase("paused")}><Pause className="h-4 w-4" />Pause</Button>}
        {(phase === "playing" || phase === "paused") && <Button size="sm" variant="outline" onClick={() => start(true)}><RotateCcw className="h-4 w-4" />Restart</Button>}
      </div>
      <p className="text-xs text-[#94A3B8]">Arrow keys / WASD or swipe. Space to pause.</p>
    </div>
  );
}
