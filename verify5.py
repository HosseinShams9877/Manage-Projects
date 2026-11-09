"""Phase 5 verification — all 12 steps, executed in order against the seed DB.

Reads prisma/dev.db directly only to obtain a *foreign* notification id for
step 6 (ownership check); everything else goes through HTTP on port 3100.
"""
import json
import sqlite3
import urllib.request
import urllib.error
from http.cookiejar import CookieJar

BASE = "http://localhost:3100"
P1 = "demo-project-1"
P2 = "demo-project-2"
DB = "prisma/dev.db"
results = []


def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))


def req(opener, method, path, body=None, raw=False):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        r.add_header("Content-Type", "application/json")
    try:
        with opener.open(r) as resp:
            body_bytes = resp.read()
            if raw:
                return resp.status, body_bytes.decode("utf-8")
            return resp.status, json.loads(body_bytes.decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_bytes = e.read()
        if raw:
            return e.code, body_bytes.decode("utf-8")
        return e.code, json.loads(body_bytes.decode("utf-8"))


def login(email):
    op = client()
    op.open(urllib.request.Request(
        BASE + "/api/auth/login",
        data=json.dumps({"email": email, "password": "12345678"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST"))
    return op


def check(n, label, cond, detail=""):
    results.append((n, label, "PASS" if cond else "FAIL"))
    print(f"[{n:2d}] {label}: {'PASS' if cond else 'FAIL'} :: {detail}")


def err_msg(r):
    return r.get("error", {}).get("message", "")


def unread(opener):
    st, r = req(opener, "GET", "/api/notifications/unread-count")
    return st, r.get("data", {}).get("count")


def foreign_notification_id(not_of_email):
    """One notification id belonging to a different user (read straight from DB)."""
    con = sqlite3.connect(DB)
    row = con.execute(
        "SELECT n.id FROM Notification n JOIN User u ON u.id = n.userId "
        "WHERE u.email = ? LIMIT 1", (not_of_email,)).fetchone()
    con.close()
    return row[0] if row else None


admin = login("admin@example.com")
ali = login("ali@example.com")
niloofar = login("niloofar@example.com")

# ---------------------------------------- 1 — admin unread count is zero
st, count = unread(admin)
check(1, "admin unread-count", st == 200 and count == 0, f"HTTP={st} count={count}")

# ---------------------------------------- 2 — admin inbox is empty
st, r = req(admin, "GET", "/api/notifications")
notes = r.get("data", {}).get("notifications", [])
check(2, "admin notifications empty", st == 200 and len(notes) == 0,
      f"HTTP={st} count={len(notes)}")

# ---------------------------------------- 3 — ali has unread notifications
st, count = unread(ali)
check(3, "ali unread-count > 0", st == 200 and count is not None and count > 0,
      f"HTTP={st} count={count}")

# ---------------------------------------- 4 — ali inbox is ali's only, Persian
st, r = req(ali, "GET", "/api/notifications")
d = r.get("data", {})
notes = d.get("notifications", [])
# Stake the user id from the first row (every row must match it).
ali_id = notes[0].get("userId") if notes else None
has_unread = any(n.get("readAt") is None for n in notes)
persian = all(any(ch in n.get("message", "") for ch in "ابدرسحت") for n in notes) if notes else False
ok4 = (
    st == 200
    and len(notes) > 0
    and all(n.get("userId") == ali_id for n in notes)
    and has_unread
    and persian
    and d.get("total") == len(notes)
    and len(notes) == count  # nothing read yet → list length equals unread count
)
check(4, "ali notifications own+persian", ok4,
      f"HTTP={st} rows={len(notes)} userId={ali_id} total={d.get('total')}")

# ---------------------------------------- 5 — mark one of ali's own as read
first_unread = next((n for n in notes if n.get("readAt") is None), None)
st, r = req(ali, "POST", f"/api/notifications/{first_unread['id']}/read", {})
marked = r.get("data", {}).get("id") == first_unread["id"]
st2, count2 = unread(ali)
ok5 = st == 200 and marked and count2 == count - 1
check(5, "markRead own", ok5, f"HTTP={st} id={first_unread['id'][:8]}… {count}→{count2}")

# ---------------------------------------- 6 — marking another user's row is 404
foreign_id = foreign_notification_id("sara@example.com")
st, r = req(ali, "POST", f"/api/notifications/{foreign_id}/read", {})
expected6 = "اعلان مورد نظر یافت نشد."
st2, count2 = unread(ali)
ok6 = st == 404 and err_msg(r) == expected6 and count2 == count - 1
check(6, "markRead foreign 404", ok6,
      f"HTTP={st} foreign={str(foreign_id)[:8]}… msg={err_msg(r)!r} count={count2}")

# ---------------------------------------- 7 — mark all read clears the badge
st, r = req(ali, "PATCH", "/api/notifications", {})
marked_count = r.get("data", {}).get("count")
st2, count2 = unread(ali)
ok7 = st == 200 and marked_count >= 0 and count2 == 0
check(7, "markAllRead clears", ok7,
      f"HTTP={st} marked={marked_count} unread={count2}")

# ---------------------------------------- 8 — niloofar's inbox is empty
st, notes_r = req(niloofar, "GET", "/api/notifications")
st2, count = unread(niloofar)
nil_notes = notes_r.get("data", {}).get("notifications", [])
ok8 = st == 200 and st2 == 200 and len(nil_notes) == 0 and count == 0
check(8, "niloofar empty inbox", ok8, f"HTTP={st} rows={len(nil_notes)} count={count}")

# ---------------------------------------- 9 — /me dashboard SSR summary cards
st, html = req(ali, "GET", "/me", raw=True)
ok9 = (
    st == 200
    and "مجموع سهم من" in html
    and "مجموع دریافتی" in html
    and "مانده حساب من" in html
    and "۷۰٬۰۰۰٬۰۰۰" in html   # 700M Rial share = 70M Toman
    and "۱۰٬۰۰۰٬۰۰۰" in html   # 100M Rial paid = 10M Toman
    and "۶۰٬۰۰۰٬۰۰۰" in html   # 600M Rial remaining = 60M Toman
    and "داشبورد" in html
    and "اعلان‌های اخیر" in html
    and "پرداخت‌های اخیر" in html
)
check(9, "me dashboard SSR", ok9, f"HTTP={st} len={len(html)}")

# --------------------------------------- 10 — project detail shows ali only
st, html = req(ali, "GET", f"/me/projects/{P1}", raw=True)
st2, html2 = req(ali, "GET", f"/me/projects/{P2}", raw=True)
# React SSR inserts "<!-- -->" between adjacent text nodes (e.g. "۴۰٪");
# strip it so Persian-digit literals match what the user actually sees.
clean, clean2 = html.replace("<!-- -->", ""), html2.replace("<!-- -->", "")
ok10 = (
    st == 200
    and st2 == 200
    and "سهم من در این پروژه" in clean
    and "۴۰٪" in clean                                     # ali's share percent
    and "۴۰٬۰۰۰٬۰۰۰" in clean                              # ali's share amount (40M Toman)
    and "سارا" not in clean                                # never another employee's name
    and "سارا" not in clean2
    and "۱۰٪" not in clean                                 # never sara's 10% share
    and "۳۰٪" not in clean                                 # never maryam's 30% share
)
check(10, "me project detail isolated", ok10,
      f"HTTP={st}/{st2} len={len(html)}/{len(html2)}")

# ------------------------ 11 — unassigned/unknown project is a real 404
st, _ = req(ali, "GET", "/me/projects/does-not-exist-id", raw=True)
st2, _ = req(niloofar, "GET", f"/me/projects/{P1}", raw=True)  # niloofar is unassigned
ok11 = st == 404 and st2 == 404
check(11, "unassigned project 404", ok11, f"ali/unknown={st} niloofar/p1={st2}")

# ------------------------- 12 — /me/payments lists only ali's own payments
st, html = req(ali, "GET", "/me/payments", raw=True)
ok12 = (
    st == 200
    and "۱۰٬۰۰۰٬۰۰۰" in html     # ali's own 10M Toman payment
    and "۴٬۰۰۰٬۰۰۰" not in html  # sara's payment
    and "۶٬۰۰۰٬۰۰۰" not in html  # reza's payment
    and "۹٬۰۰۰٬۰۰۰" not in html  # maryam's payment
    and "پرداخت‌های من" in html
)
check(12, "me payments own only", ok12, f"HTTP={st} len={len(html)}")

# ------------------------------------------------------------------- summary
print("\n" + "=" * 60)
fails = [n for n, _, s in results if s == "FAIL"]
for n, label, s in results:
    print(f"  {s}  [{n:2d}] {label}")
print("=" * 60)
print(f"{len(results) - len(fails)}/{len(results)} passed")
if fails:
    print(f"FAILED: {fails}")
