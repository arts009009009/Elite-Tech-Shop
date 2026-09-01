use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::{Html, Json},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use axum::http::{HeaderValue, Method};
use tower_http::cors::{AllowHeaders, AllowMethods, CorsLayer};
use tracing::info;
use tracing_subscriber::EnvFilter;

static PRODUCTS: OnceLock<Vec<RawProduct>> = OnceLock::new();
static SEARCH_INDEX: OnceLock<HashMap<u32, String>> = OnceLock::new();

#[derive(Debug, Deserialize, Serialize, Clone)]
struct Spec {
    name: String,
    value: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct LocaleProduct {
    title: String,
    price: f64,
    currency: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    specs: Vec<Spec>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct RawProduct {
    id: u32,
    category: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    image: Option<String>,
    en: LocaleProduct,
    #[serde(skip_serializing_if = "Option::is_none")]
    ar: Option<LocaleProduct>,
    #[serde(skip_serializing_if = "Option::is_none")]
    ru: Option<LocaleProduct>,
    #[serde(skip_serializing_if = "Option::is_none")]
    fr: Option<LocaleProduct>,
    #[serde(skip_serializing_if = "Option::is_none")]
    es: Option<LocaleProduct>,
}

#[derive(Debug, Serialize)]
struct Product {
    id: u32,
    title: String,
    price: f64,
    currency: String,
    category: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    specs: Vec<Spec>,
    #[serde(skip_serializing_if = "Option::is_none")]
    image: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProductQuery {
    lang: Option<String>,
    category: Option<String>,
    search: Option<String>,
    min_price: Option<f64>,
    max_price: Option<f64>,
    limit: Option<u32>,
}

#[derive(Debug, Serialize)]
struct ProductsResponse {
    products: Vec<Product>,
    total: usize,
}

#[derive(Debug, Serialize)]
struct CategoriesResponse {
    categories: Vec<String>,
    total: usize,
}

#[derive(Debug, Deserialize)]
struct ProductList {
    products: Vec<RawProduct>,
}

impl RawProduct {
    fn to_product(&self, lang: &str) -> Product {
        let locale = self.locale_for(lang);
        Product {
            id: self.id,
            title: locale.title.clone(),
            price: locale.price,
            currency: locale.currency.clone(),
            category: self.category.clone(),
            description: locale.description.clone(),
            specs: locale.specs.clone(),
            image: self.image.clone(),
        }
    }

    fn locale_for(&self, lang: &str) -> &LocaleProduct {
        match lang {
            "ar" => self.ar.as_ref().unwrap_or(&self.en),
            "ru" => self.ru.as_ref().unwrap_or(&self.en),
            "fr" => self.fr.as_ref().unwrap_or(&self.en),
            "es" => self.es.as_ref().unwrap_or(&self.en),
            _ => &self.en,
        }
    }
}

fn get_locale_price(raw: &RawProduct, lang: &str) -> f64 {
    raw.locale_for(lang).price
}

const MAX_LIMIT: u32 = 100;

#[tracing::instrument]
async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({"status": "ok"}))
}

#[tracing::instrument]
async fn index() -> Html<&'static str> {
    Html(r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Elite Shop Products Service</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               background: #0a0a0a; color: #e0e0e0; display: flex;
               justify-content: center; align-items: center; min-height: 100vh; }
        .card { background: #141414; border: 1px solid #2a2a2a;
                border-radius: 12px; padding: 40px; text-align: center;
                max-width: 400px; width: 90%; }
        h1 { font-size: 24px; margin-bottom: 16px; color: #fff; }
        .version { font-size: 48px; font-weight: 700; color: #f59e0b; margin: 16px 0; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px;
                 color: #666; margin-top: 12px; }
        .status { display: inline-block; margin-top: 20px; padding: 6px 16px;
                  background: #1a1a0a; color: #f59e0b; border-radius: 20px;
                  font-size: 13px; }
        .info { margin-top: 24px; font-size: 13px; color: #555; line-height: 1.8; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Elite Shop Products</h1>
        <div class="label">Version</div>
        <div class="version">1.7 Feature Freeze</div>
        <div class="status">&#x25cf; Running</div>
        <div class="info">
            Rust / Axum<br>
            Port 3002
        </div>
    </div>
</body>
</html>"#)
}

#[tracing::instrument]
async fn list_products(Query(query): Query<ProductQuery>) -> Json<serde_json::Value> {
    let products = PRODUCTS.get();
    let Some(products) = products else {
        return Json(serde_json::json!(ProductsResponse { products: vec![], total: 0 }));
    };
    let lang = query.lang.unwrap_or_else(|| "en".to_string());
    let limit = query.limit.unwrap_or(MAX_LIMIT).min(MAX_LIMIT) as usize;

    let search_lower = query.search.as_ref().map(|s| s.to_lowercase());

    let mut filtered: Vec<&RawProduct> = products
        .iter()
        .filter(|p| {
            query
                .category
                .as_ref()
                .is_none_or(|c| c == &p.category)
        })
        .filter(|p| {
            search_lower.as_ref().is_none_or(|s| {
                SEARCH_INDEX
                    .get()
                    .and_then(|idx| idx.get(&p.id))
                    .map(|title| title.contains(s.as_str()))
                    .unwrap_or(false)
            })
        })
        .filter(|p| {
            let price = get_locale_price(p, &lang);
            query.min_price.is_none_or(|min| price >= min)
                && query.max_price.is_none_or(|max| price <= max)
        })
        .collect();
    filtered.sort_by_key(|p| p.id);
    let products: Vec<Product> = filtered.iter().take(limit).map(|p| p.to_product(&lang)).collect();
    let total = products.len();
    Json(serde_json::json!(ProductsResponse { products, total }))
}

#[tracing::instrument]
async fn get_product(Path(id): Path<u32>, Query(query): Query<ProductQuery>) -> Result<Json<serde_json::Value>, StatusCode> {
    let products = PRODUCTS.get().ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
    let lang = query.lang.unwrap_or_else(|| "en".to_string());

    products
        .iter()
        .find(|p| p.id == id)
        .map(|p| Json(serde_json::json!(p.to_product(&lang))))
        .ok_or(StatusCode::NOT_FOUND)
}

#[tracing::instrument]
async fn list_categories() -> Json<serde_json::Value> {
    let products = PRODUCTS.get();
    let Some(products) = products else {
        return Json(serde_json::json!(CategoriesResponse { categories: vec![], total: 0 }));
    };
    let mut categories: Vec<String> = products
        .iter()
        .map(|p| p.category.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    categories.sort();
    let total = categories.len();
    Json(serde_json::json!(CategoriesResponse { categories, total }))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()),
        )
        .init();

    let json_path = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "products.json".to_string());

    let data = match std::fs::read_to_string(&json_path) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("FATAL: Failed to read {}: {}", json_path, e);
            std::process::exit(1);
        }
    };

    let list: ProductList = match serde_json::from_str(&data) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("FATAL: Failed to parse {}: {}", json_path, e);
            std::process::exit(1);
        }
    };

    let count = list.products.len();
    let _ = PRODUCTS.set(list.products);

    // Pre-compute lowercase search index for O(1) lookups
    let products = PRODUCTS.get().unwrap();
    let mut search_index = HashMap::with_capacity(products.len());
    for p in products {
        search_index.insert(p.id, p.en.title.to_lowercase());
    }
    let _ = SEARCH_INDEX.set(search_index);

    let allowed_origins = [
        "http://localhost:3000".parse::<HeaderValue>().unwrap(),
        "http://localhost:3001".parse::<HeaderValue>().unwrap(),
        "https://elite-tech.shop".parse::<HeaderValue>().unwrap(),
    ];

    let cors = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_methods([Method::GET, Method::OPTIONS])
        .allow_headers([axum::http::header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/", get(index))
        .route("/api/health", get(health))
        .route("/api/products", get(list_products))
        .route("/api/products/{id}", get(get_product))
        .route("/api/categories", get(list_categories))
        .layer(cors);

    let addr = std::env::var("LISTEN_ADDR").unwrap_or_else(|_| "0.0.0.0:3002".to_string());

    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("FATAL: Failed to bind {}: {}", addr, e);
            std::process::exit(1);
        }
    };

    info!(count, "Products loaded");
    info!(addr = %addr, "Server listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap_or_else(|e| {
            eprintln!("FATAL: Server error: {}", e);
            std::process::exit(1);
        });
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    info!("Shutting down gracefully...");
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    fn test_product() -> RawProduct {
        RawProduct {
            id: 1,
            category: "laptops".to_string(),
            image: None,
            en: LocaleProduct {
                title: "Test Laptop".to_string(),
                price: 999.0,
                currency: "USD".to_string(),
                description: Some("A test laptop".to_string()),
                specs: vec![],
            },
            ar: Some(LocaleProduct {
                title: "لابتوب تجريبي".to_string(),
                price: 31000.0,
                currency: "EGP".to_string(),
                description: None,
                specs: vec![],
            }),
            ru: None,
            fr: None,
            es: None,
        }
    }

    fn test_product_2() -> RawProduct {
        RawProduct {
            id: 2,
            category: "smartphones".to_string(),
            image: None,
            en: LocaleProduct {
                title: "Test Phone".to_string(),
                price: 799.0,
                currency: "USD".to_string(),
                description: None,
                specs: vec![],
            },
            ar: None,
            ru: None,
            fr: None,
            es: None,
        }
    }

    fn init_products() {
        let _ = PRODUCTS.set(vec![test_product(), test_product_2()]);
    }

    fn app() -> Router {
        init_products();
        Router::new()
            .route("/", get(index))
            .route("/api/health", get(health))
            .route("/api/products", get(list_products))
            .route("/api/products/{id}", get(get_product))
            .route("/api/categories", get(list_categories))
    }

    #[tokio::test]
    async fn test_health_endpoint() {
        let app = app();
        let req = Request::builder()
            .uri("/api/health")
            .body(Body::empty())
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json, serde_json::json!({"status": "ok"}));
    }

    #[tokio::test]
    async fn test_index_returns_html() {
        let app = app();
        let req = Request::builder()
            .uri("/")
            .body(Body::empty())
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let html = String::from_utf8(body.to_vec()).unwrap();
        assert!(html.contains("Elite Shop"));
    }

    #[test]
    fn test_locale_for_english() {
        let product = test_product();
        let locale = product.locale_for("en");
        assert_eq!(locale.title, "Test Laptop");
        assert_eq!(locale.price, 999.0);
        assert_eq!(locale.currency, "USD");
    }

    #[test]
    fn test_locale_for_arabic() {
        let product = test_product();
        let locale = product.locale_for("ar");
        assert_eq!(locale.title, "لابتوب تجريبي");
        assert_eq!(locale.price, 31000.0);
        assert_eq!(locale.currency, "EGP");
    }

    #[test]
    fn test_locale_for_unknown() {
        let product = test_product();
        let locale = product.locale_for("xx");
        assert_eq!(locale.title, "Test Laptop");
        assert_eq!(locale.price, 999.0);
    }

    #[test]
    fn test_get_locale_price() {
        let product = test_product();
        assert_eq!(get_locale_price(&product, "en"), 999.0);
        assert_eq!(get_locale_price(&product, "ar"), 31000.0);
        assert_eq!(get_locale_price(&product, "xx"), 999.0);
    }

    #[test]
    fn test_product_query_deserialize() {
        let json = r#"{"lang":"ar","category":"laptops","search":"mac","min_price":500,"max_price":2000,"limit":10}"#;
        let query: ProductQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.lang.as_deref(), Some("ar"));
        assert_eq!(query.category.as_deref(), Some("laptops"));
        assert_eq!(query.search.as_deref(), Some("mac"));
        assert_eq!(query.min_price, Some(500.0));
        assert_eq!(query.max_price, Some(2000.0));
        assert_eq!(query.limit, Some(10));
    }

    #[test]
    fn test_product_serialization() {
        let product = Product {
            id: 1,
            title: "Test Laptop".to_string(),
            price: 999.0,
            currency: "USD".to_string(),
            category: "laptops".to_string(),
            description: Some("A test".to_string()),
            specs: vec![],
            image: None,
        };
        let json = serde_json::to_value(&product).unwrap();
        assert_eq!(json["id"], 1);
        assert_eq!(json["title"], "Test Laptop");
        assert_eq!(json["price"], 999.0);
        assert_eq!(json["currency"], "USD");
        assert_eq!(json["category"], "laptops");
        assert_eq!(json["description"], "A test");
        assert!(json.get("image").is_none());
    }

    #[test]
    fn test_products_response_serialization() {
        let resp = ProductsResponse {
            products: vec![],
            total: 0,
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["total"], 0);
        assert_eq!(json["products"], serde_json::json!([]));
    }

    #[tokio::test]
    async fn test_list_products_empty() {
        let app = Router::new().route("/api/products", get(list_products));
        let req = Request::builder()
            .uri("/api/products")
            .body(Body::empty())
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        let total = json["total"].as_u64().unwrap();
        let products = json["products"].as_array().unwrap();
        assert_eq!(total as usize, products.len());
    }

    #[tokio::test]
    async fn test_get_product_not_found() {
        let app = app();
        let req = Request::builder()
            .uri("/api/products/999")
            .body(Body::empty())
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    }
}
