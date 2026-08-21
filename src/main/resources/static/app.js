const API_URL = 'http://localhost:8080/api';

let songs = [];
let albums = [];
let currentIndex = 0;
let isPlaying = false;
let audioContext = null;
let audioBuffer = null;
let isLoaded = false;
let gainNode = null;
let source = null;
let progressInterval = null;
let isDragging = false;
let currentStartTime = 0;
let currentStartPosition = 0;
let isEnding = false;
let currentAlbum = 'Весь мюзикл';

// DOM элементы
const progressBar = document.getElementById('progressBar');
const currentTimeLabel = document.getElementById('currentTime');
const totalTimeLabel = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const albumTabs = document.getElementById('albumTabs');

// Загружаем альбомы
async function loadAlbums() {
    try {
        const response = await fetch(`${API_URL}/albums`);
        albums = await response.json();
        renderAlbumTabs();
        await loadSongs();
    } catch (error) {
        console.error('Ошибка загрузки альбомов:', error);
    }
}

// Загружаем песни (все)
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

// Загружаем песни выбранного альбома
async function loadAlbumSongs(albumName) {
    currentAlbum = albumName;
    try {
        const response = await fetch(`${API_URL}/album/${encodeURIComponent(albumName)}`);
        songs = await response.json();
        currentIndex = 0;
        progressBar.value = 0;
        currentTimeLabel.textContent = '00:00';
        renderSongList();
        updateActiveSong();
        if (songs.length > 0) {
            await loadSongBuffer(0);
            updateStatus('⏸ Готово: ' + songs[0].name);
            updateCurrentSong(songs[0].name);
        }
    } catch (error) {
        console.error('Ошибка загрузки песен альбома:', error);
    }
}

function renderAlbumTabs() {
    albumTabs.innerHTML = '';
    albums.forEach(album => {
        const tab = document.createElement('div');
        tab.className = 'album-tab';
        if (album.name === currentAlbum) tab.classList.add('active');
        tab.textContent = album.name + ' (' + album.songs.length + ')';
        tab.onclick = () => {
            stopAudio();
            document.querySelectorAll('.album-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadAlbumSongs(album.name);
        };
        albumTabs.appendChild(tab);
    });
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
            currentStartPosition = 0;
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
    isEnding = false;
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
        
        const response = await fetch(`/api/stream/${encodeURIComponent(song.fileName)}`);
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
    
    if (source) {
        try { source.stop(); } catch (e) {}
        source = null;
    }
    
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);
    
    currentStartPosition = parseFloat(progressBar.value);
    source.start(0, currentStartPosition);
    currentStartTime = audioContext.currentTime - currentStartPosition;
    isEnding = false;
    
    const duration = audioBuffer.duration;
    
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (!isDragging && !isEnding) {
            const currentTime = audioContext.currentTime - currentStartTime;
            if (currentTime >= duration) {
                clearInterval(progressInterval);
                progressInterval = null;
                progressBar.value = duration;
                currentTimeLabel.textContent = formatTime(duration);
                if (isPlaying) {
                    nextSongInternal();
                }
            } else {
                progressBar.value = currentTime;
                currentTimeLabel.textContent = formatTime(currentTime);
            }
        }
    }, 100);
    
    source.onended = () => {
        if (!isEnding) {
            isEnding = true;
            clearInterval(progressInterval);
            progressInterval = null;
            if (isPlaying) {
                const currentTime = audioContext.currentTime - currentStartTime;
                if (currentTime >= duration - 0.5) {
                    nextSongInternal();
                }
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

function nextSongInternal() {
    stopAudio();
    currentIndex = (currentIndex + 1) % songs.length;
    progressBar.value = 0;
    currentTimeLabel.textContent = '00:00';
    currentStartPosition = 0;
    loadSongBuffer(currentIndex);
    updateActiveSong();
    const song = songs[currentIndex];
    updateCurrentSong(song.name);
    updateStatus('▶️ Играет: ' + song.name);
    if (isLoaded) {
        playAudio();
    }
}

// ===== ПЕРЕМОТКА =====

progressBar.addEventListener('mousedown', function() {
    isDragging = true;
});

progressBar.addEventListener('mouseup', function() {
    isDragging = false;
    const newTime = parseFloat(progressBar.value);
    currentTimeLabel.textContent = formatTime(newTime);
    currentStartPosition = newTime;
    if (isPlaying && source) {
        source.stop();
        source = null;
        playAudio();
    }
});

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
        updateStatus('⏸ Пауза');
    } else {
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
    currentIndex = (currentIndex + 1) % songs.length;
    progressBar.value = 0;
    currentTimeLabel.textContent = '00:00';
    currentStartPosition = 0;
    await loadSongBuffer(currentIndex);
    updateActiveSong();
    const song = songs[currentIndex];
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
    currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    progressBar.value = 0;
    currentTimeLabel.textContent = '00:00';
    currentStartPosition = 0;
    await loadSongBuffer(currentIndex);
    updateActiveSong();
    const song = songs[currentIndex];
    updateCurrentSong(song.name);
    updateStatus('⏸ Готово: ' + song.name);
    document.getElementById('playBtn').textContent = '▶️';
    if (isPlaying) {
        playAudio();
    }
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
loadAlbums();