from app import create_app

def test_health(client):
    rv = client.get('/healthz')
    assert rv.status_code == 200


def test_newsstand(client):
    rv = client.get('/')
    assert rv.status_code == 200
