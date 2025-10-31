from flask import Blueprint, render_template, Response, session, redirect, url_for, flash
from sqlalchemy import func
import csv
import io
from datetime import datetime, timedelta

from extensions import db
from models import Publisher, Transaction, PublisherUser


bp = Blueprint("publisher", __name__)


@bp.route("/pub/console")
def console():
    if not session.get("is_admin"):
        # Allow publisher users scoped by email session (future: full auth)
        email = session.get('publisher_user')
        if not email:
            flash("Admin or publisher login required.", "error")
            return redirect(url_for("admin.admin_login"))
    since = datetime.utcnow() - timedelta(days=7)
    summaries = (
        db.session.query(
            Publisher.id,
            Publisher.name,
            func.count(Transaction.id),
            func.sum(Transaction.price_cents),
            func.sum(Transaction.fee_cents),
            func.sum(Transaction.net_cents),
        )
        .join(Transaction, Transaction.publisher_id == Publisher.id)
        .group_by(Publisher.id)
        .all()
    )
    summaries_7d = (
        db.session.query(
            Publisher.id,
            Publisher.name,
            func.count(Transaction.id),
            func.sum(Transaction.price_cents),
            func.sum(Transaction.fee_cents),
            func.sum(Transaction.net_cents),
        )
        .join(Transaction, Transaction.publisher_id == Publisher.id)
        .filter(Transaction.created_at >= since)
        .group_by(Publisher.id)
        .all()
    )

    # Build 14-day sparkline points per publisher
    since14 = datetime.utcnow() - timedelta(days=13)
    by_pub_date = (
        db.session.query(
            Transaction.publisher_id,
            func.date(Transaction.created_at),
            func.count(Transaction.id),
        )
        .filter(Transaction.created_at >= since14, Transaction.type == "debit")
        .group_by(Transaction.publisher_id, func.date(Transaction.created_at))
        .all()
    )
    # dates list (14 days, inclusive today)
    days = [ (since14 + timedelta(days=i)).date().isoformat() for i in range(14) ]
    series_map = {}
    for pub_id, d, cnt in by_pub_date:
        series_map.setdefault(pub_id, {})[str(d)] = int(cnt or 0)
    spark_points = {}
    width, height = 80, 18
    for row in summaries:
        pub_id = row[0]
        counts = [ series_map.get(pub_id, {}).get(day, 0) for day in days ]
        maxv = max(counts) if counts else 0
        if maxv == 0:
            spark_points[pub_id] = ""
            continue
        step = width / float(len(counts) - 1) if len(counts) > 1 else width
        pts = []
        for i, v in enumerate(counts):
            x = round(i * step, 2)
            y = round(height - (v / maxv) * height, 2)
            pts.append(f"{x},{y}")
        spark_points[pub_id] = " ".join(pts)

    return render_template(
        "publisher_console.html",
        summaries=summaries,
        summaries_7d=summaries_7d,
        spark_points=spark_points,
    )


@bp.route("/pub/export.csv")
def export_csv():
    if not session.get("is_admin"):
        flash("Admin login required.", "error")
        return redirect(url_for("admin.admin_login"))
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["publisher","reads","gross_cents","fee_cents","net_cents"]) 
    rows = (
        db.session.query(
            Publisher.name,
            func.count(Transaction.id),
            func.sum(Transaction.price_cents),
            func.sum(Transaction.fee_cents),
            func.sum(Transaction.net_cents),
        )
        .join(Transaction, Transaction.publisher_id == Publisher.id)
        .group_by(Publisher.id)
        .all()
    )
    for r in rows:
        writer.writerow([r[0], r[1] or 0, r[2] or 0, r[3] or 0, r[4] or 0])
    return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition":"attachment; filename=payouts.csv"})
