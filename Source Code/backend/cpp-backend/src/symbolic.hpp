#pragma once

#include "parser.hpp"

#include <string>

namespace calc {

NodePtr differentiate(const Node& expression, const std::string& variable = "x");
NodePtr simplify(const Node& expression);
std::string differentiate_expression(const std::string& expression,
                                     const std::string& variable = "x");

}  // namespace calc
