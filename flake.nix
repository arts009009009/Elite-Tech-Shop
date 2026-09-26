{
  description = "Elite Shop development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ] (system:
      let
        pkgs = import nixpkgs { inherit system; };
        isLinux = pkgs.stdenv.isLinux;

        # Playwright/Chromium system dependencies (cross-platform)
        playwrightDeps = with pkgs; ([
          xorg.libX11
          xorg.libXcomposite
          xorg.libXcursor
          xorg.libXdamage
          xorg.libXext
          xorg.libXfixes
          xorg.libXi
          xorg.libXrender
          xorg.libXtst
          xorg.libxcb
          libxkbcommon
          atk
          at-spi2-atk
          cairo
          cups
          dbus
          expat
          fontconfig
          freetype
          pango
          glib
          gnutls
          gtk3
          nspr
          nss
          pcre2
          zlib
        ] ++ pkgs.lib.optionals isLinux [
          alsa-lib
          systemd
          util-linux
        ]);
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            # Core languages
            pkgs.nodejs_22
            pkgs.jdk21
            pkgs.go
            pkgs.rustc
            pkgs.cargo
            pkgs.rustfmt
            pkgs.clippy

            # Package managers
            pkgs.pnpm

            # Build tools
            pkgs.maven
            pkgs.pkg-config
            pkgs.openssl

            # Utilities
            pkgs.git
            pkgs.curl
            pkgs.jq
          ] ++ pkgs.lib.optionals isLinux [
            pkgs.docker-compose
          ] ++ playwrightDeps;

          shellHook = ''
            echo ""
            echo "  Elite Shop dev shell"
            echo "  ────────────────────"
            echo "  node $(node --version)   pnpm $(pnpm --version)"
            echo "  java $(java --version 2>&1 | head -1)"
            echo "  go   $(go version | awk '{print $3}')"
            echo "  cargo $(cargo --version | awk '{print $2}')"
            echo ""
            echo "  Run 'pnpm install' to install Node dependencies."
            echo "  Run 'pnpm run dev' to start all services."
            echo ""
            echo "  Windows users: run 'nix develop' inside WSL2."
            echo "  Or run './setup.sh' for guided setup."
            echo ""
          '';

          # Ensure native dependencies are found
          LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath playwrightDeps;
        };
      });
}
