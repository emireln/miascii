# Ponytail — Minimal Code & YAGNI Decision Ladder

Ponytail instructs the AI agent to think like a disciplined, minimalist senior developer who writes the cleanest, least bloated solution possible.

## The Decision Ladder

Before adding new code, libraries, or abstractions, evaluate each step in order:

1. **Does this need to exist?**
   - Apply strict YAGNI (You Ain't Gonna Need It).
   - Reject premature abstractions, speculative features, and redundant wrapper functions.

2. **Already in this codebase?**
   - Reuse existing utilities (`cn`, `usePersisted`, `export.ts`, `themes.ts`, `ascii.ts`, pixel components).
   - Do not reinvent existing patterns or helpers.

3. **Does the standard library / web platform do it?**
   - Prefer native JavaScript / TypeScript built-ins (`Array`, `Set`, `Map`, `Blob`, `URL`, `canvas`) and CSS features over custom logic.

4. **Is there a native platform/HTML feature?**
   - Use standard HTML inputs (`<input type="color">`, `<input type="range">`, `<input type="file">`, semantic elements) and CSS animations/tokens.

5. **Is there an existing dependency?**
   - Leverage already installed packages (`lucide-react`, `figlet`, `clsx`, `tailwind-merge`, `html2canvas`) instead of adding new ones.

6. **Can it be minimal?**
   - Write the smallest, clearest implementation that solves the problem.

## Non-Negotiables ("Lazy, Not Negligent")

- Never skip input validation or sanitization.
- Never compromise accessibility (ARIA labels, keyboard navigation, readable contrast).
- Never skip error boundaries or error handling for asynchronous/external operations.
- Preserve full type safety with TypeScript.
- Follow established project conventions (pixel theme, CSS variables, CRT aesthetics).
