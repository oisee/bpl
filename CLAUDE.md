# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands
- Build: `npm run build` (compiles TypeScript, copies HTML files to dist/)
- Watch: `npm run watch` (runs TypeScript in watch mode)
- Start: `npm start` (runs http-server on dist/ folder)
- Test: `npm test` (builds and runs tests)

## Code Style Guidelines
- Indentation: 2 spaces
- Naming: PascalCase for classes/interfaces, camelCase for methods/variables
- Types: Strong typing with interfaces, minimal use of `any`
- Imports: Use ES modules with `.js` extensions in imports
- Error handling: Use try/catch with specific error messages
- Documentation: JSDoc comments for public methods

## Architecture
- Parser: BpmnLiteParser converts DSL to AST
- Transpilers: Convert AST to various output formats
- Follow existing patterns for new features

## Azure
- Use Azure Best Practices for any Azure-related code