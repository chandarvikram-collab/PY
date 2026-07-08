---
name: Drizzle composite upsert and UUID FK widening
description: Two type gotchas with Drizzle 0.45 + drizzle-zod that affect upserts and eq() calls on non-PK UUID columns
---

## Gotcha 1: composite onConflictDoUpdate target
`onConflictDoUpdate({ target: [col1, col2], set: {...} })` does NOT compile in Drizzle ORM 0.45. The TypeScript overloads do not accept a column array for `target`.

**Fix:** Use an explicit INSERT-if-not-exists / UPDATE-if-exists branch. Since you typically have a prior SELECT to check existing rows (e.g. for `existingMap`), you already know which path to take:
```typescript
if (existingMap[name] !== undefined) {
  await db.update(table).set({...}).where(and(eq(table.userId, id), eq(table.name, name)));
} else {
  await db.insert(table).values({...});
}
```

## Gotcha 2: drizzle-zod widens UUID fields
`createInsertSchema()` from drizzle-zod generates `ZodUUID` for UUID columns, but the inferred TypeScript type for some UUID fields can be `string | string[]` in certain contexts. This breaks `eq(uuidFkColumn, data.userId)`.

**Fix:** Extract a narrowed local variable before the query block:
```typescript
const prUserId: string = Array.isArray(data.userId) ? data.userId[0]! : (data.userId as string);
```

**Why:** The Drizzle `eq()` BinaryOperator overload 1 requires `right: GetColumnData<TColumn, 'raw'> | SQLWrapper`. For UUID columns this is `string | SQLWrapper`. If `data.userId` is `string | string[]`, overload 1 fails and TypeScript cascades TS2769 to the outer `and()` call, making the error look like it's about the column itself.
