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
    
    private List<Song> songs = new ArrayList<>();
    private int currentIndex = 0;
    
    @PostConstruct
    public void init() {
        loadSongs();
    }
    
    private void loadSongs() {
        File musicFolder = new File("music");
        if (!musicFolder.exists() || !musicFolder.isDirectory()) {
            System.out.println("⚠️ Папка 'music' не найдена!");
            return;
        }
        
        // 1. Пробуем загрузить порядок из playlist.txt
        List<String> order = loadPlaylistOrder(musicFolder);
        
        if (!order.isEmpty()) {
            System.out.println("📋 Загружено " + order.size() + " песен из playlist.txt");
            for (String fileName : order) {
                File file = new File(musicFolder, fileName);
                if (file.exists() && isMusicFile(file)) {
                    songs.add(new Song(
                        fileName.replaceAll("\\.[^.]+$", ""),
                        fileName,
                        file.getAbsolutePath()
                    ));
                } else {
                    System.out.println("⚠️ Песня не найдена: " + fileName);
                }
            }
        } else {
            // 2. Если playlist.txt нет — загружаем всё по алфавиту
            System.out.println("ℹ️ playlist.txt не найден, загружаем все MP3");
            File[] files = musicFolder.listFiles((dir, name) -> isMusicFile(new File(dir, name)));
            if (files != null) {
                Arrays.sort(files, Comparator.comparing(File::getName));
                for (File file : files) {
                    songs.add(new Song(
                        file.getName().replaceAll("\\.[^.]+$", ""),
                        file.getName(),
                        file.getAbsolutePath()
                    ));
                }
            }
        }
        
        System.out.println("🎵 Загружено " + songs.size() + " песен");
    }
    
    private List<String> loadPlaylistOrder(File musicFolder) {
        List<String> order = new ArrayList<>();
        
        // Ищем playlist.txt
        File playlistFile = new File(musicFolder, "playlist.txt");
        if (!playlistFile.exists()) {
            playlistFile = new File(musicFolder.getParent(), "playlist.txt");
        }
        if (!playlistFile.exists()) {
            playlistFile = new File("playlist.txt");
        }
        if (!playlistFile.exists()) {
            return order;
        }
        
        System.out.println("📄 Найден playlist.txt: " + playlistFile.getAbsolutePath());
        
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
    
    private boolean isMusicFile(File file) {
        String name = file.getName().toLowerCase();
        return name.endsWith(".mp3") ||
               name.endsWith(".wav") ||
               name.endsWith(".flac") ||
               name.endsWith(".m4a");
    }
    
    public List<Song> getSongs() {
        return songs;
    }
    
    public Song getCurrentSong() {
        if (songs.isEmpty()) return null;
        return songs.get(currentIndex);
    }
    
    public Song playSong(int index) {
        if (songs.isEmpty() || index < 0 || index >= songs.size()) return null;
        currentIndex = index;
        System.out.println("▶️ " + songs.get(currentIndex).getName());
        return songs.get(currentIndex);
    }
    
    public Song nextSong() {
        if (songs.isEmpty()) return null;
        currentIndex = (currentIndex + 1) % songs.size();
        System.out.println("▶️ " + songs.get(currentIndex).getName());
        return songs.get(currentIndex);
    }
    
    public Song prevSong() {
        if (songs.isEmpty()) return null;
        currentIndex = (currentIndex - 1 + songs.size()) % songs.size();
        System.out.println("▶️ " + songs.get(currentIndex).getName());
        return songs.get(currentIndex);
    }
    
    public String getStatus() {
        return "Playing: " + (songs.isEmpty() ? "No song" : songs.get(currentIndex).getName());
    }
}
