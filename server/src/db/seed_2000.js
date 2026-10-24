const db = require('./database');

console.log('[SEEDER] Starting bulk insertion of 2,000 high-quality blog articles...');
const startTime = Date.now();

// High performance indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
  CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
  CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_replies_comment_id ON replies(comment_id);
`);

// Check current post count
const initialCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
const targetCount = 2000;
const needed = Math.max(0, targetCount - initialCount);

if (needed === 0) {
  console.log(`[SEEDER] Database already contains ${initialCount} articles. No seeding needed.`);
  process.exit(0);
}

console.log(`[SEEDER] Database currently has ${initialCount} articles. Generating ${needed} new articles...`);

// Categories & Topics
const categories = [
  'Engineering',
  'Architecture',
  'Design',
  'AI & Machine Learning',
  'DevOps & Cloud',
  'Product Management',
  'Cybersecurity',
  'Web Development',
  'Database Systems',
  'Career & Leadership'
];

const topicsByCategory = {
  'Engineering': [
    'Clean Code Principles for Large Codebases',
    'Event-Driven Architectures with Message Queues',
    'Concurrency Models in Modern Programming Languages',
    'Memory Management & Garbage Collection Deep Dive',
    'Designing Fault-Tolerant Microservices',
    'Zero-Downtime Database Migrations at Scale',
    'Understanding Distributed Consensus Algorithms',
    'Building Ultra-Low Latency REST and gRPC Services',
    'Refactoring Monoliths into Modular Domains',
    'API Rate Limiting Strategies and Leaky Bucket Algorithms'
  ],
  'Architecture': [
    'Hexagonal & Clean Architecture in Practice',
    'Domain-Driven Design: Strategic & Tactical Patterns',
    'CQRS and Event Sourcing: Lessons from Production',
    'Micro-Frontends: Scalability vs Complexity Tradeoffs',
    'Designing Multi-Region Active-Active Systems',
    'Serverless vs Container Orchestration in 2026',
    'Database Sharding and Partitioning Architectures',
    'Building Resilient WebSocket Infrastructures',
    'Edge Computing: Moving Compute Closer to Users',
    'API Gateway Patterns: Routing, Auth, and Throttling'
  ],
  'Design': [
    'Design Systems at Scale: Tokens, Components, and Governance',
    'The Psychology of Visual Hierarchy in Editorial UI',
    'Fluid Typography and Modern CSS Viewport Units',
    'Micro-Interactions that Delight Users without Clutter',
    'Accessible Color Contrast and Dark Mode Palettes',
    'Designing for Touch vs Pointer Viewports',
    'CSS Grid vs Flexbox: Advanced Layout Mastery',
    'Motion Design in Web Interfaces: Principles and Performance',
    'Glassmorphism and Depth: Balancing Aesthetics with Usability',
    'Information Architecture for Content-Heavy Applications'
  ],
  'AI & Machine Learning': [
    'Practical Guide to Retrieval-Augmented Generation (RAG)',
    'Fine-Tuning Open-Weights LLMs for Domain Applications',
    'Vector Databases Compared: Performance, Indexing, and Search',
    'Prompt Engineering: Systematic Techniques and Benchmarks',
    'Deploying Machine Learning Models with Low-Latency Inference',
    'AI Agent Orchestration: Multi-Step Task Automation',
    'Evaluating LLM Outputs: Metrics, Grounding, and Hallucinations',
    'Local LLM Workflows with WebGPU and On-Device Models',
    'Embedding Strategies for Semantic Document Search',
    'Ethics, Bias, and Safety Guardrails in Production AI'
  ],
  'DevOps & Cloud': [
    'Infrastructure as Code: Modular Terraform Architecture',
    'Kubernetes Cluster Hardening and Zero-Trust Policies',
    'CI/CD Pipelines: From Commit to Automated Production Canary',
    'Observability vs Monitoring: Metrics, Logs, and Traces with OpenTelemetry',
    'Container Image Optimization: Multi-Stage Minimal Builds',
    'FinOps: Cloud Cost Optimization and Resource Profiling',
    'GitOps with ArgoCD: Declarative Continuous Delivery',
    'Managing Secrets and Credentials in Distributed Clouds',
    'Disaster Recovery and Automated Failover Strategies',
    'Automating Chaos Engineering to Test System Resiliency'
  ],
  'Product Management': [
    'Data-Driven Roadmapping: Balancing Discovery and Delivery',
    'Measuring Feature Adoption with Cohort Retention Analysis',
    'Product-Led Growth: Frictionless User Onboarding Flows',
    'Managing Technical Debt alongside Feature Roadmaps',
    'Running Effective User Interviews and Usability Testing',
    'The North Star Metric: Aligning Cross-Functional Teams',
    'Writing Crystal-Clear PRDs that Engineers Love',
    'A/B Testing Best Practices: Statistical Significance and Pitfalls',
    'Prioritization Frameworks Compared: RICE vs MoSCoW',
    'Building Community Feedback Loops that Drive Retention'
  ],
  'Cybersecurity': [
    'Defending Against Modern OWASP Top 10 Web Vulnerabilities',
    'Zero-Trust Network Architecture: Identity as the Perimeter',
    'Implementing Robust OAuth 2.1 and PKCE Flows',
    'Database Encryption at Rest and in Transit',
    'Cross-Site Scripting (XSS) Prevention in React Applications',
    'Supply Chain Security: Auditing NPM Dependencies with SBOMs',
    'Content Security Policy (CSP) Headers: Complete Guide',
    'Secure Session Storage vs HttpOnly JWT Cookies',
    'Penetration Testing Methodology for Web Applications',
    'Incident Response Playbooks: Containment, Eradication, and Post-Mortem'
  ],
  'Web Development': [
    'State Management in 2026: Signals, Stores, and React Hooks',
    'Mastering the Fetch API, AbortControllers, and Request Retries',
    'Optimizing Core Web Vitals: LCP, INP, and CLS in Detail',
    'Offline-First Progressive Web Apps with Service Workers',
    'Modern CSS Features: Cascade Layers, Subgrid, and Has Selector',
    'Building Fast Accessible Tables and Data Grids',
    'SVG Icons vs Web Fonts: Performance and Scalability',
    'Client-Side Routing: Hash Navigation vs History API Internals',
    'WebSockets vs Server-Sent Events (SSE) for Real-Time Feeds',
    'Tree-Shaking and Bundle Analysis with Vite'
  ],
  'Database Systems': [
    'SQLite Internals: B-Trees, Write-Ahead Logging, and Concurrency',
    'PostgreSQL Indexing: B-Tree, GIN, GiST, and BRIN Explained',
    'Database Normalization: 1NF to BCNF with Real-World Examples',
    'Optimizing Slow SQL Queries: EXPLAIN QUERY PLAN Mastery',
    'ACID Guarantees: Isolation Levels and Phantom Reads',
    'NoSQL vs Relational: When Document Stores Actually Make Sense',
    'Designing High-Performance Relational Schema for Analytics',
    'Connection Pooling and Connection Lifecycle Management',
    'Database Replication: Synchronous vs Asynchronous Tradeoffs',
    'Cache Invalidation Strategies: Write-Through vs Write-Back'
  ],
  'Career & Leadership': [
    'The Transition from Senior Engineer to Staff Architect',
    'How to Conduct Constructive and Empathic Code Reviews',
    'Technical Writing for Engineers: Clarity Over Complexity',
    'Managing Burnout and Maintaining High Engineering Output',
    'Mentoring Junior Developers: Accelerating Growth and Autonomy',
    'Effective 1-on-1 Meetings: Goal Setting and Career Mapping',
    'Communicating Technical Tradeoffs to Non-Technical Stakeholders',
    'Building a Culture of Psychological Safety in Engineering Teams',
    'Interviewing and Hiring Top Engineering Talent',
    'Continuous Learning Strategies for Fast-Moving Tech Landscapes'
  ]
};

const authors = [
  'Elena Rostova',
  'Marcus Vance',
  'David Miller',
  'Sarah Jenkins',
  'Alex Chen',
  'Sophia Taylor',
  'Liam Thorne',
  'Olivia Zhao',
  'Aiden Patel',
  'Amara Okafor'
];

const unsplashImages = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80'
];

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Prepared Statement
const insertStmt = db.prepare(`
  INSERT INTO posts (
    title, slug, excerpt, content, author, category, tags, cover_image, status, likes_count, published_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Begin Transaction for fast bulk insert (takes < 200ms)
db.exec('BEGIN TRANSACTION;');

const baseTime = Date.now();
const oneDayMs = 86400000;
const twoYearsMs = 730 * oneDayMs;

for (let i = 1; i <= needed; i++) {
  const categoryIndex = (i - 1) % categories.length;
  const category = categories[categoryIndex];
  const topicList = topicsByCategory[category];
  const baseTopic = topicList[(i - 1) % topicList.length];
  
  const articleNumber = initialCount + i;
  const title = `${baseTopic} — Volume ${Math.floor(i / 10) + 1} (Part ${(i % 10) + 1})`;
  const slug = `${slugify(baseTopic)}-vol-${Math.floor(i / 10) + 1}-part-${(i % 10) + 1}-${articleNumber}`;
  
  const author = authors[i % authors.length];
  const coverImage = unsplashImages[i % unsplashImages.length];
  
  const excerpt = `A rigorous exploration of ${baseTopic.toLowerCase()} examining architecture, practical industry tradeoffs, and maintainable patterns for modern production software.`;
  
  const content = `## Executive Summary
In this technical deep dive, we explore **${baseTopic}** with a focus on real-world engineering constraints, maintainability, and clean software architecture.

### 1. The Core Engineering Challenge
Software systems evolve rapidly. When dealing with modern distributed environments, prioritizing clean separation of concerns and clear data boundaries allows development teams to build with high velocity without compromising reliability.

### 2. Practical Implementation Strategies
* **Modularity:** Ensure each subsystem has well-defined interfaces and minimal leakage of internal implementation details.
* **Resilience:** Design for failures at boundary layers using timeouts, graceful fallbacks, and circuit breaker patterns.
* **Data Consistency:** Leverage relational constraints and atomic transactions to prevent orphaned data records.

### 3. Key Takeaways & Best Practices
By following disciplined architecture reviews and automated regression testing, teams can sustain continuous delivery while maintaining superior quality standards.`;

  const tags = `${category}, Architecture, BestPractices, CleanCode, Scale`;
  
  // Status: 95% published, 3% draft, 2% archived
  let status = 'published';
  const randStatus = i % 100;
  if (randStatus < 3) status = 'draft';
  else if (randStatus < 5) status = 'archived';

  // Random like count between 5 and 350
  const likesCount = status === 'published' ? Math.floor(Math.random() * 250) + 8 : 0;
  
  // Random timestamp within the last 700 days
  const postAgeMs = Math.floor(Math.random() * twoYearsMs);
  const postDate = new Date(baseTime - postAgeMs).toISOString();

  insertStmt.run(
    title,
    slug,
    excerpt,
    content,
    author,
    category,
    tags,
    coverImage,
    status,
    likesCount,
    status === 'published' ? postDate : null,
    postDate,
    postDate
  );

  if (i % 250 === 0) {
    console.log(`[SEEDER] Generated and queued ${i} / ${needed} articles...`);
  }
}

// Commit transaction
db.exec('COMMIT;');

const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
const duration = Date.now() - startTime;

console.log(`\n======================================================`);
console.log(`🎉 [SEED COMPLETE] Successfully populated database!`);
console.log(`Total Articles in Database: ${totalPosts}`);
console.log(`Execution Time: ${duration}ms`);
console.log(`======================================================\n`);
