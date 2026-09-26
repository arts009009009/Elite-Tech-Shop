#pragma once

#include <cstddef>
#include <stdexcept>
#include <string>
#include <vector>

namespace calc {

class CalcError : public std::runtime_error {
public:
    explicit CalcError(const std::string& message);
    CalcError(const std::string& message, std::size_t position);

    std::size_t position() const noexcept { return position_; }

private:
    static std::string format(const std::string& message, std::size_t position);
    std::size_t position_ = static_cast<std::size_t>(-1);
};

enum class TokenKind {
    Number,
    Identifier,
    Plus,
    Minus,
    Star,
    Slash,
    Caret,
    LParen,
    RParen,
    Comma,
    End
};

struct Token {
    TokenKind kind = TokenKind::End;
    std::string text;
    double value = 0.0;
    std::size_t position = 0;
};

std::vector<Token> tokenize(const std::string& input);

const std::vector<std::string>& known_functions();
bool is_known_function(const std::string& name);
int function_arity(const std::string& name);

}  // namespace calc
