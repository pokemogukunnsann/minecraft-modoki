import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'; 

// 分割されたモジュールのインポート
import { BlockMap, setupBlockInteraction } from './utils/BlockManager';
import { initializeWorld } from './utils/WorldGenerator';
import { initializeControls, updateMovement, PLAYER_HEIGHT } from './utils/PlayerControls';
import { updateEntities, cleanupEntities } from './utils/EntityManager';

const MinecraftCanvas: React.FC = () => {
    // 描画ターゲットとThree.jsの参照
    const mountRef = useRef<HTMLDivElement>(null); 
    const playerBodyRef = useRef<THREE.Mesh | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<PointerLockControls | null>(null);
    
    // ブロックデータを管理 (状態を外部ファイルではなくメインコンポーネントで保持)
    const blockMap = useRef<BlockMap>(new Map()); 

    // 視点切り替えの管理 (ここでは簡略化のため、PlayerControls.tsに状態を委譲)
    // const [isThirdPerson, setIsThirdPerson] = useState(false); 

    // --- 1. 初期セットアップ ---
    useEffect(() => {
        if (!mountRef.current) return;
        
        // --- A. シーンとカメラの初期化 ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb); // 空の色
        
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraRef.current = camera; 
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current = renderer;
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);
        print("ThreeJSInitialized")
        
        // --- B. プレイヤーボディの初期化 ---
        const playerGeometry = new THREE.BoxGeometry(0.6, PLAYER_HEIGHT, 0.6); 
        const playerMaterial = new THREE.MeshPhongMaterial({ color: 0x0077ff, wireframe: true, transparent: true, opacity: 0.1 }); 
        const playerBody = new THREE.Mesh(playerGeometry, playerMaterial);
        playerBody.position.set(0, PLAYER_HEIGHT / 2, 0); 
        scene.add(playerBody);
        playerBodyRef.current = playerBody; 

        // --- C. コントロールの初期化 (PlayerControls.tsから) ---
        const controls = initializeControls(camera, renderer.domElement, playerBody);
        controlsRef.current = controls;

        // --- D. ブロック操作のセットアップ (BlockManager.tsから) ---
        const cleanupBlockInteraction = setupBlockInteraction(camera, controls, scene, blockMap.current);
        
        // --- E. 初期ワールドの生成 (WorldGenerator.tsから) ---
        initializeWorld(scene, blockMap.current);
        
        const light = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
        scene.add(light);
        print("InitialSetupComplete")

        // --- 2. アニメーションループ ---
        const animate = () => {
            requestAnimationFrame(animate);

            if (controls.isLocked) {
                // プレイヤーの移動/物理の更新 (PlayerControls.ts)
                updateMovement(camera, controls, playerBody); 
                
                // エンティティのAI/動作の更新 (EntityManager.ts)
                updateEntities(scene, camera); 
            }

            renderer.render(scene, camera);
        };
        
        animate();

        // --- 3. クリーンアップ ---
        return () => {
            // イベントリスナーの解放
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
            cleanupBlockInteraction();
            cleanupEntities(scene);
            
            // NOTE: Three.jsのリソース解放 (ジオメトリ、マテリアルなど) も必要
            print("CanvasCleanupComplete")
        };
    }, []); // 依存配列は空で一度だけ実行

    return (
        <div 
          ref={mountRef} 
          style={{ width: '100%', height: '100vh', cursor: 'pointer' }}
        >
          <div style={{
            position: 'absolute', top: '50%', left: '50%', 
            transform: 'translate(-50%, -50%)', 
            color: 'white', backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '10px', pointerEvents: 'none'
          }}>
            クリックして開始 (W/A/S/D, Space, F5で視点切替, 左クリック: 破壊, 右クリック: 配置) 🎮
          </div>
        </div>
      );
};

export default MinecraftCanvas;
