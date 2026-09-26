#include "symbolic.hpp"

#include "evaluator.hpp"

#include <cmath>
#include <map>
#include <utility>
#include <vector>

namespace calc {
namespace {

NodePtr derivative_of(const Node& node, const std::string& variable);

NodePtr constant(double value) {
    return make_number(value);
}

NodePtr call1(const std::string& name, NodePtr arg) {
    std::vector<NodePtr> args;
    args.push_back(std::move(arg));
    return make_function(name, std::move(args));
}

NodePtr power_rule(const Node& base, const Node& exponent, const Node& whole,
                   const std::string& variable) {
    if (!exponent.depends_on(variable)) {
        NodePtr shifted = make_binary("-", exponent.clone(), constant(1.0));
        NodePtr powered = make_binary("^", base.clone(), std::move(shifted));
        NodePtr term = make_binary("*", exponent.clone(), std::move(powered));
        return make_binary("*", std::move(term), derivative_of(base, variable));
    }
    if (!base.depends_on(variable)) {
        NodePtr log_base = call1("ln", base.clone());
        NodePtr term = make_binary("*", whole.clone(), std::move(log_base));
        return make_binary("*", std::move(term), derivative_of(exponent, variable));
    }
    NodePtr log_base = call1("ln", base.clone());
    NodePtr first = make_binary("*", derivative_of(exponent, variable), std::move(log_base));
    NodePtr quotient = make_binary("/", derivative_of(base, variable), base.clone());
    NodePtr second = make_binary("*", exponent.clone(), std::move(quotient));
    NodePtr sum = make_binary("+", std::move(first), std::move(second));
    return make_binary("*", whole.clone(), std::move(sum));
}

NodePtr derivative_of_function(const Node& node, const std::string& variable) {
    const std::string& name = node.name;
    const Node& u = *node.children[0];
    NodePtr du = derivative_of(u, variable);

    auto u_clone = [&u] { return u.clone(); };
    auto wrap = [&](const std::string& function_name) {
        return call1(function_name, u_clone());
    };

    if (name == "sin") {
        return make_binary("*", wrap("cos"), std::move(du));
    }
    if (name == "cos") {
        NodePtr term = make_binary("*", wrap("sin"), std::move(du));
        return make_unary("-", std::move(term));
    }
    if (name == "tan") {
        NodePtr denominator = make_binary("^", wrap("cos"), constant(2.0));
        return make_binary("/", std::move(du), std::move(denominator));
    }
    if (name == "sinh") {
        return make_binary("*", wrap("cosh"), std::move(du));
    }
    if (name == "cosh") {
        return make_binary("*", wrap("sinh"), std::move(du));
    }
    if (name == "tanh") {
        NodePtr denominator = make_binary("^", wrap("cosh"), constant(2.0));
        return make_binary("/", std::move(du), std::move(denominator));
    }
    if (name == "asin") {
        NodePtr inner = make_binary("^", u_clone(), constant(2.0));
        NodePtr radicand = make_binary("-", constant(1.0), std::move(inner));
        NodePtr denominator = call1("sqrt", std::move(radicand));
        return make_binary("/", std::move(du), std::move(denominator));
    }
    if (name == "acos") {
        NodePtr inner = make_binary("^", u_clone(), constant(2.0));
        NodePtr radicand = make_binary("-", constant(1.0), std::move(inner));
        NodePtr denominator = call1("sqrt", std::move(radicand));
        NodePtr quotient = make_binary("/", std::move(du), std::move(denominator));
        return make_unary("-", std::move(quotient));
    }
    if (name == "atan") {
        NodePtr inner = make_binary("^", u_clone(), constant(2.0));
        NodePtr denominator = make_binary("+", constant(1.0), std::move(inner));
        return make_binary("/", std::move(du), std::move(denominator));
    }
    if (name == "ln") {
        return make_binary("/", std::move(du), u_clone());
    }
    if (name == "log" || name == "log10") {
        NodePtr scale = call1("ln", constant(10.0));
        NodePtr denominator = make_binary("*", u_clone(), std::move(scale));
        return make_binary("/", std::move(du), std::move(denominator));
    }
    if (name == "log2") {
        NodePtr scale = call1("ln", constant(2.0));
        NodePtr denominator = make_binary("*", u_clone(), std::move(scale));
        return make_binary("/", std::move(du), std::move(denominator));
    }
    if (name == "sqrt") {
        NodePtr denominator = make_binary("*", constant(2.0), wrap("sqrt"));
        return make_binary("/", std::move(du), std::move(denominator));
    }
    if (name == "cbrt") {
        NodePtr squared = make_binary("^", wrap("cbrt"), constant(2.0));
        NodePtr denominator = make_binary("*", constant(3.0), std::move(squared));
        return make_binary("/", std::move(du), std::move(denominator));
    }
    if (name == "exp") {
        return make_binary("*", wrap("exp"), std::move(du));
    }
    if (name == "abs") {
        NodePtr sign = call1("sign", u_clone());
        return make_binary("*", std::move(sign), std::move(du));
    }
    if (name == "pow" && node.children.size() == 2) {
        return power_rule(*node.children[0], *node.children[1], node, variable);
    }

    throw CalcError("symbolic differentiation is not supported for '" + name + "'",
                    node.position);
}

NodePtr derivative_of(const Node& node, const std::string& variable) {
    if (!node.depends_on(variable)) {
        return constant(0.0);
    }

    switch (node.type) {
        case NodeType::Number:
            return constant(0.0);

        case NodeType::Variable:
            return constant(node.name == variable ? 1.0 : 0.0);

        case NodeType::UnaryOp: {
            NodePtr inner = derivative_of(*node.children[0], variable);
            if (node.name == "-") {
                return make_unary("-", std::move(inner));
            }
            if (node.name == "+") {
                return inner;
            }
            throw CalcError("unknown unary operator '" + node.name + "'", node.position);
        }

        case NodeType::BinaryOp: {
            const Node& lhs = *node.children[0];
            const Node& rhs = *node.children[1];
            if (node.name == "+") {
                NodePtr sum = make_binary("+", derivative_of(lhs, variable),
                                          derivative_of(rhs, variable));
                return sum;
            }
            if (node.name == "-") {
                return make_binary("-", derivative_of(lhs, variable),
                                   derivative_of(rhs, variable));
            }
            if (node.name == "*") {
                NodePtr first = make_binary("*", derivative_of(lhs, variable), rhs.clone());
                NodePtr second = make_binary("*", lhs.clone(), derivative_of(rhs, variable));
                return make_binary("+", std::move(first), std::move(second));
            }
            if (node.name == "/") {
                NodePtr first = make_binary("*", derivative_of(lhs, variable), rhs.clone());
                NodePtr second = make_binary("*", lhs.clone(), derivative_of(rhs, variable));
                NodePtr numerator = make_binary("-", std::move(first), std::move(second));
                NodePtr denominator = make_binary("^", rhs.clone(), constant(2.0));
                return make_binary("/", std::move(numerator), std::move(denominator));
            }
            if (node.name == "^") {
                return power_rule(lhs, rhs, node, variable);
            }
            throw CalcError("unknown operator '" + node.name + "'", node.position);
        }

        case NodeType::Function:
            return derivative_of_function(node, variable);
    }

    throw CalcError("invalid expression node", node.position);
}

bool is_number(const Node& node, double value) {
    return node.type == NodeType::Number && node.value == value;
}

bool is_literal(const Node& node) {
    switch (node.type) {
        case NodeType::Number:
            return true;
        case NodeType::Variable:
        case NodeType::Function:
            return false;
        case NodeType::UnaryOp:
            return is_literal(*node.children[0]);
        case NodeType::BinaryOp:
            return is_literal(*node.children[0]) && is_literal(*node.children[1]);
    }
    return false;
}

bool structurally_equal(const Node& lhs, const Node& rhs) {
    if (lhs.type != rhs.type || lhs.name != rhs.name) {
        return false;
    }
    if (lhs.type == NodeType::Number) {
        return lhs.value == rhs.value;
    }
    if (lhs.type == NodeType::Variable) {
        return lhs.name == rhs.name;
    }
    if (lhs.children.size() != rhs.children.size()) {
        return false;
    }
    for (std::size_t i = 0; i < lhs.children.size(); ++i) {
        if (!structurally_equal(*lhs.children[i], *rhs.children[i])) {
            return false;
        }
    }
    return true;
}

bool is_integral_value(double value) {
    return std::isfinite(value) && std::floor(value) == value &&
           std::fabs(value) < 9007199254740992.0;
}

long long greatest_common_divisor(long long lhs, long long rhs) {
    long long a = lhs < 0 ? -lhs : lhs;
    long long b = rhs < 0 ? -rhs : rhs;
    while (b != 0) {
        const long long remainder = a % b;
        a = b;
        b = remainder;
    }
    return a;
}

struct FactorInfo {
    std::string key;
    NodePtr base;
    double exponent = 1.0;
};

FactorInfo factor_info(const Node& factor) {
    FactorInfo info;
    if (factor.type == NodeType::BinaryOp && factor.name == "^" &&
        factor.children[0]->type != NodeType::Number &&
        factor.children[1]->type == NodeType::Number) {
        info.key = to_string(*factor.children[0]);
        info.base = factor.children[0]->clone();
        info.exponent = factor.children[1]->value;
        return info;
    }
    info.key = to_string(factor);
    info.base = factor.clone();
    info.exponent = 1.0;
    return info;
}

void collect_factors(const Node& node, bool in_denominator, bool& negative,
                     std::vector<NodePtr>& numerators, std::vector<NodePtr>& denominators) {
    if (node.type == NodeType::BinaryOp && node.name == "*") {
        collect_factors(*node.children[0], in_denominator, negative, numerators, denominators);
        collect_factors(*node.children[1], in_denominator, negative, numerators, denominators);
        return;
    }
    if (node.type == NodeType::BinaryOp && node.name == "/") {
        collect_factors(*node.children[0], in_denominator, negative, numerators, denominators);
        collect_factors(*node.children[1], !in_denominator, negative, numerators, denominators);
        return;
    }
    if (node.type == NodeType::UnaryOp && node.name == "-") {
        negative = !negative;
        collect_factors(*node.children[0], in_denominator, negative, numerators, denominators);
        return;
    }
    (in_denominator ? denominators : numerators).push_back(node.clone());
}

NodePtr build_product(std::vector<NodePtr> factors, double value, bool has_value) {
    std::vector<NodePtr> terms;
    if (has_value && value != 1.0) {
        terms.push_back(make_number(value));
    }
    for (auto& factor : factors) {
        terms.push_back(std::move(factor));
    }
    if (terms.empty()) {
        return make_number(has_value ? value : 1.0);
    }
    NodePtr accumulator = std::move(terms.front());
    for (std::size_t i = 1; i < terms.size(); ++i) {
        accumulator = make_binary("*", std::move(accumulator), std::move(terms[i]));
    }
    return accumulator;
}

NodePtr normalize_product(const std::string& op, const Node& lhs, const Node& rhs) {
    bool negative = false;
    std::vector<NodePtr> numerators;
    std::vector<NodePtr> denominators;
    collect_factors(lhs, false, negative, numerators, denominators);
    collect_factors(rhs, op == "/", negative, numerators, denominators);

    struct Group {
        NodePtr base;
        double exponent = 0.0;
        int count = 0;
    };

    std::map<std::string, Group> groups;
    auto scan = [&](const std::vector<NodePtr>& factors, bool in_denominator) {
        for (const auto& factor : factors) {
            if (factor->type == NodeType::Number) {
                continue;
            }
            FactorInfo info = factor_info(*factor);
            const double signed_exponent = in_denominator ? -info.exponent : info.exponent;
            auto it = groups.find(info.key);
            if (it == groups.end()) {
                Group group;
                group.base = std::move(info.base);
                group.exponent = signed_exponent;
                group.count = 1;
                groups.emplace(info.key, std::move(group));
            } else {
                it->second.exponent += signed_exponent;
                it->second.count += 1;
            }
        }
    };
    scan(numerators, false);
    scan(denominators, true);

    std::vector<NodePtr> merged_numerators;
    std::vector<NodePtr> merged_denominators;
    std::map<std::string, bool> emitted;
    auto emit = [&](NodePtr factor, bool in_denominator) {
        auto& target = in_denominator ? merged_denominators : merged_numerators;
        if (factor->type == NodeType::Number) {
            target.push_back(std::move(factor));
            return;
        }
        FactorInfo info = factor_info(*factor);
        auto it = groups.find(info.key);
        if (it == groups.end() || it->second.count < 2) {
            target.push_back(std::move(factor));
            return;
        }
        if (emitted[info.key]) {
            return;
        }
        emitted[info.key] = true;
        const double total = it->second.exponent;
        if (total == 0.0) {
            return;
        }
        NodePtr combined = make_binary("^", it->second.base->clone(), make_number(total));
        if (total > 0.0) {
            merged_numerators.push_back(std::move(combined));
        } else {
            merged_denominators.push_back(
                make_binary("^", it->second.base->clone(), make_number(-total)));
        }
    };
    for (auto& factor : numerators) {
        emit(std::move(factor), false);
    }
    for (auto& factor : denominators) {
        emit(std::move(factor), true);
    }

    double numerator_value = 1.0;
    bool has_numerator_value = false;
    std::vector<NodePtr> numerator_factors;
    for (auto& factor : merged_numerators) {
        if (factor->type == NodeType::Number && std::isfinite(factor->value)) {
            const double candidate = numerator_value * factor->value;
            if (std::isfinite(candidate)) {
                numerator_value = candidate;
                has_numerator_value = true;
                continue;
            }
        }
        numerator_factors.push_back(std::move(factor));
    }

    double denominator_value = 1.0;
    bool has_denominator_value = false;
    std::vector<NodePtr> denominator_factors;
    for (auto& factor : merged_denominators) {
        if (factor->type == NodeType::Number && std::isfinite(factor->value)) {
            const double candidate = denominator_value * factor->value;
            if (std::isfinite(candidate)) {
                denominator_value = candidate;
                has_denominator_value = true;
                continue;
            }
        }
        denominator_factors.push_back(std::move(factor));
    }

    if (has_denominator_value && denominator_value != 0.0 && has_numerator_value) {
        bool reduced = false;
        if (is_integral_value(numerator_value) && is_integral_value(denominator_value)) {
            long long numerator = static_cast<long long>(numerator_value);
            long long denominator = static_cast<long long>(denominator_value);
            const long long divisor =
                greatest_common_divisor(numerator, denominator);
            if (divisor > 1) {
                numerator /= divisor;
                denominator /= divisor;
            }
            numerator_value = static_cast<double>(numerator);
            denominator_value = static_cast<double>(denominator);
            reduced = true;
        } else {
            const double quotient = numerator_value / denominator_value;
            if (is_integral_value(quotient)) {
                numerator_value = quotient;
                denominator_value = 1.0;
                reduced = true;
            }
        }
        if (reduced && denominator_value == 1.0) {
            has_denominator_value = false;
        }
    }

    if (negative && has_numerator_value) {
        numerator_value = -numerator_value;
        negative = false;
    }

    NodePtr numerator = build_product(std::move(numerator_factors), numerator_value,
                                      has_numerator_value);
    const bool has_denominator =
        !denominator_factors.empty() || (has_denominator_value && denominator_value != 1.0);
    if (!has_denominator) {
        return negative ? make_unary("-", std::move(numerator)) : std::move(numerator);
    }
    NodePtr denominator = denominator_factors.empty()
                              ? make_number(denominator_value)
                              : build_product(std::move(denominator_factors), denominator_value,
                                              has_denominator_value);
    NodePtr quotient = make_binary("/", std::move(numerator), std::move(denominator));
    return negative ? make_unary("-", std::move(quotient)) : std::move(quotient);
}

NodePtr fold_binary(const std::string& op, const Node& lhs, const Node& rhs) {
    if (op != "+" && op != "-" && op != "*" && op != "/" && op != "^") {
        return nullptr;
    }
    try {
        NodePtr candidate = make_binary(op, lhs.clone(), rhs.clone());
        Environment environment;
        const double value = evaluate(*candidate, environment);
        return make_number(value);
    } catch (const CalcError&) {
        return nullptr;
    }
}

NodePtr step(const Node& node, bool& changed) {
    switch (node.type) {
        case NodeType::Number:
        case NodeType::Variable:
            return node.clone();

        case NodeType::UnaryOp: {
            NodePtr child = step(*node.children[0], changed);
            if (node.name == "-") {
                if (child->type == NodeType::Number) {
                    changed = true;
                    return make_number(-child->value);
                }
                if (child->type == NodeType::UnaryOp && child->name == "-") {
                    changed = true;
                    return std::move(child->children[0]);
                }
            }
            return make_unary(node.name, std::move(child));
        }

        case NodeType::BinaryOp: {
            NodePtr lhs = step(*node.children[0], changed);
            NodePtr rhs = step(*node.children[1], changed);
            const std::string& op = node.name;

            if (is_literal(*lhs) && is_literal(*rhs)) {
                NodePtr folded = fold_binary(op, *lhs, *rhs);
                if (folded) {
                    changed = true;
                    return folded;
                }
            }

            if (op == "+") {
                if (is_number(*lhs, 0.0)) {
                    changed = true;
                    return rhs;
                }
                if (is_number(*rhs, 0.0)) {
                    changed = true;
                    return lhs;
                }
                if (rhs->type == NodeType::Number && rhs->value < 0.0) {
                    changed = true;
                    return make_binary("-", std::move(lhs), make_number(-rhs->value));
                }
                if (rhs->type == NodeType::UnaryOp && rhs->name == "-") {
                    changed = true;
                    return make_binary("-", std::move(lhs), std::move(rhs->children[0]));
                }
            } else if (op == "-") {
                if (is_number(*rhs, 0.0)) {
                    changed = true;
                    return lhs;
                }
                if (is_number(*lhs, 0.0)) {
                    changed = true;
                    return make_unary("-", std::move(rhs));
                }
                if (structurally_equal(*lhs, *rhs)) {
                    changed = true;
                    return make_number(0.0);
                }
                if (rhs->type == NodeType::Number && rhs->value < 0.0) {
                    changed = true;
                    return make_binary("+", std::move(lhs), make_number(-rhs->value));
                }
                if (rhs->type == NodeType::UnaryOp && rhs->name == "-") {
                    changed = true;
                    return make_binary("+", std::move(lhs), std::move(rhs->children[0]));
                }
                if (lhs->type == NodeType::UnaryOp && lhs->name == "-") {
                    changed = true;
                    NodePtr sum = make_binary("+", std::move(lhs->children[0]), std::move(rhs));
                    return make_unary("-", std::move(sum));
                }
            } else if (op == "*") {
                if (is_number(*lhs, 0.0) || is_number(*rhs, 0.0)) {
                    changed = true;
                    return make_number(0.0);
                }
                if (is_number(*lhs, 1.0)) {
                    changed = true;
                    return rhs;
                }
                if (is_number(*rhs, 1.0)) {
                    changed = true;
                    return lhs;
                }
            } else if (op == "/") {
                if (is_number(*rhs, 1.0)) {
                    changed = true;
                    return lhs;
                }
                if (is_number(*lhs, 0.0) && !is_literal(*rhs)) {
                    changed = true;
                    return make_number(0.0);
                }
            } else if (op == "^") {
                if (lhs->type == NodeType::BinaryOp && lhs->name == "^" &&
                    lhs->children[1]->type == NodeType::Number &&
                    is_integral_value(lhs->children[1]->value) &&
                    rhs->type == NodeType::Number && is_integral_value(rhs->value)) {
                    const double exponent = lhs->children[1]->value * rhs->value;
                    if (is_integral_value(exponent)) {
                        changed = true;
                        return make_binary("^", std::move(lhs->children[0]),
                                            make_number(exponent));
                    }
                }
                if (is_number(*rhs, 0.0)) {
                    changed = true;
                    return make_number(1.0);
                }
                if (is_number(*rhs, 1.0)) {
                    changed = true;
                    return lhs;
                }
                if (is_number(*lhs, 1.0)) {
                    changed = true;
                    return make_number(1.0);
                }
            }

            if (op == "*" || op == "/") {
                NodePtr rebuilt = make_binary(op, lhs->clone(), rhs->clone());
                NodePtr normalized = normalize_product(op, *lhs, *rhs);
                if (!structurally_equal(*rebuilt, *normalized)) {
                    changed = true;
                    return normalized;
                }
            }

            return make_binary(op, std::move(lhs), std::move(rhs));
        }

        case NodeType::Function: {
            std::vector<NodePtr> args;
            args.reserve(node.children.size());
            for (const auto& child : node.children) {
                args.push_back(step(*child, changed));
            }
            return make_function(node.name, std::move(args));
        }
    }

    return node.clone();
}

}  // namespace

NodePtr differentiate(const Node& expression, const std::string& variable) {
    return derivative_of(expression, variable);
}

NodePtr simplify(const Node& expression) {
    NodePtr current = expression.clone();
    for (int pass = 0; pass < 64; ++pass) {
        bool changed = false;
        NodePtr next = step(*current, changed);
        current = std::move(next);
        if (!changed) {
            break;
        }
    }
    return current;
}

std::string differentiate_expression(const std::string& expression,
                                     const std::string& variable) {
    NodePtr ast = parse(expression);
    NodePtr derivative = differentiate(*ast, variable);
    NodePtr reduced = simplify(*derivative);
    return to_string(*reduced);
}

}  // namespace calc
