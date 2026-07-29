// ─── 3D INTERACTIVE FLAME PLANET GLOBE (WITH AUTOMATIC FALLBACK) ───
(function() {
    function isWebGLSupported() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    function init3DPlanet() {
        const container = document.getElementById('planet-3d-container');
        if (!container) return;

        // Check WebGL and Three.js availability — if missing, keep classic CSS orb fallback
        if (typeof THREE === 'undefined' || !isWebGLSupported()) {
            console.warn('[CrimsonFlame] WebGL or Three.js unavailable. Using classic CSS orb fallback.');
            return;
        }

        let renderer;
        try {
            const width = container.clientWidth || 320;
            const height = container.clientHeight || 320;

            // 1. Scene, Camera, Renderer
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            camera.position.z = 320;

            renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.domElement.style.position = 'absolute';
            renderer.domElement.style.top = '0';
            renderer.domElement.style.left = '0';
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            renderer.domElement.style.pointerEvents = 'auto';
            renderer.domElement.style.cursor = 'grab';

            // Hide static CSS orb only after successful 3D WebGL renderer creation
            const staticOrb = container.querySelector('.orb');
            if (staticOrb) staticOrb.style.display = 'none';

            container.appendChild(renderer.domElement);

            // 2. Procedural Lava / Magma Canvas Texture Generator
            function generateLavaTexture() {
                const canvas = document.createElement('canvas');
                canvas.width = 1024;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');

                // Dark Basalt Crust Base
                ctx.fillStyle = '#0a0305';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Generate Perlin-like Molten Lava Veins & Hotspots
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;

                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const idx = (y * canvas.width + x) * 4;
                        const nx = x / 60;
                        const ny = y / 60;
                        
                        const v1 = Math.sin(nx + Math.cos(ny * 1.5)) * Math.cos(ny * 2.0);
                        const v2 = Math.sin(nx * 2.5 - Math.sin(ny * 3.0));
                        const n = (v1 + v2 + 2) / 4;

                        if (n > 0.45) {
                            const intensity = (n - 0.45) / 0.55;
                            data[idx]     = Math.min(255, 200 + intensity * 55);
                            data[idx + 1] = Math.min(255, intensity * 160);
                            data[idx + 2] = Math.min(255, intensity * 40);
                        } else {
                            const crust = Math.floor(n * 40);
                            data[idx]     = crust + 15;
                            data[idx + 1] = crust + 5;
                            data[idx + 2] = crust + 8;
                        }
                        data[idx + 3] = 255;
                    }
                }
                ctx.putImageData(imgData, 0, 0);

                // Add glowing hotspot patches
                for (let i = 0; i < 40; i++) {
                    const cx = Math.random() * canvas.width;
                    const cy = Math.random() * canvas.height;
                    const rad = Math.random() * 40 + 10;
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
                    grad.addColorStop(0, 'rgba(255, 140, 0, 0.9)');
                    grad.addColorStop(0.5, 'rgba(220, 38, 38, 0.5)');
                    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
                    ctx.fill();
                }

                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                return texture;
            }

            const lavaTexture = generateLavaTexture();

            // 3. Planet Mesh (Sphere)
            const planetRadius = 85;
            const planetGeo = new THREE.SphereGeometry(planetRadius, 64, 64);
            const planetMat = new THREE.MeshStandardMaterial({
                map: lavaTexture,
                roughness: 0.6,
                metalness: 0.2,
                emissive: new THREE.Color(0x7a0d0d),
                emissiveIntensity: 0.6,
                emissiveMap: lavaTexture
            });
            const planetMesh = new THREE.Mesh(planetGeo, planetMat);
            scene.add(planetMesh);

            // 4. Glowing Atmosphere Shell
            const atmosGeo = new THREE.SphereGeometry(planetRadius * 1.06, 32, 32);
            const atmosMat = new THREE.MeshBasicMaterial({
                color: 0xff3b3b,
                transparent: true,
                opacity: 0.25,
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending
            });
            const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
            scene.add(atmosMesh);

            // 5. 3D Orbital Rings
            const ringGroup = new THREE.Group();

            const ring1Geo = new THREE.TorusGeometry(125, 2.2, 16, 100);
            const ring1Mat = new THREE.MeshBasicMaterial({
                color: 0xff4d4d,
                transparent: true,
                opacity: 0.65,
                blending: THREE.AdditiveBlending
            });
            const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
            ring1.rotation.x = Math.PI / 2.4;
            ring1.rotation.y = Math.PI / 8;
            ringGroup.add(ring1);

            const ring2Geo = new THREE.TorusGeometry(155, 1.4, 16, 100);
            const ring2Mat = new THREE.MeshBasicMaterial({
                color: 0xff9933,
                transparent: true,
                opacity: 0.45,
                blending: THREE.AdditiveBlending
            });
            const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
            ring2.rotation.x = Math.PI / 1.8;
            ring2.rotation.y = -Math.PI / 6;
            ringGroup.add(ring2);

            scene.add(ringGroup);

            // 6. 3D Floating Embers Particle Swarm
            const particleCount = 120;
            const particleGeo = new THREE.BufferGeometry();
            const particlePositions = new Float32Array(particleCount * 3);

            for (let i = 0; i < particleCount; i++) {
                const r = planetRadius + 20 + Math.random() * 80;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI - Math.PI / 2;

                particlePositions[i * 3]     = r * Math.cos(phi) * Math.cos(theta);
                particlePositions[i * 3 + 1] = r * Math.sin(phi);
                particlePositions[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);
            }

            particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

            const particleMat = new THREE.PointsMaterial({
                color: 0xff6b35,
                size: 3,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });

            const particleSystem = new THREE.Points(particleGeo, particleMat);
            scene.add(particleSystem);

            // 7. Lighting
            const ambientLight = new THREE.AmbientLight(0x2a080c, 1.2);
            scene.add(ambientLight);

            const pointLight = new THREE.PointLight(0xff4500, 2.5, 500);
            pointLight.position.set(120, 100, 150);
            scene.add(pointLight);

            const backLight = new THREE.PointLight(0xdc2626, 1.5, 400);
            backLight.position.set(-150, -100, -120);
            scene.add(backLight);

            // 8. Interactivity & Damping Controls
            let isDragging = false;
            let previousMousePosition = { x: 0, y: 0 };
            let targetRotationX = 0;
            let targetRotationY = 0;
            let currentRotationX = 0;
            let currentRotationY = 0;

            const domEl = renderer.domElement;

            domEl.addEventListener('mousedown', function(e) {
                isDragging = true;
                domEl.style.cursor = 'grabbing';
                previousMousePosition = { x: e.clientX, y: e.clientY };
            });

            window.addEventListener('mouseup', function() {
                isDragging = false;
                domEl.style.cursor = 'grab';
            });

            window.addEventListener('mousemove', function(e) {
                if (isDragging) {
                    const deltaX = e.clientX - previousMousePosition.x;
                    const deltaY = e.clientY - previousMousePosition.y;

                    targetRotationY += deltaX * 0.008;
                    targetRotationX += deltaY * 0.008;

                    previousMousePosition = { x: e.clientX, y: e.clientY };
                } else {
                    const normX = (e.clientX / window.innerWidth - 0.5) * 2;
                    const normY = (e.clientY / window.innerHeight - 0.5) * 2;
                    targetRotationY = normX * 0.4;
                    targetRotationX = normY * 0.4;
                }
            });

            // Touch Support
            domEl.addEventListener('touchstart', function(e) {
                if (e.touches.length === 1) {
                    isDragging = true;
                    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
            }, { passive: true });

            window.addEventListener('touchmove', function(e) {
                if (isDragging && e.touches.length === 1) {
                    const deltaX = e.touches[0].clientX - previousMousePosition.x;
                    const deltaY = e.touches[0].clientY - previousMousePosition.y;

                    targetRotationY += deltaX * 0.008;
                    targetRotationX += deltaY * 0.008;

                    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
            }, { passive: true });

            window.addEventListener('touchend', function() {
                isDragging = false;
            });

            // 9. Resize Listener
            function onWindowResize() {
                const newW = container.clientWidth || 320;
                const newH = container.clientHeight || 320;
                camera.aspect = newW / newH;
                camera.updateProjectionMatrix();
                renderer.setSize(newW, newH);
            }
            window.addEventListener('resize', onWindowResize);

            // 10. Animation Loop
            let clock = new THREE.Clock();

            function animate() {
                requestAnimationFrame(animate);

                const elapsedTime = clock.getElapsedTime();

                planetMesh.rotation.y += 0.004;

                ring1.rotation.z = elapsedTime * 0.15;
                ring2.rotation.z = -elapsedTime * 0.22;

                particleSystem.rotation.y = elapsedTime * 0.08;
                particleSystem.rotation.x = Math.sin(elapsedTime * 0.1) * 0.1;

                currentRotationX += (targetRotationX - currentRotationX) * 0.06;
                currentRotationY += (targetRotationY - currentRotationY) * 0.06;

                scene.rotation.x = currentRotationX;
                scene.rotation.y = currentRotationY;

                renderer.render(scene, camera);
            }

            animate();

        } catch (err) {
            console.warn('[CrimsonFlame] WebGL initialization failed. Falling back to classic CSS orb:', err);
            const staticOrb = container.querySelector('.orb');
            if (staticOrb) staticOrb.style.display = 'block';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init3DPlanet);
    } else {
        init3DPlanet();
    }
})();
