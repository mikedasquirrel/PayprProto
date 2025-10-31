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
    
    # Default splits based on license type
    if article.license_type == "independent":
        # Independent author: 90% author, 10% platform
        return {"author": 9000, "platform": 1000}
    
    elif article.license_type == "revenue_share":
        # Revenue share: default 60% author, 30% publisher, 10% platform
        # Can be overridden by publisher
        if article.publisher_id:
            from models import Publisher
            pub = Publisher.query.get(article.publisher_id)
            if pub and pub.default_author_split_bps:
                author_bps = pub.default_author_split_bps
                platform_bps = 1000  # Always 10% platform
                publisher_bps = 10000 - author_bps - platform_bps
                return {
                    "author": author_bps,
                    "publisher": publisher_bps,
                    "platform": platform_bps
                }
        return {"author": 6000, "publisher": 3000, "platform": 1000}
    
    elif article.license_type == "buyout":
        # Buyout: 90% publisher, 10% platform (author already paid)
        return {"publisher": 9000, "platform": 1000}
    
    else:
        # Default: 90% publisher, 10% platform
        return {"publisher": 9000, "platform": 1000}


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
