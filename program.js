// ============ SYSTÈME DE JEU 2D ============
// Version RESTAURÉE & CORRIGÉE
// - IDs 1:1 ('01' = 1, etc.)
// - Système de Thèmes par Map (appropriation des tiles)
// - Santé, Stamina, UI, ZSQD, Animation fluide
// - SYSTÈME DE VIES (3 Cœurs)
// - CONDITION DE VICTOIRE (YOU WON)

const TILE_SIZE = 200;

const TILE_CATEGORY = {
    SOLID: 'solid',
    BACKGROUND: 'background',
    LADDER: 'ladder',
    PORTAL: 'portal',
    LAVA: 'lava',
};

const NUMBER_TO_ID = {
    '00': 0, '01': 1, '02': 2, '03': 3, '04': 4, '05': 5,
    '06': 6, '07': 7, '08': 8, '09': 9, '10': 10, '11': 11,
    '12': 12, '13': 13
};

const TILE_TYPES = {
    0: { category: TILE_CATEGORY.SOLID,      image: 'assets/TILES/black1.png' },
    1: { category: TILE_CATEGORY.BACKGROUND, image: 'assets/TILES/SKY2.png' },
    2: { category: TILE_CATEGORY.SOLID,      image: 'assets/TILES/GRASS.png' },
    3: { category: TILE_CATEGORY.LADDER,     image: 'assets/TILES/LADDERS.png' },
    4: { category: TILE_CATEGORY.PORTAL,     image: 'assets/TILES/PORTAL-1.png' },
    5: { category: TILE_CATEGORY.BACKGROUND, image: 'assets/TILES/STONE-2.png' },
    6: { category: TILE_CATEGORY.BACKGROUND, image: 'assets/TILES/STONE-1.png' },
    7: { category: TILE_CATEGORY.SOLID,      image: 'assets/TILES/GRASS-STONE-1.png' },
    8: { category: TILE_CATEGORY.SOLID,      image: 'assets/TILES/SOL/SOL-1-2.png' },
    9: { category: TILE_CATEGORY.SOLID,      image: 'assets/TILES/SOL/SOL-2-2.png' },
    10: { category: TILE_CATEGORY.SOLID,     image: 'assets/TILES/SOL/SOL-3-2.png' },
    11: { category: TILE_CATEGORY.SOLID,     image: 'assets/TILES/SOL/SOL-4-2.png' },
    12: { category: TILE_CATEGORY.LAVA,      image: 'assets/TILES/LAVA.png' },
    13: { category: TILE_CATEGORY.BACKGROUND, image: 'assets/TILES/SKY3.png' }
};

const MAP_THEMES = {
    'map3': { 1: 'assets/TILES/STONE-1.png' }
};

class Tile {
    constructor(x, y, type = 1, mapId = 'map1') {
        this.x = x; this.y = y; this.type = type;
        const data = TILE_TYPES[type] || TILE_TYPES[1];
        this.category = data.category;
        let imgSrc = data.image;
        if (MAP_THEMES[mapId] && MAP_THEMES[mapId][type]) imgSrc = MAP_THEMES[mapId][type];
        this.image = new Image(); this.image.src = imgSrc;
        this.linkedPortal = null;
    }
    isSolid() { return this.category === TILE_CATEGORY.SOLID; }
    isBackground() { return this.category === TILE_CATEGORY.BACKGROUND; }
    isLadder() { return this.category === TILE_CATEGORY.LADDER; }
    isPortal() { return this.category === TILE_CATEGORY.PORTAL; }
    isLava() { return this.category === TILE_CATEGORY.LAVA; }
}

class GameMap {
    constructor(id, width, height) {
        this.id = id; this.width = width; this.height = height; this.tiles = [];
        this.initializeMap();
    }
    initializeMap() {
        this.tiles = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) { this.tiles.push(new Tile(x, y, 1, this.id)); }
        }
    }
    loadFromGrid(grid) {
        this.height = grid.length; this.width = grid[0].length; this.tiles = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let tileId = grid[y][x];
                if (typeof tileId === 'string') { tileId = NUMBER_TO_ID[tileId] ?? 1; }
                this.tiles.push(new Tile(x, y, tileId, this.id));
            }
        }
    }
    getTile(x, y) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
        return this.tiles[y * this.width + x];
    }
}

class Player {
    constructor(x, y, size = 80) {
        this.x = x; this.y = y; this.size = size; this.color = '#ff6b6b';
        this.velocityX = 0; this.velocityY = 0;
        this.speed = 8; this.jumpPower = 26; this.gravity = 0.8;
        this.isJumping = false; this.isClimbing = false;
        this.keys = {}; this.portalCooldown = false;
        this.direction = 'R'; this.animTimer = 0; this.animIndex = 0;
        this.sprites = {}; this.loadSprites();
        this.maxStamina = 4000; this.stamina = 4000;
        this.isDashing = false; this.dashMultiplier = 2; this.staminaRegenRate = 0.5;
        this.maxHealth = 100; this.health = 100; this.isBurning = false; this.lavaSlowdown = 0.4;
        this.lives = 3; this.maxLives = 3;
    }
    loadSprites() {
        const paths = {
            'STATIC': 'assets/TILES/PERSO/STATIC.png',
            'R-N': 'assets/TILES/PERSO/R-N.png', 'G-N': 'assets/TILES/PERSO/G-N.png',
            'R-R1': 'assets/TILES/PERSO/R-R1.png', 'R-R2': 'assets/TILES/PERSO/R-R2.png',
            'G-R1': 'assets/TILES/PERSO/G-R1.png', 'G-R2': 'assets/TILES/PERSO/G-R2.png',
            'R-S1': 'assets/TILES/PERSO/R-S1.png', 'G-S1': 'assets/TILES/PERSO/G-S1.png'
        };
        for (let key in paths) { this.sprites[key] = new Image(); this.sprites[key].src = paths[key]; }
    }
    update(map, game) {
        let newX = this.x, newY = this.y; const deltaTime = 1000 / 60;
        const onLava = this.isInLava(map); this.isBurning = onLava;
        if (this.isBurning) {
            this.health -= 0.5; if (this.health <= 0) { this.health = 0; game.respawnPlayer(); }
        } else { this.health = Math.min(this.health + 0.05, this.maxHealth); }
        if (this.isDashing && this.keys['Shift'] && (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['q'] || this.keys['ArrowRight'] || this.keys['d'])) {
            this.stamina -= deltaTime; if (this.stamina <= 0) { this.stamina = 0; this.isDashing = false; }
        } else { this.stamina = Math.min(this.stamina + (deltaTime * this.staminaRegenRate), this.maxStamina); }
        let curSpd = this.speed; if (onLava) curSpd *= this.lavaSlowdown;
        if (this.keys['Shift'] && this.stamina > 0) { this.isDashing = true; curSpd *= this.dashMultiplier; } else { this.isDashing = false; }
        let moveX = 0, isMoving = false;
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['q']) { moveX = -curSpd; this.direction = 'G'; isMoving = true; }
        if (this.keys['ArrowRight'] || this.keys['d']) { moveX = curSpd; this.direction = 'R'; isMoving = true; }
        if (isMoving && !this.isJumping && !this.isClimbing) {
            this.animTimer += deltaTime; if (this.animTimer >= 150) { this.animIndex = (this.animIndex + 1) % 2; this.animTimer = 0; }
        } else { this.animTimer = 0; this.animIndex = 0; }
        const onLadder = this.isOnLadder(map);
        if (onLadder) {
            if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['z']) { this.isClimbing = true; this.velocityY = 0; newY -= this.speed; }
            else if (this.keys[' ']) { this.isClimbing = false; this.velocityY = -this.jumpPower; this.isJumping = true; newY += this.velocityY; }
            else if (this.keys['ArrowDown'] || this.keys['s']) { this.isClimbing = true; this.velocityY = 0; newY += this.speed; }
            else { this.isClimbing = false; this.velocityY += this.gravity; newY += this.velocityY; }
        } else {
            this.isClimbing = false; if (this.isOnGround(map) && (this.keys['ArrowUp'] || this.keys['w'] || this.keys['z'] || this.keys[' '])) { this.velocityY = -this.jumpPower; this.isJumping = true; }
            this.velocityY += this.gravity; newY += this.velocityY;
        }
        if (!this.collides(map, newX + moveX, this.y)) newX += moveX;
        if (!this.collides(map, newX, newY)) { this.y = newY; } else {
            if (this.isClimbing && this.isOnLadder(map)) { this.y = newY; } else {
                if (this.velocityY > 0) { this.y = Math.floor((newY + this.size) / TILE_SIZE) * TILE_SIZE - this.size; }
                this.velocityY = 0; this.isJumping = false;
            }
        }
        this.x = newX;
        const pt = this.getCurrentTile(map);
        if (pt?.isPortal()) {
            if (this.keys['Enter'] && !this.portalCooldown && pt.linkedPortal) { game.triggerTeleport(pt.linkedPortal); this.portalCooldown = true; }
        }
        if (!this.keys['Enter']) this.portalCooldown = false;
    }
    collides(map, x, y) {
        const l = Math.floor(x / TILE_SIZE), r = Math.floor((x + this.size - 1) / TILE_SIZE);
        const t = Math.floor(y / TILE_SIZE), b = Math.floor((y + this.size - 1) / TILE_SIZE);
        for (let ty = t; ty <= b; ty++) { for (let tx = l; tx <= r; tx++) { if (map.getTile(tx, ty)?.isSolid()) return true; } }
        return false;
    }
    isOnGround(map) {
        const fx1 = Math.floor(this.x / TILE_SIZE), fx2 = Math.floor((this.x + this.size - 1) / TILE_SIZE), fy = Math.floor((this.y + this.size + 1) / TILE_SIZE);
        return map.getTile(fx1, fy)?.isSolid() || map.getTile(fx2, fy)?.isSolid();
    }
    isOnLadder(map) {
        const l = Math.floor(this.x / TILE_SIZE), r = Math.floor((this.x + this.size - 1) / TILE_SIZE), t = Math.floor(this.y / TILE_SIZE), b = Math.floor((this.y + this.size - 1) / TILE_SIZE);
        for (let ty = t; ty <= b; ty++) { for (let tx = l; tx <= r; tx++) { if (map.getTile(tx, ty)?.isLadder()) return true; } }
        return false;
    }
    isInLava(map) {
        const l = Math.floor(this.x / TILE_SIZE), r = Math.floor((this.x + this.size - 1) / TILE_SIZE), t = Math.floor(this.y / TILE_SIZE), b = Math.floor((this.y + this.size - 1) / TILE_SIZE);
        for (let ty = t; ty <= b; ty++) { for (let tx = l; tx <= r; tx++) { if (map.getTile(tx, ty)?.isLava()) return true; } }
        return false;
    }
    getCurrentTile(map) { const cx = Math.floor((this.x + this.size/2) / TILE_SIZE), cy = Math.floor((this.y + this.size/2) / TILE_SIZE); return map.getTile(cx, cy); }
    draw(ctx, offsetX, offsetY, zoom, game) {
        let sk; const isMov = (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['q'] || this.keys['ArrowRight'] || this.keys['d']);
        const gnd = this.isOnGround(game.map);
        if (!gnd && !this.isClimbing) { sk = `${this.direction}-S1`; }
        else if (isMov && !this.isClimbing) { const seq = ['R2', 'R1']; sk = `${this.direction}-${seq[this.animIndex]}`; }
        else { sk = 'STATIC'; }
        const img = this.sprites[sk];
        if (img && img.complete) {
            const r = img.width / img.height, dh = this.size * zoom, dw = dh * r;
            const dx = (this.x - offsetX) * zoom + (this.size * zoom / 2) - (dw / 2), dy = (this.y - offsetY) * zoom + (this.size * zoom) - dh;
            ctx.drawImage(img, dx, dy, dw, dh);
        } else { ctx.fillStyle = this.color; ctx.fillRect((this.x - offsetX) * zoom, (this.y - offsetY) * zoom, this.size * zoom, this.size * zoom); }
    }
}

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId); this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 1200; this.canvas.height = 675; this.zoom = 1; this.cameraX = 0; this.cameraY = 0;
        this.maps = {}; this.currentMapId = null; this.player = null; this.running = false;
        this.startTime = 0; this.elapsedTime = 0; this.fadeAlpha = 0; this.isFading = false; this.teleportTarget = null;
        this.gameWon = false;
        this.setupKeyboard();
    }
    get map() { return this.maps[this.currentMapId]; }
    setupKeyboard() {
        window.addEventListener('keydown', (e) => { 
            if (this.player) this.player.keys[e.key] = true; 
            if (this.gameWon && (e.key === 'r' || e.key === 'R')) window.location.href = 'index.html';
        });
        window.addEventListener('keyup', (e) => { if (this.player) this.player.keys[e.key] = false; });
    }
    createMap(id, w, h) { const m = new GameMap(id, w, h); this.maps[id] = m; if (!this.currentMapId) this.currentMapId = id; return m; }
    switchMap(id) { if (this.maps[id]) this.currentMapId = id; }
    spawnPlayer(tx, ty) { this.player = new Player(tx * TILE_SIZE, ty * TILE_SIZE); }
    respawnPlayer() {
        this.player.lives--;
        if (this.player.lives <= 0) { this.player.lives = 3; }
        let sx = 6, sy = 2; if (this.currentMapId === 'map1') { sx = 4; sy = 3; }
        this.player.x = sx * TILE_SIZE; this.player.y = sy * TILE_SIZE; this.player.velocityY = 0; this.player.health = this.player.maxHealth;
    }
    addPortalPair(m1, x1, y1, m2, x2, y2) {
        const p1 = this.maps[m1]?.getTile(x1, y1), p2 = this.maps[m2]?.getTile(x2, y2);
        if (p1 && p2) { p1.linkedPortal = { mapId: m2, x: x2, y: y2 }; p2.linkedPortal = { mapId: m1, x: x1, y: y1 }; }
    }
    updateCamera() { this.cameraX = this.player.x - this.canvas.width / 2 / this.zoom; this.cameraY = this.player.y - this.canvas.height / 2 / this.zoom; }
    drawMap() {
        if (!this.map) return;
        const sx = Math.floor(this.cameraX / TILE_SIZE), sy = Math.floor(this.cameraY / TILE_SIZE);
        for (let y = sy; y < sy + 20; y++) { for (let x = sx; x < sx + 20; x++) {
            const t = this.map.getTile(x, y); if (!t) continue;
            this.ctx.drawImage(t.image, (x * TILE_SIZE - this.cameraX) * this.zoom, (y * TILE_SIZE - this.cameraY) * this.zoom, TILE_SIZE * this.zoom, TILE_SIZE * this.zoom);
        } }
    }
    triggerTeleport(dest) { this.isFading = true; this.teleportTarget = dest; }
    drawUI() {
        const bh = 60, by = this.canvas.height - bh;
        this.ctx.fillStyle = 'rgba(0,0,0,0.9)'; this.ctx.fillRect(0, by, this.canvas.width, bh);
        this.ctx.strokeStyle = '#ffffff'; this.ctx.strokeRect(0, by, this.canvas.width, bh);
        this.ctx.font = '13px Menlo, monospace'; this.ctx.fillStyle = '#ffffff'; this.ctx.textAlign = 'left';
        let hearts = ""; for(let i=0; i<this.player.lives; i++) hearts += "❤";
        this.ctx.fillText(`LIVES: ${hearts}`, 20, by + 35);
        this.ctx.textAlign = 'center';
        const tx = Math.floor(this.player.x / TILE_SIZE), ty = Math.floor(this.player.y / TILE_SIZE);
        this.ctx.fillText(`MAP: ${this.currentMapId.toUpperCase()} | POS: (${tx}, ${ty})`, this.canvas.width/2, by + 35);
        this.ctx.textAlign = 'right'; const sec = Math.floor(this.elapsedTime / 1000);
        this.ctx.fillText(`TIME: ${Math.floor(sec/60)}:${(sec%60).toString().padStart(2,'0')}`, this.canvas.width - 320, by + 35);
        this.ctx.fillStyle = '#ffffff'; this.ctx.fillText('[SHIFT] DASH', this.canvas.width - 180, by + 35);
        const bw = 150, bht = 12, bx = this.canvas.width - 170;
        this.ctx.strokeStyle = '#ffffff'; this.ctx.strokeRect(bx, by + 8, bw, bht);
        this.ctx.fillStyle = '#ffffff'; this.ctx.fillRect(bx, by + 8, bw * (this.player.health/this.player.maxHealth), bht);
        this.ctx.strokeRect(bx, by + 28, bw, bht);
        this.ctx.fillStyle = this.player.isDashing ? '#ffffff' : '#888888';
        this.ctx.fillRect(bx, by + 28, bw * (this.player.stamina/this.player.maxStamina), bht);
        if (this.fadeAlpha > 0) {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffffff'; this.ctx.font = 'bold 30px Menlo, monospace'; this.ctx.textAlign = 'center';
            this.ctx.fillText("TELEPORTING...", this.canvas.width/2, this.canvas.height/2);
        }
    }
    update() {
        if (!this.running) return;
        
        // Calcul du temps écoulé depuis le début de la partie
        this.elapsedTime = Date.now() - this.startTime;

        if (this.isFading) {
            this.fadeAlpha += 0.05;
            if (this.fadeAlpha >= 1) {
                this.fadeAlpha = 1; const d = this.teleportTarget;
                if (d.isWin) { 
                    window.location.href = `victory.html?time=${this.elapsedTime}`;
                    return; 
                }
                if (d.mapId && d.mapId !== this.currentMapId) this.switchMap(d.mapId);
                this.player.x = d.x * TILE_SIZE + TILE_SIZE/2 - this.player.size/2;
                this.player.y = d.y * TILE_SIZE + TILE_SIZE/2 - this.player.size/2;
                this.teleportTarget = null; this.isFading = false;
            }
        } else if (this.fadeAlpha > 0) { this.fadeAlpha -= 0.05; if (this.fadeAlpha < 0) this.fadeAlpha = 0; }
        this.player.update(this.map, this);
        if (this.player.y > this.map.height * TILE_SIZE) this.respawnPlayer();
        this.updateCamera(); this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
        this.drawMap(); this.player.draw(this.ctx, this.cameraX, this.cameraY, this.zoom, this);
        this.drawUI(); requestAnimationFrame(() => this.update());
    }
    start() { 
        this.running = true; 
        this.startTime = Date.now(); // On capture le moment exact du lancement
        this.update(); 
    }
}
if (typeof window !== 'undefined') { window.Game = Game; window.GameMap = GameMap; window.Tile = Tile; }