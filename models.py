from __future__ import annotations

from datetime import datetime
from typing import Optional

from flask_login import UserMixin
from sqlalchemy import Index, UniqueConstraint

from extensions import db, login_manager


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    wallet_cents = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    transactions = db.relationship("Transaction", backref="user", lazy=True)

    def get_id(self) -> str:
        return str(self.id)


@login_manager.user_loader
def load_user(user_id: str) -> Optional[User]:
    if not user_id:
        return None
    return User.query.get(int(user_id))


class Publisher(db.Model):
    __tablename__ = "publishers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), nullable=False, unique=True, index=True)
    logo_url = db.Column(db.String(500))
    hero_url = db.Column(db.String(500))
    default_price_cents = db.Column(db.Integer, nullable=False, default=25)
    domain = db.Column(db.String(255))
    # New: categorization and visual accent for racks/filters
    category = db.Column(db.String(50), index=True)
    accent_color = db.Column(db.String(16))
    # New: layout style hint for publisher pages (e.g., newspaper, magazine, literary, poetry)
    layout_style = db.Column(db.String(32), index=True)
    # New: short strapline for hero
    strapline = db.Column(db.String(300))
    
    # Author marketplace settings
    accepts_submissions = db.Column(db.Boolean, default=True)
    default_author_split_bps = db.Column(db.Integer, default=6000)  # 60% to author by default

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    articles = db.relationship("Article", backref="publisher", lazy=True)


class Article(db.Model):
    __tablename__ = "articles"

    id = db.Column(db.Integer, primary_key=True)
    publisher_id = db.Column(
        db.Integer, db.ForeignKey("publishers.id"), nullable=True, index=True
    )
    author_id = db.Column(db.Integer, db.ForeignKey("author_profiles.id"), nullable=True, index=True)
    slug = db.Column(db.String(255), nullable=False, index=True)
    title = db.Column(db.String(300), nullable=False)
    dek = db.Column(db.String(600))
    author = db.Column(db.String(200))  # Author name string (legacy, kept for backward compat)
    media_type = db.Column(db.String(50), default="html", nullable=False)

    price_cents = db.Column(db.Integer)
    cover_url = db.Column(db.String(500))

    body_html = db.Column(db.Text, nullable=False)
    body_preview = db.Column(db.Text)
    
    # Content licensing and splits
    license_type = db.Column(db.String(50), default="independent")  # independent, revenue_share, buyout
    custom_splits = db.Column(db.Text)  # JSON: custom revenue split configuration
    status = db.Column(db.String(20), default="published")  # draft, pending, published, archived

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("publisher_id", "slug", name="uq_article_pub_slug"),
        Index("ix_articles_created", "created_at"),
        Index("ix_articles_author", "author_id"),
        Index("ix_articles_status", "status"),
    )


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    # Nullable: top-ups, admin adjustments and some refunds have no article/publisher.
    article_id = db.Column(db.Integer, db.ForeignKey("articles.id"), nullable=True, index=True)
    publisher_id = db.Column(db.Integer, db.ForeignKey("publishers.id"), nullable=True, index=True)

    price_cents = db.Column(db.Integer, nullable=False)
    fee_cents = db.Column(db.Integer, nullable=False)
    net_cents = db.Column(db.Integer, nullable=False)
    type = db.Column(db.String(30), nullable=False, default="debit")

    ip_address = db.Column(db.String(64))
    user_agent = db.Column(db.String(300))

    # Optional JSON of net revenue split breakdown per role (for reporting)
    split_breakdown_json = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    article = db.relationship("Article", lazy=True)
    publisher = db.relationship("Publisher", lazy=True)

    __table_args__ = (
        Index("ix_tx_user_created", "user_id", "created_at"),
        Index("ix_tx_publisher_created", "publisher_id", "created_at"),
    )


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    event_name = db.Column(db.String(100), nullable=False, index=True)
    article_id = db.Column(db.Integer, db.ForeignKey("articles.id"))
    publisher_id = db.Column(db.Integer, db.ForeignKey("publishers.id"))
    metadata_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = db.relationship("User", lazy=True)
    article = db.relationship("Article", lazy=True)
    publisher = db.relationship("Publisher", lazy=True)

    __table_args__ = (
        Index("ix_events_event_name_created", "event_name", "created_at"),
    )


class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"

    id = db.Column(db.Integer, primary_key=True)
    token_hash = db.Column(db.String(128), nullable=False, unique=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ContactMessage(db.Model):
    __tablename__ = "contact_messages"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    name = db.Column(db.String(200))
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)


class ThemeSettings(db.Model):
    __tablename__ = "theme_settings"

    id = db.Column(db.Integer, primary_key=True)
    # Colors
    color_ink = db.Column(db.String(16), default="#0F1115", nullable=False)
    color_ash = db.Column(db.String(16), default="#1A1D24", nullable=False)
    color_smoke = db.Column(db.String(16), default="#8E93A4", nullable=False)
    color_paper = db.Column(db.String(16), default="#F5F7FB", nullable=False)
    grad = db.Column(db.String(300), default="linear-gradient(135deg,#FA3D7F 0%,#FF7A3A 35%,#FFC43A 65%,#A05BFF 100%)", nullable=False)

    # Typography & sizing
    font_body = db.Column(db.String(200), default="Inter, system-ui, -apple-system, Segoe UI", nullable=False)
    font_headline = db.Column(db.String(200), default="Inter, system-ui, -apple-system, Segoe UI", nullable=False)
    font_body_link = db.Column(db.String(500))
    font_headline_link = db.Column(db.String(500))
    base_font_px = db.Column(db.Integer, default=16, nullable=False)
    radius_px = db.Column(db.Integer, default=14, nullable=False)

    # Assets / images
    logo_text = db.Column(db.String(64), default="paypr", nullable=False)
    favicon_url = db.Column(db.String(500))
    watermark_css = db.Column(db.Text, default="radial-gradient(1200px 800px at 80% -10%, rgba(250,61,127,.08), transparent 60%), radial-gradient(900px 600px at 20% 110%, rgba(160,91,255,.08), transparent 60%)")
    default_kiosk_hero_url = db.Column(db.String(500))

    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AdminAccount(db.Model):
    __tablename__ = "admin_accounts"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class MagicLogin(db.Model):
    __tablename__ = "magic_logins"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    token = db.Column(db.String(128), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class PublisherUser(db.Model):
    __tablename__ = "publisher_users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    publisher_id = db.Column(db.Integer, db.ForeignKey("publishers.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    publisher = db.relationship("Publisher", lazy=True)


class SiteSettings(db.Model):
    __tablename__ = "site_settings"

    id = db.Column(db.Integer, primary_key=True)
    # Nav toggles
    nav_newsstand = db.Column(db.Boolean, default=True, nullable=False)
    nav_walkthrough = db.Column(db.Boolean, default=True, nullable=False)
    nav_publishers = db.Column(db.Boolean, default=True, nullable=False)
    nav_platform = db.Column(db.Boolean, default=False, nullable=False)
    nav_guide = db.Column(db.Boolean, default=False, nullable=False)
    nav_showcase = db.Column(db.Boolean, default=True, nullable=False)
    nav_bookmarklet = db.Column(db.Boolean, default=True, nullable=False)
    nav_presskit = db.Column(db.Boolean, default=True, nullable=False)
    nav_case = db.Column(db.Boolean, default=True, nullable=False)
    nav_wallet = db.Column(db.Boolean, default=True, nullable=False)
    nav_history = db.Column(db.Boolean, default=True, nullable=False)
    nav_login = db.Column(db.Boolean, default=True, nullable=False)
    # Order as CSV of keys
    nav_order_csv = db.Column(db.String(500), default="newsstand,publishers,showcase,partner,admin,wallet,history,login", nullable=False)
    # Layout and style flags
    site_layout = db.Column(db.String(32), default="classic", nullable=False)
    no_gradients = db.Column(db.Boolean, default=False, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SplitRule(db.Model):
    __tablename__ = "split_rules"

    id = db.Column(db.Integer, primary_key=True)
    publisher_id = db.Column(db.Integer, db.ForeignKey("publishers.id"), nullable=False, index=True)
    role = db.Column(db.String(50), nullable=False)  # e.g., author, editor, publisher, partner
    percent_bps = db.Column(db.Integer, nullable=False)  # 0..10000 basis points
    recipient_label = db.Column(db.String(200))  # display label for recipient/role
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    publisher = db.relationship("Publisher", lazy=True)


class AuthorProfile(db.Model):
    """Author profile for content creators."""
    __tablename__ = "author_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True, index=True)
    display_name = db.Column(db.String(200), nullable=False)
    bio = db.Column(db.Text)
    photo_url = db.Column(db.String(500))
    website_url = db.Column(db.String(500))
    twitter_handle = db.Column(db.String(100))
    
    # Default pricing for new content
    default_price_cents = db.Column(db.Integer, default=99)
    
    # Author settings
    accepts_publisher_requests = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship("User", backref="author_profile", lazy=True)
    articles = db.relationship("Article", backref="author_profile", lazy=True, foreign_keys="Article.author_id")


class ContentLicense(db.Model):
    """Track licensing agreements between authors and publishers."""
    __tablename__ = "content_licenses"

    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey("articles.id"), nullable=False, index=True)
    author_id = db.Column(db.Integer, db.ForeignKey("author_profiles.id"), nullable=False, index=True)
    publisher_id = db.Column(db.Integer, db.ForeignKey("publishers.id"), nullable=True, index=True)
    
    # License details
    license_type = db.Column(db.String(50), nullable=False)  # independent, revenue_share, buyout, exclusive
    split_config_json = db.Column(db.Text)  # Custom split configuration as JSON
    
    # Buyout details (if applicable)
    buyout_amount_cents = db.Column(db.Integer)  # One-time payment to author
    
    # Status and dates
    status = db.Column(db.String(20), default="active")  # active, expired, terminated
    starts_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)  # Optional expiration
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    article = db.relationship("Article", lazy=True)
    author = db.relationship("AuthorProfile", lazy=True)
    publisher = db.relationship("Publisher", lazy=True)


class ShowcaseSite(db.Model):
    """Custom branded showcase sites (like smerconish.com)."""
    __tablename__ = "showcase_sites"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    tagline = db.Column(db.String(300))
    
    # Owner (can be author or publisher)
    owner_type = db.Column(db.String(20))  # 'author' or 'publisher'
    owner_id = db.Column(db.Integer)  # ID of author_profile or publisher
    
    # Branding
    theme_css = db.Column(db.Text)  # Custom CSS overrides
    primary_color = db.Column(db.String(16), default="#1A1D24")
    accent_color = db.Column(db.String(16), default="#FA3D7F")
    logo_url = db.Column(db.String(500))
    hero_image_url = db.Column(db.String(500))
    favicon_url = db.Column(db.String(500))
    
    # Content
    about_text = db.Column(db.Text)
    
    # Settings
    is_active = db.Column(db.Boolean, default=True)
    show_paypr_branding = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_showcase_owner", "owner_type", "owner_id"),
    )


class AuthorEarnings(db.Model):
    """Track author earnings from their content."""
    __tablename__ = "author_earnings"

    id = db.Column(db.Integer, primary_key=True)
    author_id = db.Column(db.Integer, db.ForeignKey("author_profiles.id"), nullable=False, index=True)
    article_id = db.Column(db.Integer, db.ForeignKey("articles.id"), nullable=True, index=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey("transactions.id"), nullable=False, index=True)
    
    # Earnings details
    amount_cents = db.Column(db.Integer, nullable=False)  # Author's share
    percentage = db.Column(db.Integer)  # Percentage of sale (basis points)
    
    # Related entities
    publisher_id = db.Column(db.Integer, db.ForeignKey("publishers.id"), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    author = db.relationship("AuthorProfile", lazy=True)
    article = db.relationship("Article", lazy=True)
    transaction = db.relationship("Transaction", lazy=True)
    publisher = db.relationship("Publisher", lazy=True)


class LedgerEntry(db.Model):
    """Append-only money journal. Balance of any account = SUM(delta_cents).
    Written in the same DB transaction as every balance change, so the cached
    User.wallet_cents is always reconcilable and payees have real balances."""
    __tablename__ = "ledger_entries"

    id = db.Column(db.Integer, primary_key=True)
    account = db.Column(db.String(64), nullable=False, index=True)  # user:1 | author:2 | publisher:3 | platform
    delta_cents = db.Column(db.Integer, nullable=False)  # signed
    reason = db.Column(db.String(40), nullable=False)  # purchase | split_credit | refund | refund_reversal | topup | welcome | admin | payout
    ref = db.Column(db.String(128), index=True)  # e.g. txn:123, stripe session id, idempotency key
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        Index("ix_ledger_account_created", "account", "created_at"),
    )


class IdempotentOp(db.Model):
    """A completed side-effecting operation, keyed so a retry returns the same
    result instead of repeating the effect (double top-up, double charge)."""
    __tablename__ = "idempotent_ops"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(128), nullable=False, unique=True, index=True)
    response_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


# ======================================================================
# Developer platform — the API side of paypr as a generalizable rail.
#
# A DeveloperApp is any external project (Resonance, do-ai-know-you, a tool,
# a model endpoint) that wants to charge on the rail. It authenticates
# machine-to-machine with an ApiKey (never a human cookie), sells "pieces"
# (generalized units of value — an article, a finding, one compute run), and
# meters charges against readers who have granted it a spending allowance.
# Money it earns accrues to its own Publisher ledger account, exactly like a
# first-party publisher — so the whole existing ledger/split/refund core is
# reused, not duplicated.
# ======================================================================

class DeveloperApp(db.Model):
    """An external project registered to charge on the paypr rail."""
    __tablename__ = "developer_apps"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), nullable=False, unique=True, index=True)
    # The paypr reader who owns/administers this app (creates keys, sees usage).
    owner_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    # The creator account money earned by this app accrues to (ledger publisher:<id>).
    publisher_id = db.Column(db.Integer, db.ForeignKey("publishers.id"), nullable=True, index=True)

    description = db.Column(db.Text)
    website_url = db.Column(db.String(500))
    # Default platform-relative split for metered charges with no per-call split,
    # as a JSON bps map, e.g. {"publisher": 9000, "platform": 1000}. Optional.
    default_split_json = db.Column(db.Text)

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    owner = db.relationship("User", lazy=True)
    publisher = db.relationship("Publisher", lazy=True)
    keys = db.relationship("ApiKey", backref="app", lazy=True)


class ApiKey(db.Model):
    """A server-to-server credential for a DeveloperApp. Only the SHA-256 hash of
    the secret is stored — the plaintext ``sk_…`` is shown once at creation and
    never again. ``prefix``/``last4`` are safe-to-display fragments for the
    console. A key is valid iff ``revoked_at IS NULL``."""
    __tablename__ = "api_keys"

    id = db.Column(db.Integer, primary_key=True)
    app_id = db.Column(db.Integer, db.ForeignKey("developer_apps.id"), nullable=False, index=True)
    label = db.Column(db.String(120))  # human note, e.g. "production", "ci"
    mode = db.Column(db.String(8), default="test", nullable=False)  # test | live
    prefix = db.Column(db.String(32), index=True)  # e.g. "sk_test_ab12cd" (display only)
    last4 = db.Column(db.String(8))
    key_hash = db.Column(db.String(128), nullable=False, unique=True, index=True)
    scopes = db.Column(db.String(300), default="pieces:read,pieces:write,charges:write,events:read")

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = db.Column(db.DateTime, nullable=True)
    revoked_at = db.Column(db.DateTime, nullable=True)

    @property
    def active(self) -> bool:
        return self.revoked_at is None


class AppReaderGrant(db.Model):
    """A reader's explicit authorization for a DeveloperApp to meter charges
    against their wallet, up to a per-day cap. This is the honest 'BYO-wallet
    bridge': the app can never touch a wallet the reader hasn't opted into, and
    the cap bounds the blast radius. One active grant per (app, reader)."""
    __tablename__ = "app_reader_grants"

    id = db.Column(db.Integer, primary_key=True)
    app_id = db.Column(db.Integer, db.ForeignKey("developer_apps.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    daily_cap_cents = db.Column(db.Integer, nullable=False, default=500)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = db.Column(db.DateTime, nullable=True)

    app = db.relationship("DeveloperApp", lazy=True)
    user = db.relationship("User", lazy=True)

    __table_args__ = (
        Index("ix_grant_app_user", "app_id", "user_id"),
    )
