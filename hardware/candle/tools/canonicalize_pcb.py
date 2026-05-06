#!/usr/bin/env python3
"""Canonicalize KiCad PCB serialization for deterministic validation."""

from __future__ import annotations

import argparse
import hashlib
import json
import uuid
from pathlib import Path


Atom = str
Node = object

UUID_NAMESPACE = uuid.UUID("59df3f20-8539-4f4c-a956-c5bf593f58a0")
HEADER_ORDER = {
    "version": 0,
    "generator": 1,
    "generator_version": 2,
    "general": 3,
    "paper": 4,
    "layers": 5,
    "setup": 6,
}
LAYER_ORDER = {
    "F.Cu": 0,
    "In1.Cu": 1,
    "In2.Cu": 2,
    "B.Cu": 3,
    "F.Adhes": 4,
    "B.Adhes": 5,
    "F.Paste": 6,
    "B.Paste": 7,
    "F.SilkS": 8,
    "B.SilkS": 9,
    "F.Mask": 10,
    "B.Mask": 11,
    "Dwgs.User": 12,
    "Cmts.User": 13,
    "Eco1.User": 14,
    "Eco2.User": 15,
    "Edge.Cuts": 16,
    "Margin": 17,
    "F.CrtYd": 18,
    "B.CrtYd": 19,
    "F.Fab": 20,
    "B.Fab": 21,
    "User.1": 22,
    "User.2": 23,
    "User.3": 24,
    "User.4": 25,
}


def tokenize(text: str) -> list[str]:
    tokens: list[str] = []
    index = 0
    length = len(text)
    while index < length:
        char = text[index]
        if char in "()":
            tokens.append(char)
            index += 1
            continue
        if char.isspace():
            index += 1
            continue
        if char == '"':
            start = index
            index += 1
            escaped = False
            while index < length:
                current = text[index]
                if escaped:
                    escaped = False
                elif current == "\\":
                    escaped = True
                elif current == '"':
                    index += 1
                    break
                index += 1
            tokens.append(text[start:index])
            continue
        start = index
        while index < length and not text[index].isspace() and text[index] not in "()":
            index += 1
        tokens.append(text[start:index])
    return tokens


def parse_tokens(tokens: list[str], index: int = 0) -> tuple[Node, int]:
    if tokens[index] != "(":
        return tokens[index], index + 1

    index += 1
    items: list[Node] = []
    while tokens[index] != ")":
        child, index = parse_tokens(tokens, index)
        items.append(child)
    return items, index + 1


def parse_sexp(text: str) -> list[Node]:
    tokens = tokenize(text)
    node, index = parse_tokens(tokens)
    if index != len(tokens):
        raise ValueError("Unexpected trailing tokens in PCB file")
    if not isinstance(node, list):
        raise ValueError("Expected root PCB node to be a list")
    return node


def is_list(node: Node) -> bool:
    return isinstance(node, list)


def node_tag(node: Node) -> str:
    if not isinstance(node, list) or not node or not isinstance(node[0], str):
        return ""
    return node[0]


def atom_value(atom: str) -> str:
    if atom.startswith('"') and atom.endswith('"'):
        return json.loads(atom)
    return atom


def quote_atom(value: str) -> str:
    return json.dumps(value)


def float_value(value: str) -> float:
    try:
        return float(value)
    except ValueError:
        return 0.0


def layer_sort_key(layer: str) -> tuple[int, str]:
    return (LAYER_ORDER.get(layer, 999), layer)


def get_child(node: list[Node], tag: str) -> list[Node] | None:
    for child in node[1:]:
        if isinstance(child, list) and node_tag(child) == tag:
            return child
    return None


def get_children(node: list[Node], tag: str) -> list[list[Node]]:
    return [child for child in node[1:] if isinstance(child, list) and node_tag(child) == tag]


def child_scalar(node: list[Node], tag: str) -> str:
    child = get_child(node, tag)
    if child is None or len(child) < 2 or not isinstance(child[1], str):
        return ""
    return atom_value(child[1])


def child_scalars(node: list[Node], tag: str) -> list[str]:
    child = get_child(node, tag)
    if child is None:
        return []
    result: list[str] = []
    for item in child[1:]:
        if isinstance(item, str):
            result.append(atom_value(item))
    return result


def at_tuple(node: list[Node]) -> tuple[float, float, float]:
    values = child_scalars(node, "at")
    x = float_value(values[0]) if len(values) > 0 else 0.0
    y = float_value(values[1]) if len(values) > 1 else 0.0
    angle = float_value(values[2]) if len(values) > 2 else 0.0
    return (x, y, angle)


def point_tuple(node: list[Node], tag: str) -> tuple[float, float]:
    values = child_scalars(node, tag)
    x = float_value(values[0]) if len(values) > 0 else 0.0
    y = float_value(values[1]) if len(values) > 1 else 0.0
    return (x, y)


def property_value(node: list[Node], name: str) -> str:
    for child in get_children(node, "property"):
        if len(child) >= 3 and isinstance(child[1], str) and isinstance(child[2], str):
            if atom_value(child[1]) == name:
                return atom_value(child[2])
    return ""


def strip_uuid_nodes(node: Node) -> Node:
    if not isinstance(node, list):
        return node
    if node_tag(node) == "uuid":
        return ["uuid", '"__UUID__"']
    return [strip_uuid_nodes(child) for child in node]


def render_compact(node: Node) -> str:
    if isinstance(node, str):
        return node
    return "(" + " ".join(render_compact(child) for child in node) + ")"


def stable_render(node: Node) -> str:
    return render_compact(strip_uuid_nodes(node))


def footprint_key(node: list[Node]) -> tuple[object, ...]:
    layer = child_scalar(node, "layer")
    x, y, angle = at_tuple(node)
    reference = property_value(node, "Reference")
    name = atom_value(node[1]) if len(node) > 1 and isinstance(node[1], str) else ""
    return (layer_sort_key(layer), reference, x, y, angle, name)


def segment_key(node: list[Node]) -> tuple[object, ...]:
    layer = child_scalar(node, "layer")
    net = child_scalar(node, "net")
    width = float_value(child_scalar(node, "width"))
    start = point_tuple(node, "start")
    end = point_tuple(node, "end")
    low, high = sorted((start, end))
    return (layer_sort_key(layer), net, low, high, width)


def via_key(node: list[Node]) -> tuple[object, ...]:
    layers = child_scalars(node, "layers")
    layer_pair = tuple(layer_sort_key(layer) for layer in layers[:2])
    at = point_tuple(node, "at")
    size = float_value(child_scalar(node, "size"))
    drill = float_value(child_scalar(node, "drill"))
    net = child_scalar(node, "net")
    via_type = child_scalar(node, "type")
    return (layer_pair, net, at, size, drill, via_type, stable_render(node))


def arc_key(node: list[Node]) -> tuple[object, ...]:
    layer = child_scalar(node, "layer")
    net = child_scalar(node, "net")
    start = point_tuple(node, "start")
    mid = point_tuple(node, "mid")
    end = point_tuple(node, "end")
    width = float_value(child_scalar(node, "width"))
    return (layer_sort_key(layer), net, start, mid, end, width)


def graphic_key(node: list[Node]) -> tuple[object, ...]:
    layer = child_scalar(node, "layer")
    text = ""
    if len(node) > 1 and isinstance(node[1], str):
        text = atom_value(node[1])
    return (node_tag(node), layer_sort_key(layer), at_tuple(node), text, stable_render(node))


def zone_key(node: list[Node]) -> tuple[object, ...]:
    layer = child_scalar(node, "layer")
    net = child_scalar(node, "net")
    return (layer_sort_key(layer), net, stable_render(node))


def top_level_sort_key(node: list[Node]) -> tuple[object, ...]:
    tag = node_tag(node)
    if tag in HEADER_ORDER:
        return (0, HEADER_ORDER[tag])
    if tag == "footprint":
        return (1, footprint_key(node))
    if tag in {"gr_text", "gr_line", "gr_rect", "gr_arc", "gr_poly", "dimension", "target"}:
        return (2, graphic_key(node))
    if tag == "segment":
        return (3, segment_key(node))
    if tag == "via":
        return (4, via_key(node))
    if tag == "arc":
        return (5, arc_key(node))
    if tag == "zone":
        return (6, zone_key(node))
    if tag == "embedded_fonts":
        return (8, 0)
    return (7, tag, stable_render(node))


def canonicalize_root(root: list[Node]) -> list[Node]:
    if not root or node_tag(root) != "kicad_pcb":
        raise ValueError("Expected (kicad_pcb ...) root node")

    prefix: list[list[Node]] = []
    sortable: list[list[Node]] = []
    suffix: list[list[Node]] = []

    for child in root[1:]:
        if not isinstance(child, list):
            continue
        tag = node_tag(child)
        if tag in HEADER_ORDER:
            prefix.append(child)
        elif tag == "embedded_fonts":
            suffix.append(child)
        else:
            sortable.append(child)

    prefix.sort(key=top_level_sort_key)
    sortable.sort(key=top_level_sort_key)
    suffix.sort(key=top_level_sort_key)
    return [root[0], *prefix, *sortable, *suffix]


def assign_deterministic_uuids(node: Node, path: tuple[str, ...] = ()) -> None:
    if not isinstance(node, list):
        return

    tag = node_tag(node) or "list"
    signature = stable_render(node)
    uuid_children = [child for child in node[1:] if isinstance(child, list) and node_tag(child) == "uuid"]
    if uuid_children:
        seed = "\x1f".join(path + (tag, hashlib.sha1(signature.encode("utf-8")).hexdigest()))
        deterministic_uuid = str(uuid.uuid5(UUID_NAMESPACE, seed))
        for child in uuid_children:
            if len(child) < 2:
                child.append(quote_atom(deterministic_uuid))
            else:
                child[1] = quote_atom(deterministic_uuid)

    sibling_counts: dict[str, int] = {}
    for child in node[1:]:
        if not isinstance(child, list) or node_tag(child) == "uuid":
            continue
        child_tag = node_tag(child) or "list"
        count = sibling_counts.get(child_tag, 0)
        sibling_counts[child_tag] = count + 1
        assign_deterministic_uuids(child, path + (f"{tag}[{count}]",))


def format_sexp(node: Node, indent: int = 0) -> str:
    if isinstance(node, str):
        return node

    indent_str = "\t" * indent
    if all(isinstance(child, str) for child in node):
        return indent_str + "(" + " ".join(node) + ")"

    head_parts: list[str] = []
    index = 0
    while index < len(node) and isinstance(node[index], str):
        head_parts.append(node[index])
        index += 1

    lines = [indent_str + "(" + " ".join(head_parts)]
    for child in node[index:]:
        if isinstance(child, str):
            lines[-1] += " " + child
        else:
            lines.append(format_sexp(child, indent + 1))
    lines.append(indent_str + ")")
    return "\n".join(lines)


def canonicalize_board_file(path: Path) -> None:
    root = parse_sexp(path.read_text(encoding="utf-8"))
    canonical_root = canonicalize_root(root)
    assign_deterministic_uuids(canonical_root)
    path.write_text(format_sexp(canonical_root) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("board", type=Path)
    args = parser.parse_args()
    canonicalize_board_file(args.board)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
