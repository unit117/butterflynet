#!/usr/bin/env python3
"""Render the candle stem PCB in Blender.

Usage:
    blender --background --python tools/render_candle.py

Requires: candle_bare.glb in outputs/ (kicad-cli pcb export glb, no soldermask)
"""

import bpy
import math
import os
from mathutils import Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
GLB_FILE = os.path.join(PROJECT_DIR, "outputs", "candle_bare.glb")
GLB_MASKED = os.path.join(PROJECT_DIR, "outputs", "candle.glb")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "outputs")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in [bpy.data.meshes, bpy.data.materials, bpy.data.textures,
                  bpy.data.images, bpy.data.lights, bpy.data.cameras]:
        for item in block:
            block.remove(item)


def make_camera(name, lens=50):
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = "PERSP"
    cam_data.lens = lens
    cam_data.clip_start = 0.0001
    cam_data.clip_end = 10
    cam_obj = bpy.data.objects.new(name, cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    return cam_obj


def point_at(cam_obj, target_loc):
    empty = bpy.data.objects.new(f"{cam_obj.name}_tgt", None)
    empty.location = target_loc
    bpy.context.scene.collection.objects.link(empty)
    track = cam_obj.constraints.new(type="TRACK_TO")
    track.target = empty
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"


def add_lighting():
    sun = bpy.data.lights.new("Key", "SUN")
    sun.energy = 3.0
    sun.angle = math.radians(1.5)
    sun.color = (1.0, 0.97, 0.93)
    sun_obj = bpy.data.objects.new("Key", sun)
    bpy.context.scene.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(50), math.radians(8), math.radians(-20))

    fill = bpy.data.lights.new("Fill", "AREA")
    fill.energy = 20
    fill.size = 0.4
    fill.size_y = 0.6
    fill.color = (0.85, 0.92, 1.0)
    fill_obj = bpy.data.objects.new("Fill", fill)
    bpy.context.scene.collection.objects.link(fill_obj)
    fill_obj.location = (-0.15, -0.22, 0.15)
    fill_obj.rotation_euler = (math.radians(55), 0, math.radians(85))

    rim = bpy.data.lights.new("Rim", "AREA")
    rim.energy = 8
    rim.size = 0.15
    rim.color = (1.0, 0.95, 0.88)
    rim_obj = bpy.data.objects.new("Rim", rim)
    bpy.context.scene.collection.objects.link(rim_obj)
    rim_obj.location = (0.08, 0.05, 0.08)
    rim_obj.rotation_euler = (math.radians(75), 0, math.radians(-40))


def setup_world():
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()
    bg = nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (0.006, 0.006, 0.01, 1.0)
    bg.inputs["Strength"].default_value = 1.0
    out = nodes.new("ShaderNodeOutputWorld")
    links.new(bg.outputs[0], out.inputs[0])


def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons.get("cycles")
    if prefs:
        try:
            prefs.preferences.compute_device_type = "METAL"
            prefs.preferences.get_devices()
            for d in prefs.preferences.devices:
                d.use = True
        except Exception:
            pass
    scene.cycles.device = "GPU"
    scene.cycles.samples = 256
    scene.cycles.use_denoising = True
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_depth = "16"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"


def render_view(name, camera, res_x=2400, res_y=1600):
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    path = os.path.join(OUTPUT_DIR, f"{name}.png")
    scene.render.filepath = path
    print(f"Rendering {name} ({res_x}x{res_y})...")
    bpy.ops.render.render(write_still=True)
    print(f"Saved: {path}")


def render_set(glb_path, prefix):
    """Import a GLB and render multiple views."""
    clear_scene()

    print(f"\nImporting: {glb_path}")
    bpy.ops.import_scene.gltf(filepath=glb_path)

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    print(f"  {len(meshes)} mesh objects")
    if not meshes:
        return

    setup_world()
    setup_render()
    add_lighting()

    # View 1: Full board perspective — shallow angle showing length
    cam1 = make_camera("Persp", lens=65)
    cam1.location = (0.07, -0.28, 0.22)
    point_at(cam1, Vector((0.015, -0.20, 0.0)))
    render_view(f"{prefix}_perspective", cam1, 2400, 1600)

    # View 2: Closeup of driver+MCU area — nearly top-down with slight tilt
    cam2 = make_camera("Close", lens=35)
    cam2.location = (0.025, -0.30, 0.055)
    point_at(cam2, Vector((0.015, -0.300, 0.0)))
    render_view(f"{prefix}_closeup", cam2, 2400, 1600)

    # View 3: Full board top-down orthographic
    cam3_data = bpy.data.cameras.new("Top")
    cam3_data.type = "ORTHO"
    cam3_data.ortho_scale = 0.045
    cam3_data.clip_start = 0.0001
    cam3_data.clip_end = 1.0
    cam3 = bpy.data.objects.new("Top", cam3_data)
    bpy.context.scene.collection.objects.link(cam3)
    cam3.location = (0.015, -0.215, 0.1)
    cam3.rotation_euler = (0, 0, 0)
    render_view(f"{prefix}_top", cam3, 800, 3600)


def main():
    print(f"\n{'='*60}")
    print("Candle Stem PCB — Blender Render")
    print(f"{'='*60}")

    # Bare copper (no soldermask) — shows routing detail
    if os.path.exists(GLB_FILE):
        render_set(GLB_FILE, "candle_bare")
    else:
        print(f"Bare GLB not found: {GLB_FILE}")

    # With soldermask — realistic appearance
    if os.path.exists(GLB_MASKED):
        render_set(GLB_MASKED, "candle_3d")
    else:
        print(f"Masked GLB not found: {GLB_MASKED}")

    print(f"\nAll renders in {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
