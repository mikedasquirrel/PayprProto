from marshmallow import Schema, fields, validates, ValidationError


class PayRequestSchema(Schema):
    article_id = fields.Int(required=True)


class VerifyRequestSchema(Schema):
    access_token = fields.Str(required=True)
    article_id = fields.Int(required=True)


class RefundRequestSchema(Schema):
    transaction_id = fields.Int(required=True)


class TopupRequestSchema(Schema):
    amount_cents = fields.Int(required=True)

    @validates("amount_cents")
    def validate_amount(self, value: int, **kwargs):
        if value not in (500, 1000, 2500, 5000, 10000):
            raise ValidationError("Invalid amount")


class ContactRequestSchema(Schema):
    email = fields.Email(required=True)
    name = fields.Str(required=False, allow_none=True)
    message = fields.Str(required=True)
    website = fields.Str(required=False, allow_none=True)  # Honeypot


class LoginRequestSchema(Schema):
    email = fields.Email(required=True)


class MagicLinkRequestSchema(Schema):
    email = fields.Email(required=True)


class ThemeUpdateSchema(Schema):
    color_ink = fields.Str(required=False)
    color_ash = fields.Str(required=False)
    color_smoke = fields.Str(required=False)
    color_paper = fields.Str(required=False)
    grad = fields.Str(required=False)
    font_body = fields.Str(required=False)
    font_headline = fields.Str(required=False)
    font_body_link = fields.Str(required=False)
    font_headline_link = fields.Str(required=False)
    base_font_px = fields.Int(required=False)
    radius_px = fields.Int(required=False)
    logo_text = fields.Str(required=False)
    favicon_url = fields.Str(required=False)
    watermark_css = fields.Str(required=False)
    default_kiosk_hero_url = fields.Str(required=False)


class SiteUpdateSchema(Schema):
    nav_newsstand = fields.Bool(required=False)
    nav_walkthrough = fields.Bool(required=False)
    nav_publishers = fields.Bool(required=False)
    nav_platform = fields.Bool(required=False)
    nav_guide = fields.Bool(required=False)
    nav_showcase = fields.Bool(required=False)
    nav_bookmarklet = fields.Bool(required=False)
    nav_presskit = fields.Bool(required=False)
    nav_case = fields.Bool(required=False)
    nav_wallet = fields.Bool(required=False)
    nav_history = fields.Bool(required=False)
    nav_login = fields.Bool(required=False)
    nav_order_csv = fields.Str(required=False)
    site_layout = fields.Str(required=False)
    no_gradients = fields.Bool(required=False)


class SplitRulesUpdateSchema(Schema):
    rules = fields.List(fields.Dict(), required=True)
