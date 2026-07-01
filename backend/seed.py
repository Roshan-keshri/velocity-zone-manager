import json
from app import app, db, Property, Zone

def seed():
    with app.app_context():
        if Property.query.count() > 0:
            print("Seed already exists")
            return

        prop = Property(
            name="Bengaluru Golf Club",
            type="Golf Course",
            total_acreage=120.0,
            notes="Demo property with 3 pre-drawn zones"
        )
        db.session.add(prop)
        db.session.commit()

        zones = [
            {
                "name": "Fairway North",
                "zone_type": "Fairway",
                "mower_count": 2,
                "status": "Active",
                "geometry": {"type":"Polygon","coordinates":[[[77.58,12.97],[77.585,12.97],[77.585,12.975],[77.58,12.975],[77.58,12.97]]]}
            },
            {
                "name": "Rough East",
                "zone_type": "Rough",
                "mower_count": 1,
                "status": "Active",
                "geometry": {"type":"Polygon","coordinates":[[[77.586,12.97],[77.59,12.97],[77.59,12.974],[77.586,12.974],[77.586,12.97]]]}
            },
            {
                "name": "Perimeter South",
                "zone_type": "Perimeter",
                "mower_count": 1,
                "status": "Inactive",
                "geometry": {"type":"Polygon","coordinates":[[[77.58,12.965],[77.59,12.965],[77.59,12.968],[77.58,12.968],[77.58,12.965]]]}
            }
        ]

        for z in zones:
            db.session.add(Zone(
                property_id=prop.id,
                name=z["name"],
                zone_type=z["zone_type"],
                mower_count=z["mower_count"],
                status=z["status"],
                geometry=db.func.ST_SetSRID(db.func.ST_GeomFromGeoJSON(json.dumps(z["geometry"])), 4326)
            ))

        db.session.commit()
        print("Seeded successfully")

if __name__ == "__main__":
    seed()