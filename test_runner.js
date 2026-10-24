// Automated End-to-End Test Suite for CHRONICLE Full-Stack Blog Application
// Validates all Positive & Negative Test Cases from development plan.md

const BASE_URL = 'http://localhost:3000';
let adminToken = '';
let testPostId = null;
let testCommentId = null;
let testReplyId = null;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testId, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testId}: ${description}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testId}: ${description}`);
  }
}

async function runAllTests() {
  console.log('\n===============================================================');
  console.log('🧪 CHRONICLE FULL-STACK E2E TEST SUITE (POSITIVE & NEGATIVE)');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // ISSUE #1 & #2: Health & Middleware Verification
    // -------------------------------------------------------------------------
    console.log('--- Testing Issue #1 & #2: Health, SQLite & Middleware ---');
    let res = await fetch(`${BASE_URL}/api/health`);
    let data = await res.json();
    assert(res.status === 200, 'TC-04-POS', 'Health endpoint returns HTTP 200');
    assert(data.status === 'connected', 'TC-01-POS', 'Database connectivity verified (SQLite)');
    assert(res.headers.get('x-fullstack-middleware') === 'Active', 'TC-05-POS', 'Middleware header X-FullStack-Middleware is Active');

    // Negative: 404 on invalid route
    res = await fetch(`${BASE_URL}/api/non-existent-route-999`);
    assert(res.status === 404, 'TC-03-NEG', 'Invalid API endpoint returns HTTP 404');

    // -------------------------------------------------------------------------
    // ISSUE #7: Authentication & JWT Middleware Guards
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Issue #7: Authentication & Route Protection ---');
    
    // Negative: Unauthorized access to admin endpoint
    res = await fetch(`${BASE_URL}/api/admin/posts`);
    assert(res.status === 401, 'TC-13-NEG', 'Accessing /api/admin/posts without token returns HTTP 401');

    // Negative: Unauthorized with tampered token
    res = await fetch(`${BASE_URL}/api/admin/posts`, {
      headers: { 'Authorization': 'Bearer invalid-or-tampered-token-xyz' }
    });
    assert(res.status === 401, 'TC-14-NEG', 'Accessing with tampered token returns HTTP 401');

    // Negative: Invalid credentials
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword123' })
    });
    assert(res.status === 401, 'TC-12-NEG', 'Login with wrong password returns HTTP 401');

    // Positive: Valid admin login
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    data = await res.json();
    assert(res.status === 200, 'TC-17-POS', 'Login with valid credentials returns HTTP 200');
    assert(!!data.token, 'TC-17-POS-2', 'JWT token issued successfully');
    adminToken = data.token;

    // Positive: Authenticated access with Bearer token
    res = await fetch(`${BASE_URL}/api/admin/posts`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    data = await res.json();
    assert(res.status === 200, 'TC-18-POS', 'Authenticated admin can retrieve all posts');
    assert(data.stats && data.stats.total > 0, 'TC-18-POS-2', 'Admin dashboard statistics returned');

    // -------------------------------------------------------------------------
    // ISSUE #4: Public Feed, Keyword Search & Category Filtering
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Issue #4: Public Feed, Search & Category Filters ---');
    
    // Positive: Fetch all published posts
    res = await fetch(`${BASE_URL}/api/posts`);
    data = await res.json();
    assert(res.status === 200, 'TC-09-POS-1', 'Public feed returns HTTP 200');
    assert(Array.isArray(data) && data.length > 0, 'TC-09-POS-2', 'Published posts list returned');

    // Positive: Search query matching
    res = await fetch(`${BASE_URL}/api/posts?search=Architecture`);
    data = await res.json();
    assert(data.length > 0 && data.some(p => p.title.includes('Architecture') || (p.tags && p.tags.includes('Architecture')) || (p.excerpt && p.excerpt.includes('Architecture'))), 'TC-09-POS', 'Search filters articles matching keyword');

    // Positive: Category filter
    res = await fetch(`${BASE_URL}/api/posts?category=Engineering`);
    data = await res.json();
    assert(data.every(p => p.category === 'Engineering'), 'TC-10-POS', 'Category filter returns only Engineering posts');

    // Negative: Non-existent search query returns empty array
    res = await fetch(`${BASE_URL}/api/posts?search=UnmatchedGibberishString999XYZ`);
    data = await res.json();
    assert(Array.isArray(data) && data.length === 0, 'TC-06-NEG', 'Unmatched search query returns empty results array');

    // -------------------------------------------------------------------------
    // ISSUE #5: Article Detail View & Live Appreciation Likes
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Issue #5: Article Detail View & Like Counter ---');
    
    // Positive: Get article detail by slug
    res = await fetch(`${BASE_URL}/api/posts/mastering-modern-web-architecture-2026`);
    data = await res.json();
    assert(res.status === 200, 'TC-13-POS-1', 'Article details retrieved by slug');
    assert(data.title === 'Mastering Modern Web Architecture in 2026', 'TC-13-POS-2', 'Correct article title returned');
    testPostId = data.id;
    const initialLikes = data.likes_count || 0;

    // Clean up any existing like on test post for clean baseline
    const testHeader = { 'x-forwarded-for': '192.168.1.100' };

    // Positive: Like article (first click)
    res = await fetch(`${BASE_URL}/api/posts/${testPostId}/like`, { method: 'POST', headers: testHeader });
    data = await res.json();
    assert(res.status === 200, 'TC-12-POS', 'Like endpoint returns HTTP 200');
    const likedCount = data.likes_count;

    // Positive: Unlike article (second click removes like and decrements count)
    res = await fetch(`${BASE_URL}/api/posts/${testPostId}/like`, { method: 'POST', headers: testHeader });
    data = await res.json();
    assert(res.status === 200, 'TC-12-POS-UNLIKE', 'Unlike returns HTTP 200');
    assert(data.liked === false && data.likes_count === likedCount - 1, 'TC-12-POS-2', `Unlike decrements counter back to ${data.likes_count}`);

    // Negative: Requesting non-existent article slug
    res = await fetch(`${BASE_URL}/api/posts/non-existent-article-slug-404`);
    assert(res.status === 404, 'TC-08-NEG', 'Non-existent article slug returns HTTP 404');

    // -------------------------------------------------------------------------
    // ISSUE #6: Two-Tier Discussion System & Single-Level Replies
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Issue #6: Two-Tier Discussion & Replies ---');
    
    // Negative: Comment with empty name
    res = await fetch(`${BASE_URL}/api/posts/${testPostId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: '', content: 'A comment without a name' })
    });
    assert(res.status === 400, 'TC-10-NEG-1', 'Empty commenter name rejected with HTTP 400');

    // Negative: Comment with empty content
    res = await fetch(`${BASE_URL}/api/posts/${testPostId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: 'Test User', content: '   ' })
    });
    assert(res.status === 400, 'TC-10-NEG-2', 'Empty comment content rejected with HTTP 400');

    // Positive: Submit valid top-level comment
    res = await fetch(`${BASE_URL}/api/posts/${testPostId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: 'Scrum Lead', content: 'Thoroughly impressed by the architectural clarity.' })
    });
    data = await res.json();
    assert(res.status === 201, 'TC-14-POS', 'Valid comment submission returns HTTP 201');
    testCommentId = data.comment.id;

    // Positive: Submit direct single-level reply
    res = await fetch(`${BASE_URL}/api/comments/${testCommentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: 'QA Specialist', content: 'Verified single-level reply nesting.' })
    });
    data = await res.json();
    assert(res.status === 201, 'TC-15-POS', 'Direct reply submission returns HTTP 201');
    testReplyId = data.reply.id;

    // Positive: Verify discussion thread returns comment with nested child reply
    res = await fetch(`${BASE_URL}/api/posts/${testPostId}/comments`);
    data = await res.json();
    const foundComment = data.find(c => c.id === testCommentId);
    assert(foundComment && foundComment.replies.length > 0, 'TC-16-POS', 'Discussion thread nests reply directly under parent comment');

    // -------------------------------------------------------------------------
    // ISSUE #8 & #9: Editorial Lifecycle, Moderation & Tombstone Notice
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Issue #8 & #9: Admin Lifecycle, Moderation & Tombstones ---');
    
    // Positive: Create new post as Draft
    res = await fetch(`${BASE_URL}/api/admin/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Sprint 1 Retrospective Insights',
        category: 'Engineering',
        content: 'Analyzing team performance and continuous improvement throughout Sprint 1.',
        status: 'draft'
      })
    });
    data = await res.json();
    assert(res.status === 201, 'TC-19-POS-1', 'Admin can create an article');
    const createdPostId = data.post.id;
    const createdSlug = data.post.slug;

    // Negative: Public visitor cannot access draft post
    res = await fetch(`${BASE_URL}/api/posts/${createdSlug}`);
    assert(res.status === 404, 'TC-16-NEG', 'Public cannot access draft posts (HTTP 404 returned)');

    // Positive: Toggle status to Published
    res = await fetch(`${BASE_URL}/api/admin/posts/${createdPostId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'published' })
    });
    assert(res.status === 200, 'TC-20-POS', 'Admin can toggle post status to published');

    // Positive: Admin edits comment text
    res = await fetch(`${BASE_URL}/api/admin/comments/${testCommentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ content: 'Moderated text: Architecturally validated.' })
    });
    assert(res.status === 200, 'TC-22-POS', 'Admin can edit comment text');

    // Positive: Admin deletes comment with child replies -> Tombstone Notice Test
    res = await fetch(`${BASE_URL}/api/admin/comments/${testCommentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    data = await res.json();
    assert(res.status === 200 && data.action === 'tombstoned', 'TC-23-POS-1', 'Comment with replies converts to tombstone notice');

    // Verify public view preserves replies beneath tombstone
    res = await fetch(`${BASE_URL}/api/posts/${testPostId}/comments`);
    data = await res.json();
    const tombstonedComment = data.find(c => c.id === testCommentId);
    assert(
      tombstonedComment && 
      tombstonedComment.content === 'This comment has been removed by the Administrator' &&
      tombstonedComment.replies.length > 0,
      'TC-23-POS-2',
      'Tombstone notice displayed while child replies remain intact'
    );

    // Positive: Admin archives article (Soft Delete)
    res = await fetch(`${BASE_URL}/api/admin/posts/${createdPostId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(res.status === 200, 'TC-21-POS', 'Admin can soft-delete / archive article');

    // -------------------------------------------------------------------------
    // ISSUE #10: User Registration, Login & Post Authoring/Updating
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Issue #10: User Registration, Login & Post Updating ---');
    const uniqueUserSuffix = Date.now();
    const testUsername = `author_${uniqueUserSuffix}`;
    const testEmail = `author_${uniqueUserSuffix}@chronicle.local`;

    // Negative: Short username rejected
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ab', password: 'password123' })
    });
    assert(res.status === 400, 'TC-24-NEG', 'Registration with short username (< 3 chars) rejected with HTTP 400');

    // Negative: Short password rejected
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: '123' })
    });
    assert(res.status === 400, 'TC-25-NEG', 'Registration with short password (< 6 chars) rejected with HTTP 400');

    // Positive: Valid User Registration
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, email: testEmail, password: 'securepassword123' })
    });
    data = await res.json();
    assert(res.status === 201, 'TC-24-POS', 'Valid user registration returns HTTP 201');
    assert(data.user && data.user.role === 'user', 'TC-24-POS-2', 'Registered user has role "user"');
    let userToken = data.token;
    const authorUserId = data.user.id;

    // Negative: Duplicate username rejected
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, email: `diff_${uniqueUserSuffix}@chronicle.local`, password: 'securepassword123' })
    });
    assert(res.status === 409, 'TC-26-NEG', 'Duplicate username registration rejected with HTTP 409 Conflict');

    // Positive: User Login
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: 'securepassword123' })
    });
    data = await res.json();
    assert(res.status === 200, 'TC-25-POS', 'User login with valid credentials returns HTTP 200');
    assert(!!data.token, 'TC-25-POS-2', 'User JWT token returned upon successful login');
    userToken = data.token;

    // Positive: User creates a new article
    res = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: `Decentralized Architectures by ${testUsername}`,
        category: 'Engineering',
        content: 'Exploring scalable patterns, micro-frontends, and local caching in 2026 web systems.',
        tags: 'Decentralized, Microservices, Scale',
        status: 'published'
      })
    });
    data = await res.json();
    assert(res.status === 201, 'TC-26-POS', 'Authenticated user can publish a new article (HTTP 201)');
    assert(data.post && data.post.user_id === authorUserId, 'TC-26-POS-2', 'Article correctly linked to author user_id');
    const userPostId = data.post.id;
    const userPostSlug = data.post.slug;

    // Positive: User updates their own article
    const updatedTitle = `Decentralized Architectures (Revised Edition) by ${testUsername}`;
    res = await fetch(`${BASE_URL}/api/posts/${userPostId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: updatedTitle,
        category: 'Engineering',
        content: 'Updated content body with advanced architectural benchmarks and case studies.',
        tags: 'Decentralized, Microservices, Scale, Updated',
        status: 'published'
      })
    });
    data = await res.json();
    assert(res.status === 200, 'TC-27-POS', 'Author can successfully update their own article (HTTP 200)');
    assert(data.post && data.post.title === updatedTitle, 'TC-27-POS-2', 'Updated article title confirmed in database');

    // Register second user to test security guardrails
    const secondUsername = `intruder_${uniqueUserSuffix}`;
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: secondUsername, password: 'password123' })
    });
    data = await res.json();
    const intruderToken = data.token;

    // Negative: Second user tries to update first user's post -> HTTP 403 Forbidden
    res = await fetch(`${BASE_URL}/api/posts/${userPostId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${intruderToken}`
      },
      body: JSON.stringify({
        title: 'Unauthorized Modification Attempt',
        category: 'Engineering',
        content: 'This should be blocked by security policy.',
        status: 'published'
      })
    });
    assert(res.status === 403, 'TC-27-NEG', 'Unauthorized user attempt to update another author\'s post rejected with HTTP 403 Forbidden');

    // Positive: Admin has master permissions to update any article
    res = await fetch(`${BASE_URL}/api/posts/${userPostId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: updatedTitle + ' [Admin Verified]',
        category: 'Engineering',
        content: 'Article approved and verified with editorial review note.',
        status: 'published'
      })
    });
    data = await res.json();
    assert(res.status === 200, 'TC-28-POS', 'Administrator has master authority to update any article');

    // Positive: User retrieves their authored articles list
    res = await fetch(`${BASE_URL}/api/user/my-posts`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    data = await res.json();
    assert(res.status === 200, 'TC-29-POS', 'Author can retrieve their personal articles list');
    assert(Array.isArray(data.posts) && data.posts.some(p => p.id === userPostId), 'TC-29-POS-2', 'User articles list contains the authored article');

    console.log('\n===============================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passedTests}/${totalTests} Tests Passed (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`Failed Tests: ${failedTests}`);
    console.log('===============================================================\n');

    if (failedTests === 0) {
      console.log('🎉 ALL SPRINT 1 ACCEPTANCE CRITERIA VERIFIED & PASSED!');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runAllTests();
