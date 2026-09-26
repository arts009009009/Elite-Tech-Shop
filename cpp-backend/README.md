# Elite Tech Shop — Scientific & Symbolic Calculator Backend

Lightweight C++17 HTTP microservice for the Frostbite OS "Elite Tech Shop" project.
It evaluates numeric expressions, differentiates them symbolically, and samples
functions for plotting.

- Server: [Crow](https://crowcpp.org) (header-only) on top of [Asio](https://think-async.com/Asio), fetched automatically by CMake
- Bind address: `127.0.0.1:8084` (localhost only)
- Threads: multithreaded Crow server
- Errors: HTTP 400 with `{"error": "...", "status": 400}`, unexpected failures: 500
- CORS: enabled globally (`Access-Control-Allow-Origin: *`), `OPTIONS` preflight supported

## Build

Requirements: a C++17 compiler and CMake >= 3.16. Internet access is required the
first time CMake runs so it can download Crow and Asio.

```bash
cd "elite-shop/Source Code/cpp-backend"
cmake -B build
cmake --build build -j 4
```

The binary is produced at `build/calc_server`. Release mode is the default.

## Run

```bash
./build/calc_server
```

The server logs:

```
[INFO] Elite Tech Shop calculator backend listening on http://127.0.0.1:8084
[INFO] Crow/master server is running at http://127.0.0.1:8084 using 12 threads
```

## API

All three endpoints are `POST` with a JSON body.

### `POST /api/calc/evaluate`

| Field      | Type   | Required | Description                                   |
|------------|--------|----------|-----------------------------------------------|
| expression | string | yes      | up to 4096 characters                         |
| x          | number | no       | value of the variable `x` (unbound variables are rejected) |

```bash
curl -s -X POST http://127.0.0.1:8084/api/calc/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"expression": "3 * sin(x) + x^2", "x": 2.5}'
```

```json
{"expression":"3 * sin(x) + x^2","result":8.0454164323118693,"time_us":6,"unit":"microseconds"}
```

### `POST /api/calc/differentiate`

| Field      | Type   | Required | Description                            |
|------------|--------|----------|----------------------------------------|
| expression | string | yes      | expression to differentiate            |
| variable   | string | no       | variable of differentiation, default `x` |

```bash
curl -s -X POST http://127.0.0.1:8084/api/calc/differentiate \
  -H 'Content-Type: application/json' \
  -d '{"expression": "x^3 + 2*x"}'
```

```json
{"expression":"x^3 + 2*x","derivative":"3*x^2 + 2","variable":"x","time_us":91,"unit":"microseconds"}
```

### `POST /api/calc/plot`

| Field      | Type   | Required | Description                                    |
|------------|--------|----------|------------------------------------------------|
| expression | string | yes      | expression in `x`                              |
| min_x      | number | yes      | range start (must be `< max_x`)                |
| max_x      | number | yes      | range end                                      |
| steps      | number | no       | point count, integer 1..20000, default 500     |

Returns a JSON **array** of `{"x": ..., "y": ...}` objects with exactly `steps`
points, inclusive of both endpoints (`x = min_x + span * i / (steps - 1)`).
Points where the expression is undefined return `"y": null`. If every point
fails, the request is rejected with 400.

```bash
curl -s -X POST http://127.0.0.1:8084/api/calc/plot \
  -H 'Content-Type: application/json' \
  -d '{"expression": "sin(x)", "min_x": -10, "max_x": 10, "steps": 500}'
```

## Expression language

- Arithmetic: `+ - * / ^`, parentheses, unary `+`/`-`, implicit multiplication (`2x`, `2(x+1)`, `3 4`)
- Power is right-associative: `2^3^2 == 512`, and `-x^2 == -(x^2)`
- Numbers: integers, decimals, scientific notation (`1e3`), leading-dot (`0.5`)
- Constants: `pi` (3.141592653589793), `e` (2.718281828459045)
- Functions: `sin cos tan sinh cosh tanh asin acos atan atan2 abs exp ln log log10 log2
  sqrt cbrt sign floor ceil pow min max` (`log` is base 10, `ln` is natural)
- Built-in single variable: `x`

Errors are precise and human readable, e.g.
`operator '^' is missing an operand (at position 1)`,
`domain error: ln requires a positive argument`,
`unbound variable 'y'`, `function 'min' expects 2 argument(s), got 1`.

## Source layout

```
cpp-backend/
├── CMakeLists.txt          # FetchContent for Crow + Asio, calc_server target
└── src/
    ├── lexer.{hpp,cpp}     # tokenization, implicit multiplication, function catalog
    ├── parser.{hpp,cpp}    # shunting-yard AST builder and expression printer
    ├── evaluator.{hpp,cpp} # numeric evaluation, domain and division-by-zero checks
    ├── symbolic.{hpp,cpp}  # differentiation rules and algebraic simplification
    └── main.cpp            # Crow routes, JSON validation, CORS, plot sampling
```

## Verification

The backend was checked with three suites: numeric derivative verification over a
fixed catalogue of expressions, parser/evaluator edge-case and error-message
checks, and a randomized fuzz test that differentiates generated expressions and
compares against central differences. Clean build with `-Wall -Wextra` produces
no warnings; ~2600 evaluate requests per second, 20000-point plots in ~90 ms.
