# Data model

Language is the union `en | fr | es | de | it | zh-Hans | ko | ja | da | uk | pl | ro | nb | fi | id | tl | ta | hi`. Each entry has id, native label and Intl formatting locale.

A catalog maps complete English source messages to translated text. Numbered slots `{0}`, `{1}` must match the source. Catalog strings are plain text, never HTML.

Preference resolution takes explicit query, saved preference, ordered browser languages, then English. Malformed or unsupported input is ignored. Storage failure leaves an in-memory usable choice.

React locale state owns the active language. A proposed change remains separate until restart confirmation. Cancel preserves the original demo. Confirm saves preference and remounts DemoApp under the new locale. Seed translations retain original IDs, speakers, tags, numerical values and booleans.

Live AgentBrief gains a validated response language with English default for old callers. The prompt uses the validated enum's language name. Existing request IDs and remount cleanup reject stale turns.

Ledger records and simulator parameter/group IDs remain canonical; adapters translate their labels and descriptions only at display boundaries.

Ungrouped whole-dollar input normalizes fullwidth, Devanagari and Tamil decimal digits to their numeric values. Group separators, decimals, exponents and non-USD currency symbols are rejected rather than reinterpreted. Hindi and Tamil use Indian number grouping for display through Intl.
