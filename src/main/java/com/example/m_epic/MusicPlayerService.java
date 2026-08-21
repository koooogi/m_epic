/**
 *
 * @author kogi <astronaut.kogi@gmail.com>
 */
package com.example.m_epic;

import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.io.*;
import java.nio.file.*;
import java.util.*;

@Service
public class MusicPlayerService {
    
    private List<Album> albums = new ArrayList<>();
    private List<Song> allSongs = new ArrayList<>();
    private String currentAlbum = "all";
    private int currentIndex = 0;
    
    @PostConstruct
    public void init() {
        loadAlbums();
    }
    
    public static class Album {
        private String name;
        private List<Song> songs = new ArrayList<>();
        
        public Album(String name) {
            this.name = name;
        }
        
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public List<Song> getSongs() { return songs; }
        public void setSongs(List<Song> songs) { this.songs = songs; }
    }
    
    public static class Song {
        private String name;
        private String fileName;
        private String path;
        private String albumName;
        
        public Song(String name, String fileName, String path, String albumName) {
            this.name = name;
            this.fileName = fileName;
            this.path = path;
            this.albumName = albumName;
        }
        
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
        public String getAlbumName() { return albumName; }
        public void setAlbumName(String albumName) { this.albumName = albumName; }
    }
    
    private void loadAlbums() {
        File musicFolder = new File("music");
        if (!musicFolder.exists() || !musicFolder.isDirectory()) {
            System.out.println("⚠️ Папка 'music' не найдена!");
            return;
        }
        
        File[] subFolders = musicFolder.listFiles(File::isDirectory);
        
        // ========== ЗАГРУЗКА ОБЩЕГО ПЛЕЙЛИСТА ==========
        List<String> globalOrder = loadGlobalPlaylist(musicFolder);
        Map<String, List<Song>> albumSongsMap = new LinkedHashMap<>();
        
        if (subFolders != null) {
            // Сортируем папки
            Arrays.sort(subFolders, (a, b) -> {
                String nameA = a.getName();
                String nameB = b.getName();
                return nameA.compareTo(nameB);
            });
            
            // Сначала загружаем все песни по папкам
            for (File folder : subFolders) {
                String albumName = folder.getName();
                List<Song> songs = loadSongsFromFolder(folder, albumName);
                if (!songs.isEmpty()) {
                    albumSongsMap.put(albumName, songs);
                    Album album = new Album(albumName);
                    album.setSongs(songs);
                    albums.add(album);
                    System.out.println("📀 Альбом: " + albumName + " (" + songs.size() + " песен)");
                }
            }
        }
        
        // ========== СОЗДАНИЕ АЛЬБОМА "all" ==========
        List<Song> allSongsList = new ArrayList<>();
        
        if (!globalOrder.isEmpty()) {
            // Используем общий playlist.txt для порядка
            for (String relativePath : globalOrder) {
                // Пример: "saga1/01_Intro.mp3"
                String[] parts = relativePath.split("/");
                if (parts.length == 2) {
                    String albumName = parts[0];
                    String fileName = parts[1];
                    
                    List<Song> albumSongs = albumSongsMap.get(albumName);
                    if (albumSongs != null) {
                        for (Song song : albumSongs) {
                            if (song.getFileName().equals(fileName)) {
                                allSongsList.add(song);
                                break;
                            }
                        }
                    }
                }
            }
        } else {
            // Если общего playlist.txt нет — просто объединяем все песни по порядку саг
            for (Album album : albums) {
                allSongsList.addAll(album.getSongs());
            }
        }
        
        // Добавляем альбом "all"
        if (!allSongsList.isEmpty()) {
            Album allAlbum = new Album("all");
            allAlbum.setSongs(allSongsList);
            albums.add(allAlbum);
            System.out.println("📀 Альбом: all (" + allSongsList.size() + " песен)");
            allSongs = allSongsList;
        }
        
        System.out.println("🎵 Загружено " + albums.size() + " альбомов, всего песен: " + allSongs.size());
    }
    
    // Загрузка общего playlist.txt
    private List<String> loadGlobalPlaylist(File musicFolder) {
        List<String> order = new ArrayList<>();
        File playlistFile = new File(musicFolder, "playlist.txt");
        if (!playlistFile.exists()) {
            System.out.println("ℹ️ Общий playlist.txt не найден, объединяем все песни по порядку");
            return order;
        }
        
        System.out.println("📄 Найден общий playlist.txt: " + playlistFile.getAbsolutePath());
        
        try (BufferedReader reader = new BufferedReader(new FileReader(playlistFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                order.add(line);
            }
        } catch (IOException e) {
            System.err.println("Ошибка чтения playlist.txt: " + e.getMessage());
        }
        
        return order;
    }
    
    private List<Song> loadSongsFromFolder(File folder, String albumName) {
        List<Song> songs = new ArrayList<>();
        
        // Сначала пробуем playlist.txt в папке альбома
        List<String> order = loadFolderPlaylist(folder);
        
        if (!order.isEmpty()) {
            for (String fileName : order) {
                File file = new File(folder, fileName);
                if (file.exists() && isMusicFile(file)) {
                    songs.add(new Song(
                        fileName.replaceAll("\\.[^.]+$", ""),
                        fileName,
                        file.getAbsolutePath(),
                        albumName
                    ));
                } else {
                    System.out.println("⚠️ Песня не найдена в альбоме " + albumName + ": " + fileName);
                }
            }
        } else {
            // Если playlist.txt нет — загружаем все по алфавиту
            File[] files = folder.listFiles((dir, name) -> isMusicFile(new File(dir, name)));
            if (files != null) {
                Arrays.sort(files, Comparator.comparing(File::getName));
                for (File file : files) {
                    songs.add(new Song(
                        file.getName().replaceAll("\\.[^.]+$", ""),
                        file.getName(),
                        file.getAbsolutePath(),
                        albumName
                    ));
                }
            }
        }
        
        return songs;
    }
    
    private List<String> loadFolderPlaylist(File folder) {
        List<String> order = new ArrayList<>();
        File playlistFile = new File(folder, "playlist.txt");
        if (!playlistFile.exists()) {
            return order;
        }
        
        try (BufferedReader reader = new BufferedReader(new FileReader(playlistFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                order.add(line);
            }
        } catch (IOException e) {
            System.err.println("Ошибка чтения playlist.txt в " + folder.getName() + ": " + e.getMessage());
        }
        
        return order;
    }
    
    private boolean isMusicFile(File file) {
        String name = file.getName().toLowerCase();
        return name.endsWith(".mp3") ||
               name.endsWith(".wav") ||
               name.endsWith(".flac") ||
               name.endsWith(".m4a");
    }
    
    // ===== API методы =====
    
    public List<Album> getAlbums() {
        return albums;
    }
    
    public List<Song> getSongs() {
        return allSongs;
    }
    
    public List<Song> getSongsByAlbum(String albumName) {
        for (Album album : albums) {
            if (album.getName().equals(albumName)) {
                return album.getSongs();
            }
        }
        return allSongs;
    }
    
    public Song getCurrentSong() {
        if (allSongs.isEmpty()) return null;
        return allSongs.get(currentIndex);
    }
    
    public Song playSong(int index) {
        if (allSongs.isEmpty() || index < 0 || index >= allSongs.size()) return null;
        currentIndex = index;
        System.out.println("▶️ " + allSongs.get(currentIndex).getName());
        return allSongs.get(currentIndex);
    }
    
    public Song playSongInAlbum(String albumName, int index) {
        List<Song> songs = getSongsByAlbum(albumName);
        if (songs.isEmpty() || index < 0 || index >= songs.size()) return null;
        
        Song targetSong = songs.get(index);
        for (int i = 0; i < allSongs.size(); i++) {
            if (allSongs.get(i).getFileName().equals(targetSong.getFileName())) {
                currentIndex = i;
                break;
            }
        }
        
        System.out.println("▶️ " + targetSong.getName());
        return targetSong;
    }
    
    public Song nextSong() {
        if (allSongs.isEmpty()) return null;
        currentIndex = (currentIndex + 1) % allSongs.size();
        System.out.println("▶️ " + allSongs.get(currentIndex).getName());
        return allSongs.get(currentIndex);
    }
    
    public Song prevSong() {
        if (allSongs.isEmpty()) return null;
        currentIndex = (currentIndex - 1 + allSongs.size()) % allSongs.size();
        System.out.println("▶️ " + allSongs.get(currentIndex).getName());
        return allSongs.get(currentIndex);
    }
    
    public String getStatus() {
        return "Playing: " + (allSongs.isEmpty() ? "No song" : allSongs.get(currentIndex).getName());
    }
}
