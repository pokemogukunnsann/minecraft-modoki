import * as THREE from 'three';

// ブロックのサイズ
export const BLOCK_SIZE = 1;
print(f"BLOCK_SIZE:{BLOCK_SIZE}")

// ブロックの識別子 (前回の定義をすべて移動)
export const BLOCK_TYPE = {
    AIR: 0,
    GRASS: 1,      
    DIRT: 2,       
    STONE: 3,      
    BEDROCK: 4,   
    WATER: 5,      
    LAVA: 6,       
    OAK_LOG: 7,    
    OAK_LEAVES: 8, 
    TALL_GRASS: 9, 
    IRON_ORE: 10,  
    COAL_ORE: 11,  
    // TOWER_BLOCKなどを追加する場合はここに
};
print(f"BLOCK_TYPE.GRASS:{BLOCK_TYPE.GRASS}")

// ブロックのジオメトリ
const cubeGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

// ブロックのマテリアル
export const blockMaterials: { [key: number]: THREE.MeshStandardMaterial } = {
    [BLOCK_TYPE.GRASS]: new THREE.MeshStandardMaterial({ color: 0x00cc00 }),
    [BLOCK_TYPE.DIRT]: new THREE.MeshStandardMaterial({ color: 0x964b00 }),
    [BLOCK_TYPE.STONE]: new THREE.MeshStandardMaterial({ color: 0x808080 }),
    [BLOCK_TYPE.BEDROCK]: new THREE.MeshStandardMaterial({ color: 0x333333 }),
    [BLOCK_TYPE.WATER]: new THREE.MeshStandardMaterial({ color: 0x0099ff, transparent: true, opacity: 0.7 }),
    [BLOCK_TYPE.LAVA]: new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff4500, emissiveIntensity: 0.5 }),
    [BLOCK_TYPE.OAK_LOG]: new THREE.MeshStandardMaterial({ color: 0x8b4513 }),
    [BLOCK_TYPE.OAK_LEAVES]: new THREE.MeshStandardMaterial({ color: 0x38761d, transparent: true, opacity: 0.9 }), 
    [BLOCK_TYPE.TALL_GRASS]: new THREE.MeshStandardMaterial({ color: 0x6aa84f }),
    [BLOCK_TYPE.IRON_ORE]: new THREE.MeshStandardMaterial({ color: 0xc4a170 }),
    [BLOCK_TYPE.COAL_ORE]: new THREE.MeshStandardMaterial({ color: 0x4f4f4f }),
};

// ブロックの位置 (x,y,z) をキーとしたマップ
export type BlockMap = Map<string, THREE.Mesh>;

// --- ブロックをマップに追加するヘルパー関数 ---
export const addBlock = (scene: THREE.Scene, blockMap: BlockMap, x: number, y: number, z: number, type: number = BLOCK_TYPE.GRASS) => {
    const key = `${x},${y},${z}`;
    if (blockMap.has(key)) return; 

    // マテリアルをクローンして、ブロックごとにインスタンスを作成
    const material = blockMaterials[type].clone(); 
    const block = new THREE.Mesh(cubeGeometry, material);
    
    // 位置を設定 (グリッド座標をワールド座標に変換し、中心を合わせる)
    block.position.set(
        x * BLOCK_SIZE + BLOCK_SIZE / 2, 
        y * BLOCK_SIZE + BLOCK_SIZE / 2, 
        z * BLOCK_SIZE + BLOCK_SIZE / 2
    );
    scene.add(block);
    blockMap.set(key, block);
    print(f"BlockAdded:{key}")
};

// --- ブロックをマップから削除するヘルパー関数 ---
export const removeBlock = (scene: THREE.Scene, blockMap: BlockMap, x: number, y: number, z: number): boolean => {
    const key = `${x},${y},${z}`;
    const block = blockMap.get(key);
    if (block) {
        scene.remove(block); 
        blockMap.delete(key); 
        block.geometry.dispose();
        (block.material as THREE.Material).dispose();
        print(f"BlockRemoved:{key}")
        return true;
    }
    return false;
};

// --- マウスによるブロック操作の初期設定とロジック ---
export const setupBlockInteraction = (camera: THREE.PerspectiveCamera, controls: any, scene: THREE.Scene, blockMap: BlockMap) => {
    const raycaster = new THREE.Raycaster();
    const RAYCAST_DISTANCE = 5; // ブロック操作の最大距離
    print(f"RaycasterInitialized:MaxDistance_{RAYCAST_DISTANCE}")

    const handleMouseDown = (event: MouseEvent) => {
        if (!controls.isLocked) return;

        // Raycasterをカメラの中心から設定
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        raycaster.far = RAYCAST_DISTANCE;

        // ブロックのメッシュを対象に光線を飛ばす
        const intersectableObjects = Array.from(blockMap.values());
        const intersects = raycaster.intersectObjects(intersectableObjects, false);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            const intersectedBlock = intersect.object as THREE.Mesh;
            
            // ブロックのグリッド座標を計算
            const blockX = Math.floor(intersectedBlock.position.x / BLOCK_SIZE);
            const blockY = Math.floor(intersectedBlock.position.y / BLOCK_SIZE);
            const blockZ = Math.floor(intersectedBlock.position.z / BLOCK_SIZE);
            
            if (event.button === 0) { // 左クリック: 破壊
                removeBlock(scene, blockMap, blockX, blockY, blockZ);
            } else if (event.button === 2) { // 右クリック: 配置
                // 配置するブロックの位置を計算 (当たった面から1ブロックずらす)
                const normal = intersect.face!.normal.clone();
                normal.transformDirection(intersectedBlock.matrixWorld); 
                
                const newX = blockX + Math.round(normal.x);
                const newY = blockY + Math.round(normal.y);
                const newZ = blockZ + Math.round(normal.z);
                
                // 配置するブロックの種類 (ここでは仮に石)
                addBlock(scene, blockMap, newX, newY, newZ, BLOCK_TYPE.STONE); 
            }
        }
    };

    // 右クリックメニューを無効化
    const handleContextMenu = (event: MouseEvent) => {
         event.preventDefault();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('contextmenu', handleContextMenu);
    
    // クリーンアップ関数を返す
    return () => {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('contextmenu', handleContextMenu);
        print("BlockInteractionCleanedUp")
    };
};
