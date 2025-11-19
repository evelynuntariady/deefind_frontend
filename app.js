let selectedFiles = [];
const detectionResults = [];

function initApp() {
    renderApp();
    setupEventListeners();
    updateUI();
}

function renderApp() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="header">
            <div class="header-content">
                <div class="logo">
                <img class="logo" src="logo.png" alt="Logo DeeFind">
                    DeeFind
                </div>
                <div style="flex: 1;"></div>
                <div class="nav-buttons" id="nav-buttons"></div>
            </div>
        </div>
        <div class="main-content">
            <div class="container">
                <div class="upload-section">
                    <div>
                        <h1 class="section-title">Upload Media</h1>
                        <p class="section-subtitle">Images to analyze</p>
                    </div>
                    <div class="upload-zone" id="upload-zone">
                        <div class="upload-icon">📁</div>
                        <div class="upload-text">Drag & drop your file here</div>
                        <div class="upload-subtext">or click to browse</div>
                    </div>
                    <input type="file" id="file-input" accept="image/*,video/*" multiple>
                    <div class="file-list" id="file-list"></div>
                    <button class="btn btn-primary btn-wide" id="detect-btn" disabled>Analyze Media</button>

                    <!-- CAMERA SECTION -->
                    <div id="cameraSection" style="display:none; margin-top:20px;">
                        <video id="camera" width="350" autoplay playsinline 
                            style="border-radius:12px; border:1px solid #444;"></video>

                        <button id="captureBtn" 
                            style="margin-top:10px; padding:10px 20px; border-radius:8px;">
                            Capture Photo
                        </button>
                    </div>

                    <!-- BUTTON TO OPEN CAMERA -->
                    <button id="openCameraBtn" 
                        style="margin-top:20px; padding:12px 20px; border-radius:8px;">
                        📷 Take Live Photo
                    </button>
                </div>
                <div class="results-section">
                    <div>
                        <h2 class="section-title">Analysis Results</h2>
                        <p class="section-subtitle">Real-time detection results</p>
                    </div>
                    <div class="detection-counter">
                        <div class="counter-label">Free Detections Used</div>
                        <div class="counter-display"><span id="counter-text">0</span>/5</div>
                        <div class="counter-note" id="counter-note">Sign in for unlimited</div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Files Analyzed</div>
                            <div class="stat-value" id="stat-files">0</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Detection Rate</div>
                            <div class="stat-value" id="stat-rate">0%</div>
                        </div>
                    </div>
                    <div id="results-container">
                        <div class="results-placeholder">
                            <div class="results-placeholder-icon">✨</div>
                            <p>Upload media to start analysis</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    updateNavButtons();
}


function updateNavButtons() {
    const navButtons = document.getElementById('nav-buttons');
    
    if (auth.isLoggedIn()) {
        navButtons.innerHTML = `
            <div class="user-info">
                <div>
                    <div class="user-email">${auth.currentUser.email}</div>
                    <div class="user-plan">${auth.currentUser.plan} Plan</div>
                </div>
                <button class="btn btn-secondary btn-small" onclick="handleLogout()">Logout</button>
            </div>
        `;
    } else {
        navButtons.innerHTML = `
            <button class="btn btn-secondary" onclick="openAuthModal('login')">Sign In</button>
            <button class="btn btn-primary" onclick="openAuthModal('register')">Try Free</button>
        `;
    }
}

function setupEventListeners() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const detectBtn = document.getElementById('detect-btn');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('active');
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('active');
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('active');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    detectBtn.addEventListener('click', analyzeMedia);



    const openCameraBtn = document.getElementById("openCameraBtn");
    const cameraSection = document.getElementById("cameraSection");
    const camera = document.getElementById("camera");
    const captureBtn = document.getElementById("captureBtn");

    let stream;

    // buka kamera
    openCameraBtn.addEventListener("click", async () => {
        cameraSection.style.display = "block";

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            camera.srcObject = stream;
        } catch (err) {
            alert("Unable to access camera: " + err);
        }
    });

  captureBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(camera, 0, 0);

    canvas.toBlob(async (blob) => {
        const file = new File([blob], "live_photo.jpg", { type: "image/jpeg" });
        console.log("FILE:", file);

        // MASUKIN FILE KE STATE UTAMA
        selectedFiles = [file];
        updateFileList();
        updateDetectButton();

        // stop camera
        stream.getTracks().forEach(t => t.stop());

        // Delay biar UI update
        await new Promise(r => setTimeout(r, 50));

        // PANGGIL TANPA PARAMETER
        analyzeMedia();
    }, "image/jpeg");


    // stop camera
    stream.getTracks().forEach(t => t.stop());
});



}

function handleFiles(files) {
    selectedFiles = Array.from(files);
    updateFileList();
    updateDetectButton();
}

function updateFileList() {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const size = (file.size / 1024 / 1024).toFixed(2);
        fileList.innerHTML += `
            <div class="file-item">
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${size} MB</div>
                </div>
                <button class="btn-remove" onclick="removeFile(${index})">Remove</button>
            </div>
        `;
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    updateDetectButton();
}

function updateDetectButton() {
    const btn = document.getElementById('detect-btn');
    btn.disabled = selectedFiles.length === 0;
}

function updateUI() {
    updateNavButtons();
    updateCounterDisplay();
}

function updateCounterDisplay() {
    const counterText = document.getElementById('counter-text');
    const counterNote = document.getElementById('counter-note');
    
    if (auth.isLoggedIn()) {
        counterText.textContent = '∞';
        counterNote.textContent = 'Unlimited detections included';
    } else {
        counterText.textContent = counter.getCount();
        counterNote.textContent = `${counter.getRemainingDetections()} remaining this month`;
    }
}



async function analyzeMedia() {
    const isPremium = auth.isPremium();
    const canDetect = counter.canDetect(isPremium);

    if (!canDetect) {
        openLimitModal();
        return;
    }

    if (!selectedFiles.length) return;

    // Show loading state
    const detectBtn = document.getElementById('detect-btn');
    detectBtn.disabled = true;
    detectBtn.textContent = 'Analyzing...';

    // Simulate analysis with delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const results = [];

    for (const file of selectedFiles) {

        const formData = new FormData();
        formData.append("file", file, file.name);

        try {
            const response = await fetch("https://evelnap-dee-find.hf.space/predict", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error("API returned " + response.status);
            }

            const data = await response.json();

            const prob = data.confidence;
            const realPercent = prob * 100;

            let confidenceValue;

            if (data.prediction === "Real") {
                confidenceValue = Math.round(realPercent);
            } else {
                confidenceValue = Math.round(100 - realPercent);
            }


            results.push({
                filename: file.name,
                isReal: data.prediction === "Real",
                confidence: confidenceValue,
                timestamp: new Date()
            });

        } catch (error) {
            console.error("Error analyzing:", file.name, error);

            results.push({
                filename: file.name,
                isReal: null,
                confidence: 0,
                timestamp: new Date(),
                error: true
            });
        }
    }



    // Increment counter for free users
    if (!isPremium) {
        counter.increment();
        updateUI();
    }

    displayResults(results);
    selectedFiles = [];
    updateFileList();
    updateDetectButton();
    detectBtn.textContent = 'Analyze Media';
}

function displayResults(results) {
    const container = document.getElementById('results-container');
    let html = '';

    results.forEach(result => {
        const status = result.isReal ? 'Real' : 'Deepfake';
        const badgeClass = result.isReal ? 'badge-real' : 'badge-fake';
        
        html += `
            <div class="result-item">
                <div class="result-header">
                    <div class="result-filename">${result.filename}</div>
                    <span class="result-badge ${badgeClass}">${status}</span>
                </div>
                <div class="result-confidence">
                    <span class="result-label">Confidence:</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${result.confidence}%"></div>
                    </div>
                    <span class="result-percentage">${result.confidence}%</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    ${result.timestamp.toLocaleTimeString()}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Update stats
    document.getElementById('stat-files').textContent = results.length;
    const fakeCount = results.filter(r => !r.isReal).length;
    const rate = Math.round((fakeCount / results.length) * 100);
    document.getElementById('stat-rate').textContent = rate + '%';
}

document.addEventListener('DOMContentLoaded', initApp);
