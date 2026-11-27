"""Measure the latency of one query: retrieval only and the full chat workflow.

Usage (stack running): python demo-inputs/time_query.py docs/fixtures/northstar_store/policies
"""

import json
import os
import sys
import time
import urllib.request
import uuid
from pathlib import Path

BASE = "http://localhost:8000/api/v1"
POLICIES = sys.argv[1]
Q = "How many days do I have to return an item?"
RUNS = 5


def call(method, path, body=None, token=None, raw=None, ctype="application/json"):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", ctype)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=120) as r:
        out = json.loads(r.read() or b"null")
    return out, (time.perf_counter() - t0) * 1000


tag = uuid.uuid4().hex[:8]
auth, _ = call("POST", "/auth/register", {
    "organization_name": f"Timing Test {tag}", "organization_slug": f"timing-{tag}",
    "email": f"timing-{tag}@example.com", "display_name": "Timing Test",
    "password": "TimingTest-Pass-123!"})
tok = auth["access_token"]

for name in os.listdir(POLICIES):
    content = Path(POLICIES, name).read_bytes()
    b = "----b" + tag
    fname = name.replace(".md", ".txt")
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{fname}\"\r\n"
            f"Content-Type: text/plain\r\n\r\n").encode() + content + f"\r\n--{b}--\r\n".encode()
    _, ms = call("POST", "/knowledge/documents", raw=body, token=tok, ctype=f"multipart/form-data; boundary={b}")
    print(f"upload {fname}: {ms:.0f} ms")


def stats(label, xs):
    xs = sorted(xs)
    print(f"{label}: min {xs[0]:.0f} ms | median {xs[len(xs)//2]:.0f} ms | max {xs[-1]:.0f} ms | avg {sum(xs)/len(xs):.0f} ms")


ret = [call("POST", "/knowledge/retrieve", {"query": Q, "top_k": 5}, tok)[1] for _ in range(RUNS)]
chat, last = [], None
for _ in range(RUNS):
    last, ms = call("POST", "/chat/preview", {"content": Q}, tok)
    chat.append(ms)

print(f"\nQuery: {Q}  ({RUNS} runs each)")
stats("Retrieval only (/knowledge/retrieve)", ret)
stats("Full chat query (/chat/preview)     ", chat)
print("\nLast chat response:", json.dumps(last, indent=1)[:1200])
