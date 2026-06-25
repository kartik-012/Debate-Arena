DEBATE ARENA
Full Project Documentation
PRD · TRD · App Flow · Design Brief · Backend Schema · Implementation Plan · SQL Schema
AI-powered multi-LLM debate platform with 3D courtroom visualization,
live scoring, fact-checking, bias auditing, and multi-perspective judging.

Quick Reference
This document combines all 7 project planning documents for Debate Arena into a single reference. Use this during development to avoid switching between files.

Document Index

Document 1 — Product Requirements (PRD)

1.1 App Overview
1.2 Problem Statement
People rarely see both sides of a debatable question argued with equal effort and rigor. Existing AI chatbots give one quietly-biased 'balanced' answer with no visible reasoning. There is no accessible tool that shows two strong, opposing AI arguments actively responding to each other, visualizes the judgment process, and exposes whether that judgment itself might be biased — all in an experience compelling enough that people want to watch it happen, not just read a transcript.
1.3 Target Users
1.4 Core Features — Full Scope (18 Features, 4 Tiers)
Tier 1 — Core Engine
Multi-round AI vs AI debate with turn-taking
Single judge verdict with written reasoning
Live 3D courtroom visualization of the debate happening
Basic web UI: question input, live debate view, verdict view, history
Tier 2 — Configuration & Output
Adjustable number of rounds (1 / 3 / 5)
Selectable tone/persona (Formal, Casual, Courtroom)
Multi-model debate — Side A on Claude, Side B on GPT, Judge on Gemini (any combination)
PDF export of full transcript
'Steal the best argument' — auto-generated summary of strongest points per side
Tier 3 — Real-Time & Advanced Intelligence
Live strength/confidence score per round, graphed
Fact-check layer — flags unverified/fabricated claims live
Personality consistency tracking — flags when a side contradicts its own earlier argument
Mid-debate user participation — user can jump in and argue a turn themselves
Tier 4 — Advanced Judgment & Polish
Multi-persona audience voting — 5 simulated judge personas vote independently
Bias detection — same debate re-run with sides swapped, flags if verdict flips
Multi-topic chained debates — conclusion of one debate seeds the next
Live typing animation for arguments appearing
Full 3D animated podium/courtroom scene with reactive lighting, verdict scene transition
Note: Tier order is dependency order, not priority order. Do not build Tier 2+ features until Tier 1 works end-to-end.
1.5 User Stories
As a student, I want to type a debatable question and watch two AIs argue it in an engaging visual scene, so I understand both sides quickly and enjoyably.
As a student, I want to see a live score after each round, so I can tell who's winning as it unfolds.
As a user, I want flagged claims that might be fabricated, so I don't walk away believing a false statistic.
As a user, I want to know if the judge favored whichever side spoke first, so I can trust the verdict more.
As a builder, I want multi-model debates, so I can show the AI isn't just arguing with a mirror of itself.
As a user, I want to jump into the debate myself, so I'm not just a spectator.
As a user, I want to export a finished debate as a PDF, so I can share or archive it.
As a user, I want to see 5 different judge personalities vote independently, so I understand that verdicts can be subjective.
1.6 MVP (Tier 1) Definition
MVP means Tier 1, fully working, before any Tier 2+ code is written — not a permanently smaller product.
Single-model debate (Claude only) with fixed 3 rounds
Side A / Side B turn-taking, full transcript saved
Single judge verdict with reasoning
3D courtroom scene rendering the debate live (basic: two glowing podiums)
Web UI: Home, Live Debate (3D + transcript), Verdict, History
Note: Definition of done for Tier 1: a user can open the app, ask any question, watch a 3-round debate unfold inside the 3D scene, and read a verdict — fully working, before Tier 2 work begins.
1.7 Success Metrics
1.8 Open Risks
API cost across 3 providers, multiple judge passes, fact-checking, and bias re-runs — token usage will be significant.
3D performance on lower-end devices — must have a graceful fallback (2D view) if frame rate drops.
LLM judge bias is a known unsolved research problem — Tier 4 bias detection exposes this; it does not fix it. State this honestly in any report.

Document 2 — Technical Requirements (TRD)

2.1 System Architecture
Architecture style: layered monolith — correct at this scale even with expanded feature set. Microservices would add deployment overhead with no real benefit for a single-instance app.
┌──────────────────────────────────────────────────────────┐

│                     CLIENT (Browser)                      │

│   React + Vite + TailwindCSS + React Three Fiber +        │

│   Framer Motion                                            │

└───────────────────────┬────────────────────────────────────┘

                         │ HTTPS / REST + polling

┌───────────────────────▼────────────────────────────────────┐

│                   APPLICATION SERVER                        │

│                   FastAPI (Python, async)                   │

│ ┌────────────┬──────────┬────────────┬──────────┬────────┐  │

│ │Orchestrator│  Judge   │ Fact-Check │ Bias/    │Persona │  │

│ │ (turns)    │  Engine  │  Engine    │Consist.  │Voting  │  │

│ └────────────┴──────────┴────────────┴──────────┴────────┘  │

└──────┬─────────────────┬──────────────────┬─────────────────┘

       │                 │                  │

  LLM APIs          SQLite DB          Web Search API

  Claude/GPT/       (7 tables)         (fact-check)

  Gemini
2.2 Frontend Stack
3D Scene Requirements (for coding agent)
Scene: two podium meshes (simple extruded geometry), positioned left and right of center aisle, facing raised judge bench at back-center.
Speaking indicator: active speaker's podium emits soft glow (pointLight intensity animated up when that side is generating/displaying a turn, down otherwise).
Verdict moment: camera or lighting shifts toward winning podium when judge_verdicts data arrives — the one 'spend your boldness' moment.
Performance fallback: if device reports low FPS (detect via FPS counter for first 2 seconds), automatically swap to flat 2D center-axis layout. Hard requirement, not optional polish.
Asset budget: keep total 3D scene under ~2MB. Geometry must be procedural/primitive-based, not imported model files.
2.3 Backend Stack
2.4 Internal API Endpoints
2.5 Security Requirements
No API keys in source code — all via .env / hosting platform environment variables
In-memory per-IP rate limiting (returns 429 after limit exceeded)
Per-provider rate/cost limiting — 3 paid APIs are in play
Parameterized queries only — no string-formatted SQL
CORS scoped to the real frontend domain in production
Prompt injection guarding in orchestrator system prompts
No authentication, no sessions, no users table — UUIDs are the only access boundary

Document 3 — App Flow

3.1 Global Rules (Every Screen)
Loading state: any action triggering an API call must show a loading indicator within 300ms.
Error state: any failed API call shows a visible message — never fails silently.
Empty state: any list/data view with zero items shows explanatory text + a next action.
Responsiveness: desktop-first, must degrade gracefully to tablet (768px). Mobile: 3D scene auto-disables and layout stacks vertically.
3D performance: every screen with a 3D scene must run the FPS check and fallback described in the TRD before rendering the full scene.
No browser storage: all state in React state + backend DB only.
3.2 Screen Map
3.3 Key Screen Behaviors
Screen 1 — Home
App name 'Debate Arena' top-left; nav: 'New Debate' (active), 'History' top-right
Center heading: 'What should we debate today?'
Text input (max 300 chars, character counter appears once typing starts)
Empty input + 'Start Debate' click → red border on input, inline error: 'Please enter a question to debate.' No API call.
Valid input + 'Start Debate' click → button shows spinner + 'Starting...', POST /debate/start fires. Success → navigate to Screen 2. Failure → Error Toast, button resets.
Screen 2 — Live Debate
Top bar: debate question + 'Round X of Y' indicator
Center: 3D scene (React Three Fiber) — two podiums (left=FOR, right=AGAINST), judge bench at back. Active speaker's podium glows.
Below/beside: transcript panel with argument cards + live score graph (Recharts)
Poll GET /debate/{id} every 2s while status == 'in_progress' or 'judging'
3+ failed polls → Error Toast: 'Lost connection to the debate. Retrying...' — keep retrying every 5s
Low FPS detected → silently swap 3D canvas for flat 2D center-axis layout (no error shown)
When status == 'complete' → auto-navigate to Screen 3
Screen 3 — Verdict
Top: debate question, 'Debate Complete' label
Banner: 'Winner: FOR / AGAINST' with accent color
Judge's full written reasoning, centered readable column
Buttons: 'View Full Transcript', 'Export PDF' (disabled until Tier 2), 'Start New Debate'
3.4 Status Values Contract
Note: Any other status string → treat as 'error' by default. This contract must not be modified when adding Tier 2–4 features.
3.5 Navigation Map
Home (1)

  → [Start Debate]  → Live Debate (2)

  → [History]       → History (4)

  → [Settings]      → Settings Modal (6) → Home (1)



Live Debate (2)

  → [auto, judge complete]     → Verdict (3)

  → [Join the debate, Tier 3]  → Mid-Debate Panel (12) → back to Live (2)

  → [click fact-check, Tier 3] → Fact-Check Panel (8)  → back to Live (2)

  → [error]                    → Error Screen (7)



Verdict (3)

  → [Start New Debate]             → Home (1)

  → [See 5 judges, Tier 4]         → Multi-Persona Verdict (9) → Verdict (3)

  → [Check bias, Tier 4]           → Bias Report (10) → Verdict (3)

  → [Continue chained, Tier 4]     → Chained Transition (13) → Live Debate (2)

  → [Export PDF, Tier 2]           → triggers download, no navigation



History (4)

  → [+ New Debate]            → Home (1)

  → [click complete debate]   → Detail (5)

  → [click in-progress]       → Live Debate (2)

Document 4 — UI/UX Design Brief

4.1 Design Concept
Core idea: the center axis is no longer just a 2D dividing line — it is the physical center aisle of a 3D courtroom scene. Two podiums face a judge's bench across that aisle. The scene stays perfectly neutral until a verdict is reached, then the camera/lighting resolves toward the winner.
Signature element: the verdict camera move — when judging completes, the 3D camera performs one deliberate, smooth move toward the winning podium while its light intensifies, and the losing podium's light dims. This is the one place all visual boldness is spent.
4.2 Color Tokens
4.3 Typography
4.4 3D Scene Specification
Note: Restraint rule: the 3D scene should NEVER have more than 2 simultaneous animated elements. Anything beyond that risks visual noise competing with the argument text.
4.5 Mobile Responsiveness
4.6 What NOT to Do
Do NOT default to blue/red for the two sides — use pine green and burnt sienna per tokens above.
Do NOT add drop shadows to 2D cards.
Do NOT animate every state change — only the verdict moment gets real motion.
Do NOT use generic chart library default styling.
Do NOT import realistic/photorealistic 3D courtroom assets or models — geometry must stay abstract/architectural.
Do NOT add ambient camera movement (orbiting, drifting) 'for life' — camera is static except for the one verdict move.
Do NOT skip the FPS/mobile fallback — a broken or laggy 3D scene is worse than no 3D scene.

Document 5 — Backend Schema

5.1 Entity Relationship Overview
debates (1) ──────< (many) debate_turns

   │                         │

   │                         ├──< (many) fact_checks

   │                         └──< (many) consistency_flags

   │

   ├────────────< (many) judge_verdicts

   ├────────────< (many) persona_votes

   ├────────────< (0 or 1) bias_reports

   └────────────< (0 or 1, self-referencing) parent_debate_id
5.2 Table: debates
5.3 Table: debate_turns
Note: UNIQUE constraint: (debate_id, side, round_number) — prevents duplicate-turn bugs.
5.4 Table: judge_verdicts
Note: App-layer rule: debates.winning_side is always set from the row where persona = 'single_judge' AND is_order_swapped = false — this is the 'official' verdict.
5.5 Tables: fact_checks, consistency_flags, persona_votes, bias_reports
5.6 Authentication & Permissions
No authentication. No sessions. No users table. This holds across all 4 tiers.
UUIDs are the only practical access boundary (unguessable IDs).
Any client can create a debate (POST /debate/start).
Any client can read any debate by ID (all GET endpoints).
Only the backend orchestrator writes to debate_turns, judge_verdicts, fact_checks, consistency_flags, persona_votes, bias_reports.
The one exception: debate_turns rows with is_user_submitted = true, written via POST /debate/{id}/user-turn.
No delete endpoints exposed in any tier — cleanup is a direct DB-level operation if ever needed.

Document 6 — Implementation Plan

6.1 How to Use This Plan
Feed the agent one Tier at a time, in order, each as a fresh, focused task. Do not paste the entire 18-feature scope into one agent session. Suggested prompt pattern per tier:
'Using the attached PRD, TRD, App Flow, Design Brief, and Schema documents, build [Tier N] only, as scoped in the Implementation Plan's Tier N section. Do not build features from later tiers yet.'
6.2 Tier Summary Table
6.3 Tier 1 — Core Engine
Phase 1.1 — Setup
Backend: Python venv, FastAPI, uvicorn, anthropic SDK, python-dotenv installed
Frontend: React + Vite scaffolded, Tailwind added, React Three Fiber + drei + Framer Motion + Recharts installed
.env with Anthropic API key
Deliverable: GET /health reachable from React app
Phase 1.2 — Database
Run schema_full.sql (all 7 tables created now)
database.py connection helpers
Pydantic models for Debate, DebateTurn, JudgeVerdict
Deliverable: test script inserts/reads a fake row successfully
Phase 1.3 — Authentication
Confirm no users table, no login routes
Add in-memory per-IP rate limiting middleware
Deliverable: exceeding the limit returns 429
Phase 1.4 — Core UI (static shell)
Routing for Screens 1–5
Home screen UI (input, Settings modal, Start button) — not yet wired
Live Debate screen UI: basic 3D scene (two podiums, judge bench, static camera, neutral lighting), transcript panel, score graph placeholder — hardcoded fake data
Verdict screen UI with fake data
History + Detail screens with 2–3 fake sample debates
Apply Design Brief tokens: colors, fonts, card/button styles, 3D scene per Section 2.3
Deliverable: full click-through with correct visuals, all fake data, 3D scene renders with FPS fallback to 2D working
Phase 1.5 — Main Features (real logic)
ai_clients.py (Claude call working) — confirm via direct test run
orchestrator.py: turn-taking logic, builds tone-aware prompts, calls AI, saves via database.py
POST /debate/start, POST /debate/{id}/next-turn, GET /debate/{id}, GET /debates
judge.py: single-judge verdict generation and parsing
Wire Home → real /debate/start; Live Debate → real polling; 3D podium glow reacts to real turn data; Verdict → real judge output; History/Detail → real data
Deliverable: a real question produces a real 3-round debate and a real verdict, end-to-end, no fake data remaining
Phase 1.6 — Testing
10 varied questions run end-to-end, pass/fail logged
Edge cases: empty input, max-length input, a question the model might refuse
pytest for schema constraints + orchestrator turn order
Deliverable: 10/10 pass, edge cases handled gracefully
Note: Tier 1 exit criteria: everything above works with zero crashes before any Tier 2 code is written.
6.4 Tier 2 — Configuration & Output
2.1 Database: no new tables — model_for/model_against/model_judge columns already exist, now populated by non-default values.
2.2 Backend: extend ai_clients.py with openai and google-generativeai; update orchestrator to route per-debate; pdf_export.py; GET /debate/{id}/best-arguments.
2.3 Frontend: Settings modal adds 3-dropdown model selection; Verdict screen adds 'Key Arguments' section + 'Export PDF' button.
2.4 Testing: run debates with mixed providers; confirm PDF downloads and opens correctly.
Note: Tier 2 exit criteria: user can pick any combination of 3 providers per side/judge, get a working debate, and export it.
6.5 Tier 3 — Real-Time & Advanced Intelligence
3.1 Database: no new tables needed — strength_score, fact_checks, consistency_flags already exist from full schema.
3.2 Backend: scoring step after each turn; fact_checker.py (extract claims → verify via web search); consistency_checker.py (sentence-transformers); POST /debate/{id}/user-turn.
3.3 Frontend: score graph shows real live data; fact-check warning icons; consistency warning icons; Mid-Debate Participation Panel (Screen 12).
3.4 Testing: scoring appears within same poll cycle as turn; fact-check flags fabricated statistic; consistency flags self-contradiction in round 3.
Note: Tier 3 exit criteria: all three intelligence layers visibly work on a real debate, and a user can successfully insert their own argument mid-debate without breaking the turn sequence.
6.6 Tier 4 — Advanced Judgment & Polish
4.1 Database: persona_votes and bias_reports now written to; parent_debate_id now used.
4.2 Backend: POST /debate/{id}/persona-votes (5 separate AI calls per persona); POST /debate/{id}/bias-check (re-run with sides relabeled/swapped); chained debate follow-up question generation.
4.3 Frontend: Screens 9, 10, 13 built per App Flow specs; live typing animation (Framer Motion); full 3D richness (verdict camera move, refined lighting transitions).
4.4 Testing: bias detection produces both outcomes across different test questions; chained debates correctly carry context; full regression pass re-runs original Tier 1 10-question test.
Note: Tier 4 exit criteria: every one of the 18 features from the PRD is live and demoable.
6.7 Tier 5 — Deployment & Final Delivery
.gitignore confirmed (.env, *.db, node_modules, venv)
GitHub repo, README with setup instructions, architecture diagram, screenshots
Deploy publicly (Render/Railway + Vercel) or keep local-run-only given 3 paid API keys involved
All env vars set on host, CORS scoped to real frontend domain
Loading/empty/error states re-checked against App Flow Section 0, across all 13 screens
README polish: demo GIF/video (the 3D verdict moment is worth specifically capturing), clear 'why this is unique' framing

Document 7 — SQL Schema Summary

7.1 How to Initialize the Database
# One-time setup — creates all 7 tables:

python -c "import sqlite3; sqlite3.connect('debate_arena.db').executescript(open('schema_full.sql').read())"



# Or via the FastAPI app startup (database.py → init_db()):

uvicorn app.main:app --reload --port 8000
7.2 All 7 Tables — Quick Reference
7.3 All Indexes

End of Debate Arena Project Documentation
PRD · TRD · App Flow · Design Brief · Backend Schema · Implementation Plan · SQL Schema