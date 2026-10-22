#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
# Elite Shop — Cross-platform setup
# Supports: Linux, macOS, Windows (WSL2)
# ──────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[setup]${NC} $*"; }
ok()    { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup]${NC} $*"; }
err()   { echo -e "${RED}[setup]${NC} $*"; }

# ── Detect platform ──────────────────────────────────────

detect_os() {
  case "$(uname -s)" in
    Linux*)   echo "linux" ;;
    Darwin*)  echo "macos" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *)        echo "unknown" ;;
  esac
}

is_wsl() {
  grep -qiE '(microsoft|wsl)' /proc/version 2>/dev/null || \
  [ -n "${WSL_DISTRO_NAME:-}" ]
}

OS=$(detect_os)
IS_WSL=false
if [ "$OS" = "linux" ] && is_wsl; then
  IS_WSL=true
fi

# ── Check for Nix ────────────────────────────────────────

has_nix() {
  command -v nix &>/dev/null
}

# ── Install Nix ──────────────────────────────────────────

install_nix() {
  if has_nix; then
    ok "Nix already installed: $(nix --version)"
    return 0
  fi

  info "Installing Nix (single-user)..."
  curl -L https://nixos.org/nix/install | sh -s -- --no-daemon

  # Source nix for this session
  if [ -f "$HOME/.nix-profile/etc/profile.d/nix.sh" ]; then
    . "$HOME/.nix-profile/etc/profile.d/nix.sh"
  fi

  ok "Nix installed: $(nix --version)"
}

# ── Check for system dependencies ────────────────────────

check_dep() {
  command -v "$1" &>/dev/null
}

check_system_deps() {
  local missing=()

  check_dep node   || missing+=("node (https://nodejs.org)")
  check_dep java   || missing+=("java (https://adoptium.net)")
  # `java` alone is not enough: compiling the backend needs a JDK (javac).
  # A JRE-only install makes `mvn package` fail with "release version 21 not supported".
  check_dep javac  || missing+=('JDK 21 with javac — a JRE is not enough (apt: openjdk-21-jdk-headless, or use `nix develop`)')
  check_dep go     || missing+=("go (https://go.dev/dl)")
  check_dep cargo  || missing+=("rust (https://rustup.rs)")
  check_dep pnpm   || missing+=("pnpm (npm install -g pnpm)")
  check_dep mvn    || missing+=("maven (https://maven.apache.org)")
  # Both are required by the dev script: cmake builds the calculator backend,
  # docker compose brings up the MongoDB dev container.
  check_dep cmake  || missing+=("cmake (https://cmake.org)")
  check_dep docker || missing+=("docker (https://docs.docker.com/get-docker/)")

  if [ ${#missing[@]} -gt 0 ]; then
    warn "Missing system dependencies:"
    for dep in "${missing[@]}"; do
      echo "    - $dep"
    done
    return 1
  fi
  return 0
}

# rustup installs into ~/.cargo/bin and the Go tarball into /usr/local/go —
# neither is on PATH by default. Export them for this session so the final
# "Ready!" check and `pnpm run dev` actually see the toolchains we installed.
add_toolchains_to_path() {
  if [ -f "$HOME/.cargo/env" ]; then
    . "$HOME/.cargo/env"
  fi
  if [ -d /usr/local/go/bin ]; then
    case ":$PATH:" in
      *:/usr/local/go/bin:*) ;;
      *) export PATH="/usr/local/go/bin:$PATH" ;;
    esac
  fi
}

# ── Install deps via package manager fallback ─────────────

install_with_brew() {
  info "Installing dependencies via Homebrew..."
  local formula
  # The `rust` formula is obsolete — install rustup instead (below).
  # Install formulas one by one so a single miss doesn't abort the script.
  for formula in node java go pnpm maven cmake; do
    if brew install "$formula"; then
      ok "Installed $formula"
    else
      warn "brew install $formula failed — install it manually if it is required."
    fi
  done
  if ! check_dep rustup; then
    info "Installing rustup..."
    if ! curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; then
      warn "rustup install failed — install it manually from https://rustup.rs"
    fi
  fi
}

install_with_apt() {
  info "Installing dependencies via apt (Node.js + Rust)..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs maven cmake openjdk-21-jdk-headless
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    || warn "rustup install failed — install it manually from https://rustup.rs"
  curl -LsSf https://get.go.dev/installation | sh \
    || warn "Go install failed — install it manually from https://go.dev/dl"
  npm install -g pnpm
}

# ── Main ─────────────────────────────────────────────────

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       Elite Shop — Setup             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
PLATFORM_LABEL="$OS $(uname -m)"
if $IS_WSL; then
  PLATFORM_LABEL="$PLATFORM_LABEL (WSL2)"
fi
info "Platform: $PLATFORM_LABEL"

# Windows (native, not WSL)
if [ "$OS" = "windows" ] && ! $IS_WSL; then
  err "Native Windows is not supported by Nix."
  echo ""
  echo "  Options:"
  echo "    1. Install WSL2 and run this script from within WSL"
  echo "       https://learn.microsoft.com/windows/wsl/install"
  echo ""
  echo "    2. Use the manual install (see README.md):"
  echo "       - Install Node.js, Java, Go, Rust, pnpm, Maven manually"
  echo "       - Run: pnpm install && pnpm run dev"
  echo ""
  exit 1
fi

# Try Nix first
if has_nix; then
  ok "Nix detected — entering dev shell..."
  echo ""
  exec nix develop --command bash
fi

# No Nix — offer to install or fall back to system deps
echo ""
warn "Nix not found."
echo ""
echo "  Options:"
echo "    1) Install Nix (recommended — reproducible, isolated)"
echo "    2) Install dependencies with your system package manager"
echo "    3) Exit and install manually"
echo ""
read -rp "  Choose [1/2/3]: " choice

case "$choice" in
  1)
    install_nix
    echo ""
    ok "Run: nix develop"
    ;;
  2)
    if ! check_system_deps; then
      if command -v brew &>/dev/null; then
        install_with_brew
      elif command -v apt-get &>/dev/null; then
        install_with_apt
      else
        err "No supported package manager found (brew/apt)."
        err "Install dependencies manually: node, JDK 21, go, rust, pnpm, maven, cmake"
        exit 1
      fi
    fi
    # rustup (~/.cargo/bin) and the Go tarball (/usr/local/go/bin) install
    # outside PATH — export them before re-checking and running pnpm.
    add_toolchains_to_path
    if check_system_deps; then
      ok "All dependencies found!"
    else
      warn "Some dependencies are still missing (see above)."
      warn "The dev script (pnpm run dev) will skip services whose toolchains are absent."
    fi
    pnpm install
    ok "Ready! Run: pnpm run dev"
    ;;
  *)
    info "Exiting. Install dependencies manually and run: pnpm install && pnpm run dev"
    exit 0
    ;;
esac
