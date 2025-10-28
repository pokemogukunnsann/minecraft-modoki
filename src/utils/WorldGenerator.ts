import * as THREE from 'three';
import { createNoise2D, createNoise3D } from 'simplex-noise';
import { BLOCK_TYPE, BLOCK_SIZE, BlockMap, addBlock } from './BlockManager';
// エンティティ生成のための関数をインポート（ここでは仮に関数定義のみ）
// import { spawnEntity } from './EntityManager'; 

// --- 地形生成定数 ---
const CHUNK_SIZE = 16;      // チャンクのサイズ (16x16)
const WORLD_HEIGHT = 256;    // ワールドの最大高さ (マイクラ統合版の基準に近い値に調整)
const GROUND_LEVEL = 64;    // 平均的な地表の高さ
const NOISE_SCALE = 0.05;   // 地形ノイズのスケール
const SEED = 'kakaomame';   // ワールドのシード値
print(f"CHUNK_SIZE:{CHUNK_SIZE}")
print(f"WORLD_HEIGHT:{WORLD_HEIGHT}")
print(f"GROUND_LEVEL:{GROUND_LEVEL}")

// --- 洞窟生成定数 ---
const CAVE_THRESHOLD = 0.5;   // 洞窟ノイズ閾値
const CAVE_SCALE = 0.1;       // 洞窟ノイズのスケール

// --- 流体生成定数 ---
const WATER_LEVEL = 62;     // 海/地下湖の水面高さ
const LAVA_DEPTH = 10;      // 溶岩を生成する深さの閾値
const LAVA_PROBABILITY = 0.2; // 溶岩になる空洞の確率

// --- 鉱石生成定数 ---
const ORE_NOISE_SCALE = 0.08; 
const IRON_THRESHOLD = 0.8;   
const COAL_THRESHOLD = 0.9;   
const IRON_MAX_Y = 60;        
const COAL_MAX_Y = 120;       

// --- 植生/ストラクチャー定数 ---
const GRASS_DENSITY = 0.5; 
const TREE_PROBABILITY = 0.01; 
const STRUCTURE_PROBABILITY = 0.05;

// Simplex Noiseジェネレーターを初期化
// NOTE: シード値に基づいたノイズ生成が必要だが、ここではcreateNoiseXを呼び出すのみ
const noise2D = createNoise2D(); 
const caveNoise3D = createNoise3D();
const oreNoise3D = createNoise3D();
print("NoiseGeneratorsInitialized")


// --- 植生/ストラクチャーのヘルパー関数 ---

// 木を生成するヘルパー関数
const generateTree = (scene: THREE.Scene, blockMap: BlockMap, worldX: number, surfaceY: number, worldZ: number) => {
    const trunkHeight = 4;
    
    // 1. 幹の配置
    for (let y = 0; y < trunkHeight; y++) {
        addBlock(scene, blockMap, worldX, surfaceY + y, worldZ, BLOCK_TYPE.OAK_LOG);
    }
    // 2. 葉の配置 (簡略化)
    const leafCenterY = surfaceY + trunkHeight;
    for (let lx = -2; lx <= 2; lx++) {
        for (let lz = -2; lz <= 2; lz++) {
            for (let ly = -2; ly <= 1; ly++) {
                const distSq = lx*lx + lz*lz + (ly-1)*(ly-1); 
                if (distSq < 5) {
                    addBlock(scene, blockMap, worldX + lx, leafCenterY + ly, worldZ + lz, BLOCK_TYPE.OAK_LEAVES);
                }
            }
        }
    }
};

// 塔を生成するヘルパー関数
const generateSimpleTower = (scene: THREE.Scene, blockMap: BlockMap, worldX: number, surfaceY: number, worldZ: number) => {
    const TOWER_HEIGHT = 10;
    const TOWER_SIZE = 3; 
    const halfSize = Math.floor(TOWER_SIZE / 2);
    
    for (let x = -halfSize; x <= halfSize; x++) {
        for (let z = -halfSize; z <= halfSize; z++) {
            if (Math.abs(x) === halfSize || Math.abs(z) === halfSize) {
                for (let y = 0; y < TOWER_HEIGHT; y++) {
                    addBlock(scene, blockMap, worldX + x, surfaceY + 1 + y, worldZ + z, BLOCK_TYPE.STONE);
                }
            }
        }
    }
};


// --- コアとなるチャンク生成関数 ---
export const generateChunk = (scene: THREE.Scene, blockMap: BlockMap, chunkX: number, chunkZ: number) => {
    const startX = chunkX * CHUNK_SIZE;
    const startZ = chunkZ * CHUNK_SIZE;
    
    print(f"GeneratingChunk:{chunkX},{chunkZ}")

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const worldX = startX + x;
            const worldZ = startZ + z;
            
            // 1. 2Dノイズで地表の高さを決定
            const heightNoise = noise2D(worldX * NOISE_SCALE, worldZ * NOISE_SCALE);
            const surfaceHeight = Math.floor(GROUND_LEVEL + heightNoise * 10); 
            
            // 2. 縦方向の層、洞窟、流体、鉱石の生成
            let topBlockY = -1; // GRASSブロックが配置されるY座標を追跡
            
            for (let y = 0; y < WORLD_HEIGHT; y++) {
                let blockType: number = BLOCK_TYPE.AIR;
                
                // A. 基本の層構造を決定
                if (y === 0) {
                    blockType = BLOCK_TYPE.BEDROCK;
                } else if (y < surfaceHeight - 4) {
                    blockType = BLOCK_TYPE.STONE;
                } else if (y < surfaceHeight - 1) {
                    blockType = BLOCK_TYPE.DIRT;
                } else if (y === surfaceHeight - 1) {
                    blockType = BLOCK_TYPE.GRASS;
                    topBlockY = y; // GRASSブロックの位置を更新
                } 

                // B. 洞窟生成ロジック
                if (y > 0 && y < surfaceHeight && blockType !== BLOCK_TYPE.AIR) {
                    const caveNoiseValue = caveNoise3D(worldX * CAVE_SCALE, y * CAVE_SCALE, worldZ * CAVE_SCALE);
                    if (caveNoiseValue < CAVE_THRESHOLD) {
                         blockType = BLOCK_TYPE.AIR; // 洞窟として空洞化
                    }
                }
                
                // E. 鉱石生成ロジック (STONEブロックを置き換え)
                if (blockType === BLOCK_TYPE.STONE) {
                    const oreNoiseValue = oreNoise3D(worldX * ORE_NOISE_SCALE, y * ORE_NOISE_SCALE, worldZ * ORE_NOISE_SCALE);
                    if (y <= IRON_MAX_Y && oreNoiseValue > IRON_THRESHOLD) {
                        blockType = BLOCK_TYPE.IRON_ORE;
                    } else if (y <= COAL_MAX_Y && oreNoiseValue > COAL_THRESHOLD) {
                        blockType = BLOCK_TYPE.COAL_ORE;
                    }
                }
                
                // C. 水・溶岩の配置ロジック (AIRブロックを置き換え)
                if (blockType === BLOCK_TYPE.AIR) {
                    if (y <= WATER_LEVEL) { 
                        if (y >= LAVA_DEPTH) { 
                            blockType = BLOCK_TYPE.WATER; // 水
                        } else {
                            if (Math.random() < LAVA_PROBABILITY) {
                                blockType = BLOCK_TYPE.LAVA; // 溶岩
                            }
                        }
                    }
                }

                // 最終決定されたブロックをシーンに追加
                if (blockType !== BLOCK_TYPE.AIR) {
                    addBlock(scene, blockMap, worldX, y, worldZ, blockType); 
                }
            }
            
            // --- D. 植生配置ロジック (yループの外側) ---
            if (topBlockY > 0) {
                // 1. 草の配置
                if (Math.random() < GRASS_DENSITY) {
                    addBlock(scene, blockMap, worldX, topBlockY + 1, worldZ, BLOCK_TYPE.TALL_GRASS);
                }

                // 2. 木の配置
                if (Math.random() < TREE_PROBABILITY) {
                    generateTree(scene, blockMap, worldX, topBlockY, worldZ); 
                }
                
                // F. モブスポーンロジック (EntityManagerで実装されることを想定し、ここではスキップ)
                // spawnEntity('sheep', worldX, topBlockY + 1, worldZ);
            }
        }
    }
    
    // --- G. ストラクチャーの配置ロジック (チャンクに一つだけ) ---
    if (Math.random() < STRUCTURE_PROBABILITY) {
        const centerWorldX = startX + Math.floor(CHUNK_SIZE / 2);
        const centerWorldZ = startZ + Math.floor(CHUNK_SIZE / 2);
        
        // チャンクの中心の地表高さを取得（ここでは簡略化のためGROUND_LEVELを使用）
        const surfaceY = GROUND_LEVEL; 
        
        generateSimpleTower(scene, blockMap, centerWorldX, surfaceY, centerWorldZ);
    }
};

// --- 初期ワールドの生成 (MinecraftCanvasから呼ばれる) ---
export const initializeWorld = (scene: THREE.Scene, blockMap: BlockMap) => {
    // プレイヤーの周囲3x3チャンクを生成
    const initialChunkRange = 1; 
    for (let cx = -initialChunkRange; cx <= initialChunkRange; cx++) {
        for (let cz = -initialChunkRange; cz <= initialChunkRange; cz++) {
            generateChunk(scene, blockMap, cx, cz);
        }
    }
    print(f"InitialWorldGenerated:Chunks_{(initialChunkRange*2+1)**2}")
};
