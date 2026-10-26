import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface Anatomy3DViewerProps {
  exerciseName?: string;
  muscleGroup?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const Anatomy3DViewer: React.FC<Anatomy3DViewerProps> = ({
  exerciseName = 'Supino Reto com Barra',
  muscleGroup = 'Peito',
  onClose,
  isModal = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1.0);
  const [cameraAngle, setCameraAngle] = useState<'front' | 'side' | 'isometric'>('isometric');

  const stateRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    characterGroup?: THREE.Group;
    equipmentGroup?: THREE.Group;
    isDragging: boolean;
    prevMousePos: { x: number; y: number };
    rotation: { x: number; y: number };
    animTime: number;
    reqId?: number;
  }>({
    isDragging: false,
    prevMousePos: { x: 0, y: 0 },
    rotation: { x: 0.1, y: 0.4 },
    animTime: 0,
  });

  // Coaching instructions mapping
  const getBiomechanicalInstructions = (exName: string, group: string) => {
    const norm = (exName + ' ' + group).toLowerCase();
    if (norm.includes('supino') || norm.includes('peito') || norm.includes('chest') || norm.includes('press')) {
      return {
        setup: 'Deite-se no banco com os pés firmes no chão e escápulas aduzidas (fechadas).',
        eccentric: 'Desça a barra ou halteres de forma controlada até encostar na linha dos mamilos.',
        concentric: 'Empurre com força explosiva sem descolar as escápulas ou elevar a lombar.',
        breathing: 'Inspire na descida do peso e solte o ar na fase concêntrica de empurrar.',
        cues: ['Mantenha os cotovelos em ~75°', 'Pegada firme e simétrica', 'Pés cravados no piso'],
        activeMuscles: [
          { name: 'Peitoral Maior (Esternal)', activation: '100%', role: 'Agonista Principal' },
          { name: 'Deltóide Anterior', activation: '70%', role: 'Sinergista' },
          { name: 'Tríceps Braquial', activation: '65%', role: 'Sinergista' },
        ],
      };
    } else if (norm.includes('agacha') || norm.includes('perna') || norm.includes('leg') || norm.includes('quadriceps')) {
      return {
        setup: 'Pés na largura dos ombros, pontas levemente para fora e barra apoiada no trapézio.',
        eccentric: 'Inicie o movimento dobrando os quadris e joelhos simultaneamente, descendo até a paralela.',
        concentric: 'Suba empurrando o chão através dos calcanhares, mantendo o abdômen travado.',
        breathing: 'Manobra de Valsalva: encha a caixa torácica no topo e expire ao concluir a subida.',
        cues: ['Joelhos alinhados com as pontas dos pés', 'Coluna neutra sem retroversão', 'Olhar em ponto fixo adiante'],
        activeMuscles: [
          { name: 'Quadríceps Femoral', activation: '100%', role: 'Agonista Principal' },
          { name: 'Glúteo Máximo', activation: '85%', role: 'Agonista Co-ativador' },
          { name: 'Eretores da Espinha', activation: '60%', role: 'Estabilizador Central' },
        ],
      };
    } else if (norm.includes('costas') || norm.includes('remada') || norm.includes('puxada') || norm.includes('back')) {
      return {
        setup: 'Tronco firme inclinado a 45 graus ou sentado na polia com peito aberto.',
        eccentric: 'Alongue as dorsais permitindo a abertura suave das escápulas.',
        concentric: 'Puxe direcionando os cotovelos para trás e espremendo o centro das costas.',
        breathing: 'Puxe o ar ao esticar os braços e expire ao puxar a carga para o corpo.',
        cues: ['Puxe com os cotovelos, não com as mãos', 'Peito estufado o tempo todo', 'Sem balanço lombar'],
        activeMuscles: [
          { name: 'Grande Dorsal', activation: '100%', role: 'Agonista Principal' },
          { name: 'Rombóides e Trapézio', activation: '80%', role: 'Sinergista Escapular' },
          { name: 'Bíceps Braquial', activation: '60%', role: 'Sinergista' },
        ],
      };
    } else if (norm.includes('ombro') || norm.includes('desenvolvimento') || norm.includes('lateral') || norm.includes('shoulder')) {
      return {
        setup: 'Postura ereta, abdômen contraído e halteres posicionados na altura das orelhas.',
        eccentric: 'Controle a descida até os braços formarem ângulo reto de 90°.',
        concentric: 'Eleve acima da cabeça sem travar os cotovelos bruscamente no topo.',
        breathing: 'Solte o ar no momento de empurrar para o alto.',
        cues: ['Punhos alinhados aos cotovelos', 'Não balance a coluna', 'Cadência de descida de 2s'],
        activeMuscles: [
          { name: 'Deltóide Lateral e Anterior', activation: '100%', role: 'Agonista Principal' },
          { name: 'Trapézio Superior', activation: '60%', role: 'Fixador de Escápula' },
          { name: 'Tríceps', activation: '50%', role: 'Extensão de Cotovelo' },
        ],
      };
    } else {
      return {
        setup: 'Alinhe a postura, trave o core e posicione a articulação conforme o eixo do aparelho.',
        eccentric: 'Desça a carga sentindo o estiramento muscular controlado em 3 segundos.',
        concentric: 'Contraia o músculo alvo com máxima intenção e velocidade controlada.',
        breathing: 'Expiração na fase de esforço concêntrico.',
        cues: ['Amplitude máxima com técnica', 'Controle em todas as fases', 'Isolamento muscular estrito'],
        activeMuscles: [
          { name: `${muscleGroup} (Fibras Principais)`, activation: '100%', role: 'Agonista' },
          { name: 'Estabilizadores Secundários', activation: '50%', role: 'Sinergista' },
        ],
      };
    }
  };

  const info = getBiomechanicalInstructions(exerciseName, muscleGroup);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 320;

    // Scene in Pure Black OLED
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.3, 3.8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Pure White Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(3, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd1d5db, 1.6);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 2.2);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // Subtle Monochromatic Floor Grid
    const gridHelper = new THREE.GridHelper(4, 16, 0x555c68, 0x1f232b);
    gridHelper.position.y = -0.6;
    scene.add(gridHelper);

    // =========================================================================
    // MONOCHROMATIC PROCEDURAL ANATOMICAL MANNEQUIN
    // =========================================================================
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

    const equipmentGroup = new THREE.Group();
    scene.add(equipmentGroup);

    // Base body: Dark Matte Graphite
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x16181e,
      roughness: 0.6,
      metalness: 0.2,
    });

    // Glowing Agonist Muscle: Pure White & Platinum Emissive
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0,
      roughness: 0.1,
      metalness: 0.3,
    });

    // Secondary Synergy Muscle: Silver Metallic
    const synergyMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      emissive: 0x8a92a0,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.4,
    });

    // Equipment: Chrome Barbell and Dark Charcoal Plates
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      metalness: 0.95,
      roughness: 0.1,
    });

    const rubberPlateMat = new THREE.MeshStandardMaterial({
      color: 0x222630,
      roughness: 0.8,
      metalness: 0.1,
    });

    // Check muscle activation
    const normName = (exerciseName + ' ' + muscleGroup).toLowerCase();
    const isChest = normName.includes('peito') || normName.includes('supino') || normName.includes('chest');
    const isBack = normName.includes('costas') || normName.includes('remada') || normName.includes('puxada');
    const isShoulder = normName.includes('ombro') || normName.includes('desenvolvimento') || normName.includes('lateral');
    const isBiceps = normName.includes('bíceps') || normName.includes('biceps') || normName.includes('rosca');
    const isLegs = normName.includes('perna') || normName.includes('agachamento') || normName.includes('quadríceps') || normName.includes('leg');

    // 1. Pelvis & Torso
    const pelvisGeom = new THREE.CylinderGeometry(0.22, 0.18, 0.25, 12);
    const pelvis = new THREE.Mesh(pelvisGeom, bodyMat);
    pelvis.position.y = 0.45;
    characterGroup.add(pelvis);

    const absGeom = new THREE.BoxGeometry(0.32, 0.3, 0.18);
    const abs = new THREE.Mesh(absGeom, bodyMat);
    abs.position.y = 0.7;
    characterGroup.add(abs);

    const thoraxGeom = new THREE.BoxGeometry(0.44, 0.35, 0.22);
    const thorax = new THREE.Mesh(thoraxGeom, bodyMat);
    thorax.position.y = 1.0;
    characterGroup.add(thorax);

    // Pectorals
    const pecGeom = new THREE.BoxGeometry(0.18, 0.16, 0.08);
    const leftPec = new THREE.Mesh(pecGeom, isChest ? glowMat : bodyMat);
    leftPec.position.set(-0.11, 1.05, 0.12);
    leftPec.rotation.z = 0.08;
    characterGroup.add(leftPec);

    const rightPec = new THREE.Mesh(pecGeom, isChest ? glowMat : bodyMat);
    rightPec.position.set(0.11, 1.05, 0.12);
    rightPec.rotation.z = -0.08;
    characterGroup.add(rightPec);

    // Lats
    const latGeom = new THREE.BoxGeometry(0.16, 0.28, 0.08);
    const leftLat = new THREE.Mesh(latGeom, isBack ? glowMat : bodyMat);
    leftLat.position.set(-0.2, 0.95, -0.09);
    characterGroup.add(leftLat);

    const rightLat = new THREE.Mesh(latGeom, isBack ? glowMat : bodyMat);
    rightLat.position.set(0.2, 0.95, -0.09);
    characterGroup.add(rightLat);

    // Neck & Head
    const neckGeom = new THREE.CylinderGeometry(0.08, 0.09, 0.12, 10);
    const neck = new THREE.Mesh(neckGeom, bodyMat);
    neck.position.y = 1.24;
    characterGroup.add(neck);

    const headGeom = new THREE.SphereGeometry(0.14, 16, 16);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.y = 1.42;
    characterGroup.add(head);

    // Shoulders
    const deltGeom = new THREE.SphereGeometry(0.11, 12, 12);
    const leftDelt = new THREE.Mesh(deltGeom, isShoulder ? glowMat : isChest ? synergyMat : bodyMat);
    leftDelt.position.set(-0.31, 1.15, 0.02);
    characterGroup.add(leftDelt);

    const rightDelt = new THREE.Mesh(deltGeom, isShoulder ? glowMat : isChest ? synergyMat : bodyMat);
    rightDelt.position.set(0.31, 1.15, 0.02);
    characterGroup.add(rightDelt);

    // Arms
    const leftArmJoint = new THREE.Group();
    leftArmJoint.position.set(-0.31, 1.15, 0);
    characterGroup.add(leftArmJoint);

    const bicepGeom = new THREE.CylinderGeometry(0.07, 0.06, 0.28, 10);
    const leftBicep = new THREE.Mesh(bicepGeom, isBiceps ? glowMat : bodyMat);
    leftBicep.position.y = -0.14;
    leftArmJoint.add(leftBicep);

    const leftForearmJoint = new THREE.Group();
    leftForearmJoint.position.set(0, -0.28, 0);
    leftArmJoint.add(leftForearmJoint);

    const forearmGeom = new THREE.CylinderGeometry(0.055, 0.045, 0.26, 10);
    const leftForearm = new THREE.Mesh(forearmGeom, bodyMat);
    leftForearm.position.y = -0.13;
    leftForearmJoint.add(leftForearm);

    // Right Arm
    const rightArmJoint = new THREE.Group();
    rightArmJoint.position.set(0.31, 1.15, 0);
    characterGroup.add(rightArmJoint);

    const rightBicep = new THREE.Mesh(bicepGeom, isBiceps ? glowMat : bodyMat);
    rightBicep.position.y = -0.14;
    rightArmJoint.add(rightBicep);

    const rightForearmJoint = new THREE.Group();
    rightForearmJoint.position.set(0, -0.28, 0);
    rightArmJoint.add(rightForearmJoint);

    const rightForearm = new THREE.Mesh(forearmGeom, bodyMat);
    rightForearm.position.y = -0.13;
    rightForearmJoint.add(rightForearm);

    // Legs
    const thighGeom = new THREE.CylinderGeometry(0.1, 0.08, 0.45, 12);
    const leftThighJoint = new THREE.Group();
    leftThighJoint.position.set(-0.14, 0.35, 0);
    characterGroup.add(leftThighJoint);

    const leftThigh = new THREE.Mesh(thighGeom, isLegs ? glowMat : bodyMat);
    leftThigh.position.y = -0.22;
    leftThighJoint.add(leftThigh);

    const rightThighJoint = new THREE.Group();
    rightThighJoint.position.set(0.14, 0.35, 0);
    characterGroup.add(rightThighJoint);

    const rightThigh = new THREE.Mesh(thighGeom, isLegs ? glowMat : bodyMat);
    rightThigh.position.y = -0.22;
    rightThighJoint.add(rightThigh);

    const calfGeom = new THREE.CylinderGeometry(0.075, 0.055, 0.45, 10);
    const leftCalf = new THREE.Mesh(calfGeom, bodyMat);
    leftCalf.position.set(0, -0.45, 0);
    leftThighJoint.add(leftCalf);

    const rightCalf = new THREE.Mesh(calfGeom, bodyMat);
    rightCalf.position.set(0, -0.45, 0);
    rightThighJoint.add(rightCalf);

    // Equipment: Chrome Barbell
    const barbellGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8);
    const barbell = new THREE.Mesh(barbellGeom, chromeMat);
    barbell.rotation.z = Math.PI / 2;
    equipmentGroup.add(barbell);

    const plateGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16);
    const plateL1 = new THREE.Mesh(plateGeom, rubberPlateMat);
    plateL1.rotation.z = Math.PI / 2;
    plateL1.position.x = -0.58;
    equipmentGroup.add(plateL1);

    const plateR1 = new THREE.Mesh(plateGeom, rubberPlateMat);
    plateR1.rotation.z = Math.PI / 2;
    plateR1.position.x = 0.58;
    equipmentGroup.add(plateR1);

    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    stateRef.current.renderer = renderer;
    stateRef.current.characterGroup = characterGroup;
    stateRef.current.equipmentGroup = equipmentGroup;

    // Touch & Mouse Orbit
    const handleStart = (clientX: number, clientY: number) => {
      stateRef.current.isDragging = true;
      stateRef.current.prevMousePos = { x: clientX, y: clientY };
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!stateRef.current.isDragging) return;
      const deltaX = clientX - stateRef.current.prevMousePos.x;
      const deltaY = clientY - stateRef.current.prevMousePos.y;

      stateRef.current.rotation.y += deltaX * 0.01;
      stateRef.current.rotation.x = Math.max(-0.4, Math.min(0.6, stateRef.current.rotation.x + deltaY * 0.008));
      stateRef.current.prevMousePos = { x: clientX, y: clientY };
    };

    const handleEnd = () => {
      stateRef.current.isDragging = false;
    };

    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => handleEnd();

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Animation Loop
    let t = 0;
    const animate = () => {
      stateRef.current.reqId = requestAnimationFrame(animate);

      if (isPlaying) {
        t += 0.025 * speed;
      }

      const cycle = (Math.sin(t) + 1) / 2;

      characterGroup.rotation.y = stateRef.current.rotation.y;
      characterGroup.rotation.x = stateRef.current.rotation.x;
      equipmentGroup.rotation.y = stateRef.current.rotation.y;
      equipmentGroup.rotation.x = stateRef.current.rotation.x;

      if (isChest) {
        characterGroup.position.set(0, -0.1, 0);
        leftArmJoint.rotation.x = -1.2 + cycle * 0.6;
        leftArmJoint.rotation.z = -0.5 + cycle * 0.3;
        leftForearmJoint.rotation.x = -0.8 + cycle * 0.6;

        rightArmJoint.rotation.x = -1.2 + cycle * 0.6;
        rightArmJoint.rotation.z = 0.5 - cycle * 0.3;
        rightForearmJoint.rotation.x = -0.8 + cycle * 0.6;

        equipmentGroup.position.set(0, 0.95 + cycle * 0.45, 0.25);
      } else if (isShoulder) {
        leftArmJoint.rotation.x = 0;
        leftArmJoint.rotation.z = -1.1 - cycle * 0.45;
        leftForearmJoint.rotation.z = 0.2 - cycle * 0.2;

        rightArmJoint.rotation.x = 0;
        rightArmJoint.rotation.z = 1.1 + cycle * 0.45;
        rightForearmJoint.rotation.z = -0.2 + cycle * 0.2;

        equipmentGroup.position.set(0, 1.2 + cycle * 0.5, 0);
      } else if (isBiceps) {
        leftArmJoint.rotation.x = 0;
        leftArmJoint.rotation.z = -0.2;
        leftForearmJoint.rotation.x = -0.2 - cycle * 1.8;

        rightArmJoint.rotation.x = 0;
        rightArmJoint.rotation.z = 0.2;
        rightForearmJoint.rotation.x = -0.2 - cycle * 1.8;

        equipmentGroup.position.set(0, 0.45 + cycle * 0.4, 0.25 - cycle * 0.1);
      } else if (isLegs) {
        characterGroup.position.y = -cycle * 0.35;
        leftThighJoint.rotation.x = -cycle * 1.1;
        rightThighJoint.rotation.x = -cycle * 1.1;
        equipmentGroup.position.set(0, 1.25 - cycle * 0.35, 0);
      } else {
        leftArmJoint.rotation.x = -cycle * 0.8;
        rightArmJoint.rotation.x = -cycle * 0.8;
        equipmentGroup.position.set(0, 0.8 + cycle * 0.3, 0.15);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (stateRef.current.reqId) cancelAnimationFrame(stateRef.current.reqId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, [exerciseName, muscleGroup, isPlaying, speed]);

  const resetCamera = (angle: 'front' | 'side' | 'isometric') => {
    setCameraAngle(angle);
    if (!stateRef.current.camera) return;
    if (angle === 'front') {
      stateRef.current.rotation = { x: 0, y: 0 };
    } else if (angle === 'side') {
      stateRef.current.rotation = { x: 0, y: Math.PI / 2 };
    } else {
      stateRef.current.rotation = { x: 0.1, y: 0.45 };
    }
  };

  return (
    <div className={`flex flex-col ${isModal ? 'fixed inset-0 z-50 bg-[#000000]/98 backdrop-blur-xl md:p-6 p-0' : 'w-full h-full'}`}>
      
      {/* Monochromatic Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0E1015]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">
                Execução 3D em Platina
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-[10px] font-mono font-bold text-white">
                {muscleGroup}
              </span>
            </div>
            <h3 className="text-base font-black text-white leading-tight truncate max-w-[240px]">
              {exerciseName}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* 3D WebGL Canvas Container */}
        <div className="flex-1 relative flex flex-col justify-between overflow-hidden bg-radial from-[#151820]/40 to-[#000000]">
          
          {/* Canvas Mount */}
          <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

          {/* Angle Switcher & Speed Pill (Monochrome) */}
          <div className="z-10 p-4 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 pointer-events-auto bg-[#0E1015]/90 backdrop-blur-md p-1 rounded-xl border border-white/10">
              <button
                onClick={() => resetCamera('front')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                  cameraAngle === 'front' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Frente
              </button>
              <button
                onClick={() => resetCamera('isometric')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                  cameraAngle === 'isometric' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                3D
              </button>
              <button
                onClick={() => resetCamera('side')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                  cameraAngle === 'side' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Perfil
              </button>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0E1015]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:text-neutral-300 transition-colors p-1"
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
              <div className="w-[1px] h-3 bg-white/20" />
              <button
                onClick={() => setSpeed(speed === 1.0 ? 0.5 : speed === 0.5 ? 1.5 : 1.0)}
                className="font-mono font-bold text-[11px] text-white px-1 hover:underline"
              >
                {speed}x
              </button>
            </div>
          </div>

          {/* Interactive Hint */}
          <div className="z-10 p-4 text-center pointer-events-none">
            <span className="text-[10px] text-neutral-400 bg-[#000000]/80 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md font-mono">
              Gire em 360° · Platina indica o músculo agonista
            </span>
          </div>
        </div>

        {/* Biomechanical Panel in Grayscale */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 bg-[#0E1015] p-5 overflow-y-auto space-y-5">
          
          {/* Target Muscles Cards */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-white fill-current" />
                Músculos Recrutados
              </span>
            </div>

            <div className="space-y-2">
              {info.activeMuscles.map((muscle, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#000000] border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-black text-white">{muscle.name}</p>
                    <p className="text-[10px] text-neutral-400">{muscle.role}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-white tabular-nums">
                      {muscle.activation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Biomechanical Coaching Cues */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-neutral-300" />
              Instruções de Postura
            </span>

            <div className="space-y-2.5 text-xs text-neutral-300">
              <div className="p-3 rounded-xl bg-[#000000] border border-white/10">
                <p className="font-black text-white text-[11px] mb-0.5">1. POSIÇÃO INICIAL</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">{info.setup}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#000000] border border-white/10">
                <p className="font-black text-white text-[11px] mb-0.5">2. FASE EXCÊNTRICA (DESCIDA)</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">{info.eccentric}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#000000] border border-white/10">
                <p className="font-black text-white text-[11px] mb-0.5">3. FASE CONCÊNTRICA (SUBIDA)</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">{info.concentric}</p>
              </div>
            </div>
          </div>

          {/* Quick tips list */}
          <div className="p-3 rounded-xl bg-[#161920] border border-white/15">
            <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">
              Dicas de Técnica
            </p>
            <ul className="text-[11px] text-neutral-300 space-y-1">
              {info.cues.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-white font-bold">›</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
