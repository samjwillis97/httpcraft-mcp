{
  description = "HTTPCraft MCP - Model Context Protocol server for HTTPCraft CLI";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    flake-utils.url = "github:numtide/flake-utils";

    git-hooks.url = "github:cachix/git-hooks.nix";
    git-hooks.inputs.nixpkgs.follows = "nixpkgs";

    httpcraft.url = "github:samjwillis97/shc-ai";
    httpcraft.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      git-hooks,
      httpcraft,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Pre-commit hooks configuration
        pre-commit-check = git-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            # TypeScript compilation check
            tsc = {
              enable = true;
              name = "TypeScript compilation";
              entry = "${pkgs.nodejs_20}/bin/npm run build";
              files = "\\.(ts|tsx)$";
              language = "system";
              pass_filenames = false;
            };

            # ESLint
            eslint = {
              enable = true;
              name = "ESLint";
              entry = "${pkgs.nodejs_20}/bin/npm run lint";
              files = "\\.(js|jsx|ts|tsx)$";
              language = "system";
              pass_filenames = false;
            };

            # Prettier formatting
            prettier = {
              enable = true;
              name = "Prettier";
              entry = "${pkgs.nodejs_20}/bin/npm run format";
              files = "\\.(js|jsx|ts|tsx|json|md|yaml|yml)$";
              language = "system";
              pass_filenames = false;
            };

            # TypeScript type checking
            type-check = {
              enable = true;
              name = "TypeScript type checking";
              entry = "${pkgs.nodejs_20}/bin/npm run type-check";
              files = "\\.(ts|tsx)$";
              language = "system";
              pass_filenames = false;
            };

            # Jest tests
            jest = {
              enable = true;
              name = "Jest tests";
              entry = "${pkgs.nodejs_20}/bin/npm run test";
              files = "\\.(js|jsx|ts|tsx)$";
              language = "system";
              pass_filenames = false;
            };
          };
        };

      in
      {
        # Pre-commit hooks check
        checks.pre-commit-check = pre-commit-check;

        # Applications
        apps.default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/httpcraft-mcp";
        };

        devShells.default = pkgs.mkShell {
          inherit (pre-commit-check) shellHook;
          buildInputs = with pkgs; [
            # Node.js runtime and package manager
            nodejs_20
            npm-check-updates

            # Development tools
            nodePackages.typescript
            nodePackages.ts-node
            nodePackages.eslint
            nodePackages.prettier

            # Git and version control
            git

            # HTTPCraft CLI (mock for now)
            httpcraft.packages.${system}.default

            # Shell utilities
            which
            curl
            jq

            # Pre-commit hooks
            pre-commit-check.enabledPackages
          ];
        };

        # Packages that can be built
        packages.default = pkgs.buildNpmPackage {
          pname = "httpcraft-mcp";
          version = "0.1.0";

          src = ./.;

          npmDepsHash = "sha256-Hxh8nYGv7KJapY4Y/mRKqorhoVrOkmGxHcZZ4e+YNww=";

          buildPhase = ''
            npm run build
          ''; # Will be filled when package.json exists

          installPhase = ''
            mkdir -p $out/lib/httpcraft-mcp
            mkdir -p $out/bin

            # Copy built JavaScript files and package.json
            cp -r dist $out/lib/httpcraft-mcp/
            cp -r node_modules $out/lib/httpcraft-mcp/
            cp package.json $out/lib/httpcraft-mcp/

            # Create executable wrapper script using substituteInPlace
            cat > $out/bin/httpcraft-mcp << 'EOF'
            #!/usr/bin/env bash
            exec @NODE_BIN@ @OUT_PATH@/lib/httpcraft-mcp/dist/server.js "$@"
            EOF

            ${pkgs.buildPackages.gnused}/bin/sed -i \
              -e "s|@NODE_BIN@|${pkgs.nodejs_20}/bin/node|g" \
              -e "s|@OUT_PATH@|$out|g" \
              $out/bin/httpcraft-mcp
            chmod +x $out/bin/httpcraft-mcp

            # Also make the server.js directly executable for compatibility
            chmod +x $out/lib/httpcraft-mcp/dist/server.js
          '';

          meta = with pkgs.lib; {
            description = "HTTPCraft MCP - Model Context Protocol server for HTTPCraft CLI";
            license = licenses.mit;
            maintainers = [ ];
            platforms = platforms.all;
          };
        };
      }
    );
}
