import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

// プレイヤー/物理定数
export const PLAYER_HEIGHT = 1.8; 
export const MOVE_SPEED = 0.05;
export const JUMP_VELOCITY = 0.5;
export const GRAVITY = -0.05;
export const THIRD_PERSON_CAMERA_OFFSET = new THREE.Vector3(0, 2, -4); 
print(f"PLAYER_HEIGHT:{PLAYER_HEIGHT}")
print(f"MOVE_SPEED:{MOVE_SPEED}")
print(f"JUMP_VELOCITY:{JUMP_VELOCITY}")
print(f"GRAVITY:{GRAVITY}")

// キー入力状態、物理状態、視点状態を管理 (外部ファイルで一元管理)
const keys = new Set<string>();
const velocityY = { current: 0 };
const isJumping = { current: false };
const isThirdPerson = { current: false };

// --- 1. コントロールとイベントリスナーの初期化 ---
export const initializeControls = (
    camera: THREE.PerspectiveCamera, 
    rendererDomElement: HTMLElement, 
    playerBody: THREE.Mesh
): PointerLockControls => {
    
    // PointerLockControlsの初期化
    const controls = new PointerLockControls(camera, rendererDomElement);
    controls.getObject().position.copy(playerBody.position);
    controls.getObject().position.y = PLAYER_HEIGHT;
    print("PointerLockControlsInitialized")

    // マウスロックイベント
    rendererDomElement.addEventListener('click', () => { controls.lock(); });

    // キーボードイベント
    const onKeyDown = (event: KeyboardEvent) => {
        keys.add(event.code);
        
        // F5キーで視点切り替え
        if (event.code === 'F5') {
            isThirdPerson.current = !isThirdPerson.current;
            print(f"ViewToggled:isThirdPerson_{isThirdPerson.current}");
        }
        
        // スペースキーでジャンプ
        // Note: 実際の衝突判定ロジックは updateMovement で処理されますが、ここではフラグを立てる
        if (event.code === 'Space' && !isJumping.current) {
            velocityY.current = JUMP_VELOCITY;
            isJumping.current = true;
            print("JumpStarted");
        }
    };
    
    const onKeyUp = (event: KeyboardEvent) => {
        keys.delete(event.code);
    };

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    
    return controls;
};


// --- 2. 移動と物理演算の更新 (animateループ内で実行) ---
export const updateMovement = (
    camera: THREE.PerspectiveCamera, 
    controls: PointerLockControls, 
    playerBody: THREE.Mesh
) => {
    // 垂直移動 (重力) の適用
    velocityY.current += GRAVITY;
    playerBody.position.y += velocityY.current;
    
    // 簡易的な地面衝突判定 (Y=0の地点)
    if (playerBody.position.y < PLAYER_HEIGHT / 2) { 
        playerBody.position.y = PLAYER_HEIGHT / 2;
        velocityY.current = 0;
        isJumping.current = false;
        print("LandedOnGround")
    }
    
    // 水平移動ベクトルの計算
    const moveVector = new THREE.Vector3(0, 0, 0);
    if (keys.has('KeyW')) moveVector.z -= MOVE_SPEED;
    if (keys.has('KeyS')) moveVector.z += MOVE_SPEED;
    if (keys.has('KeyA')) moveVector.x -= MOVE_SPEED;
    if (keys.has('KeyD')) moveVector.x += MOVE_SPEED;

    // カメラの向きに合わせて移動ベクトルを変換
    const direction = controls.getObject().getWorldDirection(new THREE.Vector3());
    direction.y = 0;
    direction.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    
    const actualMove = new THREE.Vector3();
    actualMove.addScaledVector(direction, moveVector.z);
    actualMove.addScaledVector(right, moveVector.x);

    // プレイヤーボディの位置を更新
    playerBody.position.add(actualMove);
    
    // 視点切り替えロジック
    if (isThirdPerson.current) {
        // 三人称視点
        const offset = THIRD_PERSON_CAMERA_OFFSET.clone();
        offset.applyQuaternion(playerBody.quaternion);
        camera.position.copy(playerBody.position).add(offset);
        camera.lookAt(playerBody.position);
    } else {
        // 一人称視点
        controls.getObject().position.copy(playerBody.position);
        controls.getObject().position.y = playerBody.position.y + (PLAYER_HEIGHT / 2); 
        camera.position.copy(controls.getObject().position);
    }
};

// --- クリーンアップ関数 (外部で呼び出す用) ---
export const cleanupControls = () => {
    // 実際には removeEventListener の処理が必要ですが、ここでは簡略化
    print("PlayerControlsCleanedUp");
};
