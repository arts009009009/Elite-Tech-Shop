#include "parser.hpp"

#include <iomanip>
#include <sstream>
#include <utility>

namespace calc {
namespace {

constexpr int kPrecAdd = 1;
constexpr int kPrecMul = 2;
constexpr int kPrecUnary = 3;
constexpr int kPrecPow = 4;
constexpr int kPrecAtom = 100;
constexpr std::size_t kNoOwner = static_cast<std::size_t>(-1);

struct StackEntry {
    enum class Kind { OpenParen, Function, Operator };
    Kind kind = Kind::Operator;
    std::string name;
    int precedence = 0;
    bool right_associative = false;
    bool unary = false;
    std::size_t function_owner = kNoOwner;
    int comma_count = 0;
    std::size_t output_size_at_open = 0;
    std::size_t position = 0;
};

std::string format_number(double value) {
    if (value == 0.0) {
        return "0";
    }
    std::ostringstream stream;
    stream << std::setprecision(15) << value;
    return stream.str();
}

int node_precedence(const Node& node) {
    switch (node.type) {
        case NodeType::Number:
        case NodeType::Variable:
        case NodeType::Function:
            return kPrecAtom;
        case NodeType::UnaryOp:
            return kPrecUnary;
        case NodeType::BinaryOp:
            break;
    }
    if (node.name == "+" || node.name == "-") {
        return kPrecAdd;
    }
    if (node.name == "*" || node.name == "/") {
        return kPrecMul;
    }
    if (node.name == "^") {
        return kPrecPow;
    }
    return kPrecAdd;
}

bool node_right_associative(const Node& node) {
    return node.type == NodeType::UnaryOp ||
           (node.type == NodeType::BinaryOp && node.name == "^");
}

void append_node(std::string& out, const Node& node, int parent_precedence,
                 bool parent_right_associative, bool parent_unary, bool right_child) {
    const int precedence = node_precedence(node);
    bool parenthesize = false;
    if (parent_unary) {
        parenthesize = precedence < parent_precedence || node.type == NodeType::UnaryOp;
    } else if (parent_precedence > 0) {
        if (precedence < parent_precedence) {
            parenthesize = true;
        } else if (precedence == parent_precedence) {
            parenthesize = right_child ? !parent_right_associative : parent_right_associative;
        }
    }

    if (parenthesize) {
        out.push_back('(');
    }

    switch (node.type) {
        case NodeType::Number:
            out += format_number(node.value);
            break;
        case NodeType::Variable:
            out += node.name;
            break;
        case NodeType::Function: {
            out += node.name;
            out.push_back('(');
            for (std::size_t i = 0; i < node.children.size(); ++i) {
                if (i > 0) {
                    out.push_back(',');
                }
                append_node(out, *node.children[i], 0, false, false, false);
            }
            out.push_back(')');
            break;
        }
        case NodeType::UnaryOp:
            out += node.name;
            append_node(out, *node.children[0], kPrecUnary, true, true, true);
            break;
        case NodeType::BinaryOp: {
            const int own = precedence;
            const bool right_assoc = node_right_associative(node);
            append_node(out, *node.children[0], own, right_assoc, false, false);
            if (node.name == "+" || node.name == "-") {
                out.push_back(' ');
                out += node.name;
                out.push_back(' ');
            } else {
                out += node.name;
            }
            append_node(out, *node.children[1], own, right_assoc, false, true);
            break;
        }
    }

    if (parenthesize) {
        out.push_back(')');
    }
}

}  // namespace

NodePtr make_number(double value) {
    auto node = std::make_unique<Node>();
    node->type = NodeType::Number;
    node->value = value;
    return node;
}

NodePtr make_variable(const std::string& name) {
    auto node = std::make_unique<Node>();
    node->type = NodeType::Variable;
    node->name = name;
    return node;
}

NodePtr make_unary(const std::string& op, NodePtr child) {
    auto node = std::make_unique<Node>();
    node->type = NodeType::UnaryOp;
    node->name = op;
    node->children.push_back(std::move(child));
    return node;
}

NodePtr make_binary(const std::string& op, NodePtr lhs, NodePtr rhs) {
    auto node = std::make_unique<Node>();
    node->type = NodeType::BinaryOp;
    node->name = op;
    node->children.push_back(std::move(lhs));
    node->children.push_back(std::move(rhs));
    return node;
}

NodePtr make_function(const std::string& name, std::vector<NodePtr> args) {
    auto node = std::make_unique<Node>();
    node->type = NodeType::Function;
    node->name = name;
    node->children = std::move(args);
    return node;
}

std::unique_ptr<Node> Node::clone() const {
    auto copy = std::make_unique<Node>();
    copy->type = type;
    copy->value = value;
    copy->name = name;
    copy->position = position;
    copy->children.reserve(children.size());
    for (const auto& child : children) {
        copy->children.push_back(child->clone());
    }
    return copy;
}

bool Node::has_variable() const {
    if (type == NodeType::Variable) {
        return true;
    }
    for (const auto& child : children) {
        if (child->has_variable()) {
            return true;
        }
    }
    return false;
}

bool Node::depends_on(const std::string& variable) const {
    if (type == NodeType::Variable) {
        return name == variable;
    }
    for (const auto& child : children) {
        if (child->depends_on(variable)) {
            return true;
        }
    }
    return false;
}

NodePtr build_ast(const std::vector<Token>& tokens) {
    std::vector<NodePtr> output;
    std::vector<StackEntry> stack;
    bool expect_operand = true;

    auto emit = [&](const StackEntry& entry) {
        if (entry.unary) {
            if (output.empty()) {
                throw CalcError("operator '" + entry.name + "' is missing an operand",
                                entry.position);
            }
            NodePtr child = std::move(output.back());
            output.pop_back();
            output.push_back(make_unary(entry.name, std::move(child)));
            return;
        }
        if (output.size() < 2) {
            throw CalcError("operator '" + entry.name + "' is missing an operand",
                            entry.position);
        }
        NodePtr rhs = std::move(output.back());
        output.pop_back();
        NodePtr lhs = std::move(output.back());
        output.pop_back();
        output.push_back(make_binary(entry.name, std::move(lhs), std::move(rhs)));
    };

    auto pop_operators = [&](int incoming_precedence, bool incoming_right) {
        while (!stack.empty() && stack.back().kind == StackEntry::Kind::Operator) {
            const StackEntry& top = stack.back();
            const bool should_pop = incoming_right ? top.precedence > incoming_precedence
                                                   : top.precedence >= incoming_precedence;
            if (!should_pop) {
                break;
            }
            StackEntry entry = top;
            stack.pop_back();
            emit(entry);
        }
    };

    for (std::size_t index = 0; index < tokens.size(); ++index) {
        const Token& token = tokens[index];
        switch (token.kind) {
            case TokenKind::Number:
                output.push_back(make_number(token.value));
                expect_operand = false;
                break;

            case TokenKind::Identifier: {
                const bool is_call =
                    index + 1 < tokens.size() && tokens[index + 1].kind == TokenKind::LParen;
                if (is_call) {
                    if (!is_known_function(token.text)) {
                        throw CalcError("unknown function '" + token.text + "'", token.position);
                    }
                    StackEntry entry;
                    entry.kind = StackEntry::Kind::Function;
                    entry.name = token.text;
                    entry.position = token.position;
                    stack.push_back(std::move(entry));
                    expect_operand = true;
                } else {
                    output.push_back(make_variable(token.text));
                    expect_operand = false;
                }
                break;
            }

            case TokenKind::LParen: {
                StackEntry entry;
                entry.kind = StackEntry::Kind::OpenParen;
                entry.position = token.position;
                if (!stack.empty() && stack.back().kind == StackEntry::Kind::Function) {
                    entry.function_owner = stack.size() - 1;
                }
                entry.output_size_at_open = output.size();
                stack.push_back(std::move(entry));
                expect_operand = true;
                break;
            }

            case TokenKind::RParen: {
                while (!stack.empty() && stack.back().kind == StackEntry::Kind::Operator) {
                    StackEntry entry = stack.back();
                    stack.pop_back();
                    emit(entry);
                }
                if (stack.empty()) {
                    throw CalcError("unmatched ')'", token.position);
                }
                if (stack.back().kind != StackEntry::Kind::OpenParen) {
                    throw CalcError("misplaced ','", token.position);
                }
                StackEntry open = stack.back();
                stack.pop_back();
                if (open.function_owner == kNoOwner && open.comma_count > 0) {
                    throw CalcError("misplaced ','", token.position);
                }
                if (output.size() == open.output_size_at_open) {
                    throw CalcError(open.function_owner == kNoOwner
                                        ? "empty parentheses"
                                        : "missing argument for function call",
                                    token.position);
                }
                if (open.function_owner != kNoOwner) {
                    if (stack.empty() || stack.back().kind != StackEntry::Kind::Function) {
                        throw CalcError("malformed function call", token.position);
                    }
                    StackEntry function = stack.back();
                    stack.pop_back();
                    const int arity = open.comma_count + 1;
                    const int expected = function_arity(function.name);
                    if (arity != expected) {
                        throw CalcError("function '" + function.name + "' expects " +
                                            std::to_string(expected) + " argument(s), got " +
                                            std::to_string(arity),
                                        function.position);
                    }
                    if (output.size() < static_cast<std::size_t>(arity)) {
                        throw CalcError("missing argument for function '" + function.name + "'",
                                        token.position);
                    }
                    std::vector<NodePtr> args(static_cast<std::size_t>(arity));
                    for (int i = arity - 1; i >= 0; --i) {
                        args[static_cast<std::size_t>(i)] = std::move(output.back());
                        output.pop_back();
                    }
                    output.push_back(make_function(function.name, std::move(args)));
                }
                expect_operand = false;
                break;
            }

            case TokenKind::Comma: {
                while (!stack.empty() && stack.back().kind == StackEntry::Kind::Operator) {
                    StackEntry entry = stack.back();
                    stack.pop_back();
                    emit(entry);
                }
                if (stack.empty() || stack.back().kind != StackEntry::Kind::OpenParen) {
                    throw CalcError("misplaced ','", token.position);
                }
                stack.back().comma_count += 1;
                expect_operand = true;
                break;
            }

            case TokenKind::Plus:
            case TokenKind::Minus:
            case TokenKind::Star:
            case TokenKind::Slash:
            case TokenKind::Caret: {
                const bool unary_position =
                    (token.kind == TokenKind::Plus || token.kind == TokenKind::Minus) &&
                    expect_operand;
                if (unary_position && token.kind == TokenKind::Plus) {
                    expect_operand = true;
                    break;
                }
                StackEntry entry;
                entry.kind = StackEntry::Kind::Operator;
                entry.position = token.position;
                entry.name = token.text;
                if (unary_position) {
                    entry.unary = true;
                    entry.precedence = kPrecUnary;
                    entry.right_associative = true;
                    stack.push_back(std::move(entry));
                    expect_operand = true;
                    break;
                }
                if (token.kind == TokenKind::Caret) {
                    entry.precedence = kPrecPow;
                    entry.right_associative = true;
                } else if (token.kind == TokenKind::Star || token.kind == TokenKind::Slash) {
                    entry.precedence = kPrecMul;
                } else {
                    entry.precedence = kPrecAdd;
                }
                pop_operators(entry.precedence, entry.right_associative);
                stack.push_back(std::move(entry));
                expect_operand = true;
                break;
            }

            case TokenKind::End:
                break;
        }
    }

    if (output.empty() && stack.empty()) {
        throw CalcError("empty expression");
    }

    while (!stack.empty()) {
        StackEntry entry = stack.back();
        stack.pop_back();
        if (entry.kind == StackEntry::Kind::OpenParen) {
            throw CalcError("unclosed '('", entry.position);
        }
        if (entry.kind == StackEntry::Kind::Function) {
            throw CalcError("unclosed '('", entry.position);
        }
        emit(entry);
    }

    if (expect_operand) {
        throw CalcError("expression is incomplete", tokens.back().position);
    }
    if (output.size() != 1) {
        throw CalcError("expression contains too many operands", tokens.back().position);
    }
    return std::move(output.front());
}

NodePtr parse(const std::string& expression) {
    return build_ast(tokenize(expression));
}

std::string to_string(const Node& node) {
    std::string out;
    append_node(out, node, 0, false, false, false);
    return out;
}

}  // namespace calc
