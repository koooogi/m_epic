const API_URL = 'http://localhost:8080/api';

let songs = [];
let currentIndex = 0;
let isPlaying = false;
let audioContext = null;
let audioBuffer = null;
let isLoaded = false;
let gainNode = null;
let source = null;
let progressInterval = null;
let isDragging = false;  // Флаг, что пользователь перетаскивает ползунок

// DOM элементы
const progressBar = document.getElementById('progressBar');
const currentTimeLabel = document.getElementById('currentTime');
const totalTimeLabel = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');

// Загружаем список песен с сервера
async function loadSongs() {
    try {
        const response = await fetch(`${API_URL}/songs`);
        songs = await response.json();
        renderSongList();
        updateStatus('⏸ Остановлено');
        
        if (songs.length > 0) {
            await loadSongBuffer(currentIndex);
            volumeSlider.value = 100;
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('status').textContent = '❌ Сервер недоступен';
    }
}

function renderSongList() {
    const container = document.getElementById('songList');
    container.innerHTML = '';
    
    songs.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'song-item';
        if (index === currentIndex) div.classList.add('active');
        div.textContent = song.name;
        div.onclick = () => {
            stopAudio();
            currentIndex = index;
            progressBar.value = 0;
            currentTimeLabel.textContent = '00:00';
            loadSongBuffer(index);
            updateActiveSong();
            updateStatus('⏸ Готово: ' + song.name);
            updateCurrentSong(song.name);
        };
        container.appendChild(div);
    });
}

function updateActiveSong() {
    document.querySelectorAll('.song-item').forEach((el, index) => {
        el.classList.toggle('active', index === currentIndex);
    });
}

function updateStatus(text) {
    document.getElementById('status').textContent = text;
}

function updateCurrentSong(name) {
    document.getElementById('currentSong').textContent = '🎵 ' + name;
}

function stopAudio() {
    if (source) {
        try { source.stop(); } catch (e) {}
        source = null;
    }
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    isPlaying = false;
    document.getElementById('playBtn').textContent = '▶️';
}

// Загрузка буфера песни
async function loadSongBuffer(index) {
    if (songs.length === 0) return;
    
    const song = songs[index];
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.gain.value = volumeSlider.value / 100;
            gainNode.connect(audioContext.destination);
        }
        
        const response = await fetch(`/api/stream/${song.fileName}`);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        isLoaded = true;
        
        totalTimeLabel.textContent = formatTime(audioBuffer.duration);
        progressBar.max = audioBuffer.duration;
        
        console.log('✅ Загружено: ' + song.name);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        updateStatus('❌ Ошибка загрузки: ' + song.name);
    }
}

// Воспроизведение
function playAudio() {
    if (!isLoaded || !audioBuffer) {
        loadSongBuffer(currentIndex);
        setTimeout(() => playAudio(), 300);
        return;
    }
    
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.gain.value = volumeSlider.value / 100;
        gainNode.connect(audioContext.destination);
    }
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);
    
    const startPosition = parseFloat(progressBar.value);
    source.start(0, startPosition);
    
    const duration = audioBuffer.duration;
    const startTime = audioContext.currentTime - startPosition;
    
    // Обновление прогресса
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (!isDragging) {
            const currentTime = audioContext.currentTime - startTime;
            if (currentTime >= duration) {
                clearInterval(progressInterval);
                progressInterval = null;
                progressBar.value = duration;
                currentTimeLabel.textContent = formatTime(duration);
            } else {
                progressBar.value = currentTime;
                currentTimeLabel.textContent = formatTime(currentTime);
            }
        }
    }, 100);
    
    source.onended = () => {
        clearInterval(progressInterval);
        progressInterval = null;
        if (isPlaying) {
            progressBar.value = 0;
            currentTimeLabel.textContent = '00:00';
            currentIndex = (currentIndex + 1) % songs.length;
            loadSongBuffer(currentIndex);
            updateActiveSong();
            const song = songs[currentIndex];
            updateCurrentSong(song.name);
            updateStatus('▶️ Играет: ' + song.name);
            if (isLoaded) {
                playAudio();
            }
        }
    };
    
    isPlaying = true;
    document.getElementById('playBtn').textContent = '⏸';
    const song = songs[currentIndex];
    updateCurrentSong(song.name);
    updateStatus('▶️ Играет: ' + song.name);
    updateActiveSong();
}

// ===== ПЕРЕМОТКА =====

// Когда пользователь начал тянуть ползунок
progressBar.addEventListener('mousedown', function() {
    isDragging = true;
});

// Когда пользователь закончил тянуть ползунок
progressBar.addEventListener('mouseup', function() {
    isDragging = false;
    
    // Если песня играет — перематываем
    if (isPlaying && source) {
        const newTime = parseFloat(progressBar.value);
        // Останавливаем текущий источник
        source.stop();
        source = null;
        // Запускаем с нового времени
        playAudio();
    } else {
        // Если не играет — просто обновляем время
        const newTime = parseFloat(progressBar.value);
        currentTimeLabel.textContent = formatTime(newTime);
    }
});

// При изменении ползунка (во время перетаскивания)
progressBar.addEventListener('input', function() {
    const newTime = parseFloat(this.value);
    currentTimeLabel.textContent = formatTime(newTime);
});

// ===== ГРОМКОСТЬ =====

volumeSlider.addEventListener('input', function() {
    const volume = parseFloat(this.value) / 100;
    if (gainNode) {
        gainNode.gain.value = volume;
    }
});

// ===== КНОПКИ =====

function togglePlay() {
    if (songs.length === 0) return;
    
    if (isPlaying) {
        // ПАУЗА
        if (source) {
            try { 
                source.stop(); 
            } catch (e) {}
            source = null;
        }
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶️';
        updateStatus('⏸ Пауза');
    } else {
        // ВОЗОБНОВЛЕНИЕ
        if (!isLoaded) {
            loadSongBuffer(currentIndex);
            setTimeout(() => {
                playAudio();
            }, 300);
        } else {
            playAudio();
        }
    }
}

async function nextSong() {
    if (songs.length === 0) return;
    
    stopAudio();
    progressBar.value = 0;
    currentTimeLabel.textContent = '00:00';
    
    currentIndex = (currentIndex + 1) % songs.length;
    await loadSongBuffer(currentIndex);
    const song = songs[currentIndex];
    updateActiveSong();
    updateCurrentSong(song.name);
    updateStatus('⏸ Готово: ' + song.name);
    document.getElementById('playBtn').textContent = '▶️';
    
    if (isPlaying) {
        playAudio();
    }
}

async function prevSong() {
    if (songs.length === 0) return;
    
    stopAudio();
    progressBar.value = 0;
    currentTimeLabel.textContent = '00:00';
    
    currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    await loadSongBuffer(currentIndex);
    const song = songs[currentIndex];
    updateActiveSong();
    updateCurrentSong(song.name);
    updateStatus('⏸ Готово: ' + song.name);
    document.getElementById('playBtn').textContent = '▶️';
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

// Кнопки
document.getElementById('playBtn').addEventListener('click', togglePlay);
document.getElementById('nextBtn').addEventListener('click', nextSong);
document.getElementById('prevBtn').addEventListener('click', prevSong);

// Загрузка при старте
loadSongs();