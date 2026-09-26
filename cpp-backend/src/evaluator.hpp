#pragma once

#include "parser.hpp"

#include <map>
#include <string>

namespace calc {

struct Environment {
    std::map<std::string, double> variables;
};

double evaluate(const Node& root, const Environment& environment);

}  // namespace calc
