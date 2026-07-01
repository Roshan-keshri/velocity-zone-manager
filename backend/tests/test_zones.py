from app import Property, User, Zone, create_app, db
from werkzeug.security import generate_password_hash


def _auth_header(client):
    response = client.post(
        "/auth/login",
        json={"email": "tester@example.com", "password": "password123"},
    )
    token = response.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_list_zones_returns_expected_shape():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        }
    )

    with app.app_context():
        db.create_all()

        user = User(
            email="tester@example.com",
            password_hash=generate_password_hash("password123"),
        )
        prop = Property(
            name="Test Property",
            address="1 Test Way",
            latitude=10.0,
            longitude=20.0,
        )
        db.session.add_all([user, prop])
        db.session.flush()

        zone = Zone(
            property_id=prop.id,
            name="Slow Zone",
            speed_limit=15,
            boundary=[[10.0, 20.0], [10.1, 20.1], [9.9, 20.2]],
        )
        db.session.add(zone)
        db.session.commit()

    client = app.test_client()
    headers = _auth_header(client)

    response = client.get(f"/properties/{prop.id}/zones", headers=headers)

    assert response.status_code == 200
    payload = response.get_json()
    assert isinstance(payload, list)
    assert payload[0]["name"] == "Slow Zone"
    assert payload[0]["speed_limit"] == 15
    assert isinstance(payload[0]["boundary"], list)
