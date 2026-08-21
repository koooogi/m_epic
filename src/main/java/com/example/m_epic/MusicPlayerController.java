/**
 *
 * @author kogi <astronaut.kogi@gmail.com>
 */
package com.example.m_epic;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;

@RestController
@RequestMapping("/api")
public class MusicPlayerController {
    
    @Autowired
    private MusicPlayerService musicPlayerService;
    
    // Получить список альбомов
    @GetMapping("/albums")
    public ResponseEntity<List<MusicPlayerService.Album>> getAlbums() {
        return ResponseEntity.ok(musicPlayerService.getAlbums());
    }
    
    // Получить песни альбома
    @GetMapping("/album/{albumName}")
    public ResponseEntity<List<MusicPlayerService.Song>> getAlbumSongs(@PathVariable String albumName) {
        return ResponseEntity.ok(musicPlayerService.getSongsByAlbum(albumName));
    }
    
    // Получить все песни
    @GetMapping("/songs")
    public ResponseEntity<List<MusicPlayerService.Song>> getSongs() {
        return ResponseEntity.ok(musicPlayerService.getSongs());
    }
    
    @GetMapping("/current")
    public ResponseEntity<MusicPlayerService.Song> getCurrentSong() {
        return ResponseEntity.ok(musicPlayerService.getCurrentSong());
    }
    
    @PostMapping("/play/{index}")
    public ResponseEntity<MusicPlayerService.Song> playSong(@PathVariable int index) {
        return ResponseEntity.ok(musicPlayerService.playSong(index));
    }
    
    @PostMapping("/play/{albumName}/{index}")
    public ResponseEntity<MusicPlayerService.Song> playSongInAlbum(
            @PathVariable String albumName,
            @PathVariable int index) {
        return ResponseEntity.ok(musicPlayerService.playSongInAlbum(albumName, index));
    }
    
    @PostMapping("/next")
    public ResponseEntity<MusicPlayerService.Song> nextSong() {
        return ResponseEntity.ok(musicPlayerService.nextSong());
    }
    
    @PostMapping("/prev")
    public ResponseEntity<MusicPlayerService.Song> prevSong() {
        return ResponseEntity.ok(musicPlayerService.prevSong());
    }
    
    @GetMapping("/status")
    public ResponseEntity<String> getStatus() {
        return ResponseEntity.ok(musicPlayerService.getStatus());
    }
    
    @GetMapping("/stream/{fileName}")
    public ResponseEntity<byte[]> streamSong(@PathVariable String fileName) {
        try {
            // Ищем файл во всех папках music
            File musicFolder = new File("music");
            File[] files = musicFolder.listFiles();
            File songFile = null;
            
            if (files != null) {
                for (File folder : files) {
                    if (folder.isDirectory()) {
                        File candidate = new File(folder, fileName);
                        if (candidate.exists()) {
                            songFile = candidate;
                            break;
                        }
                    }
                }
            }
            
            if (songFile == null) {
                return ResponseEntity.notFound().build();
            }
            
            byte[] fileContent = Files.readAllBytes(songFile.toPath());
            
            String contentType = "audio/mpeg";
            if (fileName.endsWith(".wav")) contentType = "audio/wav";
            if (fileName.endsWith(".flac")) contentType = "audio/flac";
            if (fileName.endsWith(".m4a")) contentType = "audio/mp4";
            
            return ResponseEntity.ok()
                .header("Content-Type", contentType)
                .body(fileContent);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
