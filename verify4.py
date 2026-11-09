"""Phase 4 verification — all 14 steps, executed in order against the fresh seed."""
import json
import urllib.request
import urllib.error
from http.cookiejar import CookieJar

BASE = "http://localhost:3100"
P1 = "demo-project-1"
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


admin = login("admin@example.com")

# ---------------------------------------------------------------- 1 — balances
st, r = req(admin, "GET", "/api/employees/balances")
d = r.get("data", {})
rows = {e["userId"]: e for e in d.get("employees", [])}
by_email = {e["email"]: e for e in d.get("employees", [])}
ali, sara, niloofar = by_email["ali@example.com"], by_email["sara@example.com"], by_email["niloofar@example.com"]

# Ali and Maryam are on both projects, so their totals span project 1 and 2.
ok1 = st == 200
for email, share, paid, rem in [
    ("ali@example.com", 700_000_000, 100_000_000, 600_000_000),
    ("sara@example.com", 100_000_000, 40_000_000, 60_000_000),
    ("reza@example.com", 200_000_000, 60_000_000, 140_000_000),
    ("maryam@example.com", 500_000_000, 90_000_000, 410_000_000),
]:
    e = by_email.get(email)
    ok1 = ok1 and e and (
        int(e["totalShare"]) == share and int(e["totalPaid"]) == paid and int(e["totalRemaining"]) == rem
    )
ok1 = ok1 and niloofar and int(niloofar["totalRemaining"]) == 0
check(1, "admin balances", ok1, f"HTTP={st} employees={len(rows)}")

# ------------------------------------------------- 2 — one employee's balance
st, r = req(admin, "GET", f"/api/employees/{ali['userId']}/balance")
d = r.get("data", {})
proj = [p for p in d.get("projects", []) if p["projectId"] == P1]
p1 = proj[0] if proj else {}
ok2 = (
    st == 200
    and p1.get("sharePercent") == 40
    and int(p1.get("shareAmount", 0)) == 400_000_000
    and int(p1.get("paid", 0)) == 100_000_000
    and int(p1.get("remaining", 0)) == 300_000_000
    and p1.get("lastPaymentDate") == "2025-09-15"
    and d.get("name") == "علی رضایی"
)
check(2, "ali balance breakdown", ok2, f"HTTP={st} projects={len(d.get('projects', []))}")

# ------------------------------------- 3 — payment larger than the remainder
st, r = req(admin, "POST", "/api/employee-payments", {
    "projectId": P1, "userId": ali["userId"], "amount": "50000000", "jalaliDate": "2026-11-08", "note": "بیش از مانده",
})
# 50M Toman = 500M Rial > 300M Rial remaining → 400, message names the remainder.
expected3 = "مبلغ پرداختی بیشتر از مانده حساب کارمند در این پروژه (۳۰٬۰۰۰٬۰۰۰ تومان) است."
check(3, "exceeds remainder", st == 400 and err_msg(r) == expected3, f"HTTP={st} msg={err_msg(r)!r}")

# ------------------------------------------- 4 — valid payment, remainder drops
st, r = req(admin, "POST", "/api/employee-payments", {
    "projectId": P1, "userId": ali["userId"], "amount": "10000000", "jalaliDate": "2026-11-08", "note": "پرداخت موقت",
})
created = r.get("data", {})
new_id = created.get("id")
st2, r2 = req(admin, "GET", f"/api/employees/{ali['userId']}/balance")
after = [p for p in r2.get("data", {}).get("projects", []) if p["projectId"] == P1][0]
ok4 = st == 201 and int(created.get("amount", 0)) == 100_000_000 and int(after["remaining"]) == 200_000_000
check(4, "create payment", ok4, f"HTTP={st} id={new_id} remaining={after.get('remaining')}")

# ------------------------------------------- 5 — unassigned employee rejected
st, r = req(admin, "POST", "/api/employee-payments", {
    "projectId": P1, "userId": niloofar["userId"], "amount": "1000000", "jalaliDate": "2026-11-08", "note": "تخصاص ندارد",
})
expected5 = "این کارمند به این پروژه اختصاص داده نشده است."
check(5, "unassigned rejected", st == 400 and err_msg(r) == expected5, f"HTTP={st} msg={err_msg(r)!r}")

# ----------------------------------- 6 — patch above the new remainder rejected
st, r = req(admin, "PATCH", f"/api/employee-payments/{new_id}", {"amount": "40000000"})
# Excluding this row, 40M Toman = 400M Rial > 300M Rial (only the seed is paid).
expected6 = "مبلغ پرداختی بیشتر از مانده حساب کارمند در این پروژه (۳۰٬۰۰۰٬۰۰۰ تومان) است."
check(6, "patch exceeds rejected", st == 400 and err_msg(r) == expected6, f"HTTP={st} msg={err_msg(r)!r}")

# ----------------------------------- 7 — delete restores the remainder
st, r = req(admin, "DELETE", f"/api/employee-payments/{new_id}")
st2, r2 = req(admin, "GET", f"/api/employees/{ali['userId']}/balance")
after = [p for p in r2.get("data", {}).get("projects", []) if p["projectId"] == P1][0]
ok7 = st == 200 and r.get("data", {}).get("id") == new_id and int(after["remaining"]) == 300_000_000
check(7, "delete restores balance", ok7, f"HTTP={st} remaining={after.get('remaining')}")

# ------------------------------------------- 8 — notification to the employee
ali_sess = login("ali@example.com")
nil_sess = login("niloofar@example.com")

# Recreate the payment so a notification exists, then look for it.
st, r = req(admin, "POST", "/api/employee-payments", {
    "projectId": P1, "userId": ali["userId"], "amount": "5000000", "jalaliDate": "2026-11-08", "note": "تست اعلان",
})
note_id = r.get("data", {}).get("id")
st, r = req(ali_sess, "GET", "/api/notifications")
notes = r.get("data", {}).get("notifications", [])
expected8 = "پرداختی به مبلغ ۵٬۰۰۰٬۰۰۰ تومان از پروژه «پروژه دمو - ساختمان اداری» برای شما ثبت شد."
ali_ok = st == 200 and any(n.get("message") == expected8 for n in notes)

st, r = req(nil_sess, "GET", "/api/notifications")
nil_notes = r.get("data", {}).get("notifications", [])
nil_ok = st == 200 and len(nil_notes) == 0
check(8, "notification sent", ali_ok and nil_ok,
      f"ali={len(notes)} notes / niloofar={len(nil_notes)} expected={expected8!r}")

# Clean up the notification probe payment.
req(admin, "DELETE", f"/api/employee-payments/{note_id}")

# ----------------------------- 9 — employee sees only their own payments
st, r = req(ali_sess, "GET", "/api/employee-payments")
d = r.get("data", {})
mine = d.get("payments", [])
ok9 = st == 200 and len(mine) > 0 and all(p["userId"] == ali["userId"] for p in mine)
check(9, "employee own payments only", ok9, f"HTTP={st} count={len(mine)}")

# -------------------- 10 — employee userId filter for others is ignored
st, r = req(ali_sess, "GET", f"/api/employee-payments?userId={sara['userId']}")
d = r.get("data", {})
mine = d.get("payments", [])
ok10 = st == 200 and len(mine) > 0 and all(p["userId"] == ali["userId"] for p in mine)
check(10, "foreign userId ignored", ok10, f"HTTP={st} count={len(mine)}")

# ------------------------------------- 11 — employee cannot list all balances
st, r = req(ali_sess, "GET", "/api/employees/balances")
check(11, "balances forbidden", st == 403, f"HTTP={st} msg={err_msg(r)!r}")

# -------------------- 12 — employee cannot read another employee's balance
st, r = req(ali_sess, "GET", f"/api/employees/{sara['userId']}/balance")
check(12, "foreign balance forbidden", st == 403, f"HTTP={st} msg={err_msg(r)!r}")

# ---------------------------- 13 — employee cannot create a payment
st, r = req(ali_sess, "POST", "/api/employee-payments", {
    "projectId": P1, "userId": ali["userId"], "amount": "1000", "jalaliDate": "2026-11-08", "note": "تلاش کارمند",
})
check(13, "create forbidden", st == 403, f"HTTP={st} msg={err_msg(r)!r}")

# -------------------- 14 — /me/payments server-renders only ali's payments
st, html = req(ali_sess, "GET", "/me/payments", raw=True)
ok14 = (
    st == 200
    and "۱۰٬۰۰۰٬۰۰۰" in html                     # ali's own seed payment (10M Toman)
    and "۴٬۰۰۰٬۰۰۰" not in html                   # sara's payment must never appear
    and "پرداخت‌های من" in html
)
check(14, "me/payments SSR", ok14, f"HTTP={st} len={len(html)}")

# ------------------------------------------------------------------- summary
print("\n" + "=" * 60)
fails = [n for n, _, s in results if s == "FAIL"]
for n, label, s in results:
    print(f"  {s}  [{n:2d}] {label}")
print("=" * 60)
print(f"{len(results) - len(fails)}/{len(results)} passed")
if fails:
    print(f"FAILED: {fails}")
