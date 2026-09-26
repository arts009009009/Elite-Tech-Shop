#pragma once

#include "lexer.hpp"

#include <memory>
#include <string>
#include <vector>

namespace calc {

enum class NodeType {
    Number,
    Variable,
    UnaryOp,
    BinaryOp,
    Function
};

struct Node {
    NodeType type = NodeType::Number;
    double value = 0.0;
    std::string name;
    std::vector<std::unique_ptr<Node>> children;
    std::size_t position = static_cast<std::size_t>(-1);

    std::unique_ptr<Node> clone() const;
    bool has_variable() const;
    bool depends_on(const std::string& variable) const;
};

using NodePtr = std::unique_ptr<Node>;

NodePtr make_number(double value);
NodePtr make_variable(const std::string& name);
NodePtr make_unary(const std::string& op, NodePtr child);
NodePtr make_binary(const std::string& op, NodePtr lhs, NodePtr rhs);
NodePtr make_function(const std::string& name, std::vector<NodePtr> args);

NodePtr parse(const std::string& expression);
NodePtr build_ast(const std::vector<Token>& tokens);
std::string to_string(const Node& node);

}  // namespace calc
