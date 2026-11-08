// 3D view for the 3D test mode. The game itself is unchanged: the 2D canvas still draws the floor and
// every ground effect (shots, blasts, rings), and here that canvas becomes the texture of a 3D floor.
// Walls are raised into blocks, and the hero, enemies and crystal stand upright as sprites.

import * as THREE from 'three';
import { COLS, FLOOR, ROWS, SECRET, type LevelDef } from './levels';

const WALL_HEIGHT = 0.75;

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
  mode: CameraMode = 'overview';

  constructor(private container: HTMLElement, level: LevelDef, wallSource: HTMLCanvasElement, floorSource: HTMLCanvasElement) {
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
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), new THREE.MeshBasicMaterial({ map: this.floorTexture }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(COLS / 2, 0, ROWS / 2);
    this.scene.add(floor);

    // Walls rise up as blocks; secret passages are blocks that open once found.
    const wallTexture = pixelTexture(wallSource);
    this.textures.push(wallTexture);
    const wallMaterial = new THREE.MeshLambertMaterial({ map: wallTexture });
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
    solid.forEach(([x, y], i) => walls.setMatrixAt(i, m.makeTranslation(x + 0.5, WALL_HEIGHT / 2, y + 0.5)));
    this.scene.add(walls);

    this.playerSprite = this.makeSprite();
    this.crystalSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: pixelTexture(crystalCanvas()), transparent: true, depthWrite: false }));
    this.crystalSprite.scale.set(0.7, 0.7, 1);
    this.scene.add(this.crystalSprite);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(container);
    this.fit();
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
    sprite.position.set(actor.x + 0.5, actor.lift ?? 0, actor.y + 0.5);
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
        bar.position.set(enemy.x + 0.5, 1.15, enemy.y + 0.5);
        bar.scale.x = Math.max(0.05, enemy.hp);
        bar.quaternion.copy(this.camera.quaternion);
      }
    });
    this.crystalSprite.position.set(frame.crystal.x + 0.5, 0.45 + frame.crystal.lift, frame.crystal.y + 0.5);

    // Overview tilts over the whole board; follow sits close behind the hero.
    const px = frame.player.x + 0.5;
    const pz = frame.player.y + 0.5;
    if (this.mode === 'overview') {
      this.camPos.set(COLS / 2, 12.5, ROWS + 7);
      this.camTarget.set(COLS / 2, 0, ROWS / 2 - 0.3);
    } else {
      this.camPos.set(px, 5.2, pz + 4.6);
      this.camTarget.set(px, 0.3, pz - 0.6);
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
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
