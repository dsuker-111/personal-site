"""个人网站后端 —— 阿里云函数计算 FC 3.0 HTTP 函数

提供：
  POST /api/login   {password}                     → 登录，返回签名 token
  GET  /api/files                                  → 资源列表
  POST /api/upload  {name, contentType, data}      → 上传（data 为 base64）
  POST /api/delete  {path}                         → 删除
  GET  /api/file?path=xxx                          → 下载/预览原始字节
  POST /api/chat    {prompt, history}              → AI 对话（阿里云百炼）
  GET  /api/health                                 → 健康检查

环境变量：
  GITHUB_TOKEN        必填，有 repo 写权限的 PAT
  GITHUB_OWNER        默认 dsuker-111
  GITHUB_REPO         默认 dsuker-media
  GITHUB_BRANCH       默认 main
  AUTH_PASSWORD       必填，登录密码
  AUTH_SECRET         必填，token 签名密钥
  DASHSCOPE_API_KEY   可选，配置后 /api/chat 可用
  MODEL_NAME          默认 deepseek-v4.1-flash
  DASHSCOPE_BASE_URL  默认 https://dashscope.aliyuncs.com/compatible-mode/v1

纯标准库实现，无第三方依赖。
"""

import base64
import hashlib
import hmac
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
GITHUB_OWNER = os.environ.get("GITHUB_OWNER", "dsuker-111").strip()
GITHUB_REPO = os.environ.get("GITHUB_REPO", "dsuker-media").strip()
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main").strip()

AUTH_PASSWORD = os.environ.get("AUTH_PASSWORD", "").strip()
AUTH_SECRET = os.environ.get("AUTH_SECRET", "change-me").strip()

DASHSCOPE_API_KEY = os.environ.get("DASHSCOPE_API_KEY", "").strip()
MODEL_NAME = os.environ.get("MODEL_NAME", "deepseek-v4.1-flash").strip()
DASHSCOPE_BASE_URL = os.environ.get(
    "DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
).rstrip("/")

# 可在页面上切换的云端模型（均经阿里云百炼，Key 只在服务端）
CLOUD_MODELS = [
    {"id": "deepseek-v4.1-flash", "label": "DeepSeek V4.1 Flash",
     "provider": "阿里云百炼", "desc": "响应快，日常问答默认"},
    {"id": "qwen-plus", "label": "Qwen Plus",
     "provider": "阿里云百炼", "desc": "通义千问均衡版，中文稳健"},
    {"id": "qwen-max", "label": "Qwen Max",
     "provider": "阿里云百炼", "desc": "通义千问最强版，适合复杂问题"},
    {"id": "qwen-long", "label": "Qwen Long",
     "provider": "阿里云百炼", "desc": "超长上下文，适合长文阅读"},
]
CLOUD_MODEL_IDS = [m["id"] for m in CLOUD_MODELS]

MEDIA_DIR = "media"
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20MB
TOKEN_TTL = 7 * 24 * 3600

SYSTEM_PROMPT = (
    "你是个人网站里的 AI 助手，风格简洁、直接、友好。"
    "回答用中文，尽量条理清晰；不确定的内容要说明不确定。"
)

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".avif"}
VIDEO_EXT = {".mp4", ".webm", ".mov", ".m4v", ".ogg"}


# ---------------------------------------------------------------- 基础工具

def _resp(status, payload, extra_headers=None):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "600",
    }
    if extra_headers:
        headers.update(extra_headers)
    return {"statusCode": status, "headers": headers,
            "body": base64.b64encode(body).decode("ascii"), "isBase64Encoded": True}


def _binary(status, data, content_type, filename=None):
    headers = {
        "Content-Type": content_type or "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
    }
    if filename:
        headers["Content-Disposition"] = 'inline; filename="%s"' % filename
    return {"statusCode": status, "headers": headers,
            "body": base64.b64encode(data).decode("ascii"), "isBase64Encoded": True}


def _gh_request(method, path, body=None, accept="application/vnd.github+json", raw=False):
    url = "https://api.github.com" + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Bearer " + GITHUB_TOKEN)
    req.add_header("Accept", accept)
    req.add_header("User-Agent", "personal-site-fc")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            payload = r.read()
            if raw:
                return r.status, payload
            return r.status, json.loads(payload.decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")[:300]
        raise RuntimeError("GitHub %s %s -> %s %s" % (method, path, e.code, detail))


# ---------------------------------------------------------------- 鉴权

def make_token():
    exp = int(time.time()) + TOKEN_TTL
    sig = hmac.new(AUTH_SECRET.encode(), str(exp).encode(), hashlib.sha256).hexdigest()[:32]
    return "%d.%s" % (exp, sig)


def check_token(token):
    if not token or "." not in token:
        return False
    exp_s, sig = token.split(".", 1)
    try:
        exp = int(exp_s)
    except ValueError:
        return False
    if exp < time.time():
        return False
    expect = hmac.new(AUTH_SECRET.encode(), exp_s.encode(), hashlib.sha256).hexdigest()[:32]
    return hmac.compare_digest(sig, expect)


def authed(headers):
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if auth.lower().startswith("bearer "):
        return check_token(auth[7:].strip())
    return False


# ---------------------------------------------------------------- 资源库

def _ext(name):
    m = re.search(r"(\.[A-Za-z0-9]+)$", name or "")
    return m.group(1).lower() if m else ""


def _kind(name):
    ext = _ext(name)
    if ext in IMAGE_EXT:
        return "image"
    if ext in VIDEO_EXT:
        return "video"
    return "file"


def list_files():
    path = "/repos/%s/%s/contents/%s?ref=%s" % (GITHUB_OWNER, GITHUB_REPO, MEDIA_DIR, GITHUB_BRANCH)
    try:
        status, data = _gh_request("GET", path)
    except RuntimeError:
        return []
    if not isinstance(data, list):
        return []
    out = []
    for item in data:
        if item.get("type") != "file":
            continue
        name = item.get("name", "")
        out.append({
            "path": item.get("path"),
            "name": name,
            "size": item.get("size", 0),
            "sha": item.get("sha"),
            "kind": _kind(name),
        })
    out.sort(key=lambda x: x.get("name", ""), reverse=True)
    return out


def upload_file(name, content_type, b64data):
    raw = base64.b64decode(b64data)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ValueError("文件超过 20MB 限制（当前 %.1fMB）" % (len(raw) / 1024 / 1024))
    safe = re.sub(r"[^\w.\-]+", "_", os.path.basename(name or "file")).strip("._") or "file"
    if not _ext(safe):
        safe += ".bin"
    uniq = uuid.uuid4().hex[:8]
    obj = "%s/%s_%s" % (MEDIA_DIR, uniq, safe)
    path = "/repos/%s/%s/contents/%s" % (GITHUB_OWNER, GITHUB_REPO, obj)
    body = {
        "message": "upload %s" % safe,
        "content": base64.b64encode(raw).decode("ascii"),
        "branch": GITHUB_BRANCH,
    }
    _gh_request("PUT", path, body)
    return {"path": obj, "name": safe, "size": len(raw), "kind": _kind(safe),
            "contentType": content_type or "application/octet-stream"}


def delete_file(obj):
    if not obj.startswith(MEDIA_DIR + "/"):
        raise ValueError("非法路径")
    meta_path = "/repos/%s/%s/contents/%s?ref=%s" % (GITHUB_OWNER, GITHUB_REPO, obj, GITHUB_BRANCH)
    _, meta = _gh_request("GET", meta_path)
    sha = meta.get("sha")
    if not sha:
        raise ValueError("文件不存在")
    _gh_request("DELETE", "/repos/%s/%s/contents/%s" % (GITHUB_OWNER, GITHUB_REPO, obj),
                {"message": "delete %s" % obj, "sha": sha, "branch": GITHUB_BRANCH})
    return True


def read_file(obj):
    if not obj.startswith(MEDIA_DIR + "/"):
        raise ValueError("非法路径")
    meta_path = "/repos/%s/%s/contents/%s?ref=%s" % (GITHUB_OWNER, GITHUB_REPO, obj, GITHUB_BRANCH)
    _, meta = _gh_request("GET", meta_path)
    sha = meta.get("sha")
    size = meta.get("size", 0)
    if not sha:
        raise ValueError("文件不存在")
    _, blob = _gh_request("GET", "/repos/%s/%s/git/blobs/%s" % (GITHUB_OWNER, GITHUB_REPO, sha))
    raw = base64.b64decode(blob.get("content", "") or "")
    return raw, size, os.path.basename(obj)


# ---------------------------------------------------------------- AI

def chat(prompt, history, model=None):
    if not DASHSCOPE_API_KEY:
        raise RuntimeError("服务端未配置 DASHSCOPE_API_KEY")
    model = (model or MODEL_NAME).strip()
    if model not in CLOUD_MODEL_IDS:
        raise ValueError("不支持的模型：%s" % model)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in history or []:
        content = (item.get("content") or "").strip()
        if not content:
            continue
        role = item.get("role")
        if role == "ai":
            role = "assistant"
        if role not in ("user", "assistant"):
            continue
        messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": prompt})

    payload = json.dumps({
        "model": model,
        "messages": messages,
        "max_tokens": 512,
        "temperature": 0.7,
        "enable_thinking": False,
        "stream": False,
    }).encode("utf-8")

    req = urllib.request.Request(DASHSCOPE_BASE_URL + "/chat/completions", data=payload, method="POST")
    req.add_header("Authorization", "Bearer " + DASHSCOPE_API_KEY)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError("阿里云接口 %s：%s" % (e.code, e.read().decode("utf-8", "ignore")[:200]))

    choice = (data.get("choices") or [{}])[0]
    answer = ((choice.get("message") or {}).get("content") or "").strip()
    if not answer:
        raise RuntimeError("模型未返回内容")
    return {"answer": answer, "model": data.get("model") or MODEL_NAME}


# ---------------------------------------------------------------- 天气

# WMO 天气代码 → 中文描述 + 图标
WMO_TEXT = {
    0: ("晴", "☀️"), 1: ("大部晴朗", "🌤️"), 2: ("多云", "⛅"), 3: ("阴", "☁️"),
    45: ("雾", "🌫️"), 48: ("雾凇", "🌫️"),
    51: ("小毛毛雨", "🌦️"), 53: ("毛毛雨", "🌦️"), 55: ("大毛毛雨", "🌦️"),
    56: ("冻毛毛雨", "🌧️"), 57: ("冻毛毛雨", "🌧️"),
    61: ("小雨", "🌧️"), 63: ("中雨", "🌧️"), 65: ("大雨", "🌧️"),
    66: ("冻雨", "🌧️"), 67: ("冻雨", "🌧️"),
    71: ("小雪", "🌨️"), 73: ("中雪", "🌨️"), 75: ("大雪", "🌨️"), 77: ("雪粒", "🌨️"),
    80: ("阵雨", "🌦️"), 81: ("强阵雨", "🌦️"), 82: ("暴雨", "⛈️"),
    85: ("阵雪", "🌨️"), 86: ("强阵雪", "🌨️"),
    95: ("雷阵雨", "⛈️"), 96: ("雷阵雨伴冰雹", "⛈️"), 99: ("雷暴冰雹", "⛈️"),
}

_wmo = lambda code: WMO_TEXT.get(int(code or 0), ("未知", "❓"))
WEATHER_TTL = 600
_weather_cache = {}


def _http_json(url, timeout=12):
    req = urllib.request.Request(url, headers={"User-Agent": "personal-site-weather"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "ignore"))


def weather(city):
    """查询城市天气。数据源：Open-Meteo（免费、无需 Key）。"""
    city = (city or "杭州").strip()[:40]
    now = time.time()
    cached = _weather_cache.get(city)
    if cached and now - cached[0] < WEATHER_TTL:
        return cached[1]

    geo = _http_json(
        "https://geocoding-api.open-meteo.com/v1/search?name=%s&count=1&language=zh&format=json"
        % urllib.parse.quote(city)
    )
    results = geo.get("results") or []
    if not results:
        raise ValueError("没有找到这个城市：%s" % city)
    g = results[0]

    lat, lon = g.get("latitude"), g.get("longitude")
    fc = _http_json(
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=%s&longitude=%s"
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
        "weather_code,wind_speed_10m"
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,"
        "precipitation_probability_max"
        "&timezone=auto&forecast_days=5" % (lat, lon)
    )

    cur = fc.get("current") or {}
    text, icon = _wmo(cur.get("weather_code"))
    daily_in = fc.get("daily") or {}
    days = []
    for i, date in enumerate(daily_in.get("time") or []):
        dcode = (daily_in.get("weather_code") or [0] * 8)[i]
        dtext, dicon = _wmo(dcode)
        days.append({
            "date": date,
            "max": (daily_in.get("temperature_2m_max") or [None] * 8)[i],
            "min": (daily_in.get("temperature_2m_min") or [None] * 8)[i],
            "rain": (daily_in.get("precipitation_probability_max") or [0] * 8)[i],
            "code": dcode,
            "text": dtext,
            "icon": dicon,
        })

    result = {
        "city": g.get("name") or city,
        "region": " ".join(x for x in [g.get("country"), g.get("admin1")] if x),
        "lat": lat,
        "lon": lon,
        "current": {
            "temp": cur.get("temperature_2m"),
            "feels": cur.get("apparent_temperature"),
            "humidity": cur.get("relative_humidity_2m"),
            "wind": cur.get("wind_speed_10m"),
            "code": cur.get("weather_code"),
            "text": text,
            "icon": icon,
            "time": cur.get("time"),
        },
        "daily": days,
        "source": "open-meteo.com",
        "updatedAt": int(now),
    }
    _weather_cache[city] = (now, result)
    return result


# ---------------------------------------------------------------- 入口

def handler(event, context):
    # FC 3.0 把 HTTP 事件以 bytes / str 传入，必须先解析成 dict
    if isinstance(event, (bytes, bytearray)):
        try:
            event = json.loads(event.decode("utf-8", "ignore"))
        except Exception:
            event = {}
    elif isinstance(event, str):
        try:
            event = json.loads(event)
        except Exception:
            event = {}

    event = event or {}
    rc = event.get("requestContext") or {}
    http = rc.get("http") or {}
    method = (http.get("method") or event.get("httpMethod") or "GET").upper()
    raw_path = event.get("rawPath") or http.get("path") or "/"
    headers = {str(k).lower(): v for k, v in (event.get("headers") or {}).items()}
    query = event.get("queryParameters") or {}

    if method == "OPTIONS":
        return _resp(204, {})

    body = event.get("body")
    if body and event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8", "ignore")
    try:
        data = json.loads(body) if body else {}
    except Exception:
        data = {}

    path = raw_path.rstrip("/") or "/"

    # ---- 健康检查（无需登录）
    if path in ("/api/health", "/health"):
        return _resp(200, {
            "status": "ok",
            "service": "personal-site-api",
            "github_configured": bool(GITHUB_TOKEN),
            "repo": "%s/%s" % (GITHUB_OWNER, GITHUB_REPO),
            "ai_configured": bool(DASHSCOPE_API_KEY),
            "model": MODEL_NAME,
        })

    # ---- 登录
    if path in ("/api/login", "/login") and method == "POST":
        pwd = str(data.get("password") or "")
        if not AUTH_PASSWORD:
            return _resp(200, {"ok": False, "error": "服务端未配置 AUTH_PASSWORD"})
        if not hmac.compare_digest(pwd, AUTH_PASSWORD):
            return _resp(200, {"ok": False, "error": "密码错误"})
        return _resp(200, {"ok": True, "token": make_token(), "expiresIn": TOKEN_TTL})

    # ---- 天气（只读公共数据，无需登录）
    if path in ("/api/weather", "/weather"):
        city = query.get("city") or "杭州"
        try:
            return _resp(200, dict({"ok": True}, **weather(city)))
        except Exception as e:
            return _resp(200, {"ok": False, "error": "天气查询失败：%s" % e})

    # ---- 以下接口需要登录
    # <img> / <video> 无法设置请求头，所以也接受 ?token= 查询参数
    if not authed(headers) and not check_token(str(query.get("token") or "")):
        return _resp(401, {"ok": False, "error": "未登录或登录已过期"})

    try:
        if path in ("/api/files", "/api/list"):
            return _resp(200, {"ok": True, "files": list_files()})

        if path == "/api/upload" and method == "POST":
            name = data.get("name") or "file"
            ctype = data.get("contentType") or ""
            b64 = data.get("data") or ""
            if not b64:
                return _resp(400, {"ok": False, "error": "缺少文件内容"})
            info = upload_file(name, ctype, b64)
            return _resp(200, {"ok": True, "file": info})

        if path == "/api/delete" and method in ("POST", "DELETE"):
            obj = data.get("path") or (query.get("path") or "")
            delete_file(obj)
            return _resp(200, {"ok": True})

        if path == "/api/file":
            obj = query.get("path") or ""
            raw, size, filename = read_file(obj)
            ctype = "application/octet-stream"
            ext = _ext(filename)
            if ext in IMAGE_EXT:
                ctype = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                         "gif": "image/gif", "webp": "image/webp", "svg": "image/svg+xml",
                         "bmp": "image/bmp", "avif": "image/avif"}.get(ext.lstrip("."), "image/*")
            elif ext in VIDEO_EXT:
                ctype = {"mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
                         "m4v": "video/x-m4v", "ogg": "video/ogg"}.get(ext.lstrip("."), "video/*")
            return _binary(200, raw, ctype, filename)

        if path in ("/api/models", "/api/model-list"):
            return _resp(200, {
                "ok": True,
                "default": MODEL_NAME,
                "models": [{**m, "kind": "cloud"} for m in CLOUD_MODELS],
            })

        if path == "/api/chat" and method == "POST":
            prompt = (data.get("prompt") or "").strip()
            if not prompt:
                return _resp(400, {"ok": False, "error": "内容为空"})
            model = data.get("model") or MODEL_NAME
            return _resp(200, dict({"ok": True}, **chat(prompt, data.get("history"), model)))

        return _resp(404, {"ok": False, "error": "接口不存在: %s %s" % (method, path)})
    except ValueError as e:
        return _resp(400, {"ok": False, "error": str(e)})
    except RuntimeError as e:
        return _resp(200, {"ok": False, "error": str(e)})
    except Exception as e:
        return _resp(500, {"ok": False, "error": "%s: %s" % (type(e).__name__, e)})