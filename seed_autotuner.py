"""Seed the Autotuner product into Paypr — idempotent, additive (no drop_all).

Creates, if missing:
  · Publisher  "AI Studio"  (slug ai-studio)
  · Article    "Autotuner — Export Unlock"  (slug autotuner-export, 25¢)
  · Demo user  autotuner-demo@paypr.pro  with a ◈5.00 wallet (local testing)

Prints the PAYPR_ARTICLE_ID the autotuner needs in its environment.

    python seed_autotuner.py
"""
from app import create_app
from extensions import db
from models import Publisher, Article, User


def seed():
    app = create_app()
    with app.app_context():
        db.create_all()

        pub = Publisher.query.filter_by(slug="ai-studio").first()
        if not pub:
            pub = Publisher(
                name="AI Studio", slug="ai-studio",
                hero_url="https://picsum.photos/1200/600?random=41",
                default_price_cents=25, category="Tools", accent_color="#7FDBCA",
            )
            db.session.add(pub)
            db.session.commit()

        art = Article.query.filter_by(publisher_id=pub.id, slug="autotuner-export").first()
        if not art:
            art = Article(
                publisher_id=pub.id,
                slug="autotuner-export",
                title="Autotuner — Export Unlock",
                dek="One polished export from the voice-tuning workbench, with AI commentary.",
                author="AI Studio",
                price_cents=25,
                body_html="<p>This purchase unlocks a session export in the Autotuner: "
                          "the full transcript, the final voice metrics, and the workshop "
                          "commentary. Verified by Paypr access token.</p>",
                body_preview="Unlocks one Autotuner session export.",
                status="published",
            )
            db.session.add(art)
            db.session.commit()

        demo = User.query.filter_by(email="autotuner-demo@paypr.pro").first()
        if not demo:
            demo = User(email="autotuner-demo@paypr.pro", wallet_cents=500)
            db.session.add(demo)
            db.session.commit()

        print("PAYPR_ARTICLE_ID=%d" % art.id)
        print("publisher: %s (id=%d) · article: %s (%d¢) · demo user: %s (wallet %d¢)"
              % (pub.slug, pub.id, art.slug, art.price_cents or 0, demo.email, demo.wallet_cents or 0))


if __name__ == "__main__":
    seed()
