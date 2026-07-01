import json
from app import app, db, Property, Zone


DEMO_PROPERTY_NAME = "Bengaluru Golf Club"


def seed():
    with app.app_context():
        # Ensure tables exist before seeding
        db.create_all()

        existing_property = Property.query.filter_by(name=DEMO_PROPERTY_NAME).first()
        if existing_property:
            # Ensure exactly 3 demo zones exist for this property (idempotent behavior)
            zone_count = Zone.query.filter_by(property_id=existing_property.id).count()
            if zone_count >= 3:
                print("Seed already exists")
                return
            prop = existing_property
        else:
            prop = Property(
                name=DEMO_PROPERTY_NAME,
                type="Golf Course",
                total_acreage=120.0,
                notes="Demo property with 3 pre-drawn zones"
            )
            db.session.add(prop)
            db.session.commit()

        demo_zones = [
            {
                "name": "Fairway North",
                "zone_type": "Fairway",
                "mower_count": 2,
                "status": "Active",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[77.58, 12.97], [77.585, 12.97], [77.585, 12.975], [77.58, 12.975], [77.58, 12.97]]]
                }
            },
            {
                "name": "Rough East",
                "zone_type": "Rough",
                "mower_count": 1,
                "status": "Active",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[77.586, 12.97], [77.59, 12.97], [77.59, 12.974], [77.586, 12.974], [77.586, 12.97]]]
                }
            },
            {
                "name": "Perimeter South",
                "zone_type": "Perimeter",
                "mower_count": 1,
                "status": "Inactive",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[77.58, 12.965], [77.59, 12.965], [77.59, 12.968], [77.58, 12.968], [77.58, 12.965]]]
                }
            }
        ]

        existing_zone_names = {
            z.name for z in Zone.query.filter_by(property_id=prop.id).all()
        }

        for z in demo_zones:
            if z["name"] in existing_zone_names:
                continue

            zone = Zone(
                property_id=prop.id,
                name=z["name"],
                zone_type=z["zone_type"],
                mower_count=z["mower_count"],
                status=z["status"],
                geometry=db.func.ST_SetSRID(
                    db.func.ST_GeomFromGeoJSON(json.dumps(z["geometry"])),
                    4326
                )
            )
            db.session.add(zone)

        db.session.commit()
        print("Seed completed (idempotent)")


if __name__ == "__main__":
    seed()