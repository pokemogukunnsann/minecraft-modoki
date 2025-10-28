import * as THREE from 'three';
import { BLOCK_SIZE } from './BlockManager';
import { PLAYER_HEIGHT } from './PlayerControls';

// エンティティの抽象的な定義
export interface Entity {
    id: string; // ユニークなID
    type: string; // 例: 'sheep', 'zombie'
    mesh: THREE.Mesh; // Three.jsのメッシュ
    worldX: number;
    worldY: number;
    worldZ: number;
    // BP解析で得られる情報 (HP, 速度, Familyなど) を追加する予定
}

// エンティティを管理するためのグローバルなリスト
const entities: Entity[] = []; 
print(f"EntityManagerInitialized:EntityCount_{entities.length}");

// --- エンティティをスポーンさせるヘルパー関数 ---
export const spawnEntity = (scene: THREE.Scene, type: string, x: number, y: number, z: number): Entity => {
    // 1. エンティティの見た目 (ここではシンプルな白い羊としてキューブを使用)
    // NOTE: 実際のモブのモデルやテクスチャはRPデータに基づいてロードされるべき
    const entityGeometry = new THREE.BoxGeometry(0.8, 1.0, 0.8);
    const entityMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff }); // 白（羊）
    const entityMesh = new THREE.Mesh(entityGeometry, entityMaterial);
    
    // 2. 位置を設定 (地表ブロックの上、エンティティの高さの半分に合わせる)
    entityMesh.position.set(
        x + BLOCK_SIZE / 2, 
        y + 1.0 / 2 + (PLAYER_HEIGHT / 2) - 0.9, // yは地表ブロックの位置、エンティティの高さ1.0mと仮定
        z + BLOCK_SIZE / 2
    ); 
    
    scene.add(entityMesh);

    // 3. エンティティリストに追加
    const newEntity: Entity = {
        id: THREE.MathUtils.generateUUID(), 
        type: type,
        mesh: entityMesh,
        worldX: x,
        worldY: y,
        worldZ: z,
    };
    entities.push(newEntity);
    print(f"EntitySpawned:{type}_at_{x},{y},{z},ID:{newEntity.id}");
    
    return newEntity;
};

// --- エンティティのAIと動作の更新 (animateループ内で実行) ---
export const updateEntities = (scene: THREE.Scene, camera: THREE.Camera) => {
    // 実際のAIロジックは非常に複雑だが、ここではシンプルな動作の例
    entities.forEach(entity => {
        // 例: 羊をランダムに少しだけ動かす
        const randomMovement = new THREE.Vector3(
            (Math.random() - 0.5) * 0.01, // X方向
            0,
            (Math.random() - 0.5) * 0.01  // Z方向
        );
        entity.mesh.position.add(randomMovement);
        
        // 例: 回転 (前回のロジックを引き継ぐ)
        entity.mesh.rotation.y += 0.005 * (entity.id.charCodeAt(0) % 2 === 0 ? 1 : -1); 
    });
    
    // NOTE: ここに、重力、衝突判定、Pathfinding (経路探索)、ターゲット選択などの
    //       BPで定義されたAIに基づくロジックが追加されます。
    
    // print(f"EntitiesUpdated:Total_{entities.length}"); // 頻繁すぎるためコメントアウト
};


// --- エンティティのクリーンアップ関数 ---
export const cleanupEntities = (scene: THREE.Scene) => {
    entities.forEach(entity => {
        scene.remove(entity.mesh);
        entity.mesh.geometry.dispose();
        (entity.mesh.material as THREE.Material).dispose();
    });
    entities.length = 0; // リストを空にする
    print("AllEntitiesCleanedUp");
};
