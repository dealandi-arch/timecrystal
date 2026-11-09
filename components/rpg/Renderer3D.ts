// 3D view for the 3D test mode. The game itself is unchanged: the 2D canvas still draws the floor and
// every ground effect (shots, blasts, rings), and here that canvas becomes the texture of a 3D floor.
// Walls are raised into blocks, and the hero, enemies and crystal stand upright as sprites.

import * as THREE from 'three';
import { COLS, FLOOR, ROWS, SECRET, type LevelDef } from './levels';
import { heightAt, isDark, kindAt } from './terrain';

const UNIT = 0.5; // world height of one terrain level

export type CameraMode = 'overview' | 'follow';

export interface Actor3D {
  key: string; // sprite cache key
  canvas: HTMLCanvasElement;
  x: number; // tile units, top-left of the tile
  y: number;
  lift?: number; // extra height (bobbing)
  tint?: string | null; // flash colour while hurt
  hp?: number; // 0..1 health bar, if shown
}

export interface Frame3D {
  player: Actor3D;
  enemies: Actor3D[];
  crystal: { x: number; y: number; lift: number };
  openSecrets: Set<string>; // secret walls the hero has found ("x,y")
}

function crystalCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.moveTo(32, 6);
    ctx.lineTo(52, 32);
    ctx.lineTo(32, 58);
    ctx.lineTo(12, 32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(32, 12);
    ctx.lineTo(40, 30);
    ctx.lineTo(32, 30);
    ctx.closePath();
    ctx.fill();
  }
  return c;
}

function pixelTexture(source: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(source);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Renderer3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, COLS / ROWS, 0.1, 100);
  private floorTexture: THREE.CanvasTexture;
  private secretBlocks = new Map<string, THREE.Mesh>();
  private materials = new Map<string, THREE.SpriteMaterial>();
  private textures: THREE.Texture[] = [];
  private playerSprite: THREE.Sprite;
  private crystalSprite: THREE.Sprite;
  private enemySprites: THREE.Sprite[] = [];
  private bars: THREE.Mesh[] = [];
  private resize: ResizeObserver;
  private camTarget = new THREE.Vector3();
  private camPos = new THREE.Vector3();
  private disposables: { dispose(): void }[] = [];
  mode: CameraMode = 'overview';

  // Ground height under a point (tile units), blending between tiles while something walks across.
  private groundAt(x: number, y: number): number {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const h = (cx: number, cy: number) => heightAt(this.level, cx, cy) * UNIT;
    if (fx > 0.001) return h(x0, y0) * (1 - fx) + h(x0 + 1, y0) * fx;
    if (fy > 0.001) return h(x0, y0) * (1 - fy) + h(x0, y0 + 1) * fy;
    return h(x0, y0);
  }

  constructor(private container: HTMLElement, private level: LevelDef, wallSource: HTMLCanvasElement, floorSource: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x05060f);
    this.renderer.domElement.className = 'view3d-canvas';
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(4, 10, 8);
    this.scene.add(sun);

    // The 2D game canvas is the floor, so every ground effect shows up in 3D.
    this.floorTexture = pixelTexture(floorSource);
    this.textures.push(this.floorTexture);
    this.scene.add(new THREE.Mesh(this.track(this.floorGeometry()), this.track(new THREE.MeshBasicMaterial({ map: this.floorTexture }))));

    // Walls rise up as blocks; secret passages are blocks that open once found.
    const wallTexture = pixelTexture(wallSource);
    this.textures.push(wallTexture);
    const wallMaterial = new THREE.MeshLambertMaterial({ map: wallTexture });
    let top = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) top = Math.max(top, heightAt(level, x, y) * UNIT);
    const WALL_HEIGHT = Math.max(0.75, top + 0.6);
    const box = new THREE.BoxGeometry(1, WALL_HEIGHT, 1);
    const solid: [number, number][] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = level.grid[y]?.[x];
        if (tile === FLOOR) continue;
        if (tile === SECRET) {
          const mesh = new THREE.Mesh(box, wallMaterial);
          mesh.position.set(x + 0.5, WALL_HEIGHT / 2, y + 0.5);
          this.scene.add(mesh);
          this.secretBlocks.set(`${x},${y}`, mesh);
        } else solid.push([x, y]);
      }
    }
    const walls = new THREE.InstancedMesh(box, wallMaterial, solid.length);
    const m = new THREE.Matrix4();
    // The front row stays low so it never hides the hero from the camera.
    const FRONT = 0.75;
    solid.forEach(([x, y], i) => {
      const h = y === ROWS - 1 ? FRONT : WALL_HEIGHT;
      walls.setMatrixAt(i, m.makeTranslation(x + 0.5, h / 2, y + 0.5).multiply(new THREE.Matrix4().makeScale(1, h / WALL_HEIGHT, 1)));
    });
    this.scene.add(walls);
    if (level.terrain) this.buildTerrain(wallTexture);

    this.playerSprite = this.makeSprite();
    this.crystalSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: pixelTexture(crystalCanvas()), transparent: true, depthWrite: false }));
    this.crystalSprite.scale.set(0.7, 0.7, 1);
    this.scene.add(this.crystalSprite);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(container);
    this.fit();
  }

  private track<T extends { dispose(): void }>(thing: T): T {
    this.disposables.push(thing);
    return thing;
  }

  // One textured square per tile at that tile's height, cut from the 2D board.
  private floorGeometry(): THREE.BufferGeometry {
    const pos: number[] = [];
    const uv: number[] = [];
    const index: number[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.level.grid[y]?.[x] !== FLOOR) continue;
        const stair = kindAt(this.level, x, y) === 'stair';
        const h = stair ? 0.002 : heightAt(this.level, x, y) * UNIT + 0.002;
        const i = pos.length / 3;
        pos.push(x, h, y, x + 1, h, y, x + 1, h, y + 1, x, h, y + 1);
        uv.push(x / COLS, 1 - y / ROWS, (x + 1) / COLS, 1 - y / ROWS, (x + 1) / COLS, 1 - (y + 1) / ROWS, x / COLS, 1 - (y + 1) / ROWS);
        index.push(i, i + 2, i + 1, i, i + 3, i + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    return g;
  }

  private buildTerrain(wallTexture: THREE.Texture) {
    const level = this.level;
    const cliff = this.track(new THREE.MeshLambertMaterial({ map: wallTexture, color: 0xc7c2b8 }));
    const step = this.track(new THREE.MeshLambertMaterial({ color: 0x9ca3af }));
    const wood = this.track(new THREE.MeshLambertMaterial({ color: 0x92400e }));
    const shadow = this.track(new THREE.MeshBasicMaterial({ color: 0x02040c, transparent: true, opacity: 0.55, depthWrite: false }));
    const unit = this.track(new THREE.BoxGeometry(1, 1, 1));
    const add = (mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const mesh = new THREE.Mesh(unit, mat);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      this.scene.add(mesh);
      return mesh;
    };
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (level.grid[y]?.[x] !== FLOOR) continue;
        const h = heightAt(level, x, y);
        const kind = kindAt(level, x, y);
        if (kind === 'stair') {
          // Four steps climbing toward the higher neighbour.
          const up = DIRS.find(([dx, dy]) => heightAt(level, x + dx, y + dy) > h && level.grid[y + dy]?.[x + dx] === FLOOR) ?? [1, 0];
          const low = (h - 0.5) * UNIT;
          for (let i = 0; i < 4; i++) {
            const tall = low + ((i + 1) / 4) * UNIT;
            const t = (i + 0.5) / 4 - 0.5; // -0.375 .. 0.375 along the climb
            const sx = up[0] ? 0.25 : 1;
            const sz = up[1] ? 0.25 : 1;
            add(step, x + 0.5 + up[0] * t, tall / 2, y + 0.5 + up[1] * t, sx, Math.max(0.01, tall), sz);
          }
        } else if (h > 0) {
          add(cliff, x + 0.5, (h * UNIT) / 2, y + 0.5, 1, h * UNIT, 1);
        }
        if (kind === 'ladder') {
          // Leans against the tallest neighbour.
          let best = DIRS[0];
          let bestH = -1;
          for (const d of DIRS) {
            const nh = heightAt(level, x + d[0], y + d[1]);
            if (nh > bestH) {
              bestH = nh;
              best = d;
            }
          }
          const top = Math.max(0.6, bestH * UNIT + 0.2);
          const cx = x + 0.5 + best[0] * 0.42;
          const cz = y + 0.5 + best[1] * 0.42;
          const side = best[0] ? [0, 1] : [1, 0];
          for (const k of [-0.28, 0.28]) add(wood, cx + side[0] * k, top / 2, cz + side[1] * k, 0.06, top, 0.06);
          for (let r = 0.18; r < top; r += 0.18) add(wood, cx, r, cz, side[0] ? 0.56 : 0.05, 0.04, side[1] ? 0.56 : 0.05);
        } else if (kind === 'fence') {
          // Pickets along the row, or down the column when that's where the fence continues.
          const vertical = kindAt(level, x, y - 1) === 'fence' || kindAt(level, x, y + 1) === 'fence';
          const along = vertical ? [0, 1] : [1, 0];
          const base = h * UNIT;
          for (let i = 0; i < 4; i++) {
            const t = -0.375 + i * 0.25;
            add(wood, x + 0.5 + along[0] * t, base + 0.25, y + 0.5 + along[1] * t, 0.09, 0.5, 0.09);
          }
          for (const r of [0.16, 0.36]) add(wood, x + 0.5, base + r, y + 0.5, along[0] ? 1 : 0.06, 0.06, along[1] ? 1 : 0.06);
        }
        if (isDark(level, x, y)) {
          const mesh = add(shadow, x + 0.5, h * UNIT + 0.6, y + 0.5, 1, 1.2, 1);
          mesh.renderOrder = 5;
        }
      }
    }
  }

  private fit() {
    const w = this.container.clientWidth || 720;
    const h = this.container.clientHeight || 480;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private makeSprite(): THREE.Sprite {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.5 }));
    sprite.center.set(0.5, 0);
    this.scene.add(sprite);
    return sprite;
  }

  private material(key: string, canvas: HTMLCanvasElement): THREE.SpriteMaterial {
    let mat = this.materials.get(key);
    if (!mat) {
      const tex = pixelTexture(canvas);
      this.textures.push(tex);
      mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5 });
      this.materials.set(key, mat);
    }
    return mat;
  }

  private place(sprite: THREE.Sprite, actor: Actor3D) {
    sprite.material = this.material(actor.key, actor.canvas);
    sprite.material.color.set(actor.tint ?? '#ffffff');
    sprite.position.set(actor.x + 0.5, this.groundAt(actor.x, actor.y) + (actor.lift ?? 0), actor.y + 0.5);
    sprite.visible = true;
  }

  render(frame: Frame3D) {
    this.floorTexture.needsUpdate = true;

    for (const [key, mesh] of this.secretBlocks) mesh.visible = !frame.openSecrets.has(key);

    this.place(this.playerSprite, frame.player);
    while (this.enemySprites.length < frame.enemies.length) this.enemySprites.push(this.makeSprite());
    while (this.bars.length < frame.enemies.length) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.08), new THREE.MeshBasicMaterial({ color: 0x22c55e, depthTest: false }));
      bar.renderOrder = 10;
      this.scene.add(bar);
      this.bars.push(bar);
    }
    this.enemySprites.forEach((sprite, i) => {
      const enemy = frame.enemies[i];
      const bar = this.bars[i];
      if (!enemy) {
        sprite.visible = false;
        bar.visible = false;
        return;
      }
      this.place(sprite, enemy);
      bar.visible = enemy.hp !== undefined;
      if (enemy.hp !== undefined) {
        bar.position.set(enemy.x + 0.5, this.groundAt(enemy.x, enemy.y) + 1.15, enemy.y + 0.5);
        bar.scale.x = Math.max(0.05, enemy.hp);
        bar.quaternion.copy(this.camera.quaternion);
      }
    });
    this.crystalSprite.position.set(frame.crystal.x + 0.5, this.groundAt(frame.crystal.x, frame.crystal.y) + 0.45 + frame.crystal.lift, frame.crystal.y + 0.5);

    // Overview tilts over the whole board; follow sits close behind the hero.
    const px = frame.player.x + 0.5;
    const pz = frame.player.y + 0.5;
    if (this.mode === 'overview') {
      this.camPos.set(COLS / 2, 12.5, ROWS + 7);
      this.camTarget.set(COLS / 2, 0, ROWS / 2 - 0.3);
    } else {
      const ground = this.groundAt(frame.player.x, frame.player.y);
      this.camPos.set(px, ground + 6, pz + 3.6);
      this.camTarget.set(px, ground + 0.3, pz - 0.6);
    }
    this.camera.position.lerp(this.camPos, 0.12);
    const look = new THREE.Vector3().copy(this.camTarget);
    this.camera.lookAt(look);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resize.disconnect();
    for (const t of this.textures) t.dispose();
    for (const mat of this.materials.values()) mat.dispose();
    for (const thing of this.disposables) thing.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
