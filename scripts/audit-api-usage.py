#!/usr/bin/env python3
"""Offline audit of saved API usage. Never imports a model SDK or reads credentials."""
import argparse
import collections
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ('input', 'cached', 'output', 'reasoning')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    records, events, malformed = [], collections.defaultdict(list), []
    event_files = sorted(ROOT.glob('runs/*/events.jsonl'))
    for path in event_files:
        for line, raw in enumerate(path.read_text().splitlines(), 1):
            try:
                event = json.loads(raw)
            except ValueError:
                malformed.append(f'{path.relative_to(ROOT)}:{line}')
                continue
            if not isinstance(event.get('usage'), dict):
                continue
            record = dict(runId=path.parent.name, stage=event.get('type'),
                          model=event.get('model') or 'unknown',
                          usage={k: event['usage'][k] for k in FIELDS if k in event['usage']},
                          ms=event.get('ms'), source=f'{path.relative_to(ROOT)}:{line}')
            events[path.parent.name].append(record)
            records.append(record)

    benchmark_ids, bench_calls = set(), {}
    embedded = []
    bench_files = sorted(ROOT.glob('bench/results/*.json'))
    raw_rows = 0
    for path in bench_files:
        report = json.loads(path.read_text())
        for index, row in enumerate(report.get('rows', [])):
            raw_rows += 1
            run_id = row.get('runId')
            if not run_id:
                continue
            benchmark_ids.add(run_id)
            for event in row.get('events', []):
                if isinstance(event.get('usage'), dict):
                    embedded.append((run_id, event['usage']))
            if not isinstance(row.get('tokens'), (int, float)):
                continue
            # Minute-resolution run IDs can collide. Preserve different calls.
            key = (run_id, row['tokens'], row.get('cached', 0),
                   row.get('reasoning', 0), row.get('buildMs'))
            bench_calls.setdefault(key, dict(runId=run_id, stage='build',
                model=report.get('model') or 'unknown',
                usage=dict(output=row['tokens'], cached=row.get('cached', 0), reasoning=row.get('reasoning', 0)),
                ms=row.get('buildMs'), source=f'{path.relative_to(ROOT)}:rows[{index}]'))
    matched = 0
    bench_only = []
    for record in bench_calls.values():
        if any(e['stage'] == 'build' and e['ms'] == record['ms'] and
               all(e['usage'].get(k, 0) == v for k, v in record['usage'].items())
               for e in events[record['runId']]):
            matched += 1
        else:
            bench_only.append(record)
            records.append(record)
    embedded_unmatched = [(rid, u) for rid, u in embedded
                          if not any(e['usage'] == u for e in events[rid])]
    if embedded_unmatched:
        raise RuntimeError('Unmatched nested usage requires manual reconciliation')
    timing_files = sorted(ROOT.glob('runs/*/timings.json'))
    timing_unmatched = []
    for path in timing_files:
        t = json.loads(path.read_text())
        if not any(e['stage'] == 'build' and e['usage'].get('output') == t['tokens']['build']
                   for e in events[path.parent.name]):
            timing_unmatched.append(str(path.relative_to(ROOT)))
    if timing_unmatched:
        raise RuntimeError(f'Unmatched timing usage: {timing_unmatched}')

    def totals(items):
        items = list(items)
        total = collections.Counter()
        for r in items:
            u = r['usage']
            total.update({k: u.get(k, 0) for k in FIELDS})
            # Cache is a subset of input; use it only as a lower bound when input is absent.
            if 'input' not in u:
                total['input'] += u.get('cached', 0)
        return dict(calls=len(items), input_lower_bound=total['input'],
                    cached_input=total['cached'], output=total['output'],
                    recorded_reasoning_subset=total['reasoning'],
                    total_lower_bound=total['input'] + total['output'],
                    calls_missing_full_input=sum('input' not in r['usage'] for r in items))

    collisions = collections.defaultdict(list)
    for r in bench_calls.values():
        collisions[r['runId']].append(r)
    result = dict(
        scope='Saved runs/*/events.jsonl and bench/results/*.json; timings reconciled only. Offline artifact lower bound, not billing.',
        overall=totals(records),
        benchmark_linked=totals(r for r in records if r['runId'] in benchmark_ids),
        model_buckets={m: totals(r for r in records if r['model'] == m)
                       for m in sorted({r['model'] for r in records})},
        event_only=totals(r for rs in events.values() for r in rs),
        benchmark_only_additions=totals(bench_only),
        evidence_counts=dict(event_files=len(event_files), benchmark_json_files=len(bench_files),
            raw_benchmark_rows=raw_rows, unique_benchmark_build_calls=len(bench_calls),
            benchmark_calls_matched_to_events=matched, timings_excluded_as_duplicates=len(timing_files),
            nested_usage_excluded_as_duplicates=len(embedded), benchmark_run_ids=len(benchmark_ids),
            event_files_without_usage=sum(not events[p.parent.name] for p in event_files),
            malformed_event_lines=malformed),
        colliding_benchmark_run_ids={k:v for k,v in collisions.items() if len(v)>1},
        records=records)
    output = json.dumps(result, indent=2) + '\n'
    if args.output:
        args.output.write_text(output)
    print(json.dumps({k:v for k,v in result.items() if k not in ('records', 'colliding_benchmark_run_ids')}, indent=2))

if __name__ == '__main__':
    main()
