"""Seed TechPulse Newsletter showcase - indie tech writer demonstrating 90/10 split"""
from datetime import datetime, timedelta
import json

from app import create_app
from extensions import db
from models import (
    User, AuthorProfile, Article, ShowcaseSite
)


def seed_technewsletter():
    app = create_app()
    with app.app_context():
        print("🚀 Seeding TechPulse Newsletter showcase...")
        
        # Create Alex Chen as a user and author
        alex_user = User.query.filter_by(email="alex@techpulse.dev").first()
        if not alex_user:
            alex_user = User(
                email="alex@techpulse.dev",
                wallet_cents=0  # Authors don't need wallet balance
            )
            db.session.add(alex_user)
            db.session.commit()
        
        # Create author profile for Alex Chen
        alex_author = AuthorProfile.query.filter_by(user_id=alex_user.id).first()
        if not alex_author:
            alex_author = AuthorProfile(
                user_id=alex_user.id,
                display_name="Alex Chen",
                bio="Independent tech writer covering AI, software engineering, and the future of work. Former engineering lead at scale-up startups, now writing full-time about technology's impact on society.",
                photo_url="https://picsum.photos/seed/alex-chen-photo/400/400",
                website_url="https://techpulse.dev",
                twitter_handle="alexchentech",
                default_price_cents=249,
                accepts_publisher_requests=True
            )
            db.session.add(alex_author)
            db.session.commit()
        
        # Create TechPulse Newsletter showcase site
        showcase = ShowcaseSite.query.filter_by(slug="technewsletter").first()
        if not showcase:
            showcase = ShowcaseSite(
                slug="technewsletter",
                name="TechPulse",
                tagline="Independent Tech Analysis • AI & Engineering • Future of Work",
                owner_type="author",
                owner_id=alex_author.id,
                primary_color="#0A1929",  # Dark blue-gray
                accent_color="#00D9FF",  # Cyan
                logo_url="https://picsum.photos/seed/techpulse-logo/300/100",
                hero_image_url="https://picsum.photos/seed/techpulse-hero/1600/600",
                about_text="""
                    <p>TechPulse is an independent technology newsletter written by Alex Chen, 
                    covering the intersection of software engineering, artificial intelligence, 
                    and the evolving nature of work.</p>
                    
                    <p>As a former engineering lead who's built products used by millions, 
                    Alex brings practical insights from the trenches of tech. No hype, no vendor 
                    pitches—just honest analysis of what's actually happening in technology.</p>
                    
                    <p>All articles are independently published. 90% of revenue goes directly 
                    to supporting this independent journalism.</p>
                """,
                show_paypr_branding=True,
                is_active=True
            )
            db.session.add(showcase)
            db.session.commit()
        
        # Create realistic independent tech content
        articles_data = [
            {
                "title": "The Death of the 10x Engineer: Why AI Assistants Are Rewriting Developer Productivity",
                "dek": "GitHub Copilot and ChatGPT aren't making developers 10x faster—they're fundamentally changing what programming means.",
                "price": 249,
                "cover": "https://picsum.photos/seed/tech-ai-1/1200/675",
                "category": "AI & Development",
                "content": """
                    <p>For years, Silicon Valley has been obsessed with the mythical "10x engineer"—the 
                    developer who's supposedly ten times more productive than their peers. But as AI coding 
                    assistants become ubiquitous, that entire mental model is collapsing.</p>
                    
                    <p>I spent the last three months building a production app using GitHub Copilot and 
                    GPT-4 as my primary development tools. The results weren't what I expected.</p>
                    
                    <h2>The Productivity Paradox</h2>
                    
                    <p>My lines-of-code output increased by roughly 3x. But my actual feature velocity? 
                    Only about 1.2x. The missing productivity is hiding in three places:</p>
                    
                    <ul>
                        <li><strong>Code Review Hell:</strong> AI-generated code is often subtly wrong in ways 
                        that require deep scrutiny. What used to take 5 minutes now takes 15.</li>
                        <li><strong>Architecture Debt:</strong> AI excels at tactical solutions but has zero 
                        understanding of system-level design. You'll write more code that does less.</li>
                        <li><strong>The Testing Gap:</strong> AI can write tests, but it can't know what edge 
                        cases matter for your specific business logic.</li>
                    </ul>
                    
                    <h2>What Actually Changed</h2>
                    
                    <p>The real shift isn't about raw productivity. It's about role transformation. Junior 
                    developers with AI assistance can now produce senior-level boilerplate. Senior developers 
                    spend less time coding and more time being architects and code reviewers.</p>
                    
                    <p>This has massive implications:</p>
                    
                    <ol>
                        <li>Entry-level developer jobs are getting squeezed</li>
                        <li>The skill premium has shifted from "knowing syntax" to "understanding systems"</li>
                        <li>Code review is now the bottleneck, not code writing</li>
                    </ol>
                    
                    <h2>The New Developer Career Path</h2>
                    
                    <p>If you're starting your career in 2025, the path forward looks different than it did 
                    in 2020. You need to:</p>
                    
                    <ul>
                        <li>Master system design before you master any specific framework</li>
                        <li>Build a portfolio of complete products, not code samples</li>
                        <li>Develop taste—the ability to distinguish good AI output from garbage</li>
                        <li>Learn to read and understand code faster than you write it</li>
                    </ul>
                    
                    <p>The 10x engineer is dead. Long live the 1.2x engineer who knows how to orchestrate AI.</p>
                    
                    <hr>
                    
                    <p><em>This analysis is based on interviews with 50+ engineering leaders and my own 
                    experience shipping production code with AI assistance. See the full research data in 
                    next week's deep dive.</em></p>
                """
            },
            {
                "title": "Remote Work Is Not Coming Back: The Data Nobody Wants to Hear",
                "dek": "Tech companies are winning the return-to-office battle, and the numbers prove it. Here's what actually happened.",
                "price": 199,
                "cover": "https://picsum.photos/seed/tech-remote-1/1200/675",
                "category": "Future of Work",
                "content": """
                    <p>The great remote work experiment is over, and the results are in. Despite what 
                    Twitter discourse might suggest, companies are successfully bringing workers back to 
                    offices, and employee resistance is crumbling.</p>
                    
                    <p>I analyzed return-to-office policies at 200 major tech companies and conducted 
                    confidential interviews with HR leaders. The reality is stark.</p>
                    
                    <h2>The Numbers</h2>
                    
                    <ul>
                        <li>87% of major tech companies now require at least 3 days in-office</li>
                        <li>Voluntary attrition from RTO mandates peaked at 8% in Q1 2024</li>
                        <li>By Q3 2024, attrition from RTO policies had dropped to under 2%</li>
                        <li>Companies that held firm on RTO saw their initial attrition absorbed within 6 months</li>
                    </ul>
                    
                    <h2>Why Employees Caved</h2>
                    
                    <p>The pro-remote camp made three critical miscalculations:</p>
                    
                    <p><strong>1. The Job Market Turned:</strong> In 2021-2022, workers could credibly threaten 
                    to leave for remote-first companies. By 2024, even those companies were mandating office time.</p>
                    
                    <p><strong>2. Lifestyle Lock-in:</strong> Employees who bought houses in cheaper locations 
                    assumed remote work was permanent. They were wrong, but now they're trapped by mortgages.</p>
                    
                    <p><strong>3. Career Calculus Changed:</strong> Early data shows that remote workers are being 
                    promoted at significantly lower rates. Ambitious employees did the math.</p>
                    
                    <h2>What Actually Works</h2>
                    
                    <p>Contrary to the narrative, this isn't about productivity—multiple studies show remote 
                    workers are equally or more productive. This is about three things:</p>
                    
                    <ol>
                        <li><strong>Real Estate:</strong> Companies have long-term leases and want utilization</li>
                        <li><strong>Culture:</strong> Executives genuinely believe in-person collaboration matters</li>
                        <li><strong>Control:</strong> Management prefers visible, synchronous work</li>
                    </ol>
                    
                    <h2>The Pragmatic Path Forward</h2>
                    
                    <p>If you're a knowledge worker, here's the reality check:</p>
                    
                    <ul>
                        <li>Fully remote jobs at quality companies are disappearing</li>
                        <li>3 days in-office is becoming the standard compromise</li>
                        <li>Geographic arbitrage opportunities are closing</li>
                        <li>Hybrid is here to stay, but on company terms, not yours</li>
                    </ul>
                    
                    <p>The remote revolution didn't fail because it didn't work. It failed because employees 
                    had less leverage than they thought.</p>
                """
            },
            {
                "title": "Why Your Startup's Tech Stack Doesn't Matter (And What Does)",
                "dek": "Founders obsess over Rails vs. Django while their startups die from distribution problems. Here's what actually kills companies.",
                "price": 249,
                "cover": "https://picsum.photos/seed/tech-startup-1/1200/675",
                "category": "Startup Strategy",
                "content": """
                    <p>I've watched hundreds of startups fail, and exactly zero of them died because they 
                    chose the wrong JavaScript framework.</p>
                    
                    <p>Yet I still see founders spending weeks debating Next.js vs. Remix, or whether to 
                    go with PostgreSQL or MongoDB. This is optimization theater at its finest.</p>
                    
                    <h2>The Tech Stack Fallacy</h2>
                    
                    <p>Here's what actually matters in your first two years:</p>
                    
                    <ol>
                        <li><strong>Speed to Market:</strong> Ship in weeks, not months</li>
                        <li><strong>Iteration Velocity:</strong> How fast can you test hypotheses?</li>
                        <li><strong>Team Familiarity:</strong> Use what your team already knows</li>
                    </ol>
                    
                    <p>That's it. Everything else is premature optimization.</p>
                    
                    <h2>What Actually Kills Startups</h2>
                    
                    <p>From my analysis of 300+ failed startups:</p>
                    
                    <ul>
                        <li><strong>42% died from building something nobody wanted</strong></li>
                        <li><strong>29% ran out of money before finding product-market fit</strong></li>
                        <li><strong>17% had team/founder conflicts</strong></li>
                        <li><strong>8% had distribution problems despite good products</strong></li>
                        <li><strong>4% had everything else (including tech stack issues)</strong></li>
                    </ul>
                    
                    <p>Notice what's not on that list? "Chose React instead of Vue."</p>
                    
                    <h2>The Real Technical Decisions</h2>
                    
                    <p>That said, there ARE technical decisions that matter enormously:</p>
                    
                    <p><strong>1. Monolith vs. Microservices</strong><br>
                    (Hint: you want a monolith for the first 2 years, maybe forever)</p>
                    
                    <p><strong>2. Build vs. Buy for Core Features</strong><br>
                    Successful startups buy everything except their unique value prop</p>
                    
                    <p><strong>3. Technical Debt Management</strong><br>
                    The trick is knowing which debt to take on and which to avoid</p>
                    
                    <p><strong>4. Hiring Philosophy</strong><br>
                    Generalists vs. specialists matters way more than React vs. Angular</p>
                    
                    <h2>The 80/20 Startup Stack</h2>
                    
                    <p>Want the boring, practical answer? Here's what actually works for 80% of startups:</p>
                    
                    <ul>
                        <li>Backend: Whatever your team knows best (Rails, Django, Express, Laravel)</li>
                        <li>Frontend: React + Next.js (purely because of hiring pool size)</li>
                        <li>Database: PostgreSQL (you won't outgrow it)</li>
                        <li>Hosting: Vercel or Railway (avoid AWS unless you have dedicated DevOps)</li>
                        <li>Auth: Clerk or Auth0 (don't build this yourself)</li>
                        <li>Payments: Stripe (obviously)</li>
                        <li>Analytics: PostHog (avoid the Amplitude pricing trap)</li>
                    </ul>
                    
                    <h2>When to Actually Care</h2>
                    
                    <p>There ARE cases where tech stack matters from day one:</p>
                    
                    <ul>
                        <li>Real-time collaboration (Google Docs clone) → needs specific tech</li>
                        <li>Video/audio processing → compute and codec choices matter</li>
                        <li>ML-first products → Python ecosystem is non-negotiable</li>
                        <li>Blockchain/web3 → tech IS the product</li>
                    </ul>
                    
                    <p>If you're building standard CRUD apps, stop overthinking it.</p>
                    
                    <h2>The Bottom Line</h2>
                    
                    <p>Every hour you spend debating tech stack is an hour you're not talking to customers. 
                    Pick boring, proven technologies. Ship fast. Iterate based on real user feedback.</p>
                    
                    <p>Your startup will fail or succeed based on whether you solve a real problem, not 
                    whether you chose the right state management library.</p>
                """
            },
            {
                "title": "The AI Winter Is Coming (And It's Going to Be Brutal)",
                "dek": "Generative AI hype has peaked. Here's what happens when the bubble pops—and how to prepare.",
                "price": 299,
                "cover": "https://picsum.photos/seed/tech-ai-winter-1/1200/675",
                "category": "AI & Development",
                "content": """
                    <p>We're approximately 18 months away from a reckoning in AI that will make the dot-com 
                    crash look gentle. I know because I've watched this movie before.</p>
                    
                    <p>In 1999, I was at a startup that pivoted three times in one year to ride different 
                    hype waves. In 2017, I watched companies slap "blockchain" onto their pitch decks for 
                    instant valuation boosts. In 2021, I saw "metaverse" become the magic word.</p>
                    
                    <p>AI in 2024-2025 is following the exact same pattern, but with way more capital at stake.</p>
                    
                    <h2>The Warning Signs</h2>
                    
                    <p>Here's what I'm seeing that screams "bubble peak":</p>
                    
                    <ul>
                        <li><strong>Revenue-less Companies at $1B+ valuations</strong> based solely on "AI-powered"</li>
                        <li><strong>Wrapper Startups:</strong> 80% of "AI companies" are just ChatGPT API calls</li>
                        <li><strong>Talent Wars:</strong> Mid-level engineers with "AI" on resume getting FAANG senior offers</li>
                        <li><strong>Enterprise Theater:</strong> Companies buying AI tools they don't need for fear of missing out</li>
                        <li><strong>Founder Pivots:</strong> Every failed startup is now "AI-first"</li>
                    </ul>
                    
                    <h2>The Crash Timeline</h2>
                    
                    <p>Here's how I think this plays out:</p>
                    
                    <p><strong>Q2 2025:</strong> First wave of AI startups runs out of runway without revenue. 
                    VCs get nervous but continue funding "winners."</p>
                    
                    <p><strong>Q4 2025:</strong> OpenAI or Anthropic announces enterprise API price cuts of 50%+. 
                    AI wrapper companies' margins evaporate overnight.</p>
                    
                    <p><strong>Q2 2026:</strong> Major enterprises publish AI ROI studies. Results are mixed at best. 
                    "AI transformation" budgets get slashed.</p>
                    
                    <p><strong>Q4 2026:</strong> VC funding for AI startups drops 80% from peak. The AI Winter begins.</p>
                    
                    <h2>What Survives</h2>
                    
                    <p>Not all AI companies will die. Here's what makes it through:</p>
                    
                    <ol>
                        <li><strong>Infrastructure Plays:</strong> NVIDIA, cloud providers, model trainers</li>
                        <li><strong>Actual Innovation:</strong> Companies building genuinely novel AI applications, not wrappers</li>
                        <li><strong>Vertical Integration:</strong> AI that's deeply integrated into existing workflows</li>
                        <li><strong>Unit Economics Winners:</strong> Rare companies with positive margins and real revenue</li>
                    </ol>
                    
                    <h2>How to Position Yourself</h2>
                    
                    <p>If you're building in AI right now, here's my advice:</p>
                    
                    <p><strong>For Founders:</strong></p>
                    <ul>
                        <li>Have 36 months of runway, not 18</li>
                        <li>Focus on revenue, not demos</li>
                        <li>Build moats beyond "we use GPT-4"</li>
                        <li>Prepare for commodity pricing on LLM APIs</li>
                    </ul>
                    
                    <p><strong>For Employees:</strong></p>
                    <ul>
                        <li>Cash > equity at AI startups right now</li>
                        <li>Demand real revenue numbers before joining</li>
                        <li>Build transferable skills, not just AI wrapper experience</li>
                        <li>Keep your job search muscles warm</li>
                    </ul>
                    
                    <p><strong>For Investors:</strong></p>
                    <ul>
                        <li>AI winter is an incredible buying opportunity—in 2027</li>
                        <li>Right now, focus on companies with revenue and margins</li>
                        <li>Infrastructure > Applications in this environment</li>
                    </ul>
                    
                    <h2>The Silver Lining</h2>
                    
                    <p>AI winters are actually healthy. They clear out the nonsense and let real innovation 
                    shine through. The 2018 crypto winter killed ICO scams but let Ethereum mature. The 2002 
                    dot-com crash killed Pets.com but let Amazon dominate.</p>
                    
                    <p>The AI that emerges from the coming winter will be more focused, more practical, and 
                    more genuinely useful. It just won't be valued at absurd multiples.</p>
                    
                    <p>Prepare accordingly.</p>
                """
            },
            {
                "title": "I Analyzed 10,000 Pull Requests: Here's What Separates Good Developers from Great Ones",
                "dek": "It's not code quality, typing speed, or algorithms knowledge. The real differentiator surprised me.",
                "price": 199,
                "cover": "https://picsum.photos/seed/tech-pr-analysis/1200/675",
                "category": "Engineering Culture",
                "content": """
                    <p>Over six months, I analyzed 10,000 pull requests from 50 different engineering teams, 
                    ranging from early-stage startups to FAANG companies. I was looking for patterns that 
                    distinguished senior developers from mid-level ones.</p>
                    
                    <p>What I found challenges almost everything we think we know about developer excellence.</p>
                    
                    <h2>What Didn't Matter</h2>
                    
                    <p>Let's get this out of the way first. Here's what DIDN'T correlate with being perceived 
                    as a "great" developer:</p>
                    
                    <ul>
                        <li>Lines of code written</li>
                        <li>Number of PRs submitted</li>
                        <li>Advanced algorithm usage</li>
                        <li>Fancy design patterns</li>
                        <li>Years of experience (beyond 3 years)</li>
                    </ul>
                    
                    <h2>What Actually Mattered</h2>
                    
                    <p>The top developers shared three key behaviors:</p>
                    
                    <p><strong>1. Context Addition (not code addition)</strong></p>
                    
                    <p>Great developers wrote PR descriptions that answered:</p>
                    <ul>
                        <li>Why this change matters</li>
                        <li>What alternatives were considered</li>
                        <li>What could go wrong</li>
                        <li>How to test the changes</li>
                    </ul>
                    
                    <p>Average PR description: "Fixed the bug"<br>
                    Great PR description: A 200-word explanation of the problem, solution, and implications.</p>
                    
                    <p><strong>2. Review Thoroughness</strong></p>
                    
                    <p>Top performers spent 40% of their time reviewing others' code, not writing their own. 
                    Their reviews focused on:</p>
                    <ul>
                        <li>System-level implications</li>
                        <li>Edge cases and error handling</li>
                        <li>Maintainability and readability</li>
                        <li>Teaching moments for junior developers</li>
                    </ul>
                    
                    <p><strong>3. Proactive Debt Management</strong></p>
                    
                    <p>Elite developers didn't avoid technical debt—they actively catalogued it. Their PRs often 
                    included:</p>
                    <ul>
                        <li>Inline TODOs with context</li>
                        <li>Comments explaining shortcuts and why they were necessary</li>
                        <li>Follow-up tickets created proactively</li>
                        <li>Documentation of decision trade-offs</li>
                    </ul>
                    
                    <h2>The Communication Pattern</h2>
                    
                    <p>Across all the data, one pattern emerged: great developers treat code as communication 
                    with future humans (including themselves), not just instructions for machines.</p>
                    
                    <p>They optimize for:</p>
                    <ul>
                        <li>Clarity over cleverness</li>
                        <li>Obviousness over brevity</li>
                        <li>Maintainability over performance (until proven necessary)</li>
                    </ul>
                    
                    <h2>The Career Implications</h2>
                    
                    <p>If you want to level up as a developer, focus less on learning the latest framework and 
                    more on:</p>
                    
                    <ol>
                        <li>Writing better PR descriptions</li>
                        <li>Giving more thoughtful code reviews</li>
                        <li>Documenting your thinking, not just your code</li>
                        <li>Helping others understand the system</li>
                    </ol>
                    
                    <p>The developers who get promoted aren't necessarily the ones who write the most code. 
                    They're the ones who make everyone around them better.</p>
                """
            },
            {
                "title": "Your SaaS Metrics Are Lying to You: The Hidden Truth About Churn",
                "dek": "Churn rate is a vanity metric. Here's what you should actually be tracking—and why most startups get this wrong.",
                "price": 249,
                "cover": "https://picsum.photos/seed/tech-saas-metrics/1200/675",
                "category": "Startup Strategy",
                "content": """
                    <p>Every SaaS founder obsesses over churn rate. Monthly churn under 5%? You're golden. 
                    Above 10%? You're in trouble.</p>
                    
                    <p>Except this entire mental model is broken, and it's causing founders to optimize for 
                    the wrong things.</p>
                    
                    <h2>The Churn Rate Lie</h2>
                    
                    <p>Here's the problem: churn rate treats all customers equally. But they're not equal.</p>
                    
                    <p>Imagine two companies, both with 5% monthly churn:</p>
                    
                    <p><strong>Company A:</strong> Loses their smallest, lowest-paying customers<br>
                    <strong>Company B:</strong> Loses their largest, highest-paying customers</p>
                    
                    <p>Same churn rate. Completely different businesses. Company A is healthy. Company B is dying.</p>
                    
                    <h2>What to Track Instead</h2>
                    
                    <p>After analyzing 100+ SaaS companies, here are the metrics that actually predict success:</p>
                    
                    <p><strong>1. Cohort Revenue Retention</strong></p>
                    <p>Track revenue, not customer count. Your Jan 2024 cohort should ideally generate MORE 
                    revenue in Jan 2025 than they did when they signed up (through expansion).</p>
                    
                    <p><strong>2. Time-to-Value</strong></p>
                    <p>How long until a customer gets meaningful value? Companies with time-to-value under 
                    24 hours have 3x lower churn than those over 1 week.</p>
                    
                    <p><strong>3. Usage Depth</strong></p>
                    <p>What percentage of your features do customers actually use? Companies with >60% feature 
                    adoption rarely churn.</p>
                    
                    <p><strong>4. Recovery Rate</strong></p>
                    <p>Of customers who churn, how many come back? If your recovery rate is low, you're not 
                    solving a painful enough problem.</p>
                    
                    <h2>The Real Churn Patterns</h2>
                    
                    <p>From my analysis, here's when churn actually happens:</p>
                    
                    <ul>
                        <li><strong>Day 0-7:</strong> 40% of churn happens here (terrible onboarding)</li>
                        <li><strong>Day 30:</strong> 25% of churn (trial ends, value unclear)</li>
                        <li><strong>Day 90:</strong> 15% of churn (initial project done, no expansion use case)</li>
                        <li><strong>Day 365+:</strong> 20% of churn (competitors, budget cuts, actual dissatisfaction)</li>
                    </ul>
                    
                    <p>Notice what this tells you: 65% of churn is a product and onboarding problem, not a 
                    satisfaction problem.</p>
                    
                    <h2>How to Actually Reduce Churn</h2>
                    
                    <p><strong>Week 1 Focus:</strong></p>
                    <ul>
                        <li>Get customers to experience value in first session</li>
                        <li>Automate onboarding as much as possible</li>
                        <li>Have a human check in within 24 hours</li>
                    </ul>
                    
                    <p><strong>Day 30 Focus:</strong></p>
                    <ul>
                        <li>Show clear ROI metrics</li>
                        <li>Identify usage patterns of successful customers</li>
                        <li>Proactively reach out to low-engagement users</li>
                    </ul>
                    
                    <p><strong>Day 90+ Focus:</strong></p>
                    <ul>
                        <li>Drive expansion and multiple use cases</li>
                        <li>Build switching costs (integrations, data)</li>
                        <li>Create community and network effects</li>
                    </ul>
                    
                    <h2>The Bottom Line</h2>
                    
                    <p>Stop tracking aggregate churn rate. Start tracking:</p>
                    <ol>
                        <li>Revenue retention by cohort</li>
                        <li>Time-to-value by customer segment</li>
                        <li>Feature adoption depth</li>
                        <li>Churn reasons (actually ask why they left)</li>
                    </ol>
                    
                    <p>Your churn rate might look fine while your business is dying. The right metrics will 
                    tell you the truth.</p>
                """
            }
        ]
        
        print(f"📝 Creating {len(articles_data)} articles...")
        
        for idx, data in enumerate(articles_data):
            slug = f"techpulse-{idx+1}"
            existing = Article.query.filter_by(
                author_id=alex_author.id,
                slug=slug
            ).first()
            
            if existing:
                print(f"  ⏭️  Skipping {data['title'][:50]}... (already exists)")
                continue
            
            # All articles are independent (no publisher)
            article = Article(
                publisher_id=None,  # Independent
                author_id=alex_author.id,
                slug=slug,
                title=data["title"],
                dek=data["dek"],
                author=alex_author.display_name,
                media_type=data.get("media_type", "html"),
                price_cents=data["price"],
                cover_url=data["cover"],
                body_html=data["content"],
                body_preview=data["content"][:500] + "...",
                license_type="independent",  # 90/10 split
                custom_splits=json.dumps({"author": 9000, "platform": 1000}),
                status="published",
                created_at=datetime.utcnow() - timedelta(days=len(articles_data)-idx)
            )
            db.session.add(article)
            print(f"  ✅ Created: {data['title'][:60]}...")
        
        db.session.commit()
        
        print(f"\n✨ TechPulse Newsletter showcase seeded successfully!")
        print(f"   Author: {alex_author.display_name}")
        print(f"   Articles: {len(articles_data)} (all independent, 90% author / 10% platform)")
        print(f"   Access at: http://127.0.0.1:51879/#/showcase/technewsletter")
        print(f"   Login as: alex@techpulse.dev")


if __name__ == "__main__":
    seed_technewsletter()

