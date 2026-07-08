---
name: Express v5 params typing
description: @types/express v5 types req.params values as string|string[], breaking Drizzle eq() calls
---

## Rule
Always cast `req.params.someParam` to `string` before passing to Drizzle `eq()` or assigning to a typed `string` variable.

```typescript
const userId: string = req.params.userId as string;
const sessionId: string = req.params.sessionId as string;
```

**Why:** `@types/express` v5 (^5.0.6 in this project) widened `ParamsDictionary` values from `string` to `string | string[]`. Drizzle ORM's `eq(column, right)` overload 1 expects `right: string | SQLWrapper` — `string[]` breaks this even though route params are always `string` at runtime.

**How to apply:** In every new route file, cast `req.params.*` as `string` when using in Drizzle query conditions or anywhere a plain `string` type is required.
