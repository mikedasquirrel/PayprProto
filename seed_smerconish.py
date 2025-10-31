"""Seed Smerconish.com showcase with realistic content"""
from datetime import datetime, timedelta
import json

from app import create_app
from extensions import db
from models import (
    User, AuthorProfile, Publisher, Article, ShowcaseSite,
    ContentLicense
)


def seed_smerconish():
    app = create_app()
    with app.app_context():
        print("🎯 Seeding Smerconish.com showcase...")
        
        # Create Michael Smerconish as a user and author
        michael_user = User.query.filter_by(email="michael@smerconish.com").first()
        if not michael_user:
            michael_user = User(
                email="michael@smerconish.com",
                wallet_cents=0  # Authors don't need wallet balance
            )
            db.session.add(michael_user)
            db.session.commit()
        
        # Create author profile for Michael
        michael_author = AuthorProfile.query.filter_by(user_id=michael_user.id).first()
        if not michael_author:
            michael_author = AuthorProfile(
                user_id=michael_user.id,
                display_name="Michael Smerconish",
                bio="CNN political commentator, SiriusXM radio host, author, and attorney. Host of CNN's 'Smerconish' and The Michael Smerconish Program on SiriusXM.",
                photo_url="https://picsum.photos/seed/smerconish-photo/400/400",
                website_url="https://smerconish.com",
                twitter_handle="smerconish",
                default_price_cents=199,
                accepts_publisher_requests=True
            )
            db.session.add(michael_author)
            db.session.commit()
        
        # Create CNN as a publisher (for syndicated content)
        cnn_publisher = Publisher.query.filter_by(slug="cnn").first()
        if not cnn_publisher:
            cnn_publisher = Publisher(
                name="CNN",
                slug="cnn",
                logo_url="https://picsum.photos/seed/cnn-logo/200/100",
                hero_url="https://picsum.photos/seed/cnn-hero/1200/600",
                default_price_cents=99,
                category="News",
                accent_color="#CC0000",
                strapline="The Most Trusted Name in News",
                accepts_submissions=False,  # CNN doesn't accept submissions
                default_author_split_bps=4500  # 45% to author (Michael)
            )
            db.session.add(cnn_publisher)
            db.session.commit()
        
        # Create SiriusXM as publisher (for podcast content)
        siriusxm = Publisher.query.filter_by(slug="siriusxm").first()
        if not siriusxm:
            siriusxm = Publisher(
                name="SiriusXM",
                slug="siriusxm",
                logo_url="https://picsum.photos/seed/sirius-logo/200/100",
                hero_url="https://picsum.photos/seed/sirius-hero/1200/600",
                default_price_cents=149,
                category="Podcast",
                accent_color="#00D3FF",
                strapline="Audio Entertainment and Podcasts",
                accepts_submissions=False,
                default_author_split_bps=5000  # 50% to host
            )
            db.session.add(siriusxm)
            db.session.commit()
        
        # Create Smerconish.com showcase site
        showcase = ShowcaseSite.query.filter_by(slug="smerconish").first()
        if not showcase:
            showcase = ShowcaseSite(
                slug="smerconish",
                name="Smerconish",
                tagline="Independent Thinking • Political Commentary • CNN • SiriusXM",
                owner_type="author",
                owner_id=michael_author.id,
                primary_color="#002C5F",  # Navy blue
                accent_color="#E31B23",  # Red
                logo_url="https://picsum.photos/seed/smer-logo/300/100",
                hero_image_url="https://picsum.photos/seed/smer-hero/1600/600",
                about_text="""
                    <p>Michael Smerconish is a CNN political commentator and SiriusXM radio host. 
                    He hosts CNN's "Smerconish" every Saturday morning and The Michael Smerconish 
                    Program on SiriusXM's POTUS channel.</p>
                    
                    <p>A New York Times bestselling author and attorney, Michael is known for his 
                    independent thinking and willingness to challenge conventional wisdom across 
                    the political spectrum.</p>
                """,
                show_paypr_branding=True,
                is_active=True
            )
            db.session.add(showcase)
            db.session.commit()
        
        # Create realistic content from multiple sources
        articles_data = [
            # CNN Articles
            {
                "title": "The Silent Majority Speaks: What the Polls Miss About American Voters",
                "dek": "Why traditional polling continues to underestimate certain segments of the electorate, and what it means for democracy.",
                "author": michael_author.display_name,
                "publisher": cnn_publisher,
                "price": 99,
                "media_type": "html",
                "cover": "https://picsum.photos/seed/smer-cnn-1/1200/675",
                "license_type": "revenue_share",
                "custom_splits": json.dumps({"author": 4500, "publisher": 4500, "platform": 1000}),
                "category": "CNN Analysis",
                "content": """
                    <p>In every election cycle, we hear the same refrain: "The polls got it wrong." 
                    But what if the problem isn't with the polls themselves, but with who chooses 
                    to respond to them?</p>
                    
                    <p>My analysis of the last three presidential elections reveals a troubling 
                    pattern: there's a significant segment of the American electorate that simply 
                    refuses to participate in political surveys, yet shows up reliably at the ballot box.</p>
                    
                    <h2>The Response Rate Crisis</h2>
                    
                    <p>Traditional telephone polls now struggle to achieve even a 6% response rate. 
                    In the 1990s, that number was closer to 40%. The people who don't answer aren't 
                    random—they tend to share certain characteristics that correlate with voting behavior.</p>
                    
                    <p>Through conversations with pollsters and analysis of voter turnout data, I've 
                    identified three key groups that polls systematically undercount:</p>
                    
                    <ul>
                        <li><strong>The Privacy-Conscious:</strong> Voters who view political affiliation 
                        as deeply personal and refuse to share their views with strangers.</li>
                        <li><strong>The Disillusioned:</strong> Long-time voters who feel abandoned by 
                        both parties but continue to vote based on specific issues.</li>
                        <li><strong>The Young Independents:</strong> Voters under 35 who reject party 
                        labels but engage selectively on issues they care about.</li>
                    </ul>
                    
                    <h2>What This Means for Democracy</h2>
                    
                    <p>The gap between poll predictions and actual results isn't just a technical 
                    problem—it's a signal that our political discourse is missing important voices. 
                    When pollsters can't capture these voters, campaigns don't hear their concerns, 
                    and policies don't address their needs.</p>
                    
                    <p>The solution isn't better polling methodology alone. We need to create space 
                    for political expression that doesn't require people to declare allegiance to 
                    tribes they don't feel part of.</p>
                """
            },
            {
                "title": "Why I Changed My Mind on Infrastructure Spending",
                "dek": "After years of advocating for fiscal restraint, here's why I now support the bipartisan infrastructure bill.",
                "author": michael_author.display_name,
                "publisher": cnn_publisher,
                "price": 99,
                "media_type": "html",
                "cover": "https://picsum.photos/seed/smer-cnn-2/1200/675",
                "license_type": "revenue_share",
                "custom_splits": json.dumps({"author": 4500, "publisher": 4500, "platform": 1000}),
                "category": "CNN Opinion",
                "content": """
                    <p>I'll admit it: I was wrong about infrastructure spending. For years, I championed 
                    fiscal conservatism and warned against deficit spending. But after traveling across 
                    America and witnessing our crumbling bridges, failing water systems, and inadequate 
                    broadband coverage, I've had to reconsider.</p>
                    
                    <p>This isn't flip-flopping—it's intellectual honesty in the face of new evidence.</p>
                    
                    <h2>The Reality on the Ground</h2>
                    
                    <p>During my recent road trip from Philadelphia to Los Angeles, I drove across 
                    bridges that engineers have classified as "structurally deficient." I visited 
                    rural communities where children can't do homework because reliable internet doesn't 
                    reach their homes. I saw water treatment facilities operating with equipment from 
                    the 1960s.</p>
                    
                    <p>The American Society of Civil Engineers gave our infrastructure a C- grade and 
                    estimated we need $2.6 trillion in investments by 2029 just to bring things up to 
                    acceptable standards.</p>
                    
                    <h2>The Economic Argument</h2>
                    
                    <p>Here's what changed my thinking: infrastructure spending isn't just expense—it's 
                    investment. Every dollar spent on infrastructure generates economic activity, creates 
                    jobs, and increases productivity for decades to come.</p>
                    
                    <p>The bipartisan infrastructure bill isn't perfect, but it's necessary. And in 
                    today's hyperpartisan climate, the fact that both parties came together to pass it 
                    suggests even they recognize how urgent this need has become.</p>
                """
            },
            # SiriusXM Podcast Episodes
            {
                "title": "The Survey Says: Understanding America's Political Pulse [Podcast]",
                "dek": "A deep dive into my weekly poll results and what they reveal about where America stands on the issues.",
                "author": michael_author.display_name,
                "publisher": siriusxm,
                "price": 149,
                "media_type": "audio",
                "cover": "https://picsum.photos/seed/smer-podcast-1/1200/675",
                "license_type": "revenue_share",
                "custom_splits": json.dumps({"author": 5000, "publisher": 4000, "platform": 1000}),
                "category": "Podcast",
                "content": """
                    <p><strong>🎧 Audio Episode - 45 minutes</strong></p>
                    
                    <p>This week's episode explores the most surprising results from my CNN poll 
                    question: "Should social media companies be held liable for content posted by 
                    their users?"</p>
                    
                    <h2>Episode Highlights:</h2>
                    
                    <ul>
                        <li><strong>00:00-10:00:</strong> Poll results reveal unexpected consensus</li>
                        <li><strong>10:00-25:00:</strong> Interview with Section 230 expert</li>
                        <li><strong>25:00-35:00:</strong> Caller segment - hear from real Americans</li>
                        <li><strong>35:00-45:00:</strong> My take and what it means for policy</li>
                    </ul>
                    
                    <p>Plus: Why the left and right find common ground on this issue, and why 
                    that matters for finding consensus on other divisive topics.</p>
                    
                    <p><em>Audio player would be embedded here in production</em></p>
                """
            },
            {
                "title": "Cancel Culture or Accountability? A Conversation with Jonathan Haidt",
                "dek": "The social psychologist joins me to discuss free speech, social media, and the future of public discourse.",
                "author": michael_author.display_name,
                "publisher": siriusxm,
                "price": 199,
                "media_type": "audio",
                "cover": "https://picsum.photos/seed/smer-podcast-2/1200/675",
                "license_type": "revenue_share",
                "custom_splits": json.dumps({"author": 5000, "publisher": 4000, "platform": 1000}),
                "category": "Podcast",
                "content": """
                    <p><strong>🎧 Audio Episode - 55 minutes</strong></p>
                    
                    <p>Jonathan Haidt, author of "The Coddling of the American Mind," joins me for 
                    an extended conversation about the state of free speech in America.</p>
                    
                    <h2>Key Topics Discussed:</h2>
                    
                    <ul>
                        <li>The difference between consequences and censorship</li>
                        <li>Social media's role in polarization</li>
                        <li>University campus speech debates</li>
                        <li>Finding common ground across ideological divides</li>
                        <li>The future of civil discourse</li>
                    </ul>
                    
                    <p>Jonathan brings fascinating research on moral foundations and how understanding 
                    them can help bridge our divides.</p>
                    
                    <blockquote>
                        "The goal isn't to agree on everything—it's to create conditions where we can 
                        disagree productively."
                    </blockquote>
                    
                    <p><em>Audio player would be embedded here in production</em></p>
                """
            },
            # Independent/Newsletter Exclusives
            {
                "title": "My Conversation with Biden: What Happened Off Camera",
                "dek": "Behind-the-scenes insights from my recent interview with President Biden that didn't make it to air.",
                "author": michael_author.display_name,
                "publisher": None,  # Independent content
                "price": 299,
                "media_type": "html",
                "cover": "https://picsum.photos/seed/smer-exclusive-1/1200/675",
                "license_type": "independent",
                "custom_splits": json.dumps({"author": 9000, "platform": 1000}),
                "category": "Newsletter Exclusive",
                "content": """
                    <p><em>⭐ Newsletter Exclusive - Premium Content</em></p>
                    
                    <p>Last Tuesday, I sat down with President Biden for what was scheduled as a 
                    20-minute interview about infrastructure policy. We ended up talking for nearly 
                    45 minutes, covering everything from student loan forgiveness to his thoughts on 
                    the state of American democracy.</p>
                    
                    <p>CNN aired the infrastructure segment, but here's what you didn't see...</p>
                    
                    <h2>On Student Loan Forgiveness</h2>
                    
                    <p>When I pressed him on the criticism that loan forgiveness is regressive—helping 
                    college graduates while doing nothing for those who didn't attend college—he got 
                    more animated than I'd seen him all day.</p>
                    
                    <p>"Michael, look," he said, leaning forward, "nobody's saying this solves everything. 
                    But when you've got a generation drowning in debt, unable to buy homes, start 
                    families, or take entrepreneurial risks—that's not just their problem, it's an 
                    economic anchor on all of us."</p>
                    
                    <p>What struck me wasn't the policy defense—it was personal. He talked about his 
                    own college education at the University of Delaware, how different the economics 
                    were then, how he could work summer jobs and graduate debt-free.</p>
                    
                    <h2>The Democracy Question</h2>
                    
                    <p>Off camera, I asked him the question that's been bothering me: Does he really 
                    believe American democracy is at risk, or is that campaign rhetoric?</p>
                    
                    <p>He paused for a long time. "I wish it were rhetoric," he finally said. "But 
                    when you've got people who won't commit to accepting election results, when you've 
                    got violence at the Capitol, when you've got state legislatures trying to overturn 
                    voters' choices—yeah, Michael, I think it's at risk."</p>
                    
                    <p>Then he added something that won't surprise anyone who's followed his career: 
                    "But I've never been more optimistic about the American people. Our institutions 
                    are being tested, but they're holding. That's what matters."</p>
                    
                    <h2>The Personal Moment</h2>
                    
                    <p>As we wrapped up, his team started packing up equipment, and Biden asked if 
                    I had a minute. We talked about loss—he about Beau, me about my father. It wasn't 
                    an interview anymore. It was two guys in their seventies who've lived enough life 
                    to know that politics, however important, isn't everything.</p>
                    
                    <p>That conversation won't show up in any transcript, and I won't betray the 
                    private details. But it reminded me why I do this work: underneath all the partisan 
                    noise, we're still just people trying to figure things out.</p>
                """
            },
            {
                "title": "The Case for Reviving Compulsory Voting",
                "dek": "Australia does it. Belgium does it. Should America make voting mandatory?",
                "author": michael_author.display_name,
                "publisher": None,
                "price": 199,
                "media_type": "html",
                "cover": "https://picsum.photos/seed/smer-exclusive-2/1200/675",
                "license_type": "independent",
                "custom_splits": json.dumps({"author": 9000, "platform": 1000}),
                "category": "Newsletter Exclusive",
                "content": """
                    <p>Here's an idea that will immediately anger both sides of the political aisle: 
                    make voting mandatory.</p>
                    
                    <p>Before you close this tab in disgust, hear me out. This isn't about forcing 
                    people to pick a candidate—it's about requiring civic participation.</p>
                    
                    <h2>How It Would Work</h2>
                    
                    <p>In Australia, which has had compulsory voting since 1924, citizens must show 
                    up to a polling place or mail in a ballot. They can leave it blank or write in 
                    "none of the above" if they choose. They just have to participate in the process. 
                    The fine for not voting? About $20.</p>
                    
                    <p>The result? Australia consistently sees 90%+ turnout compared to America's 
                    60-65% in presidential years (and far worse in midterms).</p>
                    
                    <h2>The Civics Argument</h2>
                    
                    <p>Democracy works best when everyone participates. When only the most passionate 
                    (read: most extreme) voters show up, we get candidates who appeal to the base rather 
                    than the median voter. Mandatory voting would force politicians to appeal to the 
                    whole electorate, not just the reliable voters.</p>
                    
                    <h2>The Freedom Argument</h2>
                    
                    <p>Critics will say this violates freedom. I get it. But we already require all 
                    sorts of civic duties—jury service, selective service registration, paying taxes. 
                    Why is voting, the foundation of democracy, optional?</p>
                    
                    <p>Plus, you'd still have freedom in what matters: how you vote. Blank ballots, 
                    write-ins, "none of the above"—all acceptable. The requirement is just to show up.</p>
                    
                    <h2>What It Would Change</h2>
                    
                    <p>Higher turnout would likely benefit moderate candidates and centrist policies. 
                    The extremes on both sides currently have outsized influence because their voters 
                    are more reliable. Mandatory voting would dilute that effect.</p>
                    
                    <p>It would also reduce the role of "get out the vote" operations, which currently 
                    cost campaigns millions and tend to favor candidates with more money.</p>
                    
                    <p>Most importantly, it would change our culture around voting. Instead of it being 
                    something we're urged to do, it would be an expected part of citizenship—like paying 
                    taxes or getting a driver's license renewed.</p>
                    
                    <h2>The Practical Problems</h2>
                    
                    <p>I'm not naive about the challenges. Implementation would be complex. We'd need 
                    to make voting much more accessible—automatic registration, more polling places, 
                    election day as a holiday, expanded early voting.</p>
                    
                    <p>And yes, some people would resist. But Australia's experience shows that resistance 
                    fades quickly when the social norm shifts from "I chose to vote" to "of course I voted."</p>
                    
                    <p>It's time to have this conversation seriously. Not as a partisan talking point, 
                    but as a genuine question: Would our democracy be healthier if everyone participated?</p>
                """
            },
            # Video/Multimedia Content
            {
                "title": "Saturday Sitdown: The Week's Most Important Moments [Video]",
                "dek": "My analysis of this week's biggest political stories and what they mean for America.",
                "author": michael_author.display_name,
                "publisher": cnn_publisher,
                "price": 149,
                "media_type": "html",
                "cover": "https://picsum.photos/seed/smer-video-1/1200/675",
                "license_type": "revenue_share",
                "custom_splits": json.dumps({"author": 4500, "publisher": 4500, "platform": 1000}),
                "category": "CNN Video",
                "content": """
                    <p><strong>📺 Video Commentary - 25 minutes</strong></p>
                    
                    <h2>This Week's Topics:</h2>
                    
                    <ol>
                        <li><strong>The Supreme Court Decision on Affirmative Action</strong> - 
                        What it means for college admissions and the broader debate about equality 
                        versus equity (8:30)</li>
                        
                        <li><strong>Debt Ceiling Drama</strong> - Breaking down the deal and why 
                        both sides are claiming victory (6:45)</li>
                        
                        <li><strong>The AI Regulation Debate</strong> - My interview with Sam Altman 
                        and why he's calling for government oversight of AI (7:15)</li>
                        
                        <li><strong>Weekend Question Preview</strong> - This Saturday's poll question 
                        and why I think it will surprise you (3:00)</li>
                    </ol>
                    
                    <p><em>Video player would be embedded here in production</em></p>
                    
                    <p>Plus: A personal note about why independent thinking matters more than ever 
                    in today's political climate.</p>
                """
            },
            # More Recent Content
            {
                "title": "America's Loneliness Epidemic: A Political Crisis in Disguise",
                "dek": "Why social isolation might be the root cause of our political polarization.",
                "author": michael_author.display_name,
                "publisher": None,
                "price": 199,
                "media_type": "html",
                "cover": "https://picsum.photos/seed/smer-exclusive-3/1200/675",
                "license_type": "independent",
                "custom_splits": json.dumps({"author": 9000, "platform": 1000}),
                "category": "Newsletter Exclusive",
                "content": """
                    <p>The Surgeon General recently declared loneliness a public health epidemic. 
                    But I think we're missing the bigger picture: it's also a political epidemic.</p>
                    
                    <p>Research shows that lonely people are more likely to embrace extreme political 
                    views, less likely to trust institutions, and more susceptible to conspiracy theories. 
                    Sound familiar?</p>
                    
                    <h2>The Data Is Alarming</h2>
                    
                    <p>Nearly half of Americans report feeling lonely regularly. Among young adults, 
                    that number climbs to 60%. Meanwhile, participation in civic organizations, 
                    churches, and community groups has plummeted.</p>
                    
                    <p>As Robert Putnam documented in "Bowling Alone," we've lost the social fabric 
                    that once brought Americans together across ideological lines. Your bowling league, 
                    church social, or PTA meeting used to expose you to people who thought differently 
                    than you. Now? We can curate our entire social world to echo our existing beliefs.</p>
                    
                    <h2>The Political Connection</h2>
                    
                    <p>Lonely people seek belonging, and in our fragmented society, political tribes 
                    offer easy entry. Join a movement, adopt its language, share its memes, and suddenly 
                    you have community—even if it's only online.</p>
                    
                    <p>The problem is that these political communities often thrive on outrage and 
                    othering. The enemy isn't just wrong—they're evil. Your tribe isn't just right—it's 
                    righteous. This isn't political discourse; it's filling a human need for connection 
                    in the most toxic way possible.</p>
                    
                    <h2>What We Can Do</h2>
                    
                    <p>I don't have all the answers, but I've seen what works. Programs that bring 
                    people together around shared non-political interests—community service, sports 
                    leagues, book clubs, maker spaces—seem to reduce polarization naturally.</p>
                    
                    <p>When you know your neighbor as "the guy who helped me fix my car" rather than 
                    "the liberal/conservative down the street," it's harder to demonize them.</p>
                    
                    <p>Maybe the answer to our political crisis isn't better arguments or smarter 
                    policy—it's better community.</p>
                """
            },
            {
                "title": "The Polls Close in 30 Minutes: My Real-Time Election Night Thoughts",
                "dek": "Live reactions and analysis as returns come in from across the country.",
                "author": michael_author.display_name,
                "publisher": cnn_publisher,
                "price": 99,
                "media_type": "html",
                "cover": "https://picsum.photos/seed/smer-cnn-3/1200/675",
                "license_type": "revenue_share",
                "custom_splits": json.dumps({"author": 4500, "publisher": 4500, "platform": 1000}),
                "category": "CNN Live Analysis",
                "content": """
                    <p><strong>📊 Live Election Analysis - Updated throughout the night</strong></p>
                    
                    <p>I'm writing this as results pour in. Rather than wait for the perfect analysis, 
                    I'm sharing my thoughts in real-time—complete with the uncertainty and revisions 
                    that come with it.</p>
                    
                    <h2>8:05 PM EST - First Exit Polls</h2>
                    
                    <p>Early exit polls suggest this is going to be closer than either side predicted. 
                    The economy is the #1 issue by far (cited by 38% of voters), but there's surprising 
                    diversity in what "economy" means to different voters.</p>
                    
                    <p>For some, it's inflation. For others, jobs. For many, it's something harder 
                    to quantify—a general anxiety about their children's future prospects.</p>
                    
                    <h2>9:30 PM EST - First State Called</h2>
                    
                    <p>No surprises yet, but the margins are telling. In counties that were +15 
                    Republican in 2020, we're seeing +12. In Democratic strongholds, similar compression. 
                    This suggests either a true centrist shift or mutual exhaustion with extremes.</p>
                    
                    <h2>10:45 PM EST - The Suburban Story</h2>
                    
                    <p>Suburban counties continue to be the bellwether. Watching returns from Chester 
                    County, PA (my home turf), and it's a split ticket paradise. Same voters who backed 
                    the Republican for Senate going Democratic for Governor. Partisanship is dead in 
                    the suburbs—or at least wounded.</p>
                    
                    <h2>12:15 AM EST - Too Close To Call</h2>
                    
                    <p>We're going to be here a while. But here's what's clear already: The polls were 
                    off again, but not in a consistent direction. They underestimated Democrats in 
                    some states, Republicans in others. Maybe that's actually progress—at least they're 
                    equally wrong?</p>
                    
                    <p>More importantly, turnout is up. Way up. Whatever else you think about this 
                    election, Americans are engaged. That has to count for something.</p>
                    
                    <p><em>Updates will continue throughout the night...</em></p>
                """
            },
        ]
        
        # Create articles
        created_articles = []
        for i, data in enumerate(articles_data):
            # Generate unique slug
            slug = data["title"].lower()
            slug = "".join(c if c.isalnum() or c == " " else "" for c in slug)
            slug = "-".join(slug.split())[:200]
            slug = f"{slug}-{i}"
            
            article = Article(
                author_id=michael_author.id,
                publisher_id=data["publisher"].id if data["publisher"] else None,
                slug=slug,
                title=data["title"],
                dek=data["dek"],
                author=data["author"],
                media_type=data["media_type"],
                price_cents=data["price"],
                cover_url=data["cover"],
                body_html=data["content"],
                body_preview=data["content"][:500] + "...",
                license_type=data["license_type"],
                custom_splits=data["custom_splits"],
                status="published",
                created_at=datetime.utcnow() - timedelta(days=i)  # Stagger dates
            )
            db.session.add(article)
            created_articles.append(article)
        
        db.session.commit()
        
        # Create content licenses
        for article in created_articles:
            if article.publisher_id:
                license = ContentLicense(
                    article_id=article.id,
                    author_id=article.author_id,
                    publisher_id=article.publisher_id,
                    license_type=article.license_type,
                    split_config_json=article.custom_splits,
                    status="active"
                )
                db.session.add(license)
        
        db.session.commit()
        
        print(f"✅ Created {len(created_articles)} articles for Smerconish showcase")
        print(f"   - {sum(1 for a in created_articles if a.publisher_id == cnn_publisher.id)} CNN articles")
        print(f"   - {sum(1 for a in created_articles if a.publisher_id == siriusxm.id)} SiriusXM podcasts")
        print(f"   - {sum(1 for a in created_articles if not a.publisher_id)} independent exclusives")
        print(f"✅ Showcase site: http://127.0.0.1:51879/#/showcase/smerconish")
        print(f"✅ API: http://127.0.0.1:51879/showcase/smerconish")


if __name__ == "__main__":
    seed_smerconish()

