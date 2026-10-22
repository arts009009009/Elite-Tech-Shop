//go:build !integration

package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

var testServer *httptest.Server

func TestMain(m *testing.M) {
	mux := newTestMux()
	testServer = httptest.NewServer(recoveryMiddleware(csrfMiddleware(mux)))
	defer testServer.Close()
	os.Exit(m.Run())
}

func newTestMux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", handleHealth)
	mux.HandleFunc("/", handleLanding)
	mux.HandleFunc("/api/auth/signup", handleSignup)
	mux.HandleFunc("/api/auth/login", handleLogin)
	mux.HandleFunc("/api/auth/logout", handleLogout)
	mux.HandleFunc("/api/auth/me", handleMe)
	mux.HandleFunc("/api/auth/send-password", handleSendPassword)
	mux.HandleFunc("/api/cart", handleCart)
	mux.HandleFunc("/api/cart/", handleCartItem)
	mux.HandleFunc("/api/wishlist", handleWishlist)
	mux.HandleFunc("/api/wishlist/", handleWishlistItem)
	mux.HandleFunc("/api/orders", handleOrders)
	mux.HandleFunc("/api/orders/", handleOrderItem)
	mux.HandleFunc("/api/reviews", handleReviews)
	mux.HandleFunc("/api/rewards", handleRewards)
	mux.HandleFunc("/api/rewards/redeem", handleRewardsRedeem)
	mux.HandleFunc("/api/discounts", handleDiscountList)
	mux.HandleFunc("/api/discounts/validate", handleDiscountValidate)
	mux.HandleFunc("/api/discounts/apply", handleDiscountApply)
	mux.HandleFunc("/api/admin/users", handleAdminUsers)
	mux.HandleFunc("/api/admin/users/", handleAdminUsers)
	mux.HandleFunc("/api/admin/orders", handleAdminClearOrders)
	mux.HandleFunc("/api/admin/products", handleAdminProducts)
	mux.HandleFunc("/api/admin/products/", handleAdminProducts)
	mux.HandleFunc("/api/profile", handleProfile)
	mux.HandleFunc("/api/profile/password", handlePasswordChange)
	mux.HandleFunc("/api/recommendations", handleRecommendations)
	mux.HandleFunc("/api/analytics/summary", handleAnalyticsSummary)
	mux.HandleFunc("/api/analytics/track", handleAnalyticsTrack)
	mux.HandleFunc("/api/activity", handleUserActivity)
	mux.HandleFunc("/api/inventory", handleInventory)
	return mux
}

type testResponse struct {
	status       int
	body         []byte
	cookies      []*http.Cookie
	sessionToken string
}

func doReq(method, path string, body interface{}, sessionToken string, sendCSRF bool) testResponse {
	var buf bytes.Buffer
	if body != nil {
		json.NewEncoder(&buf).Encode(body)
	}
	r, _ := http.NewRequest(method, testServer.URL+path, &buf)
	r.Header.Set("Content-Type", "application/json")
	if sendCSRF {
		r.Header.Set("X-CSRF-Token", "valid-test-token")
	}
	if sessionToken != "" {
		r.AddCookie(&http.Cookie{Name: "session_token", Value: sessionToken})
	}
	resp, err := http.DefaultClient.Do(r)
	if err != nil {
		return testResponse{status: -1, body: []byte(err.Error())}
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)

	var sessToken string
	var cookies []*http.Cookie
	for _, c := range resp.Cookies() {
		cookies = append(cookies, c)
		if c.Name == "session_token" && c.Value != "" {
			sessToken = c.Value
		}
	}

	return testResponse{status: resp.StatusCode, body: b, cookies: cookies, sessionToken: sessToken}
}

// doReqWithHeaders issues a request with arbitrary extra headers (e.g.
// Origin, Referer, X-Guest-Id).
func doReqWithHeaders(method, path string, body interface{}, sessionToken string, headers map[string]string) testResponse {
	var buf bytes.Buffer
	if body != nil {
		json.NewEncoder(&buf).Encode(body)
	}
	r, _ := http.NewRequest(method, testServer.URL+path, &buf)
	r.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		r.Header.Set(k, v)
	}
	if sessionToken != "" {
		r.AddCookie(&http.Cookie{Name: "session_token", Value: sessionToken})
	}
	resp, err := http.DefaultClient.Do(r)
	if err != nil {
		return testResponse{status: -1, body: []byte(err.Error())}
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)

	var sessToken string
	var cookies []*http.Cookie
	for _, c := range resp.Cookies() {
		cookies = append(cookies, c)
		if c.Name == "session_token" && c.Value != "" {
			sessToken = c.Value
		}
	}

	return testResponse{status: resp.StatusCode, body: b, cookies: cookies, sessionToken: sessToken}
}

func jsonBody(resp *testResponse, v interface{}) {
	json.Unmarshal(resp.body, v)
}

func signupAndGetToken(t *testing.T, username, email, password string) string {
	t.Helper()
	resp := doReq("POST", "/api/auth/signup", map[string]string{
		"username": username,
		"email":    email,
		"password": password,
	}, "", true)
	if resp.status != 200 {
		t.Fatalf("signup failed for %s: status=%d body=%s", username, resp.status, string(resp.body))
	}
	return resp.sessionToken
}

func loginAndGetToken(t *testing.T, username, password string) string {
	t.Helper()
	resp := doReq("POST", "/api/auth/login", map[string]string{
		"username": username,
		"password": password,
	}, "", true)
	if resp.status != 200 {
		t.Fatalf("login failed for %s: status=%d body=%s", username, resp.status, string(resp.body))
	}
	return resp.sessionToken
}

func TestHealthEndpoint(t *testing.T) {
	resp := doReq("GET", "/api/health", nil, "", false)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d", resp.status)
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["status"] != "ok" {
		t.Fatalf("expected status 'ok', got %v", body["status"])
	}
}

func TestLandingPage(t *testing.T) {
	resp := doReq("GET", "/", nil, "", false)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d", resp.status)
	}
	if !strings.Contains(string(resp.body), "<!DOCTYPE html>") {
		t.Fatal("expected HTML response containing <!DOCTYPE html>")
	}
}

func TestSignup(t *testing.T) {
	resp := doReq("POST", "/api/auth/signup", map[string]string{
		"username": "testsignup",
		"email":    "testsignup@test.com",
		"password": "pass1234",
	}, "", true)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["token"] == nil || body["token"] == "" {
		t.Fatal("expected token in response")
	}
	if body["username"] != "testsignup" {
		t.Fatalf("expected username 'testsignup', got %v", body["username"])
	}
	if resp.sessionToken == "" {
		t.Fatal("expected session cookie")
	}
}

func TestSignupDuplicate(t *testing.T) {
	doReq("POST", "/api/auth/signup", map[string]string{
		"username": "dupuser",
		"email":    "dup@test.com",
		"password": "pass1234",
	}, "", true)

	resp := doReq("POST", "/api/auth/signup", map[string]string{
		"username": "dupuser",
		"email":    "dup2@test.com",
		"password": "pass5678",
	}, "", true)
	if resp.status != 409 {
		t.Fatalf("expected 409, got %d: %s", resp.status, string(resp.body))
	}
}

func TestSignupValidation(t *testing.T) {
	resp := doReq("POST", "/api/auth/signup", map[string]string{
		"username": "",
		"password": "",
	}, "", true)
	if resp.status != 400 {
		t.Fatalf("expected 400, got %d: %s", resp.status, string(resp.body))
	}
}

func TestLogin(t *testing.T) {
	resp := doReq("POST", "/api/auth/login", map[string]string{
		"username": "admin",
		"password": "admin",
	}, "", true)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["token"] == nil || body["token"] == "" {
		t.Fatal("expected token in response")
	}
	if body["username"] != "admin" {
		t.Fatalf("expected username 'admin', got %v", body["username"])
	}
	if body["email"] != "admin@elite.shop" {
		t.Fatalf("expected email 'admin@elite.shop', got %v", body["email"])
	}
}

func TestLoginInvalid(t *testing.T) {
	resp := doReq("POST", "/api/auth/login", map[string]string{
		"username": "admin",
		"password": "wrongpassword",
	}, "", true)
	if resp.status != 401 {
		t.Fatalf("expected 401, got %d: %s", resp.status, string(resp.body))
	}
}

func TestLogout(t *testing.T) {
	token := loginAndGetToken(t, "admin", "admin")

	resp := doReq("POST", "/api/auth/logout", nil, token, true)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}

	resp2 := doReq("GET", "/api/auth/me", nil, token, false)
	if resp2.status != 401 {
		t.Fatalf("expected 401 after logout, got %d: %s", resp2.status, string(resp2.body))
	}
}

func TestMe(t *testing.T) {
	token := loginAndGetToken(t, "admin", "admin")
	resp := doReq("GET", "/api/auth/me", nil, token, false)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["username"] != "admin" {
		t.Fatalf("expected username 'admin', got %v", body["username"])
	}
	if body["role"] != "admin" {
		t.Fatalf("expected role 'admin', got %v", body["role"])
	}
}

func TestMeNoSession(t *testing.T) {
	resp := doReq("GET", "/api/auth/me", nil, "", false)
	if resp.status != 401 {
		t.Fatalf("expected 401, got %d: %s", resp.status, string(resp.body))
	}
}

func TestCartGetEmpty(t *testing.T) {
	token := signupAndGetToken(t, "cartempty", "cartempty@test.com", "pass1234")
	resp := doReq("GET", "/api/cart", nil, token, false)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body []map[string]interface{}
	jsonBody(&resp, &body)
	if len(body) != 0 {
		t.Fatalf("expected empty cart, got %d items", len(body))
	}
}

func TestCartAddItem(t *testing.T) {
	token := signupAndGetToken(t, "cartadd", "cartadd@test.com", "pass1234")
	resp := doReq("POST", "/api/cart", map[string]interface{}{
		"product_id": 1,
		"quantity":   2,
		"price":      99.99,
		"name":       "Test Product",
		"image":      "/img/test.jpg",
		"currency":   "USD",
	}, token, true)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body []map[string]interface{}
	jsonBody(&resp, &body)
	if len(body) != 1 {
		t.Fatalf("expected 1 item in cart, got %d", len(body))
	}
	if body[0]["product_id"] != float64(1) {
		t.Fatalf("expected product_id 1, got %v", body[0]["product_id"])
	}
}

func TestCartDelete(t *testing.T) {
	token := signupAndGetToken(t, "cartdel", "cartdel@test.com", "pass1234")

	doReq("POST", "/api/cart", map[string]interface{}{
		"product_id": 1,
		"quantity":   1,
		"price":      50.0,
		"name":       "Item",
		"image":      "/img/item.jpg",
		"currency":   "USD",
	}, token, true)

	resp := doReq("DELETE", "/api/cart", nil, token, true)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body []map[string]interface{}
	jsonBody(&resp, &body)
	if len(body) != 0 {
		t.Fatalf("expected empty cart after delete, got %d items", len(body))
	}
}

func TestWishlistAdd(t *testing.T) {
	token := signupAndGetToken(t, "wishadd", "wishadd@test.com", "pass1234")
	resp := doReq("POST", "/api/wishlist", map[string]interface{}{
		"product_id": 5,
	}, token, true)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body []float64
	jsonBody(&resp, &body)
	if len(body) != 1 {
		t.Fatalf("expected 1 item in wishlist, got %d", len(body))
	}
	if body[0] != 5 {
		t.Fatalf("expected product_id 5, got %v", body[0])
	}
}

func TestWishlistDuplicate(t *testing.T) {
	token := signupAndGetToken(t, "wishdup", "wishdup@test.com", "pass1234")

	doReq("POST", "/api/wishlist", map[string]interface{}{
		"product_id": 5,
	}, token, true)

	resp := doReq("POST", "/api/wishlist", map[string]interface{}{
		"product_id": 5,
	}, token, true)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body []float64
	jsonBody(&resp, &body)
	if len(body) != 1 {
		t.Fatalf("expected 1 item (no duplicate), got %d", len(body))
	}
}

func TestReviewsGet(t *testing.T) {
	resp := doReq("GET", "/api/reviews", nil, "", false)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body []interface{}
	jsonBody(&resp, &body)
	if body == nil {
		t.Fatal("expected array, got nil")
	}
}

func TestReviewsPost(t *testing.T) {
	token := signupAndGetToken(t, "revpost", "revpost@test.com", "pass1234")
	resp := doReq("POST", "/api/reviews", map[string]interface{}{
		"product_id": 1,
		"rating":     5,
		"comment":    "Great product!",
	}, token, true)
	if resp.status != 201 {
		t.Fatalf("expected 201, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["rating"] != float64(5) {
		t.Fatalf("expected rating 5, got %v", body["rating"])
	}
	if body["comment"] != "Great product!" {
		t.Fatalf("expected comment 'Great product!', got %v", body["comment"])
	}
}

func TestReviewsValidation(t *testing.T) {
	token := signupAndGetToken(t, "revval", "revval@test.com", "pass1234")
	resp := doReq("POST", "/api/reviews", map[string]interface{}{
		"product_id": 1,
		"rating":     0,
		"comment":    "Invalid rating",
	}, token, true)
	if resp.status != 400 {
		t.Fatalf("expected 400, got %d: %s", resp.status, string(resp.body))
	}
}

func TestRewards(t *testing.T) {
	token := signupAndGetToken(t, "rewtest", "rewtest@test.com", "pass1234")
	resp := doReq("GET", "/api/rewards", nil, token, false)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["points"] != float64(0) {
		t.Fatalf("expected 0 points, got %v", body["points"])
	}
	if body["lifetime"] != float64(0) {
		t.Fatalf("expected 0 lifetime points, got %v", body["lifetime"])
	}
}

func TestDiscountValidate(t *testing.T) {
	resp := doReq("POST", "/api/discounts/validate", map[string]string{
		"code": "WELCOME10",
	}, "", true)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["valid"] != true {
		t.Fatal("expected valid=true")
	}
	if body["percent"] != float64(10) {
		t.Fatalf("expected 10%%, got %v", body["percent"])
	}
}

func TestDiscountInvalid(t *testing.T) {
	resp := doReq("POST", "/api/discounts/validate", map[string]string{
		"code": "FAKECODE",
	}, "", true)
	if resp.status != 400 {
		t.Fatalf("expected 400, got %d: %s", resp.status, string(resp.body))
	}
}

func TestCSRFNoOriginAllowed(t *testing.T) {
	// No Origin/Referer (curl, server-to-server) must be allowed.
	resp := doReq("POST", "/api/auth/signup", map[string]string{
		"username": "csrfmissing",
		"email":    "csrfmissing@test.com",
		"password": "pass1234",
	}, "", false)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
}

func TestCSRFCrossOriginRejected(t *testing.T) {
	resp := doReqWithHeaders("POST", "/api/auth/signup", map[string]string{
		"username": "csrforigin",
		"email":    "csrforigin@test.com",
		"password": "pass1234",
	}, "", map[string]string{"Origin": "https://evil.example"})
	if resp.status != 403 {
		t.Fatalf("expected 403 for cross-origin POST, got %d: %s", resp.status, string(resp.body))
	}
}

func TestCSRFAllowedOrigin(t *testing.T) {
	resp := doReqWithHeaders("POST", "/api/auth/signup", map[string]string{
		"username": "csrfallowed",
		"email":    "csrfallowed@test.com",
		"password": "pass1234",
	}, "", map[string]string{"Origin": "http://localhost:3000"})
	if resp.status != 200 {
		t.Fatalf("expected 200 for allowed origin, got %d: %s", resp.status, string(resp.body))
	}
}

func TestCSRFRefererFallback(t *testing.T) {
	resp := doReqWithHeaders("POST", "/api/auth/signup", map[string]string{
		"username": "csrfreferer",
		"email":    "csrfreferer@test.com",
		"password": "pass1234",
	}, "", map[string]string{"Referer": "https://evil.example/checkout"})
	if resp.status != 403 {
		t.Fatalf("expected 403 for cross-origin referer, got %d: %s", resp.status, string(resp.body))
	}

	resp = doReqWithHeaders("POST", "/api/auth/signup", map[string]string{
		"username": "csrfreferer2",
		"email":    "csrfreferer2@test.com",
		"password": "pass1234",
	}, "", map[string]string{"Referer": "https://elite-tech.shop/cart"})
	if resp.status != 200 {
		t.Fatalf("expected 200 for allowed referer, got %d: %s", resp.status, string(resp.body))
	}
}

func TestCSRFValid(t *testing.T) {
	resp := doReq("POST", "/api/auth/signup", map[string]string{
		"username": "csrfvalid",
		"email":    "csrfvalid@test.com",
		"password": "pass1234",
	}, "", true)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
}

func TestPasswordHashing(t *testing.T) {
	signupToken := signupAndGetToken(t, "hashuser", "hash@test.com", "mypassword123")
	if signupToken == "" {
		t.Fatal("signup should return token")
	}

	loginToken := loginAndGetToken(t, "hashuser", "mypassword123")
	if loginToken == "" {
		t.Fatal("login should return token")
	}
}

func TestOrdersCreate(t *testing.T) {
	token := signupAndGetToken(t, "ordcreate", "ordcreate@test.com", "pass1234")
	resp := doReq("POST", "/api/orders", map[string]interface{}{
		"items": []map[string]interface{}{
			{"product_id": 1, "quantity": 2, "price": 99.99, "name": "Widget", "currency": "USD"},
		},
		"total": 199.98,
	}, token, true)
	if resp.status != 201 {
		t.Fatalf("expected 201, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["id"] == nil || body["id"] == "" {
		t.Fatal("expected order ID")
	}
	if body["status"] != "processing" {
		t.Fatalf("expected status 'processing', got %v", body["status"])
	}
	if body["total"] != 199.98 {
		t.Fatalf("expected total 199.98, got %v", body["total"])
	}
}

func TestRecommendations(t *testing.T) {
	resp := doReq("GET", "/api/recommendations", nil, "", false)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["strategy"] != "popularity" {
		t.Fatalf("expected strategy 'popularity', got %v", body["strategy"])
	}
}

// --- REGRESSION TESTS ---

func TestCartItemPathParsing(t *testing.T) {
	token := signupAndGetToken(t, "cartitem12", "cartitem12@test.com", "pass1234")
	resp := doReq("POST", "/api/cart", map[string]interface{}{
		"product_id": 12, "quantity": 1, "price": 10.0, "name": "Twelve", "image": "", "currency": "USD",
	}, token, true)
	if resp.status != 200 {
		t.Fatalf("cart add: expected 200, got %d: %s", resp.status, string(resp.body))
	}

	resp = doReq("PUT", "/api/cart/12", map[string]interface{}{"quantity": 3}, token, true)
	if resp.status != 200 {
		t.Fatalf("PUT /api/cart/12: expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body []map[string]interface{}
	jsonBody(&resp, &body)
	if len(body) != 1 || body[0]["quantity"] != float64(3) {
		t.Fatalf("expected 1 item with quantity 3, got %v", body)
	}

	resp = doReq("DELETE", "/api/cart/12", nil, token, true)
	if resp.status != 200 {
		t.Fatalf("DELETE /api/cart/12: expected 200, got %d: %s", resp.status, string(resp.body))
	}
	body = nil
	jsonBody(&resp, &body)
	if len(body) != 0 {
		t.Fatalf("expected empty cart after item delete, got %v", body)
	}
}

func TestWishlistItemPathParsing(t *testing.T) {
	token := signupAndGetToken(t, "wishitem7", "wishitem7@test.com", "pass1234")
	resp := doReq("POST", "/api/wishlist", map[string]interface{}{"product_id": 7}, token, true)
	if resp.status != 200 {
		t.Fatalf("wishlist add: expected 200, got %d: %s", resp.status, string(resp.body))
	}

	resp = doReq("DELETE", "/api/wishlist/7", nil, token, true)
	if resp.status != 200 {
		t.Fatalf("DELETE /api/wishlist/7: expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body []float64
	jsonBody(&resp, &body)
	if len(body) != 0 {
		t.Fatalf("expected empty wishlist after delete, got %v", body)
	}
}

func createTestOrder(t *testing.T, token string) string {
	t.Helper()
	resp := doReq("POST", "/api/orders", map[string]interface{}{
		"items": []map[string]interface{}{
			{"product_id": 3, "quantity": 1, "price": 25.5, "name": "Gadget", "currency": "USD"},
		},
	}, token, true)
	if resp.status != 201 {
		t.Fatalf("order create: expected 201, got %d: %s", resp.status, string(resp.body))
	}
	var order map[string]interface{}
	jsonBody(&resp, &order)
	id, _ := order["id"].(string)
	if id == "" {
		t.Fatal("expected order ID")
	}
	if order["currency"] != "USD" {
		t.Fatalf("expected currency 'USD', got %v", order["currency"])
	}
	return id
}

func TestOrderItemGetPutOwnership(t *testing.T) {
	token := signupAndGetToken(t, "orditem", "orditem@test.com", "pass1234")
	id := createTestOrder(t, token)

	// GET own order
	resp := doReq("GET", "/api/orders/"+id, nil, token, false)
	if resp.status != 200 {
		t.Fatalf("GET own order: expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var order map[string]interface{}
	jsonBody(&resp, &order)
	if order["id"] != id {
		t.Fatalf("expected order id %v, got %v", id, order["id"])
	}

	// PUT valid status
	resp = doReq("PUT", "/api/orders/"+id, map[string]interface{}{"status": "shipped"}, token, true)
	if resp.status != 200 {
		t.Fatalf("PUT status: expected 200, got %d: %s", resp.status, string(resp.body))
	}
	order = nil
	jsonBody(&resp, &order)
	if order["status"] != "shipped" {
		t.Fatalf("expected status 'shipped', got %v", order["status"])
	}

	// PUT payment id
	resp = doReq("PUT", "/api/orders/"+id, map[string]interface{}{"status": "paid", "payment_id": "pay-123"}, token, true)
	if resp.status != 200 {
		t.Fatalf("PUT payment: expected 200, got %d: %s", resp.status, string(resp.body))
	}
	order = nil
	jsonBody(&resp, &order)
	if order["status"] != "paid" || order["payment_id"] != "pay-123" {
		t.Fatalf("expected paid/pay-123, got %v/%v", order["status"], order["payment_id"])
	}

	// PUT invalid status
	resp = doReq("PUT", "/api/orders/"+id, map[string]interface{}{"status": "bogus"}, token, true)
	if resp.status != 400 {
		t.Fatalf("PUT invalid status: expected 400, got %d: %s", resp.status, string(resp.body))
	}

	// Foreign user: 404 for GET and PUT
	other := signupAndGetToken(t, "orditem2", "orditem2@test.com", "pass1234")
	resp = doReq("GET", "/api/orders/"+id, nil, other, false)
	if resp.status != 404 {
		t.Fatalf("GET foreign order: expected 404, got %d: %s", resp.status, string(resp.body))
	}
	resp = doReq("PUT", "/api/orders/"+id, map[string]interface{}{"status": "cancelled"}, other, true)
	if resp.status != 404 {
		t.Fatalf("PUT foreign order: expected 404, got %d: %s", resp.status, string(resp.body))
	}

	// Unknown order
	resp = doReq("GET", "/api/orders/ORD-doesnotexist", nil, token, false)
	if resp.status != 404 {
		t.Fatalf("GET unknown order: expected 404, got %d: %s", resp.status, string(resp.body))
	}

	// DELETE then verify gone (index rebuild works)
	resp = doReq("DELETE", "/api/orders/"+id, nil, token, true)
	if resp.status != 200 {
		t.Fatalf("DELETE order: expected 200, got %d: %s", resp.status, string(resp.body))
	}
	resp = doReq("GET", "/api/orders/"+id, nil, token, false)
	if resp.status != 404 {
		t.Fatalf("GET deleted order: expected 404, got %d: %s", resp.status, string(resp.body))
	}
	resp = doReq("GET", "/api/orders", nil, token, false)
	if resp.status != 200 {
		t.Fatalf("GET orders: expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var list []map[string]interface{}
	jsonBody(&resp, &list)
	if len(list) != 0 {
		t.Fatalf("expected empty order list after delete, got %d orders", len(list))
	}
}

func TestOrdersRequireSession(t *testing.T) {
	resp := doReq("POST", "/api/orders", map[string]interface{}{
		"items": []map[string]interface{}{{"product_id": 1, "quantity": 1, "price": 10.0}},
	}, "", true)
	if resp.status != 401 {
		t.Fatalf("expected 401 for anonymous order, got %d: %s", resp.status, string(resp.body))
	}
}

func TestOrdersRejectEmptyItems(t *testing.T) {
	token := signupAndGetToken(t, "ordempty", "ordempty@test.com", "pass1234")
	resp := doReq("POST", "/api/orders", map[string]interface{}{"items": []interface{}{}}, token, true)
	if resp.status != 400 {
		t.Fatalf("expected 400 for empty items, got %d: %s", resp.status, string(resp.body))
	}
}

func TestOrdersServerComputedTotal(t *testing.T) {
	token := signupAndGetToken(t, "ordclamp", "ordclamp@test.com", "pass1234")
	resp := doReq("POST", "/api/orders", map[string]interface{}{
		"items": []map[string]interface{}{
			{"product_id": 42, "quantity": 5000, "price": 2.0, "name": "Clamped", "currency": "USD"},
		},
		"total": 1.0, // lies about the total; server must recompute
	}, token, true)
	if resp.status != 201 {
		t.Fatalf("expected 201, got %d: %s", resp.status, string(resp.body))
	}
	var order map[string]interface{}
	jsonBody(&resp, &order)
	if order["total"] != 1998.0 {
		t.Fatalf("expected server-computed total 1998.0 (999 clamped x $2.00), got %v", order["total"])
	}
	var items []map[string]interface{}
	items, _ = order["items"].([]map[string]interface{})
	if len(items) != 1 || items[0]["quantity"] != float64(999) {
		t.Fatalf("expected quantity clamped to 999, got %v", order["items"])
	}
}

func TestRewardsRedeemRejectsNegativeCost(t *testing.T) {
	token := signupAndGetToken(t, "rewneg", "rewneg@test.com", "pass1234")
	// Client cost is ignored; free_shipping costs 200 and user has 0 points.
	resp := doReq("POST", "/api/rewards/redeem", map[string]interface{}{
		"perk": "free_shipping", "cost": -999999,
	}, token, true)
	if resp.status != 400 {
		t.Fatalf("expected 400, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["error"] != "insufficient points" {
		t.Fatalf("expected 'insufficient points', got %v", body["error"])
	}
}

func TestRewardsRedeemUnknownPerk(t *testing.T) {
	token := signupAndGetToken(t, "rewunk", "rewunk@test.com", "pass1234")
	resp := doReq("POST", "/api/rewards/redeem", map[string]interface{}{
		"perk": "nonexistent_perk", "cost": -5,
	}, token, true)
	if resp.status != 400 {
		t.Fatalf("expected 400 for unknown perk, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["error"] != "unknown perk" {
		t.Fatalf("expected 'unknown perk', got %v", body["error"])
	}
}

func TestRewardsRedeemUsesRegistryCost(t *testing.T) {
	token := signupAndGetToken(t, "rewok", "rewok@test.com", "pass1234")
	store.mu.Lock()
	if store.Rewards["rewok"] != nil {
		store.Rewards["rewok"].Points = 250
	}
	store.mu.Unlock()

	// Client claims cost 0; server must charge the registry cost of 200.
	resp := doReq("POST", "/api/rewards/redeem", map[string]interface{}{
		"perk": "free_shipping", "cost": 0,
	}, token, true)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["points"] != float64(50) {
		t.Fatalf("expected 50 remaining points, got %v", body["points"])
	}
	redeemed, _ := body["redeemed"].(map[string]interface{})
	if redeemed == nil || redeemed["free_shipping"] != true {
		t.Fatalf("expected free_shipping redeemed, got %v", body["redeemed"])
	}
}

func TestDiscountExpiryEndOfDay(t *testing.T) {
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	store.mu.Lock()
	store.Discounts = append(store.Discounts,
		DiscountCode{Code: "TODAYONLY", Percent: 15, MaxUses: 100, ExpiresAt: today},
		DiscountCode{Code: "EXPIREDCODE", Percent: 15, MaxUses: 100, ExpiresAt: yesterday},
	)
	store.mu.Unlock()
	t.Cleanup(func() {
		store.mu.Lock()
		filtered := store.Discounts[:0]
		for _, d := range store.Discounts {
			if d.Code != "TODAYONLY" && d.Code != "EXPIREDCODE" {
				filtered = append(filtered, d)
			}
		}
		store.Discounts = filtered
		store.mu.Unlock()
	})

	// A code expiring "today" is still valid through the end of the day.
	resp := doReq("POST", "/api/discounts/validate", map[string]string{"code": "TODAYONLY"}, "", true)
	if resp.status != 200 {
		t.Fatalf("expected 200 for code expiring today, got %d: %s", resp.status, string(resp.body))
	}
	resp = doReq("POST", "/api/discounts/apply", map[string]string{"code": "TODAYONLY"}, "", true)
	if resp.status != 200 {
		t.Fatalf("expected 200 apply for code expiring today, got %d: %s", resp.status, string(resp.body))
	}

	// Yesterday's code is expired for BOTH validate and apply.
	resp = doReq("POST", "/api/discounts/validate", map[string]string{"code": "EXPIREDCODE"}, "", true)
	if resp.status != 400 {
		t.Fatalf("expected 400 for expired code validate, got %d: %s", resp.status, string(resp.body))
	}
	resp = doReq("POST", "/api/discounts/apply", map[string]string{"code": "EXPIREDCODE"}, "", true)
	if resp.status != 400 {
		t.Fatalf("expected 400 for expired code apply, got %d: %s", resp.status, string(resp.body))
	}
}

func TestDiscountList(t *testing.T) {
	resp := doReq("GET", "/api/discounts", nil, "", false)
	if resp.status != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.status, string(resp.body))
	}
	var body []map[string]interface{}
	jsonBody(&resp, &body)
	if len(body) == 0 {
		t.Fatal("expected at least one discount code")
	}
	found := false
	for _, d := range body {
		for _, key := range []string{"code", "type", "value", "min_purchase", "expires_at", "max_uses", "used_count"} {
			if _, ok := d[key]; !ok {
				t.Fatalf("discount list item missing key %q: %v", key, d)
			}
		}
		if d["code"] == "WELCOME10" {
			found = true
			if d["type"] != "percentage" {
				t.Fatalf("expected type 'percentage', got %v", d["type"])
			}
			if d["value"] != float64(10) {
				t.Fatalf("expected value 10, got %v", d["value"])
			}
		}
	}
	if !found {
		t.Fatal("expected WELCOME10 in discount list")
	}
}

func TestAdminUserDelete(t *testing.T) {
	adminToken := loginAndGetToken(t, "admin", "admin")
	signupAndGetToken(t, "deleteme", "deleteme@test.com", "pass1234")

	resp := doReq("DELETE", "/api/admin/users/deleteme", nil, adminToken, true)
	if resp.status != 200 {
		t.Fatalf("expected 200 deleting user, got %d: %s", resp.status, string(resp.body))
	}

	// Deleting again -> 404
	resp = doReq("DELETE", "/api/admin/users/deleteme", nil, adminToken, true)
	if resp.status != 404 {
		t.Fatalf("expected 404 for missing user, got %d: %s", resp.status, string(resp.body))
	}

	// Deleting an admin -> 403
	resp = doReq("DELETE", "/api/admin/users/admin", nil, adminToken, true)
	if resp.status != 403 {
		t.Fatalf("expected 403 for admin target, got %d: %s", resp.status, string(resp.body))
	}

	// Non-admin caller -> 403
	userToken := signupAndGetToken(t, "notadmin1", "notadmin1@test.com", "pass1234")
	resp = doReq("DELETE", "/api/admin/users/notadmin1", nil, userToken, true)
	if resp.status != 403 {
		t.Fatalf("expected 403 for non-admin caller, got %d: %s", resp.status, string(resp.body))
	}
}

func TestAdminProductEditPath(t *testing.T) {
	adminToken := loginAndGetToken(t, "admin", "admin")
	store.mu.Lock()
	store.Products = append(store.Products, Product{ID: 777, Name: "Old", Price: 10, Currency: "USD"})
	store.mu.Unlock()
	t.Cleanup(func() {
		store.mu.Lock()
		for i, p := range store.Products {
			if p.ID == 777 {
				store.Products = append(store.Products[:i], store.Products[i+1:]...)
				break
			}
		}
		store.mu.Unlock()
	})

	resp := doReq("PUT", "/api/admin/products/777", map[string]interface{}{
		"name": "New", "price": 20.0,
	}, adminToken, true)
	if resp.status != 200 {
		t.Fatalf("expected 200 for product edit, got %d: %s", resp.status, string(resp.body))
	}
	store.mu.RLock()
	name := ""
	for _, p := range store.Products {
		if p.ID == 777 {
			name = p.Name
		}
	}
	store.mu.RUnlock()
	if name != "New" {
		t.Fatalf("expected product renamed to 'New', got %q", name)
	}
}

func TestGuestCartIsolation(t *testing.T) {
	guestA := map[string]string{"X-Guest-Id": "aaaa-bbbb-cccc"}
	guestB := map[string]string{"X-Guest-Id": "dddd-eeee-ffff"}

	resp := doReqWithHeaders("POST", "/api/cart", map[string]interface{}{
		"product_id": 9, "quantity": 1, "price": 5.0, "name": "GuestItem", "image": "", "currency": "USD",
	}, "", guestA)
	if resp.status != 200 {
		t.Fatalf("guest cart add: expected 200, got %d: %s", resp.status, string(resp.body))
	}

	resp = doReqWithHeaders("GET", "/api/cart", nil, "", guestA)
	var cartA []map[string]interface{}
	jsonBody(&resp, &cartA)
	if len(cartA) != 1 {
		t.Fatalf("expected guest A cart to have 1 item, got %d", len(cartA))
	}

	resp = doReqWithHeaders("GET", "/api/cart", nil, "", guestB)
	var cartB []map[string]interface{}
	jsonBody(&resp, &cartB)
	if len(cartB) != 0 {
		t.Fatalf("expected guest B cart to be empty, got %d items", len(cartB))
	}
}

func TestSendPasswordNotImplemented(t *testing.T) {
	resp := doReq("POST", "/api/auth/send-password", map[string]string{"email": "x@test.com"}, "", true)
	if resp.status != 501 {
		t.Fatalf("expected 501, got %d: %s", resp.status, string(resp.body))
	}
	var body map[string]interface{}
	jsonBody(&resp, &body)
	if body["error"] != "not implemented" {
		t.Fatalf("expected 'not implemented', got %v", body["error"])
	}
}
