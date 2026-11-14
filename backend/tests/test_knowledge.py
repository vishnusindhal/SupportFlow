def register(client, slug, email):
    return client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": slug,
            "organization_slug": slug,
            "email": email,
            "display_name": "Owner",
            "password": "correct horse battery",
        },
    ).json()


def headers(session):
    return {"Authorization": "Bearer " + session["access_token"]}


def test_txt_upload_chunks_retrieves_and_deletes(client):
    session = register(client, "company-a", "knowledge-a@example.com")
    auth = headers(session)
    upload = client.post(
        "/api/v1/knowledge/documents",
        headers=auth,
        files={"file": ("policy.txt", b"Returns are accepted within thirty days.", "text/plain")},
    )
    assert upload.status_code == 201
    document = upload.json()
    assert document["status"] == "ready"
    results = client.post(
        "/api/v1/knowledge/retrieve",
        headers=auth,
        json={"query": "How long do I have for returns?", "top_k": 5},
    )
    assert results.status_code == 200
    assert "thirty days" in results.json()[0]["content"]
    assert client.delete(f"/api/v1/knowledge/documents/{document['id']}", headers=auth).status_code == 204
    assert client.post(
        "/api/v1/knowledge/retrieve",
        headers=auth,
        json={"query": "returns"},
    ).json() == []


def test_knowledge_is_tenant_scoped(client):
    first = register(client, "company-a", "knowledge-b@example.com")
    first_auth = headers(first)
    client.post(
        "/api/v1/knowledge/documents",
        headers=first_auth,
        files={"file": ("private.txt", b"Company A secret policy.", "text/plain")},
    )
    second = register(client, "company-b", "knowledge-c@example.com")
    second_results = client.post(
        "/api/v1/knowledge/retrieve",
        headers=headers(second),
        json={"query": "secret policy"},
    )
    assert second_results.status_code == 200
    assert second_results.json() == []


def test_invalid_file_is_rejected(client):
    session = register(client, "company-c", "knowledge-d@example.com")
    response = client.post(
        "/api/v1/knowledge/documents",
        headers=headers(session),
        files={"file": ("script.exe", b"not allowed", "application/octet-stream")},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "unsupported_file_type"


def test_retrieval_prefers_relevant_chunk_in_long_document(client):
    session = register(client, "company-d", "knowledge-e@example.com")
    content = (
        " ".join(["unrelated background"] * 100)
        + " Eventopia is an event discovery platform for finding and publishing campus events. "
        + " ".join(["more unrelated background"] * 100)
    )
    response = client.post(
        "/api/v1/knowledge/documents",
        headers=headers(session),
        files={"file": ("resume.txt", content.encode(), "text/plain")},
    )
    assert response.status_code == 201
    results = client.post(
        "/api/v1/knowledge/retrieve",
        headers=headers(session),
        json={"query": "What is Eventopia?", "top_k": 1},
    )
    assert results.status_code == 200
    assert "event discovery platform" in results.json()[0]["content"]
    assert len(results.json()[0]["content"].split()) <= 45
