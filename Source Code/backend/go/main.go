package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type Product struct {
	ID          int                `json:"id"`
	Name        string             `json:"name"`
	Price       float64            `json:"price"`
	Currency    string             `json:"currency"`
	Category    string             `json:"category"`
	Description map[string]string  `json:"description"`
	Image       string             `json:"image"`
	Images      []string           `json:"images"`
	Rating      float64            `json:"rating"`
	Reviews     int                `json:"reviews"`
	InStock     bool               `json:"in_stock"`
	Featured    bool               `json:"featured"`
	Tags        []string           `json:"tags"`
 Specs       map[string]string  `json:"specs"`
}

type CartItem struct {
	ProductID int     `json:"product_id"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
	Name      string  `json:"name"`
	Image     string  `json:"image"`
	Currency  string  `json:"currency"`
}

type Order struct {
	ID        string     `json:"id"`
	Items     []CartItem `json:"items"`
	Total     float64    `json:"total"`
	Status    string     `json:"status"`
	CreatedAt string     `json:"created_at"`
	Username  string     `json:"username"`
}

type Review struct {
	ID        int    `json:"id"`
	ProductID int    `json:"product_id"`
	Username  string `json:"username"`
	Rating    int    `json:"rating"`
	Comment   string `json:"comment"`
	CreatedAt string `json:"created_at"`
}

type RewardData struct {
	Points     int            `json:"points"`
	Lifetime   int            `json:"lifetime"`
	Redeemed   map[string]bool `json:"redeemed"`
}

type DiscountCode struct {
	Code      string  `json:"code"`
	Percent   float64 `json:"percent"`
	MaxUses   int     `json:"max_uses"`
	Used      int     `json:"used"`
	ExpiresAt string  `json:"expires_at"`
}

type User struct {
	Username     string `json:"username"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
	Role         string `json:"role"`
}

type Session struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	Expires  int64  `json:"expires"`
}

type Store struct {
	mu          sync.RWMutex
	Products    []Product              `json:"products"`
	Carts       map[string][]CartItem  `json:"carts"`
	Wishlists   map[string][]int       `json:"wishlists"`
	Orders      []Order                `json:"orders"`
	Reviews     []Review               `json:"reviews"`
	Rewards     map[string]*RewardData `json:"rewards"`
	Discounts   []DiscountCode         `json:"discounts"`
	Users       []User                 `json:"users"`
	Sessions    map[string]*Session    `json:"sessions"`
	Profiles    map[string]*UserProfile `json:"profiles"`
	NextReviewID int                   `json:"next_review_id"`

	// Index maps for O(1) lookups
	UsersByUsername   map[string]int    // username -> index in Users
	OrdersByUsername  map[string][]int  // username -> indices in Orders
	ReviewsByProduct  map[int][]int     // product_id -> indices in Reviews
}

var store = &Store{
	Carts:     make(map[string][]CartItem),
	Wishlists: make(map[string][]int),
	Rewards:   make(map[string]*RewardData),
	Sessions:  make(map[string]*Session),
	Profiles:  make(map[string]*UserProfile),
	UsersByUsername:  map[string]int{"admin": 0},
	OrdersByUsername: make(map[string][]int),
	ReviewsByProduct: make(map[int][]int),
	Users: []User{
		{Username: "admin", Email: "admin@elite.shop", PasswordHash: hashPassword("admin"), Role: "admin"},
	},
	Discounts: []DiscountCode{
		{Code: "WELCOME10", Percent: 10, MaxUses: 100, ExpiresAt: "2026-12-31"},
		{Code: "ELITE20", Percent: 20, MaxUses: 50, ExpiresAt: "2026-12-31"},
		{Code: "SAVE5", Percent: 5, MaxUses: 999, ExpiresAt: "2027-12-31"},
	},
	NextReviewID: 1,
}

func init() {
	adminPass := os.Getenv("ADMIN_PASSWORD")
	if adminPass == "" {
		adminPass = "admin"
		log.Printf("[WARN] No ADMIN_PASSWORD env var set, using default password. Set ADMIN_PASSWORD in production!")
	}
	store.Users[0].PasswordHash = hashPassword(adminPass)
}

func hashPassword(password string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("[WARN] bcrypt failed, using insecure fallback: %v", err)
		return password
	}
	return string(hash)
}

func checkPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

func generateToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		log.Printf("[WARN] crypto/rand failed, using fallback: %v", err)
		for i := range b {
			b[i] = byte(time.Now().UnixNano() & 0xff)
		}
	}
	return hex.EncodeToString(b)
}

func generateOrderID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		log.Printf("[WARN] crypto/rand failed, using fallback: %v", err)
		for i := range b {
			b[i] = byte(time.Now().UnixNano() & 0xff)
		}
	}
	return "ORD-" + hex.EncodeToString(b)
}

var allowedOrigins = map[string]bool{
	"http://localhost:3000": true,
	"http://localhost:3001": true,
	"https://elite-tech.shop": true,
}

func getCors(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin != "" && allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
	}
}

func jsonResponse(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func errorResponse(w http.ResponseWriter, msg string, status int) {
	jsonResponse(w, map[string]string{"error": msg}, status)
}

func getUsername(r *http.Request) string {
	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" {
		cookie, err = r.Cookie("user_session")
	}
	if err != nil {
		return ""
	}
	store.mu.RLock()
	defer store.mu.RUnlock()
	sess, ok := store.Sessions[cookie.Value]
	if !ok || time.Now().Unix() > sess.Expires {
		return ""
	}
	return sess.Username
}

func handleSignup(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	if r.Method != "POST" { errorResponse(w, "method not allowed", 405); return }

	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, "invalid request", 400); return
	}
	if req.Username == "" || req.Password == "" {
		errorResponse(w, "username and password required", 400); return
	}

	store.mu.Lock()
	defer store.mu.Unlock()

	if _, exists := store.UsersByUsername[req.Username]; exists {
		errorResponse(w, "username already exists", 409); return
	}

	idx := len(store.Users)
	store.Users = append(store.Users, User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hashPassword(req.Password),
		Role:         "user",
	})
	store.UsersByUsername[req.Username] = idx

	token := generateToken()
	store.Sessions[token] = &Session{
		Token:    token,
		Username: req.Username,
		Expires:  time.Now().Add(7 * 24 * time.Hour).Unix(),
	}

	store.Wishlists[req.Username] = []int{}
	store.Rewards[req.Username] = &RewardData{Points: 0, Lifetime: 0, Redeemed: make(map[string]bool)}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		MaxAge:   7 * 24 * 3600,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	jsonResponse(w, map[string]interface{}{
		"token":    token,
		"username": req.Username,
		"role":     "user",
	}, 200)
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	if r.Method != "POST" { errorResponse(w, "method not allowed", 405); return }

	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, "invalid request", 400); return
	}

	username := req.Username
	if username == "" && req.Email != "" {
		username = req.Email
	}

	store.mu.Lock()
	defer store.mu.Unlock()

	if idx, ok := store.UsersByUsername[username]; ok {
		u := store.Users[idx]
		if checkPassword(u.PasswordHash, req.Password) {
			token := generateToken()
			store.Sessions[token] = &Session{
				Token:    token,
				Username: u.Username,
				Expires:  time.Now().Add(7 * 24 * time.Hour).Unix(),
			}

		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    token,
			Path:     "/",
			MaxAge:   7 * 24 * 3600,
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})

			jsonResponse(w, map[string]interface{}{
				"token":    token,
				"username": u.Username,
				"role":     u.Role,
			}, 200)
			return
		}
	}
	errorResponse(w, "invalid credentials", 401)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	cookie, err := r.Cookie("session_token")
	if err == nil {
		store.mu.Lock()
		delete(store.Sessions, cookie.Value)
		store.mu.Unlock()
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "user_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
	})
	jsonResponse(w, map[string]string{"status": "ok"}, 200)
}

func handleSendPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	if r.Method != "POST" { errorResponse(w, "method not allowed", 405); return }

	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, "invalid request", 400); return
	}

	// Always return success to prevent user enumeration
	jsonResponse(w, map[string]interface{}{
		"success": true,
		"message": "If an account exists, a password reset link has been sent",
	}, 200)
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" {
		errorResponse(w, "not logged in", 401); return
	}
	store.mu.RLock()
	defer store.mu.RUnlock()
	if idx, ok := store.UsersByUsername[username]; ok {
		u := store.Users[idx]
		jsonResponse(w, map[string]interface{}{
			"username": u.Username,
			"email":    u.Email,
			"role":     u.Role,
		}, 200)
		return
	}
	errorResponse(w, "user not found", 404)
}

// --- CART HANDLERS ---

func handleCart(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { username = "guest" }

	switch r.Method {
	case "GET":
		store.mu.RLock()
		cart := store.Carts[username]
		if cart == nil { cart = []CartItem{} }
		store.mu.RUnlock()
		jsonResponse(w, cart, 200)

	case "POST":
		var item CartItem
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			errorResponse(w, "invalid request", 400); return
		}
		store.mu.Lock()
		cart := store.Carts[username]
		found := false
		for i, c := range cart {
			if c.ProductID == item.ProductID {
				cart[i].Quantity += item.Quantity
				if cart[i].Quantity <= 0 {
					cart = append(cart[:i], cart[i+1:]...)
				}
				found = true
				break
			}
		}
		if !found && item.Quantity > 0 {
			cart = append(cart, item)
		}
		store.Carts[username] = cart
		store.mu.Unlock()
		jsonResponse(w, cart, 200)

	case "DELETE":
		store.mu.Lock()
		store.Carts[username] = []CartItem{}
		store.mu.Unlock()
		jsonResponse(w, []CartItem{}, 200)

	default:
		errorResponse(w, "method not allowed", 405)
	}
}

func handleCartItem(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { username = "guest" }

	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 { errorResponse(w, "bad path", 400); return }
	productID, err := strconv.Atoi(parts[4])
	if err != nil { errorResponse(w, "invalid product id", 400); return }

	switch r.Method {
	case "PUT":
		var req struct {
			Quantity int `json:"quantity"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			errorResponse(w, "invalid request", 400); return
		}
		store.mu.Lock()
		cart := store.Carts[username]
		for i, c := range cart {
			if c.ProductID == productID {
				if req.Quantity <= 0 {
					cart = append(cart[:i], cart[i+1:]...)
				} else {
					cart[i].Quantity = req.Quantity
				}
				break
			}
		}
		store.Carts[username] = cart
		store.mu.Unlock()
		jsonResponse(w, cart, 200)

	case "DELETE":
		store.mu.Lock()
		cart := store.Carts[username]
		for i, c := range cart {
			if c.ProductID == productID {
				cart = append(cart[:i], cart[i+1:]...)
				break
			}
		}
		store.Carts[username] = cart
		store.mu.Unlock()
		jsonResponse(w, cart, 200)

	default:
		errorResponse(w, "method not allowed", 405)
	}
}

// --- WISHLIST HANDLERS ---

func handleWishlist(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { username = "guest" }

	switch r.Method {
	case "GET":
		store.mu.RLock()
		wl := store.Wishlists[username]
		if wl == nil { wl = []int{} }
		store.mu.RUnlock()
		jsonResponse(w, wl, 200)

	case "POST":
		var req struct {
			ProductID int `json:"product_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			errorResponse(w, "invalid request", 400); return
		}
		if req.ProductID <= 0 {
			errorResponse(w, "invalid product id", 400); return
		}
		store.mu.Lock()
		wl := store.Wishlists[username]
		found := false
		for _, id := range wl {
			if id == req.ProductID {
				found = true
				break
			}
		}
		if !found {
			wl = append(wl, req.ProductID)
			store.Wishlists[username] = wl
		}
		store.mu.Unlock()
		jsonResponse(w, wl, 200)

	case "DELETE":
		store.mu.Lock()
		store.Wishlists[username] = []int{}
		store.mu.Unlock()
		jsonResponse(w, []int{}, 200)

	default:
		errorResponse(w, "method not allowed", 405)
	}
}

func handleWishlistItem(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { username = "guest" }

	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 { errorResponse(w, "bad path", 400); return }
	productID, err := strconv.Atoi(parts[4])
	if err != nil { errorResponse(w, "invalid product id", 400); return }

	if r.Method != "DELETE" { errorResponse(w, "method not allowed", 405); return }

	store.mu.Lock()
	wl := store.Wishlists[username]
	for i, id := range wl {
		if id == productID {
			store.Wishlists[username] = append(wl[:i], wl[i+1:]...)
			break
		}
	}
	store.mu.Unlock()
	jsonResponse(w, store.Wishlists[username], 200)
}

// --- ORDER HANDLERS ---

func handleOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	switch r.Method {
	case "GET":
		store.mu.RLock()
		var userOrders []Order
		if indices, ok := store.OrdersByUsername[username]; ok {
			userOrders = make([]Order, 0, len(indices))
			for _, idx := range indices {
				if idx < len(store.Orders) {
					userOrders = append(userOrders, store.Orders[idx])
				}
			}
		}
		store.mu.RUnlock()
		if userOrders == nil { userOrders = []Order{} }
		jsonResponse(w, userOrders, 200)

	case "POST":
		var req struct {
			Items []CartItem `json:"items"`
			Total float64    `json:"total"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			errorResponse(w, "invalid request", 400); return
		}
		order := Order{
			ID:        generateOrderID(),
			Items:     req.Items,
			Total:     req.Total,
			Status:    "processing",
			CreatedAt: time.Now().Format(time.RFC3339),
			Username:  username,
		}
		store.mu.Lock()
		orderIdx := len(store.Orders)
		store.Orders = append(store.Orders, order)
		store.OrdersByUsername[username] = append(store.OrdersByUsername[username], orderIdx)
		store.Carts[username] = []CartItem{}
		if store.Rewards[username] == nil {
			store.Rewards[username] = &RewardData{Points: 0, Lifetime: 0, Redeemed: make(map[string]bool)}
		}
		points := int(req.Total)
		store.Rewards[username].Points += points
		store.Rewards[username].Lifetime += points
		store.mu.Unlock()

		jsonResponse(w, order, 201)

	default:
		errorResponse(w, "method not allowed", 405)
	}
}

func handleOrderItem(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 { errorResponse(w, "bad path", 400); return }
	orderID := parts[4]

	if r.Method == "DELETE" {
		store.mu.Lock()
		for i, o := range store.Orders {
			if o.ID == orderID && o.Username == username {
				store.Orders = append(store.Orders[:i], store.Orders[i+1:]...)
				break
			}
		}
		store.mu.Unlock()
		jsonResponse(w, map[string]string{"status": "cancelled"}, 200)
		return
	}
	errorResponse(w, "method not allowed", 405)
}

// --- REVIEW HANDLERS ---

func handleReviews(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)

	switch r.Method {
	case "GET":
		productID := r.URL.Query().Get("product_id")
		store.mu.RLock()
		var reviews []Review
		if productID != "" {
			pid, err := strconv.Atoi(productID)
			if err == nil {
				if indices, ok := store.ReviewsByProduct[pid]; ok {
					reviews = make([]Review, 0, len(indices))
					for _, idx := range indices {
						if idx < len(store.Reviews) {
							reviews = append(reviews, store.Reviews[idx])
						}
					}
				}
			}
		} else {
			reviews = make([]Review, len(store.Reviews))
			copy(reviews, store.Reviews)
		}
		store.mu.RUnlock()
		if reviews == nil { reviews = []Review{} }
		jsonResponse(w, reviews, 200)

	case "POST":
		username := getUsername(r)
		if username == "" { errorResponse(w, "unauthorized", 401); return }

		var req struct {
			ProductID int    `json:"product_id"`
			Rating    int    `json:"rating"`
			Comment   string `json:"comment"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			errorResponse(w, "invalid request", 400); return
		}
		if req.ProductID <= 0 {
			errorResponse(w, "invalid product id", 400); return
		}
		if req.Rating < 1 || req.Rating > 5 {
			errorResponse(w, "rating must be 1-5", 400); return
		}
		if len(req.Comment) > 1000 {
			req.Comment = req.Comment[:1000]
		}
		store.mu.Lock()
		revIdx := len(store.Reviews)
		rev := Review{
			ID:        store.NextReviewID,
			ProductID: req.ProductID,
			Username:  username,
			Rating:    req.Rating,
			Comment:   req.Comment,
			CreatedAt: time.Now().Format(time.RFC3339),
		}
		store.Reviews = append(store.Reviews, rev)
		store.ReviewsByProduct[req.ProductID] = append(store.ReviewsByProduct[req.ProductID], revIdx)
		store.NextReviewID++
		store.mu.Unlock()
		jsonResponse(w, rev, 201)

	default:
		errorResponse(w, "method not allowed", 405)
	}
}

// --- REWARDS HANDLERS ---

func handleRewards(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	store.mu.RLock()
	reward := store.Rewards[username]
	store.mu.RUnlock()

	if reward == nil {
		reward = &RewardData{Points: 0, Lifetime: 0, Redeemed: make(map[string]bool)}
	}
	jsonResponse(w, reward, 200)
}

func handleRewardsRedeem(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	if r.Method != "POST" { errorResponse(w, "method not allowed", 405); return }
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	var req struct {
		Perk string `json:"perk"`
		Cost int    `json:"cost"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, "invalid request", 400); return
	}

	store.mu.Lock()
	defer store.mu.Unlock()

	reward := store.Rewards[username]
	if reward == nil {
		reward = &RewardData{Points: 0, Lifetime: 0, Redeemed: make(map[string]bool)}
		store.Rewards[username] = reward
	}

	if reward.Points < req.Cost {
		errorResponse(w, "insufficient points", 400); return
	}
	if reward.Redeemed[req.Perk] {
		errorResponse(w, "perk already redeemed", 400); return
	}

	reward.Points -= req.Cost
	reward.Redeemed[req.Perk] = true
	jsonResponse(w, reward, 200)
}

// --- DISCOUNT HANDLERS ---

func handleDiscountValidate(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	if r.Method != "POST" { errorResponse(w, "method not allowed", 405); return }

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, "invalid request", 400); return
	}

	store.mu.RLock()
	defer store.mu.RUnlock()

	for _, d := range store.Discounts {
		if strings.EqualFold(d.Code, req.Code) {
			if d.Used >= d.MaxUses {
				errorResponse(w, "discount code fully used", 400); return
			}
			if d.ExpiresAt != "" {
				exp, err := time.Parse("2006-01-02", d.ExpiresAt)
				if err == nil && time.Now().After(exp) {
					errorResponse(w, "discount code expired", 400); return
				}
			}
			jsonResponse(w, map[string]interface{}{
				"valid":   true,
				"percent": d.Percent,
				"code":    d.Code,
			}, 200)
			return
		}
	}
	errorResponse(w, "invalid discount code", 400)
}

func handleDiscountApply(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	if r.Method != "POST" { errorResponse(w, "method not allowed", 405); return }

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, "invalid request", 400); return
	}

	store.mu.Lock()
	defer store.mu.Unlock()

	for i, d := range store.Discounts {
		if strings.EqualFold(d.Code, req.Code) {
			if d.Used >= d.MaxUses {
				errorResponse(w, "discount code fully used", 400); return
			}
			store.Discounts[i].Used++
			jsonResponse(w, map[string]interface{}{
				"valid":   true,
				"percent": d.Percent,
				"code":    d.Code,
			}, 200)
			return
		}
	}
	errorResponse(w, "invalid discount code", 400)
}

// --- ADMIN HANDLERS ---

func handleAdminUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	store.mu.RLock()
	isAdmin := false
	if idx, ok := store.UsersByUsername[username]; ok && store.Users[idx].Role == "admin" {
		isAdmin = true
	}
	store.mu.RUnlock()
	if !isAdmin { errorResponse(w, "forbidden", 403); return }

	parts := strings.Split(r.URL.Path, "/")
	if r.Method == "DELETE" && len(parts) >= 5 {
		target := parts[4]
		store.mu.Lock()
		if targetIdx, ok := store.UsersByUsername[target]; ok && store.Users[targetIdx].Role != "admin" {
			// Remove from slice and rebuild index
			store.Users = append(store.Users[:targetIdx], store.Users[targetIdx+1:]...)
			delete(store.UsersByUsername, target)
			// Rebuild index after slice modification
			for uname, idx := range store.UsersByUsername {
				if idx > targetIdx {
					store.UsersByUsername[uname] = idx - 1
				}
			}
			delete(store.Carts, target)
			delete(store.Wishlists, target)
			delete(store.Rewards, target)
		}
		store.mu.Unlock()
		jsonResponse(w, map[string]string{"status": "deleted"}, 200)
		return
	}

	store.mu.RLock()
	var users []map[string]string
	for _, u := range store.Users {
		users = append(users, map[string]string{
			"username": u.Username,
			"email":    u.Email,
			"role":     u.Role,
		})
	}
	store.mu.RUnlock()
	jsonResponse(w, users, 200)
}

func handleAdminClearOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	store.mu.RLock()
	isAdmin := false
	if idx, ok := store.UsersByUsername[username]; ok && store.Users[idx].Role == "admin" {
		isAdmin = true
	}
	store.mu.RUnlock()
	if !isAdmin { errorResponse(w, "forbidden", 403); return }

	if r.Method != "DELETE" { errorResponse(w, "method not allowed", 405); return }
	store.mu.Lock()
	store.Orders = []Order{}
	store.mu.Unlock()
	jsonResponse(w, map[string]string{"status": "cleared"}, 200)
}

// --- PRODUCT MANAGEMENT (admin) ---

func handleAdminProducts(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	store.mu.RLock()
	isAdmin := false
	if idx, ok := store.UsersByUsername[username]; ok && store.Users[idx].Role == "admin" {
		isAdmin = true
	}
	store.mu.RUnlock()
	if !isAdmin { errorResponse(w, "forbidden", 403); return }

	parts := strings.Split(r.URL.Path, "/")

	if r.Method == "PUT" && len(parts) >= 5 {
		productID, err := strconv.Atoi(parts[4])
		if err != nil { errorResponse(w, "invalid product id", 400); return }
		var updates map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
			errorResponse(w, "invalid request", 400); return
		}
		store.mu.Lock()
		for i, p := range store.Products {
			if p.ID == productID {
				if v, ok := updates["name"].(string); ok { store.Products[i].Name = v }
				if v, ok := updates["price"].(float64); ok { store.Products[i].Price = v }
				if v, ok := updates["currency"].(string); ok { store.Products[i].Currency = v }
				if v, ok := updates["category"].(string); ok { store.Products[i].Category = v }
				break
			}
		}
		store.mu.Unlock()
		jsonResponse(w, map[string]string{"status": "updated"}, 200)
		return
	}

	if r.Method == "DELETE" && len(parts) >= 5 {
		productID, err := strconv.Atoi(parts[4])
		if err != nil { errorResponse(w, "invalid product id", 400); return }
		store.mu.Lock()
		for i, p := range store.Products {
			if p.ID == productID {
				store.Products = append(store.Products[:i], store.Products[i+1:]...)
				break
			}
		}
		store.mu.Unlock()
		jsonResponse(w, map[string]string{"status": "deleted"}, 200)
		return
	}

	jsonResponse(w, map[string]string{"error": "method not allowed"}, 405)
}

// --- INVENTORY ---

func handleInventory(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	jsonResponse(w, map[string]string{"status": "ok"}, 200)
}

// --- HEALTH ---

func handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	jsonResponse(w, map[string]interface{}{
		"status":  "ok",
		"service": "elite-shop-go",
		"version": "1.7 Feature Freeze",
	}, 200)
}

func handleLanding(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Elite Shop — Go Service</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               background: #0a0a0a; color: #e0e0e0; display: flex;
               justify-content: center; align-items: center; min-height: 100vh; }
        .card { background: #141414; border: 1px solid #2a2a2a;
                border-radius: 12px; padding: 40px; text-align: center;
                max-width: 400px; width: 90%%; }
        h1 { font-size: 24px; margin-bottom: 16px; color: #fff; }
        .version { font-size: 48px; font-weight: 700; color: #10b981; margin: 16px 0; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px;
                 color: #666; margin-top: 12px; }
        .status { display: inline-block; margin-top: 20px; padding: 6px 16px;
                  background: #0a1a0a; color: #10b981; border-radius: 20px;
                  font-size: 13px; font-weight: 500; }
        .info { margin-top: 24px; font-size: 13px; color: #555; line-height: 1.8; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Elite Shop — Go Service</h1>
        <div class="label">Version</div>
        <div class="version">1.7 Feature Freeze</div>
        <div class="status">&#x25cf; Running</div>
        <div class="info">
            Go / net-http<br>
            Port 3003
        </div>
    </div>
</body>
</html>`)
}

// --- USER PROFILE ---

type UserProfile struct {
	DisplayName string `json:"display_name"`
	Avatar      string `json:"avatar"`
	Bio         string `json:"bio"`
	Theme       string `json:"theme"`
}

func handleProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	switch r.Method {
	case "GET":
		store.mu.RLock()
		profile := store.Profiles[username]
		store.mu.RUnlock()
		if profile == nil {
			profile = &UserProfile{DisplayName: username}
		}
		jsonResponse(w, profile, 200)
	case "PUT":
		var req UserProfile
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			errorResponse(w, "invalid request", 400); return
		}
		store.mu.Lock()
		store.Profiles[username] = &req
		store.mu.Unlock()
		jsonResponse(w, req, 200)
	default:
		errorResponse(w, "method not allowed", 405)
	}
}

func handlePasswordChange(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	if r.Method != "POST" { errorResponse(w, "method not allowed", 405); return }
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, "invalid request", 400); return
	}
	if len(req.NewPassword) < 8 {
		errorResponse(w, "password must be at least 8 characters", 400); return
	}

	store.mu.Lock()
	defer store.mu.Unlock()
	if idx, ok := store.UsersByUsername[username]; ok {
		if !checkPassword(store.Users[idx].PasswordHash, req.OldPassword) {
			errorResponse(w, "incorrect current password", 401); return
		}
		store.Users[idx].PasswordHash = hashPassword(req.NewPassword)
		jsonResponse(w, map[string]string{"status": "password updated"}, 200)
		return
	}
	errorResponse(w, "user not found", 404)
}

// --- RECOMMENDATIONS ---

func handleRecommendations(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)

	store.mu.RLock()
	defer store.mu.RUnlock()

	var recommended []Product

	// Score products by rating and review count
	scored := make([]struct {
		product Product
		score   float64
	}, 0)

	for _, p := range store.Products {
		score := p.Rating*10 + float64(p.Reviews)*0.5
		if p.Featured { score += 20 }
		scored = append(scored, struct {
			product Product
			score   float64
		}{product: p, score: score})
	}

	// Sort by score descending using efficient sort
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	limit := 6
	if len(scored) < limit { limit = len(scored) }
	for i := 0; i < limit; i++ {
		recommended = append(recommended, scored[i].product)
	}

	jsonResponse(w, map[string]interface{}{
		"recommendations": recommended,
		"strategy":        "popularity",
	}, 200)
}

// --- ANALYTICS ---

type AnalyticsSummary struct {
	TotalOrders    int              `json:"total_orders"`
	TotalRevenue   float64          `json:"total_revenue"`
	TotalUsers     int              `json:"total_users"`
	TotalProducts  int              `json:"total_products"`
	TotalReviews   int              `json:"total_reviews"`
	AvgOrderValue  float64          `json:"avg_order_value"`
	OrdersByStatus map[string]int   `json:"orders_by_status"`
	TopProducts    []TopProduct     `json:"top_products"`
	RevenueByDay   []DayRevenue     `json:"revenue_by_day"`
}

type TopProduct struct {
	Name    string  `json:"name"`
	Count   int     `json:"count"`
	Revenue float64 `json:"revenue"`
}

type DayRevenue struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Orders  int     `json:"orders"`
}

func handleAnalyticsSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	store.mu.RLock()
	defer store.mu.RUnlock()

	isAdmin := false
	for _, u := range store.Users {
		if u.Username == username && u.Role == "admin" {
			isAdmin = true; break
		}
	}
	if !isAdmin { errorResponse(w, "forbidden", 403); return }

	summary := AnalyticsSummary{
		OrdersByStatus: make(map[string]int),
		TopProducts:    []TopProduct{},
		RevenueByDay:   []DayRevenue{},
	}

	productRevenue := map[string]*TopProduct{}
	dayData := map[string]*DayRevenue{}

	for _, o := range store.Orders {
		summary.TotalOrders++
		summary.TotalRevenue += o.Total
		summary.OrdersByStatus[o.Status]++

		date := o.CreatedAt
		if len(date) >= 10 {
			date = date[:10]
		} else if date == "" {
			date = "unknown"
		}
		if dayData[date] == nil {
			dayData[date] = &DayRevenue{Date: date}
		}
		dayData[date].Revenue += o.Total
		dayData[date].Orders++

		for _, item := range o.Items {
			key := item.Name
			if productRevenue[key] == nil {
				productRevenue[key] = &TopProduct{Name: key}
			}
			productRevenue[key].Count += item.Quantity
			productRevenue[key].Revenue += item.Price * float64(item.Quantity)
		}
	}

	summary.TotalUsers = len(store.Users)
	summary.TotalProducts = len(store.Products)
	summary.TotalReviews = len(store.Reviews)
	if summary.TotalOrders > 0 {
		summary.AvgOrderValue = summary.TotalRevenue / float64(summary.TotalOrders)
	}

	for _, tp := range productRevenue {
		summary.TopProducts = append(summary.TopProducts, *tp)
	}
	for _, dr := range dayData {
		summary.RevenueByDay = append(summary.RevenueByDay, *dr)
	}

	jsonResponse(w, summary, 200)
}

func handleAnalyticsTrack(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	if r.Method != "POST" { errorResponse(w, "method not allowed", 405); return }

	var req struct {
		Event string            `json:"event"`
		Data  map[string]string `json:"data"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, "invalid request", 400); return
	}
	log.Printf("[ANALYTICS] %s %v", req.Event, req.Data)
	jsonResponse(w, map[string]string{"status": "tracked"}, 200)
}

func handleUserActivity(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" { getCors(w, r); return }
	getCors(w, r)
	username := getUsername(r)
	if username == "" { errorResponse(w, "unauthorized", 401); return }

	switch r.Method {
	case "GET":
		jsonResponse(w, map[string]string{"status": "ok"}, 200)
	case "POST":
		var req struct {
			ProductID int    `json:"product_id"`
			Action    string `json:"action"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			errorResponse(w, "invalid request", 400); return
		}
		log.Printf("[ACTIVITY] user=%s action=%s product=%d", username, req.Action, req.ProductID)
		jsonResponse(w, map[string]string{"status": "tracked"}, 200)
	default:
		errorResponse(w, "method not allowed", 405)
	}
}

// --- ROUTING ---

func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[PANIC] %s %s: %v", r.Method, r.URL.Path, err)
				errorResponse(w, "internal server error", 500)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)
		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", sw.status,
			"duration", time.Since(start).String(),
		)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

type ipRequest struct {
	count    int
	resetAt  time.Time
}

var rateLimiterStore sync.Map
var rateLimiterCount int64
const maxRateLimiterEntries = 10000

func rateLimit(next http.Handler) http.Handler {
	go func() {
		for {
			time.Sleep(time.Minute)
			now := time.Now()
			rateLimiterStore.Range(func(key, value interface{}) bool {
				entry := value.(*ipRequest)
				if now.After(entry.resetAt) {
					rateLimiterStore.Delete(key)
					atomic.AddInt64(&rateLimiterCount, -1)
				}
				return true
			})
		}
	}()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
			ip = strings.Split(fwd, ",")[0]
		} else if fwd := r.Header.Get("X-Real-IP"); fwd != "" {
			ip = fwd
		}

		val, loaded := rateLimiterStore.LoadOrStore(ip, &ipRequest{
			count:   0,
			resetAt: time.Now().Add(time.Minute),
		})
		if !loaded {
			newCount := atomic.AddInt64(&rateLimiterCount, 1)
			if newCount > maxRateLimiterEntries {
				rateLimiterStore.Delete(ip)
				atomic.AddInt64(&rateLimiterCount, -1)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				json.NewEncoder(w).Encode(map[string]string{"error": "rate limit exceeded"})
				return
			}
		}
		entry := val.(*ipRequest)

		if time.Now().After(entry.resetAt) {
			entry.count = 0
			entry.resetAt = time.Now().Add(time.Minute)
		}

		entry.count++
		if entry.count > 100 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{"error": "rate limit exceeded"})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'")
		if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()

	// Health & landing
	mux.HandleFunc("/api/health", handleHealth)
	mux.HandleFunc("/", handleLanding)

	// Auth
	mux.HandleFunc("/api/auth/signup", handleSignup)
	mux.HandleFunc("/api/auth/login", handleLogin)
	mux.HandleFunc("/api/auth/logout", handleLogout)
	mux.HandleFunc("/api/auth/me", handleMe)
	mux.HandleFunc("/api/auth/send-password", handleSendPassword)

	// Cart
	mux.HandleFunc("/api/cart", handleCart)
	mux.HandleFunc("/api/cart/", handleCartItem)

	// Wishlist
	mux.HandleFunc("/api/wishlist", handleWishlist)
	mux.HandleFunc("/api/wishlist/", handleWishlistItem)

	// Orders
	mux.HandleFunc("/api/orders", handleOrders)
	mux.HandleFunc("/api/orders/", handleOrderItem)

	// Reviews
	mux.HandleFunc("/api/reviews", handleReviews)

	// Rewards
	mux.HandleFunc("/api/rewards", handleRewards)
	mux.HandleFunc("/api/rewards/redeem", handleRewardsRedeem)

	// Discounts
	mux.HandleFunc("/api/discounts/validate", handleDiscountValidate)
	mux.HandleFunc("/api/discounts/apply", handleDiscountApply)

	// Admin
	mux.HandleFunc("/api/admin/users", handleAdminUsers)
	mux.HandleFunc("/api/admin/users/", handleAdminUsers)
	mux.HandleFunc("/api/admin/orders", handleAdminClearOrders)
	mux.HandleFunc("/api/admin/products", handleAdminProducts)
	mux.HandleFunc("/api/admin/products/", handleAdminProducts)

	// Profile
	mux.HandleFunc("/api/profile", handleProfile)
	mux.HandleFunc("/api/profile/password", handlePasswordChange)

	// Recommendations
	mux.HandleFunc("/api/recommendations", handleRecommendations)

	// Analytics
	mux.HandleFunc("/api/analytics/summary", handleAnalyticsSummary)
	mux.HandleFunc("/api/analytics/track", handleAnalyticsTrack)

	// Activity tracking
	mux.HandleFunc("/api/activity", handleUserActivity)

	// Inventory
	mux.HandleFunc("/api/inventory", handleInventory)

	slog.Info("Go backend starting", "addr", ":3003", "go_version", runtime.Version())
	server := &http.Server{
		Addr:              ":3003",
		Handler:           recoveryMiddleware(securityHeaders(rateLimit(requestLogger(mux)))),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       30 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited cleanly")
}
