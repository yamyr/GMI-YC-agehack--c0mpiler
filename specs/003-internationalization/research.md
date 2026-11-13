# Research and design decisions

- Decision: shared plain JavaScript core with declaration file. Rationale: Vite bundles app imports while the static site copies ES modules verbatim; both can consume the same implementation. Alternative: duplicated TypeScript/JavaScript logic.
- Decision: use BCP 47 identifiers, including `zh-Hans`, `nb`, `id` and `tl`; accept `no` and `fil` aliases. Chinese Traditional and Norwegian Nynorsk are not advertised as supported. Source: https://www.w3.org/International/articles/language-tags/index.en and https://www.w3.org/International/docs/bp-html-lang/.
- Decision: Intl.NumberFormat, DateTimeFormat, ListFormat and PluralRules own locale behavior. No exchange rates or inferred time zone. Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Internationalization.
- Decision: source-based whole-message catalogs, explicit interpolation and text-safe rendering. Missing entries return English. Catalog audit catches gaps rather than filling them with English copies.
- Decision: confirmed restart for app locale switching. Existing reducer stores seed text and user edits together; remounting after confirmation avoids silently corrupting either and disconnects old request handlers.
- Decision: translate native status/error recovery by stable codes in the app, retaining raw diagnostics separately. Live request locale is validated by Rust before it enters the prompt.
- Decision: extend the existing offline advice keyword examples across languages. This improves deterministic demo coverage but cannot make it a general advice classifier; document that limit.
- Decision: single site URLs with query/persisted language. Separate SEO routes and translated video production are excluded explicitly. Media language disclosure is included.
