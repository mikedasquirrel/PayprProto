from app import create_app


def test_showcase(client):
    rv = client.get('/showcase')
    assert rv.status_code == 200


def test_sitemap_and_robots(client):
    rv = client.get('/robots.txt')
    assert rv.status_code == 200
    assert b"Sitemap:" in rv.data
    rv2 = client.get('/sitemap.xml')
    assert rv2.status_code == 200
    assert b"urlset" in rv2.data


def test_bookmarklet(client):
    rv = client.get('/bookmarklet')
    assert rv.status_code == 200


def test_api_publishers(client):
    rv = client.get('/api/publishers?offset=0&limit=5')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'items' in data

