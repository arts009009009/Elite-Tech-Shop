#include <crow.h>
#include <crow/middlewares/cors.h>

#include "evaluator.hpp"
#include "lexer.hpp"
#include "parser.hpp"
#include "symbolic.hpp"

#include <chrono>
#include <cmath>
#include <cstdint>
#include <exception>
#include <string>

namespace {

constexpr int kPort = 8084;
constexpr const char* kHost = "127.0.0.1";
constexpr std::size_t kMaxExpressionLength = 4096;
constexpr int kDefaultPlotSteps = 500;
constexpr int kMaxPlotSteps = 20000;

crow::response json_error(int status, const std::string& message) {
    crow::json::wvalue body;
    body["error"] = message;
    body["status"] = status;
    return crow::response(status, std::move(body));
}

crow::json::rvalue parse_body(const crow::request& request) {
    crow::json::rvalue body = crow::json::load(request.body);
    if (!body || body.error() || body.t() != crow::json::type::Object) {
        throw calc::CalcError("request body must be a JSON object");
    }
    return body;
}

std::string require_expression(const crow::json::rvalue& body) {
    if (!body.has("expression")) {
        throw calc::CalcError("missing required field \"expression\"");
    }
    const crow::json::rvalue& expression = body["expression"];
    if (expression.t() != crow::json::type::String) {
        throw calc::CalcError("field \"expression\" must be a string");
    }
    const std::string value = expression.s();
    if (value.empty()) {
        throw calc::CalcError("field \"expression\" must not be empty");
    }
    if (value.size() > kMaxExpressionLength) {
        throw calc::CalcError("field \"expression\" exceeds " +
                              std::to_string(kMaxExpressionLength) + " characters");
    }
    return value;
}

double read_number(const crow::json::rvalue& value, const std::string& key) {
    if (value.t() != crow::json::type::Number) {
        throw calc::CalcError("field \"" + key + "\" must be a number");
    }
    const double number = value.d();
    if (!std::isfinite(number)) {
        throw calc::CalcError("field \"" + key + "\" must be a finite number");
    }
    return number;
}

double required_number(const crow::json::rvalue& body, const std::string& key) {
    if (!body.has(key)) {
        throw calc::CalcError("missing required field \"" + key + "\"");
    }
    return read_number(body[key], key);
}

double optional_number(const crow::json::rvalue& body, const std::string& key,
                       double fallback) {
    if (!body.has(key)) {
        return fallback;
    }
    return read_number(body[key], key);
}

std::string require_variable(const crow::json::rvalue& body) {
    const crow::json::rvalue& value = body["variable"];
    if (value.t() != crow::json::type::String) {
        throw calc::CalcError("field \"variable\" must be a string");
    }
    const std::string name = value.s();
    if (name.empty() || name.size() > 64) {
        throw calc::CalcError("field \"variable\" must be between 1 and 64 characters");
    }
    return name;
}

std::int64_t microseconds_between(std::chrono::steady_clock::time_point start,
                                  std::chrono::steady_clock::time_point stop) {
    return static_cast<std::int64_t>(
        std::chrono::duration_cast<std::chrono::microseconds>(stop - start).count());
}

}  // namespace

int main() {
    crow::App<crow::CORSHandler> app;

    auto& cors = app.get_middleware<crow::CORSHandler>();
    cors.global()
        .origin("*")
        .methods(crow::HTTPMethod::GET, crow::HTTPMethod::POST, crow::HTTPMethod::OPTIONS)
        .headers("Origin", "Content-Type", "Accept", "Authorization")
        .max_age(3600);

    CROW_ROUTE(app, "/api/calc/evaluate")
        .methods(crow::HTTPMethod::POST)([](const crow::request& request) -> crow::response {
            try {
                const crow::json::rvalue body = parse_body(request);
                const std::string expression = require_expression(body);

                calc::Environment environment;
                if (body.has("x")) {
                    environment.variables["x"] = read_number(body["x"], "x");
                }

                const auto start = std::chrono::steady_clock::now();
                calc::NodePtr ast = calc::parse(expression);
                const double result = calc::evaluate(*ast, environment);
                const auto stop = std::chrono::steady_clock::now();

                crow::json::wvalue payload;
                payload["expression"] = expression;
                payload["result"] = result;
                payload["time_us"] = microseconds_between(start, stop);
                payload["unit"] = "microseconds";
                return crow::response(200, std::move(payload));
            } catch (const calc::CalcError& error) {
                return json_error(400, error.what());
            } catch (const std::exception& error) {
                return json_error(500, std::string("internal error: ") + error.what());
            } catch (...) {
                return json_error(500, "internal error: unknown exception");
            }
        });

    CROW_ROUTE(app, "/api/calc/differentiate")
        .methods(crow::HTTPMethod::POST)([](const crow::request& request) -> crow::response {
            try {
                const crow::json::rvalue body = parse_body(request);
                const std::string expression = require_expression(body);
                const std::string variable =
                    body.has("variable") ? require_variable(body) : std::string("x");

                const auto start = std::chrono::steady_clock::now();
                const std::string derivative =
                    calc::differentiate_expression(expression, variable);
                const auto stop = std::chrono::steady_clock::now();

                crow::json::wvalue payload;
                payload["expression"] = expression;
                payload["derivative"] = derivative;
                payload["variable"] = variable;
                payload["time_us"] = microseconds_between(start, stop);
                payload["unit"] = "microseconds";
                return crow::response(200, std::move(payload));
            } catch (const calc::CalcError& error) {
                return json_error(400, error.what());
            } catch (const std::exception& error) {
                return json_error(500, std::string("internal error: ") + error.what());
            } catch (...) {
                return json_error(500, "internal error: unknown exception");
            }
        });

    CROW_ROUTE(app, "/api/calc/plot")
        .methods(crow::HTTPMethod::POST)([](const crow::request& request) -> crow::response {
            try {
                const crow::json::rvalue body = parse_body(request);
                const std::string expression = require_expression(body);
                const double min_x = required_number(body, "min_x");
                const double max_x = required_number(body, "max_x");
                const double steps_value = optional_number(body, "steps", kDefaultPlotSteps);
                if (steps_value < 1.0 || steps_value > static_cast<double>(kMaxPlotSteps) ||
                    steps_value != static_cast<double>(static_cast<int>(steps_value))) {
                    throw calc::CalcError("field \"steps\" must be an integer between 1 and " +
                                          std::to_string(kMaxPlotSteps));
                }
                const int steps = static_cast<int>(steps_value);

                if (!(min_x < max_x)) {
                    throw calc::CalcError("field \"min_x\" must be smaller than \"max_x\"");
                }

                calc::NodePtr ast = calc::parse(expression);
                const double span = max_x - min_x;
                const double divisor = steps > 1 ? static_cast<double>(steps - 1) : 1.0;

                crow::json::wvalue points(crow::json::wvalue::list{});
                int failures = 0;
                std::string last_error;
                for (int i = 0; i < steps; ++i) {
                    const double x = min_x + span * static_cast<double>(i) / divisor;
                    crow::json::wvalue point;
                    point["x"] = x;
                    try {
                        calc::Environment environment;
                        environment.variables["x"] = x;
                        point["y"] = calc::evaluate(*ast, environment);
                    } catch (const calc::CalcError& error) {
                        point["y"] = crow::json::wvalue(nullptr);
                        ++failures;
                        last_error = error.what();
                    }
                    points[static_cast<unsigned>(i)] = std::move(point);
                }

                if (failures == steps) {
                    throw calc::CalcError(last_error.empty()
                                              ? "expression could not be evaluated"
                                              : last_error);
                }

                return crow::response(200, std::move(points));
            } catch (const calc::CalcError& error) {
                return json_error(400, error.what());
            } catch (const std::exception& error) {
                return json_error(500, std::string("internal error: ") + error.what());
            } catch (...) {
                return json_error(500, "internal error: unknown exception");
            }
        });

    CROW_LOG_INFO << "Elite Tech Shop calculator backend listening on http://" << kHost << ":"
                  << kPort;

    app.port(kPort).bindaddr(kHost).multithreaded().run();
    return 0;
}
