// ===== ЛОГИ ДЛЯ ОТСЛЕЖИВАНИЯ ДЕПЛОЯ =====
console.log('🎵 Music Player v1.0');
console.log('📅 Время загрузки: ' + new Date().toLocaleString());
console.log('🌐 Страница: ' + window.location.href);

// Проверка версии через fetch (добавляем timestamp чтобы не кэшировалось)
fetch('music/playlist.json?_=' + Date.now())
    .then(response => {
        console.log('📄 Статус playlist.json: ' + response.status);
        if (response.ok) {
            console.log('✅ Плейлист загружен успешно');
        } else {
            console.log('❌ Ошибка загрузки плейлиста: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log('📀 Альбомов загружено: ' + data.albums.length);
        let totalSongs = 0;
        data.albums.forEach(album => {
            console.log('  📁 ' + album.name + ': ' + album.songs.length + ' песен');
            totalSongs += album.songs.length;
        });
        console.log('🎵 Всего песен: ' + totalSongs);
    })
    .catch(error => {
        console.error('❌ Ошибка: ' + error.message);
    });

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let songs = [];
let albums = [];
let currentIndex = 0;
let isPlaying = false;
let audio = new Audio();
let isDragging = false;

// DOM элементы
const progressBar = document.getElementById('progressBar');
const currentTimeLabel = document.getElementById('currentTime');
const totalTimeLabel = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const albumTabs = document.getElementById('albumTabs');
const songList = document.getElementById('songList');

// ===== ЗАГРУЗКА ПЛЕЙЛИСТА =====
async function loadPlaylist() {
    try {
        const response = await fetch('music/playlist.json');
        const data = await response.json();
        albums = data.albums;
        
        // Собираем все песни в один список
        songs = [];
        albums.forEach(album => {
            album.songs.forEach(song => {
                songs.push({
                    ...song,
                    album: album.name
                });
            });
        });
        
        renderAlbumTabs();
        renderSongList();
        updateStatus('⏸ Остановлено');
        
        // Загружаем первую песню
        if (songs.length > 0) {
            loadSong(0);
        }
    } catch (error) {
        console.error('Ошибка загрузки плейлиста:', error);
        document.getElementById('status').textContent = '❌ Ошибка загрузки плейлиста';
    }
}

// ===== РЕНДЕРИНГ =====

function renderAlbumTabs() {
    albumTabs.innerHTML = '';
    albums.forEach((album, index) => {
        const tab = document.createElement('div');
        tab.className = 'album-tab';
        if (index === 0) tab.classList.add('active');
        tab.textContent = album.name + ' (' + album.songs.length + ')';
        tab.onclick = () => {
            document.querySelectorAll('.album-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterSongsByAlbum(album.name);
        };
        albumTabs.appendChild(tab);
    });
}

function renderSongList(filteredSongs) {
    const list = filteredSongs || songs;
    songList.innerHTML = '';
    
    list.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'song-item';
        if (index === currentIndex) div.classList.add('active');
        div.textContent = song.name;
        div.onclick = () => {
            // Находим индекс в общем списке
            const globalIndex = songs.findIndex(s => s.file === song.file);
            if (globalIndex !== -1) {
                loadSong(globalIndex);
                playSong();
            }
        };
        songList.appendChild(div);
    });
}

function filterSongsByAlbum(albumName) {
    const filtered = songs.filter(s => s.album === albumName);
    renderSongList(filtered);
    // Обновляем текущий индекс
    const firstSong = filtered[0];
    if (firstSong) {
        const globalIndex = songs.findIndex(s => s.file === firstSong.file);
        if (globalIndex !== -1) {
            currentIndex = globalIndex;
        }
    }
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

// ===== ЗАГРУЗКА ПЕСНИ =====

function loadSong(index) {
    if (songs.length === 0) return;
    currentIndex = index;
    const song = songs[currentIndex];
    
    audio.src = song.path;
    audio.load();
    
    audio.onloadedmetadata = () => {
        totalTimeLabel.textContent = formatTime(audio.duration);
        progressBar.max = audio.duration;
        progressBar.value = 0;
        currentTimeLabel.textContent = '00:00';
    };
    
    audio.ontimeupdate = () => {
        if (!isDragging) {
            progressBar.value = audio.currentTime;
            currentTimeLabel.textContent = formatTime(audio.currentTime);
        }
    };
    
    audio.onended = () => {
        if (isPlaying) {
            nextSong();
        }
    };
    
    updateCurrentSong(song.name);
    updateStatus('⏸ Готово: ' + song.name);
    updateActiveSong();
}

// ===== ВОСПРОИЗВЕДЕНИЕ =====

function playSong() {
    if (songs.length === 0) return;
    
    audio.play()
        .then(() => {
            isPlaying = true;
            document.getElementById('playBtn').textContent = '⏸';
            updateStatus('▶️ Играет: ' + songs[currentIndex].name);
        })
        .catch(err => {
            console.error('Ошибка воспроизведения:', err);
            updateStatus('❌ Ошибка воспроизведения');
        });
}

function togglePlay() {
    if (songs.length === 0) return;
    
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶️';
        updateStatus('⏸ Пауза');
    } else {
        playSong();
    }
}

function nextSong() {
    if (songs.length === 0) return;
    const nextIndex = (currentIndex + 1) % songs.length;
    loadSong(nextIndex);
    if (isPlaying) {
        playSong();
    }
}

function prevSong() {
    if (songs.length === 0) return;
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    loadSong(prevIndex);
    if (isPlaying) {
        playSong();
    }
}

// ===== ПЕРЕМОТКА =====

progressBar.addEventListener('mousedown', () => { isDragging = true; });
progressBar.addEventListener('mouseup', () => {
    isDragging = false;
    audio.currentTime = parseFloat(progressBar.value);
});
progressBar.addEventListener('input', () => {
    currentTimeLabel.textContent = formatTime(parseFloat(progressBar.value));
});

// ===== ГРОМКОСТЬ =====

volumeSlider.addEventListener('input', () => {
    audio.volume = parseFloat(volumeSlider.value) / 100;
});

// ===== ВСПОМОГАТЕЛЬНЫЕ =====

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

// ===== КНОПКИ =====

document.getElementById('playBtn').addEventListener('click', togglePlay);
document.getElementById('nextBtn').addEventListener('click', nextSong);
document.getElementById('prevBtn').addEventListener('click', prevSong);

// ===== ЗАПУСК =====

loadPlaylist();