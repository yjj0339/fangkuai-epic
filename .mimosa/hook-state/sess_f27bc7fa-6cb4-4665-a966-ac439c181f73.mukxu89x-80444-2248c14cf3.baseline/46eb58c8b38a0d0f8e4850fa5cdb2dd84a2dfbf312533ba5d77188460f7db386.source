# -*- coding: utf-8 -*-
"""无头 Blender 建模 MC 风格生物 -> assets/mobs/*.glb
部件独立枢轴（object origin=关节），JS 端按节点名做摆动动画。
模型统一面朝 +Z、Y 向上。纹理程序生成（线性值，避免发粉）。
"""
import bpy, random, math, os, sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'mobs')
os.makedirs(OUT, exist_ok=True)

def srgb(r, g, b, a=255):
    return ((r/255.0)**2.2, (g/255.0)**2.2, (b/255.0)**2.2, a/255.0)

def make_tex(name, w, h, painter):
    """painter(x, y_top) -> (r,g,b,a) 0-255；y_top=0 是顶行"""
    img = bpy.data.images.new(name, width=w, height=h, alpha=True)
    px = []
    for row in range(h):                    # Blender 从底行开始
        y_top = h - 1 - row
        for x in range(w):
            c = painter(x, y_top)
            if len(c) == 3:
                c = (c[0], c[1], c[2], 255)
            px.extend(srgb(*c))
    img.pixels = px
    return img

def jitter(rnd, base, amp=12):
    d = rnd.randint(-amp, amp)
    return tuple(max(0, min(255, v + d + rnd.randint(-4, 4))) for v in base)

def noise_painter(base, amp=12, seed=0):
    rnd = random.Random(seed)
    grid = {}
    for y in range(64):
        for x in range(64):
            grid[(x, y)] = jitter(rnd, base, amp)
    def p(x, y):
        return grid.get((x % 64, y % 64), base)
    return p

def solid(base):
    return lambda x, y: base

def make_mat(name, img):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = img
    mat.node_tree.links.new(bsdf.inputs['Base Color'], tex.outputs['Color'])
    bsdf.inputs['Roughness'].default_value = 1.0
    try:
        bsdf.inputs['Specular IOR Level'].default_value = 0.0
    except Exception:
        try:
            bsdf.inputs['Specular'].default_value = 0.0
        except Exception:
            pass
    return mat

def part(name, mat, size, center, pivot):
    """cube 部件：几何中心 center，原点(枢轴) pivot"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.shade_flat()
    obj.data.materials.append(mat)
    # 原点移到枢轴：3D cursor 法（几何不动）
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='OBJECT')
    saved = bpy.context.scene.cursor.location.copy()
    bpy.context.scene.cursor.location = pivot
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR', center='MEDIAN')
    bpy.context.scene.cursor.location = saved
    return obj

# ---------------- 皮肤绘制器 ----------------
def face_painter(skin, eye, mouth, seed=5, brow=None):
    """头脸：眼+嘴（8x8 网格习惯，任意尺寸按比例）"""
    rnd = random.Random(seed)
    base = {}
    for y in range(32):
        for x in range(32):
            base[(x, y)] = jitter(rnd, skin, 8)
    def p(x, y, w, h):
        fx, fy = x / max(w - 1, 1), y / max(h - 1, 1)
        c = base.get((x % 32, y % 32), skin)
        if 0.25 <= fx <= 0.375 and 0.28 <= fy <= 0.44:  # 左眼
            return eye
        if 0.625 <= fx <= 0.75 and 0.28 <= fy <= 0.44:  # 右眼
            return eye
        if 0.40 <= fx <= 0.60 and 0.66 <= fy <= 0.72:   # 嘴
            return mouth
        return c
    return p

def tex_from_painter(name, painter, w=16, h=16):
    def px(x, y):
        return painter(x, y, w, h)
    return make_tex(name, w, h, px)

# ---------------- 生物构造 ----------------
PX = 1.0 / 16.0  # 1 MC 像素

def build_humanoid(tag, skin, shirt, pants, arm_skin=None, hair=None,
                   face_eye=(20, 20, 20), zombie_arms=False, slim=False):
    """人形：僵尸/Steve/骷髅。arm_skin=None 时臂用衣袖色"""
    aw = 2 * PX if slim else 4 * PX
    parts = {}
    mats = {}
    tex_skin = make_tex(tag + '_skin', 16, 16, noise_painter(skin, 8, seed=hash(tag) % 100))
    tex_shirt = make_tex(tag + '_shirt', 16, 16, noise_painter(shirt, 10, seed=3))
    tex_pants = make_tex(tag + '_pants', 16, 16, noise_painter(pants, 10, seed=7))
    mats['skin'] = make_mat(tag + '_matskin', tex_skin)
    mats['shirt'] = make_mat(tag + '_matshirt', tex_shirt)
    mats['pants'] = make_mat(tag + '_matpants', tex_pants)
    # 头：颈枢轴 y=1.5
    head_mat = mats['skin']
    if hair is not None:
        tex_hair = make_tex(tag + '_hair', 16, 16, noise_painter(hair, 8, seed=11))
        head_mat = make_mat(tag + '_mathair', tex_hair)
    parts['head'] = part('head', head_mat, (8*PX, 8*PX, 8*PX), (0, 1.5 + 4*PX, 0), (0, 1.5, 0))
    # 脸贴片
    fp = face_painter(skin, face_eye, (40, 60, 30) if tag == 'zombie' else (120, 70, 55))
    tex_face = tex_from_painter(tag + '_face', fp, 16, 16)
    m_face = make_mat(tag + '_matface', tex_face)
    part('face', m_face, (8*PX, 8*PX, 0.4*PX), (0, 1.5 + 4*PX, 4.02*PX), (0, 1.5 + 4*PX, 4*PX))
    # 头发盖（有 hair 时顶+后上半）——用稍大的盒罩住头顶一圈
    if hair is not None:
        part('haircap', make_mat(tag + '_mathair2', tex_hair) if False else head_mat,
             (8.3*PX, 3.5*PX, 8.3*PX), (0, 1.5 + 6.6*PX, -0.6*PX), (0, 1.5, 0))
    # 身
    parts['body'] = part('body', mats['shirt'], (8*PX, 12*PX, 4*PX), (0, 0.75 + 6*PX, 0), (0, 0.75, 0))
    # 臂：肩枢轴 y=1.5-2px，x=±(4px+aw/2)
    arm_mat = make_mat(tag + '_matarm', make_tex(tag + '_arm', 16, 16, noise_painter(arm_skin or shirt, 8, seed=13)))
    for side, sx in (('L', 1), ('R', -1)):
        parts['arm' + side] = part('arm' + side, arm_mat, (aw, 12*PX, aw),
                                   (sx * (4*PX + aw/2), 1.5 - 2*PX - 6*PX, 0),
                                   (sx * (4*PX + aw/2), 1.5 - 2*PX, 0))
        if zombie_arms:
            parts['arm' + side].rotation_euler.x = math.radians(-88)
    # 腿：胯枢轴 y=0.75
    leg_mat = mats['pants']
    for side, sx in (('L', 1), ('R', -1)):
        parts['leg' + side] = part('leg' + side, leg_mat, (aw, 12*PX, aw),
                                   (sx * 2*PX, 0.75 - 6*PX, 0), (sx * 2*PX, 0.75, 0))
    return parts

def build_creeper():
    tex = make_tex('creeper_skin', 16, 16, noise_painter((88, 176, 72), 26, seed=42))
    mat = make_mat('creeper_mat', tex)
    parts = {}
    parts['body'] = part('body', mat, (8*PX, 12*PX, 4*PX), (0, 0.375 + 6*PX, 0), (0, 0.375, 0))
    parts['head'] = part('head', mat, (8*PX, 8*PX, 8*PX), (0, 1.125 + 4*PX, 0), (0, 1.125, 0))
    # 苦力怕脸
    def cpaint(x, y, w, h):
        base = noise_painter((88, 176, 72), 26, seed=42)
        c = base(x % 64, y % 64)
        fx, fy = x / (w - 1), y / (h - 1)
        # 眼：两块 2x2；嘴：中间下垂
        if 0.125 <= fx <= 0.375 and 0.125 <= fy <= 0.375: return (15, 15, 15)
        if 0.625 <= fx <= 0.875 and 0.125 <= fy <= 0.375: return (15, 15, 15)
        if 0.375 <= fx <= 0.625 and 0.375 <= fy <= 0.625: return (15, 15, 15)
        if 0.3125 <= fx <= 0.4375 and 0.625 <= fy <= 0.875: return (15, 15, 15)
        if 0.5625 <= fx <= 0.6875 and 0.625 <= fy <= 0.875: return (15, 15, 15)
        return c
    tex_face = tex_from_painter('creeper_face', cpaint, 16, 16)
    part('face', make_mat('creeper_face_mat', tex_face), (8*PX, 8*PX, 0.4*PX),
         (0, 1.125 + 4*PX, 4.02*PX), (0, 1.125 + 4*PX, 4*PX))
    # 四短腿：顶枢轴 y=0.375，位于身四角
    rnd = random.Random(9)
    for nm, (lx, lz) in (('legFL', (1, 1)), ('legFR', (1, -1)), ('legBL', (-1, 1)), ('legBR', (-1, -1))):
        x = lx * (2*PX - 1*PX)
        z = lz * (1.5*PX)
        parts[nm] = part(nm, mat, (4*PX, 6*PX, 4*PX), (x, 0.375 - 3*PX, z), (x, 0.375, z))
    return parts

def build_quadruped(tag, body_c, head_c, leg_c, body_size, body_y0, leg_h,
                    head_size, head_off, extras=None, face_p=None, belly=None):
    """四足：猪/牛/羊"""
    tex_body = make_tex(tag + '_body', 16, 16, noise_painter(body_c, 14, seed=hash(tag) % 97))
    tex_head = make_tex(tag + '_head', 16, 16, noise_painter(head_c, 10, seed=5))
    tex_leg = make_tex(tag + '_leg', 16, 16, noise_painter(leg_c, 10, seed=6))
    m_body = make_mat(tag + '_mbody', tex_body)
    m_head = make_mat(tag + '_mhead', tex_head)
    m_leg = make_mat(tag + '_mleg', tex_leg)
    parts = {}
    bw, bh, bl = body_size
    parts['body'] = part('body', m_body, (bw, bh, bl), (0, body_y0 + bh / 2, 0), (0, body_y0, 0))
    hw, hh, hd = head_size
    hx, hy, hz = head_off
    parts['head'] = part('head', m_head, (hw, hh, hd), (hx, hy, hz), (hx, hy, hz - hd / 2))
    if face_p is not None:
        tex_face = tex_from_painter(tag + '_face', face_p, 16, 16)
        part('face', make_mat(tag + '_mface', tex_face), (hw * 0.98, hh * 0.98, 0.4*PX),
             (hx, hy, hz + hd / 2 + 0.2*PX), (hx, hy, hz + hd / 2))
    lx0 = bw / 2 - 2*PX
    lz0 = bl / 2 - 2*PX
    for nm, (lx, lz) in (('legFL', (1, 1)), ('legFR', (1, -1)), ('legBL', (-1, 1)), ('legBR', (-1, -1))):
        parts[nm] = part(nm, m_leg, (4*PX, leg_h, 4*PX),
                         (lx * lx0, body_y0 - leg_h / 2, lz * lz0), (lx * lx0, body_y0, lz * lz0))
    if extras:
        extras(parts, m_head)
    return parts

def pig_extras(parts, m):
    # 猪鼻
    tex_snout = make_tex('pig_snout', 8, 8, noise_painter((230, 150, 150), 8, seed=21))
    part('snout', make_mat('pig_msnout', tex_snout), (4*PX, 3*PX, 1*PX),
         (0, 10.5*PX, 8*PX + 0.5*PX), (0, 10.5*PX, 8*PX))
    def pig_face(x, y, w, h):
        base = noise_painter((240, 165, 162), 8, seed=22)
        c = base(x % 64, y % 64)
        fx, fy = x / (w - 1), y / (h - 1)
        if 0.18 <= fx <= 0.32 and 0.25 <= fy <= 0.42: return (25, 25, 25)
        if 0.68 <= fx <= 0.82 and 0.25 <= fy <= 0.42: return (25, 25, 25)
        return c
    return pig_face

def cow_extras(parts, m):
    # 角
    tex_horn = make_tex('cow_horn', 8, 8, noise_painter((235, 230, 210), 6, seed=31))
    mh = make_mat('cow_mhorn', tex_horn)
    for side, sx in (('L', 1), ('R', -1)):
        part('horn' + side, mh, (1.5*PX, 3*PX, 1.5*PX),
             (sx * 3.5*PX, 15*PX, 3*PX), (sx * 3.5*PX, 14*PX, 3*PX))
    def cow_face(x, y, w, h):
        base = noise_painter((107, 66, 38), 10, seed=32)
        c = base(x % 64, y % 64)
        fx, fy = x / (w - 1), y / (h - 1)
        if 0.20 <= fx <= 0.34 and 0.30 <= fy <= 0.48: return (20, 20, 20)
        if 0.66 <= fx <= 0.80 and 0.30 <= fy <= 0.48: return (20, 20, 20)
        if 0.42 <= fx <= 0.58 and 0.72 <= fy <= 0.85: return (200, 180, 170)
        return c
    return cow_face

def sheep_extras(parts, m):
    def sheep_face(x, y, w, h):
        base = noise_painter((225, 220, 215), 6, seed=51)
        c = base(x % 64, y % 64)
        fx, fy = x / (w - 1), y / (h - 1)
        if 0.20 <= fx <= 0.33 and 0.28 <= fy <= 0.44: return (25, 25, 25)
        if 0.67 <= fx <= 0.80 and 0.28 <= fy <= 0.44: return (25, 25, 25)
        if 0.42 <= fx <= 0.58 and 0.68 <= fy <= 0.80: return (235, 200, 200)
        return c
    return sheep_face

def build_chicken():
    tex_body = make_tex('chicken_body', 16, 16, noise_painter((230, 230, 228), 10, seed=61))
    tex_head = make_tex('chicken_head', 16, 16, noise_painter((240, 240, 238), 8, seed=62))
    tex_beak = make_tex('chicken_beak', 8, 8, noise_painter((235, 170, 50), 6, seed=63))
    tex_wattle = make_tex('chicken_wattle', 8, 8, noise_painter((200, 60, 60), 6, seed=64))
    tex_leg = make_tex('chicken_leg', 8, 8, noise_painter((225, 160, 45), 6, seed=65))
    m_body = make_mat('chicken_mbody', tex_body)
    m_head = make_mat('chicken_mhead', tex_head)
    m_beak = make_mat('chicken_mbeak', tex_beak)
    m_wattle = make_mat('chicken_mwattle', tex_wattle)
    m_leg = make_mat('chicken_mleg', tex_leg)
    parts = {}
    parts['body'] = part('body', m_body, (6*PX, 6*PX, 8*PX), (0, 7.5*PX, 0), (0, 4.5*PX, 0))
    parts['head'] = part('head', m_head, (4*PX, 6*PX, 3*PX), (0, 13*PX, 2.5*PX), (0, 10.5*PX, 2.5*PX))
    part('beak', m_beak, (4*PX, 2*PX, 2*PX), (0, 12.8*PX, 5*PX), (0, 12.8*PX, 4*PX))
    part('wattle', m_wattle, (2*PX, 2*PX, 1*PX), (0, 11.2*PX, 4.2*PX), (0, 11.2*PX, 4*PX))
    for side, sx in (('L', 1), ('R', -1)):
        parts['wing' + side] = part('wing' + side, m_body, (1*PX, 4*PX, 6*PX),
                                    (sx * 3.5*PX, 7.5*PX, -0.5*PX), (sx * 3.5*PX, 9*PX, -0.5*PX))
    for side, sx in (('L', 1), ('R', -1)):
        parts['leg' + side] = part('leg' + side, m_leg, (1.2*PX, 4.5*PX, 1.2*PX),
                                   (sx * 1.5*PX, 2.2*PX, 0.5*PX), (sx * 1.5*PX, 4.5*PX, 0.5*PX))
    return parts

def build_bow():
    tex = make_tex('bow_tex', 16, 16, noise_painter((140, 105, 65), 10, seed=71))
    m = make_mat('bow_mat', tex)
    parts = {}
    # 弓：三段拼 C 形 + 弦
    segs = [(-30, 0.14), (0, 0.2), (30, 0.14)]  # (角度deg, 长)
    parts['arcT'] = part('arcT', m, (1.2*PX, 7*PX, 1.2*PX), (0, 0.1, -0.045), (0, 0.1, -0.045))
    parts['arcT'].rotation_euler.x = math.radians(-25)
    parts['arcB'] = part('arcB', m, (1.2*PX, 7*PX, 1.2*PX), (0, -0.1, -0.045), (0, -0.1, -0.045))
    parts['arcB'].rotation_euler.x = math.radians(25)
    tex_str = make_tex('bow_str', 4, 4, solid((60, 55, 50)))
    ms = make_mat('bow_mstr', tex_str)
    parts['str'] = part('str', ms, (0.5*PX, 0.28, 0.5*PX), (0, 0, 0.02), (0, 0, 0.02))
    return parts

# ---------------- 场景清理与逐个导出 ----------------
def clean():
    for coll in list(bpy.data.collections):
        for ob in list(coll.objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        bpy.data.collections.remove(coll)
    for ob in list(bpy.context.scene.objects):
        bpy.data.objects.remove(ob, do_unlink=True)

def export(name):
    path = os.path.abspath(os.path.join(OUT, name + '.glb'))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True,
                              export_format='GLB', export_apply=True,
                              export_yup=True)
    print('EXPORTED', name, os.path.getsize(path))

# 僵尸
build_humanoid('zombie', skin=(82, 155, 82), shirt=(52, 118, 130), pants=(58, 66, 130),
               arm_skin=(82, 155, 82), zombie_arms=True)
export('zombie'); clean()
# Steve
build_humanoid('steve', skin=(198, 142, 110), shirt=(60, 172, 172), pants=(70, 68, 140),
               arm_skin=(198, 142, 110), hair=(74, 52, 36))
export('steve'); clean()
# 骷髅（瘦）
sk = build_humanoid('skeleton', skin=(200, 200, 196), shirt=(190, 190, 186), pants=(180, 180, 176),
                    arm_skin=(200, 200, 196), slim=True)
for n in ('armR',):
    sk[n].rotation_euler.x = math.radians(-88)
    sk[n].rotation_euler.y = math.radians(-12)
bow = build_bow()
# 挂弓到右手：弓对象 parent 到 armR，局部坐标放手上（臂局部 -Y 是臂长方向）
armR = sk['armR']
for ob in bow.values():
    ob.parent = armR
    ob.location = (0, -0.55, 0.03)
export('skeleton'); clean()
# 苦力怕
build_creeper()
export('creeper'); clean()
# 猪
build_quadruped('pig', body_c=(240, 165, 162), head_c=(240, 160, 158), leg_c=(236, 158, 155),
                body_size=(10*PX, 8*PX, 16*PX), body_y0=6*PX, leg_h=6*PX,
                head_size=(8*PX, 8*PX, 8*PX), head_off=(0, 10.5*PX, 9.5*PX),
                face_p=pig_extras({}, None))
export('pig'); clean()
# 牛
build_quadruped('cow', body_c=(107, 66, 38), head_c=(100, 60, 34), leg_c=(95, 57, 32),
                body_size=(12*PX, 10*PX, 18*PX), body_y0=12*PX, leg_h=12*PX,
                head_size=(8*PX, 8*PX, 6*PX), head_off=(0, 14*PX, 10.5*PX),
                face_p=cow_extras({}, None))
export('cow'); clean()
# 羊（白毛体）
build_quadruped('sheep', body_c=(233, 230, 226), head_c=(222, 214, 205), leg_c=(218, 210, 200),
                body_size=(10*PX, 10*PX, 14*PX), body_y0=11*PX, leg_h=11*PX,
                head_size=(6*PX, 6*PX, 7*PX), head_off=(0, 16*PX, 7.5*PX),
                face_p=sheep_extras({}, None))
export('sheep'); clean()
# 鸡
build_chicken()
export('chicken'); clean()
print('ALL DONE')
