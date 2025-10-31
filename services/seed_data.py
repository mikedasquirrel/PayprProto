from __future__ import annotations

import random
import re
from typing import Dict, Any, List, Optional

from faker import Faker

from extensions import db
from models import Publisher, Article


fake = Faker()


def _slugify(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    text = re.sub(r"[\s-]+", "-", text)
    return text


def _pub_name() -> str:
    city = fake.city()
    suffix = random.choice(["Ledger", "Chronicle", "Dispatch", "Gazette", "Tribune", "Standard"]) 
    return f"{city} {suffix}"


def reseed_demo(
    num_publishers: int = 3,
    articles_per_publisher: int = 5,
    price_tiers_cents: Optional[List[int]] | None = None,
    categories: Optional[List[str]] | None = None,
) -> Dict[str, Any]:
    tiers = price_tiers_cents or [10, 15, 25, 39, 50, 75, 99]
    cats = categories or [
        "Local",
        "Politics",
        "Sports",
        "Arts",
        "Business",
        "Tech",
        "Food",
        "Education",
        "Opinion",
        "Lifestyle",
        "Investigations",
    ]
    accents = ["#FA3D7F", "#00E5FF", "#2AF7A1", "#A05BFF", "#3AC7FF", "#FFFFFF"]
    styles = ["newspaper", "magazine", "literary", "poetry", "opinion", "feature"]

    # Clear existing (articles first due to FK)
    db.session.query(Article).delete()
    db.session.query(Publisher).delete()
    db.session.commit()

    pub_entities: List[Publisher] = []
    # Always include a Smerconish-style publication demo once
    name = "Smerconish Network"
    slug = _slugify(name)
    pub = Publisher(name=name, slug=slug, hero_url=f"https://picsum.photos/seed/{slug}/1200/600", default_price_cents=39, category="Opinion", accent_color="#FA3D7F", layout_style="opinion")
    db.session.add(pub)
    pub_entities.append(pub)

    for _ in range(max(num_publishers - 1, 0)):
        name = _pub_name()
        slug = _slugify(name)
        default_price = random.choice(tiers)
        hero_url = f"https://picsum.photos/seed/{slug}/1200/600"
        pub = Publisher(
            name=name,
            slug=slug,
            hero_url=hero_url,
            default_price_cents=default_price,
            category=random.choice(cats),
            accent_color=random.choice(accents),
            layout_style=random.choice(styles),
        )
        db.session.add(pub)
        pub_entities.append(pub)
    db.session.commit()

    art_count = 0
    for pub in pub_entities:
        for i in range(articles_per_publisher):
            title = fake.sentence(nb_words=6)
            dek = fake.sentence(nb_words=14)
            author = fake.name()
            body_paras = "\n\n".join(fake.paragraphs(nb=6))
            preview_paras = "\n\n".join(fake.paragraphs(nb=2))
            price = random.choice(tiers + [pub.default_price_cents])
            art = Article(
                publisher_id=pub.id,
                slug=f"{pub.slug}-art-{i}",
                title=title,
                dek=dek,
                author=author,
                media_type=random.choices(["html", "pdf", "audio"], weights=[80, 10, 10])[0],
                price_cents=price,
                cover_url=f"https://picsum.photos/seed/{pub.slug}-{pub.layout_style or 'default'}-{i}/800/400",
                body_html=f"<p>{body_paras}</p>",
                body_preview=f"<p>{preview_paras}</p>",
            )
            db.session.add(art)
            art_count += 1
    db.session.commit()

    sample = [{"name": p.name, "slug": p.slug, "default_price_cents": p.default_price_cents} for p in pub_entities[:5]]
    return {"publishers": len(pub_entities), "articles": art_count, "sample_publishers": sample}
