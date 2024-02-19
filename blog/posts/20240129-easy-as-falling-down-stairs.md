# Easy as falling down stairs

Next up in the TypeScript learning journey — implementing [Step 2: Eval][]
in [Mal][] (not the deferred functionality for Step 1 as
[mentioned previously][]). This is where the the implementation goes
from turning strings into values to values into calculations.

[Step 2: Eval]: https://github.com/kanaka/mal/blob/master/process/guide.md#step-2-eval
[Mal]: https://github.com/kanaka/mal
[mentioned previously]: https://broquaint.com/blog/learning/2024/01/24/mal-for-me.html

## Learnings in Step 2

While this is the first step on the way to putting the _programming_
in the programming language it's a relatively small step in terms of
the implementation (thank goodness for small steps I say!).

One of the first changes is introducing an "environment", which is to
say something that keeps track of the state of the program i.e
addressable things in the program. This was also my first introduction
to [index signatures][] and where I began to see the ramifications of
the strucutral typing i.e you can't just treat objects as glorified
hash maps, the type checker needs _some_ type info. So this lead to
another new type:

```typescript
export type MalEnv = {
    [index: string]: MalType
}
```

And the creation of the first, statically defined, functions for
calculating in this Mal implementation:

```typescript
const env: MalEnv = {
    '+': malCalc((a,b) => a + b),
    '-': malCalc((a,b) => a - b),
    '*': malCalc((a,b) => a * b),
    '/': malCalc((a,b) => a / b),
}
```

> That looks a little too simple! Where are all the Mal types?

Sure, but do you _want_ casting in your mathematical operations? This
was the original implementation (be prepared to avert your eyes):

```typescript
const env: MalEnv = {
    '+': { type: 'function', value: ((a: MalType, b: MalType) => { type: 'number', value: (a as MalNumber).value + (b as MalNumber).value)) } },
    '-': { type: 'function', value: ((a: MalType, b: MalType) => { type: 'number', value: (a as MalNumber).value - (b as MalNumber).value)) } },
    '*': { type: 'function', value: ((a: MalType, b: MalType) => { type: 'number', value: (a as MalNumber).value * (b as MalNumber).value)) } },
    '/': { type: 'function', value: ((a: MalType, b: MalType) => { type: 'number', value: (a as MalNumber).value / (b as MalNumber).value)) } },
}
```

You'd be forgiven if you lost the key addition, subtraction,
mulitplication and division operators in all that noise! But
unfortunately there's no way around all that casting—Mal functions
take N values of the union type `MalType` and produce another
`MalType`. You may also have missed the new Mal type of `MalFunc`
which is actually a two parter:

```typescript
export type MalFuncSig = (...vals: MalType[]) => MalType
export type MalFunc = {
    type: 'function',
    value: MalFuncSig
}
```

There's the more concise implementation of my verbose description of
the Mal function type. And the reason the function signature (aka
[function type expression][]) is separate is so we can reuse it in a
new layer of abstraction that simplifies creating new Mal values:

```typescript
export const mal = {
    num: function(n: number): MalNumber {
        return { type: 'number', value: n }
    },
    func: function(f: MalFuncSig): MalFunc {
        return { type: 'function', value: f }
    },
    list: function(v: Array<MalType>): MalList {
        return { type: 'list', values: v }
    }
}
```

Now to bring it back to the earlier concisely defined environment I'll
create a high–order function[^1^](#high-order) that takes a pure
TypeScript function, then closes over that to call it from a `MalFunc`
which calls it with numbers cast from a `MalType` and produces a
`MalType` on return (as is the requirement of the type).

> Huh?

I'll let the code speak for itself.

```typescript
function malCalc(f: (x: number, y: number) => number): MalFunc {
    return mal.func((a: MalType, b: MalType) => {
        const x = a as MalNumber
        const y = b as MalNumber 
        return mal.num(f(x.value, y.value))
    })
}
```

The rest of the implementation is fairly rote and isn't interesting in
TypeScript specific ways but for the curious you can see how symbols
are evaluated in the [step2 commit][].

[index signatures]: https://www.typescriptlang.org/docs/handbook/2/objects.html#index-signatures
[function type expression]: https://www.typescriptlang.org/docs/handbook/2/functions.html#function-type-expressions
[step2 commit]: https://github.com/broquaint/mal/commit/1f4b4b633684bb924e38ef1242229f8a8c2a9403

## Deferring escape

So I deferred the deferrables of Step 1 because in previous
implementations of Mal this was one of the hardest parts,
specifically—correctly escaping strings.

> But how hard can escaping strings be?

You might ask. It's not hard when you know how to do it, it just
requires a certain amount of care and attention when the host language
and the language being implemented share the same escape character i.e
[_the_ escape character][] aka backslash. It certainly made my head spin
to make sure that the escapes in Kotlin (my first implementation) were
[correctly representing][] the escapes in Mal.

To get to the point we need to escape the escapes on the way in:

```typescript
// This lives in types.ts but included here for clarity.
interface EscapeMap {
    readonly [index: string]: string;
}
const escapeMap: EscapeMap = { '\\': '\\', 'n': "\n", '"': '"' }

function read_string_value(v: string): MalString {
    if(!v.match(/"$/) || v.length === 1)
        throw 'Unexpected end of input, unbalanced quote?'
    const sv = v.replace(/^"|"$/g, '')
        .replace(/\\(.)/g, (_, c) => c in escapeMap ? escapeMap[c] : c)
    return { type: 'string', value: sv }
}
```

So given a string that _looks_ like a string representation
[^2^](#string-like)—drop the quotes and replace double-escapes with
single escapes, escape + `n` as newline and escape + quote with just the
quote which results in a string where the internals represent the
intended value. This can be seen when printed out (by sticking in a
`console.log` at the appropriate moment):

```
user> "foo\nbar\\baz\"quux"
foo
bar\baz"quux
"foo\nbar\\baz\"quux"
```

And there's the round–tripped value that we produce with `pr_str` to by
unescaping on the way out:

```typescript
const unescapeMap: EscapeMap = { '\\': '\\\\', "\n": '\\n', '"': '\\"' }
const unescapeRe = /\\|\n|"/g

function readable_string(value: string): string {
    return value.replace(unescapeRe, c => unescapeMap[c])
}
```

Finally we on the way out—escape to double escape, newline to escape + `n` and
quote to escape + quote. Both approaches are _slightly_ different to
minimize the need to escape escapes in TypeScript and avoid confusion
with the level of escaping in Mal.

[_the_ escape character]: https://en.wikipedia.org/wiki/Escape_character
[correctly representing]: https://github.com/broquaint/mal/commit/9847ea161d43020860f3936cce3e260f936d8522

## Wrapping up

The other deferrables are either very straightforward, like
implementing keywords, comments and vectors; slightly more interesting
like implementing maps; or not necessary until much later, like
quoting, quasiquoting, unquoting etc (which is where the "code as
data" in Lisps happens). So I'll leave step1 for now, leaving the
latter for later, and revisit them as they crop up in future steps.

In this step I learnt about TypeScripts [function type expressions][]
and its [index types][], both useful tools to have in one's belt when
writing any amount of TypeScript I imagine.

## Footnotes

^1^ name="high-order" Perhaps it's because I'm not a mathematician
(would that I were!) but giving a specific name to functions that
produce functions always struck me as a little odd and confusing. Also
technically that _isn't_ a high-order as it returns an object that
we're using as a representation of a function.
^2^ name="string-like" This function is dispatched on the basis that
i.e `v.indexOf('"') === 0` so it's known to look like the _start_ of a string.
^3^ name="slight-of-hand" to quote the docs:
> A keyword can just be stored as a string with special unicode prefix like 0x29E (or char 0xff/127 if the target language does not have good unicode support) and the printer translates strings with that prefix back to the keyword representation. This makes it easy to use keywords as hash map keys in most languages. You can also store keywords as a unique data type, but you will need to make sure they can be used as hash map keys (which may involve doing a similar prefixed translation anyways).
