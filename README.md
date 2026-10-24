# CHRONICLE — Full-Stack Blog Application

A modern, high-performance editorial publishing platform built as an internship assignment. The application provides an intuitive reading and discussion space for visitors, coupled with an Administrator Management Portal.

---

## 🌟 Key Features

### 1. Public Reader Experience
* **Continuous Scrollable Feed:** Reverse-chronological feed featuring responsive article cards with cover imagery, author credentials, publication dates, and category tags.
* **Live Interaction Count Badges:** Preview badges on every card displaying real-time counts for **Likes** and **Comments & Replies**.
* **Real-Time Keyword Search & Category Filtering:** Instant search by keywords across titles and body text, complemented by interactive category filter pills with post count indicators.
* **Appreciation "Like" Mechanism:** Frictionless appreciation counter that immediately increments total likes on articles.
* **Two-Tier Discussion Hierarchy:**
  * Readers can submit top-level comments by providing their **Name** and **Comment Message** (both fields validated).
  * Readers can post direct **Single-Level Replies** beneath any top-level comment.
  * **Clean Moderation Tombstones:** If an Administrator removes an inappropriate comment that has replies, the comment text is replaced with a respectful notice (*"This comment has been removed by the Administrator"*), preserving the conversational context for subsequent replies.

### 2. Administrator Management Portal
* **Secure Authentication:** Dedicated login screen protected by hashed credentials (bcrypt) and JWT session management.
* **Editorial Lifecycle:**
  * **Draft:** Create articles privately to edit before release.
  * **Published:** Make articles live in the public catalog and searchable.
  * **Archived (Soft Delete):** Removing a post archives it, safely hiding it from public view while preserving discussion history and metrics.
* **Discussion Moderation:** Full administrative authority to either **edit** offensive phrasing directly in reader comments/replies or **delete** them.
* **Dashboard Overview Metrics:** Live metrics displaying Total Articles, Published, Drafts, Archived, and Total Likes.

---

## 🛠️ Technology Stack

* **Frontend:** React 19, Vite, Vanilla CSS Design System (custom design tokens, glassmorphism, micro-animations, and Google Fonts typography: *Newsreader* + *Plus Jakarta Sans*).
* **Backend:** Node.js, Express.js REST API.
* **Database:** Native SQLite (`node:sqlite`) with full relational constraints (`FOREIGN KEY` cascades, indexes, and automated schema migrations).
* **Security:** `bcryptjs` password hashing and `jsonwebtoken` token verification.

---

## 🚀 Getting Started

### Prerequisites
* Node.js v20+ or v24+
* npm

### Quick Start (Run Both Client & Server)
From the root directory:

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start both the Backend API and Frontend Vite server concurrently
npm run dev
```

* **Frontend Application:** [http://localhost:3000](http://localhost:3000)
* **Backend REST API:** [http://localhost:5000/api](http://localhost:5000/api)

---

## 🔐 Administrator Credentials

| Username | Password |
| :--- | :--- |
| `admin` | `admin123` |

*To access the management dashboard, click **Admin Portal** in the navigation bar or visit `http://localhost:3000/#admin-login`.*

---

## 📁 Project Directory Structure

```
BLOG APP/
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── components/         # Navbar, BlogCard, ControlsBar, DiscussionSection
│   │   ├── pages/              # HomeFeed, ArticleDetail, AdminLogin, AdminDashboard
│   │   ├── services/           # api.js (REST API Client)
│   │   ├── App.jsx             # Main routing and layout orchestrator
│   │   └── index.css           # Luxury Vanilla CSS Design System
│   ├── index.html              # Typography and SEO tags
│   └── vite.config.js          # Dev server & /api proxy configuration
│
├── server/                     # Backend REST API (Node.js + Express)
│   ├── src/
│   │   ├── db/                 # database.js (SQLite schema & seed data)
│   │   ├── middleware/         # auth.js (JWT Admin verification)
│   │   ├── routes/             # auth.js, posts.js, comments.js
│   │   └── server.js           # Express app entry point
│   ├── data/                   # blog.db (SQLite database file)
│   └── package.json
│
├── package.json                # Root package manager with concurrent runners
└── README.md                   # Project documentation
```
