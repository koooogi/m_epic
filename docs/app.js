// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let songs = [];
let albums = [];
let currentIndex = 0;
let isPlaying = false;
let audio = new Audio();
let isDragging = false;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let currentAlbum = 'all';
let isChangingTab = false;  // ← флаг, чтобы не трогать аудио при смене вкладки

// DOM элементы
const progressBar = document.getElementById('progressBar');
const currentTimeLabel = document.getElementById('currentTime');
const totalTimeLabel = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const albumTabs = document.getElementById('albumTabs');
const songList = document.getElementById('songList');

// ===== ЛОГИ ДЛЯ ОТСЛЕЖИВАНИЯ ДЕПЛОЯ =====
console.log('🎵 Music Player v1.0');
console.log('📅 Время загрузки: ' + new Date().toLocaleString());
console.log('🌐 Страница: ' + window.location.href);

// ===== ЗАГРУЗКА ПЛЕЙЛИСТА =====
async function loadPlaylist() {
    try {
        const response = await fetch('music/playlist.json?_=' + Date.now());
        console.log('📄 Статус playlist.json: ' + response.status);
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        
        const data = await response.json();
        albums = data.albums;
        
        songs = [];
        albums.forEach(album => {
            album.songs.forEach(song => {
                songs.push({
                    ...song,
                    album: album.name
                });
            });
        });
        
        console.log('📀 Альбомов загружено: ' + albums.length);
        let totalSongs = 0;
        albums.forEach(album => {
            console.log('  📁 ' + album.name + ': ' + album.songs.length + ' песен');
            totalSongs += album.songs.length;
        });
        console.log('🎵 Всего песен: ' + totalSongs);
        console.log('🏛️ Избранных песен: ' + favorites.length);
        
        renderAlbumTabs();
        renderSongList();
        updateStatus('⏸ Остановлено');
        
        if (songs.length > 0 && currentAlbum === 'all') {
            loadSong(0);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки плейлиста:', error);
        document.getElementById('status').textContent = '❌ Ошибка загрузки плейлиста';
    }
}

// ===== ИЗБРАННОЕ =====

function toggleFavorite(songIndex) {
    const song = songs[songIndex];
    if (!song) return;
    
    const index = favorites.findIndex(f => f.file === song.file);
    if (index === -1) {
        favorites.push({ 
            name: song.name, 
            file: song.file, 
            path: song.path,
            album: song.album 
        });
        console.log('🏛️ Добавлено в избранное: ' + song.name);
    } else {
        favorites.splice(index, 1);
        console.log('🏛️ Удалено из избранного: ' + song.name);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Обновляем отображение
    if (currentAlbum === 'favorites') {
        renderFavorites();
    } else {
        renderSongList();
    }
    
    const favTab = document.querySelector('.favorite-tab');
    if (favTab) {
        favTab.textContent = '🏛️ Избранное (' + favorites.length + ')';
    }
}

function isFavorite(songFile) {
    return favorites.some(f => f.file === songFile);
}

function renderFavorites() {
    if (favorites.length === 0) {
        const container = document.getElementById('songList');
        container.innerHTML = '<div style="text-align: center; padding: 30px; color: #666;">🏛️ Нет избранных песен</div>';
        return;
    }
    
    const favSongs = favorites.map(f => ({
        name: f.name,
        file: f.file,
        path: f.path,
        album: '🏛️ Избранное'
    }));
    
    renderSongList(favSongs, true);
    updateStatus('🏛️ Избранное (' + favorites.length + ' песен)');
}

function showFavorites() {
    currentAlbum = 'favorites';
    renderFavorites();
}

// ===== РЕНДЕРИНГ =====

function renderAlbumTabs() {
    albumTabs.innerHTML = '';
    
    const favTab = document.createElement('div');
    favTab.className = 'album-tab favorite-tab';
    if (currentAlbum === 'favorites') favTab.classList.add('active');
    favTab.textContent = '🏛️ Избранное (' + favorites.length + ')';
    favTab.onclick = () => {
        document.querySelectorAll('.album-tab').forEach(t => t.classList.remove('active'));
        favTab.classList.add('active');
        isChangingTab = true;
        showFavorites();
        // Восстанавливаем воспроизведение
        if (isPlaying && songs[currentIndex]) {
            // Просто показываем текущую песню
            updateCurrentSong(songs[currentIndex].name);
            updateStatus('▶️ Играет: ' + songs[currentIndex].name);
        }
        setTimeout(() => { isChangingTab = false; }, 100);
    };
    albumTabs.appendChild(favTab);
    
    albums.forEach((album) => {
        const tab = document.createElement('div');
        tab.className = 'album-tab';
        if (album.name === currentAlbum && currentAlbum !== 'favorites') tab.classList.add('active');
        tab.textContent = album.name + ' (' + album.songs.length + ')';
        tab.onclick = () => {
            document.querySelectorAll('.album-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            isChangingTab = true;
            loadAlbum(album.name);
            setTimeout(() => { isChangingTab = false; }, 100);
        };
        albumTabs.appendChild(tab);
    });
}

function renderSongList(list, isFavorites = false) {
    const displayList = list || songs;
    songList.innerHTML = '';
    
    let finalList = displayList;
    if (!isFavorites && currentAlbum !== 'all' && currentAlbum !== 'favorites') {
        finalList = displayList.filter(s => s.album === currentAlbum);
    }
    
    finalList.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'song-item';
        
        const currentSong = songs[currentIndex];
        if (currentSong && song.file === currentSong.file && !isChangingTab) {
            div.classList.add('active');
        }
        
        const isFav = isFavorite(song.file);
        const favIcon = isFav ? '🏛️' : '⬜';
        
        div.innerHTML = `
            <span>${song.name}</span>
            <span class="star-btn" data-file="${song.file}" style="cursor: pointer; font-size: 16px; color: ${isFav ? '#f7c948' : '#444'};">
                ${favIcon}
            </span>
        `;
        
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('star-btn')) return;
            
            const globalIndex = songs.findIndex(s => s.file === song.file);
            if (globalIndex !== -1) {
                currentIndex = globalIndex;
                loadSong(currentIndex);
                playSong();
            }
        });
        
        const starBtn = div.querySelector('.star-btn');
        starBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const songFile = starBtn.dataset.file;
            const globalIdx = songs.findIndex(s => s.file === songFile);
            if (globalIdx !== -1) {
                toggleFavorite(globalIdx);
                const isNowFav = isFavorite(songFile);
                starBtn.textContent = isNowFav ? '🏛️' : '⬜';
                starBtn.style.color = isNowFav ? '#f7c948' : '#444';
                const favTab = document.querySelector('.favorite-tab');
                if (favTab) {
                    favTab.textContent = '🏛️ Избранное (' + favorites.length + ')';
                }
            }
        });
        
        songList.appendChild(div);
    });
}

function loadAlbum(albumName) {
    currentAlbum = albumName;
    renderSongList();
    updateStatus('⏸ ' + albumName);
    
    // НЕ перезагружаем песню, если уже играет
    const currentSong = songs[currentIndex];
    if (currentSong) {
        const isInAlbum = currentSong.album === albumName || albumName === 'all';
        if (!isInAlbum) {
            // Ищем первую песню в альбоме, но НЕ запускаем
            const firstSong = songs.find(s => s.album === albumName);
            if (firstSong) {
                const idx = songs.findIndex(s => s.file === firstSong.file);
                if (idx !== -1) {
                    currentIndex = idx;
                    // Просто загружаем, но не играем
                    loadSongOnly(currentIndex);
                }
            }
        }
    }
}

function updateActiveSong() {
    document.querySelectorAll('.song-item').forEach(el => {
        el.classList.remove('active');
    });
    const currentSong = songs[currentIndex];
    if (currentSong) {
        const items = document.querySelectorAll('.song-item');
        items.forEach(el => {
            const span = el.querySelector('span');
            if (span && span.textContent.trim() === currentSong.name) {
                el.classList.add('active');
            }
        });
    }
}

function updateStatus(text) {
    document.getElementById('status').textContent = text;
}

function updateCurrentSong(name) {
    document.getElementById('currentSong').textContent = '🎵 ' + name;
}

// ===== ЗАГРУЗКА ПЕСНИ (с воспроизведением) =====

function loadSong(index) {
    if (songs.length === 0) return;
    if (index < 0 || index >= songs.length) return;
    
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

// ===== ЗАГРУЗКА ПЕСНИ (без воспроизведения) =====

function loadSongOnly(index) {
    if (songs.length === 0) return;
    if (index < 0 || index >= songs.length) return;
    
    currentIndex = index;
    const song = songs[currentIndex];
    
    // Сохраняем текущее состояние воспроизведения
    const wasPlaying = isPlaying;
    const currentTime = audio.currentTime;
    
    audio.src = song.path;
    audio.load();
    
    audio.onloadedmetadata = () => {
        totalTimeLabel.textContent = formatTime(audio.duration);
        progressBar.max = audio.duration;
        progressBar.value = currentTime || 0;
        currentTimeLabel.textContent = formatTime(currentTime || 0);
        
        // Если песня играла — продолжаем
        if (wasPlaying) {
            audio.currentTime = currentTime || 0;
            audio.play().catch(() => {});
        }
    };
    
    updateCurrentSong(song.name);
    updateStatus(wasPlaying ? '▶️ Играет: ' + song.name : '⏸ Готово: ' + song.name);
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
    
    let nextIndex = (currentIndex + 1) % songs.length;
    if (currentAlbum === 'favorites') {
        const favFiles = favorites.map(f => f.file);
        const currentFile = songs[currentIndex].file;
        const currentFavIndex = favFiles.indexOf(currentFile);
        if (currentFavIndex !== -1) {
            const nextFavIndex = (currentFavIndex + 1) % favFiles.length;
            const nextFile = favFiles[nextFavIndex];
            const globalIdx = songs.findIndex(s => s.file === nextFile);
            if (globalIdx !== -1) {
                nextIndex = globalIdx;
            }
        }
    }
    
    loadSong(nextIndex);
    if (isPlaying) {
        playSong();
    }
}

function prevSong() {
    if (songs.length === 0) return;
    
    let prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    if (currentAlbum === 'favorites') {
        const favFiles = favorites.map(f => f.file);
        const currentFile = songs[currentIndex].file;
        const currentFavIndex = favFiles.indexOf(currentFile);
        if (currentFavIndex !== -1) {
            const prevFavIndex = (currentFavIndex - 1 + favFiles.length) % favFiles.length;
            const prevFile = favFiles[prevFavIndex];
            const globalIdx = songs.findIndex(s => s.file === prevFile);
            if (globalIdx !== -1) {
                prevIndex = globalIdx;
            }
        }
    }
    
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