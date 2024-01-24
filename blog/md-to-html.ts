import {unified} from 'https://esm.sh/unified@11'
import remarkParse from 'https://esm.sh/remark-parse@11'
import remarkRehype from 'https://esm.sh/remark-rehype@11'
import rehypeDocument from 'https://esm.sh/rehype-document@7'
import rehypeFormat from 'https://esm.sh/rehype-format@5'
import rehypeHighlight from 'https://esm.sh/rehype-highlight@6'
import rehypeStringify from 'https://esm.sh/rehype-stringify@10'
import { readLines } from "https://deno.land/std@0.200.0/io/read_lines.ts";

const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeDocument, {
        title: 'my lovely blog',
        css: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-light.min.css'
    })
    .use(rehypeFormat)
    .use(rehypeStringify)
    .process(await Deno.readFile(Deno.args[0]))

console.log(String(file))

