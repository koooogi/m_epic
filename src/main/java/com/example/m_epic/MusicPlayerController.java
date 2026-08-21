/**
 *
 * @author kogi <astronaut.kogi@gmail.com>
 */
package com.example.m_epic;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class MusicPlayerController {
    
    @Autowired
    private MusicPlayerService musicPlayerService;
    
    // Получить список песен
    @GetMapping("/songs")
    public ResponseEntity<List<Song>> getSongs() {
        return ResponseEntity.ok(musicPlayerService.getSongs());
    }
    
    // Получить текущую песню
    @GetMapping("/current")
    public ResponseEntity<Song> getCurrentSong() {
        return ResponseEntity.ok(musicPlayerService.getCurrentSong());
    }
    
    // Запустить песню по индексу
    @PostMapping("/play/{index}")
    public ResponseEntity<Song> playSong(@PathVariable int index) {
        return ResponseEntity.ok(musicPlayerService.playSong(index));
    }
    
    // Следующая песня
    @PostMapping("/next")
    public ResponseEntity<Song> nextSong() {
        return ResponseEntity.ok(musicPlayerService.nextSong());
    }
    
    // Предыдущая песня
    @PostMapping("/prev")
    public ResponseEntity<Song> prevSong() {
        return ResponseEntity.ok(musicPlayerService.prevSong());
    }
    
    // Статус воспроизведения
    @GetMapping("/status")
    public ResponseEntity<String> getStatus() {
        return ResponseEntity.ok(musicPlayerService.getStatus());
    }
    
    @GetMapping("/stream/{fileName}")
    public ResponseEntity<byte[]> streamSong(@PathVariable String fileName) {
        try {
            File musicFolder = new File("music");
            File songFile = new File(musicFolder, fileName);
        
            if (!songFile.exists()) {
                return ResponseEntity.notFound().build();
        }
        
            byte[] fileContent = Files.readAllBytes(songFile.toPath());
        
            return ResponseEntity.ok()
                .header("Content-Type", "audio/mpeg")
                .body(fileContent);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
    }
    }
}
