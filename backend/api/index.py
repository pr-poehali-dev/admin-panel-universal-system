"""
AIS TechService — Universal CRUD API
Единый роутер для всех 13 сущностей административной панели.
"""
import os
import json
import re
import psycopg2
import psycopg2.extras
from datetime import datetime, date, time
from decimal import Decimal

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p51861815_admin_panel_universa")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(
        os.environ["DATABASE_URL"],
        cursor_factory=psycopg2.extras.RealDictCursor,
        options=f"-c search_path={SCHEMA}",
    )


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(data, default=serial)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps({"error": msg})}


def serial(obj):
    if isinstance(obj, (datetime, date, time)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, list):
        return obj
    raise TypeError(f"Not serializable: {type(obj)}")


def parse_body(event):
    raw = event.get("body") or "{}"
    if isinstance(raw, str):
        return json.loads(raw)
    return raw


# ─── GENERIC HELPERS ──────────────────────────────────────────────────────────

def list_rows(conn, table, order="id", where=None, params=None, limit=None, offset=None):
    sql = f"SELECT * FROM {table}"
    args = list(params or [])
    if where:
        sql += f" WHERE {where}"
    sql += f" ORDER BY {order}"
    if limit:
        sql += f" LIMIT {limit}"
    if offset:
        sql += f" OFFSET {offset}"
    with conn.cursor() as cur:
        cur.execute(sql, args)
        return [dict(r) for r in cur.fetchall()]


def get_row(conn, table, row_id):
    with conn.cursor() as cur:
        cur.execute(f"SELECT * FROM {table} WHERE id = %s", (row_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def insert_row(conn, table, data: dict):
    cols = list(data.keys())
    vals = [data[c] for c in cols]
    placeholders = ", ".join(["%s"] * len(cols))
    col_str = ", ".join(cols)
    sql = f"INSERT INTO {table} ({col_str}) VALUES ({placeholders}) RETURNING *"
    with conn.cursor() as cur:
        cur.execute(sql, vals)
        conn.commit()
        return dict(cur.fetchone())


def update_row(conn, table, row_id, data: dict):
    cols = list(data.keys())
    vals = [data[c] for c in cols]
    set_str = ", ".join([f"{c} = %s" for c in cols])
    sql = f"UPDATE {table} SET {set_str} WHERE id = %s RETURNING *"
    with conn.cursor() as cur:
        cur.execute(sql, vals + [row_id])
        conn.commit()
        row = cur.fetchone()
        return dict(row) if row else None


def delete_row(conn, table, row_id):
    with conn.cursor() as cur:
        cur.execute(f"UPDATE {table} SET id = id WHERE id = %s RETURNING id", (row_id,))
        if not cur.fetchone():
            return False
    # Use UPDATE trick: we do a "soft" indicator by checking existence first
    # Actual removal via direct sql
    with conn.cursor() as cur:
        cur.execute(f"DELETE FROM {table} WHERE id = %s", (row_id,))
        conn.commit()
    return True


# ─── ROUTE HANDLERS ───────────────────────────────────────────────────────────

def handle_categories(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        search = qs.get("search", "")
        if search:
            rows = list_rows(conn, "categories", order="name",
                             where="name ILIKE %s", params=[f"%{search}%"])
        else:
            rows = list_rows(conn, "categories", order="name")
        # Attach real device count
        with conn.cursor() as cur:
            cur.execute("SELECT category_id, COUNT(*) cnt FROM devices GROUP BY category_id")
            counts = {r["category_id"]: r["cnt"] for r in cur.fetchall()}
        for r in rows:
            r["device_count"] = counts.get(r["id"], 0)
        return ok(rows)
    if method == "GET" and len(path_parts) == 2:
        row = get_row(conn, "categories", path_parts[1])
        return ok(row) if row else err("Не найдено", 404)
    if method == "POST":
        row = insert_row(conn, "categories", {
            "name": body["name"],
            "description": body.get("description", ""),
            "icon": body.get("icon", "Laptop"),
            "color": body.get("color", "#00d4ff"),
        })
        return ok(row, 201)
    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"name", "description", "icon", "color"}
        data = {k: v for k, v in body.items() if k in allowed}
        row = update_row(conn, "categories", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)
    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "categories", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def handle_users(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        where, params = None, []
        filters = []
        if qs.get("search"):
            filters.append("(name ILIKE %s OR email ILIKE %s)")
            params += [f"%{qs['search']}%", f"%{qs['search']}%"]
        if qs.get("role"):
            filters.append("role = %s")
            params.append(qs["role"])
        if qs.get("status"):
            filters.append("status = %s")
            params.append(qs["status"])
        where = " AND ".join(filters) if filters else None
        rows = list_rows(conn, "users", order="name", where=where, params=params or None)
        return ok(rows)
    if method == "GET" and len(path_parts) == 2:
        row = get_row(conn, "users", path_parts[1])
        return ok(row) if row else err("Не найдено", 404)
    if method == "POST":
        row = insert_row(conn, "users", {
            "name": body["name"],
            "email": body["email"],
            "phone": body.get("phone", ""),
            "role": body.get("role", "master"),
            "status": body.get("status", "active"),
        })
        return ok(row, 201)
    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"name", "email", "phone", "role", "status", "last_login", "orders_count"}
        data = {k: v for k, v in body.items() if k in allowed}
        row = update_row(conn, "users", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)
    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "users", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def handle_masters(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        where, params = None, []
        filters = []
        if qs.get("search"):
            filters.append("name ILIKE %s")
            params.append(f"%{qs['search']}%")
        if qs.get("status"):
            filters.append("status = %s")
            params.append(qs["status"])
        if qs.get("level"):
            filters.append("level = %s")
            params.append(qs["level"])
        where = " AND ".join(filters) if filters else None
        rows = list_rows(conn, "masters", order="name", where=where, params=params or None)
        # orders in progress per master
        with conn.cursor() as cur:
            cur.execute(
                "SELECT master_id, COUNT(*) cnt FROM orders "
                "WHERE status_id NOT IN (SELECT id FROM order_statuses WHERE is_terminal=TRUE) "
                "GROUP BY master_id"
            )
            active = {r["master_id"]: r["cnt"] for r in cur.fetchall()}
        for r in rows:
            r["active_orders"] = active.get(r["id"], 0)
        return ok(rows)
    if method == "GET" and len(path_parts) == 2:
        row = get_row(conn, "masters", path_parts[1])
        if not row:
            return err("Не найдено", 404)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT o.*, s.name status_name, s.color status_color "
                "FROM orders o LEFT JOIN order_statuses s ON s.id=o.status_id "
                "WHERE o.master_id=%s ORDER BY o.created_at DESC LIMIT 10",
                (path_parts[1],),
            )
            row["recent_orders"] = [dict(r) for r in cur.fetchall()]
        return ok(row)
    if method == "POST":
        specs = body.get("specialization", [])
        row = insert_row(conn, "masters", {
            "name": body["name"],
            "email": body.get("email", ""),
            "phone": body.get("phone", ""),
            "specialization": specs,
            "level": body.get("level", "junior"),
            "status": body.get("status", "available"),
            "rating": body.get("rating", 5.0),
            "completed_orders": body.get("completed_orders", 0),
            "joined_at": body.get("joined_at", date.today().isoformat()),
            "bio": body.get("bio", ""),
        })
        return ok(row, 201)
    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"name","email","phone","specialization","level","status","rating","completed_orders","joined_at","bio","photo_url"}
        data = {k: v for k, v in body.items() if k in allowed}
        row = update_row(conn, "masters", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)
    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "masters", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def handle_devices(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        where, params = None, []
        filters = []
        if qs.get("search"):
            filters.append("(d.name ILIKE %s OR d.serial_number ILIKE %s OR d.brand ILIKE %s)")
            params += [f"%{qs['search']}%"] * 3
        if qs.get("category_id"):
            filters.append("d.category_id = %s")
            params.append(qs["category_id"])
        if qs.get("condition"):
            filters.append("d.condition = %s")
            params.append(qs["condition"])
        where_str = " AND ".join(filters) if filters else "1=1"
        sql = (
            "SELECT d.*, c.name category_name, c.color category_color "
            "FROM devices d LEFT JOIN categories c ON c.id=d.category_id "
            f"WHERE {where_str} ORDER BY d.received_at DESC"
        )
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            rows = [dict(r) for r in cur.fetchall()]
        return ok(rows)
    if method == "GET" and len(path_parts) == 2:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT d.*, c.name category_name FROM devices d "
                "LEFT JOIN categories c ON c.id=d.category_id WHERE d.id=%s",
                (path_parts[1],),
            )
            row = cur.fetchone()
        if not row:
            return err("Не найдено", 404)
        row = dict(row)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT o.*, s.name status_name, s.color status_color "
                "FROM orders o LEFT JOIN order_statuses s ON s.id=o.status_id "
                "WHERE o.device_id=%s ORDER BY o.created_at DESC",
                (path_parts[1],),
            )
            row["orders"] = [dict(r) for r in cur.fetchall()]
        return ok(row)
    if method == "POST":
        row = insert_row(conn, "devices", {
            "name": body["name"],
            "brand": body.get("brand", ""),
            "model": body.get("model", ""),
            "category_id": body.get("category_id"),
            "serial_number": body.get("serial_number", ""),
            "condition": body.get("condition", "good"),
            "client_name": body.get("client_name", ""),
            "client_phone": body.get("client_phone", ""),
            "client_email": body.get("client_email", ""),
            "received_at": body.get("received_at", date.today().isoformat()),
            "notes": body.get("notes", ""),
        })
        return ok(row, 201)
    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"name","brand","model","category_id","serial_number","condition","client_name","client_phone","client_email","received_at","notes"}
        data = {k: v for k, v in body.items() if k in allowed}
        row = update_row(conn, "devices", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)
    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "devices", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def handle_statuses(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        rows = list_rows(conn, "order_statuses", order="sort_order")
        with conn.cursor() as cur:
            cur.execute("SELECT status_id, COUNT(*) cnt FROM orders GROUP BY status_id")
            counts = {r["status_id"]: r["cnt"] for r in cur.fetchall()}
        for r in rows:
            r["orders_count"] = counts.get(r["id"], 0)
        return ok(rows)
    if method == "GET" and len(path_parts) == 2:
        row = get_row(conn, "order_statuses", path_parts[1])
        return ok(row) if row else err("Не найдено", 404)
    if method == "POST":
        row = insert_row(conn, "order_statuses", {
            "name": body["name"],
            "color": body.get("color", "#3b82f6"),
            "description": body.get("description", ""),
            "is_terminal": body.get("is_terminal", False),
            "sort_order": body.get("order", body.get("sort_order", 1)),
        })
        return ok(row, 201)
    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"name", "color", "description", "is_terminal", "sort_order"}
        data = {}
        for k, v in body.items():
            if k == "order":
                data["sort_order"] = v
            elif k in allowed:
                data[k] = v
        row = update_row(conn, "order_statuses", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)
    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "order_statuses", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def handle_services(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        where, params = None, []
        filters = []
        if qs.get("search"):
            filters.append("s.name ILIKE %s")
            params.append(f"%{qs['search']}%")
        if qs.get("category_id"):
            filters.append("s.category_id = %s")
            params.append(qs["category_id"])
        if qs.get("is_active") is not None:
            filters.append("s.is_active = %s")
            params.append(qs["is_active"] == "true")
        where_str = " AND ".join(filters) if filters else "1=1"
        sql = (
            "SELECT s.*, c.name category_name FROM services s "
            f"LEFT JOIN categories c ON c.id=s.category_id WHERE {where_str} ORDER BY s.name"
        )
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            rows = [dict(r) for r in cur.fetchall()]
        return ok(rows)
    if method == "GET" and len(path_parts) == 2:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT s.*, c.name category_name FROM services s "
                "LEFT JOIN categories c ON c.id=s.category_id WHERE s.id=%s",
                (path_parts[1],),
            )
            row = cur.fetchone()
        return ok(dict(row)) if row else err("Не найдено", 404)
    if method == "POST":
        row = insert_row(conn, "services", {
            "name": body["name"],
            "description": body.get("description", ""),
            "category_id": body.get("category_id"),
            "price": body.get("price", 0),
            "duration": body.get("duration", 60),
            "warranty": body.get("warranty", 30),
            "is_active": body.get("is_active", True),
        })
        return ok(row, 201)
    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"name","description","category_id","price","duration","warranty","is_active"}
        data = {k: v for k, v in body.items() if k in allowed}
        row = update_row(conn, "services", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)
    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "services", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def handle_parts(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        where, params = None, []
        filters = []
        if qs.get("search"):
            filters.append("(p.name ILIKE %s OR p.article ILIKE %s OR p.brand ILIKE %s)")
            params += [f"%{qs['search']}%"] * 3
        if qs.get("category_id"):
            filters.append("p.category_id = %s")
            params.append(qs["category_id"])
        if qs.get("low_stock") == "true":
            filters.append("p.quantity <= p.min_quantity")
        where_str = " AND ".join(filters) if filters else "1=1"
        sql = (
            "SELECT p.*, c.name category_name FROM parts p "
            f"LEFT JOIN categories c ON c.id=p.category_id WHERE {where_str} ORDER BY p.name"
        )
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            rows = [dict(r) for r in cur.fetchall()]
        return ok(rows)
    if method == "GET" and len(path_parts) == 2:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT p.*, c.name category_name FROM parts p "
                "LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=%s",
                (path_parts[1],),
            )
            row = cur.fetchone()
        return ok(dict(row)) if row else err("Не найдено", 404)
    if method == "POST":
        row = insert_row(conn, "parts", {
            "name": body["name"],
            "article": body.get("article", ""),
            "category_id": body.get("category_id"),
            "brand": body.get("brand", ""),
            "quantity": body.get("quantity", 0),
            "min_quantity": body.get("min_quantity", 1),
            "price": body.get("price", 0),
            "supplier": body.get("supplier", ""),
            "location": body.get("location", ""),
        })
        return ok(row, 201)
    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"name","article","category_id","brand","quantity","min_quantity","price","supplier","location"}
        data = {k: v for k, v in body.items() if k in allowed}
        row = update_row(conn, "parts", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)
    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "parts", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def handle_orders(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        filters, params = [], []
        if qs.get("search"):
            filters.append("(o.number ILIKE %s OR o.diagnosis ILIKE %s OR o.client_name ILIKE %s)")
            params += [f"%{qs['search']}%"] * 3
        if qs.get("status_id"):
            filters.append("o.status_id = %s")
            params.append(qs["status_id"])
        if qs.get("priority"):
            filters.append("o.priority = %s")
            params.append(qs["priority"])
        if qs.get("master_id"):
            filters.append("o.master_id = %s")
            params.append(qs["master_id"])
        where_str = " AND ".join(filters) if filters else "1=1"
        sql = (
            "SELECT o.*, "
            "s.name status_name, s.color status_color, "
            "m.name master_name, "
            "d.name device_name, d.brand device_brand "
            "FROM orders o "
            "LEFT JOIN order_statuses s ON s.id=o.status_id "
            "LEFT JOIN masters m ON m.id=o.master_id "
            "LEFT JOIN devices d ON d.id=o.device_id "
            f"WHERE {where_str} ORDER BY o.created_at DESC"
        )
        if qs.get("limit"):
            sql += f" LIMIT {int(qs['limit'])}"
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            rows = [dict(r) for r in cur.fetchall()]
        return ok(rows)

    if method == "GET" and len(path_parts) == 2:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT o.*, s.name status_name, s.color status_color, "
                "m.name master_name, d.name device_name, d.brand device_brand "
                "FROM orders o "
                "LEFT JOIN order_statuses s ON s.id=o.status_id "
                "LEFT JOIN masters m ON m.id=o.master_id "
                "LEFT JOIN devices d ON d.id=o.device_id "
                "WHERE o.id=%s",
                (path_parts[1],),
            )
            row = cur.fetchone()
        if not row:
            return err("Не найдено", 404)
        row = dict(row)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT os.*, sv.name service_name FROM order_services os "
                "LEFT JOIN services sv ON sv.id=os.service_id WHERE os.order_id=%s",
                (path_parts[1],),
            )
            row["services"] = [dict(r) for r in cur.fetchall()]
        with conn.cursor() as cur:
            cur.execute(
                "SELECT op.*, p.name part_name, p.article FROM order_parts op "
                "LEFT JOIN parts p ON p.id=op.part_id WHERE op.order_id=%s",
                (path_parts[1],),
            )
            row["parts"] = [dict(r) for r in cur.fetchall()]
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM payments WHERE order_id=%s ORDER BY created_at DESC",
                (path_parts[1],),
            )
            row["payments"] = [dict(r) for r in cur.fetchall()]
        return ok(row)

    if method == "POST":
        order_data = {
            "number": body.get("number", f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
            "device_id": body.get("device_id"),
            "master_id": body.get("master_id"),
            "status_id": body.get("status_id", 1),
            "diagnosis": body.get("diagnosis", ""),
            "total_price": body.get("total_price", 0),
            "paid_amount": body.get("paid_amount", 0),
            "deadline": body.get("deadline"),
            "priority": body.get("priority", "normal"),
            "client_name": body.get("client_name", ""),
            "client_phone": body.get("client_phone", ""),
            "notes": body.get("notes", ""),
        }
        row = insert_row(conn, "orders", order_data)
        oid = row["id"]
        for sid in body.get("service_ids", []):
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO order_services(order_id, service_id) VALUES(%s,%s) "
                    "ON CONFLICT DO NOTHING",
                    (oid, sid),
                )
        for pid in body.get("part_ids", []):
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO order_parts(order_id, part_id) VALUES(%s,%s) "
                    "ON CONFLICT DO NOTHING",
                    (oid, pid),
                )
        conn.commit()
        return ok(row, 201)

    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"number","device_id","master_id","status_id","diagnosis","total_price","paid_amount","deadline","priority","client_name","client_phone","notes","completed_at"}
        data = {k: v for k, v in body.items() if k in allowed}
        row = update_row(conn, "orders", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)

    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "orders", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def handle_payments(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        filters, params = [], []
        if qs.get("search"):
            filters.append("p.description ILIKE %s")
            params.append(f"%{qs['search']}%")
        if qs.get("status"):
            filters.append("p.status = %s")
            params.append(qs["status"])
        if qs.get("method"):
            filters.append("p.method = %s")
            params.append(qs["method"])
        if qs.get("order_id"):
            filters.append("p.order_id = %s")
            params.append(qs["order_id"])
        where_str = " AND ".join(filters) if filters else "1=1"
        sql = (
            "SELECT p.*, o.number order_number FROM payments p "
            f"LEFT JOIN orders o ON o.id=p.order_id WHERE {where_str} ORDER BY p.created_at DESC"
        )
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            rows = [dict(r) for r in cur.fetchall()]
        # summary stats
        with conn.cursor() as cur:
            cur.execute(
                "SELECT status, SUM(amount) total FROM payments GROUP BY status"
            )
            stats = {r["status"]: float(r["total"] or 0) for r in cur.fetchall()}
        return ok({"items": rows, "stats": stats})

    if method == "GET" and len(path_parts) == 2:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT p.*, o.number order_number FROM payments p "
                "LEFT JOIN orders o ON o.id=p.order_id WHERE p.id=%s",
                (path_parts[1],),
            )
            row = cur.fetchone()
        return ok(dict(row)) if row else err("Не найдено", 404)

    if method == "POST":
        row = insert_row(conn, "payments", {
            "order_id": body.get("order_id"),
            "amount": body.get("amount", 0),
            "method": body.get("method", "cash"),
            "status": body.get("status", "pending"),
            "description": body.get("description", ""),
        })
        if body.get("order_id") and body.get("status") == "completed":
            update_row(conn, "orders", body["order_id"], {
                "paid_amount": _recalc_paid(conn, body["order_id"])
            })
        return ok(row, 201)

    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"order_id","amount","method","status","description"}
        data = {k: v for k, v in body.items() if k in allowed}
        row = update_row(conn, "payments", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)

    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "payments", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def _recalc_paid(conn, order_id):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(SUM(amount),0) s FROM payments WHERE order_id=%s AND status='completed'",
            (order_id,),
        )
        return float(cur.fetchone()["s"])


def handle_schedule(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        filters, params = [], []
        if qs.get("master_id"):
            filters.append("s.master_id = %s")
            params.append(qs["master_id"])
        if qs.get("date"):
            filters.append("s.date = %s")
            params.append(qs["date"])
        if qs.get("type"):
            filters.append("s.type = %s")
            params.append(qs["type"])
        where_str = " AND ".join(filters) if filters else "1=1"
        sql = (
            "SELECT s.*, m.name master_name, o.number order_number FROM schedule s "
            "LEFT JOIN masters m ON m.id=s.master_id "
            "LEFT JOIN orders o ON o.id=s.order_id "
            f"WHERE {where_str} ORDER BY s.date, s.time_start"
        )
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            rows = [dict(r) for r in cur.fetchall()]
        return ok(rows)

    if method == "GET" and len(path_parts) == 2:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT s.*, m.name master_name FROM schedule s "
                "LEFT JOIN masters m ON m.id=s.master_id WHERE s.id=%s",
                (path_parts[1],),
            )
            row = cur.fetchone()
        return ok(dict(row)) if row else err("Не найдено", 404)

    if method == "POST":
        row = insert_row(conn, "schedule", {
            "master_id": body.get("master_id"),
            "order_id": body.get("order_id"),
            "date": body["date"],
            "time_start": body["time_start"],
            "time_end": body["time_end"],
            "type": body.get("type", "work"),
            "notes": body.get("notes", ""),
        })
        return ok(row, 201)

    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"master_id","order_id","date","time_start","time_end","type","notes"}
        data = {k: v for k, v in body.items() if k in allowed}
        row = update_row(conn, "schedule", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)

    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "schedule", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def handle_notifications(method, path_parts, body, qs, conn):
    if method == "GET" and len(path_parts) == 1:
        filters, params = [], []
        if qs.get("user_id"):
            filters.append("user_id = %s")
            params.append(qs["user_id"])
        if qs.get("type"):
            filters.append("type = %s")
            params.append(qs["type"])
        if qs.get("unread") == "true":
            filters.append("is_read = FALSE")
        where_str = " AND ".join(filters) if filters else "1=1"
        sql = f"SELECT * FROM notifications WHERE {where_str} ORDER BY created_at DESC"
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            rows = [dict(r) for r in cur.fetchall()]
        return ok(rows)

    if method == "GET" and len(path_parts) == 2:
        row = get_row(conn, "notifications", path_parts[1])
        return ok(row) if row else err("Не найдено", 404)

    if method == "POST" and len(path_parts) == 1:
        # Create new notification
        row = insert_row(conn, "notifications", {
            "user_id": body.get("user_id"),
            "title": body["title"],
            "message": body.get("message", ""),
            "type": body.get("type", "info"),
            "is_read": False,
            "link": body.get("link", ""),
        })
        return ok(row, 201)

    if method == "PATCH" and len(path_parts) == 3 and path_parts[2] == "read":
        row = update_row(conn, "notifications", path_parts[1], {"is_read": True})
        return ok(row) if row else err("Не найдено", 404)

    if method == "PATCH" and len(path_parts) == 2 and path_parts[1] == "read-all":
        uid = body.get("user_id") or qs.get("user_id")
        with conn.cursor() as cur:
            if uid:
                cur.execute("UPDATE notifications SET is_read=TRUE WHERE user_id=%s", (uid,))
            else:
                cur.execute("UPDATE notifications SET is_read=TRUE")
            conn.commit()
        return ok({"updated": cur.rowcount})

    if method in ("PUT", "PATCH") and len(path_parts) == 2:
        allowed = {"title","message","type","is_read","link"}
        data = {k: v for k, v in body.items() if k in allowed}
        row = update_row(conn, "notifications", path_parts[1], data)
        return ok(row) if row else err("Не найдено", 404)

    if method == "DELETE" and len(path_parts) == 2:
        ok_ = delete_row(conn, "notifications", path_parts[1])
        return ok({"deleted": True}) if ok_ else err("Не найдено", 404)
    return err("Маршрут не найден", 404)


def handle_analytics(conn, qs):
    """Агрегированная аналитика по всей системе."""
    period = qs.get("period", "6m")
    period_map = {"1m": "1 month", "3m": "3 months", "6m": "6 months", "1y": "1 year"}
    interval = period_map.get(period, "6 months")

    result = {}

    # KPI
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) total, COUNT(*) FILTER (WHERE completed_at IS NOT NULL) completed, "
                    "COALESCE(SUM(total_price),0) revenue, COALESCE(SUM(paid_amount),0) paid "
                    "FROM orders")
        result["kpi"] = dict(cur.fetchone())

    # Monthly revenue
    with conn.cursor() as cur:
        cur.execute(
            "SELECT TO_CHAR(created_at,'YYYY-MM') AS period, "
            "COUNT(*) AS orders_count, COALESCE(SUM(total_price),0) AS revenue "
            f"FROM orders WHERE created_at >= NOW() - INTERVAL '{interval}' "
            "GROUP BY 1 ORDER BY 1"
        )
        result["monthly"] = [dict(r) for r in cur.fetchall()]

    # By status
    with conn.cursor() as cur:
        cur.execute(
            "SELECT s.name, s.color, COUNT(o.id) cnt FROM order_statuses s "
            "LEFT JOIN orders o ON o.status_id=s.id GROUP BY s.id, s.name, s.color ORDER BY s.sort_order"
        )
        result["by_status"] = [dict(r) for r in cur.fetchall()]

    # By priority
    with conn.cursor() as cur:
        cur.execute("SELECT priority, COUNT(*) cnt FROM orders GROUP BY priority ORDER BY priority")
        result["by_priority"] = [dict(r) for r in cur.fetchall()]

    # Payment stats
    with conn.cursor() as cur:
        cur.execute(
            "SELECT method, COUNT(*) cnt, COALESCE(SUM(amount),0) total "
            "FROM payments WHERE status='completed' GROUP BY method"
        )
        result["payment_methods"] = [dict(r) for r in cur.fetchall()]

    # Master performance
    with conn.cursor() as cur:
        cur.execute(
            "SELECT m.name, m.rating, m.completed_orders, "
            "COUNT(o.id) FILTER (WHERE o.completed_at IS NOT NULL AND "
            f"o.created_at >= NOW() - INTERVAL '{interval}') orders_period "
            "FROM masters m LEFT JOIN orders o ON o.master_id=m.id "
            "GROUP BY m.id, m.name, m.rating, m.completed_orders ORDER BY m.completed_orders DESC"
        )
        result["masters"] = [dict(r) for r in cur.fetchall()]

    # Categories usage
    with conn.cursor() as cur:
        cur.execute(
            "SELECT c.name, c.color, COUNT(d.id) devices_count, "
            "COUNT(o.id) orders_count "
            "FROM categories c "
            "LEFT JOIN devices d ON d.category_id=c.id "
            "LEFT JOIN orders o ON o.device_id=d.id "
            "GROUP BY c.id, c.name, c.color ORDER BY orders_count DESC"
        )
        result["categories"] = [dict(r) for r in cur.fetchall()]

    # Low stock
    with conn.cursor() as cur:
        cur.execute("SELECT name, quantity, min_quantity, article FROM parts WHERE quantity <= min_quantity ORDER BY quantity")
        result["low_stock"] = [dict(r) for r in cur.fetchall()]

    return ok(result)


# ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

ROUTE_MAP = {
    "categories":   handle_categories,
    "users":        handle_users,
    "masters":      handle_masters,
    "devices":      handle_devices,
    "statuses":     handle_statuses,
    "services":     handle_services,
    "parts":        handle_parts,
    "orders":       handle_orders,
    "payments":     handle_payments,
    "schedule":     handle_schedule,
    "notifications": handle_notifications,
}


def handler(event: dict, context) -> dict:
    """Единый CRUD API для AIS TechService. Маршруты: /{entity}[/{id}] или ?entity=...[&id=...]"""
    method = event.get("httpMethod", "GET").upper()

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    qs = event.get("queryStringParameters") or {}
    body = {}
    if method not in ("GET", "DELETE"):
        body = parse_body(event)

    path = event.get("path", "/").rstrip("/")

    # Strip known prefixes: function UUID (/xxxxxxxx-xxxx-...) or /api
    path = re.sub(r"^/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "", path)
    if path.startswith("/api"):
        path = path[4:]

    parts = [p for p in path.split("/") if p]

    # Fallback: entity from querystring
    if not parts and qs.get("entity"):
        parts = [qs["entity"]]
        if qs.get("id"):
            parts.append(qs["id"])
        if qs.get("action"):
            parts.append(qs["action"])

    if not parts:
        return ok({"status": "AIS TechService API v2.0", "entities": list(ROUTE_MAP.keys())})

    entity = parts[0]
    path_parts = parts

    if entity == "analytics":
        conn = get_conn()
        try:
            return handle_analytics(conn, qs)
        finally:
            conn.close()

    if entity not in ROUTE_MAP:
        return err(f"Сущность '{entity}' не найдена", 404)

    conn = get_conn()
    try:
        return ROUTE_MAP[entity](method, path_parts, body, qs, conn)
    finally:
        conn.close()