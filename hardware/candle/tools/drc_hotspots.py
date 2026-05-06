#!/usr/bin/env python3
"""Read-only DRC hotspot analyzer for Candle.

The script consumes KiCad DRC JSON plus an optional PCB file, groups violations
by violation type, net pair, and coarse board region, and prints deterministic
summaries that are useful when recovering routing and clearance issues.
"""

from __future__ import annotations

import argparse
import json
import re
from math import floor
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


PROJECT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DRC_JSON = PROJECT_DIR / "outputs" / "candle-drc.json"
DEFAULT_PCB = PROJECT_DIR / "candle.kicad_pcb"
DEFAULT_REGION_MM = 20.0
DEFAULT_TOP_GROUPS = 20
DEFAULT_TOP_TYPES = 10
DEFAULT_TOP_PAIRS = 12
DEFAULT_TOP_REGIONS = 12
DEFAULT_EXAMPLES = 3

NET_RE = re.compile(r"\[(?P<net>[^\]]+)\]")
SHORTING_RE = re.compile(r"nets\s+(?P<a>.+?)\s+and\s+(?P<b>.+?)(?:\)|$)")


@dataclass(frozen=True)
class ItemInfo:
    description: str
    net: str
    x: float | None
    y: float | None


@dataclass(frozen=True)
class ViolationRecord:
    index: int
    type: str
    severity: str
    description: str
    items: tuple[ItemInfo, ...]
    pair: tuple[str, str]
    region: str
    centroid: tuple[float, float] | None
    bbox: tuple[float, float, float, float] | None


def load_json(path: Path) -> dict[str, object]:
    if not path.exists():
        raise FileNotFoundError(f"DRC JSON not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_net(value: str | None) -> str:
    if value is None:
        return "<unknown>"
    cleaned = value.strip()
    if not cleaned:
        return "<unknown>"
    return cleaned


def net_from_description(description: str) -> str:
    match = NET_RE.search(description)
    if not match:
        return "<unknown>"
    return normalize_net(match.group("net"))


def pair_from_description(description: str) -> tuple[str, str] | None:
    match = SHORTING_RE.search(description)
    if not match:
        return None
    left, right = sorted((normalize_net(match.group("a")), normalize_net(match.group("b"))))
    return (left, right)


def parse_point(value: object) -> tuple[float | None, float | None]:
    if not isinstance(value, dict):
        return (None, None)
    x = value.get("x")
    y = value.get("y")
    try:
        return (float(x), float(y))
    except (TypeError, ValueError):
        return (None, None)


def parse_item(item: dict[str, object]) -> ItemInfo:
    description = str(item.get("description", ""))
    net = net_from_description(description)
    x, y = parse_point(item.get("pos"))
    return ItemInfo(description=description, net=net, x=x, y=y)


def pair_from_items(items: Iterable[ItemInfo]) -> tuple[str, str]:
    nets = [item.net for item in items if item.net != "<unknown>"]
    if not nets:
        return ("<unknown>", "<unknown>")
    if len(nets) == 1:
        return (nets[0], "<unknown>")
    left, right = sorted((nets[0], nets[1]))
    return (left, right)


def centroid_and_bbox(items: Iterable[ItemInfo]) -> tuple[tuple[float, float] | None, tuple[float, float, float, float] | None]:
    points = [(item.x, item.y) for item in items if item.x is not None and item.y is not None]
    if not points:
        return (None, None)
    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    centroid = (sum(xs) / len(xs), sum(ys) / len(ys))
    bbox = (min(xs), min(ys), max(xs), max(ys))
    return (centroid, bbox)


def region_label(centroid: tuple[float, float] | None, region_mm: float) -> str:
    if centroid is None:
        return "region=<unknown>"
    x, y = centroid
    x0 = floor(x / region_mm) * region_mm
    y0 = floor(y / region_mm) * region_mm
    x1 = x0 + region_mm
    y1 = y0 + region_mm
    return f"region=x{x0:g}..{x1:g}mm y{y0:g}..{y1:g}mm"


def load_drc_records(path: Path, region_mm: float) -> list[ViolationRecord]:
    data = load_json(path)
    violations = data.get("violations", [])
    if not isinstance(violations, list):
        raise ValueError("DRC JSON violations field is not a list")

    records: list[ViolationRecord] = []
    for index, violation in enumerate(violations, start=1):
        if not isinstance(violation, dict):
            continue
        items_raw = violation.get("items", [])
        if not isinstance(items_raw, list):
            items_raw = []
        items = tuple(parse_item(item) for item in items_raw if isinstance(item, dict))
        pair = pair_from_description(str(violation.get("description", "")))
        if pair is None:
            pair = pair_from_items(items)
        centroid, bbox = centroid_and_bbox(items)
        records.append(
            ViolationRecord(
                index=index,
                type=str(violation.get("type", "unknown")),
                severity=str(violation.get("severity", "unknown")),
                description=str(violation.get("description", "")),
                items=items,
                pair=pair,
                region=region_label(centroid, region_mm),
                centroid=centroid,
                bbox=bbox,
            )
        )
    return records


def fmt_float(value: float | None, digits: int = 1) -> str:
    if value is None:
        return "?"
    return f"{value:.{digits}f}"


def fmt_pair(pair: tuple[str, str]) -> str:
    a, b = pair
    if a == b:
        return a
    return f"{a} <-> {b}"


def summarize(records: list[ViolationRecord], top_groups: int, top_types: int, top_pairs: int, top_regions: int, examples: int) -> str:
    lines: list[str] = []
    total = len(records)
    type_counts = Counter(record.type for record in records)
    pair_counts = Counter(record.pair for record in records)
    region_counts = Counter(record.region for record in records)
    severity_counts = Counter(record.severity for record in records)

    lines.append("Candle DRC hotspot summary")
    lines.append(f"violations: {total}")
    if severity_counts:
        lines.append(
            "severities: "
            + ", ".join(f"{name}={count}" for name, count in sorted(severity_counts.items()))
        )
    if type_counts:
        lines.append(
            "types: "
            + ", ".join(
                f"{name}={count}" for name, count in type_counts.most_common(top_types)
            )
        )
    if pair_counts:
        lines.append(
            "net pairs: "
            + ", ".join(
                f"{fmt_pair(pair)}={count}" for pair, count in pair_counts.most_common(top_pairs)
            )
        )
    if region_counts:
        lines.append(
            "regions: "
            + ", ".join(f"{region}={count}" for region, count in region_counts.most_common(top_regions))
        )

    grouped: dict[tuple[str, tuple[str, str], str], list[ViolationRecord]] = defaultdict(list)
    for record in records:
        grouped[(record.type, record.pair, record.region)].append(record)

    lines.append("")
    lines.append("hotspots:")
    for rank, ((type_name, pair, region), bucket) in enumerate(
        sorted(
            grouped.items(),
            key=lambda entry: (
                -len(entry[1]),
                entry[0][0],
                entry[0][1][0],
                entry[0][1][1],
                entry[0][2],
            ),
        )[:top_groups],
        start=1,
    ):
        centroid, bbox = centroid_and_bbox(item for record in bucket for item in record.items)
        bbox_text = (
            f"bbox=x{fmt_float(bbox[0])}..{fmt_float(bbox[2])}mm "
            f"y{fmt_float(bbox[1])}..{fmt_float(bbox[3])}mm"
            if bbox is not None
            else "bbox=?"
        )
        line = (
            f"{rank}. {type_name} | {fmt_pair(pair)} | {region} | "
            f"{len(bucket)} violations | centroid={fmt_float(centroid[0])},{fmt_float(centroid[1])}mm | "
            f"{bbox_text}"
        )
        lines.append(line)

        sample_descriptions: list[str] = []
        seen: set[str] = set()
        for record in bucket:
            for item in record.items:
                if item.description in seen:
                    continue
                seen.add(item.description)
                sample_descriptions.append(item.description)
                if len(sample_descriptions) >= examples:
                    break
            if len(sample_descriptions) >= examples:
                break
        for sample in sample_descriptions:
            lines.append(f"   - {sample}")

    lines.append("")
    lines.append("type rollup:")
    for type_name, count in type_counts.most_common():
        lines.append(f"  - {type_name}: {count}")
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--drc", type=Path, default=DEFAULT_DRC_JSON, help="path to candle-drc.json")
    parser.add_argument("--pcb", type=Path, default=DEFAULT_PCB, help="optional path to candle.kicad_pcb")
    parser.add_argument("--region-mm", type=float, default=DEFAULT_REGION_MM, help="coarse region bin size in mm")
    parser.add_argument("--top-groups", type=int, default=DEFAULT_TOP_GROUPS, help="number of hotspot groups to print")
    parser.add_argument("--top-types", type=int, default=DEFAULT_TOP_TYPES, help="number of type counts to print")
    parser.add_argument("--top-pairs", type=int, default=DEFAULT_TOP_PAIRS, help="number of net-pair counts to print")
    parser.add_argument("--top-regions", type=int, default=DEFAULT_TOP_REGIONS, help="number of region counts to print")
    parser.add_argument("--examples", type=int, default=DEFAULT_EXAMPLES, help="example item descriptions per hotspot")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    records = load_drc_records(args.drc, args.region_mm)
    print(f"# source: {args.drc}")
    if args.pcb.exists():
        print(f"# pcb: {args.pcb}")
    else:
        print(f"# pcb: missing ({args.pcb})")
    print()
    print(
        summarize(
            records,
            top_groups=max(args.top_groups, 0),
            top_types=max(args.top_types, 0),
            top_pairs=max(args.top_pairs, 0),
            top_regions=max(args.top_regions, 0),
            examples=max(args.examples, 0),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
