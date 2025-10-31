from __future__ import annotations

import random
from faker import Faker

from app import create_app
from extensions import db
from models import Publisher, Article


fake = Faker()


def seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        pubs = [
            {"name": "City Ledger", "slug": "city-ledger", "hero_url": "https://picsum.photos/1200/600?random=1", "default_price_cents": 25, "category":"Local", "accent_color":"#FA3D7F"},
            {"name": "Riverside Chronicle", "slug": "riverside-chronicle", "hero_url": "https://picsum.photos/1200/600?random=2", "default_price_cents": 39, "category":"Politics", "accent_color":"#00E5FF"},
            {"name": "Frontier Dispatch", "slug": "frontier-dispatch", "hero_url": "https://picsum.photos/1200/600?random=3", "default_price_cents": 50, "category":"Investigations", "accent_color":"#2AF7A1"},
            {"name": "Metro Sports", "slug": "metro-sports", "hero_url": "https://picsum.photos/1200/600?random=4", "default_price_cents": 25, "category":"Sports", "accent_color":"#A05BFF"},
            {"name": "Bay Arts", "slug": "bay-arts", "hero_url": "https://picsum.photos/1200/600?random=5", "default_price_cents": 15, "category":"Arts", "accent_color":"#3AC7FF"},
            {"name": "Tech Borough", "slug": "tech-borough", "hero_url": "https://picsum.photos/1200/600?random=6", "default_price_cents": 25, "category":"Tech", "accent_color":"#FFFFFF"},
        ]
        pub_entities = []
        for p in pubs:
            pub = Publisher(name=p["name"], slug=p["slug"], hero_url=p["hero_url"], default_price_cents=p["default_price_cents"], category=p.get("category"), accent_color=p.get("accent_color"))
            db.session.add(pub)
            pub_entities.append(pub)
        db.session.commit()

        for pub in pub_entities:
            for i in range(10):
                title = fake.sentence(nb_words=6)
                dek = fake.sentence(nb_words=14)
                author = fake.name()
                body_paras = "\n\n".join(fake.paragraphs(nb=6))
                preview_paras = "\n\n".join(fake.paragraphs(nb=2))
                art = Article(
                    publisher_id=pub.id,
                    slug=f"{pub.slug}-art-{i}",
                    title=title,
                    dek=dek,
                    author=author,
                    media_type=random.choice(["html","pdf","audio"]),
                    price_cents=random.choice([10,15,25,39,50,75,99]),
                    cover_url=f"https://picsum.photos/800/400?random={pub.id * 10 + i}",
                    body_html=f"<p>{body_paras}</p>",
                    body_preview=f"<p>{preview_paras}</p>",
                )
                db.session.add(art)
        db.session.commit()
        print("Seed complete.")


if __name__ == "__main__":
    seed()
