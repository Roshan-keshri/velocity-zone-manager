import os
import json
from datetime import timedelta
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Enum, text
from geoalchemy2 import Geometry

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "postgresql://velocity_user:velocity_pass@localhost:5432/velocity")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "jwt-supersecret")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=1)

db = SQLAlchemy(app)
jwt = JWTManager(app)

PROPERTY_TYPES = ("Golf Course", "Airport", "Corporate Campus", "Other")
ZONE_TYPES = ("Fairway", "Rough", "Perimeter", "Exclusion")
ZONE_STATUS = ("Active", "Inactive")


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class Property(db.Model):
    __tablename__ = "properties"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(Enum(*PROPERTY_TYPES, name="property_type"), nullable=False)
    total_acreage = db.Column(db.Float, nullable=False)
    notes = db.Column(db.Text, nullable=True)


class Zone(db.Model):
    __tablename__ = "zones"
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    zone_type = db.Column(Enum(*ZONE_TYPES, name="zone_type"), nullable=False)
    mower_count = db.Column(db.Integer, nullable=False)
    status = db.Column(Enum(*ZONE_STATUS, name="zone_status"), nullable=False, default="Active")
    geometry = db.Column(Geometry(geometry_type="POLYGON", srid=4326), nullable=False)


def validate_mower_count(mower_count):
    if mower_count is None or int(mower_count) <= 0:
        return "A zone must have at least one assigned mower."
    return None


def serialize_property(p: Property):
    return {
        "id": p.id,
        "name": p.name,
        "type": p.type,
        "total_acreage": p.total_acreage,
        "notes": p.notes,
    }


def serialize_zone(z: Zone):
    row = db.session.execute(
        text("""
            SELECT
              ST_AsGeoJSON(geometry) AS geojson,
              (ST_Area(geometry::geography) / 4046.8564224) AS acreage
            FROM zones
            WHERE id = :id
        """),
        {"id": z.id},
    ).mappings().first()

    geometry = json.loads(row["geojson"])
    acreage = float(row["acreage"] or 0)
    understaffed = acreage > (z.mower_count * 2)

    return {
        "id": z.id,
        "property_id": z.property_id,
        "name": z.name,
        "zone_type": z.zone_type,
        "mower_count": z.mower_count,
        "status": z.status,
        "geometry": geometry,
        "acreage": round(acreage, 3),
        "understaffed": understaffed,
    }


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


# ---------------- Auth ----------------
@app.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400

    user = User(email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User created"}), 201


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token}), 200


# ---------------- Properties ----------------
@app.route("/properties", methods=["GET"])
@jwt_required()
def list_properties():
    q = request.args.get("q", "").strip()
    ptype = request.args.get("type", "").strip()

    query = Property.query
    if q:
        query = query.filter(Property.name.ilike(f"%{q}%"))
    if ptype:
        query = query.filter(Property.type == ptype)

    properties = query.order_by(Property.id.desc()).all()
    return jsonify([serialize_property(p) for p in properties]), 200


@app.route("/properties", methods=["POST"])
@jwt_required()
def create_property():
    data = request.get_json() or {}
    p = Property(
        name=data["name"],
        type=data["type"],
        total_acreage=float(data["total_acreage"]),
        notes=data.get("notes"),
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(serialize_property(p)), 201


@app.route("/properties/<int:property_id>", methods=["GET"])
@jwt_required()
def get_property(property_id):
    p = Property.query.get_or_404(property_id)
    return jsonify(serialize_property(p)), 200


@app.route("/properties/<int:property_id>", methods=["PUT"])
@jwt_required()
def update_property(property_id):
    p = Property.query.get_or_404(property_id)
    data = request.get_json() or {}

    p.name = data.get("name", p.name)
    p.type = data.get("type", p.type)
    p.total_acreage = float(data.get("total_acreage", p.total_acreage))
    p.notes = data.get("notes", p.notes)

    db.session.commit()
    return jsonify(serialize_property(p)), 200


@app.route("/properties/<int:property_id>", methods=["DELETE"])
@jwt_required()
def delete_property(property_id):
    p = Property.query.get_or_404(property_id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ---------------- Zones ----------------
@app.route("/properties/<int:property_id>/zones", methods=["GET"])
@jwt_required()
def list_zones(property_id):
    Property.query.get_or_404(property_id)
    zones = Zone.query.filter_by(property_id=property_id).order_by(Zone.id.asc()).all()
    return jsonify([serialize_zone(z) for z in zones]), 200


@app.route("/properties/<int:property_id>/zones", methods=["POST"])
@jwt_required()
def create_zone(property_id):
    Property.query.get_or_404(property_id)
    data = request.get_json() or {}

    err = validate_mower_count(data.get("mower_count"))
    if err:
        return jsonify({"error": err}), 400

    geometry = data.get("geometry")
    if not geometry or geometry.get("type") != "Polygon":
        return jsonify({"error": "Zone geometry must be a Polygon."}), 400

    zone = Zone(
        property_id=property_id,
        name=data["name"],
        zone_type=data["zone_type"],
        mower_count=int(data["mower_count"]),
        status=data.get("status", "Active"),
        geometry=db.func.ST_SetSRID(db.func.ST_GeomFromGeoJSON(json.dumps(geometry)), 4326),
    )
    db.session.add(zone)
    db.session.commit()
    return jsonify(serialize_zone(zone)), 201


@app.route("/properties/<int:property_id>/zones/<int:zone_id>", methods=["PUT"])
@jwt_required()
def update_zone(property_id, zone_id):
    zone = Zone.query.filter_by(id=zone_id, property_id=property_id).first_or_404()
    data = request.get_json() or {}

    mower_count = data.get("mower_count", zone.mower_count)
    err = validate_mower_count(mower_count)
    if err:
        return jsonify({"error": err}), 400

    zone.name = data.get("name", zone.name)
    zone.zone_type = data.get("zone_type", zone.zone_type)
    zone.mower_count = int(mower_count)
    zone.status = data.get("status", zone.status)

    if "geometry" in data:
        geometry = data["geometry"]
        if geometry.get("type") != "Polygon":
            return jsonify({"error": "Zone geometry must be a Polygon."}), 400
        zone.geometry = db.func.ST_SetSRID(db.func.ST_GeomFromGeoJSON(json.dumps(geometry)), 4326)

    db.session.commit()
    return jsonify(serialize_zone(zone)), 200


@app.route("/properties/<int:property_id>/zones/<int:zone_id>", methods=["DELETE"])
@jwt_required()
def delete_zone(property_id, zone_id):
    zone = Zone.query.filter_by(id=zone_id, property_id=property_id).first_or_404()
    db.session.delete(zone)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


@app.route("/properties/<int:property_id>/zones/summary", methods=["GET"])
@jwt_required()
def zones_summary(property_id):
    Property.query.get_or_404(property_id)

    rows = db.session.execute(
        text("""
            SELECT
              id,
              mower_count,
              (ST_Area(geometry::geography) / 4046.8564224) AS acreage
            FROM zones
            WHERE property_id = :property_id
        """),
        {"property_id": property_id},
    ).mappings().all()

    total_zones = len(rows)
    total_acreage = sum(float(r["acreage"] or 0) for r in rows)
    total_mowers_assigned = sum(int(r["mower_count"]) for r in rows)
    understaffed_zones = sum(1 for r in rows if float(r["acreage"] or 0) > int(r["mower_count"]) * 2)

    return jsonify({
        "total_zones": total_zones,
        "total_acreage": round(total_acreage, 3),
        "total_mowers_assigned": total_mowers_assigned,
        "understaffed_zones": understaffed_zones
    }), 200


@app.route("/properties/<int:property_id>/zones/export", methods=["GET"])
@jwt_required()
def export_zones_geojson(property_id):
    Property.query.get_or_404(property_id)
    zones = Zone.query.filter_by(property_id=property_id).all()

    features = []
    for z in zones:
        s = serialize_zone(z)
        features.append({
            "type": "Feature",
            "geometry": s["geometry"],
            "properties": {
                "id": s["id"],
                "name": s["name"],
                "zone_type": s["zone_type"],
                "mower_count": s["mower_count"],
                "status": s["status"]
            }
        })

    return jsonify({"type": "FeatureCollection", "features": features}), 200


@app.route("/properties/<int:property_id>/zones/import", methods=["POST"])
@jwt_required()
def import_zones_geojson(property_id):
    Property.query.get_or_404(property_id)
    data = request.get_json() or {}

    if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        return jsonify({"error": "Invalid GeoJSON: expected FeatureCollection."}), 400

    created = []
    for feature in data["features"]:
        geometry = feature.get("geometry")
        if not geometry or geometry.get("type") != "Polygon":
            return jsonify({"error": "Invalid GeoJSON: only Polygon geometries are allowed."}), 400

        props = feature.get("properties", {})
        mower_count = int(props.get("mower_count", 1))

        err = validate_mower_count(mower_count)
        if err:
            return jsonify({"error": err}), 400

        zone = Zone(
            property_id=property_id,
            name=props.get("name", "Imported Zone"),
            zone_type=props.get("zone_type", "Fairway"),
            mower_count=mower_count,
            status=props.get("status", "Active"),
            geometry=db.func.ST_SetSRID(db.func.ST_GeomFromGeoJSON(json.dumps(geometry)), 4326),
        )
        db.session.add(zone)
        created.append(zone)

    db.session.commit()
    return jsonify([serialize_zone(z) for z in created]), 201


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)