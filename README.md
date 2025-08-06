# HTTPCraft MCP

MCP (Model Context Protocol) server for HTTPCraft - enables AI agents to perform sophisticated HTTP API testing and automation through HTTPCraft CLI.

## Quick Start

### Prerequisites
- [Nix](https://nixos.org/download) with flakes enabled
- [Direnv](https://direnv.net/) for automatic environment loading

### Setup
```bash
git clone <repository-url>
cd httpcraft-mcp

# Set up Nix development environment
echo "use flake ." > .envrc
direnv allow

# Install Node.js dependencies
npm install

# Build the project
npm run build

# Run tests
npm run test
```

### Alternative Setup (without Nix)
If you prefer not to use Nix, you'll need to manually install:
- Node.js v20+
- HTTPCraft CLI
- TypeScript

Then run the standard npm commands.

## Development

This project uses a phased implementation approach. See:
- `PRD.md` - Product requirements and scope
- `PIP.md` - Detailed implementation phases
- `AGENTS.md` - AI agent development guidelines

## Architecture

HTTPCraft MCP acts as a thin wrapper around HTTPCraft CLI, providing AI agents with access to HTTPCraft's advanced features through the standardized MCP protocol.

For detailed architecture and implementation guidelines, see the documentation files above.
