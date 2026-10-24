# Scrum Development Plan & GitHub Project Issue Tracker
## Project: CHRONICLE — Full-Stack Editorial Blog Platform
**Scrum Master & Lead Architect:** 25 Years Software Engineering Experience  
**Sprint Duration:** Sprint 1 (2 Weeks)  
**Methodology:** Agile / Scrum with GitHub Project Issue Governance  

---

## 1. Milestone Overview & Sprint Velocity

| Milestone | Focus Area | Total Story Points | Target Completion | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Milestone 1** | Core Architecture, SQLite Schema & Seed Data Engine | 13 pts | Sprint 1 Day 2 | **COMPLETED** |
| **Milestone 2** | Public Feed, Live Keyword Search & Category Filters | 13 pts | Sprint 1 Day 4 | **COMPLETED** |
| **Milestone 3** | Interactive Article Detail, Like Counter & Discussion Tree | 21 pts | Sprint 1 Day 7 | **COMPLETED** |
| **Milestone 4** | Administrator Authentication & Content Moderation Console | 21 pts | Sprint 1 Day 9 | **COMPLETED** |
| **Milestone 5** | Hardening, Edge Cases, Negative Testing & E2E Validation | 13 pts | Sprint 1 Day 10 | **COMPLETED** |
| **TOTAL** | **Complete Full-Stack Platform** | **81 pts** | **Sprint 1 Complete** | **VERIFIED** |

---

## 2. GitHub Project Issue Tracker

---

### 🎫 ISSUE #1: [BACKEND] Initialize Relational SQLite Schema & Cascading Constraints
* **Issue Summary:** Implement native SQLite database connection with relational table constraints and seed data.
* **Classification:** `backend`, `task`
* **Priority:** `P0 (Blocker)`
* **Complexity:** `Medium`
* **Effort:** 5 Story Points
* **Labels:** `backend`, `database`, `sqlite`, `p0`, `architecture`
* **Background Context:** The platform requires persistent relational storage for user accounts, articles, comments, and replies, enforcing database-level integrity rules.
* **Expected Result:** Database initializes tables (`users`, `posts`, `comments`, `replies`) with foreign keys, default admin credentials, and realistic sample data.
* **Positive Test Cases:**
  * `TC-01-POS`: SQLite initializes `data/blog.db` without errors.
  * `TC-02-POS`: Admin user exists with valid bcrypt password hash.
  * `TC-03-POS`: Foreign keys cascade delete from posts to comments, and comments to replies.
* **Negative Test Cases:**
  * `TC-01-NEG`: Inserting a comment referencing a non-existent `post_id` fails with a foreign key violation error.
  * `TC-02-NEG`: Inserting duplicate usernames into `users` table fails with a unique constraint violation error.
* **Acceptance Criteria (Definition of Done):**
  1. `PRAGMA foreign_keys = ON;` is executed on connection.
  2. Tables `users`, `posts`, `comments`, `replies` exist.
  3. Default admin credentials (`admin` / `admin123`) seeded and hashed.
  4. Initial articles and sample comments seeded successfully.

---

### 🎫 ISSUE #2: [BACKEND] Express Server Setup & Layered Middleware Pipeline
* **Issue Summary:** Establish Express HTTP server with CORS, body parsing, request logging, and centralized error handling.
* **Classification:** `backend`, `task`
* **Priority:** `P0 (Blocker)`
* **Complexity:** `Medium`
* **Effort:** 5 Story Points
* **Labels:** `backend`, `express`, `middleware`, `security`, `p0`
* **Background Context:** A robust middleware pipeline is required to filter incoming HTTP requests, provide request logging, enforce CORS policies, and prevent crashes.
* **Expected Result:** Express runs on port 5000, logs all traffic, injects custom verification headers, and returns structured JSON responses.
* **Positive Test Cases:**
  * `TC-04-POS`: `GET /api/health` returns HTTP 200 with database connectivity status.
  * `TC-05-POS`: Responses include header `X-FullStack-Middleware: Active`.
* **Negative Test Cases:**
  * `TC-03-NEG`: Requests to invalid routes (e.g. `GET /api/unknown-endpoint`) return HTTP 404 with structured JSON error payload.
  * `TC-04-NEG`: Malformed JSON payloads trigger global error handling without crashing the server process.
* **Acceptance Criteria (Definition of Done):**
  1. CORS configured for `http://localhost:3000`.
  2. Request duration logger active for all routes.
  3. JSON body parser configured with 10MB limit.
  4. Centralized error middleware operational.

---

### 🎫 ISSUE #3: [FRONTEND] Vanilla CSS Design System & Layout Scaffolding
* **Issue Summary:** Build comprehensive Vanilla CSS design system with typography, color tokens, and responsive layout.
* **Classification:** `frontend`, `task`
* **Priority:** `P1 (Critical)`
* **Complexity:** `High`
* **Effort:** 8 Story Points
* **Labels:** `frontend`, `css`, `design-system`, `ui-ux`, `p1`
* **Background Context:** The frontend requires an editorial visual design that engages readers using luxury dark slate tones, glassmorphism, and responsive cards.
* **Expected Result:** A unified design system in `client/src/index.css` paired with Google Fonts (*Newsreader* + *Plus Jakarta Sans*).
* **Positive Test Cases:**
  * `TC-06-POS`: Google Fonts load cleanly on all desktop and mobile viewports.
  * `TC-07-POS`: Cards elevate smoothly on hover with cubic-bezier transition curves.
  * `TC-08-POS`: CSS custom properties correctly control dark mode slate variables.
* **Negative Test Cases:**
  * `TC-05-NEG`: Layout does not horizontally overflow or crush elements on narrow mobile viewports (< 400px).
* **Acceptance Criteria (Definition of Done):**
  1. Typography tokens defined for headings and UI sans-serif.
  2. Responsive grid breakpoints implemented.
  3. Glassmorphic card styling with backdrop blur active.
  4. Heartbeat like pulse animation defined in CSS keyframes.

---

### 🎫 ISSUE #4: [FRONTEND & BACKEND] Public Feed, Keyword Search & Category Filters
* **Issue Summary:** Implement public catalog feed with real-time keyword search and category filtering.
* **Classification:** `enhancement`, `frontend`, `backend`
* **Priority:** `P1 (Critical)`
* **Complexity:** `Medium`
* **Effort:** 8 Story Points
* **Labels:** `fullstack`, `search`, `filtering`, `p1`
* **Background Context:** Visitors must be able to explore published articles, search by title/body keywords, and filter by categories.
* **Expected Result:** Feed updates in real time based on search input and selected category pill, showing active count badges on every card.
* **Positive Test Cases:**
  * `TC-09-POS`: Searching `Architecture` filters the list to matching articles.
  * `TC-10-POS`: Clicking `Engineering` displays only engineering articles.
  * `TC-11-POS`: Clicking `All Topics` restores the entire published catalog.
* **Negative Test Cases:**
  * `TC-06-NEG`: Searching a non-existent string (e.g. `xyz999`) presents an empty-state message with a "Clear Search" button.
  * `TC-07-NEG`: Draft and archived posts are strictly excluded from public search queries.
* **Acceptance Criteria (Definition of Done):**
  1. `GET /api/posts?search=&category=` functional.
  2. `GET /api/categories` returns category post counts.
  3. Real-time debounced search bar implemented.
  4. Empty-state UI handles zero-match queries gracefully.

---

### 🎫 ISSUE #5: [FULLSTACK] Article Detail View & Live Appreciation Like Counter
* **Issue Summary:** Build full-article reading view with appreciation like counter.
* **Classification:** `enhancement`, `frontend`, `backend`
* **Priority:** `P1 (Critical)`
* **Complexity:** `Medium`
* **Effort:** 8 Story Points
* **Labels:** `fullstack`, `likes`, `article-detail`, `p1`
* **Background Context:** Readers need a clean, distraction-free environment to read long-form articles and click "Like" to increment total appreciation.
* **Expected Result:** Article page renders formatted markdown text, author info, cover image, and interactive like button with instant count updates.
* **Positive Test Cases:**
  * `TC-12-POS`: Clicking `Like Article` increments counter in database and updates UI immediately.
  * `TC-13-POS`: Formatted headings (`##`, `###`) render cleanly in article body.
* **Negative Test Cases:**
  * `TC-08-NEG`: Navigating to an invalid article slug (e.g. `/article/non-existent-slug`) returns a friendly *"Article Not Available"* view with a link back to feed.
  * `TC-09-NEG`: Attempting to like a draft or archived article returns HTTP 404.
* **Acceptance Criteria (Definition of Done):**
  1. `POST /api/posts/:id/like` increments counter atomically.
  2. UI displays heart pulse micro-animation on click.
  3. Reading layout formats headers, lists, and paragraphs.
  4. Invalid slug error state implemented.

---

### 🎫 ISSUE #6: [FULLSTACK] Two-Tier Discussion System & Single-Level Direct Replies
* **Issue Summary:** Implement discussion threads supporting top-level comments and single-level direct replies.
* **Classification:** `enhancement`, `frontend`, `backend`
* **Priority:** `P1 (Critical)`
* **Complexity:** `High`
* **Effort:** 13 Story Points
* **Labels:** `fullstack`, `comments`, `replies`, `discussion`, `p1`
* **Background Context:** Visitors must be able to post comments and reply directly to existing comments without multi-level tree complexity.
* **Expected Result:** Comments display author name, timestamp, and message. Replies nest directly underneath their parent comment.
* **Positive Test Cases:**
  * `TC-14-POS`: Submitting valid author name and comment message posts comment immediately.
  * `TC-15-POS`: Clicking `Reply` under a comment nests a direct child reply.
  * `TC-16-POS`: Total comments badge accurately aggregates top-level comments and replies.
* **Negative Test Cases:**
  * `TC-10-NEG`: Submitting a comment with an empty name or empty message is blocked with a validation warning.
  * `TC-11-NEG`: Submitting a reply to a reply is blocked (single-level restriction enforced).
* **Acceptance Criteria (Definition of Done):**
  1. Client- and server-side mandatory validation for author name and content.
  2. `POST /api/posts/:postId/comments` implemented.
  3. `POST /api/comments/:commentId/replies` implemented.
  4. Threading strictly capped at single-level depth.

---

### 🎫 ISSUE #7: [FULLSTACK] Administrator Authentication & JWT Session Security
* **Issue Summary:** Implement secure administrator login with JWT tokens and route guards.
* **Classification:** `backend`, `security`, `task`
* **Priority:** `P0 (Blocker)`
* **Complexity:** `Medium`
* **Effort:** 8 Story Points
* **Labels:** `backend`, `security`, `jwt`, `auth`, `p0`
* **Background Context:** Administrative operations (create/edit posts, moderation) must be restricted to authenticated administrators.
* **Expected Result:** Admin logs in with credentials, receives JWT token, and accesses dashboard. Unauthenticated requests are rejected with HTTP 401.
* **Positive Test Cases:**
  * `TC-17-POS`: Logging in with `admin` / `admin123` returns JWT token and user info.
  * `TC-18-POS`: Authenticated requests with `Authorization: Bearer <token>` access `/api/admin/*` routes.
* **Negative Test Cases:**
  * `TC-12-NEG`: Submitting invalid password returns HTTP 401 with error *"Invalid credentials"*.
  * `TC-13-NEG`: Accessing `/api/admin/posts` without token returns HTTP 401 Unauthorized.
  * `TC-14-NEG`: Accessing `/api/admin/posts` with an expired/tampered token returns HTTP 401.
* **Acceptance Criteria (Definition of Done):**
  1. `POST /api/auth/login` verifies bcrypt password hash.
  2. JWT token signed with expiration and secret.
  3. `requireAdmin` middleware guards all `/api/admin/*` routes.
  4. Logout clears client token and redirects to home feed.

---

### 🎫 ISSUE #8: [FULLSTACK] Administrator Management Console & Post Lifecycle
* **Issue Summary:** Build editorial dashboard to manage drafts, published posts, and archived articles.
* **Classification:** `enhancement`, `frontend`, `backend`
* **Priority:** `P1 (Critical)`
* **Complexity:** `High`
* **Effort:** 13 Story Points
* **Labels:** `fullstack`, `admin`, `cms`, `p1`
* **Background Context:** The Administrator must be able to write articles, toggle publish/unpublish, and archive posts.
* **Expected Result:** Dashboard shows metrics cards, post table, status filters, and modal to create/edit articles.
* **Positive Test Cases:**
  * `TC-19-POS`: Admin creates a new article with status `Published`; it appears immediately in the public feed.
  * `TC-20-POS`: Admin toggles post status to `Draft`; it is immediately hidden from the public feed.
  * `TC-21-POS`: Admin archives an article; it moves to the archived tab and disappears from the public feed.
* **Negative Test Cases:**
  * `TC-15-NEG`: Submitting create post form with empty title or content triggers validation error.
  * `TC-16-NEG`: Non-admin cannot view draft posts via public URL.
* **Acceptance Criteria (Definition of Done):**
  1. Analytics cards display accurate counts.
  2. Modal supports Title, Content, Category, Tags, Author, Cover Image, and Status.
  3. Soft-delete archiving implemented.
  4. Status filter tabs (`All`, `Published`, `Draft`, `Archived`) operational.

---

### 🎫 ISSUE #9: [FULLSTACK] Discussion Moderation & Tombstone Notice Engine
* **Issue Summary:** Implement discussion moderation allowing administrators to edit comment text or delete comments with tombstone notices.
* **Classification:** `enhancement`, `frontend`, `backend`
* **Priority:** `P1 (Critical)`
* **Complexity:** `Medium`
* **Effort:** 8 Story Points
* **Labels:** `fullstack`, `moderation`, `comments`, `p1`
* **Background Context:** Administrator needs full moderation control to fix typos, censor offensive words, or remove comments while preserving context.
* **Expected Result:** Admin can edit comment/reply text directly, and deleting a comment with replies converts it to a tombstone notice.
* **Positive Test Cases:**
  * `TC-22-POS`: Admin edits a comment's text; the updated text saves and displays publicly.
  * `TC-23-POS`: Admin deletes a comment with replies; comment text becomes *"This comment has been removed by the Administrator"*, while child replies remain visible.
  * `TC-24-POS`: Admin deletes a comment with zero replies; comment is removed completely.
* **Negative Test Cases:**
  * `TC-17-NEG`: Non-admin attempt to execute `DELETE /api/admin/comments/:id` is rejected with HTTP 401.
* **Acceptance Criteria (Definition of Done):**
  1. `PUT /api/admin/comments/:id` updates text.
  2. `DELETE /api/admin/comments/:id` applies tombstone logic if replies exist.
  3. `DELETE /api/admin/replies/:id` deletes individual child replies.
  4. Moderation table in Admin Dashboard displays all comments and replies.

---

### 🎫 ISSUE #10: [QA & TESTING] Automated Test Suites & End-to-End Verification
* **Issue Summary:** Implement comprehensive automated test scripts covering positive and negative test cases across all features.
* **Classification:** `task`, `testing`
* **Priority:** `P0 (Blocker)`
* **Complexity:** `Medium`
* **Effort:** 5 Story Points
* **Labels:** `testing`, `qa`, `automation`, `e2e`, `p0`
* **Background Context:** Every issue must be validated with automated tests to verify acceptance criteria before being marked Done.
* **Expected Result:** Automated test script executes all positive and negative test cases and reports 100% pass rate.
* **Positive Test Cases:**
  * `TC-25-POS`: Test runner verifies health, like increment, comment creation, reply creation, and admin login.
* **Negative Test Cases:**
  * `TC-18-NEG`: Test runner verifies 401 on unauthorized admin access, 400 on empty comment, 404 on invalid post slug.
* **Acceptance Criteria (Definition of Done):**
  1. Automated test script exists and executes cleanly.
  2. All positive test cases pass.
  3. All negative test cases pass.
  4. Full verification report logged.

---

## 3. GitHub Project Execution Board (Status: SPRINT 1 COMPLETE)

```
┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│      BACKLOG       │   │    IN PROGRESS     │   │ QUALITY ASSURANCE  │   │        DONE        │
├────────────────────┤   ├────────────────────┤   ├────────────────────┤   ├────────────────────┤
│ (No active backlog │   │ (No in-flight work │   │ (All test suites   │   │ [x] Issue #1 (P0)  │
│  items remaining)  │   │  items remaining)  │   │  passed cleanly)   │   │ [x] Issue #2 (P0)  │
│                    │   │                    │   │                    │   │ [x] Issue #3 (P1)  │
│                    │   │                    │   │                    │   │ [x] Issue #4 (P1)  │
│                    │   │                    │   │                    │   │ [x] Issue #5 (P1)  │
│                    │   │                    │   │                    │   │ [x] Issue #6 (P1)  │
│                    │   │                    │   │                    │   │ [x] Issue #7 (P0)  │
│                    │   │                    │   │                    │   │ [x] Issue #8 (P1)  │
│                    │   │                    │   │                    │   │ [x] Issue #9 (P1)  │
│                    │   │                    │   │                    │   │ [x] Issue #10 (P0) │
└────────────────────┘   └────────────────────┘   └────────────────────┘   └────────────────────┘
```
