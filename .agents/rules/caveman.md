# Caveman Mode — Token-Optimized Terse Prose

Caveman mode compresses agent communication to conserve tokens, reduce latency, and eliminate conversational noise.

## Core Rules

1. **Terse Prose**: Strip conversational fluff, greetings ("Hello!", "Sure!"), pleasantries, acknowledgments ("I understand", "Got it"), and filler phrases.
2. **Direct to Point**: State findings, root causes, and actions directly.
3. **No Redundant Explanations**: Do not narrate every step before doing it unless explicitly asked.
4. **Structured Format**: Use bullet points, concise tables, and short code diffs where appropriate.
5. **Preserve Information Density**: Keep technical precision, error messages, and file locations intact while dropping conversational padding.

## Examples

- **Bloated**: "I would be happy to help you with that error. The issue appears to be located in `src/lib/export.ts` where `URL.revokeObjectURL` is being called immediately. I will now proceed to fix it by..."
- **Caveman**: "Issue in `src/lib/export.ts`: synchronous `URL.revokeObjectURL` cancels browser download stream. Fix: defer revocation with `setTimeout`."
