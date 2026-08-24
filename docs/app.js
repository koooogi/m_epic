// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let songs = [];
let albums = [];
let currentIndex = 0;
let isPlaying = false;
let audio = new Audio();
let isDragging = false;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let allSongsBackup = [];      // ← резервная копия всех песен
let allAlbumsBackup = [];     // ← резервная копия всех альбомов
let isInFavorites = false;    // ← флаг, что мы в избранном

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
        allAlbumsBackup = JSON.parse(JSON.stringify(albums));
        
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
        allSongsBackup = JSON.parse(JSON.stringify(songs));
        
        console.log('📀 Альбомов загружено: ' + albums.length);
        let totalSongs = 0;
        albums.forEach(album => {
            console.log('  📁 ' + album.name + ': ' + album.songs.length + ' песен');
            totalSongs += album.songs.length;
        });
        console.log('🎵 Всего песен: ' + totalSongs);
        console.log('⭐ Избранных песен: ' + favorites.length);
        
        renderAlbumTabs();
        renderSongList();
        updateStatus('⏸ Остановлено');
        
        if (songs.length > 0) {
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
        console.log('⭐ Добавлено в избранное: ' + song.name);
    } else {
        favorites.splice(index, 1);
        console.log('⭐ Удалено из избранного: ' + song.name);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Если мы в избранном — обновляем список
    if (isInFavorites) {
        renderFavorites();
    } else {
        renderSongList();
    }
    
    // Обновляем счётчик
    const favTab = document.querySelector('.favorite-tab');
    if (favTab) {
        favTab.textContent = '⭐ Избранное (' + favorites.length + ')';
    }
}

function isFavorite(songFile) {
    return favorites.some(f => f.file === songFile);
}

function renderFavorites() {
    if (favorites.length === 0) {
        alert('⭐ У вас пока нет избранных песен');
        return;
    }
    
    isInFavorites = true;
    
    // Сохраняем текущий индекс и состояние воспроизведения
    const currentSongFile = songs[currentIndex] ? songs[currentIndex].file : null;
    const wasPlaying = isPlaying;
    const currentTime = audio.currentTime;
    
    songs = favorites.map(f => ({
        name: f.name,
        file: f.file,
        path: f.path,
        album: f.album || 'Избранное'
    }));
    
    renderSongList();
    updateStatus('⭐ Избранное (' + favorites.length + ' песен)');
    
    // Восстанавливаем индекс
    if (currentSongFile) {
        const newIndex = songs.findIndex(s => s.file === currentSongFile);
        if (newIndex !== -1) {
            currentIndex = newIndex;
        } else {
            currentIndex = 0;
        }
    }
    
    // Восстанавливаем воспроизведение
    if (wasPlaying && songs.length > 0) {
        loadSong(currentIndex);
        audio.currentTime = currentTime;
        playSong();
    } else if (songs.length > 0) {
        loadSong(currentIndex);
    }
    
    // Кнопка "Назад"
    const backBtn = document.createElement('div');
    backBtn.className = 'back-btn';
    backBtn.textContent = '⬅ Назад к альбомам';
    backBtn.onclick = () => {
        isInFavorites = false;
        songs = allSongsBackup;
        albums = allAlbumsBackup;
        renderAlbumTabs();
        renderSongList();
        updateStatus('⏸ Остановлено');
        
        // Восстанавливаем индекс и воспроизведение
        if (songs.length > 0) {
            const currentSongFile = songs[currentIndex] ? songs[currentIndex].file : null;
            if (currentSongFile) {
                const existingIndex = songs.findIndex(s => s.file === currentSongFile);
                if (existingIndex !== -1) {
                    currentIndex = existingIndex;
                }
            }
            if (isPlaying) {
                loadSong(currentIndex);
                audio.currentTime = audio.currentTime;
                playSong();
            } else {
                loadSong(currentIndex);
            }
        }
        
        // Удаляем кнопку "Назад"
        const btn = document.querySelector('.back-btn');
        if (btn) btn.remove();
    };
    
    // Удаляем старую кнопку "Назад", если есть
    const oldBtn = document.querySelector('.back-btn');
    if (oldBtn) oldBtn.remove();
    
    document.getElementById('songList').prepend(backBtn);
}

function showFavorites() {
    if (favorites.length === 0) {
        alert('⭐ У вас пока нет избранных песен');
        return;
    }
    renderFavorites();
}

// ===== РЕНДЕРИНГ =====

function renderAlbumTabs() {
    albumTabs.innerHTML = '';
    
    const favTab = document.createElement('div');
    favTab.className = 'album-tab favorite-tab';
    favTab.textContent = '⭐ Избранное (' + favorites.length + ')';
    favTab.onclick = showFavorites;
    albumTabs.appendChild(favTab);
    
    albums.forEach((album, index) => {
        const tab = document.createElement('div');
        tab.className = 'album-tab';
        if (index === 0 && !isInFavorites) tab.classList.add('active');
        tab.textContent = album.name + ' (' + album.songs.length + ')';
        tab.onclick = () => {
            if (isInFavorites) {
                // Если мы в избранном — возвращаемся к альбомам
                const backBtn = document.querySelector('.back-btn');
                if (backBtn) backBtn.click();
            }
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
    
    // Проверяем, есть ли кнопка "Назад" (если в избранном)
    const hasBackBtn = document.querySelector('.back-btn');
    
    list.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'song-item';
        if (index === currentIndex && !filteredSongs) div.classList.add('active');
        
        const isFav = isFavorite(song.file);
        const starIcon = isFav ? '⭐' : '☆';
        
        div.innerHTML = `
            <span>${song.name}</span>
            <span class="star-btn" data-index="${index}" style="cursor: pointer; font-size: 18px; color: ${isFav ? '#f7c948' : '#555'};">
                ${starIcon}
            </span>
        `;
        
        // Клик по песне
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('star-btn')) return;
            
            const globalIndex = songs.findIndex(s => s.file === song.file);
            if (globalIndex !== -1) {
                loadSong(globalIndex);
                playSong();
            }
        });
        
        // Клик по звёздочке
        const starBtn = div.querySelector('.star-btn');
        starBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(starBtn.dataset.index);
            const globalIdx = songs.findIndex(s => s.file === song.file);
            if (globalIdx !== -1) {
                toggleFavorite(globalIdx);
                const isNowFav = isFavorite(song.file);
                starBtn.textContent = isNowFav ? '⭐' : '☆';
                starBtn.style.color = isNowFav ? '#f7c948' : '#555';
                const favTab = document.querySelector('.favorite-tab');
                if (favTab) {
                    favTab.textContent = '⭐ Избранное (' + favorites.length + ')';
                }
            }
        });
        
        songList.appendChild(div);
    });
}

function filterSongsByAlbum(albumName) {
    const filtered = songs.filter(s => s.album === albumName);
    renderSongList(filtered);
    const firstSong = filtered[0];
    if (firstSong) {
        const globalIndex = songs.findIndex(s => s.file === firstSong.file);
        if (globalIndex !== -1) {
            currentIndex = globalIndex;
        }
    }
}

function updateActiveSong() {
    document.querySelectorAll('.song-item').forEach(el => {
        el.classList.remove('active');
    });
    if (songs[currentIndex]) {
        const currentName = songs[currentIndex].name;
        document.querySelectorAll('.song-item').forEach(el => {
            const span = el.querySelector('span');
            if (span && span.textContent.trim() === currentName) {
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