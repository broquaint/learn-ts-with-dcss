The only logical step from [Step 2: Eval][] has got to be [Step 3: Environments][]
Fortunately this step is another small one wherein variables can be
defined and bindings introduced. This means it will also make for a
small post, speaking of which:

[Step 2: Eval]: https://broquaint.com/blog/learning/2024/01/29/easy-as-falling-down-stairs.html
[Step 3: Environments]: https://github.com/kanaka/mal/blob/master/process/guide.md#step-3-environments

## Once more with generics

The implementation here is pretty straightforward: we introduce an
`Env` class which acts like a linked lookup table like so:

```typescript
export default class Env {
    outer: Env | null;
    data: { [index: string]: MalType };

    constructor(outer?: Env) {
        this.outer = outer ?? null;
        this.data  = {}
    }

    set(k: MalSymbol, v: MalType): MalType {
        this.data[k.value] = v
        return v
    }

    find(k: MalSymbol): Env | null {
        if(k.value in this.data)
            return this
        else
            if(this.outer)
                return this.outer.find(k)
            else
                return null
    }

    get(k: MalSymbol): MalType {
        const env = this.find(k)
        if(env !== null)
            return env.data[k.value]!
        else
            // Slightly awkward error phrasing to satisfy tests.
            throw `The symbol '${k.value}' not found in the environment`
    }
}
```

The only fun new, to me, TypeScript feature there is `??`, aka the
[nullish coalescing operator][][^1^](#nullish-blog), which is a
superb addition to the language (alongside [optional chaining][] which
CoffeeScript [added over 14 years ago][] at the time of writing[^2^](#ideal-language)).
Curious to see what the compiled JavaScript [would look like][] I ran
`deno bundle` and saw an unadorned `??`! So here I am shocked to
discover that this operator, and optional chaining, are
[now in JavaScript][]! What else have I missed …

At any rate the other thing I learnt in this step was the
[`typeof` type operator][], of which I was aware but hadn't had an
opportunity to use in anger. Where I needed it was in making the
generation of lists and vectors generic in `eval_ast`. This can be
seen more apparently in the original code:

```typescript
        case 'list':{
                return ast.values.reduce(
                    (a: MalList, b: MalType) => mal.list(a.values.concat([EVAL(b, env)])),
                    mal.list([])
                );
            }
        case 'vector': {
                return ast.values.reduce(
                    (a: MalVector, b: MalType) => mal.vector(a.values.concat([EVAL(b, env)])),
                    mal.vector([])
                );
            }
```

That looks awfully repetitious doesn't it? If there were a third
instance of that code, for another sequence–related data type say,
then it would absolutely warrant refactoring out. However I'm doing
this for fun and education so I refactored it anyway with the help of
`typeof` and some under the covers parametric typing to look like this:

```typescript
        case 'list':
        case 'vector': {
            const valGen = mal[ast.type]
            const seed = valGen([])
                return ast.values.reduce(
                    (a: typeof seed, b: MalType) => valGen(a.values.concat([EVAL(b, env)])),
                    seed
                )
            }
```

There we have `valGen` as our type–safe value generator for the
relevant Mal type. Then we aggregate to a new value using the `typeof`
the `seed` value, as seen in the `reduce` function signature type and
the TypeScript checker is perfectly happy with the situation and
what's more the tests all pass. Perhaps not the _most_ effective usage
of the `typeof` type operator, using `MalList | MalVector` in its
stead would also suffice, but it is more concise and, one might even
say, apt.

[nullish coalescing operator]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#nullish-coalescing
[optional chaining]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#optional-chaining
[added over 14 years ago]: https://coffeescript.org/#0.3.0
[would look like]: https://gist.github.com/broquaint/47b41f119dcc0def381db04d7a651a18
[now in JavaScript]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing
[`typeof` type operator]: https://www.typescriptlang.org/docs/handbook/2/typeof-types.html

## Conclusion

The type system in TypeScript continues to impress me, even when I
think I don't need to be impressed any more. I've also been tangling
with [`Map`s][] behing the scenes, but that won't get interesting until
the Mal maps need to properly function (maybe not until [Step 9: Try][]?).
And one must not get too distracted when the next step,
[Step 4: If Fn Do][], is right around the corner—the step where we add
functions to the functional programming language!

[`Map`s]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
[Step 9: try]: https://github.com/kanaka/mal/blob/master/process/guide.md#step-9-try
[Step 4: If Fn Do]: https://github.com/kanaka/mal/blob/master/process/guide.md#step-4-if-fn-do

### Footnotes

^1^ name="nullish-blog" Thanks to Marius Schulz's blog entry [Nullish Coalescing: The ?? Operator in TypeScript](https://mariusschulz.com/blog/nullish-coalescing-the-operator-in-typescript)
for turning up in search results! Searching for an equivalent, or even
the literal operator name, in the [official handbook](https://www.typescriptlang.org/docs/handbook/intro.html) didn't get me
anywhere but I knew that _something_ like that existed in TypeScript.
^2^ name="ideal-language" I think my ideal JavaScript would be a
combination of CoffeeScript's expressive with TypeScript's gradual
typing. Maybe I just want to learn [Elm](https://elm-lang.org/) finally?
