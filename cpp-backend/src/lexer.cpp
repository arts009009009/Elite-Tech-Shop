#include "lexer.hpp"

#include <cctype>
#include <cstdlib>
#include <map>
#include <utility>

namespace calc {
namespace {

const std::map<std::string, int>& function_table() {
    static const std::map<std::string, int> table = {
        {"abs", 1},   {"acos", 1},  {"asin", 1},  {"atan", 1},   {"atan2", 2},
        {"cbrt", 1},  {"ceil", 1},  {"cos", 1},   {"cosh", 1},   {"exp", 1},
        {"floor", 1}, {"ln", 1},    {"log", 1},   {"log10", 1},  {"log2", 1},
        {"max", 2},   {"min", 2},   {"pow", 2},   {"sign", 1},   {"sin", 1},
        {"sinh", 1},  {"sqrt", 1},  {"tan", 1},   {"tanh", 1},
    };
    return table;
}

bool is_ident_start(char c) {
    return std::isalpha(static_cast<unsigned char>(c)) != 0 || c == '_';
}

bool is_ident_char(char c) {
    return std::isalnum(static_cast<unsigned char>(c)) != 0 || c == '_';
}

bool is_digit(char c) {
    return std::isdigit(static_cast<unsigned char>(c)) != 0;
}

}  // namespace

std::string CalcError::format(const std::string& message, std::size_t position) {
    if (position == static_cast<std::size_t>(-1)) {
        return message;
    }
    return message + " (at position " + std::to_string(position) + ")";
}

CalcError::CalcError(const std::string& message)
    : std::runtime_error(message), position_(static_cast<std::size_t>(-1)) {}

CalcError::CalcError(const std::string& message, std::size_t position)
    : std::runtime_error(format(message, position)), position_(position) {}

const std::vector<std::string>& known_functions() {
    static const std::vector<std::string> names = [] {
        std::vector<std::string> out;
        out.reserve(function_table().size());
        for (const auto& entry : function_table()) {
            out.push_back(entry.first);
        }
        return out;
    }();
    return names;
}

bool is_known_function(const std::string& name) {
    return function_table().find(name) != function_table().end();
}

int function_arity(const std::string& name) {
    auto it = function_table().find(name);
    return it == function_table().end() ? 0 : it->second;
}

std::vector<Token> tokenize(const std::string& input) {
    std::vector<Token> tokens;
    const std::size_t length = input.size();

    auto append = [&](TokenKind kind, std::size_t position, std::string text, double value) {
        if (!tokens.empty()) {
            const TokenKind previous = tokens.back().kind;
            const bool previous_ends_operand =
                previous == TokenKind::Number || previous == TokenKind::RParen ||
                previous == TokenKind::Identifier;
            const bool current_starts_operand = kind == TokenKind::Number ||
                                               kind == TokenKind::LParen ||
                                               kind == TokenKind::Identifier;
            const bool call_expression = previous == TokenKind::Identifier &&
                                         kind == TokenKind::LParen;
            if (previous_ends_operand && current_starts_operand && !call_expression) {
                Token implicit;
                implicit.kind = TokenKind::Star;
                implicit.text = "*";
                implicit.position = position;
                tokens.push_back(std::move(implicit));
            }
        }
        Token token;
        token.kind = kind;
        token.text = std::move(text);
        token.value = value;
        token.position = position;
        tokens.push_back(std::move(token));
    };

    std::size_t i = 0;
    while (i < length) {
        const char c = input[i];
        if (std::isspace(static_cast<unsigned char>(c)) != 0) {
            ++i;
            continue;
        }

        if (is_digit(c) ||
            (c == '.' && i + 1 < length && is_digit(input[i + 1]))) {
            const std::size_t start = i;
            char* end = nullptr;
            const double value = std::strtod(input.c_str() + start, &end);
            if (end == input.c_str() + start) {
                throw CalcError("invalid number literal", start);
            }
            i = static_cast<std::size_t>(end - input.c_str());
            append(TokenKind::Number, start, input.substr(start, i - start), value);
            continue;
        }

        if (is_ident_start(c)) {
            const std::size_t start = i;
            while (i < length && is_ident_char(input[i])) {
                ++i;
            }
            append(TokenKind::Identifier, start, input.substr(start, i - start), 0.0);
            continue;
        }

        switch (c) {
            case '+':
                append(TokenKind::Plus, i, "+", 0.0);
                ++i;
                break;
            case '-':
                append(TokenKind::Minus, i, "-", 0.0);
                ++i;
                break;
            case '*':
                append(TokenKind::Star, i, "*", 0.0);
                ++i;
                break;
            case '/':
                append(TokenKind::Slash, i, "/", 0.0);
                ++i;
                break;
            case '^':
                append(TokenKind::Caret, i, "^", 0.0);
                ++i;
                break;
            case '(':
                append(TokenKind::LParen, i, "(", 0.0);
                ++i;
                break;
            case ')':
                append(TokenKind::RParen, i, ")", 0.0);
                ++i;
                break;
            case ',':
                append(TokenKind::Comma, i, ",", 0.0);
                ++i;
                break;
            default:
                throw CalcError(std::string("unexpected character '") + c + "'", i);
        }
    }

    Token end;
    end.kind = TokenKind::End;
    end.position = length;
    tokens.push_back(std::move(end));
    return tokens;
}

}  // namespace calc
