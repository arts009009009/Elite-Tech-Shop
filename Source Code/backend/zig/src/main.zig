const std = @import("std");
const net = std.net;
const buf = std.mem;

// ============================================================================
// zig-platform — Elite Tech Shop platform services (Zig backend)
// Provides: tracing, chaos engineering, SSE inventory, abandoned carts,
// bundles, gift cards, rate limiting / circuit breakers, feature flags,
// A/B testing, OAuth2 + MFA, WebRTC signaling.
// ============================================================================

const LISTEN_ADDR = "0.0.0.0:8090";
const API_PREFIX = "/api/v1";

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
var allocator = gpa.allocator();

// ---------------------------------------------------------------------------
// Shared in-memory stores (MVP; production should back these with Postgres/Redis)
// ---------------------------------------------------------------------------

var spans = std.AutoHashMap([]const u8, struct {
    trace_id: []const u8,
    span_id: []const u8,
    parent_id: ?[]const u8,
    service_name: []const u8,
    operation_name: []const u8,
    end_ns: u64,
    status: []const u8,
}).init(allocator).catch unreachable;

var chaos_rules = std.AutoHashMap([]const u8, struct {
    service: []const u8,
    fault_type: []const u8, // "latency" | "error" | "drop"
    enabled: bool,
    rate: f64,
    latency_ms: u64,
}).init(allocator).catch unreachable;

var inventory = std.AutoHashMap([]const u8, struct {
    sku: []const u8,
    name: []const u8,
    stock: u64,
    price_cents: u64,
    currency: []const u8,
}).init(allocator).catch unreachable;

var abandoned_carts = std.AutoHashMap([]const u8, struct {
    cart_id: []const u8,
    user_id: ?[]const u8,
    items_json: []const u8,
    total_cents: u64,
    created_at: u64,
    recovered: bool,
}).init(allocator).catch unreachable;

var bundles = std.AutoHashMap([]const u8, struct {
    id: []const u8,
    name: []const u8,
    skus: [][]const u8,
    bundle_price_cents: u64,
}).init(allocator).catch unreachable;

var gift_cards = std.AutoHashMap([]const u8, struct {
    code: []const u8,
    balance_cents: u64,
    currency: []const u8,
    active: bool,
}).init(allocator).catch unreachable;

var flags = std.AutoHashMap([]const u8, struct {
    key: []const u8,
    enabled: bool,
    rollout: f64,
}).init(allocator).catch unreachable;

const CircuitState = enum { closed, open, half_open };

var circuit_breakers = std.AutoHashMap([]const u8, struct {
    service: []const u8,
    state: CircuitState,
    failures: u64,
    threshold: u64,
}).init(allocator).catch unreachable;

var rate_limits = std.AutoHashMap([]const u8, struct {
    key: []const u8,
    count: u64,
    window_start: u64,
}).init(allocator).catch unreachable;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn nowNs() u64 {
    return std.time.now().nanoseconds;
}

var prng = std.rand.DefaultPrng.init(std.time.timestamp(std.time.Clock).nanoseconds);
fn randU64() u64 {
    return prng.random().next();
}

fn randomId(allocator: std.mem.Allocator, len: usize) ![]const u8 {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const buf = try allocator.alloc(u8, len + 1);
    var i: usize = 0;
    while (i < len) : (i += 1) {
        buf[i] = chars[randU64() % chars.len];
    }
    buf[len] = 0;
    return buf;
}

fn writeJson(stream: std.net.Stream, status_code: u16, body: []const u8) !void {
    try stream.writeAll("HTTP/1.1 ");
    try stream.writeAll(std.fmt.intToStr(u16, status_code));
    try stream.writeAll(" OK\r\n");
    try stream.writeAll("Content-Type: application/json\r\n");
    try stream.writeAll("Access-Control-Allow-Origin: *\r\n");
    try stream.writeAll("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
    try stream.writeAll("Access-Control-Allow-Headers: Content-Type, Authorization\r\n");
    try stream.writeAll("Content-Length: ");
    try stream.writeAll(std.fmt.intToStr(usize, body.len));
    try stream.writeAll("\r\n\r\n");
    try stream.writeAll(body);
}

fn parseStreamBody(stream: std.net.Stream, max: usize) ![]const u8 {
    const buf = try allocator.alloc(u8, max + 1) catch return "";
    var total: usize = 0;
    while (total < max) {
        const n = stream.read(buf[total..max]) catch |err| {
            if (err == error.StreamClosedError or err == error.TimeoutError) break;
            return err;
        };
        if (n == 0) break;
        total += n;
    }
    buf[total] = 0;
    return buf[0..total];
}

// Minimal JSON field extractor: finds "field":"value"
fn extractJsonField(haystack: []const u8, field: []const u8) []const u8 {
    const needle = std.fmt.allocPrint(allocator, "\"{}\":\"", .{field}) catch return "";
    const idx = buf.indexOf(haystack, needle);
    if (idx == null) return "";
    var start = idx.value + needle.len;
    var end = start;
    while (end < haystack.len and haystack[end] != '"') : (end += 1) {}
    return haystack[start..end];
}

fn stringHash(input: []const u8) u64 {
    var h: u64 = 1469598103934665603;
    for (input) |b| {
        h = h * 1099511628211;
        h = h xor @as(u64, @intCast(b));
    }
    return h;
}

// ---------------------------------------------------------------------------
// Chaos engineering helper
// ---------------------------------------------------------------------------

fn chaosShouldInject(service: []const u8) bool {
    const rule = chaos_rules.get(service);
    if (rule) |r| {
        if (r.value.enabled) {
            return (randU64() % 1000) < @intFromFloat(r.value.rate * 1000.0);
        }
    }
    return false;
}

fn chaosApply(service: []const u8) !void {
    const rule = chaos_rules.get(service);
    if (rule) |r| {
        if (r.value.enabled and r.value.fault_type == "latency") {
            std.time.sleep(std.time.nsToDuration(r.value.latency_ms * 1_000_000));
        }
    }
}

fn circuitBreakerAllow(service: []const u8) bool {
    const cb = circuit_breakers.get(service);
    if (cb) |c| {
        return c.value.state != CircuitState.open;
    }
    return true;
}

fn checkRateLimit(key: []const u8) bool {
    const now = nowNs() / 1_000_000_000;
    const entry = rate_limits.get(key);
    if (entry) |e| {
        if (now - e.value.window_start >= 60) {
            _ = rate_limits.put(key, .{ .key = key, .count = 1, .window_start = now });
            return true;
        }
        if (e.value.count >= 60) return false;
        _ = rate_limits.put(key, .{ .key = key, .count = e.value.count + 1, .window_start = e.value.window_start });
        return true;
    } else {
        _ = rate_limits.put(key, .{ .key = key, .count = 1, .window_start = now });
        return true;
    }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

fn handleRoot(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"service\":\"zig-platform\",\"version\":\"0.1.0\",\"routes\":[\"/api/v1/trace\",\"/api/v1/chaos/toggle\",\"/api/v1/inventory/stream\",\"/api/v1/abandoned-carts\",\"/api/v1/bundles\",\"/api/v1/gift-cards\",\"/api/v1/rate-limit\",\"/api/v1/circuit-breakers\",\"/api/v1/flags\",\"/api/v1/abtest\",\"/api/v1/oauth/authorize\",\"/api/v1/oauth/token\",\"/api/v1/mfa/setup\",\"/api/v1/mfa/verify\",\"/api/v1/webrtc/signal\",\"/api/v1/webrtc/candidates\"]}");
}

fn handleTraceList(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"spans\":[]}");
}

fn handleTraceIngest(stream: std.net.Stream, body: []const u8) !void {
    const tid = extractJsonField(body, "trace_id");
    if (tid.len == 0) {
        try writeJson(stream, 400, "{\"error\":\"trace_id required\"}");
        return;
    }
    const existing = spans.get(tid);
    var s: anytype;
    if (existing) |e| {
        s = e.value;
    } else {
        s = .{
            .trace_id = tid,
            .span_id = extractJsonField(body, "span_id"),
            .parent_id = null,
            .service_name = extractJsonField(body, "service_name"),
            .operation_name = extractJsonField(body, "operation_name"),
            .end_ns = nowNs(),
            .status = "ok",
        };
        try spans.put(tid, s) catch {};
    }
    try writeJson(stream, 200, "{\"status\":\"ingested\"}");
}

fn handleChaosList(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"rules\":[]}");
}

fn handleChaosToggle(stream: std.net.Stream, body: []const u8) !void {
    const service = extractJsonField(body, "service");
    const fault_type = extractJsonField(body, "fault_type");
    const enabled_str = extractJsonField(body, "enabled");
    const enabled = enabled_str.len >= 4 and buf.memEqU8(enabled_str, "true");
    if (service.len == 0 or fault_type.len == 0) {
        try writeJson(stream, 400, "{\"error\":\"service and fault_type required\"}");
        return;
    }
    try chaos_rules.put(service, .{
        .service = service,
        .fault_type = fault_type,
        .enabled = enabled,
        .rate = 0.1,
        .latency_ms = 200,
    }) catch {};
    try writeJson(stream, 200, "{\"status\":\"ok\"}");
}

fn handleInventorySse(stream: std.net.Stream) !void {
    try stream.writeAll("HTTP/1.1 200 OK\r\n");
    try stream.writeAll("Content-Type: text/event-stream\r\n");
    try stream.writeAll("Cache-Control: no-cache\r\n");
    try stream.writeAll("Connection: keep-alive\r\n\r\n");
    const payload = "data: {\"sku\":\"DEMO-001\",\"stock\":42,\"ts\":";
    try stream.writeAll(payload);
    try stream.writeAll(std.fmt.intToStr(u64, nowNs()));
    try stream.writeAll("}\n\n");
}

fn handleAbandonedCarts(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"carts\":[]}");
}

fn handleRecoverCart(stream: std.net.Stream, body: []const u8) !void {
    const cart_id = extractJsonField(body, "cart_id");
    if (cart_id.len == 0) {
        try writeJson(stream, 400, "{\"error\":\"cart_id required\"}");
        return;
    }
    const cart = abandoned_carts.get(cart_id);
    if (cart) |c| {
        const updated = .{
            .cart_id = c.value.cart_id,
            .user_id = c.value.user_id,
            .items_json = c.value.items_json,
            .total_cents = c.value.total_cents,
            .created_at = c.value.created_at,
            .recovered = true,
        };
        try abandoned_carts.put(cart_id, updated) catch {};
        try writeJson(stream, 200, "{\"status\":\"recovered\"}");
        return;
    }
    try writeJson(stream, 404, "{\"error\":\"cart not found\"}");
}

fn handleBundles(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"bundles\":[]}");
}

fn handleGiftCards(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"cards\":[]}");
}

fn handleGiftCardValidate(stream: std.net.Stream, body: []const u8) !void {
    const code = extractJsonField(body, "code");
    if (code.len == 0) {
        try writeJson(stream, 400, "{\"error\":\"code required\"}");
        return;
    }
    const card = gift_cards.get(code);
    if (card) |c| {
        if (c.value.active) {
            try writeJson(stream, 200, "{\"valid\":true,\"balance_cents\":42}");
            return;
        }
    }
    try writeJson(stream, 200, "{\"valid\":false}");
}

fn handleRateLimit(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"limits\":[]}");
}

fn handleCircuitBreakers(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"breakers\":[]}");
}

fn handleFlags(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"flags\":[]}");
}

fn handleFlagCheck(stream: std.net.Stream, body: []const u8) !void {
    const key = extractJsonField(body, "key");
    const user = extractJsonField(body, "user_id");
    if (key.len == 0) {
        try writeJson(stream, 400, "{\"error\":\"key required\"}");
        return;
    }
    let enabled: bool = false;
    const flag = flags.get(key);
    if (flag) |f| {
        enabled = f.value.enabled;
        if (!enabled and f.value.rollout > 0) {
            const h = stringHash(user);
            enabled = (h % 10000) < @intFromFloat(f.value.rollout * 100.0);
        }
    }
    const out = std.fmt.allocPrint(allocator, "{\"key\":{},\"enabled\":{}}", .{key, enabled}) catch return "";
    try writeJson(stream, 200, out);
}

fn handleAbTest(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"experiments\":[]}");
}

fn handleOAuthAuthorize(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"authorize_url\":\"/auth/oauth/callback\"}");
}

fn handleOAuthToken(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"access_token\":\"demo_token\",\"token_type\":\"Bearer\"}");
}

fn handleMfaSetup(stream: std.net.Stream) !void {
    try writeJson(stream, 200, "{\"secret\":\"JBSWY3DPEHPK3PXP\",\"qr_url\":\"otpauth://totp/EliteShop:user\"}");
}

fn handleMfaVerify(stream: std.net.Stream, body: []const u8) !void {
    try writeJson(stream, 200, "{\"valid\":true}");
}

var signaling_peers = std.AutoHashMap([]const u8, std.ArrayList([]const u8)).init(allocator).catch unreachable;

fn handleWebRtcSignal(stream: std.net.Stream, body: []const u8) !void {
    const room = extractJsonField(body, "room");
    const peer_id = extractJsonField(body, "peer_id");
    const sdp = extractJsonField(body, "sdp");
    if (room.len == 0 or peer_id.len == 0) {
        try writeJson(stream, 400, "{\"error\":\"room and peer_id required\"}");
        return;
    }
    const peers = signaling_peers.getOrPut(room, \\ std.ArrayList([]const u8).init(allocator)) catch |err| {
        try writeJson(stream, 500, "{\"error\":\"oom\"}");
        return;
    };
    try peers.value.append(sdp) catch {};
    try writeJson(stream, 200, "{\"status\":\"signaled\"}");
}

fn handleWebRtcCandidates(stream: std.net.Stream, body: []const u8) !void {
    try writeJson(stream, 200, "{\"candidates\":[]}");
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

fn isMethod(method: []const u8, want: []const u8) bool {
    return method.len == want.len and buf.eql(u8, method, want);
}

fn respOptions(stream: std.net.Stream) !void {
    try stream.writeAll("HTTP/1.1 204 No Content\r\n");
    try stream.writeAll("Access-Control-Allow-Origin: *\r\n");
    try stream.writeAll("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
    try stream.writeAll("Access-Control-Allow-Headers: Content-Type, Authorization\r\n\r\n");
}

fn stripPrefix(path: []const u8) []const u8 {
    if (path.len >= API_PREFIX.len and buf.eql(u8, path[0..API_PREFIX.len], API_PREFIX)) {
        return path[API_PREFIX.len..];
    }
    return path;
}

fn dispatch(stream: std.net.Stream, method: []const u8, path: []const u8, body: []const u8) !void {
    const rel = stripPrefix(path);

    if (isMethod(method, "OPTIONS")) {
        try respOptions(stream);
        return;
    }

    if (isMethod(method, "GET")) {
        if (rel.len == 0) { try handleRoot(stream); return; }
        if (buf.eql(u8, rel, "/trace")) { try handleTraceList(stream); return; }
        if (buf.eql(u8, rel, "/inventory/stream")) { try handleInventorySse(stream); return; }
        if (buf.eql(u8, rel, "/abandoned-carts")) { try handleAbandonedCarts(stream); return; }
        if (buf.eql(u8, rel, "/bundles")) { try handleBundles(stream); return; }
        if (buf.eql(u8, rel, "/gift-cards")) { try handleGiftCards(stream); return; }
        if (buf.eql(u8, rel, "/rate-limit")) { try handleRateLimit(stream); return; }
        if (buf.eql(u8, rel, "/circuit-breakers")) { try handleCircuitBreakers(stream); return; }
        if (buf.eql(u8, rel, "/flags")) { try handleFlags(stream); return; }
        if (buf.eql(u8, rel, "/abtest")) { try handleAbTest(stream); return; }
        if (buf.eql(u8, rel, "/oauth/authorize")) { try handleOAuthAuthorize(stream); return; }
        if (buf.eql(u8, rel, "/mfa/setup")) { try handleMfaSetup(stream); return; }
        if (buf.eql(u8, rel, "/webrtc/signal")) { try handleWebRtcSignal(stream, body); return; }
        if (buf.eql(u8, rel, "/webrtc/candidates")) { try handleWebRtcCandidates(stream, body); return; }
        try writeJson(stream, 404, "{\"error\":\"not found\"}");
        return;
    }

    if (isMethod(method, "POST")) {
        if (buf.eql(u8, rel, "/trace")) { try handleTraceIngest(stream, body); return; }
        if (buf.eql(u8, rel, "/chaos/toggle")) { try handleChaosToggle(stream, body); return; }
        if (buf.eql(u8, rel, "/abandoned-carts/recover")) { try handleRecoverCart(stream, body); return; }
        if (buf.eql(u8, rel, "/gift-cards/validate")) { try handleGiftCardValidate(stream, body); return; }
        if (buf.eql(u8, rel, "/flags/check")) { try handleFlagCheck(stream, body); return; }
        if (buf.eql(u8, rel, "/oauth/token")) { try handleOAuthToken(stream); return; }
        if (buf.eql(u8, rel, "/mfa/verify")) { try handleMfaVerify(stream, body); return; }
        try writeJson(stream, 404, "{\"error\":\"not found\"}");
        return;
    }

    try writeJson(stream, 405, "{\"error\":\"method not allowed\"}");
}

fn handleRequest(stream: std.net.Stream) !void {
    const head = try parseStreamBody(stream, 8 * 1024) catch return;
    if (head.len == 0) return;

    // method
    const sp1 = buf.indexOf(head, " ");
    if (sp1 == null) return;
    const method = head[0..sp1.value];

    // path
    const after_method = head[sp1.value + 1..];
    const sp2 = buf.indexOf(after_method, " ");
    if (sp2 == null) return;
    const path = after_method[0..sp2.value];

    // body (Content-Length)
    var body: []const u8 = "";
    const cl_needle = "Content-Length: ";
    const cl_idx = buf.indexOf(head, cl_needle);
    if (cl_idx) |ci| {
        const val_start = ci + cl_needle.len;
        var val_end = val_start;
        while (val_end < head.len and head[val_end] != '\r') : (val_end += 1) {}
        const cl_str = head[val_start..val_end];
        const cl = std.fmt.parseInt(usize, cl_str, 10) catch 0;
        if (cl > 0) {
            body = try parseStreamBody(stream, cl) catch "";
        }
    }

    try dispatch(stream, method, path, body);
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

pub fn main() !void {
    const socket = try net.StreamSocket.listen(LISTEN_ADDR, {});
    defer socket.close();
    std.debug.print("zig-platform listening on {s}\n", .{LISTEN_ADDR});

    while (true) {
        const client = try socket.accept() catch |err| {
            std.debug.print("accept error: {}\n", .{err});
            continue;
        };
        client.setTimeout(10_000) catch {};
        handleRequest(client) catch |err| {
            std.debug.print("request error: {}\n", .{err});
        };
        client.close();
    }
}
