from typing import Tuple, Dict, Optional
from flask import current_app
import json


def calculate_fees_cents(price_cents: int) -> Tuple[int, int]:
    bps = int(current_app.config.get("PLATFORM_FEE_BPS", 1000))
    fee = (price_cents * bps + 9999) // 10000  # round up
    net = price_cents - fee
    if net < 0:
        net = 0
    return fee, net


def apply_split_rules(net_cents: int, rules: Dict[str, int]) -> Dict[str, int]:
    """
    rules: mapping role->bps (basis points). Ensures sum to <= 10000; any remainder stays as 'publisher'.
    Returns cents per role.
    """
    total_bps = sum(int(b) for b in rules.values()) if rules else 0
    total_bps = min(total_bps, 10000)
    allocated: Dict[str, int] = {}
    allocated_sum = 0
    for role, bps in (rules or {}).items():
        amt = (net_cents * int(bps) + 9999) // 10000
        allocated[role] = amt
        allocated_sum += amt
    remainder = max(net_cents - allocated_sum, 0)
    allocated.setdefault("publisher", 0)
    allocated["publisher"] += remainder
    return allocated


def get_article_splits(article) -> Dict[str, int]:
    """
    Get revenue split configuration for an article.
    Returns dict of role->basis_points (bps).
    
    Priority:
    1. Article custom_splits (per-article override)
    2. Default splits based on license type
    3. Platform default (90% publisher, 10% platform)
    """
    # Check for custom splits on article
    if article.custom_splits:
        try:
            return json.loads(article.custom_splits)
        except (json.JSONDecodeError, TypeError):
            pass
    
    # Default splits based on license type. The platform's share comes from
    # config, which defaults to 0 — zero-fee doctrine: usage settles 100% to
    # creators unless a piece carries explicit custom_splits.
    fee_bps = int(current_app.config.get("PLATFORM_FEE_BPS", 0))

    if article.license_type == "independent":
        # Independent author keeps everything (minus any configured fee).
        return {"author": 10000 - fee_bps, "platform": fee_bps}

    elif article.license_type == "revenue_share":
        # Revenue share between author and publisher; fee from config only.
        if article.publisher_id:
            from models import Publisher
            pub = Publisher.query.get(article.publisher_id)
            if pub and pub.default_author_split_bps:
                author_bps = pub.default_author_split_bps
                publisher_bps = 10000 - author_bps - fee_bps
                return {
                    "author": author_bps,
                    "publisher": publisher_bps,
                    "platform": fee_bps
                }
        return {"author": 6000, "publisher": 4000 - fee_bps, "platform": fee_bps}

    elif article.license_type == "buyout":
        # Buyout: publisher keeps everything (author already paid).
        return {"publisher": 10000 - fee_bps, "platform": fee_bps}

    else:
        return {"publisher": 10000 - fee_bps, "platform": fee_bps}


def calculate_article_split(price_cents: int, article) -> Dict[str, int]:
    """
    Calculate revenue distribution for article purchase.
    Returns dict of role->cents.
    """
    # Get platform fee first
    fee_cents, net_cents = calculate_fees_cents(price_cents)
    
    # Get split configuration
    splits_bps = get_article_splits(article)
    
    # Calculate amounts
    result = {
        "platform": fee_cents
    }
    
    # Distribute net amount according to splits
    remaining = net_cents
    for role, bps in splits_bps.items():
        if role == "platform":
            # Already calculated
            continue
        
        amount = (net_cents * bps) // 10000
        result[role] = amount
        remaining -= amount
    
    # Add any remainder to publisher or author
    if remaining > 0:
        if "publisher" in result:
            result["publisher"] += remaining
        elif "author" in result:
            result["author"] += remaining
        else:
            result["platform"] += remaining
    
    return result


def record_author_earnings(article, transaction, split_amounts: Dict[str, int]):
    """
    Record author earnings from a transaction.
    Creates AuthorEarnings record if article has an author.
    """
    if not article.author_id:
        return
    
    author_amount = split_amounts.get("author", 0)
    if author_amount <= 0:
        return
    
    from models import AuthorEarnings
    from extensions import db
    
    # Calculate percentage
    percentage_bps = (author_amount * 10000) // transaction.price_cents if transaction.price_cents > 0 else 0
    
    earning = AuthorEarnings(
        author_id=article.author_id,
        article_id=article.id,
        transaction_id=transaction.id,
        amount_cents=author_amount,
        percentage=percentage_bps,
        publisher_id=article.publisher_id
    )
    
    db.session.add(earning)
    db.session.commit()


def split_amount(price_cents: int, bps: Dict[str, int]) -> Dict[str, int]:
    """Split ``price_cents`` across roles by a basis-point map, summing to
    EXACTLY price_cents (largest-remainder). This is the article-free twin of
    ``split_purchase``: metered / pay-per-compute charges have no Article, so the
    caller supplies the bps map directly (e.g. {"publisher": 9000, "platform":
    1000}). Same guarantees — no cent created or lost; under-100% remainder goes
    to platform; over-100% misconfig is normalized down.
    """
    price_cents = int(price_cents)
    if price_cents <= 0:
        return {"platform": 0}

    bps = {r: max(0, int(b)) for r, b in (bps or {}).items()}
    total = sum(bps.values())
    if total == 0:
        bps, total = {"platform": 10000}, 10000
    if total > 10000:
        bps = {r: (b * 10000) // total for r, b in bps.items()}
        total = sum(bps.values())
    if total < 10000:
        bps["platform"] = bps.get("platform", 0) + (10000 - total)

    raw = {r: price_cents * b / 10000 for r, b in bps.items()}
    floor = {r: int(v) for r, v in raw.items()}
    remainder = price_cents - sum(floor.values())
    order = sorted(bps.keys(), key=lambda r: raw[r] - floor[r], reverse=True)
    for i in range(remainder):
        floor[order[i % len(order)]] += 1

    assert sum(floor.values()) == price_cents, (floor, price_cents)
    return {r: c for r, c in floor.items() if c or r == "platform"}


def split_purchase(price_cents: int, article) -> Dict[str, int]:
    """Distribute the FULL price across roles by basis points, summing to
    EXACTLY price_cents (largest-remainder allocation). 'platform' is the
    platform's cut (the fee). This is the single source of truth for splitting
    a purchase — it replaces the earlier calculate_article_split /
    apply_split_rules pair, which rounded inconsistently and could allocate more
    than was collected.

    Semantics: split bps are fractions of PRICE. If the configured bps sum to
    less than 100%, the remainder goes to the platform; if they exceed 100%
    (a misconfiguration), they are normalized down. The result always sums to
    exactly price_cents, so no cent is created or lost.
    """
    price_cents = int(price_cents)
    if price_cents <= 0:
        return {"platform": 0}

    bps = {r: max(0, int(b)) for r, b in (get_article_splits(article) or {}).items()}
    total = sum(bps.values())
    if total == 0:
        bps, total = {"platform": 10000}, 10000
    if total > 10000:  # normalize an over-100% misconfiguration down
        bps = {r: (b * 10000) // total for r, b in bps.items()}
        total = sum(bps.values())
    if total < 10000:  # remainder (incl. rounding) accrues to the platform
        bps["platform"] = bps.get("platform", 0) + (10000 - total)

    raw = {r: price_cents * b / 10000 for r, b in bps.items()}
    floor = {r: int(v) for r, v in raw.items()}
    remainder = price_cents - sum(floor.values())
    order = sorted(bps.keys(), key=lambda r: raw[r] - floor[r], reverse=True)
    for i in range(remainder):
        floor[order[i % len(order)]] += 1

    assert sum(floor.values()) == price_cents, (floor, price_cents)
    return floor
