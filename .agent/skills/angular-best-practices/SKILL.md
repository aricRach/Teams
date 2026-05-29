---
name: Angular Best Practices
description: Guidelines for Angular 20+ components including signal forms, state separation, and modern syntax.
---

# Angular Best Practices

When working on this project, ensure that code directly adheres to the following modern Angular conventions to maintain stability, readability, and performance.

### 1. Modern Control Flow Syntaxes
Avoid legacy `NgIf` and `NgFor` structural directives. You must always use the new Angular template syntaxes:
- `@if (...) { } @else { }`
- `@for (item of items(); track item.id) { } @empty { }`

### 2. Functional Inputs and Outputs
Do not use `@Input()` or `@Output()` decorators in new code. Rely strictly on the signal-based primitives:
- `myInput = input<string>();`
- `myOutput = output<number>();`
- `myModel = model<boolean>();`

### 3. Angular Signal Forms
If a component needs new inputs or forms, bypass `ngModel` template-driven properties or `ReactiveFormsModule` entirely. Implement the `@angular/forms/signals` architecture, utilizing `form(model, (fields) => { ... })` alongside native wrappers like `pattern()` and `required()`.

### 4. Single Source of Truth
Stick strictly to reactive atomic state. Use `signal()`, `computed()`, and `linkedSignal()` primitives so that UI derivations organically mirror the single state variable without manual desync-prone re-assignments.

### 5. Separation of Concerns
Extract any complex, generalized computations or utility algorithms (like date, time, or formatting transformations) away from the component's core file and place them into isolated utility scripts (e.g., `date-utils.ts`). 

### 6. Avoid Template Logic
Keep the HTML template extremely clean. Avoid embedding complex `.filter()`, ternary operations, or data manipulation directly in the mark-up. Always process complex variables using `computed()` inside the `.ts` file so the template can cleanly bind directly to the result.

### 7. Explicit Styling Encapsulation
Do not use inline `style="..."` assignments inside the HTML. All styling implementations, regardless of size, must belong inside the component's dedicated `.scss` stylesheet to maintain clear boundary structures.

### 8. Meaningfull names
Use meaningful names for variables and functions. Avoid using abbreviations or short names.

### 9. Smart and Dumb Components
Maintain a clear separation between smart (container) components and dumb (presentational) components.
