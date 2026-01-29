HTML  JS  Result  

 class TargetPracticeGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();

        this.room = null;
        this.target = null;
        this.targets = [];

        this.gameState = {
            isActive: false,
            score: 0,
            timeRemaining: 20,
            targetsHit: 0,
            startTime: null
        };

        this.roomConfig = {
            width: 40,
            height: 30,
            depth: 40,
            targetBounds: {
                minX: -14, maxX: 14,
                minY: -12, maxY: 12,
                minZ: -14, maxZ: 14
            }
        };

        this.targetSizes = {
            min: 0.2,
            max: 0.8
        };

        this.lastFrameTime = null;

        this.init();
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLighting();
        this.createRoom();
        this.setupEventListeners();
        this.setupRaycaster();


        this.startGame();
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x001122); // Dark blue space-like background
    }

    setupCamera() {
        const canvas = document.getElementById('gameCanvas');
        this.camera = new THREE.PerspectiveCamera(
            80,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 40);
    }

    setupRenderer() {
        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.maxDistance = 50;
        this.controls.minDistance = 20;
    }

    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        this.scene.add(ambientLight);

        // Directional light for shadows and definition
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(20, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        this.scene.add(directionalLight);

        // Additional point lights for better target visibility in open space
        const pointLight1 = new THREE.PointLight(0xffffff, 0.6, 100);
        pointLight1.position.set(15, 10, 15);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xffffff, 0.6, 100);
        pointLight2.position.set(-15, 10, -15);
        this.scene.add(pointLight2);
    }

    createRoom() {
        const { width, depth } = this.roomConfig;

        // Create only a floor as reference plane
        const floorGeometry = new THREE.PlaneGeometry(width, depth);
        const floorMaterial = new THREE.MeshLambertMaterial({
            color: 0x333333,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -15; // Lower the floor
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Add a grid helper for better spatial reference
        const gridHelper = new THREE.GridHelper(width, 20, 0x666666, 0x444444);
        gridHelper.position.y = -15;
        this.scene.add(gridHelper);
    }

    getRandomTargetSize() {
        return Math.random() * (this.targetSizes.max - this.targetSizes.min) + this.targetSizes.min;
    }

    getRandomPosition() {
        const bounds = this.roomConfig.targetBounds;
        return new THREE.Vector3(
            Math.random() * (bounds.maxX - bounds.minX) + bounds.minX,
            Math.random() * (bounds.maxY - bounds.minY) + bounds.minY,
            Math.random() * (bounds.maxZ - bounds.minZ) + bounds.minZ
        );
    }

    calculateScore(targetSize) {
        // Smaller targets give higher scores
        return Math.floor(100 / (targetSize * 2));
    }

    createTarget() {
        const size = this.getRandomTargetSize();
        const position = this.getRandomPosition();

        const geometry = new THREE.SphereGeometry(size, 16, 16);

        // Bright colors for visibility
        const colors = [0xff4444, 0xff8844, 0xffff44, 0xff44ff];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const material = new THREE.MeshLambertMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2
        });

        const targetMesh = new THREE.Mesh(geometry, material);
        targetMesh.position.copy(position);
        targetMesh.castShadow = true;
        targetMesh.receiveShadow = true;

        // Store target properties
        targetMesh.userData = {
            size: size,
            baseScore: this.calculateScore(size),
            id: Date.now() + Math.random()
        };

        return targetMesh;
    }

    spawnTarget() {
        // Remove existing target
        if (this.target) {
            this.scene.remove(this.target);
            this.target.geometry.dispose();
            this.target.material.dispose();
        }

        // Create and add new target
        this.target = this.createTarget();
        this.scene.add(this.target);
        this.targets = [this.target]; // Keep array for raycasting
    }

    removeTarget(target) {
        if (target && this.scene.children.includes(target)) {
            this.scene.remove(target);

            // Proper disposal for memory management
            if (target.geometry) {
                target.geometry.dispose();
            }
            if (target.material) {
                if (target.material.map) target.material.map.dispose();
                target.material.dispose();
            }
        }

        // Remove from targets array
        const index = this.targets.indexOf(target);
        if (index > -1) {
            this.targets.splice(index, 1);
        }

        if (this.target === target) {
            this.target = null;
        }
    }

    handleTargetHit(target) {
        if (!this.gameState.isActive || !target) return;

        // Calculate and add score
        const score = target.userData.baseScore;
        this.gameState.score += score;
        this.gameState.targetsHit++;

        // Update UI
        this.updateUI();

        // Remove hit target and spawn new one
        this.removeTarget(target);
        this.spawnTarget();
    }

    setupEventListeners() {
        // Mouse click event
        this.renderer.domElement.addEventListener('click', (event) => {
            this.handleClick(event);
        });

        // Window resize event
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });

        // Prevent context menu on right click
        this.renderer.domElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }

    handleClick(event) {
        if (!this.gameState.isActive) return;

        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.performRaycast();
    }

    handleResize() {
        const canvas = this.renderer.domElement;
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Update renderer size
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Ensure UI elements remain properly positioned
        this.updateUI();
    }

    setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
    }

    performRaycast() {
        // Set raycaster from camera center (crosshair position)
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check for intersections with targets
        const intersects = this.raycaster.intersectObjects(this.targets);

        if (intersects.length > 0) {
            const hitTarget = intersects[0].object;
            this.handleTargetHit(hitTarget);
        }
    }

    updateScore(points) {
        this.gameState.score += points;
        this.updateUI();
    }

    getScoreMultiplier(targetSize) {
        // Additional multiplier for very small targets
        if (targetSize < 0.5) {
            return 2.0; // Double points for very small targets
        } else if (targetSize < 0.8) {
            return 1.5; // 1.5x points for small targets
        }
        return 1.0; // Normal multiplier for larger targets
    }

    updateTimer() {
        if (!this.gameState.isActive || !this.gameState.startTime) return;

        const elapsed = (Date.now() - this.gameState.startTime) / 1000;
        this.gameState.timeRemaining = Math.max(0, 20 - elapsed);

        if (this.gameState.timeRemaining <= 0) {
            this.endGame();
        }

        this.updateUI();
    }

    formatTime(seconds) {
        return Math.ceil(seconds);
    }

    startGame() {
        this.gameState = {
            isActive: true,
            score: 0,
            timeRemaining: 20,
            targetsHit: 0,
            startTime: Date.now()
        };

        // Hide game over screen
        document.getElementById('gameOver').style.display = 'none';

        // Spawn first target
        this.spawnTarget();

        // Update UI
        this.updateUI();
    }

    endGame() {
        this.gameState.isActive = false;

        // Cleanup resources
        this.cleanup();

        // Show game over screen
        this.showGameOver();
    }

    restartGame() {
        // Reset game state and start new game
        this.startGame();
    }

    showGameOver() {
        const gameOverDiv = document.getElementById('gameOver');
        const finalScoreSpan = document.getElementById('finalScore');
        const targetsHitSpan = document.getElementById('targetsHit');

        finalScoreSpan.textContent = this.gameState.score;
        targetsHitSpan.textContent = this.gameState.targetsHit;

        // Calculate accuracy if targets were hit
        const accuracy = this.gameState.targetsHit > 0 ?
            ((this.gameState.targetsHit / (this.gameState.targetsHit + 1)) * 100).toFixed(1) : 0;

        gameOverDiv.style.display = 'block';
    }

    updateUI() {
        // Update score display
        document.getElementById('score').textContent = this.gameState.score;

        // Update timer display
        document.getElementById('timer').textContent = this.formatTime(this.gameState.timeRemaining);
    }



    animate() {
        requestAnimationFrame(() => this.animate());

        // Monitor performance
        this.monitorPerformance();

        // Update controls
        this.controls.update();

        // Update timer
        this.updateTimer();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    // Performance monitoring
    monitorPerformance() {
        // Simple FPS counter for development
        if (this.gameState.isActive) {
            const now = performance.now();
            if (!this.lastFrameTime) this.lastFrameTime = now;

            const delta = now - this.lastFrameTime;
            this.lastFrameTime = now;

            // Log performance issues if frame time is too high
            if (delta > 20) { // More than 20ms = less than 50fps
                console.warn('Performance warning: Frame time', delta.toFixed(2), 'ms');
            }
        }
    }

    // Cleanup resources on game end
    cleanup() {
        // Remove all targets
        this.targets.forEach(target => this.removeTarget(target));
        this.targets = [];

        // Clear any remaining objects
        if (this.target) {
            this.removeTarget(this.target);
        }
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new TargetPracticeGame();
});
