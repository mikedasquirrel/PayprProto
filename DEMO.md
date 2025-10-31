# Paypr Demo Guide

## 🎯 Quick Demo Script

This guide walks you through a complete demonstration of Paypr's capabilities.

### Prerequisites

1. **Start the server:**
```bash
python3 app.py
```

2. **Open browser:**
```
http://127.0.0.1:51879
```

---

## 📱 User Journey Demo

### Step 1: Browse the Newsstand

1. Landing page shows the Paypr newsstand with publisher magazines
2. **Features to highlight:**
   - Modern glassmorphism UI
   - Publisher categories (Tech, Sports, Arts, Politics, etc.)
   - Search functionality
   - Filter by category chips
   - Infinite scroll / Load More

### Step 2: Explore a Publisher

1. Click on any publisher (e.g., "Tech Borough")
2. **Features to highlight:**
   - Publisher hero header with branding
   - Article grid with covers and prices
   - Responsive card layout
   - Article metadata (author, price, media type)

### Step 3: Login

1. Click "Login" in the top navigation
2. Enter any email address (e.g., `demo@paypr.com`)
3. Click "Sign In"
4. **Features to highlight:**
   - Instant account creation
   - $5.00 starter balance for new users
   - Magic link option (demo mode shows link)
   - No password required for demo

### Step 4: View Wallet

1. After login, notice wallet balance in navbar ($5.00)
2. Click on wallet badge or navigate to Wallet
3. **Features to highlight:**
   - Clean balance display
   - Multiple topup options ($5, $10, $25, $50)
   - Demo mode notice
   - One-click topup

### Step 5: Top Up Wallet (Optional)

1. Click any topup amount (e.g., $10)
2. Balance updates instantly
3. **Features to highlight:**
   - Instant processing
   - No page reload needed
   - Toast notification
   - Updated balance in navbar

### Step 6: Read and Unlock an Article

1. Browse publishers or go directly to an article
2. Click on an article card
3. Read the preview content
4. **Features to highlight:**
   - Article preview with fade effect
   - Clear pricing ($0.10 - $0.99 typically)
   - Author and publisher attribution
   - Media type badges (HTML, PDF, Audio)

5. Click "Unlock Article"
6. **Features to highlight:**
   - Instant unlock (no page reload)
   - Balance deducted immediately
   - Full article content revealed
   - Toast notification with transaction details

### Step 7: Refund Window

1. After unlocking, notice the refund widget appears
2. **Features to highlight:**
   - 10-minute refund countdown timer
   - Color-coded urgency (green → yellow → red)
   - One-click refund button
   - Automatic balance restoration

3. (Optional) Click "Refund" to test refund flow
   - Confirmation dialog
   - Instant refund processing
   - Balance restored
   - Redirect to newsstand

### Step 8: View Transaction History

1. Navigate to "History" in navbar
2. **Features to highlight:**
   - Complete transaction list
   - Article titles and publishers
   - Debit/credit indicators (red/green)
   - Revenue split breakdowns (if configured)
   - Summary statistics (total spent, articles unlocked, refunds)

---

## 🎨 Visual Features to Highlight

### Design System
- **Modern Dark Theme** - Sophisticated ink/ash color palette
- **Glassmorphism** - Frosted glass effects with backdrop blur
- **Smooth Animations** - Micro-interactions on hover/click
- **Responsive Design** - Works on desktop, tablet, mobile
- **Accessibility** - Keyboard navigation, focus states

### UI Components
- **Toast Notifications** - Non-intrusive success/error messages
- **Loading States** - Spinners and skeleton loaders
- **Empty States** - Helpful messages when no content
- **Cards** - Consistent card design throughout
- **Buttons** - Primary (gradient) and secondary (glass) styles

---

## 🔧 Technical Demo

### API Endpoints

**Test with curl:**

```bash
# Get publishers
curl http://127.0.0.1:51879/api/publishers

# Get categories
curl http://127.0.0.1:51879/api/categories

# Get articles
curl 'http://127.0.0.1:51879/api/articles?limit=5'

# Get specific publisher
curl http://127.0.0.1:51879/api/publishers/tech-borough

# Healthcheck
curl http://127.0.0.1:51879/healthz
```

### Browser Developer Tools

1. **Open Console** (F12 → Console)
2. **Global Access:**
```javascript
// Check current user
window.paypr.auth.user

// Navigate programmatically
window.paypr.router.navigate('/wallet')

// Check version
window.paypr.version
```

### Network Tab

1. Open Network tab (F12 → Network)
2. Navigate around the app
3. **Show:**
   - API calls to `/api/*` endpoints
   - JSON responses
   - Fast response times
   - Session cookie management

---

## 📊 Publisher Console Demo

### Prerequisites

This requires seeded transaction data. To generate:

```bash
# In browser console or create transactions by:
# 1. Login with user account
# 2. Unlock several articles
# 3. Check transaction history
```

### Access Publisher Console

Currently via API (can add route to SPA):

```bash
# Get publisher stats
curl http://127.0.0.1:51879/api/publisher/console/stats \
  -H "Cookie: session=..." 

# Get transactions (requires admin or publisher session)
```

### Features
- All-time revenue statistics
- Last 7 days stats
- Revenue breakdowns (gross, fees, net)
- Article performance metrics
- CSV export capability

---

## 🎯 Admin Demo

### Admin Login

Default credentials:
- Username: `admin`
- Password: `demo123`

### Via API

```bash
# Login
curl -X POST http://127.0.0.1:51879/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"demo123"}'

# Get theme settings
curl http://127.0.0.1:51879/api/admin/theme \
  -H "Cookie: session=..."

# Update theme
curl -X PUT http://127.0.0.1:51879/api/admin/theme \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"color_ink":"#000000"}'
```

### Admin Features

1. **Theme Customization**
   - Colors (ink, ash, smoke, paper)
   - Gradients
   - Typography (body, headline fonts)
   - Border radius
   - Font sizes

2. **Site Settings**
   - Navigation toggles
   - Layout options
   - Feature flags

3. **Revenue Splits**
   - Configure per-publisher split rules
   - Support for multiple roles (author, editor, partner)
   - Basis points allocation
   - Validation (total ≤ 100%)

---

## 🚀 Advanced Features

### Magic Link Authentication

1. On login page, click "Send Magic Link"
2. Check browser console for demo link
3. Navigate to the magic link URL
4. Automatically logged in

### Revenue Split Demonstration

1. Configure split rules via admin API
2. Make a purchase
3. View transaction history
4. See revenue split breakdown by role

### Rate Limiting

Try making rapid API requests:
```bash
# This will eventually trigger rate limit
for i in {1..20}; do curl http://127.0.0.1:51879/api/publishers; done
```

### Security Headers

```bash
curl -I http://127.0.0.1:51879/
# Check for:
# - X-Content-Type-Options
# - X-Frame-Options
# - Content-Security-Policy
# - Referrer-Policy
```

---

## 💡 Demo Tips

### Talking Points

1. **No Subscriptions** - Pay only for what you read
2. **Instant Access** - One click to unlock
3. **Fair Pricing** - Micro-transactions (10¢ - $1)
4. **10-Min Refunds** - Risk-free reading
5. **Publisher-Friendly** - High revenue share (90%)
6. **Privacy-Focused** - No tracking, minimal data
7. **Modern Stack** - API-first, SPA architecture

### Common Questions

**Q: How does the refund work?**
A: 10-minute window from purchase. One-click refund restores full balance.

**Q: Where does my money go?**
A: Configurable splits. Default: 90% publisher, 10% platform fee.

**Q: Can publishers see analytics?**
A: Yes, full console with revenue stats and CSV export.

**Q: How do you prevent fraud?**
A: Rate limiting, daily spend caps, session management, IP tracking.

**Q: Is this production-ready?**
A: This is a prototype. For production, add: PostgreSQL, Redis, proper Stripe integration, email delivery, monitoring.

---

## 🎬 Demo Checklist

- [ ] Server running on port 51879
- [ ] Database seeded with publishers and articles
- [ ] Tested API endpoints
- [ ] Walked through user journey
- [ ] Demonstrated payment flow
- [ ] Showed refund feature
- [ ] Reviewed transaction history
- [ ] Highlighted modern UI/UX
- [ ] Showed responsive design
- [ ] Demonstrated API capabilities
- [ ] Explained architecture
- [ ] Discussed production considerations

---

## 📈 Next Steps

### For Production

1. **Database**: Migrate to PostgreSQL
2. **Payments**: Full Stripe integration with webhooks
3. **Email**: Transactional email for magic links
4. **Cache**: Redis for sessions and rate limiting
5. **CDN**: CloudFlare for static assets
6. **Monitoring**: Sentry for error tracking
7. **Testing**: Comprehensive test coverage
8. **CI/CD**: Automated deployment pipeline
9. **Documentation**: API docs with OpenAPI/Swagger
10. **Security**: Penetration testing, security audit

### Feature Ideas

1. **Publisher Onboarding**: Self-service publisher signup
2. **Analytics Dashboard**: Charts and visualizations
3. **Recommendations**: ML-powered article suggestions
4. **Social Features**: Share unlocked articles
5. **Bundles**: Publisher subscription packages
6. **Gift Articles**: Send articles to friends
7. **Reading List**: Save articles for later
8. **Mobile Apps**: iOS and Android native apps
9. **Browser Extension**: Quick unlock from any site
10. **API for Publishers**: Embed paywall on external sites

---

**Ready to demo! 🚀**

