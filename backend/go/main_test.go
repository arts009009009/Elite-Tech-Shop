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
	mux.HandleFunc("/api/cart", handleCart)
	mux.HandleFunc("/api/cart/", handleCartItem)
	mux.HandleFunc("/api/wishlist", handleWishlist)
	mux.HandleFunc("/api/wishlist/", handleWishlistItem)
	mux.HandleFunc("/api/orders", handleOrders)
	mux.HandleFunc("/api/orders/", handleOrderItem)
	mux.HandleFunc("/api/reviews", handleReviews)
	mux.HandleFunc("/api/rewards", handleRewards)
	mux.HandleFunc("/api/rewards/redeem", handleRewardsRedeem)
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

func TestCSRFMissing(t *testing.T) {
	resp := doReq("POST", "/api/auth/signup", map[string]string{
		"username": "csrfmissing",
		"email":    "csrfmissing@test.com",
		"password": "pass1234",
	}, "", false)
	if resp.status != 403 {
		t.Fatalf("expected 403, got %d: %s", resp.status, string(resp.body))
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
