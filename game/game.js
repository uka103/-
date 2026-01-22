class TargetPracticeGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.target = null;
        this.targets = [];

        this.gameState = {
            isActive: false,
            score: 0,
            hits: 0,
            timeRemaining: 20,
            startTime: null
        };

        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x001122);

        const canvas = document.getElementById("gameCanvas");

        this.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 40);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;

        this.scene.add(new THREE.AmbientLight(0x404040, 1));

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(20,20,10);
        this.scene.add(light);

        this.createFloor();

        window.addEventListener("resize", ()=>this.onResize());
        this.renderer.domElement.addEventListener("click", e=>this.onClick(e));

        this.animate();
    }

    createFloor() {
        const geo = new THREE.PlaneGeometry(40,40);
        const mat = new THREE.MeshLambertMaterial({color:0x333333});
        const floor = new THREE.Mesh(geo,mat);
        floor.rotation.x = -Math.PI/2;
        floor.position.y = -15;
        this.scene.add(floor);
    }

    startGame() {
        this.gameState = {
            isActive: true,
            score: 0,
            hits: 0,
            timeRemaining: 20,
            startTime: Date.now()
        };

        score.textContent = 0;
        hits.textContent = 0;
        gameOver.style.display = "none";

        this.spawnTarget();
    }

    spawnTarget() {
        if (this.target) this.scene.remove(this.target);

        const size = Math.random() * 0.6 + 0.2;
        const geo = new THREE.SphereGeometry(size, 16, 16);
        const mat = new THREE.MeshLambertMaterial({color:0xff5555});
        this.target = new THREE.Mesh(geo, mat);
        this.target.position.set(
            (Math.random()-0.5)*28,
            (Math.random()-0.5)*20,
            (Math.random()-0.5)*28
        );
        this.target.userData.score = Math.floor(100 / size);

        this.scene.add(this.target);
        this.targets = [this.target];
    }

    onClick(event) {
        if (!this.gameState.isActive) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hit = this.raycaster.intersectObjects(this.targets);
        if (hit.length) this.hitTarget(hit[0].object);
    }

    hitTarget(target) {
        this.gameState.score += target.userData.score;
        this.gameState.hits++;

        score.textContent = this.gameState.score;
        hits.textContent = this.gameState.hits;

        this.spawnTarget();
    }

    updateTimer() {
        if (!this.gameState.isActive) return;
        const elapsed = (Date.now() - this.gameState.startTime) / 1000;
        this.gameState.timeRemaining = Math.max(0, 20 - elapsed);
        timer.textContent = Math.ceil(this.gameState.timeRemaining);
        if (this.gameState.timeRemaining <= 0) this.endGame();
    }

    endGame() {
        this.gameState.isActive = false;

        finalScore.textContent = this.gameState.score;
        finalHits.textContent = this.gameState.hits;
        gameOver.style.display = "flex";

        const ranking = JSON.parse(localStorage.getItem("gameRanking")) || [];
        ranking.push({
            name: playerName,
            score: this.gameState.score,
            hits: this.gameState.hits
        });
        ranking.sort((a,b)=>b.score-a.score);
        localStorage.setItem("gameRanking", JSON.stringify(ranking.slice(0,10)));
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(()=>this.animate());
        this.controls.update();
        this.updateTimer();
        this.renderer.render(this.scene, this.camera);
    }
}
