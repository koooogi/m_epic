// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let songs = [];
let albums = [];
let currentIndex = 0;
let isPlaying = false;
let audio = new Audio();
let isDragging = false;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

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
        
        // Загружаем первую песню
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
    renderSongList(); // Перерисовываем список
}

function isFavorite(songFile) {
    return favorites.some(f => f.file === songFile);
}

function showFavorites() {
    if (favorites.length === 0) {
        alert('⭐ У вас пока нет избранных песен');
        return;
    }
    
    // Создаём временный альбом с избранными песнями
    const favSongs = favorites.map(f => ({
        name: f.name,
        file: f.file,
        path: f.path,
        album: f.album || 'Избранное'
    }));
    
    // Сохраняем текущий список
    const prevSongs = songs;
    const prevAlbums = albums;
    
    // Показываем избранное
    songs = favSongs;
    renderSongList();
    updateStatus('⭐ Избранное (' + favorites.length + ' песен)');
    
    // Кнопка "Назад"
    const backBtn = document.createElement('div');
    backBtn.className = 'back-btn';
    backBtn.textContent = '⬅ Назад к альбомам';
    backBtn.onclick = () => {
        songs = prevSongs;
        albums = prevAlbums;
        renderAlbumTabs();
        renderSongList();
        updateStatus('⏸ Остановлено');
        if (songs.length > 0) {
            loadSong(0);
        }
    };
    document.getElementById('songList').prepend(backBtn);
}

// ===== РЕНДЕРИНГ =====

function renderAlbumTabs() {
    albumTabs.innerHTML = '';
    
    // Кнопка "Избранное"
    const favTab = document.createElement('div');
    favTab.className = 'album-tab favorite-tab';
    favTab.textContent = '⭐ Избранное (' + favorites.length + ')';
    favTab.onclick = showFavorites;
    albumTabs.appendChild(favTab);
    
    // Альбомы
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
    
    // Проверяем, есть ли кнопка "Назад" (если в избранном)
    const hasBackBtn = document.querySelector('.back-btn');
    
    list.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'song-item';
        if (index === currentIndex && !filteredSongs) div.classList.add('active');
        
        // Звёздочка для избранного
        const isFav = isFavorite(song.file);
        const starIcon = isFav ? '⭐' : '☆';
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${song.name}</span>
                <span class="star-btn" data-index="${index}" style="cursor: pointer; font-size: 18px; color: ${isFav ? '#f7c948' : '#555'};">
                    ${starIcon}
                </span>
            </div>
        `;
        
        // Клик по песне
        div.addEventListener('click', (e) => {
            // Не срабатывает, если кликнули по звёздочке
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
                // Обновляем иконку
                const isNowFav = isFavorite(song.file);
                starBtn.textContent = isNowFav ? '⭐' : '☆';
                starBtn.style.color = isNowFav ? '#f7c948' : '#555';
                // Обновляем счётчик избранного в вкладке
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
    // Убираем все активные
    document.querySelectorAll('.song-item').forEach(el => {
        el.classList.remove('active');
    });
    // Добавляем активный
    const items = document.querySelectorAll('.song-item');
    // Ищем по имени или индексу
    if (songs[currentIndex]) {
        const currentName = songs[currentIndex].name;
        items.forEach(el => {
            if (el.textContent.trim().startsWith(currentName)) {
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