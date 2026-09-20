# Benchmarks and offline checks

Keep prompts and `known-bad/` regression fixtures in Git. Generated reports,
screenshots and input replay dumps belong in the ignored `results/`, `audits/`
and `screenshots/` directories. They are outputs, not application dependencies.
Promote only a small, necessary regression fixture into a test's fixture directory.

Catalog admission evidence stays with each pack in `library/catalog/`. Its
`quality.json` binds the reviewed artifacts to exact hashes; do not delete or
reformat those files as part of an output cleanup.

## Historical results

The Arcade development reports were removed from tracking on 2026-09-20;
the original files remain on the development machine. Historical document paths
refer to the [archived audits](https://github.com/tpypan/murph-e/tree/ba4fd79/bench/audits)
and [benchmark results](https://github.com/tpypan/murph-e/tree/ba4fd79/bench/results).
To recover an individual file without rerunning a benchmark:

```sh
git show ba4fd79:bench/results/<filename> > /tmp/<filename>
```

The [saved usage audit](../docs/api-usage-audit-2026-09-19.md) and its detailed
JSON remain tracked. Its reproduction script needs the original local run and
benchmark files; a fresh checkout alone cannot reproduce that spending history.

## Checks without model calls

Use `pnpm test`, `pnpm test:probe` and `pnpm exercise`. The controlled cabinet UI
checks listed in [AGENTS.md](../AGENTS.md#how-to-verify) block or mock generation.
Paid API benchmarks require new explicit user authorization; historical results
are not permission to rerun them.
