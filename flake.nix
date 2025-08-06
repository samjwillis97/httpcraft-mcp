{
  description = "HTTPCraft MCP - Model Context Protocol server for HTTPCraft CLI";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # HTTPCraft CLI package
        httpcraft = pkgs.writeScriptBin "httpcraft" ''
          #!${pkgs.bash}/bin/bash
          echo "HTTPCraft CLI mock for development"
          echo "Version: 1.0.0"
          echo "Args: $@"
        '';
        
      in
      {
        devShells.default = pkgs.mkShell {
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
            httpcraft
            
            # Shell utilities
            which
            curl
            jq
          ];
          
          shellHook = ''
            echo "🚀 HTTPCraft MCP Development Environment"
            echo "Node.js version: $(node --version)"
            echo "NPM version: $(npm --version)"
            echo "TypeScript version: $(tsc --version)"
            echo ""
            echo "Available commands:"
            echo "  npm run build    - Build TypeScript"
            echo "  npm run dev      - Development mode"
            echo "  npm run test     - Run tests"
            echo "  npm run lint     - Lint code"
            echo ""
            echo "HTTPCraft CLI available at: $(which httpcraft)"
            echo ""
            
            # Set up environment variables
            export HTTPCRAFT_PATH="$(which httpcraft)"
            export NODE_ENV="development"
            
            # Create .npmrc with sensible defaults if it doesn't exist
            if [ ! -f .npmrc ]; then
              echo "Creating .npmrc with development settings..."
              cat > .npmrc << EOF
save-exact=true
engine-strict=true
EOF
            fi
          '';
        };
        
        # Packages that can be built
        packages.default = pkgs.buildNpmPackage {
          pname = "httpcraft-mcp";
          version = "0.1.0";
          
          src = ./.;
          
          npmDepsHash = ""; # Will be filled when package.json exists
          
          buildPhase = ''
            npm run build
          '';
          
          installPhase = ''
            mkdir -p $out/bin
            cp -r dist $out/
            cp package.json $out/
          '';
        };
      });
}