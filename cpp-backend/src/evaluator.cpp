#include "evaluator.hpp"

#include <algorithm>
#include <cmath>
#include <vector>

namespace calc {
namespace {

double evaluate_node(const Node& root, const Environment& environment);

[[noreturn]] void fail(const Node& node, const std::string& message) {
    if (node.position == static_cast<std::size_t>(-1)) {
        throw CalcError(message);
    }
    throw CalcError(message, node.position);
}

double apply_unary(const std::string& op, double value, const Node& node) {
    if (op == "-") {
        return -value;
    }
    if (op == "+") {
        return value;
    }
    fail(node, "unknown unary operator '" + op + "'");
}

double apply_binary(const std::string& op, double lhs, double rhs, const Node& node) {
    if (op == "+") {
        return lhs + rhs;
    }
    if (op == "-") {
        return lhs - rhs;
    }
    if (op == "*") {
        return lhs * rhs;
    }
    if (op == "/") {
        if (rhs == 0.0) {
            fail(node, "division by zero");
        }
        return lhs / rhs;
    }
    if (op == "^") {
        if (lhs == 0.0 && rhs < 0.0) {
            fail(node, "division by zero (zero raised to a negative power)");
        }
        if (lhs < 0.0 && std::floor(rhs) != rhs) {
            fail(node, "domain error: a negative base requires an integer exponent");
        }
        return std::pow(lhs, rhs);
    }
    fail(node, "unknown operator '" + op + "'");
}

double apply_function(const std::string& name, const std::vector<double>& args,
                      const Node& node) {
    const std::size_t arity = args.size();
    const int expected = function_arity(name);
    if (expected == 0) {
        fail(node, "unknown function '" + name + "'");
    }
    if (arity != static_cast<std::size_t>(expected)) {
        fail(node, "function '" + name + "' expects " + std::to_string(expected) +
                       " argument(s), got " + std::to_string(arity));
    }

    const double a = arity > 0 ? args[0] : 0.0;
    const double b = arity > 1 ? args[1] : 0.0;

    if (name == "abs") return std::fabs(a);
    if (name == "sign") return a > 0.0 ? 1.0 : (a < 0.0 ? -1.0 : 0.0);
    if (name == "floor") return std::floor(a);
    if (name == "ceil") return std::ceil(a);
    if (name == "sqrt") {
        if (a < 0.0) fail(node, "domain error: sqrt of a negative number");
        return std::sqrt(a);
    }
    if (name == "cbrt") return std::cbrt(a);
    if (name == "exp") return std::exp(a);
    if (name == "ln") {
        if (a <= 0.0) fail(node, "domain error: ln requires a positive argument");
        return std::log(a);
    }
    if (name == "log") {
        if (a <= 0.0) fail(node, "domain error: log requires a positive argument");
        return std::log10(a);
    }
    if (name == "log10") {
        if (a <= 0.0) fail(node, "domain error: log10 requires a positive argument");
        return std::log10(a);
    }
    if (name == "log2") {
        if (a <= 0.0) fail(node, "domain error: log2 requires a positive argument");
        return std::log2(a);
    }
    if (name == "sin") return std::sin(a);
    if (name == "cos") return std::cos(a);
    if (name == "tan") return std::tan(a);
    if (name == "sinh") return std::sinh(a);
    if (name == "cosh") return std::cosh(a);
    if (name == "tanh") return std::tanh(a);
    if (name == "asin") {
        if (a < -1.0 || a > 1.0) fail(node, "domain error: asin requires an argument in [-1, 1]");
        return std::asin(a);
    }
    if (name == "acos") {
        if (a < -1.0 || a > 1.0) fail(node, "domain error: acos requires an argument in [-1, 1]");
        return std::acos(a);
    }
    if (name == "atan") return std::atan(a);
    if (name == "atan2") return std::atan2(a, b);
    if (name == "min") return std::min(a, b);
    if (name == "max") return std::max(a, b);
    if (name == "pow") {
        if (a == 0.0 && b < 0.0) {
            fail(node, "division by zero (zero raised to a negative power)");
        }
        if (a < 0.0 && std::floor(b) != b) {
            fail(node, "domain error: a negative base requires an integer exponent");
        }
        return std::pow(a, b);
    }
    fail(node, "unknown function '" + name + "'");
}

double evaluate_node(const Node& root, const Environment& environment) {
    switch (root.type) {
        case NodeType::Number:
            return root.value;

        case NodeType::Variable: {
            auto it = environment.variables.find(root.name);
            if (it != environment.variables.end()) {
                return it->second;
            }
            if (root.name == "pi") {
                return 3.14159265358979323846;
            }
            if (root.name == "e") {
                return 2.71828182845904523536;
            }
            fail(root, "unbound variable '" + root.name + "'");
        }

        case NodeType::UnaryOp:
            return apply_unary(root.name, evaluate_node(*root.children[0], environment), root);

        case NodeType::BinaryOp: {
            const double lhs = evaluate_node(*root.children[0], environment);
            const double rhs = evaluate_node(*root.children[1], environment);
            return apply_binary(root.name, lhs, rhs, root);
        }

        case NodeType::Function: {
            std::vector<double> args;
            args.reserve(root.children.size());
            for (const auto& child : root.children) {
                args.push_back(evaluate_node(*child, environment));
            }
            return apply_function(root.name, args, root);
        }
    }

    fail(root, "invalid expression node");
}

}  // namespace

double evaluate(const Node& root, const Environment& environment) {
    const double value = evaluate_node(root, environment);
    if (!std::isfinite(value)) {
        throw CalcError("result is not a finite number (overflow or undefined operation)");
    }
    return value;
}

}  // namespace calc
