from flask import Blueprint, request, jsonify

from services.tokens import verify_jwt


bp = Blueprint("external", __name__)


@bp.route("/paypr/unlock")
def external_unlock():
    token = request.args.get("token")
    if not token:
        return jsonify({"error": "token required"}), 400
    claims = verify_jwt(token)
    if not claims:
        return jsonify({"valid": False}), 200
    return jsonify({"valid": True, "article_id": claims.get("article_id"), "publisher_id": claims.get("publisher_id")})
